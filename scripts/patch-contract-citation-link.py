from pathlib import Path
import re

app_path = Path('assets/app.js')
text = app_path.read_text(encoding='utf-8')
old = '''      if (Number.isInteger(page) && page >= 1 && page <= 44) {
        return `<a class="contractSource" href="${escapeHtml(citationPdfPath)}#page=${page}" target="_blank" rel="noopener"><span>${escapeHtml(label)}</span><b>PDF p. ${page}</b></a>`;
      }'''
new = '''      if (Number.isInteger(page) && page >= 1 && page <= 44) {
        const citationUrl = `contract-citation.html?page=${page}&label=${encodeURIComponent(label)}`;
        return `<a class="contractSource" href="${escapeHtml(citationUrl)}" target="_blank" rel="noopener"><span>${escapeHtml(label)}</span><b>PDF p. ${page}</b></a>`;
      }'''
if old not in text:
    raise SystemExit('Could not find current citation link block')
text = text.replace(old, new, 1)
app_path.write_text(text, encoding='utf-8')

index_path = Path('index.html')
html = index_path.read_text(encoding='utf-8')
html = re.sub(r'assets/app\.js\?v=[A-Za-z0-9_-]+', 'assets/app.js?v=FINAL20', html, count=1)
index_path.write_text(html, encoding='utf-8')
print('Patched Contract Assistant source links to same-site cited-page viewer')
