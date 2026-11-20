# v2 art: the image batches

The owner, 20 Nov 2026: "images are where it's at", and "batch generate them to make like 50 images per agent or a
hundred images per agent and then get like ten agents going as long as you spec it out". The first version drew
everything in code; v2 puts photo-real cut-out images where they look better (islands, the tower, buildings, boats,
aircraft, space) and keeps code for what moves (fire, blasters, effects, the sky, the water).

This folder is the spec. Ten batches, 640 images, each with one id and one finished prompt.

| File | What it is |
|---|---|
| `STYLE.md` | The look every image keeps, and why. Read it before making anything |
| `IDEAS.md` | The idea bank the batches come from, with the owner's story loop |
| `BATCH-01.md` … `BATCH-10.md` | One batch each: every image's id, background, reference and prompt |
| `batch-01.jsonl` … | The same rows for the check |
| `make-batches.py` | Writes the two above. Change a prompt here, then run it; never edit a BATCH file by hand |
| `check-batch.py` | Checks a delivered batch and draws its contact sheet. The last line says PASS or FAIL |

## Making one batch

1. Read `STYLE.md`, then your `BATCH-NN.md` from top to bottom.
2. Make the images in the order listed, with your image tool at its largest size and best quality. Use GPT image
   generation 6.2, not 6.1.
   - **Transparent output when your tool has it.** Otherwise use the flat key colour the row names.
   - **A row whose reference is `repo:<path>`:** attach that file from this app folder as the reference image.
   - **A row whose reference is another id:** that image is from this batch. Make it first, then make this one as an
     edit of it. That is how a subject keeps its look across lights, angles and animation frames.
   - **A failed try** (the subject cropped, the wrong angle, text where none is allowed, a background that isn't flat):
     try again, up to three times.
3. Save each image as `<id>.png` in one folder. Write `manifest.json` beside them: a list with one entry per image,
   `{"id", "file", "width", "height", "background": "transparent" | "#FF00FF" | "#00FF00" | "#000000" | "none",
   "reference": <what you attached or edited>, "tries": n}`.
4. Check it, from this folder:

   ```sh
   uv run --with pillow python3 check-batch.py batch-NN.jsonl <your folder> --sheet <your folder>/bg-art-NN-sheet.jpg
   ```

   PASS means at least 90 percent of the rows are there, every image is at least 1536 px on its long side, and every
   keyed image really has a flat key or transparent corners. Fix what it lists until it passes.
5. Deliver the folder where your request says: the images, `manifest.json` and the contact sheet.

## After delivery

The scene's owner cuts out the backgrounds, picks the best of each subject, compresses them to WebP and adds them to
`src/` with the same light-and-animation code the drawn assets use. Raw batches never go into git: only the chosen,
compressed cut-outs do.
