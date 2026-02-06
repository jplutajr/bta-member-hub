# BTA Member Hub (Static Site)

This is a **free** static site designed to replace the current Google Site with something more official, searchable, and maintainable.

## What you edit
All content is driven by JSON files in `/data/`:

- `data/news.json` — news posts
- `data/events.json` — events list
- `data/docs.json` — contract/bylaws/MOAs/etc
- `data/staff.json` — staff directory (imported from your doc)
- `data/resources.json` — NYSUT + helpful links
- `data/minutes.json` — meeting minutes links

## Local preview (no coding experience required)
**Do not** double-click `index.html` (fetch() will fail in some browsers).
Instead:

1. Install VS Code (free).
2. In VS Code, install the extension **"Live Server"**.
3. Open this folder in VS Code.
4. Right-click `index.html` → **Open with Live Server**.

## Deploy for free on GitHub Pages
GitHub Pages on the **Free plan requires a PUBLIC repository**. Source: GitHub Docs: "GitHub Pages is available in public repositories with GitHub Free" (and private repos require Pro/Team/etc). 

Steps:
1. Create a GitHub account (free) if you don’t have one.
2. Create a new repository named: `bta-member-hub` (Public).
3. Upload all files from this folder to the repository.
4. In the repo: **Settings → Pages**
5. Under "Build and deployment":
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
6. Save. GitHub will give you the site URL.

## Reality check (read this)
Static sites **cannot truly password-protect content**.
If you need member-only docs, keep them in restricted Google Drive and put links in `docs.json`.