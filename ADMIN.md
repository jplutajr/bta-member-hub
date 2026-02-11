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
