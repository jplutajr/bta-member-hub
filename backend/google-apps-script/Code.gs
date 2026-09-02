/**
 * BTA Contract Assistant — Google Apps Script backend
 *
 * Required Script Property:
 *   GEMINI_API_KEY = your Google AI Studio API key
 *
 * Deploy this project as a Web App:
 *   Execute as: Me
 *   Who has access: Anyone
 *
 * The public website calls this endpoint with JSONP, so the API key never appears
 * in GitHub or browser JavaScript.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const REPO_RAW_BASE = 'https://raw.githubusercontent.com/jplutajr/bta-member-hub/main/';
const CONTRACT_TEXT_URL = REPO_RAW_BASE + 'data/contract-text.txt';
const NUMERIC_REFERENCE_URL = REPO_RAW_BASE + 'data/contract-numeric-reference.json';
const SALARY_SCHEDULES_URL = REPO_RAW_BASE + 'data/salary-schedules.json';
const MAX_QUESTION_CHARS = 1600;
const MAX_CONTEXT_CHARS = 2400;

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

    // Only attach all 1,500 salary cells when the question is actually about salary placement.
    const salaryRelevant = /\b(salary|step|column|ba\d*|m\d+|master|bachelor|teaching assistant|\bta\b)\b/i.test(question);
    const salarySchedules = salaryRelevant
      ? getCachedText_('bta_salary_schedules_v1', SALARY_SCHEDULES_URL, 21600)
      : '';

    const payload = buildGeminiPayload_(question, context, contractText, numericReference, salarySchedules);
    const result = callGemini_(apiKey, payload);
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
    'PDF page means the sequential PDF page shown by markers like === PDF PAGE 23 ===, not the printed page number inside the document.',
    'Keep answers concise, practical, and written for a BTA member.',
    'Do not quote long passages. Summarize accurately and point the member to the cited source.',
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
      temperature: 0.1,
      maxOutputTokens: 1800,
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
                pdf_page: { type: 'INTEGER' }
              },
              required: ['article', 'section', 'label', 'pdf_page']
            }
          }
        },
        required: ['answer', 'found_in_contract', 'caveat', 'needs_bta_followup', 'sources']
      }
    }
  };
}

function callGemini_(apiKey, payload) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(GEMINI_MODEL) + ':generateContent?key=' + encodeURIComponent(apiKey);

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status < 200 || status >= 300) {
    console.error('Gemini HTTP ' + status + ': ' + body);
    throw new Error('Gemini request failed with HTTP ' + status);
  }

  const data = JSON.parse(body);
  const parts = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts;

  if (!parts || !parts.length || !parts[0].text) {
    throw new Error('Gemini returned no usable answer.');
  }

  const parsed = JSON.parse(parts[0].text);
  return normalizeResult_(parsed);
}

function normalizeResult_(value) {
  const result = value || {};
  const sources = Array.isArray(result.sources) ? result.sources : [];

  return {
    answer: String(result.answer || 'The agreement does not specify that.'),
    found_in_contract: result.found_in_contract === true,
    caveat: String(result.caveat || ''),
    needs_bta_followup: result.needs_bta_followup === true,
    sources: sources.slice(0, 5).map(function (source) {
      const page = Number(source && source.pdf_page);
      return {
        article: String((source && source.article) || ''),
        section: String((source && source.section) || ''),
        label: String((source && source.label) || ''),
        pdf_page: Number.isFinite(page) ? Math.round(page) : 0
      };
    }).filter(function (source) {
      return source.pdf_page >= 1 && source.pdf_page <= 46;
    })
  };
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
  // CacheService has a per-entry size limit, so only cache files small enough to fit safely.
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

/**
 * OPTIONAL TEST FUNCTION.
 * In Apps Script, select testContractAssistant from the function dropdown and click Run.
 * Check the Execution log. This does not require the website.
 */
function testContractAssistant() {
  const fakeEvent = {
    parameter: {
      q: 'How many personal days do I get?',
      callback: 'testCallback'
    }
  };
  const output = doGet(fakeEvent);
  console.log(output.getContent());
}
