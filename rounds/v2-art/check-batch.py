#!/usr/bin/env python3
"""Checks one delivered image batch against its spec, and can draw the contact sheet.

  python3 check-batch.py batch-03.jsonl OUT_DIR [--sheet OUT_DIR/bg-art-03-sheet.jpg]

Needs Pillow (`uv run --with pillow python3 check-batch.py ...` works anywhere). For every row in the spec:
  - OUT_DIR/<id>.png exists, opens, and its long side is at least 1536 px;
  - a keyed image really is keyed: its corners are transparent or the key colour (only the top corners for strips
    and foregrounds, which run off the bottom edge; plates are not keyed);
  - OUT_DIR/manifest.json lists it.
The last line is PASS or FAIL. Missing or broken images fail; so does a batch below 90 percent of its rows done.
"""
import json, sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageStat
except ImportError:
    sys.exit("needs Pillow: uv run --with pillow python3 check-batch.py ...\nFAIL")

KEYS = {"magenta": (255, 0, 255), "green": (0, 255, 0), "black": (0, 0, 0)}
MIN_SIDE = 1536
TOL = 70            # how far a corner may sit from the key colour (JPEG-free PNG output is usually within 10)


def corner_ok(im, key, top_only):
    w, h = im.size
    s = max(4, min(w, h) // 50)
    boxes = [(0, 0, s, s), (w - s, 0, w, s)]
    if not top_only:
        boxes += [(0, h - s, s, h), (w - s, h - s, w, h)]
    rgba = im.convert("RGBA")
    for box in boxes:
        r, g, b, alpha = ImageStat.Stat(rgba.crop(box)).mean
        if alpha < 16:
            continue                                    # transparent: the best case
        k = KEYS[key]
        if ((r - k[0]) ** 2 + (g - k[1]) ** 2 + (b - k[2]) ** 2) ** .5 > TOL:
            return False, box, (round(r), round(g), round(b), round(alpha))
    return True, None, None


def sheet(rows, out_dir, path):
    cell, cols, pad = 220, 8, 18
    found = [r for r in rows if (out_dir / f"{r['id']}.png").exists()]
    if not found:
        return
    grid = Image.new("RGB", (cols * cell, ((len(found) + cols - 1) // cols) * (cell + pad)), (16, 16, 20))
    draw = ImageDraw.Draw(grid)
    for i, r in enumerate(found):
        try:
            im = Image.open(out_dir / f"{r['id']}.png").convert("RGBA")
        except Exception:
            continue
        im.thumbnail((cell - 8, cell - 8))
        x, y = (i % cols) * cell, (i // cols) * (cell + pad)
        checker = Image.new("RGBA", im.size, (40, 40, 48, 255))
        grid.paste(Image.alpha_composite(checker, im).convert("RGB"), (x + (cell - im.width) // 2, y + 4))
        draw.text((x + 4, y + cell - 2), r["id"][:34], fill=(200, 200, 210))
    grid.save(path, quality=82)
    print("sheet", path, grid.size)


def main():
    argv = sys.argv[1:]
    if "--sheet" in argv:
        i = argv.index("--sheet")
        argv = argv[:i] + argv[i + 2:]
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 2:
        sys.exit(__doc__ + "\nFAIL")
    spec, out_dir = Path(args[0]), Path(args[1])
    rows = [json.loads(l) for l in spec.read_text().splitlines() if l.strip()]
    manifest = out_dir / "manifest.json"
    listed = set()
    if manifest.exists():
        try:
            listed = {e.get("id") for e in json.loads(manifest.read_text())}
        except Exception as x:
            print("manifest.json does not parse:", x)
    problems, done = [], 0
    for r in rows:
        f = out_dir / f"{r['id']}.png"
        if not f.exists():
            problems.append(f"missing {f.name}")
            continue
        try:
            im = Image.open(f)
            im.load()
        except Exception as x:
            problems.append(f"broken {f.name}: {x}")
            continue
        if max(im.size) < MIN_SIDE:
            problems.append(f"small {f.name}: {im.size[0]}x{im.size[1]} (long side under {MIN_SIDE})")
        if r["key"] in KEYS:
            ok, box, seen = corner_ok(im, r["key"], r["kind"] in ("strip", "fg"))
            if not ok:
                problems.append(f"not keyed {f.name}: corner {box} is rgba{seen}, wanted {r['key']} or transparent")
        if r["id"] not in listed:
            problems.append(f"not in manifest.json: {r['id']}")
        done += 1
    if "--sheet" in sys.argv:
        sheet(rows, out_dir, Path(sys.argv[sys.argv.index("--sheet") + 1]))
    for p in problems[:80]:
        print(p)
    hard = [p for p in problems if p.startswith(("broken", "not keyed", "small"))]
    print(f"{done}/{len(rows)} delivered, {len(problems)} problems ({len(hard)} hard)")
    print("PASS" if done >= .9 * len(rows) and not hard else "FAIL")
    sys.exit(0 if done >= .9 * len(rows) and not hard else 1)


if __name__ == "__main__":
    main()
