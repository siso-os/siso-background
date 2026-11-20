#!/usr/bin/env node
// node tools/perf.mjs [query]  e.g. "secs=6&t=21.6" (dusk: the lights come on, new ranges scroll in), "secs=2&t=7.2" (the
// light key moves at t=7.5 with the default hour and day)
// Draws the scene frame by frame in headless Chromium at 1440x900 and reports frame times, and the average frame by
// layer. FAIL when a frame takes more than 6 times the median and over 300 ms (a stall you would see as a jerk), or when
// the page reports an error.
// The 2D canvas is drawn on the CPU here (--disable-accelerated-2d-canvas), so each cost lands in the call that made it.
// With the default emulated GPU (SwiftShader) the work queues up and whichever later call waits for it pays: frames of
// several seconds that no real GPU shows, credited to the wrong layer.
import { withServer, chrome } from './chrome.mjs';
const query = process.argv[2] || 'secs=6&t=21.6';
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// the verdict is returned and the process exits after withServer, so its server is always stopped (an exit inside the
// callback skipped the cleanup and left the server holding the output pipe open)
const code = await withServer(async (base) => {
  const dom = chrome(['--disable-accelerated-2d-canvas', '--window-size=1440,900', '--dump-dom', `${base}/tools/perf.html?${query}`], { budget: 20000, timeout: 900000 });
  const m = dom.match(/<pre id="result">(\{[\s\S]*?)<\/pre>/);
  if (!m) { console.log('no result'); console.log('FAIL'); return 1; }
  const r = JSON.parse(decode(m[1]));
  console.log(`${query}: ${r.size}  first ${r.first} ms  p50 ${r.p50}  p90 ${r.p90}  p99 ${r.p99}  max ${r.max}`);
  console.log(`average frame by layer (ms; items is what the things in them took): ${JSON.stringify(r.avg)}`);
  console.log(`slow frames (frame, ms, scene second, what took longest): ${JSON.stringify(r.slow.slice(0, 12))}${r.slow.length > 12 ? ` +${r.slow.length - 12}` : ''}`);
  for (const e of r.errors) console.log('error: ' + e);
  const bad = r.errors.length || r.max > Math.max(6 * r.p50, 300);
  console.log(bad ? 'FAIL' : 'PASS');
  return bad ? 1 : 0;
});
process.exit(code);
