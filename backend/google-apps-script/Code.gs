/**
 * BTA Contract Assistant — Google Apps Script backend (v6)
 *
 * Required Script Property:
 *   GEMINI_API_KEY = your Google AI Studio API key
 *
 * Deploy this project as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * v6 improvements:
 *   1) Citation pages are resolved from a short exact anchor phrase returned by Gemini
 *      and the === PDF PAGE N === markers in the official contract text.
 *   2) Article-range matching now includes a shared boundary page when the next article
 *      begins later on the same PDF page. This fixes Article VIII retirement citations.
 *   3) Temporary Gemini 429/5xx errors get stronger exponential-backoff retries.
 *
 * The public website calls this endpoint with JSONP, so the API key never appears
 * in GitHub or browser JavaScript.
 */

const GEMINI_MODELS = ['gemini-3.5-flash-lite'];
const REPO_RAW_BASE = 'https://raw.githubusercontent.com/jplutajr/bta-member-hub/main/';
const CONTRACT_TEXT_URL = REPO_RAW_BASE + 'data/contract-text.txt';
const NUMERIC_REFERENCE_URL = REPO_RAW_BASE + 'data/contract-numeric-reference.json';
const SALARY_SCHEDULES_URL = REPO_RAW_BASE + 'data/salary-schedules.json';
const MAX_QUESTION_CHARS = 1600;
const MAX_CONTEXT_CHARS = 2400;
const PDF_PAGE_MIN = 1;
const PDF_PAGE_MAX = 46;
const RETRY_DELAYS_MS = [0, 1400, 3500, 7000];
const TRANSIENT_HTTP_CODES = { 429: true, 500: true, 502: true, 503: true, 504: true };

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = safeCallbackName_(params.callback || 'callback');

  try {
    const question = String(params.q || '').trim();
    const context = String(params.context || '').trim().slice(0, MAX_CONTEXT_CHARS);

    if (!question) {
      return jsonp_(callback, { error: 'Please enter a contract question.' });
    }
    if (question.length > MAX_QUESTION_CHARS) {
      return jsonp_(callback, { error: 'Please shorten the question to 1,600 characters or fewer.' });
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing from Apps Script Project Settings → Script Properties.');
    }

    const contractText = getCachedText_('bta_contract_text_v1', CONTRACT_TEXT_URL, 21600);
    const numericReference = getCachedText_('bta_numeric_reference_v1', NUMERIC_REFERENCE_URL, 21600);

    const salaryRelevant = /\b(salary|step|column|ba\d*|m\d+|master|bachelor|teaching assistant|\bta\b)\b/i.test(question);
    const salarySchedules = salaryRelevant
      ? getCachedText_('bta_salary_schedules_v1', SALARY_SCHEDULES_URL, 21600)
      : '';

    const payload = buildGeminiPayload_(question, context, contractText, numericReference, salarySchedules);
    const result = callGemini_(apiKey, payload, contractText);
    return jsonp_(callback, result);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonp_(callback, {
      error: 'The Contract Assistant is temporarily unavailable. Please try again in a few minutes.'
    });
  }
}

function buildGeminiPayload_(question, context, contractText, numericReference, salarySchedules) {
  const systemInstruction = [
    'You are the Bridgehampton Teachers Association Contract Assistant.',
    'Your controlling source is ONLY the supplied 2025-2030 Bridgehampton BTA Agreement and the supplied verified contract tables.',
    'Do not use general internet knowledge, New York law, another district contract, past practice, or assumptions as authority.',
    'If the supplied sources do not answer the question, say that the agreement does not specify it.',
    'Never invent contract language, dates, rights, exceptions, amounts, deadlines, or interpretations.',
    'If the wording is ambiguous, fact-dependent, deadline-sensitive, or could reasonably require union interpretation, say so and set needs_bta_followup to true.',
    'Distinguish direct contract language from a calculation or inference.',
    'Every substantive answer that is found in the contract must include at least one source.',
    'For EACH source, provide anchor: a distinctive exact excerpt of 6 to 18 consecutive words copied from the same contract provision that supports the answer.',
    'The anchor must occur in the OFFICIAL AGREEMENT TEXT, not merely in the table of contents or numeric reference.',
    'Do not paraphrase the anchor. Preserve the source words; line breaks do not matter.',
    'PDF page means the sequential PDF page shown by markers like === PDF PAGE 23 ===, not the printed page number inside the document.',
    'Keep answers concise, practical, and written for a BTA member.',
    'Do not quote long passages in the answer. Summarize accurately and point the member to the cited source.',
    'If a question includes confidential student, medical, disciplinary, or grievance details, do not repeat unnecessary private details and remind the member to contact a BTA officer for individualized guidance.'
  ].join('\n');

  const userParts = [
    'MEMBER QUESTION:\n' + question,
    context ? 'LIMITED CONVERSATION CONTEXT (for resolving pronouns/follow-ups only; this is NOT an authoritative source):\n' + context : '',
    'OFFICIAL AGREEMENT TEXT WITH SEQUENTIAL PDF PAGE MARKERS:\n' + contractText,
    'VERIFIED NUMERIC / ARTICLE REFERENCE EXTRACTED FROM THE SAME AGREEMENT:\n' + numericReference,
    salarySchedules ? 'VERIFIED FULL SALARY SCHEDULE DATA:\n' + salarySchedules : ''
  ].filter(Boolean).join('\n\n---\n\n');

  return {
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: userParts }]
    }],
    generationConfig: {
      maxOutputTokens: 1400,
      thinkingConfig: {
        thinkingLevel: 'minimal'
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          answer: { type: 'STRING' },
          found_in_contract: { type: 'BOOLEAN' },
          caveat: { type: 'STRING' },
          needs_bta_followup: { type: 'BOOLEAN' },
          sources: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                article: { type: 'STRING' },
                section: { type: 'STRING' },
                label: { type: 'STRING' },
                pdf_page: { type: 'INTEGER' },
                anchor: { type: 'STRING' }
              },
              required: ['article', 'section', 'label', 'pdf_page', 'anchor']
            }
          }
        },
        required: ['answer', 'found_in_contract', 'caveat', 'needs_bta_followup', 'sources']
      }
    }
  };
}

