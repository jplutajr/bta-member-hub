This folder contains the Google Apps Script backend for the BTA Contract Assistant.

Use Code.gs in your Google Apps Script project.

Required Script Property:
GEMINI_API_KEY

Model:
gemini-2.5-flash

The code loads these public, non-secret source files from the BTA GitHub repository:
- data/contract-text.txt
- data/contract-numeric-reference.json
- data/salary-schedules.json (only for salary-related questions)

See GEMINI_SETUP_FROM_STEP_5.txt in the website root for exact deployment instructions.
