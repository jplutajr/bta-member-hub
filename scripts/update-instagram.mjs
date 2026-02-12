/**
 * Update data/instagram.json with the latest Instagram post info.
 *
 * Goal: FREE + reasonably stable for a static GitHub Pages site.
 *
 * Approach:
 * - Run server-side in GitHub Actions (avoids browser CORS + adblock issues)
 * - Fetch public profile HTML via r.jina.ai (simple text proxy)
 * - Extract the newest post shortcode
 * - Fetch the post page (also via r.jina.ai) and extract OpenGraph metadata
 * - Write a tiny JSON file that the site can load safely
 *
 * Notes:
 * - Instagram can change markup at any time. This is still best-effort.
 * - If fetch/parsing fails, we keep the existing JSON and exit 0 (no broken deploy).
 */

import fs from "node:fs";
import path from "node:path";

const IG_HANDLE = process.env.IG_HANDLE || "bhsteachersassociation";
const OUT_PATH = process.env.IG_OUT_PATH || "data/instagram.json";

const JINA = (url) => `https://r.jina.ai/${url.replace(/^https?:\/\//, "https://")}`;

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJsonPretty(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "bta-member-hub-bot/1.0 (GitHub Actions)",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText} :: ${url}`);
  return await res.text();
}

function firstMatch(re, text) {
  const m = text.match(re);
  return m ? m[1] : "";
}

function decodeHtml(s) {
  return String(s || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function extractLatestShortcode(profileHtml) {
  // Instagram embeds JSON blobs containing "shortcode":"...".
  // We'll take the first occurrence.
  const code = firstMatch(/"shortcode"\s*:\s*"([A-Za-z0-9_-]+)"/, profileHtml);
  return code;
}

function extractOg(postHtml) {
  // OpenGraph tags are stable-ish and good enough for a preview.
  const ogImage = decodeHtml(
    firstMatch(/property="og:image"\s+content="([^"]+)"/i, postHtml) ||
      firstMatch(/name="og:image"\s+content="([^"]+)"/i, postHtml)
  );
  const ogDesc = decodeHtml(
    firstMatch(/property="og:description"\s+content="([^"]+)"/i, postHtml) ||
      firstMatch(/name="og:description"\s+content="([^"]+)"/i, postHtml)
  );
  const ogTitle = decodeHtml(
    firstMatch(/property="og:title"\s+content="([^"]+)"/i, postHtml) ||
      firstMatch(/name="og:title"\s+content="([^"]+)"/i, postHtml)
  );
  return { ogImage, ogDesc, ogTitle };
}

async function main() {
  const outAbs = path.resolve(OUT_PATH);
  console.log(`IG_HANDLE: ${IG_HANDLE}`);
  console.log(`OUT_PATH: ${OUT_PATH}`);

  const current = readJsonSafe(outAbs, {});

  try {
    const profileUrl = `https://www.instagram.com/${encodeURIComponent(IG_HANDLE)}/`;
    const profileHtml = await fetchText(JINA(profileUrl));

    const shortcode = extractLatestShortcode(profileHtml);
    if (!shortcode) throw new Error("Could not find a shortcode on profile page");

    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    const postHtml = await fetchText(JINA(postUrl));
    const { ogImage, ogDesc, ogTitle } = extractOg(postHtml);

    const next = {
      instagramHandle: IG_HANDLE,
      postUrl,
      imageUrl: ogImage || "",
      title: ogTitle || "",
      description: ogDesc || "",
      lastAutoUpdated: new Date().toISOString(),
    };

    if ((current.postUrl || "") === postUrl && (current.imageUrl || "") === (next.imageUrl || "")) {
      console.log("No change detected. Exiting cleanly.");
      return;
    }

    writeJsonPretty(outAbs, next);
    console.log(`Updated latest Instagram post -> ${postUrl}`);
  } catch (err) {
    // Don't break the site/deploy if Instagram blocks us today.
    console.warn("Instagram update failed. Keeping existing data.");
    console.warn(String(err?.stack || err));
  }
}

await main();
