#!/usr/bin/env python3
"""Build img/: the painted images the scene draws in place of the coded art.

    python3 tools/art.py ZIPDIR [OUTDIR]

ZIPDIR holds the art release zips (bg-art-01.zip ... bg-art-10.zip, flat PNGs inside). art/map.json says which image
draws which asset. Each image is cut to what it shows (alpha above 4%, or for an image with no alpha, anything
brighter than black, which the scene then adds as light), scaled down to the size the scene can use, and written as
WebP. OUTDIR (default img/) gets the WebPs and index.json, which src/core/sprites.js reads. img/ is not in git: it is
built from the releases and copied to the site by tools/site.sh.

An image already in OUTDIR's index.json, with its WebP there, is kept as it is, so a change to the map alone rebuilds in
seconds; --fresh builds every image again (do that when a release replaces an image).

Needs ImageMagick 7 (magick) and unzip. One image at a time, so it stays light. Prints PASS or FAIL last.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
LIGHTS = ("day", "dusk", "night")
# the longest side an image keeps, by family: what the scene can show at its nearest, at 1.5x pixels
CAP = {"city": 768, "islands": 1024, "sea": 512, "air": 384, "space": 768, "aliens": 512}
BUDGET = 40 * 1024 * 1024   # all of img/ together


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, text=True, **kw).stdout.strip()


def main():
    fresh = "--fresh" in sys.argv
    argv = [a for a in sys.argv[1:] if a != "--fresh"]
    if not argv:
        print(__doc__)
        print("FAIL: no ZIPDIR")
        return 1
    zipdir, out = argv[0], (argv[1] if len(argv) > 1 else os.path.join(APP, "img"))
    spec = json.load(open(os.path.join(APP, "art", "map.json")))
    skip = set(spec.get("skip", []))
    files = spec.get("files", {})
    os.makedirs(out, exist_ok=True)

    # every PNG in every zip, by name
    where = {}
    for z in sorted(os.listdir(zipdir)):
        if z.endswith(".zip"):
            with zipfile.ZipFile(os.path.join(zipdir, z)) as zf:
                for n in zf.namelist():
                    if n.endswith(".png"):
                        where[os.path.basename(n)[:-4]] = (os.path.join(zipdir, z), n)

    def lights_of(stem):
        """{light: name} for a stem: its -day/-dusk/-night files, or the bare stem for every light."""
        if stem in files:
            return {"day": stem}
        got = {l: f"{stem}-{l}" for l in LIGHTS if f"{stem}-{l}" in where and f"{stem}-{l}" not in skip and stem not in skip}
        if not got and stem in where and stem not in skip:
            got = {"day": stem}
        return got

    done, missing, problems = {}, [], []
    # what the last build made, kept unless --fresh
    old = {}
    if not fresh:
        try:
            old = json.load(open(os.path.join(out, "index.json"))).get("img", {})
        except (OSError, ValueError):
            old = {}
    tmp = tempfile.mkdtemp(prefix="art-", dir=out)

    def build(name, family):
        if name in done:
            return done[name]
        dst = os.path.join(out, name + ".webp")
        if name in old and os.path.exists(dst):
            done[name] = {**old[name], "bytes": os.path.getsize(dst)}
            return done[name]
        src = os.path.join(tmp, "src.png")
        if name in files:
            src = os.path.join(APP, files[name])
        else:
            zp, member = where[name]
            with zipfile.ZipFile(zp) as zf, open(src, "wb") as f:
                f.write(zf.read(member))
        W, H, ch = run(["magick", src, "-format", "%w %h %[channels]", "info:"]).split()[:3]
        W, H = int(W), int(H)
        add = "a" not in ch.lower()
        # the box of what the image shows
        if add:
            box = run(["magick", src, "-colorspace", "gray", "-threshold", "6%", "-format", "%@", "info:"])
        else:
            box = run(["magick", src, "-alpha", "extract", "-threshold", "4%", "-format", "%@", "info:"])
        wh, x, y = box.replace("+", " ").split()[0], *box.split("+")[1:3]
        sw, sh = (int(v) for v in wh.split("x"))
        sx, sy = int(x), int(y)
        if sw < 8 or sh < 8:
            problems.append(f"{name}: empty after the cut ({box})")
            sw, sh, sx, sy = W, H, 0, 0
        cap = CAP.get(family, 768)
        k = min(1.0, cap / max(sw, sh))
        ow, oh = max(1, round(sw * k)), max(1, round(sh * k))
        run(["magick", src, "-crop", f"{sw}x{sh}+{sx}+{sy}", "+repage", "-resize", f"{ow}x{oh}!",
             "-quality", "82", "-define", "webp:alpha-quality=88", "-define", "webp:method=5", dst])
        done[name] = {"w": ow, "h": oh, "sw": sw, "sh": sh, "sx": sx, "sy": sy, "W": W, "H": H, "add": add,
                      "bytes": os.path.getsize(dst)}
        print(f"  {name}: {sw}x{sh} -> {ow}x{oh} {done[name]['bytes'] // 1024} KB{' (light)' if add else ''}", flush=True)
        return done[name]

    assets = {}
    for aid, a in spec["assets"].items():
        family = aid.split(".")[0]
        pool = []
        for look in a["pool"]:
            states = {}
            for state, stem in look.items():
                ls = lights_of(stem)
                if not ls:
                    missing.append(f"{aid} {state}: {stem}")
                    continue
                for l, name in ls.items():
                    build(name, family)
                states[state] = ls
            if "idle" in states:
                pool.append(states)
        if pool:
            assets[aid] = {k: v for k, v in a.items() if k != "pool"}
            assets[aid]["pool"] = pool
    for name in files:
        build(name, "city")
    shutil.rmtree(tmp, ignore_errors=True)

    index = {"v": 1, "assets": assets, "img": {k: {kk: vv for kk, vv in v.items() if kk != "bytes"} for k, v in done.items()}}
    with open(os.path.join(out, "index.json"), "w") as f:
        json.dump(index, f, separators=(",", ":"))
    total = sum(v["bytes"] for v in done.values())
    print(f"{len(assets)} assets, {len(done)} images, {total / 1048576:.1f} MB")
    for m in missing:
        print("  missing:", m)
    for p in problems:
        print("  problem:", p)
    ok = not missing and not problems and total <= BUDGET and len(assets) == len(spec["assets"])
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
