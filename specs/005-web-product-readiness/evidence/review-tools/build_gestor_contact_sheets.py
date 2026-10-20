import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "screenshots" / "gestor" / "baseline"
TARGET = ROOT / "contact-sheets" / "gestor" / "baseline"
TARGET.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.load_default()
CELL_WIDTH = 480
CELL_HEIGHT = 360
LABEL_HEIGHT = 32
MARGIN = 14

IDS = [
    "SURF-010", "SURF-011", "SURF-012", "SURF-013",
    "SURF-014", "SURF-015", "SURF-016", "SURF-017",
    "SURF-018", "SURF-019", "SURF-020", "SURF-021",
    "FORM-001", "FORM-002", "FORM-003", "FORM-004",
    "FORM-005", "FORM-006", "FORM-007", "FORM-013"
]

def compute_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def render_sheet(item_id: str) -> None:
    paths = sorted(SOURCE.glob(f"{item_id}__*.png"))
    if len(paths) != 8:
        raise RuntimeError(f"{item_id}: expected 8 screenshots, found {len(paths)}")

    # 2 columns x 4 rows
    sheet = Image.new("RGB", (CELL_WIDTH * 2, CELL_HEIGHT * 4), "#18181b")
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGB")
        available_width = CELL_WIDTH - 2 * MARGIN
        available_height = CELL_HEIGHT - LABEL_HEIGHT - 2 * MARGIN
        scale = min(available_width / image.width, available_height / image.height)
        resized = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )

        column = index % 2
        row = index // 2
        x = column * CELL_WIDTH + (CELL_WIDTH - resized.width) // 2
        y = row * CELL_HEIGHT + MARGIN
        sheet.paste(resized, (x, y))
        label = path.stem.replace(f"{item_id}__", "")
        draw.text(
            (column * CELL_WIDTH + MARGIN, (row + 1) * CELL_HEIGHT - LABEL_HEIGHT + 6),
            f"{item_id} | {label}",
            fill="#e4e4e7",
            font=FONT,
        )

    output_path = TARGET / f"{item_id}-contact-sheet.png"
    sheet.save(output_path, optimize=True)
    print(f"Rendered: {output_path.name}")

def generate_html_index() -> None:
    html_lines = [
        "<!DOCTYPE html>",
        "<html lang=\"es\">",
        "<head>",
        "  <meta charset=\"UTF-8\">",
        "  <title>Contact Sheet: GESTOR/BASELINE — Feature 005</title>",
        "  <style>",
        "    body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, monospace; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }",
        "    h1 { font-size: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 24px; }",
        "    .matrix-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 24px; padding: 16px; }",
        "    .card-title { font-size: 14px; font-weight: bold; margin-bottom: 12px; display: flex; gap: 12px; align-items: center; }",
        "    .badge { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }",
        "    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }",
        "    .cell { background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 8px; text-align: center; }",
        "    .cell-label { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }",
        "    .cell img { max-width: 100%; height: auto; border-radius: 2px; border: 1px solid #475569; display: block; margin: 0 auto; }",
        "  </style>",
        "</head>",
        "<body>",
        f"  <h1>Contact Sheet: GESTOR/BASELINE (Total Items: {len(IDS)}, Total Screenshots: {len(IDS) * 8})</h1>",
    ]

    for item_id in IDS:
        paths = sorted(SOURCE.glob(f"{item_id}__*.png"))
        html_lines.append("  <div class=\"matrix-card\">")
        html_lines.append("    <div class=\"card-title\">")
        html_lines.append(f"      <span class=\"badge\">{item_id}</span>")
        html_lines.append(f"      <span>Item: {item_id}</span>")
        html_lines.append("    </div>")
        html_lines.append("    <div class=\"grid\">")
        for p in paths:
            rel = f"../../screenshots/gestor/baseline/{p.name}"
            label = p.stem.replace(f"{item_id}__", "")
            html_lines.append("      <div class=\"cell\">")
            html_lines.append(f"        <div class=\"cell-label\">{label}</div>")
            html_lines.append(f"        <a href=\"{rel}\" target=\"_blank\"><img src=\"{rel}\" alt=\"{p.name}\" loading=\"lazy\"/></a>")
            html_lines.append("      </div>")
        html_lines.append("    </div>")
        html_lines.append("  </div>")

    html_lines.append("</body>")
    html_lines.append("</html>")

    index_path = TARGET / "index.html"
    index_path.write_text("\n".join(html_lines), encoding="utf-8")
    print(f"Generated HTML index: {index_path.name}")

def audit_hashes() -> None:
    all_pngs = sorted(SOURCE.glob("*.png"))
    hashes = {}
    collisions = []
    light_dark_collisions = []

    for p in all_pngs:
        h = compute_hash(p)
        if h in hashes:
            collisions.append((p.name, hashes[h]))
        hashes[h] = p.name

    # Check pairs
    for item_id in IDS:
        for w in [375, 768, 1024, 1440]:
            light_files = list(SOURCE.glob(f"{item_id}__*__{w}w__light.png"))
            dark_files = list(SOURCE.glob(f"{item_id}__*__{w}w__dark.png"))
            if light_files and dark_files:
                lh = compute_hash(light_files[0])
                dh = compute_hash(dark_files[0])
                if lh == dh:
                    light_dark_collisions.append((light_files[0].name, dark_files[0].name))

    print(f"\n--- HASH AUDIT SUMMARY ---")
    print(f"Total PNGs audited: {len(all_pngs)}")
    print(f"Unique SHA-256 hashes: {len(hashes)}")
    print(f"Total hash collisions: {len(collisions)}")
    if collisions:
        for c in collisions:
            print(f"  COLLISION: {c[0]} == {c[1]}")
    print(f"Identical Light/Dark pairs: {len(light_dark_collisions)}")
    if light_dark_collisions:
        for c in light_dark_collisions:
            print(f"  LIGHT/DARK COLLISION: {c[0]} == {c[1]}")

if __name__ == "__main__":
    for item_id in IDS:
        render_sheet(item_id)
    generate_html_index()
    audit_hashes()
    print(f"Successfully generated {len(IDS)} contact sheets and index in {TARGET}")
