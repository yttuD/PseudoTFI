from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "screenshots"
TARGET = ROOT / "review-contact-sheets"
TARGET.mkdir(parents=True, exist_ok=True)

FONT = ImageFont.load_default()
CELL_WIDTH = 430
CELL_HEIGHT = 330
LABEL_HEIGHT = 30
MARGIN = 14


def render_sheet(ui_id: str) -> None:
    paths = sorted(SOURCE.glob(f"{ui_id}__*.png"))
    if len(paths) != 8:
        raise RuntimeError(f"{ui_id}: expected 8 screenshots, found {len(paths)}")

    sheet = Image.new("RGB", (CELL_WIDTH * 2, CELL_HEIGHT * 4), "#202020")
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
        draw.text(
            (column * CELL_WIDTH + MARGIN, (row + 1) * CELL_HEIGHT - LABEL_HEIGHT),
            path.stem,
            fill="white",
            font=FONT,
        )

    sheet.save(TARGET / f"{ui_id}-contact-sheet.png", optimize=True)


for number in range(1, 23):
    render_sheet(f"UI-{number:03d}")

print(f"Created 22 contact sheets in {TARGET}")