function callGemini_(apiKey, payload, contractText) {
  var lastError = null;

  for (var m = 0; m < GEMINI_MODELS.length; m++) {
    var model = GEMINI_MODELS[m];

    for (var attemptIndex = 0; attemptIndex < RETRY_DELAYS_MS.length; attemptIndex++) {
      var attempt = attemptIndex + 1;
      var configuredDelay = RETRY_DELAYS_MS[attemptIndex];
      if (configuredDelay > 0) {
        Utilities.sleep(configuredDelay + Math.floor(Math.random() * 500));
      }

      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(apiKey);

      var response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var status = response.getResponseCode();
      var body = response.getContentText();

      if (status >= 200 && status < 300) {
        console.log('Gemini success using ' + model + ' (attempt ' + attempt + ')');

        var data = JSON.parse(body);
        var parts = data && data.candidates && data.candidates[0] &&
          data.candidates[0].content && data.candidates[0].content.parts;

        if (!parts || !parts.length || !parts[0].text) {
          throw new Error('Gemini returned no usable answer.');
        }

        var parsed = JSON.parse(parts[0].text);
        return normalizeResult_(parsed, contractText);
      }

      console.error('Gemini ' + model + ' HTTP ' + status + ' (attempt ' + attempt + '): ' + body);
      lastError = new Error('Gemini request failed with HTTP ' + status + ' on ' + model);

      if (!TRANSIENT_HTTP_CODES[status]) {
        throw lastError;
      }

      if (attemptIndex < RETRY_DELAYS_MS.length - 1) {
        var retryAfterMs = retryAfterMilliseconds_(response);
        if (retryAfterMs > RETRY_DELAYS_MS[attemptIndex + 1]) {
          var extraWait = Math.min(retryAfterMs - RETRY_DELAYS_MS[attemptIndex + 1], 7000);
          if (extraWait > 0) Utilities.sleep(extraWait);
        }
      }
    }
  }

  throw lastError || new Error('Gemini request failed on all configured models.');
}

function retryAfterMilliseconds_(response) {
  try {
    var headers = response.getAllHeaders ? response.getAllHeaders() : response.getHeaders();
    if (!headers) return 0;
    var raw = headers['Retry-After'] || headers['retry-after'];
    var seconds = Number(raw);
    return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000, 12000) : 0;
  } catch (err) {
    return 0;
  }
}

