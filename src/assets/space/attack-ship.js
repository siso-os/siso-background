// An enemy attack ship, facing right: a low angular gunmetal hull in hard light, a raked canopy glowing orange from
// inside, intake slits and hot vents, two cannons under the nose, a blue-white engine at the tail with a short
// flickering plume. fire: the cannons pump orange bolts forward (they fly out of the box), muzzles flashing.
import { css, mix, cached, sun, lc, dotL, bloom, bolt, ih, nav } from './_lib.js';

const W = 128, H = 40, CY = -20;
const HULL = [119, 127, 138], DARK = [39, 42, 50], ORANGE = [255, 120, 40], RED = [255, 30, 24];

function body(g, S) {
  const panel = (points, base, facing, spec = 0.25) => {
    const low = Math.max(...points.map(([, y]) => y));
    const high = Math.min(...points.map(([, y]) => y));
    const g0 = g.createLinearGradient(S.side * 36, CY + high - 5, -S.side * 35, CY + low + 4);
    g0.addColorStop(0, css(lc(base, S, facing + 0.36, { spec })));
    g0.addColorStop(0.36, css(lc(base, S, facing)));
    g0.addColorStop(1, css(lc(base, S, facing - 0.55)));
    g.fillStyle = g0; g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(x, CY + y) : g.moveTo(x, CY + y));
    g.closePath(); g.fill();
  };
  panel([[-52,-5],[-45,-12],[-32,-13],[-12,-8],[19,-6]], HULL, 0.54);
  panel([[60,0],[22,-7],[-28,-10],[-49,-5],[-55,2],[-20,8],[37,5]], HULL, dotL(S, 0, -0.52, 0.63));
  panel([[60,0],[31,2],[-19,-1],[-44,-3],[-55,2],[-41,7],[3,10],[41,6]], DARK, 0.32);
  panel([[33,3],[3,9],[-26,17],[-48,16],[-37,11],[-38,6],[-19,1]], HULL, 0.62);
  panel([[32,4],[5,8],[-28,16],[-46,16],[-26,18],[8,11]], DARK, 0.12);
  panel([[7,0],[-15,-4],[-40,-5],[-48,-1],[-32,3],[-18,4]], DARK, -0.2);
  panel([[43,1],[56,0],[27,-6],[3,-7],[17,-2]], HULL, 0.76, 0.38);
  panel([[44,4],[18,4],[2,8],[8,11],[39,8]], HULL, 0.49);
  panel([[35,7],[17,8],[11,12],[30,12],[41,9]], DARK, 0.25);
  // Inset heat exchangers and small breaks in the armour edges.
  for (let i = 0; i < 6; i++) {
    const x = -41 + i * 3.2;
    panel([[x,-3],[x+2,-2.7],[x+0.7,1],[x-1,0.7]], DARK, 0.1);
  }
  g.strokeStyle = css(lc([182, 203, 225], S, 0.85, { spec: 0.4 }), 0.60);
  g.lineWidth = 0.38;
  g.beginPath();
  g.moveTo(-44,CY-11); g.lineTo(-32,CY-12.5); g.lineTo(-23,CY-10.5);
  g.moveTo(S.side > 0 ? 18 : -31,CY-8); g.lineTo(52,CY-1.3);
  g.moveTo(-45,CY+15); g.lineTo(-26,CY+15); g.lineTo(4,CY+8);
  g.stroke();
  // Service covers break up the wide upper panel without outlining the whole hull.
  panel([[-35,-6],[-19,-7.2],[-8,-5.7],[-16,-4.7],[-36,-4.6]], DARK, 0.45);
  panel([[-33,-6],[-19,-6.8],[-11,-5.8],[-17,-5.1],[-34,-5]], HULL, 0.52);
  panel([[-30,8],[-14,6.1],[-9,6.8],[-25,10.2],[-36,12.7]], DARK, 0.19);
  g.strokeStyle = css(lc([181, 197, 215], S, 0.95), 0.45);
  g.lineWidth = 0.26;
  g.beginPath(); g.moveTo(-34, CY - 5.9); g.lineTo(-19, CY - 6.7);
  g.moveTo(-33, CY + 11.6); g.lineTo(-14, CY + 6.4); g.stroke();
  // the canopy: dark glass with a warm cockpit glow
  const cg = g.createLinearGradient(8, CY - 10, 24, CY - 4);
  cg.addColorStop(0, 'rgb(20,22,30)'); cg.addColorStop(0.6, 'rgb(120,56,24)'); cg.addColorStop(1, 'rgb(255,150,70)');
  g.fillStyle = cg; g.beginPath(); g.moveTo(26, CY - 4.6); g.lineTo(12, CY - 9.5); g.lineTo(0, CY - 8.6); g.lineTo(2, CY - 6.4); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,240,220,0.5)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(24, CY - 5); g.lineTo(12, CY - 9.2); g.stroke();
  // cannons under the nose
  g.fillStyle = css(lc(DARK, S, 0.5, { spec: 0.6 })); g.fillRect(24, CY + 4.2, 22, 1.4); g.fillRect(18, CY + 6, 20, 1.2);
  // engine bell
  g.fillStyle = css(lc(DARK, S, 0.2)); g.fillRect(-54, CY - 4, 8, 8);
  g.fillStyle = '#080b10'; g.fillRect(-55, CY - 2.8, 4, 5.6);
}

