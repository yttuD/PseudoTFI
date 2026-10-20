import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "screenshots" / "gestor" / "accepted-domain"
TARGET = ROOT / "contact-sheets" / "gestor" / "accepted-domain"
TARGET.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.load_default()
CELL_WIDTH = 480
CELL_HEIGHT = 360
LABEL_HEIGHT = 32
MARGIN = 14

# Discover all unique item IDs from the filenames
files = list(SOURCE.glob("*.png"))
item_ids = sorted(list(set(f.name.split("__")[0] for f in files)))

print(f"Discovered {len(item_ids)} unique items across {len(files)} screenshot files:")
for item_id in item_ids:
    print(f" - {item_id}")

def compute_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

# Check hash distribution and collisions
hashes = {}
collisions = []
identical_theme_pairs = []

for p in sorted(files):
    h = compute_hash(p)
    if h in hashes:
        collisions.append((p.name, hashes[h]))
    else:
        hashes[h] = p.name

# Check light vs dark identical pairs
for item_id in item_ids:
    for width in ["375w", "768w", "1024w", "1440w"]:
        light_files = list(SOURCE.glob(f"{item_id}__*_{width}__light.png"))
        dark_files = list(SOURCE.glob(f"{item_id}__*_{width}__dark.png"))
        if light_files and dark_files:
            h_light = compute_hash(light_files[0])
            h_dark = compute_hash(dark_files[0])
            if h_light == h_dark:
                identical_theme_pairs.append((light_files[0].name, dark_files[0].name))

print("\n--- Visual Integrity Audit ---")
print(f"Total Screenshots: {len(files)}")
print(f"Unique Hashes: {len(hashes)}")
print(f"Hash Collisions: {len(collisions)}")
print(f"Identical Light/Dark Pairs: {len(identical_theme_pairs)}")

def render_sheet(item_id: str) -> None:
    paths = sorted(SOURCE.glob(f"{item_id}__*.png"))
    if len(paths) != 8:
        print(f"Warning: {item_id} has {len(paths)} screenshots (expected 8)")

    # 2 columns x 4 rows
    sheet = Image.new("RGB", (CELL_WIDTH * 2, CELL_HEIGHT * 4), "#18181b")
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(paths[:8]):
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
    print(f"Rendered contact sheet: {output_path.name}")

for item_id in item_ids:
    render_sheet(item_id)

def generate_html_index() -> None:
    html_lines = [
        "<!DOCTYPE html>",
        "<html lang=\"es\">",
        "<head>",
        "  <meta charset=\"UTF-8\">",
        "  <title>Contact Sheet: GESTOR/ACCEPTED-DOMAIN — Feature 005</title>",
        "  <style>",
        "    body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, monospace; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }",
        "    h1 { font-size: 20px; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 24px; }",
        "    .matrix-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; margin-bottom: 24px; padding: 16px; }",
        "    .card-title { font-size: 14px; font-weight: bold; margin-bottom: 12px; display: flex; gap: 12px; align-items: center; }",
        "    .badge { background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }",
        "    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }",
        "    .cell { background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 8px; text-align: center; }",
        "    .cell-label { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }",
        "    .cell img { max-width: 100%; height: auto; border-radius: 2px; border: 1px solid #475569; display: block; margin: 0 auto; }",
        "  </style>",
        "</head>",
        "<body>",
        f"  <h1>Contact Sheet: GESTOR/ACCEPTED-DOMAIN (Total Items: {len(item_ids)}, Total Screenshots: {len(files)})</h1>",
    ]

    for item_id in item_ids:
        paths = sorted(SOURCE.glob(f"{item_id}__*.png"))
        html_lines.append("  <div class=\"matrix-card\">")
        html_lines.append("    <div class=\"card-title\">")
        html_lines.append(f"      <span class=\"badge\">{item_id}</span>")
        html_lines.append(f"      <span>Item: {item_id}</span>")
        html_lines.append("    </div>")
        html_lines.append("    <div class=\"grid\">")
        for p in paths:
            rel = f"../../screenshots/gestor/accepted-domain/{p.name}"
            label = p.stem.replace(f"{item_id}__", "")
            html_lines.append("      <div class=\"cell\">")
            html_lines.append(f"        <div class=\"cell-label\">{label}</div>")
            html_lines.append(f"        <img src=\"{rel}\" alt=\"{label}\" loading=\"lazy\" />")
            html_lines.append("      </div>")
        html_lines.append("    </div>")
        html_lines.append("  </div>")

    html_lines.append("</body>")
    html_lines.append("</html>")

    out_file = TARGET / "index.html"
    out_file.write_text("\n".join(html_lines), encoding="utf-8")
    print(f"Generated HTML Index: {out_file.name}")

def generate_individual_html(item_id: str) -> None:
    paths = sorted(SOURCE.glob(f"{item_id}__*.png"))
    html_lines = [
        "<!DOCTYPE html>",
        "<html lang=\"es\">",
        "<head>",
        "  <meta charset=\"UTF-8\">",
        f"  <title>Contact Sheet: {item_id}</title>",
        "  <style>",
        "    body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, monospace; margin: 0; padding: 20px; background: #0f172a; color: #f8fafc; }",
        "    h1 { font-size: 18px; border-bottom: 1px solid #334155; padding-bottom: 12px; margin-bottom: 24px; }",
        "    .matrix-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px; }",
        "    .badge { background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; }",
        "    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }",
        "    .cell { background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 8px; text-align: center; }",
        "    .cell-label { font-size: 11px; color: #94a3b8; margin-bottom: 6px; }",
        "    .cell img { max-width: 100%; height: auto; border-radius: 2px; border: 1px solid #475569; display: block; margin: 0 auto; }",
        "  </style>",
        "</head>",
        "<body>",
        f"  <h1>Contact Sheet: {item_id} (8 Screenshots: 375w, 768w, 1024w, 1440w x light/dark)</h1>",
        "  <div class=\"matrix-card\">",
        "    <div class=\"grid\">",
    ]
    for p in paths:
        rel = f"../../screenshots/gestor/accepted-domain/{p.name}"
        label = p.stem.replace(f"{item_id}__", "")
        html_lines.append("      <div class=\"cell\">")
        html_lines.append(f"        <div class=\"cell-label\">{label}</div>")
        html_lines.append(f"        <img src=\"{rel}\" alt=\"{label}\" loading=\"lazy\" />")
        html_lines.append("      </div>")
    html_lines.extend([
        "    </div>",
        "  </div>",
        "</body>",
        "</html>"
    ])
    out_file = TARGET / f"contact-sheet--gestor--{item_id}.html"
    out_file.write_text("\n".join(html_lines), encoding="utf-8")
    print(f"Generated standalone HTML Contact Sheet: {out_file.name}")

for item_id in item_ids:
    generate_individual_html(item_id)

generate_html_index()
