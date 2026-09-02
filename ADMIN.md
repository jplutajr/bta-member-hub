# BTA Member Hub — Quick Updates (No Code Changes)

## Update “Latest Updates” (News)
1. Open `data/news.json`
2. Add a new item at the **TOP** of the list.
3. Use this format:

```json
{
  "date": "YYYY-MM-DD",
  "title": "Short headline",
  "body": "Optional short details (1–2 sentences).",
  "tags": ["optional", "tags"]
}
```

4. Commit the change.

**Home page:** shows newest 3 items.  
**News page:** shows all items.

## Update “Upcoming Events”
Events on the **Home** page and the **Events** tab are pulled **live** from the BTA Google Calendar.
To update events, add/edit events in Google Calendar — no website edits needed.

### One-time check: calendar must be public
Google Calendar → Settings → Access permissions:
- ✅ Make available to public (and allow “See all event details”)

If the calendar is not public, only you will see events in the embed.

## Update the Salary Lookup
The salary lookup uses two sets of files:

- `data/salary-schedules.json` — the values used by the website lookup
- `assets/salary-schedules/` — the official PDF schedules members can open

The page automatically selects the schedule whose effective dates include the current date.

When a future contract adds new schedules:
1. Add the official PDF to `assets/salary-schedules/`.
2. Add the matching schedule, dates, steps, columns, and PDF path to `data/salary-schedules.json`.
3. Verify at least one salary from each column against the official PDF before publishing.
4. Do not include stipends, extra classes, buyback, summer work, or employee names in this data.

The finalized 2025-26 through 2029-30 schedules are already loaded.

## Update the 2025-2030 Contract Center
The Contract page uses:

- `assets/contracts/Bridgehampton_BTA_Agreement_2025-2030_Official_Clean.pdf` - the official PDF members read and the AI uses as its controlling source.
- `data/contract-assistant.json` - contract title, PDF path, and the deployed AI endpoint.
- `data/contract-numeric-reference.json` - verified numeric tables used to reduce AI errors on stipends, coaching, insurance percentages, and other number-heavy provisions.
- `data/salary-schedules.json` - exact salary-table data already used by the Salary page and also supplied to the contract assistant.
- `backend/google-apps-script/Code.gs` - Google Apps Script backend. The Gemini API key belongs in Apps Script Script Properties as `GEMINI_API_KEY`, never in GitHub.

If a signed/executed PDF replaces the clean copy, keep the same filename and replace the file. If the language or page count changes, re-check the numeric reference and source-page mapping before publishing.

If an MOA later changes the contract, do not simply tell the AI about it in prose. Add the executed MOA as an approved source and update the grounding rules/data so the assistant can identify which language controls.

See `CONTRACT_ASSISTANT_SETUP.md` for the one-time deployment steps.
