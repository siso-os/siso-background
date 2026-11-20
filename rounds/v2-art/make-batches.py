#!/usr/bin/env python3
"""Writes the v2 image batches: BATCH-NN.md (for the image souls to read) and batch-NN.jsonl (for check-batch.py).

Every image has one id, one finished prompt, a background rule and, where identity matters, a reference: a file in
this app folder (repo:<path>) or an earlier image of the same batch (its id), which the soul edits instead of drawing
from scratch, so a subject keeps its look across lights, angles and animation frames.

  python3 rounds/v2-art/make-batches.py      # rewrites the batch files beside this script; prints the counts
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ---------- the shared prompt parts (STYLE.md explains them) ----------
SISO = ("SISO design language: dark smoked-blue glass and graphite steel, sculpted brushed-silver fins, slim cyan light "
        "lines, and where asked a small ember-gold lion-head emblem (a stylised lion face shading from gold to ember orange).")
ENEMY = ("Enemy design language: dark red brick and blackened riveted iron, rusted red machinery, soot and grime, black "
         "spike finials, small amber slit windows, red-orange engine flames. Their banners are plain dark red with a "
         "black iron spiked-ring sigil, never letters.")
ALIEN = ("Alien design language: iridescent dark chitin and bone-white ribbed shell, organic curves with no bolts or "
         "panels, glowing teal-cyan bioluminescent veins and soft amber eyes.")
ROCK = ("a floating island: a broad mass of real weathered rock (layered sandstone and dark basalt, roots, moss, grass "
        "and small trees along the flat top) tapering underneath into a jagged hanging root of rock")
SISO_ENG = ("four machined steel levitation engine pods on the underside, each with a glowing cyan ring and a faint "
            "downward heat shimmer")
ENEMY_ENG = "rusted red booster engines on the underside firing short red-orange flames with heat shimmer and soot"
TOWER = ("the SISO Tower: a very slim supertall spire of dark smoked-blue glass wrapped by sculpted brushed-silver "
         "shoulder fins that rise into two pointed horns at the top, a cyan glowing ring crown holding one round "
         "luminous eye, and a stepped stone-and-steel base with warm lobby lights")
JET = ("the SISO Tomahawk: a futuristic hyper-agile stealth air-superiority fighter, longer and sleeker than any jet "
       "flying today. Sharply faceted blended body in dark graphite with a smoked-gold canopy, small forward canards, "
       "cranked-arrow delta wings with serrated trailing edges, twin canted tail fins, twin engines with 3D "
       "thrust-vectoring paddle nozzles, thin cyan accent lines along the leading edges, a small ember-gold lion-head "
       "emblem on each tail fin and a tiny SISO stencil near the nose. It must read as clearly more advanced and more "
       "dangerous than any enemy aircraft")
EJET = ("the enemy Brute fighter: a bulky riveted dark-iron airframe in dull chipped red paint, one huge round engine, "
        "stubby swept wings with bolted-on rocket pods, a black spiked-ring sigil on the tail, soot streaks. Menacing "
        "but plainly older, heavier and clumsier than a modern stealth fighter")

KEY = {
    "magenta": ("BACKGROUND: a transparent background if your image tool can output one (best). Otherwise a perfectly "
                "flat, uniform pure magenta #FF00FF filling every pixel around the subject: no gradient, texture, floor, "
                "cast or contact shadow, reflection, horizon or vignette, and no magenta light spilling onto the subject."),
    "green": ("BACKGROUND: a transparent background if your image tool can output one (best). Otherwise a perfectly "
              "flat, uniform pure green #00FF00 filling every pixel around the subject: no gradient, texture, floor, "
              "cast or contact shadow, reflection, horizon or vignette, and no green light spilling onto the subject."),
    "black": ("BACKGROUND: pure black #000000 everywhere around the subject: no stars, haze, floor or glow beyond the "
              "subject itself. The subject is self-luminous and will be screen-blended over the scene, so anything "
              "that is not the subject must be exactly black."),
    "none": "",
}
KIND = {
    "object": ("SISO Background sprite of one isolated subject: a hyper-real live-action cinema photograph at the "
               "largest native resolution your tool offers (at least 2048 px on the long side), {aspect}. True side "
               "elevation from a camera level with the subject's middle and at most 5 degrees above it, long lens, so "
               "it sits naturally in a sideways-scrolling scene. Believable full scale, real materials with fine "
               "weathering, physically correct light. The whole subject is in frame with a clear margin of about 8 "
               "percent on every side: nothing cropped, nothing touching an edge."),
    "building": ("SISO Background building sprite: one complete building as a hyper-real live-action architectural "
                 "photograph at the largest native resolution your tool offers (at least 2048 px tall), {aspect}. "
                 "True front elevation from far away on a long lens, so verticals stay vertical. The whole height is "
                 "visible from street level to the roof top or antenna tip, with a clear margin above, left and right. "
                 "The base is cut in one clean straight horizontal line at street level: no street, pavement, cars, "
                 "trees or people in front."),
    "strip": ("SISO Background panorama strip: a 3:1 hyper-real live-action cinema panorama at the largest native "
              "resolution your tool offers (at least 3072 px wide). The subject fills the lower part of the frame and "
              "runs off the left, right and bottom edges; its bottom edge is one clean straight horizontal cut. "
              "Everything above its silhouette, all of the sky, is the background described below. The ground heights "
              "at the far left and far right edges match, so copies can sit side by side."),
    "fg": ("SISO Background foreground strip: a 3:1 hyper-real live-action cinema panorama at the largest native "
           "resolution your tool offers (at least 3072 px wide). The subject is close to the camera, seen slightly from "
           "above, fills the lower 35 to 50 percent of the frame and runs off the left, right and bottom edges, in sharp "
           "focus with rich close-up texture. Everything above it is the background described below."),
    "plate": ("SISO Background plate: a full-frame hyper-real live-action cinema photograph at the largest native "
              "resolution your tool offers, {aspect}. No keying: the whole frame is the scene."),
    "fx": ("SISO Background effect sprite: one isolated visual effect, shot as real practical pyrotechnics and light at "
           "the largest native resolution your tool offers, {aspect}, centred with a clear margin, nothing touching "
           "an edge."),
    "cloud": ("SISO Background cloud sprite: one isolated real cloud shot on a long lens at the largest native "
              "resolution your tool offers, {aspect}, the whole cloud in frame with a clear margin and soft natural "
              "edges."),
}
ASPECT = {"wide": "landscape 3:2", "tall": "portrait 2:3 or taller", "square": "square 1:1",
          "pano": "panorama 3:1", "film": "widescreen 16:9", "xtall": "the tallest portrait your tool offers (1:2 or taller)"}
LIGHT = {
    "day": "Light: clear midday; warm sun from the upper right, cool blue skylight fill from the left, crisp soft-edged shadows.",
    "dusk": "Light: golden dusk; a low amber sun from the right grazing the surfaces, violet-blue shadow fill, the first warm windows and lights coming on.",
    "dawn": "Light: early dawn; soft peach-pink light low from the left, cool blue shadows, a few lights still on.",
    "night": ("Light: night; a cool moonlight rim from the upper left; the subject's own lights carry it (windows, "
              "beacons, engines, signs), with readable dark detail and a restrained, physical glow, no bloom haze."),
    "-": "",
}
QUALITY = ("No cartoon, illustration, video-game render, toy scale, plastic or clay look, and no outlines. "
           "No text, letters, numbers, logos, watermarks, UI, borders or captions{text}.")


class Batch:
    def __init__(self, n, title, why):
        self.n, self.title, self.why, self.rows = n, title, why, []

    def id(self, slug, light):
        return f"b{self.n:02d}-{slug}" + ("" if light == "-" else f"-{light}")

    def add(self, slug, kind, desc, lights=("day", "dusk", "night"), key="magenta", aspect="wide", ref=None,
            text="", note=""):
        """One subject in one or more lights. The first light is the hero; the others are edits of it."""
        hero = None
        for light in lights:
            rid = self.id(slug, light)
            if hero is None:
                self._row(rid, kind, desc, light, key, aspect, ref, text, note, edit=None)
                hero = rid
            else:
                self._row(rid, kind, desc, light, key, aspect, hero, text, note,
                          edit=f"change only the lighting and time of day, to {light}")
        return hero

    def frame(self, slug, of, change, kind, desc, light="day", key="magenta", aspect="wide", text="", note=""):
        """A frame or view of another image in this batch: an edit of it that changes only `change`."""
        rid = self.id(slug, light)
        self._row(rid, kind, desc, light, key, aspect, of, text, note, edit=change)
        return rid

    def _row(self, rid, kind, desc, light, key, aspect, ref, text, note, edit):
        assert rid not in {r["id"] for r in self.rows}, rid
        parts = []
        if edit:
            parts.append(f"EDIT the reference image {ref}: keep exactly the same subject, design, materials, colours, "
                         f"proportions, camera distance and scale, so the two images line up when swapped. Then "
                         f"{edit}.")
        elif ref:
            parts.append(f"Use the reference image {ref} for the identity of the subject (shape, parts, colours); "
                         f"render it new, sharper and more detailed, exactly as described here.")
        parts.append(KIND[kind].format(aspect=ASPECT[aspect]))
        parts.append(desc.rstrip(".") + ".")
        if LIGHT[light]:
            parts.append(LIGHT[light])
        if KEY[key]:
            parts.append(KEY[key])
        parts.append(QUALITY.format(text=(", except " + text) if text else ""))
        self.rows.append({"id": rid, "kind": kind, "light": light, "key": key, "ref": ref, "edit": bool(edit),
                          "note": note, "prompt": " ".join(parts)})


B = []

# ---------- 01: the SISO isles and the tower ----------
b = Batch(1, "SISO isles and the SISO Tower",
          "The owner: 'your floating islands, the SISO tower, the one you had the images were way cooler'. "
          "The home side of the world in three lights, closer and sharper than the first art.")
b.add("tower", "object", f"The subject: {TOWER}. Nothing else: no island, no ground, the base ends in a flat cut.",
      aspect="xtall", ref="repo:art/isles/cutouts/tower-day.webp", text='the single small word "SISO" on the crown ring')
b.add("tower-crown", "object", f"A close view of only the top fifth of {TOWER}: the horns, the ring crown and the "
      "glowing eye, cut cleanly across the glass shaft at the bottom. Fine detail of glass mullions, brushed fins, "
      "aviation lights and the cyan ring", aspect="tall", ref="repo:art/isles/cutouts/tower-day.webp",
      text='the single small word "SISO" on the crown ring')
b.add("tower-bays", "object", f"The subject: {TOWER}. Its sculpted fins have opened like gills along the upper half, "
      "showing rows of missile launch tubes with small glowing cyan rims, ready to fire a swarm", aspect="xtall",
      lights=("day", "night"), ref="repo:art/isles/cutouts/tower-day.webp", text='the single small word "SISO" on the crown ring')
b.add("tower-banner", "object", f"The middle third of {TOWER}, cut cleanly at top and bottom, with a sky-garden balcony "
      "and a tall vertical black fabric banner carrying the ember-gold SISO lion-head emblem hanging down the glass",
      aspect="tall", lights=("day", "night"), ref="repo:refs/brand/siso-lion-ember.png",
      text="the SISO lion-head emblem from the reference")
for slug, what in [
    ("isle-home", f"{ROCK}, the SISO home island: on top a research compound of low concrete-and-glass labs, a white "
                  f"observatory dome, a radio mast and a helipad, with a clear empty plot in the middle of the top where "
                  f"the SISO Tower will stand (the tower is a separate sprite); {SISO_ENG}"),
    ("isle-hangar", f"{ROCK}, long and flat, the SISO air base: a short runway along the top edge, an open hangar with "
                    f"two dark graphite fighter jets visible inside, a small control tower and cyan runway lights; {SISO_ENG}"),
    ("isle-launchpad", f"{ROCK}, the SISO launch site: a steel rocket gantry with umbilical arms holding a tall white "
                       f"and graphite rocket, a water tower and a blast trench; {SISO_ENG}"),
    ("isle-shipyard", f"{ROCK}, the SISO sky-shipyard: a steel drydock frame along one side holding a half-built "
                      f"graphite flying frigate, two tall cranes and welding sparks; {SISO_ENG}"),
    ("isle-observatory", f"{ROCK}, small and high: two white telescope domes and a large radio dish; {SISO_ENG}"),
    ("isle-farm", f"{ROCK}, terraced with glass hydroponic greenhouses and an orchard, a small stream spilling off the "
                  f"edge as a thin waterfall that dissolves into mist below; {SISO_ENG}"),
    ("isle-power", f"{ROCK}, the SISO power island: a glowing cyan torus fusion reactor in a ring of short cooling "
                   f"towers, thick cables and transformer yards; {SISO_ENG}"),
    ("isle-villas", f"{ROCK}, a residential isle of modern white-and-glass villas with pools, gardens and palm trees; "
                    f"{SISO_ENG}"),
    ("isle-defence", f"{ROCK}, a SISO defence isle: two rotary point-defence turrets, a missile pod battery, a white "
                     f"radar dome and a tall shield-projector pylon with a cyan emitter at its tip; {SISO_ENG}"),
    ("isle-academy", f"{ROCK}, a campus isle: a glass library hall, a courtyard with trees and a small sports field; "
                     f"{SISO_ENG}"),
    ("isle-relay", f"{ROCK}, tiny: one lattice comms mast with a red beacon and a few solar panels; two engine pods"),
    ("rock-a", f"{ROCK}, small and bare, no buildings, one engine pod; a different, rounder rock shape"),
    ("rock-b", f"{ROCK}, a thin flat slab with grass and two windswept trees, two engine pods"),
    ("rock-c", f"{ROCK}, a tall narrow pinnacle with a small white lighthouse beacon on top, two engine pods"),
    ("isle-bridge", "two small floating rocks side by side joined by a slender steel suspension bridge, each with a "
                    "few low buildings and one cyan levitation engine pod beneath"),
    ("isle-skydock", f"{ROCK}, a sky-dock: a steel mooring mast with a moored graphite SISO airship whose envelope "
                     f"carries the ember-gold lion-head emblem; {SISO_ENG}"),
    ("isle-lake", f"{ROCK}, a lake isle: a clear lake on the top whose overflow pours off the edge as a long waterfall "
                  f"breaking into mist; {SISO_ENG}"),
    ("isle-market", f"{ROCK}, a busy market town: tiled roofs, stalls, string lights and lanterns, narrow lanes; {SISO_ENG}"),
]:
    b.add(slug, "object", f"The subject: {what}. {SISO}",
          ref="repo:art/isles/cutouts/isle-home-dusk.webp" if slug == "isle-home" else None,
          text="the SISO lion-head emblem on the airship" if slug == "isle-skydock" else "")
b.add("isle-garden", "object", f"The subject: {ROCK}, a quiet garden isle with a blossoming pink cherry tree, a timber "
      f"pavilion and a koi pond; {SISO_ENG}. {SISO}", key="green")
b.add("engine-pod", "object", "The subject: one machined steel SISO levitation engine pod seen from the side, fixed to "
      "a chunk of rock at the top edge (the rock cut cleanly), its cyan ring glowing and a soft cyan downward heat "
      "shimmer", lights=("day", "night"), aspect="square")
b.add("isle-home-scarred", "object", f"The subject: the SISO home island ({ROCK}) after a raid: blackened impact craters "
      f"in the rock, one lab roof caved in, the mast bent, scorch marks; the clear empty tower plot still in the middle "
      f"of the top; {SISO_ENG}. {SISO}", lights=("dusk",))
B.append(b)

# ---------- 02: the enemy ----------
b = Batch(2, "The enemy islands and their war machines",
          "The other side of every war event: forts to raid, forts that burn, forts that fall onto the city.")
for slug, what in [
    ("fort-great", f"{ROCK}, the great enemy fortress isle: a dense dark red brick fortress city with layered "
                   f"crenellated towers and black iron spikes; {ENEMY_ENG}"),
    ("fort-keep", f"{ROCK}, medium: one tall keep, a curtain wall and two gun towers; {ENEMY_ENG}"),
    ("fort-outpost", f"{ROCK}, small: a squat watchtower and a short wall; two booster engines"),
    ("fort-artillery", f"{ROCK}, an artillery isle: three heavy long-barrelled gun batteries in iron casemates, barrels "
                       f"aimed up to the left; {ENEMY_ENG}"),
    ("fort-silos", f"{ROCK}, a missile isle: open iron silo doors with red-tipped missiles standing inside, a blast "
                   f"wall and a launch control bunker; {ENEMY_ENG}"),
    ("fort-forge", f"{ROCK}, a forge isle of black rock with glowing lava channels, smelter chimneys and a foundry hall; "
                   f"{ENEMY_ENG}"),
    ("fort-radar", f"{ROCK}, small: a tall black iron lattice spire with a big rotating radar dish and a red beacon; "
                   f"two booster engines"),
    ("fort-hangar", f"{ROCK}, an enemy air base: an iron hangar with two crude red fighter jets inside and a short steel "
                    f"catapult rail; {ENEMY_ENG}"),
    ("fort-citadel", f"{ROCK}, the enemy capital: a towering gothic black-iron citadel with tall needle spires, flying "
                     f"buttresses and red glass windows; {ENEMY_ENG}"),
    ("fort-barracks", f"{ROCK}, walled barracks, a parade yard and a watchtower; {ENEMY_ENG}"),
    ("fort-dock", f"{ROCK}, an enemy sky-harbour with a chained red-envelope iron airship moored at an iron mast; "
                  f"{ENEMY_ENG}"),
    ("fort-gate", f"{ROCK}, a massive gatehouse with an iron portcullis and hanging red banners; {ENEMY_ENG}"),
    ("fort-reactor", f"{ROCK}, an unstable red reactor core glowing inside an iron cage, cables and vents; {ENEMY_ENG}"),
    ("fort-launcher", f"{ROCK}, a long steel catapult rail on top launching small black drones; {ENEMY_ENG}"),
    ("fort-wall", f"{ROCK}, long and low, carrying one long fortified wall with gun slits along its whole length; "
                  f"{ENEMY_ENG}"),
    ("fort-volcano", f"{ROCK}, an active volcano isle with a fortress on the crater rim, a lava glow inside the crater "
                     f"and a thin smoke plume; {ENEMY_ENG}"),
    ("rock-red-a", f"{ROCK}, small, of dark red rock, bare, with one rusted booster engine"),
    ("rock-red-b", "three small dark red floating rocks chained together with heavy iron chains, each with one rusted "
                   "red booster engine"),
]:
    b.add(slug, "object", f"The subject: {what}. {ENEMY}",
          ref="repo:art/isles/cutouts/isle-enemy-day.webp" if slug == "fort-great" else None)
b.add("sky-barge", "object", f"The subject: an enemy dreadnought sky-barge, a long flying warship of riveted iron and "
      f"red brick superstructure with gun turrets along its spine, smokestacks and {ENEMY_ENG}. {ENEMY}")
b.add("fort-ruin", "object", f"The subject: the great enemy fortress isle ({ROCK}) after defeat: walls half collapsed, "
      f"towers broken off, blackened stone and exposed iron beams, two engines dead and one sputtering. {ENEMY}",
      lights=("day", "night"))
b.add("fort-falling", "object", f"The subject: an enemy fortress isle ({ROCK}) falling: the whole island tilted 25 degrees "
      f"nose down, its engines failing, big chunks of rock and masonry breaking away from the underside and falling "
      f"beside it. {ENEMY}", lights=("day", "dusk", "night"))
b.add("fort-wreck", "object", "The subject: a crashed enemy fortress island lying wrecked on the ground in a city, a "
      "broken mountain of red brick, black iron and shattered rock with crushed buildings under its edges, cut cleanly "
      "at ground level. " + ENEMY, lights=("day", "night"))
b.add("engine-red", "object", "The subject: one rusted red enemy booster engine seen from the side, bolted to a chunk of "
      "rock at the top edge (the rock cut cleanly), firing a short red-orange flame with soot", lights=("day", "night"),
      aspect="square")
B.append(b)

# ---------- 03: city buildings, close ----------
b = Batch(3, "City buildings, close and sharp",
          "The owner: 'the buildings are too far away or low quality', 'chop up a bunch of different images for the "
          "cities'. One building per image, day and night, plus ruined and rebuilding states for the war story.")
BLD = [
    ("glass-tower", "a sleek glass office skyscraper with a sloped crown", "repo:art/isles/cutouts/bld-glass-day.webp"),
    ("twist-tower", "a twisting supertall tower whose floors rotate as it rises, white fins and blue glass", None),
    ("deco-tower", "an art deco skyscraper in pale limestone with setbacks, vertical piers and a stepped crown", "repo:art/isles/cutouts/bld-deco-day.webp"),
    ("brick-loft", "a seven-storey red brick warehouse loft with big steel windows and a rooftop water tank", "repo:art/isles/cutouts/bld-brick-day.webp"),
    ("stone-civic", "a grand stone civic hall with columns, a dome and wide steps", "repo:art/isles/cutouts/bld-stone-day.webp"),
    ("modern-office", "a crisp modern office block of white concrete bands and dark glass", "repo:art/isles/cutouts/bld-modern-day.webp"),
    ("residential", "a tall residential tower with deep balconies full of plants", None),
    ("hotel", "a luxury hotel tower with a rooftop infinity pool and a large ember-gold SISO lion-head emblem sign near the top", None),
    ("needle", "a slender concrete observation needle with a saucer deck and an antenna", None),
    ("arena", "a wide modern stadium arena with a curved roof shell and light masts", None),
    ("cathedral", "a gothic stone cathedral with two towers and a rose window", None),
    ("market-hall", "a long Victorian iron-and-glass market hall", None),
    ("data-centre", "a windowless data centre block with rooftop cooling units and a small SISO lion-head emblem on its wall", None),
    ("hospital", "a large modern hospital with a rooftop helipad", None),
    ("brutalist", "a raw concrete brutalist apartment block with deep window boxes", None),
    ("townhouses", "a row of four narrow terraced townhouses in different colours", None),
    ("lighthouse", "a tall white-and-red harbour lighthouse with a lantern room", None),
    ("ferry-terminal", "a low wide ferry terminal of timber and glass with a clock tower", None),
    ("viaduct", "one section of a stone railway viaduct with three arches and a train crossing it", None),
    ("monorail", "a sleek monorail station on a pylon with a white monorail car at the platform", None),
    ("crane-build", "a half-built concrete tower frame with a tall yellow tower crane above it", None),
    ("quay-cranes", "a container quay: two tall ship-to-shore gantry cranes over stacked coloured containers", None),
    ("warehouse", "a long dockside warehouse with saw-tooth roofs and loading doors", None),
    ("chimneys", "an old power station with two tall brick chimneys", None),
    ("museum", "a curving white modern museum with a sweeping roof", None),
    ("opera", "an opera house with white sail-like shell roofs", None),
    ("supertall", "a dark stepped supertall skyscraper with a spire, the tallest in the city", None),
    ("helix", "a skyscraper wrapped by a glowing double helix of balconies", None),
    ("twin-towers", "two identical glass towers joined high up by a skybridge", None),
    ("siso-annex", "a SISO office tower in the SISO design language with a large ember-gold lion-head emblem on its facade", None),
    ("screen-block", "a mid-rise block whose whole side is a huge outdoor LED screen showing the ember-gold SISO lion-head emblem", None),
    ("pagoda-tower", "a modern tower crowned in layered pagoda roofs", None),
]
for slug, what, ref in BLD:
    text = "the SISO lion-head emblem as described" if "SISO" in what else ""
    b.add(slug, "building", f"The subject: {what}. Night windows are a varied mix of warm and cool occupied rooms, "
          f"never every window lit", lights=("day", "night"), aspect="tall", ref=ref, text=text)
b.add("neon-block", "building", "The subject: a narrow night-district block with magenta and cyan neon trims, signs "
      "without legible letters, and a rooftop bar. Night windows are a varied mix of warm and cool occupied rooms",
      lights=("day", "night"), aspect="tall", key="green", ref="repo:art/isles/cutouts/bld-neon-night.webp")
for slug in ("glass-tower", "deco-tower", "brick-loft", "stone-civic", "modern-office", "residential", "hotel",
             "twist-tower", "supertall", "twin-towers", "siso-annex", "townhouses"):
    hero = b.id(slug, "day")
    b.frame(f"{slug}-ruin", hero, "show the same building destroyed: only the lower third still standing as a "
            "jagged broken shell with exposed floors, bent steel and a heap of rubble at the base cut at street level; "
            "no fire, no smoke", "building", "A destroyed building", aspect="tall")
    b.frame(f"{slug}-rebuild", hero, "show the same building being rebuilt: its lower half finished, the upper half "
            "an open steel and concrete frame wrapped in scaffolding with safety netting and one tower crane at the top",
            "building", "A building under reconstruction", aspect="tall")
B.append(b)

# ---------- 04: skylines and foregrounds ----------
b = Batch(4, "Skylines and foregrounds",
          "The owner: 'don't always have water in front, mix and match'. Whole districts as strips, and close "
          "foregrounds (roofs, beaches, cliffs, highways) to put in front of them.")
for slug, what in [
    ("downtown", "a dense downtown skyline of glass and stone towers"),
    ("harbor", "a harbour city waterfront: quays, warehouses and mid-rise blocks climbing a hill behind"),
    ("oldtown", "an old town on a hill: terracotta roofs, church towers and cypress trees"),
    ("port", "an industrial port: gantry cranes, tank farms, chimneys and stacked containers"),
    ("suburbs", "green suburbs on rolling hills: houses, trees, a school and a water tower"),
    ("resort", "a beach resort coast: white hotels, palm trees and a long promenade"),
    ("village", "a mountain village of stone houses and a small church on a steep slope"),
    ("desert-city", "a desert city of sandstone towers, domes and a few glass supertalls in heat haze"),
    ("arctic-town", "a snowy arctic town of colourful timber houses and a small harbour church"),
    ("siso-district", "the SISO district: a campus of dark smoked-glass towers in the SISO design language with "
                      "ember-gold lion-head emblems on two of them"),
    ("enemy-shore", "the enemy mainland coast: walled red brick factories, iron cranes and smokestacks"),
]:
    b.add(f"strip-{slug}", "strip", f"The subject: {what}, seen from far away across the bay on a long lens",
          lights=("day", "dusk", "night"),
          text="the SISO lion-head emblem as described" if slug == "siso-district" else "")
b.add("strip-neon", "strip", "The subject: a neon night district skyline with magenta and cyan signs and lit towers, "
      "seen across the water", lights=("dusk", "night"), key="green")
for slug, what in [
    ("rocky-shore", "a rocky shoreline of wet dark boulders and tide pools"),
    ("beach-palms", "a sandy beach with leaning palm trees and dune grass"),
    ("pier", "a long wooden pier with old lamp posts and coiled ropes"),
    ("rooftop", "the edge of a flat city rooftop with air-conditioning units, antennas, a water tank and a parapet, "
                "as if we stand on the roof"),
    ("highway", "an elevated highway with guard rails and tall street lights"),
    ("park-trees", "the canopy of a city park: leafy trees and lamp posts"),
    ("cliff-grass", "a grassy clifftop edge with wildflowers and a rough fence"),
    ("harbor-wall", "a stone harbour quay with iron bollards and mooring ropes"),
    ("rail-yard", "a rail yard of tracks, signals and parked freight wagons"),
    ("snow-ridge", "a snowy ridge with pine trees"),
    ("desert-rocks", "red desert rocks and dry scrub"),
    ("jungle", "a dense tropical jungle canopy with giant leaves"),
    ("marina", "a marina of moored white yachts and floating pontoons"),
    ("carrier-deck", "the edge of a SISO aircraft carrier deck with a parked dark graphite fighter jet and deck lights"),
]:
    b.add(f"fg-{slug}", "fg", f"The subject: {what}", lights=("day", "night") if slug not in ("rooftop", "pier", "cliff-grass") else ("day", "dusk", "night"))
B.append(b)

# ---------- 05: landscapes and sky ----------
b = Batch(5, "Landscapes, ridgelines and clouds",
          "Mountains and coasts at two depths to layer, and real clouds. The owner: 'the cloud bank lets it down a bit'.")
for biome, what in [
    ("alpine", "alpine mountains with snowfields, rock faces and pine forest on the lower slopes"),
    ("arctic", "arctic mountains and glaciers, all snow and blue ice"),
    ("desert", "desert mesas, buttes and dunes in warm sandstone"),
    ("volcanic", "dark volcanic peaks, lava rock ridges and a smoking cone"),
    ("jungle", "steep green tropical karst peaks wrapped in rainforest"),
    ("coast", "high coastal sea cliffs and headlands"),
    ("canyon", "a great canyon rim of layered red rock"),
    ("hills", "rolling forested hills"),
]:
    b.add(f"far-{biome}", "strip", f"The subject: a far ridgeline of {what}, softened by distance and atmospheric haze, "
          f"low in the frame", lights=("day", "dusk", "night"))
    b.add(f"near-{biome}", "strip", f"The subject: a near ridgeline of {what}, sharp and detailed, filling the lower "
          f"half of the frame", lights=("day", "dusk", "night"))
for i, shape in enumerate(["a tall towering cumulus with a flat base", "a wide fair-weather cumulus",
                           "a small puffy cumulus", "a long low cumulus line"]):
    b.add(f"cumulus-{i + 1}", "cloud", f"The subject: {shape}", lights=("day", "dusk"), key="magenta", aspect="wide",
          note="soft edge: transparent output strongly preferred")
b.add("cloud-bank", "cloud", "The subject: a long low bank of dense stratocumulus, like the top of a cloud sea seen "
      "from just above it, with real lumpy texture, light tops and shaded undersides", lights=("day", "dusk", "night"),
      aspect="pano", note="soft edge: transparent output strongly preferred")
b.add("storm-tower", "cloud", "The subject: a towering cumulonimbus storm cloud with an anvil top and a dark rain "
      "shaft below", lights=("day", "dusk"), aspect="tall", note="soft edge: transparent output strongly preferred")
b.add("cirrus", "cloud", "The subject: thin high cirrus streaks", lights=("day", "dusk"), aspect="pano", key="black",
      note="screen-blended: lit cloud on black")
b.add("volcano-eruption", "object", "The subject: an erupting volcano cone with lava fountains and an ash column",
      lights=("night",))
b.add("sea-arch", "object", "The subject: a natural sea arch and sea stack, cut cleanly at the waterline",
      lights=("day", "dusk"))
b.add("glacier-front", "strip", "The subject: the calving front of a tidewater glacier, blue ice cliffs",
      lights=("day",))
B.append(b)

# ---------- 06: the SISO air force ----------
b = Batch(6, "The SISO air force",
          "The owner wants the SISO jet 'like some Tomahawk jets', with 'some 3D dynamics if it needs to go sideways and "
          "do some roly-poly', 'a gun which comes at the bottom which is super futuristic', 'and then maybe we can go "
          "hypersonic'. One hero, then every frame as an edit of it.")
JD = f"The subject: {JET}"
hero = b.add("jet-side", "object", f"{JD}. Seen exactly side-on, nose pointing right, wheels up, level flight",
             lights=("day",), text="the SISO stencil and lion emblem as described",
             note="the hero: every other jet image is an edit of this one")
for view, change in [
    ("jet-3q-front", "turn the camera to a three-quarter front view from the right, slightly above"),
    ("jet-3q-rear", "turn the camera to a three-quarter rear view from the left, slightly above, nozzles visible"),
    ("jet-top", "show it from directly above (planform), nose pointing right"),
    ("jet-belly", "show it from directly below, nose pointing right, closed weapon bay doors visible"),
    ("jet-front", "show it from straight ahead, head-on"),
    ("jet-rear", "show it from straight behind, both nozzles"),
    ("jet-afterburner", "light both engines in full afterburner: cyan-white flames with clear shock diamonds behind each nozzle"),
    ("jet-gear", "lower the landing gear and open the small canopy rails, as on final approach"),
    ("jet-formation", "show three identical jets in a tight echelon formation, all side-on, the lead nearest"),
]:
    b.frame(view, hero, change, "object", JD, text="the SISO stencil and lion emblem as described")
for deg in range(30, 360, 30):
    b.frame(f"jet-roll-{deg:03d}", hero, f"roll the jet {deg} degrees clockwise about its own long axis as seen from its "
            f"tail (so at 90 its top faces the camera and at 270 its belly does); nose still pointing right, same size, "
            f"same centre", "object", JD, text="the SISO stencil and lion emblem as described",
            note="roll animation frame")
for deg, change in [("up20", "pitch the nose up 20 degrees"), ("up45", "pitch the nose up 45 degrees, climbing hard"),
                    ("down20", "pitch the nose down 20 degrees, diving")]:
    b.frame(f"jet-pitch-{deg}", hero, change, "object", JD, text="the SISO stencil and lion emblem as described")
for step, change in [
    ("gun-1", "open the long belly bay doors, revealing a dark bay"),
    ("gun-2", "with the bay open, lower a futuristic gun pod halfway out on a strut: a rotary plasma cannon with "
              "graphite barrels and cyan coil rings"),
    ("gun-3", "with the gun pod fully deployed below the belly on its strut, barrels pointing forward"),
    ("gun-4", "with the gun pod deployed and firing: cyan plasma muzzle bloom at the barrels and a short bright bolt leaving"),
]:
    b.frame(f"jet-{step}", hero, change, "object", JD, text="the SISO stencil and lion emblem as described",
            note="gun pod animation frame")
for step, change in [
    ("hyper-1", "sweep the wings fully back and close the canards flush, a hypersonic dash shape"),
    ("hyper-2", "in that swept shape at hypersonic speed: a thin orange-white heat glow along the nose and leading "
                "edges and a faint plasma sheath trailing back"),
    ("hyper-3", "in that swept shape breaking the sound barrier: a white vapour cone wrapped around the mid-body"),
]:
    b.frame(f"jet-{step}", hero, change, "object", JD, text="the SISO stencil and lion emblem as described",
            note="hypersonic frame")
for step, change in [("bay-open", "open the belly weapon bay, two slim missiles visible on rails"),
                     ("bay-drop", "a slim missile has just dropped from the open bay, a metre below the jet, motor not yet lit")]:
    b.frame(f"jet-{step}", hero, change, "object", JD, text="the SISO stencil and lion emblem as described")
b.frame("jet-side", hero, "change only the lighting to night: cyan accent lines and navigation lights glowing",
        "object", JD, light="night", text="the SISO stencil and lion emblem as described")
b.frame("jet-afterburner", hero, "change the lighting to night and light both engines in full afterburner with shock diamonds",
        "object", JD, light="night", text="the SISO stencil and lion emblem as described")
for slug, what, views in [
    ("wingman", "a SISO loyal-wingman combat drone: a tailless graphite flying wedge with no cockpit and cyan accent lines", ("day",)),
    ("bomber", "a SISO stealth bomber: a huge graphite flying wing with serrated edges", ("day", "night")),
    ("gunship", "a SISO heavy tilt-rotor gunship with side cannons", ("day", "night")),
    ("interceptor", "a small fast SISO interceptor dart with one engine", ("day",)),
    ("tanker", "a SISO aerial tanker with its refuelling boom extended", ("day",)),
    ("lifter", "a SISO cargo lifter: a broad four-ducted-fan heavy transport", ("day",)),
    ("heli", "a SISO stealth attack helicopter with faceted body", ("day", "night")),
    ("airship", "a graphite SISO airship whose envelope carries a large ember-gold lion-head emblem", ("day", "night")),
    ("quad-drone", "a SISO quad drone with cyan rotor rings", ("day", "night")),
    ("shuttle", "a SISO spaceplane: a white and graphite delta-winged shuttle", ("day",)),
    ("rocket", "a tall SISO heavy rocket in flight, white and graphite with the lion-head emblem, engines lit with a "
               "short bright plume (the long exhaust trail is drawn in code)", ("day", "night")),
    ("rocket-stage", "a SISO heavy rocket at stage separation: the spent booster falling away below, the upper stage "
                     "lighting its engine", ("day",)),
    ("frigate", "a SISO flying frigate: a sleek graphite warship hull with levitation engines and turret blisters", ("day", "dusk", "night")),
    ("carrier", "a SISO aircraft carrier at sea, hull cut cleanly at the waterline, jets on deck, the lion-head emblem on its island", ("day", "night")),
    ("patrol-boat", "a fast SISO patrol boat, graphite with cyan lights, hull cut cleanly at the waterline", ("day", "night")),
    ("missile", "a slim SISO air-to-air missile in flight with a cyan motor glow", ("day",)),
]:
    b.add(slug, "object", f"The subject: {what}. Side-on, nose pointing right. {SISO}", lights=views,
          text="the SISO lion-head emblem as described" if "emblem" in what else "")
B.append(b)

# ---------- 07: the enemy air force, ships and the sea ----------
b = Batch(7, "Enemy aircraft, ships, boats and sea life",
          "The SISO jet needs worthy losers, and the sea needs boats that look real (the wake and water are drawn in code).")
ED = f"The subject: {EJET}"
eh = b.add("brute-side", "object", f"{ED}. Seen exactly side-on, nose pointing left, level flight", lights=("day",),
           note="the hero: other Brute images are edits of it")
for view, change in [
    ("brute-3q-front", "turn the camera to a three-quarter front view"),
    ("brute-3q-rear", "turn the camera to a three-quarter rear view"),
    ("brute-top", "show it from directly above"),
    ("brute-afterburner", "light its engine with a dirty orange flame and black smoke puffs"),
    ("brute-hit", "show it badly damaged: holes torn in the fuselage, a wing tip shot off, panels peeled back (no fire)"),
    ("brute-front-half", "show only its front half, torn off just behind the cockpit, tumbling"),
    ("brute-rear-half", "show only its rear half with the tail and engine, torn off, tumbling"),
    ("brute-roll-090", "roll it 90 degrees so its top faces the camera"),
    ("brute-roll-180", "roll it upside down"),
]:
    b.frame(view, eh, change, "object", ED)
b.frame("brute-side", eh, "change only the lighting to night: a red cockpit glow and dim navigation lights", "object",
        ED, light="night")
for slug, what, lights in [
    ("bomber", "an enemy heavy bomber: a riveted iron four-engine aircraft in dull red with open bomb bay", ("day", "night")),
    ("drone", "a crude enemy kamikaze drone: a black iron cruciform body with a warhead nose and a pusher propeller", ("day",)),
    ("gunship", "an enemy gunship helicopter: a heavy armoured iron body with rocket pods", ("day", "night")),
    ("zeppelin", "an enemy war zeppelin: an iron-ribbed red envelope with a gondola of guns", ("day", "night")),
    ("cruise-missile", "a crude red-finned enemy cruise missile in flight", ("day",)),
    ("ballistic-missile", "a fat enemy ballistic missile in flight, red and black", ("day",)),
    ("destroyer", "an enemy destroyer at sea, hull cut cleanly at the waterline, gun turrets and a red-striped funnel", ("day", "night")),
    ("carrier", "an enemy carrier at sea, hull cut cleanly at the waterline, rust-streaked with red jets on deck", ("day", "night")),
    ("submarine", "an enemy submarine surfacing, its black hull cut cleanly at the waterline", ("day",)),
    ("gunboat", "an enemy gunboat with a deck gun, hull cut cleanly at the waterline", ("day", "night")),
]:
    b.add(f"enemy-{slug}", "object", f"The subject: {what}. Side-on, nose pointing left. {ENEMY}", lights=lights)
for slug, what, ref in [
    ("ferry", "a white and navy passenger ferry", "repo:art/isles/cutouts/boat-ferry-day.webp"),
    ("yacht", "a sleek white superyacht", "repo:art/isles/cutouts/boat-yacht-day.webp"),
    ("police", "a white and navy police launch with a light bar", "repo:art/isles/cutouts/boat-police-day.webp"),
    ("smuggler", "a low dark smuggler speedboat", "repo:art/isles/cutouts/boat-smuggler-day.webp"),
    ("cargo", "a container ship stacked with coloured containers", None),
    ("tanker", "a long oil tanker", None),
    ("cruise", "a large white cruise liner", None),
    ("sailboat", "a sailing yacht with full white sails", None),
    ("trawler", "a weathered fishing trawler with nets and booms", None),
    ("tug", "a red harbour tugboat", None),
    ("speedboat", "a white sport speedboat", None),
    ("catamaran", "a sailing catamaran", None),
    ("hovercraft", "a passenger hovercraft (its skirt sits on the cut line)", None),
    ("rescue", "an orange sea rescue lifeboat", None),
    ("research", "a SISO research vessel with a helideck and the ember-gold lion-head emblem on its hull", None),
]:
    b.add(f"boat-{slug}", "object", f"The subject: {what}, seen side-on, bow pointing right. The hull is cut in one clean "
          f"straight horizontal line exactly at the waterline: no water, no wake, no spray, no reflection",
          lights=("day", "night"), ref=ref, text="the SISO lion-head emblem as described" if slug == "research" else "")
b.add("bow-splash", "object", "The subject: the white bow wave and spray thrown up by a fast boat's bow, with no boat, "
      "real foam and droplets, seen side-on", lights=("day", "night"), aspect="square")
b.add("stern-churn", "object", "The subject: the churned white water, foam and low spray just behind a fast boat's "
      "stern, seen side-on with no boat, stretched horizontally and fading to the left", lights=("day", "night"))
b.add("whale", "object", "The subject: a humpback whale breaching, half out of the water, cut cleanly at the waterline "
      "with real spray", lights=("day",))
b.add("dolphins", "object", "The subject: three dolphins leaping in an arc, side-on", lights=("day",))
b.add("gull-up", "object", "The subject: one seagull in flight, side-on, wings fully up", lights=("day",), aspect="square")
b.frame("gull-down", b.id("gull-up", "day"), "the wings fully down", "object", "One seagull in flight", aspect="square")
B.append(b)

# ---------- 08: space ----------
b = Batch(8, "Space, the palace and the climb",
          "The owner liked the moon city, space palace ('go inside of it would be cool'), orbital station, satellite and "
          "attack ship, and said 'when you scroll up the view of the earth is kind of shit'. Earth plates for every "
          "altitude, the palace inside and out, and targets for the rocket.")
PAL = ("the SISO space palace: a white-and-gold orbital palace of cathedral-like spires and domes ringed by two great "
       "golden rings, a long spike keel below, warm windows")
ph = b.add("palace", "object", f"The subject: {PAL}", lights=("day",), ref="repo:refs/elements/space-palace.webp",
           note="'day' here means lit by full sunlight in space")
for view, change in [("palace-3q", "turn it to a three-quarter view from slightly above"),
                     ("palace-shadow", "light it from behind so it is mostly in shadow with every window glowing warm"),
                     ("palace-hit", "show hull breaches on one ring and two spires, scorched gold, debris drifting (no fire)"),
                     ("palace-dock", "show a small white shuttle docking at the lower ring")]:
    b.frame(view, ph, change, "object", f"The subject: {PAL}")
for room, what in [
    ("great-hall", "the palace's great hall: a long white-and-gold vaulted nave with tall windows onto the stars and Earth"),
    ("throne", "the palace throne room: a raised seat under a golden ring sculpture, a window wall onto Earth"),
    ("observatory", "the palace observation deck: a curved window wall onto the full blue Earth, a few lounge seats"),
    ("hangar", "the palace hangar bay: white ships on pads, open bay doors onto space"),
    ("atrium", "the palace garden atrium: trees, water channels and a glass dome showing stars"),
    ("reactor", "the palace reactor chamber: a vast glowing golden core inside concentric rings"),
    ("bridge", "the palace command bridge: consoles facing a panoramic window with a fleet outside"),
    ("corridor", "a long white palace corridor with gold ribs and round windows onto space"),
    ("library", "the palace library: tall shelves of books in a curved white hall, a window onto Earth"),
    ("ballroom", "the palace ballroom: a polished floor, gold chandeliers and a window wall onto the Moon"),
]:
    b.add(f"inside-{room}", "plate", f"The scene: {what}. Empty of people. Clean symmetrical cinematic framing",
          lights=("-",), key="none", aspect="film")
b.frame("inside-great-hall-hit", b.id("inside-great-hall", "-"), "show it during an attack: one window cracked, "
        "emergency red light, debris on the floor", "plate", "The palace great hall", light="-", key="none", aspect="film")
b.add("moon-city", "strip", "The subject: a lunar city of white domes, landing pads and lit habitats on cratered grey "
      "Moon ground; the sky above it is the background", lights=("day", "night"), ref="repo:refs/elements/moon-city.webp",
      note="'night' means lit by earthshine with every window glowing")
for phase in ("full", "gibbous", "half", "crescent"):
    b.add(f"moon-{phase}", "object", f"The subject: the real Moon as a {phase} moon disc, photographed through a "
          "telescope, true maria and craters", lights=("-",), aspect="square")
for slug, what in [
    ("station", "a large ring-shaped orbital station with solar wings and docking arms"),
    ("sat-comms", "a communications satellite with large gold-foil body and two long solar wings"),
    ("sat-siso", "a SISO satellite whose solar wing carries the ember-gold lion-head emblem"),
    ("sat-scope", "a space telescope with a long tube and an open aperture door"),
    ("sat-power", "a space solar power satellite: a huge mirror array with a beaming dish"),
    ("enemy-attack-ship", "an enemy space attack ship: an angular red-and-black iron craft with forward guns"),
    ("enemy-cruiser", "an enemy space cruiser: a long iron hull with turrets and red engine glow"),
    ("enemy-fortress", "an enemy orbital fortress: a black iron station of spikes, turrets and red-lit ports"),
    ("siso-starfighter", "a SISO space fighter: a graphite faceted craft with cyan engines"),
    ("siso-cruiser", "a SISO space cruiser: a long graphite hull with cyan engine rings"),
    ("elevator-climber", "a space elevator climber car riding up a thick ribbon tether (the tether cut cleanly top and bottom)"),
    ("asteroid-a", "a large rough grey asteroid"),
    ("asteroid-b", "a long potato-shaped dark asteroid"),
    ("asteroid-c", "a small cluster of three rocky asteroids"),
    ("debris", "a scatter of twisted metal space debris"),
]:
    lights = ("day", "night") if slug in ("station", "enemy-fortress", "enemy-cruiser") else ("day",)
    look = ENEMY if slug.startswith("enemy") else (SISO if "siso" in slug else "")
    b.add(slug, "object", f"The subject: {what}, in space. {look}", lights=lights,
          text="the SISO lion-head emblem as described" if "emblem" in what else "")
b.frame("enemy-fortress-hit", b.id("enemy-fortress", "day"), "show it torn open by a huge hit: half its spikes gone, "
        "glowing breaches (no fire, no smoke)", "object", "The enemy orbital fortress")
for km, what in [
    ("20km", "from 20 km up in the stratosphere: the horizon gently curved, a dark blue sky above, clouds far below"),
    ("100km", "from 100 km up: a clearly curved horizon, a thin bright blue atmosphere limb and black space above"),
    ("400km", "from low orbit at 400 km: a strongly curved Earth limb filling the lower third, oceans and clouds"),
    ("2000km", "from 2,000 km: a large part of the globe's curve, continents and cloud systems"),
    ("36000km", "from 36,000 km: the whole Earth disc small in the lower part of the frame, deep black space around it"),
]:
    b.add(f"earth-{km}", "plate", f"The scene: real Earth seen {what}; the camera looks level at the horizon so the Earth "
          "sits in the bottom part of the frame and space fills the top", lights=("day", "night"), key="none",
          aspect="pano", note="'night' means the night side: city lights, lightning in clouds, a thin airglow")
b.add("earth-sunrise", "plate", "The scene: an orbital sunrise over the Earth's limb, a thin rainbow band of atmosphere "
      "and a sharp sunburst", lights=("-",), key="none", aspect="pano")
b.add("earth-aurora", "plate", "The scene: green and violet aurora curtains over the night Earth seen from orbit",
      lights=("-",), key="none", aspect="pano")
b.add("moon-surface", "plate", "The scene: the grey cratered Moon surface with the blue Earth rising over its horizon",
      lights=("-",), key="none", aspect="pano")
B.append(b)

# ---------- 09: aliens, the portal and effects ----------
b = Batch(9, "Aliens, the portal and real effects",
          "The owner liked the portal, walker, flyer and drifter. Effects stay mostly in code; these real ones are "
          "references and optional sprites (fire, explosions, flashes on black for screen blending).")
for slug, what, n in [
    ("craft", "an alien craft: a smooth flattened organic saucer with ribbed edges", ("day", "night")),
    ("mothership", "an alien mothership: a vast ribbed organic hull like a giant seed pod", ("day", "night")),
    ("hive-isle", f"an alien hive island: {ROCK} overgrown with organic shell towers and glowing pods", ("day", "night")),
    ("wreck", "a crashed alien craft half buried in a rock outcrop, cut cleanly at the ground", ("day",)),
    ("seed-pod", "a landed alien seed pod opening its petals", ("night",)),
    ("spire", "a tall organic alien tendril tower", ("night",)),
]:
    b.add(f"alien-{slug}", "object", f"The subject: {what}. {ALIEN}", lights=n)
dh = b.add("drifter-1", "object", f"The subject: an alien drifter, a huge translucent jellyfish-like floater with a "
           f"glowing bell and long trailing tendrils, bell relaxed. {ALIEN}", lights=("night",))
b.frame("drifter-2", dh, "the bell contracted, tendrils pulled up", "object", "The alien drifter", light="night")
b.frame("drifter-3", dh, "the bell fully expanded, tendrils streaming down", "object", "The alien drifter", light="night")
fh = b.add("flyer-1", "object", f"The subject: an alien flyer, a manta-ray-like creature-craft with wide wings, wings "
           f"level. {ALIEN}", lights=("day",))
b.frame("flyer-2", fh, "the wings raised high", "object", "The alien flyer")
b.frame("flyer-3", fh, "the wings swept low", "object", "The alien flyer")
wh = b.add("walker-1", "object", f"The subject: an alien walker, a tall three-legged tripod machine with a domed head, "
           f"side-on, mid-stride with the front leg forward. {ALIEN}", lights=("day",))
for i, change in enumerate(["the legs passing each other, all three under the body",
                            "the rear leg swinging forward", "the stance wide, about to step"], start=2):
    b.frame(f"walker-{i}", wh, change, "object", "The alien walker")
b.frame("walker-1", wh, "change only the lighting to night", "object", "The alien walker", light="night")
ph = b.add("portal-ring", "object", "The subject: a huge dormant alien portal: a ring of dark chitin and bone standing "
           f"upright, its centre empty. {ALIEN}", lights=("night",))
for stage, change in [("portal-opening", "teal lightning crackling across the ring's centre"),
                      ("portal-open", "a swirling teal-violet vortex filling the ring, light pouring out"),
                      ("portal-closing", "the vortex collapsing into a bright point")]:
    b.frame(stage, ph, change, "object", "The alien portal", light="night", key="black")
b.add("portal-sea", "object", "The subject: an alien portal ring rising half out of the sea, its open vortex lighting "
      "the spray, cut cleanly at the waterline. " + ALIEN, lights=("night",))
eh = b.add("blast-1", "fx", "The subject: a large mid-air explosion, frame 1 of 8: the first white-hot flash and "
           "ignition core", lights=("-",), key="black", aspect="square", note="explosion flipbook")
for i, stage in enumerate(["a growing orange fireball", "the fireball at its peak, rolling", "the fireball rolling and "
                           "darkening at the edges", "breaking up into flame tongues and dark smoke", "mostly dark smoke "
                           "with fire inside", "thinning smoke with glowing embers", "a faint last wisp and falling embers"],
                          start=2):
    b.frame(f"blast-{i}", eh, f"show frame {i} of 8 of the same explosion at the same scale: {stage}", "fx",
            "A mid-air explosion", light="-", key="black", aspect="square")
for i, what in enumerate(["a round orange fireball", "a tall rising fireball with a smoke cap",
                          "a wide low fireball skimming along"], start=1):
    b.add(f"fireball-{i}", "fx", f"The subject: {what}", lights=("-",), key="black", aspect="square")
for i, what in enumerate(["a dark grey flak burst with a bright core", "a black flak puff with fragments"], start=1):
    b.add(f"flak-{i}", "fx", f"The subject: {what}", lights=("-",), key="black", aspect="square")
for i, what in enumerate(["a tall black war-smoke column", "a leaning grey smoke plume blown right",
                          "a low rolling smoke cloud over rubble"], start=1):
    b.add(f"smoke-{i}", "fx", f"The subject: {what}", lights=("day",), key="magenta", aspect="tall")
for i, what in enumerate(["a cyan plasma muzzle flash, side-on", "a cyan plasma bolt, side-on",
                          "an orange gun muzzle flash, side-on", "a white-hot missile motor flame, side-on"], start=1):
    b.add(f"flash-{i}", "fx", f"The subject: {what}", lights=("-",), key="black", aspect="wide")
for i, what in enumerate(["a bright cyan energy-shield impact ripple spreading from a point",
                          "a cyan hexagonal shield flare"], start=1):
    b.add(f"shield-hit-{i}", "fx", f"The subject: {what}", lights=("-",), key="black", aspect="square")
for i in range(1, 4):
    b.add(f"lightning-{i}", "fx", f"The subject: one real forked lightning bolt, shape {i} of 3, top to bottom",
          lights=("-",), key="black", aspect="tall")
for i, what in enumerate(["a tall white splash column of a shell hitting the sea", "a wide crown splash",
                          "a small splash with spray"], start=1):
    b.add(f"splash-{i}", "fx", f"The subject: {what}, cut cleanly at the waterline", lights=("day",), key="magenta",
          aspect="tall")
for i, what in enumerate(["gold", "cyan", "white and silver", "ember red and gold"], start=1):
    b.add(f"firework-{i}", "fx", f"The subject: one real firework shell burst in {what}, a full round peony", lights=("-",),
          key="black", aspect="square")
B.append(b)

# ---------- 10: the SISO brand in the world, and the story ----------
b = Batch(10, "The SISO lion in the world, and the story's key moments",
          "The owner: 'show the SISO logo more, the shield'. The lion on things the world would really have. Then the "
          "story he described, one plate per beat, as the target the live scene and the T3 loop are built to.")
LION = "the SISO lion-head emblem from the reference, exactly"
REF_LION = "repo:refs/brand/siso-lion-ember.png"
for slug, what, lights, key in [
    ("emblem-metal", "the SISO lion-head emblem as a thick brushed-gold and ember-enamel metal badge, front view", ("day", "night"), "magenta"),
    ("emblem-holo", "the SISO lion-head emblem as a cyan hologram projected in the air, scanlines and flicker", ("-",), "black"),
    ("neon-sign", "a neon tube sign of the SISO lion-head emblem in ember and gold on a black steel bracket", ("day", "night"), "green"),
    ("billboard", "a roadside billboard on a steel frame showing the SISO lion-head emblem on black", ("day", "night"), "magenta"),
    ("rooftop-letters", "giant SISO letters on a steel scaffold on a city rooftop, lit at night", ("day", "night"), "magenta"),
    ("blimp", "a black SISO advertising blimp with the lion-head emblem on its envelope, side-on", ("day", "night"), "magenta"),
    ("tail-fin", "a close view of a dark graphite jet tail fin carrying the SISO lion-head emblem", ("day",), "magenta"),
    ("crest-metal", "a heraldic shield crest carrying the SISO lion-head emblem, brushed metal and enamel", ("day",), "magenta"),
    ("crest-light", "a heraldic shield crest carrying the SISO lion-head emblem, made of glowing cyan light", ("-",), "black"),
    ("statue", "a monumental bronze lion statue on a granite plinth, the SISO lion in three dimensions", ("day", "dusk", "night"), "magenta"),
    ("gate", "the SISO headquarters gate: a dark steel arch with the lion-head emblem medallion", ("day", "night"), "magenta"),
    ("banner-plane", "a small plane towing a long black banner carrying the SISO lion-head emblem", ("day",), "magenta"),
    ("drone-show", "the SISO lion-head emblem drawn in the night sky by hundreds of glowing drone lights", ("-",), "black"),
    ("mural", "the SISO lion-head emblem painted as a huge mural on an old brick wall, cut cleanly at the ground", ("day",), "magenta"),
    ("hillside-letters", "giant white SISO letters on a green hillside", ("day", "night"), "magenta"),
    ("pennant", "a black pennant with the SISO lion-head emblem streaming from a ship mast", ("day",), "magenta"),
]:
    kind = "fx" if key == "black" else "object"
    b.add(slug, kind, f"The subject: {what}", lights=lights, key=key, ref=REF_LION,
          text=('the word "SISO"' if "letters" in what else LION))
fl = b.add("flag-1", "object", "The subject: a black SISO flag with the ember-gold lion-head emblem on a steel pole, "
           "waving in the wind, frame 1 of 4", lights=("day",), ref=REF_LION, text=LION)
for i in range(2, 5):
    b.frame(f"flag-{i}", fl, f"show frame {i} of 4 of the same flag waving: the cloth moved on a quarter of a wave",
            "object", "The SISO flag", text=LION)
STORY = [
    ("s01-pan", "a long sideways view across a living coastal city at dusk: boats in the bay, traffic, lit towers, and "
                "the SISO home island with the SISO Tower floating above the far end"),
    ("s02-chill", "the SISO Tower on its floating island at golden hour, calm: airliners, gulls, the city glowing below"),
    ("s03-attack", "enemy fortress islands open fire: a few dozen red-tailed missiles arc towards the city, interceptors "
                   "rise to meet them, the SISO shield dome flares cyan where missiles burst on it"),
    ("s04-rebuild", "the morning after: cranes and scaffolding rebuild the damaged towers, drones carry beams, the "
                    "lion-head banner hangs on the SISO Tower"),
    ("s05-hellfire", "a hellfire swarm: hundreds of thin bright missiles rain diagonally onto the enemy shore from the "
                     "upper left, small explosions across the walled factories"),
    ("s06-shootdown", "SISO jets in a dogfight over the sea: a dark graphite stealth fighter with a cyan gun pod firing, "
                      "an enemy red iron fighter breaking apart, an enemy island tilting as it falls"),
    ("s07-launch", "a SISO heavy rocket lifting off from a floating launch island, a towering exhaust plume, the city "
                   "small below"),
    ("s08-climb", "the same rocket high in the stratosphere, the curved Earth below, the sky turning black"),
    ("s09-strike", "in orbit the rocket's warhead strikes a black iron enemy orbital fortress, which breaks apart in a "
                   "white flash, the blue Earth below"),
    ("s10-tower-attacked", "enemy islands and gunships attack the SISO Tower: tracers and missiles converge on it, its "
                           "shield dome flares bright cyan"),
    ("s11-tower-hellfire", "the SISO Tower answers: its fins open and a dense swarm of cyan-tipped missiles streams up "
                           "and arcs into the enemy islands"),
    ("s12-islands-fall", "burning enemy fortress islands fall out of the sky onto the city, rock and masonry crashing "
                         "between towers, dust and smoke rising"),
    ("s13-ruins", "the city flattened: rubble, smoke columns, broken towers, the SISO Tower still standing behind its shield"),
    ("s14-respawn", "the city rising again: towers regrowing floor by floor in scaffolding and light, cranes everywhere, dawn"),
    ("s15-victory", "victory night: fireworks in gold and cyan over the SISO Tower and the rebuilt city, a drone show "
                    "lion-head emblem in the sky"),
]
for slug, what in STORY:
    b.add(slug, "plate", f"The scene: {what}. A wide cinematic film still from the same world: real materials, real "
          f"light, believable scale, the SISO design language for the home side and the enemy design language for the "
          f"enemy. {SISO} {ENEMY}", lights=("-",), key="none", aspect="pano",
          text='the single small word "SISO" on the tower crown and the SISO lion-head emblem', note="story keyframe")
B.append(b)


def write():
    total = 0
    for b in B:
        n = len(b.rows)
        assert 40 <= n <= 100, (b.n, n)
        total += n
        (HERE / f"batch-{b.n:02d}.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in b.rows))
        out = [f"# Batch {b.n:02d}: {b.title} ({n} images)", "", b.why, "",
               "Read `README.md` and `STYLE.md` in this folder first. Make the images in the order below: an image "
               "whose reference is an id from this batch is an edit of that image, so make that one first.", ""]
        for r in b.rows:
            out += [f"## {r['id']}", ""]
            meta = [f"background: {r['key']}"]
            if r["ref"]:
                meta.append(f"reference: {r['ref']}" + (" (edit it)" if r["edit"] else ""))
            if r["note"]:
                meta.append(r["note"])
            out += ["- " + "; ".join(meta), "", r["prompt"], ""]
        (HERE / f"BATCH-{b.n:02d}.md").write_text("\n".join(out))
        print(f"batch {b.n:02d}: {n:3d}  {b.title}")
    print("total", total)


if __name__ == "__main__":
    write()
