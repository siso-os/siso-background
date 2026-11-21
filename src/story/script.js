// The story: one loop of the scene that tells the owner's storyline, in his order (20 Nov 2026):
//
//   "you're scrolling across to see the whole cities and then you go to the end chill for a bit got a nice city tower
//   whatever then an attack then a rebuild maybe and then like a hellfire missile swarm on the cities and then like
//   launch ... shoot a rocket and it goes all the way up up and you follow the rocket and then it blows up some shit and
//   then them guys start shooting the big tower and then the big tower hellfire swarms them and then ... the islands
//   start falling islands fall back onto the city and smoke a city back on the floor and then the buildings respawn
//   and they shoot some stuff and then you go across to that tower tower hellfire back in a loop"
//
// Everything is placed in the seed-0 world (src/engine/world.js): the SISO home bay is chunk 0, with the home island
// and its tower at x 1050 (depth 0.86), the city from 1180 to 2320 and an enemy island at 2520 (depth 0.78); the neon
// district is chunk -2 (-5200 to -3700) and the desert town chunk -1. Camera x is the world x at the middle of the
// screen at depth 1; camera y is 0 at sea level and -6900 in space (src/engine/view.js LEVELS); a key a little
// above 0 lifts the frame so the floating islands' tops are in it.
//
// Times are seconds into the loop. tools/story-check.mjs proves every event here plans and lands on screen.

export const LOOP = 330;
export const SEED = 0;

// The beats: what the bottom bar shows and jumps to.
export const BEATS = [
  { at: 0, title: 'Across the cities', line: 'The neon district, the desert town, then the SISO home bay.' },
  { at: 30, title: 'The tower', line: 'A quiet minute at the SISO tower; a police boat runs down a smuggler.' },
  { at: 50, title: 'Raid', line: 'The enemy island fires two ripples of missiles into the city.' },
  { at: 78, title: 'Rebuild', line: 'Cranes come up out of the rubble and the blocks go back up.' },
  { at: 98, title: 'Hellfire', line: 'A sheet of a hundred missiles rolls across the city.' },
  { at: 126, title: 'Launch', line: 'A rocket lifts off from the quay; the camera rides it up.' },
  { at: 176, title: 'Strike', line: 'In orbit, its warheads take an enemy wing apart.' },
  { at: 196, title: 'Back down', line: 'The enemy opens up on the tower; the shield takes it.' },
  { at: 205, title: 'Tower barrage', line: 'The tower answers with a swarm from its ports.' },
  { at: 215, title: 'Island fall', line: 'SISO jets knock out the island\'s engines; it comes down on the city.' },
  { at: 232, title: 'On the floor', line: 'Smoke over the flattened blocks.' },
  { at: 248, title: 'Respawn', line: 'The city builds itself back; a new island is lowered in.' },
  { at: 266, title: 'Jets', line: 'A SISO wing sweeps the bay.' },
  { at: 286, title: 'Across to the tower', line: 'Back along the city to the tower.' },
  { at: 300, title: 'Tower hellfire', line: 'The tower hits the new island with everything; then round again.' },
];

// The events: which one, when, and what the story fixes about it. `x` (optional) is the place x the event is
// planned at (default: the camera's x then); `opts` go to the event's plan; `set` overrides fields of the planned
// event (ruin: seconds a ruin stands before its rebuild; span: how long its after-effects last).
export const EVENTS = [
  { id: 'patrol', at: 31 },
  { id: 'raid', at: 50, set: { ruin: 10 } },
  { id: 'hellfire', at: 98, set: { ruin: 16 } },
  { id: 'launch', at: 126, opts: { x: 1330 } },
  { id: 'strike', at: 178 },
  { id: 'barrage', at: 203, x: 1500, set: { span: 17 } },
  { id: 'island-fall', at: 215, opts: { island: 2520, lean: -1, push: 3.6 }, set: { ruin: 18, span: 62 } },
  { id: 'flyby', at: 268, set: { enemy: false, dir: -1, start: 3300, v: 220 } },   // in from the right, along with the camera
  { id: 'barrage', at: 300, x: 1500, set: { span: 30 } },
];

// The camera's keys: from each key it eases to the next (ease 'io' smooth in and out, 'lin' straight).
export const CAMERA = [
  { t: 0, x: -5000, y: 0 },
  { t: 30, x: 1180, y: -100, ease: 'io' },  // a little above the sea, so the tower's spire is in the frame
  { t: 50, x: 1420, y: -50, ease: 'io' },
  { t: 78, x: 1800, y: 0, ease: 'io' },
  { t: 98, x: 1640, y: 0, ease: 'io' },
  { t: 126, x: 1760, y: 0, ease: 'io' },
  { t: 137, x: 1420, y: 0, ease: 'io' },
  // 137 to 182: the camera rides the rocket (FOLLOW below) up to space, holds over the strike, then dives home
  { t: 182, x: 3300, y: -6900, ease: 'io' },
  { t: 196, x: 3420, y: -6900, ease: 'io' },
  { t: 205, x: 1640, y: -540, ease: 'io' },  // the dive stops high: the tower and its barrage's rising stream in shot
  { t: 211, x: 1760, y: -460, ease: 'io' },
  { t: 218, x: 1850, y: 0, ease: 'io' },     // down to the city for the island coming down on it
  { t: 227, x: 2010, y: 0, ease: 'io' },
  { t: 248, x: 1940, y: 0, ease: 'io' },
  { t: 266, x: 2060, y: 0, ease: 'io' },
  { t: 286, x: 1300, y: -120, ease: 'io' }, // up again for the tower, and wide enough for the island it hits
  { t: 300, x: 1600, y: -110, ease: 'io' },
  { t: 330, x: 1700, y: -100, ease: 'io' },
];

// Where the camera rides something instead of following its keys: [from, to] with blends in and out.
export const FOLLOW = [
  { from: 137, to: 182, event: 'launch', blendIn: 4, blendOut: 6 },
];

// The hour of day through the loop: golden hour over the cities, dusk for the raid, night for the launch and after.
export const HOURS = [
  { t: 0, h: 16.9 }, { t: 50, h: 17.5 }, { t: 98, h: 18.2 }, { t: 137, h: 18.9 },
  { t: 205, h: 19.6 }, { t: 266, h: 20.2 }, { t: 330, h: 20.8 },
];

// The fade to black and back at the loop's seam (the camera jumps from the tower back to the neon district).
export const FADE = { out: 2.5, in: 1.5 };
