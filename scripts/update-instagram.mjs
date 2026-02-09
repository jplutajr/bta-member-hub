/**
 * Update data/social.json with the latest Instagram post URL.
 * Source: RSSHub Picuki route (no credentials) -> RSS XML.
 *
 * NOTE:
 * - This is "best free" and can occasionally break if the upstream changes.
 * - If it fails, the workflow will not commit.
 */

import fs from "node:fs";
import path from "node:path";

const INSTAGRAM_HANDLE = process.env.IG_HANDLE || "bhsteachersassociation";
const SOCIAL_PATH = process.env.SOCIAL_PATH || "data/social.json";

// RSSHub docs recommend Picuki/Picnob when Instagram private API needs credentials.
// We'll use Picuki route.
const FEED_URL =
  process.env.FEED_URL ||
  `https://rsshub.app/picuki/profile/${encodeURIComponent(INSTAGRAM_HANDLE)}`;

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

function extractFirstItemLinkFromRss(xml) {
  // Find first <item> ... <link>URL</link>
  // RSSHub generally sorts newest first.
  const itemMatch = xml.match(/<item\b[\s\S]*?<\/item>/i);
  if (!itemMatch) return "";

  const item = itemMatch[0];
  const linkMatch = item.match(/<link>(.*?)<\/link>/i);
  if (!linkMatch) return "";

  // Decode common entities
  return linkMatch[1]
    .trim()
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'");
}

async function main() {
  console.log(`Handle: ${INSTAGRAM_HANDLE}`);
  console.log(`Feed: ${FEED_URL}`);
  console.log(`Social path: ${SOCIAL_PATH}`);

  const res = await fetch(FEED_URL, {
    headers: {
      "user-agent": "bta-member-hub-bot/1.0 (GitHub Actions)"
    }
  });

  if (!res.ok) {
    throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const latestLink = extractFirstItemLinkFromRss(xml);

  if (!latestLink || !latestLink.includes("instagram.com")) {
    throw new Error(
      `Could not extract a valid Instagram link from feed. Got: ${latestLink || "(empty)"}`
    );
  }

  const current = readJsonSafe(SOCIAL_PATH, {});
  const next = {
    ...current,
    instagramHandle: current.instagramHandle || INSTAGRAM_HANDLE,
    instagramPostUrl: latestLink,
    lastAutoUpdated: new Date().toISOString()
  };

  // Only write if changed (keeps commits clean)
  const changed = (current.instagramPostUrl || "") !== latestLink;
  if (!changed) {
    console.log("No change: latest post URL is the same. Exiting cleanly.");
    return;
  }

  writeJsonPretty(SOCIAL_PATH, next);
  console.log(`Updated instagramPostUrl -> ${latestLink}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