function normalizeResult_(value, contractText) {
  const result = value || {};
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const pages = splitContractPages_(contractText);

  const normalizedSources = sources.slice(0, 5).map(function (source) {
    const modelPage = Number(source && source.pdf_page);
    const resolvedPage = resolvePdfPage_(source, pages);
    const page = resolvedPage || (isPlausibleModelPage_(source, modelPage, pages) ? Math.round(modelPage) : 0);

    if (resolvedPage && Number.isFinite(modelPage) && Math.round(modelPage) !== resolvedPage) {
      console.log(
        'Citation corrected from model page ' + Math.round(modelPage) +
        ' to PDF page ' + resolvedPage +
        ' for ' + String((source && source.label) || (source && source.section) || 'source')
      );
    }

    return {
      article: String((source && source.article) || ''),
      section: String((source && source.section) || ''),
      label: String((source && source.label) || ''),
      pdf_page: page
    };
  }).filter(function (source) {
    return source.pdf_page >= PDF_PAGE_MIN && source.pdf_page <= PDF_PAGE_MAX;
  });

  const seenSources = {};
  const uniqueSources = normalizedSources.filter(function (source) {
    const key = [
      String(source.article || '').trim().toLowerCase(),
      String(source.section || '').trim().toLowerCase(),
      Number(source.pdf_page)
    ].join('|');

    if (seenSources[key]) return false;
    seenSources[key] = true;
    return true;
  });

  return {
    answer: String(result.answer || 'The agreement does not specify that.'),
    found_in_contract: result.found_in_contract === true,
    caveat: String(result.caveat || ''),
    needs_bta_followup: result.needs_bta_followup === true,
    sources: uniqueSources
  };
}

function splitContractPages_(contractText) {
  const text = String(contractText || '');
  const marker = /=== PDF PAGE (\d+) ===/g;
  const matches = [];
  let match;

  while ((match = marker.exec(text)) !== null) {
    matches.push({ page: Number(match[1]), markerStart: match.index, contentStart: marker.lastIndex });
  }

  return matches.map(function (item, index) {
    const end = index + 1 < matches.length ? matches[index + 1].markerStart : text.length;
    const raw = text.slice(item.contentStart, end);
    return {
      page: item.page,
      raw: raw,
      normalized: normalizeForMatching_(raw)
    };
  });
}

function resolvePdfPage_(source, pages) {
  if (!source || !pages || !pages.length) return 0;

  const anchor = normalizeForMatching_(source.anchor || '');
  const label = normalizeForMatching_(source.label || '');
  const section = normalizeForMatching_(source.section || '');
  const articleRange = findArticleOrAppendixRange_(source.article || '', pages);
  const candidates = articleRange
    ? pages.filter(function (page) { return page.page >= articleRange.start && page.page <= articleRange.end; })
    : pages.filter(function (page) { return page.page >= 4; });

  if (anchor && anchor.split(' ').length >= 4) {
    const exactMatches = candidates.filter(function (page) {
      return page.normalized.indexOf(anchor) >= 0;
    });

    if (exactMatches.length === 1) return exactMatches[0].page;
    if (exactMatches.length > 1) return bestScoredPage_(source, exactMatches);
  }

  if (anchor) {
    const anchorTokens = meaningfulTokens_(anchor);
    if (anchorTokens.length >= 4) {
      const scored = candidates.map(function (page) {
        return {
          page: page,
          coverage: tokenCoverage_(anchorTokens, page.normalized),
          score: scorePage_(source, page)
        };
      }).sort(function (a, b) {
        if (b.coverage !== a.coverage) return b.coverage - a.coverage;
        return b.score - a.score;
      });

      if (scored.length && scored[0].coverage >= 0.78) return scored[0].page.page;
    }
  }

  const metadataWinner = candidates.map(function (page) {
    return { page: page, score: scorePage_(source, page) };
  }).sort(function (a, b) { return b.score - a.score; })[0];

  if (metadataWinner && metadataWinner.score >= 18) return metadataWinner.page.page;

  const modelPage = Number(source.pdf_page);
  if (isPlausibleModelPage_(source, modelPage, pages, articleRange)) return Math.round(modelPage);

  if (label || section) {
    console.log('Citation could not be confidently resolved for: ' + String(source.label || source.section));
  }
  return 0;
}

function bestScoredPage_(source, pages) {
  const ranked = pages.map(function (page) {
    return { page: page, score: scorePage_(source, page) };
  }).sort(function (a, b) { return b.score - a.score; });
  return ranked.length ? ranked[0].page.page : 0;
}

function scorePage_(source, page) {
  const pageText = page.normalized;
  const label = normalizeForMatching_(source.label || '');
  const section = normalizeForMatching_(source.section || '');
  const anchor = normalizeForMatching_(source.anchor || '');
  let score = 0;

  if (anchor && pageText.indexOf(anchor) >= 0) score += 100;
  if (label && pageText.indexOf(label) >= 0) score += 28;
  if (section && section.length >= 3 && pageText.indexOf(section) >= 0) score += 20;

  const labelTokens = meaningfulTokens_(label);
  const sectionTokens = meaningfulTokens_(section);
  const anchorTokens = meaningfulTokens_(anchor);

  score += tokenCoverage_(labelTokens, pageText) * 12;
  score += tokenCoverage_(sectionTokens, pageText) * 8;
  score += tokenCoverage_(anchorTokens, pageText) * 20;

  const modelPage = Number(source.pdf_page);
  if (Number.isFinite(modelPage) && Math.round(modelPage) === page.page) score += 2;

  return score;
}

