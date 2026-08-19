from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "assets" / "icons" / "factions"
FILES = [
    "human_clean.png",
    "elf.png",
    "orc.png",
    "demon.png",
    "undead.png",
    "robot.png",
]


def is_neutral_bright(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return True
    spread = max(r, g, b) - min(r, g, b)
    return spread <= 24 and min(r, g, b) >= 165


def clear_edge_connected_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    def enqueue(x: int, y: int) -> None:
        if (x, y) in seen or not is_neutral_bright(pixels[x, y]):
            return
        seen.add((x, y))
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                enqueue(nx, ny)

    return rgba


def main() -> None:
    for filename in FILES:
        path = ROOT / filename
        if not path.exists():
            print(f"skipped missing: {filename}")
            continue
        cleaned = clear_edge_connected_background(Image.open(path))
        cleaned.save(path, "PNG", optimize=True)
        print(f"cleaned: {filename}")


if __name__ == "__main__":
    main()
