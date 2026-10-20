from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "screenshots" / "public" / "accepted"
TARGET = ROOT / "contact-sheets" / "public" / "accepted"
TARGET.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.load_default()
CELL_WIDTH = 480
CELL_HEIGHT = 360
LABEL_HEIGHT = 32
MARGIN = 14

IDS = [
    "SURF-001", "SURF-002", "SURF-003", "SURF-004",
    "SURF-005", "SURF-006", "SURF-007", "SURF-008",
    "SURF-009", "SURF-026",
    "FORM-008", "FORM-009", "FORM-010", "FORM-011",
    "FORM-014", "FORM-015"
]

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

if __name__ == "__main__":
    for item_id in IDS:
        render_sheet(item_id)
    print(f"Successfully generated {len(IDS)} contact sheets in {TARGET}")