function findArticleOrAppendixRange_(articleValue, pages) {
  const article = String(articleValue || '').trim();
  if (!article) return null;

  const articleMatch = /\bARTICLE\s+([IVXLCDM]+)\b/i.exec(article);
  const appendixMatch = /\bAPPENDIX\s+([A-Z])\b/i.exec(article);
  let headingRegex = null;

  if (articleMatch) {
    headingRegex = new RegExp('(?:^|\\n)\\s*ARTICLE\\s+' + escapeRegex_(articleMatch[1]) + '\\s*(?:\\r?\\n|$)', 'i');
  } else if (appendixMatch) {
    headingRegex = new RegExp('(?:^|\\n)\\s*APPENDIX\\s+' + escapeRegex_(appendixMatch[1]) + '\\s*(?:\\r?\\n|$)', 'i');
  } else {
    return null;
  }

  let start = 0;
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].page < 4) continue;
    if (headingRegex.test(pages[i].raw)) {
      start = pages[i].page;
      break;
    }
  }
  if (!start) return null;

  let end = PDF_PAGE_MAX;
  const anyNextHeading = /(?:^|\n)\s*(?:ARTICLE\s+[IVXLCDM]+|APPENDIX\s+[A-Z])\s*(?:\r?\n|$)/i;
  for (let j = 0; j < pages.length; j++) {
    if (pages[j].page <= start) continue;
    if (anyNextHeading.test(pages[j].raw)) {
      end = pages[j].page;
      break;
    }
  }

  return { start: start, end: Math.max(start, end) };
}

function isPlausibleModelPage_(source, modelPage, pages, articleRange) {
  if (!Number.isFinite(Number(modelPage))) return false;
  const pageNumber = Math.round(Number(modelPage));
  if (pageNumber < PDF_PAGE_MIN || pageNumber > PDF_PAGE_MAX) return false;

  const range = articleRange || findArticleOrAppendixRange_(source.article || '', pages);
  if (range && (pageNumber < range.start || pageNumber > range.end)) return false;

  const page = pages.filter(function (item) { return item.page === pageNumber; })[0];
  if (!page) return false;

  const anchor = normalizeForMatching_(source.anchor || '');
  if (anchor && page.normalized.indexOf(anchor) >= 0) return true;

  const labelCoverage = tokenCoverage_(meaningfulTokens_(normalizeForMatching_(source.label || '')), page.normalized);
  const sectionCoverage = tokenCoverage_(meaningfulTokens_(normalizeForMatching_(source.section || '')), page.normalized);
  return labelCoverage >= 0.6 || sectionCoverage >= 0.75;
}

function normalizeForMatching_(value) {
  return String(value || '')
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function meaningfulTokens_(normalizedText) {
  if (!normalizedText) return [];
  const stop = {
    'the': true, 'and': true, 'for': true, 'with': true, 'from': true, 'that': true,
    'this': true, 'shall': true, 'will': true, 'are': true, 'was': true, 'were': true,
    'into': true, 'under': true, 'article': true, 'section': true, 'page': true
  };

  const seen = {};
  return normalizedText.split(' ').filter(function (token) {
    if (!token || stop[token]) return false;
    if (token.length < 2 && !/^\d$/.test(token)) return false;
    if (seen[token]) return false;
    seen[token] = true;
    return true;
  });
}

function tokenCoverage_(tokens, pageText) {
  if (!tokens || !tokens.length || !pageText) return 0;
  const padded = ' ' + pageText + ' ';
  let found = 0;
  tokens.forEach(function (token) {
    if (padded.indexOf(' ' + token + ' ') >= 0) found++;
  });
  return found / tokens.length;
}

function getCachedText_(cacheKey, url, ttlSeconds) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Could not load source file: ' + url + ' (HTTP ' + status + ')');
  }

  const text = response.getContentText();
  if (text.length < 95000) {
    cache.put(cacheKey, text, ttlSeconds);
  }
  return text;
}

function safeCallbackName_(name) {
  const candidate = String(name || 'callback');
  return /^[A-Za-z_$][0-9A-Za-z_$\.]{0,120}$/.test(candidate) ? candidate : 'callback';
}

function jsonp_(callback, payload) {
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function escapeRegex_(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function testContractAssistant() {
  const fakeEvent = {
    parameter: {
      q: 'What do I have to do to qualify for the retirement incentive during the 2026-2027 school year, and what is the deadline?',
      callback: 'testCallback'
    }
  };
  const output = doGet(fakeEvent);
  console.log(output.getContent());
}
