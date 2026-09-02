# BTA Contract Assistant — Gemini + Google Apps Script

This website uses a free-oriented architecture:

`Member browser → BTA GitHub Pages → Google Apps Script → Gemini API`

The Gemini API key is stored only in Google Apps Script Script Properties as `GEMINI_API_KEY`. It must never be committed to GitHub.

## Files

- `assets/contracts/Bridgehampton_BTA_Agreement_2025-2030_Official_Clean.pdf` — member-facing official PDF.
- `data/contract-text.txt` — page-marked text extracted from the same 46-page PDF for AI grounding.
- `data/contract-numeric-reference.json` — verified structured contract numbers and page references.
- `data/salary-schedules.json` — verified salary schedules.
- `data/contract-assistant.json` — website configuration. Only the Apps Script `/exec` URL is placed here; never the API key.
- `backend/google-apps-script/Code.gs` — backend code to paste into Google Apps Script.

## Model

The backend is configured for `gemini-2.5-flash`, which Google currently provides with a free-tier text input/output option. Do not enable billing if the goal is to guarantee no API charges.

## Setup

Follow `GEMINI_SETUP_FROM_STEP_5.txt` for the exact click-by-click process.

## Updating the contract later

When the controlling contract changes:

1. Replace the member-facing PDF.
2. Regenerate `data/contract-text.txt` from the exact replacement PDF while preserving sequential PDF page markers.
3. Update any structured numeric references and salary schedule data that changed.
4. Test known-answer and agreement-silent questions before public use.

The assistant is intentionally instructed to use only the supplied agreement and verified tables. It should not treat outside law, past practice, or other contracts as authority.
