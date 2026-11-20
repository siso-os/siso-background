// The enemy island: a walled town of red brick and slate on a slab of grey rock, brass engine drums burning orange under it.
// fire, hit and fall are the battle states; slots.tower is the keep's roof, slots.guns the wall cannons.
import { enemyIsland } from './_enemy.js';

const TOP = -168, BOTTOM = -78;

export default enemyIsland({
  id: 'islands.enemy',
  title: 'Enemy fortress island',
  about: 'The enemy island: a red-brick walled town with round spiked towers, a citadel with a twin-barrel battery, cannon in the wall, brass engine drums burning orange. fire flashes the guns, hit burns it, fall (p) tips it over and breaks it up.',
  w: 420, h: 300, top: TOP, bottom: BOTTOM,
  states: ['idle', 'boost', 'fire', 'hit', 'fall'],
  ref: 'refs/options/option-a-golden.webp',
  once: { fall: 5 },
  slots: { tower: [0, TOP - 70], guns: [[-84, TOP - 30], [-34, TOP - 30], [34, TOP - 30], [84, TOP - 30]], engines: [[0, BOTTOM + 6]] },
  layout(seed, r) {
    const kw = 50 + r() * 14, kh = 62 + r() * 16;
    const towers = [
      { x: -164, w: 22 + r() * 4, h: 62 + r() * 16, spike: 1 },
      { x: -110 + r() * 6, w: 15, h: 38 + r() * 10, spike: 1, roof: r() < 0.35 ? 12 : 0 },
      { x: -58 + r() * 4, w: 14, h: 34 + r() * 8, spike: 1 },
      { x: 58 + r() * 4, w: 14, h: 34 + r() * 8, spike: 1 },
      { x: 110 + r() * 6, w: 15, h: 38 + r() * 10, spike: 1, roof: r() < 0.35 ? 12 : 0 },
      { x: 164, w: 22 + r() * 4, h: 58 + r() * 16, spike: 1 },
    ];
    const ports = [[-136, Math.PI + 0.3], [-84, Math.PI + 0.24], [-34, Math.PI + 0.4], [34, -0.4], [84, -0.24], [136, -0.3]];
    const engines = [[-147, -107, 8], [-89, -83, 9], [21, -52, 13], [93, -81, 9], [153, -108, 8]];
    return {
      rockW: 400, keel: -26, towers, ports, engines,
      keep: { x: 28 + (r() - 0.5) * 15, w: kw, h: kh + 8 },
      wall: { x0: -164, x1: 164, h: 26 }, gate: 26,
      town: { span: 150, peak: 34 },
      banners: [-8.5, 8.5],
      fires: [[-96, TOP - 20, 9], [42, TOP - 40, 11], [130, TOP - 26, 8], [-20, BOTTOM - 30, 7]],
      fallDir: r() < 0.5 ? -1 : 1,
    };
  },
});
