/**
 * Contact Sheet Generator for Feature 005 (Web Product Readiness)
 * 
 * Groups deterministic Playwright screenshots by surface/interaction ID and produces
 * a compact visual review matrix HTML file for fast human and automated review.
 * 
 * Usage:
 *   node generate-contact-sheets.js [public|gestor|delegado|dev|all]
 */

const fs = require('fs');
const path = require('path');

const AUDIENCES = ['public', 'gestor', 'delegado', 'dev'];
const WIDTHS = [375, 768, 1024, 1440];
const THEMES = ['light', 'dark'];

const EVIDENCE_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const CONTACT_SHEETS_DIR = path.join(EVIDENCE_DIR, 'contact-sheets');

function parseScreenshotFilename(filename) {
  // Format: {ID}__{actor}__{state}__{width}w__{theme}.png
  const base = filename.replace(/\.png$/i, '');
  const parts = base.split('__');
  if (parts.length < 5) return null;

  return {
    filename,
    id: parts[0],
    actor: parts[1],
    state: parts[2],
    width: parseInt(parts[3].replace('w', ''), 10),
    theme: parts[4],
  };
}

function generateContactSheetForAudience(audience) {
  const inputDir = path.join(SCREENSHOTS_DIR, audience);
  const outputDir = path.join(CONTACT_SHEETS_DIR, audience);

  if (!fs.existsSync(inputDir)) {
    console.warn(`Directory not found: ${inputDir}`);
    return;
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith('.png'));
  const parsed = files.map(parseScreenshotFilename).filter(Boolean);

  // Group by ID + actor + state
  const groups = new Map();
  for (const item of parsed) {
    const key = `${item.id}__${item.actor}__${item.state}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.id,
        actor: item.actor,
        state: item.state,
        cells: {},
      });
    }
    const cellKey = `${item.width}_${item.theme}`;
    groups.get(key).cells[cellKey] = item.filename;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contact Sheet: ${audience.toUpperCase()} — Feature 005</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }
    h1 { font-size: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 24px; }
    .matrix-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 24px; padding: 16px; }
    .card-title { font-size: 14px; font-weight: bold; margin-bottom: 12px; display: flex; gap: 12px; }
    .badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .cell { background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 8px; text-align: center; }
    .cell-label { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
    .cell img { max-width: 100%; height: auto; border-radius: 2px; border: 1px solid #475569; display: block; margin: 0 auto; }
    .missing { height: 120px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 12px; border: 1px dashed #475569; }
  </style>
</head>
<body>
  <h1>Contact Sheet: ${audience.toUpperCase()} (Total Groups: ${groups.size}, Total Images: ${parsed.length})</h1>
  ${Array.from(groups.values()).map((g) => `
    <div class="matrix-card">
      <div class="card-title">
        <span class="badge">${g.id}</span>
        <span>Actor: ${g.actor}</span>
        <span>State: ${g.state}</span>
      </div>
      <div class="grid">
        ${WIDTHS.flatMap((w) => THEMES.map((t) => {
          const key = `${w}_${t}`;
          const file = g.cells[key];
          return `
            <div class="cell">
              <div class="cell-label">${w}px • ${t.toUpperCase()}</div>
              ${file
                ? `<a href="../../screenshots/${audience}/${file}" target="_blank"><img src="../../screenshots/${audience}/${file}" alt="${file}" loading="lazy"/></a>`
                : `<div class="missing">PENDING EVIDENCE</div>`
              }
            </div>
          `;
        })).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>`;

  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
  console.log(`Generated contact sheet for ${audience}: ${path.join(outputDir, 'index.html')} (${parsed.length} screenshots)`);
}

const target = process.argv[2] || 'all';
if (target === 'all') {
  for (const aud of AUDIENCES) generateContactSheetForAudience(aud);
  if (fs.existsSync(path.join(SCREENSHOTS_DIR, 'public', 'accepted'))) {
    generateContactSheetForAudience('public/accepted');
  }
} else if (AUDIENCES.includes(target) || target === 'public/accepted') {
  generateContactSheetForAudience(target);
} else {
  console.error(`Unknown audience '${target}'. Choose from: ${AUDIENCES.join(', ')}, public/accepted, all`);
  process.exit(1);
}
