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
