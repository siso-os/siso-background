#!/usr/bin/env python3
"""Cut a filmed story into the README's media and the T3 chapters. Last line PASS or FAIL.

  node tools/film.mjs FILM/a --from 0 --to 165 --fps 8 --size 960x540      # film the loop, in as many parts as you like
  node tools/film.mjs FILM/b --from 165 --to 330 --fps 8 --size 960x540
  python3 tools/cut.py FILM [hero] [beats] [chapters]                       # all three when none is named

Writes media/hero.webp and media/beats/*.webp (committed: the README shows them), and chapters/ (not committed; it
goes on the site at /chapters/ with tools/site.sh): one animated WebP per chapter that plays once, and index.json
with each one's sha256. The T3 theme plays a chapter in place of a City Wars window and refuses one over 16 MB or that
moves for more than 300 s, so this fails then too. Needs ffmpeg with libwebp.
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path

APP = Path(__file__).resolve().parent.parent

# The hero: the best of the loop, cut together and played a little faster than life. (from, to, every nth frame)
HERO = [(103.5, 109.5, 1), (139, 148, 1), (148, 176, 4), (182, 190, 1), (222, 236, 2), (304, 314, 2)]
# The clips in the README's story table, by beat.
BEATS = {"03-raid": (55, 60.5, 1), "05-hellfire": (103.5, 109, 1), "06-launch": (140, 150, 2),
         "07-strike": (183, 190, 1), "10-island-fall": (222, 236, 2), "15-tower-hellfire": (304, 314, 2)}
# The T3 chapters: the whole loop in six stretches, each ending on a calm frame (the last before the seam's fade).
CHAPTERS = [("01", "Across the cities, the tower", 0, 50), ("02", "Raid and rebuild", 50, 98),
            ("03", "Hellfire", 98, 137), ("04", "Launch, strike, back down", 137, 205),
            ("05", "Tower barrage, island fall", 205, 266), ("06", "Jets, tower hellfire", 266, 327.5)]
T3_IMAGE_CAP = 16 * 1024 * 1024
T3_PLAY_MAX = 300


class Film:
    """The frames of every part under FILM (each part a tools/film.mjs folder with its film.json), by story time."""
    def __init__(self, root):
        self.parts = []
        for j in sorted(Path(root).glob("*/film.json")):
            m = json.loads(j.read_text())
            self.parts.append((m["from"], m["fps"], m["frames"], j.parent))
        if not self.parts:
            raise SystemExit(f"no film parts under {root} (each needs its film.json)")
        self.fps = self.parts[0][1]
        if any(p[1] != self.fps for p in self.parts):
            raise SystemExit("the parts were filmed at different frame rates")

    def at(self, t):
        for start, fps, n, d in self.parts:
            k = round((t - start) * fps)
            if 0 <= k < n:
                return d / f"f{k:05d}.jpg"
        raise SystemExit(f"no frame at t {t:.3f}: film that stretch first")

    def span(self, a, b, step=1):
        n = round((b - a) * self.fps)
        return [self.at(a + k / self.fps) for k in range(0, n, step)]


def encode(frames, out, fps, size, q, loop, level=6):
    """level: libwebp effort, 0 to 6. 6 squeezes the README media hardest; the long chapters use 4, which is several
    times faster for a few percent more bytes."""
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(frames):
            os.symlink(f, Path(tmp) / f"s{i:05d}.jpg")
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", str(Path(tmp) / "s%05d.jpg"),
                        "-vf", f"scale={size[0]}:{size[1]}:flags=lanczos", "-c:v", "libwebp_anim", "-q:v", str(q),
                        "-compression_level", str(level), "-loop", str(loop), str(out)], check=True)
    return out.stat().st_size


def main():
    film, want = Film(sys.argv[1]), set(sys.argv[2:]) or {"hero", "beats", "chapters"}
    fails = []
    if "hero" in want:
        frames = [f for a, b, s in HERO for f in film.span(a, b, s)]
        n = encode(frames, APP / "media/hero.webp", 12, (960, 540), 48, 0)
        print(f"media/hero.webp: {len(frames)} frames, {n / 1e6:.2f} MB")
        if n > 8e6:
            fails.append("the hero is over 8 MB: too slow for a README")
    if "beats" in want:
        for name, (a, b, s) in BEATS.items():
            n = encode(film.span(a, b, s), APP / f"media/beats/{name}.webp", 10, (640, 360), 45, 0)
            print(f"media/beats/{name}.webp: {n / 1e3:.0f} KB")
    if "chapters" in want:
        out = APP / "chapters"
        shutil.rmtree(out, ignore_errors=True)
        index = {"version": 1, "story": "https://background.sisolabs.space/scene", "chapters": []}
        for cid, title, a, b in CHAPTERS:
            img = out / f"{cid}.webp"
            t0 = time.time()
            n = encode(film.span(a, b), img, film.fps, (960, 540), 50, 1, level=4)
            index["chapters"].append({"id": cid, "title": title, "from": a, "to": b, "seconds": b - a, "image": img.name,
                                      "bytes": n, "sha256": hashlib.sha256(img.read_bytes()).hexdigest()})
            print(f"chapters/{cid}.webp {title}: {b - a:g} s, {n / 1e6:.2f} MB, cut in {time.time() - t0:.0f} s", flush=True)
            if n > T3_IMAGE_CAP or b - a > T3_PLAY_MAX:
                fails.append(f"chapter {cid} breaks a T3 cap")
        (out / "index.json").write_text(json.dumps(index, indent=1) + "\n")
    for f in fails:
        print("  -", f)
    print("FAIL" if fails else "PASS")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
