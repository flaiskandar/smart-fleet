import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9444;
const SCREENSHOT_DIR = join(import.meta.dirname, 'screenshots');
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=C:\\Users\\LENOVO\\AppData\\Local\\Temp\\opencode\\edge_manual',
  'about:blank',
], { stdio: 'ignore' });

await sleep(3000);

let target;
for (let i = 0; i < 30; i++) {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await res.json();
    target = targets.find(t => t.type === 'page');
    if (target) break;
  } catch {}
  await sleep(500);
}
if (!target) { console.error('No debug target'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
  }
};

await new Promise(r => ws.onopen = r);
await send('Runtime.enable');
await send('Page.enable');

const goto = async (url) => {
  await send('Page.navigate', { url });
  await sleep(4000);
};

const screenshot = async (path) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path, Buffer.from(data, 'base64'));
};

const fillInput = async (selector, value) => {
  await send('Runtime.evaluate', { expression: `document.querySelector('${selector}').focus()` });
  await sleep(200);
  for (const ch of value) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }
};

const click = async (selector) => {
  const { result } = await send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector('${selector}'); const r = el.getBoundingClientRect(); return JSON.stringify({x: r.x + r.width/2, y: r.y + r.height/2}); })()`
  });
  const { x, y } = JSON.parse(result.value);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
};

// Screenshot 1: Login page
console.log('Capturing Login page...');
await goto('http://localhost:5173/login');
await sleep(2000);
await screenshot(join(SCREENSHOT_DIR, '01_login.png'));

// Log in
console.log('Logging in...');
await fillInput('input[type="text"]', 'admin');
await sleep(200);
await fillInput('input[type="password"]', 'password123');
await sleep(200);
await click('button[type="submit"]');
await sleep(5000);

// Screenshot 2: Dashboard
console.log('Capturing Dashboard...');
await screenshot(join(SCREENSHOT_DIR, '02_dashboard.png'));

// Navigate to each module
const routes = [
  { path: '/fleet', name: '03_fleet' },
  { path: '/generators', name: '04_generators' },
  { path: '/dispatch', name: '05_dispatch' },
  { path: '/assets', name: '06_assets' },
  { path: '/sales', name: '07_sales' },
  { path: '/fuel', name: '08_fuel' },
  { path: '/clients', name: '09_clients' },
  { path: '/driver-calendar', name: '10_calendar' },
  { path: '/gps-playback', name: '11_gps_playback' },
  { path: '/sync', name: '12_erp_sync' },
];

for (const r of routes) {
  console.log(`Capturing ${r.name}...`);
  await goto(`http://localhost:5173${r.path}`);
  await sleep(3000);
  await screenshot(join(SCREENSHOT_DIR, `${r.name}.png`));
}

console.log('All screenshots captured!');
proc.kill();
process.exit(0);
