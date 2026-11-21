#!/usr/bin/env python3
"""Cut a filmed story into the README's media and the T3 chapters. Last line PASS or FAIL.

  node tools/film.mjs FILM/a --from 0 --to 165 --fps 8 --size 960x540      # film the loop, in as many parts as you like
  node tools/film.mjs FILM/b --from 165 --to 330 --fps 8 --size 960x540
  python3 tools/cut.py FILM [hero] [beats] [chapters]                       # all three when none is named

Writes media/hero.webp and media/beats/*.webp (committed: the README shows them), and chapters/ (not committed; it
goes on the site at /chapters/ with tools/site.sh): one animated WebP per chapter that plays once, and index.json
with each one's sha256. The T3 theme plays a chapter in place of a City Wars window and refuses one over 16 MB or that
moves for more than 300 s, so this fails then too. Needs ffmpeg and libwebp (libwebp.so.7 and libwebpmux.so.3).
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


class AnimWebP:
    """libwebp's animation encoder, called directly so key frames can be forced. ffmpeg's libwebp_anim can't set them,
    and without them a lossy animation drifts into a mosaic: libwebp keeps every 8x8 block that is close to the frame
    before it, so a slow change (a dusk sky, a panning camera) is never redrawn and the stale blocks pile up. A key
    frame every `kmax` frames repaints the whole picture. Only the first fields of each struct are touched; libwebp
    fills the rest, and the buffers are bigger than any version's structs."""
    ENC_ABI, MUX_ABI = 0x0210, 0x0109  # libwebp checks the major byte only

    def __init__(self):
        import ctypes, ctypes.util
        self.c = ctypes
        names = {"webp": "libwebp.so.7", "webpmux": "libwebpmux.so.3"}
        self.webp, self.mux = (ctypes.CDLL(ctypes.util.find_library(k) or v) for k, v in names.items())
        P, I = ctypes.c_void_p, ctypes.c_int
        for lib, name, res, args in [
            (self.webp, "WebPConfigInitInternal", I, [P, I, ctypes.c_float, I]),
            (self.webp, "WebPPictureInitInternal", I, [P, I]),
            (self.webp, "WebPPictureImportRGB", I, [P, ctypes.c_char_p, I]),
            (self.webp, "WebPPictureFree", None, [P]),
            (self.webp, "WebPFree", None, [P]),
            (self.mux, "WebPAnimEncoderOptionsInitInternal", I, [P, I]),
            (self.mux, "WebPAnimEncoderNewInternal", P, [I, I, P, I]),
            (self.mux, "WebPAnimEncoderAdd", I, [P, P, I, P]),
            (self.mux, "WebPAnimEncoderAssemble", I, [P, P]),
            (self.mux, "WebPAnimEncoderGetError", ctypes.c_char_p, [P]),
            (self.mux, "WebPAnimEncoderDelete", None, [P]),
        ]:
            fn = getattr(lib, name)
            fn.restype, fn.argtypes = res, args

    def encode(self, rgb_frames, out, fps, size, q, loop, level, kmax):
        c, (w, h) = self.c, size
        buf = lambda: c.create_string_buffer(4096)
        ints = lambda b: c.cast(b, c.POINTER(c.c_int))
        opts, cfg = buf(), buf()
        if not self.mux.WebPAnimEncoderOptionsInitInternal(opts, self.MUX_ABI):
            raise SystemExit("libwebpmux refused its own options: version mismatch")
        o = ints(opts)  # anim_params {bgcolor, loop_count}, minimize_size, kmin, kmax, allow_mixed, verbose
        o[1], o[2], o[3], o[4], o[5] = loop, 0, kmax // 2 + 1, kmax, 0
        if not self.webp.WebPConfigInitInternal(cfg, 0, float(q), self.ENC_ABI):
            raise SystemExit("libwebp refused its own config: version mismatch")
        ints(cfg)[2] = level  # lossless, quality, method
        enc = self.mux.WebPAnimEncoderNewInternal(w, h, opts, self.MUX_ABI)
        ms = lambda i: round(i * 1000 / fps)
        try:
            i = 0
            for i, rgb in enumerate(rgb_frames):
                pic = buf()
                self.webp.WebPPictureInitInternal(pic, self.ENC_ABI)
                p = ints(pic)
                p[0], p[2], p[3] = 1, w, h  # use_argb, width, height
                ok = self.webp.WebPPictureImportRGB(pic, rgb, w * 3) and self.mux.WebPAnimEncoderAdd(enc, pic, ms(i), cfg)
                self.webp.WebPPictureFree(pic)
                if not ok:
                    raise SystemExit(f"libwebp failed on frame {i}: {self.mux.WebPAnimEncoderGetError(enc)}")
            self.mux.WebPAnimEncoderAdd(enc, None, ms(i + 1), None)
            data = (c.c_void_p * 2)()  # WebPData {bytes, size}
            if not self.mux.WebPAnimEncoderAssemble(enc, data):
                raise SystemExit(f"libwebp failed to assemble: {self.mux.WebPAnimEncoderGetError(enc)}")
            out.write_bytes(c.string_at(data[0], data[1]))
            self.webp.WebPFree(data[0])
        finally:
            self.mux.WebPAnimEncoderDelete(enc)


def rgb_frames(frames, size):
    """Every frame scaled to size, as raw RGB, one at a time through ffmpeg."""
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(frames):
            os.symlink(f, Path(tmp) / f"s{i:05d}.jpg")
        n = size[0] * size[1] * 3
        ff = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(Path(tmp) / "s%05d.jpg"), "-vf",
                               f"scale={size[0]}:{size[1]}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                              stdout=subprocess.PIPE)
        while len(rgb := ff.stdout.read(n)) == n:
            yield rgb
        if ff.wait():
            raise SystemExit("ffmpeg could not read the film frames")


def encode(frames, out, fps, size, q, loop, level=6, kmax=None):
    """level: libwebp effort, 0 to 6. 6 squeezes the README media hardest; the long chapters use 4, which is several
    times faster for a few percent more bytes. kmax: the most frames between key frames (default: one a second)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    AnimWebP().encode(rgb_frames(frames, size), out, fps, size, q, loop, level, kmax or round(fps))
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
