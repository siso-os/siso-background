// A small enemy outpost island: a brick keep and gatehouse in a short wall on a lump of grey rock, three engine drums.
import { enemyIsland } from './_enemy.js';

const TOP = -112, BOTTOM = -54;

export default enemyIsland({
  id: 'islands.enemy-small',
  title: 'Enemy small island',
  about: 'A small enemy outpost: a brick keep and wall towers on a lump of grey rock, three brass engine drums. fall (p) tips it over, engines sputter, pieces break off.',
  w: 220, h: 200, top: TOP, bottom: BOTTOM,
  states: ['idle', 'boost', 'fall'],
  ref: 'refs/options/option-a-golden.webp',
  once: { fall: 4 },
  slots: { tower: [0, TOP - 44], guns: [[-44, TOP - 20], [44, TOP - 20]], engines: [[0, BOTTOM + 4]] },
  layout(seed, r) {
    const towers = [
      { x: -84, w: 13, h: 26 + r() * 8, spike: 1 },
      { x: 84, w: 15, h: 34 + r() * 10, spike: 1, roof: r() < 0.4 ? 11 : 0 },
    ];
    const ports = [[-56, Math.PI + 0.3], [-32, Math.PI + 0.36], [32, -0.36], [56, -0.3]];
    return {
      rockW: 200, keel: -21, towers, ports,
      engines: [[-61, -58, 6.5], [9, -34, 8.5], [61, -57, 6.5]],
      keep: { x: -6 + r() * 8, w: 30, h: 38 + r() * 8 },
      wall: { x0: -84, x1: 84, h: 16 }, gate: 18,
      town: { span: 70, peak: 18 },
      banners: [-6, 6],
      fires: [[-40, TOP - 12, 7], [30, TOP - 26, 8]],
      fallDir: r() < 0.5 ? -1 : 1,
    };
  },
});
