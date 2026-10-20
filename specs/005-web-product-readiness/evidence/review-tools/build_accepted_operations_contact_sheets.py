import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "screenshots" / "gestor" / "accepted-operations"
TARGET = ROOT / "contact-sheets" / "gestor" / "accepted-operations"
TARGET.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.load_default()
CELL_WIDTH = 480
CELL_HEIGHT = 360
LABEL_HEIGHT = 32
MARGIN = 14

files = sorted(list(SOURCE.glob("*.png")))
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

hashes = {}
collisions = []
identical_theme_pairs = []

for p in sorted(files):
    h = compute_hash(p)
    if h in hashes:
        collisions.append((p.name, hashes[h]))
    else:
        hashes[h] = p.name

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

# Viewport & Theme ordering for the 2 columns x 4 rows layout:
# Row 0: 375w light, 375w dark
# Row 1: 768w light, 768w dark
# Row 2: 1024w light, 1024w dark
# Row 3: 1440w light, 1440w dark
ORDERED_KEYS = [
    ("375w", "light"),
    ("375w", "dark"),
    ("768w", "light"),
    ("768w", "dark"),
    ("1024w", "light"),
    ("1024w", "dark"),
    ("1440w", "light"),
    ("1440w", "dark"),
]

def render_sheet(item_id: str) -> None:
    ordered_paths = []
    for w, t in ORDERED_KEYS:
        match = list(SOURCE.glob(f"{item_id}__*__{w}__{t}.png"))
        if match:
            ordered_paths.append(match[0])
        else:
            print(f"Warning: Missing {item_id} for {w} {t}")

    sheet = Image.new("RGB", (CELL_WIDTH * 2, CELL_HEIGHT * 4), "#18181b")
    draw = ImageDraw.Draw(sheet)

    for index, path in enumerate(ordered_paths[:8]):
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
        "<html lang='es'>",
        "<head>",
        "  <meta charset='utf-8'/>",
        "  <title>Batch 03B2: Accepted Operations Visual Review</title>",
        "  <style>",
        "    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #09090b; color: #f4f4f5; margin: 0; padding: 2rem; }",
        "    h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }",
        "    .meta { font-family: monospace; font-size: 0.875rem; color: #a1a1aa; margin-bottom: 2rem; }",
        "    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; }",
        "    .card { background: #18181b; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1rem; }",
        "    .card h2 { font-size: 1rem; margin: 0 0 0.75rem 0; font-family: monospace; color: #38bdf8; }",
        "    .card img { width: 100%; height: auto; border-radius: 0.5rem; border: 1px solid #3f3f46; display: block; }",
        "  </style>",
        "</head>",
        "<body>",
        "  <h1>Batch 03B2 — Accepted Operations Visual Matrix</h1>",
        f"  <div class='meta'>Total Items: {len(item_ids)} | Total PNGs: {len(files)} | Unique Hashes: {len(hashes)} | Theme Collisions: {len(identical_theme_pairs)}</div>",
        "  <div class='grid'>",
    ]

    for item_id in item_ids:
        sheet_name = f"{item_id}-contact-sheet.png"
        html_lines.append(f"    <div class='card'>")
        html_lines.append(f"      <h2>{item_id}</h2>")
        html_lines.append(f"      <a href='{sheet_name}' target='_blank'><img src='{sheet_name}' alt='{item_id}'/></a>")
        html_lines.append(f"    </div>")

    html_lines.extend([
        "  </div>",
        "</body>",
        "</html>",
    ])

    index_path = TARGET / "index.html"
    index_path.write_text("\n".join(html_lines), encoding="utf-8")
    print(f"Generated HTML review index: {index_path}")

generate_html_index()