export default {
  id: 'space.attack-ship', family: 'space', title: 'Attack ship',
  about: 'An enemy attack ship facing right: angular gunmetal hull in hard light, orange-lit canopy, hot vents, two nose cannons, a blue-white engine plume. fire: the cannons pump orange bolts forward out of the box.',
  w: W, h: H, states: ['idle', 'fire'], loop: 2, once: {}, variants: 1, free: true,
  ref: 'refs/slice/vertical-slice.webp',
  draw(ctx, o) {
    ctx.save();
    const S = sun(o.L, o.lit ?? o.L.side), t = o.t || 0;
    // engine plume behind the hull
    const fl = 0.85 + 0.15 * ih(Math.floor(t * 30), 1, o.seed || 0);
    const pg = ctx.createLinearGradient(-53, 0, -84, 0);
    pg.addColorStop(0, `rgba(200,230,255,${0.9 * fl})`); pg.addColorStop(0.3, `rgba(90,150,255,${0.5 * fl})`); pg.addColorStop(1, 'rgba(60,110,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = pg;
    ctx.beginPath(); ctx.moveTo(-53, CY - 2.8); ctx.bezierCurveTo(-61, CY - 2, -67, CY - fl, -62 - 25 * fl, CY); ctx.bezierCurveTo(-67, CY + fl, -61, CY + 2, -53, CY + 2.8); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    bloom(ctx, -54, CY, 12 * fl, [110, 170, 255], 0.8);
    const c = cached(`space.attack-ship|0|${o.state}|${S.q}`, W, H, (o.scale || 1) * (globalThis.devicePixelRatio || 1), (g) => body(g, S));
    ctx.drawImage(c, -W / 2, -H, W, H);
    bloom(ctx, -54, CY, 4, [230, 244, 255], 1);
    for (const [x, y] of [[-43, 13], [-28, 13], [18, 3.5], [27, 4.5]]) {
      nav(ctx, x, CY + y, RED, t, { r: 3.4, phase: x * 0.023, period: 1.1 });
      bloom(ctx, x, CY + y, 2.5, RED, 0.37);
      ctx.fillStyle = css([255, 90, 67], 0.87); ctx.fillRect(x - 1.25, CY + y - 0.32, 2.5, 0.64);
    }
    if (o.state === 'fire') {
      const per = 0.065;
      for (let n = 0; n < 4; n++) {
        const shot = Math.floor(t / per) - n, ts = t - shot * per, gun = ((shot % 2) + 2) % 2;
        const y = gun ? CY + 4.9 : CY + 10, x0 = gun ? 46 : 38, d = ts * 950;
        bolt(ctx, x0 + d - 30, y, x0 + d, y, ORANGE, 1.25, 1);
        if (ts < 0.05) bloom(ctx, x0, y, 8, [255, 180, 90], 1 - ts / 0.05);
      }
    }
    ctx.restore();
  },
};
