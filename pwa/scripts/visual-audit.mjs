import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

const root = process.cwd();
const referenceDir = resolve(root, '../docs/figma/screens');
const outputDir = resolve(root, 'visual-artifacts');
const currentDir = resolve(outputDir, 'current');
const diffDir = resolve(outputDir, 'diff');
const baseUrl = 'http://127.0.0.1:4173/?visual=1';

await rm(outputDir, { recursive: true, force: true });
await mkdir(currentDir, { recursive: true });
await mkdir(diffDir, { recursive: true });

const server = spawn(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
);

let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error('Vite visual server did not become ready.\n' + serverLog);
}

function refName(number) {
  const names = {
    1:'01-login.png',2:'02-vehicle-entry.png',3:'03-new-vehicle-form.png',4:'04-old-record-search.png',
    5:'05-iso7638-voltage-select.png',6:'06-iso7638-voltage-measurement.png',7:'07-iso12098-voltage-select.png',
    8:'08-iso12098-voltage-measurement.png',9:'09-iso12098-pin10-validation.png',10:'10-iso12098-pin11-validation.png',
    11:'11-iso12098-pin12-validation.png',12:'12-cable-test-select.png',13:'13-iso7638-cable-select.png',
    14:'14-iso7638-cable-measurement.png',15:'15-iso12098-cable-select.png',16:'16-iso12098-cable-measurement.png',
    17:'17-can-termination-select.png',18:'18-iso7638-can-tractor-select.png',19:'19-iso7638-can-trailer-select.png',
    20:'20-iso12098-can-tractor-select.png',21:'21-iso12098-can-trailer-select.png',22:'22-iso7638-can-tractor-safety.png',
    23:'23-iso7638-can-tractor-resistance.png',24:'24-iso7638-can-trailer-safety.png',25:'25-iso7638-can-trailer-resistance.png',
    26:'26-iso12098-can-tractor-safety.png',27:'27-iso12098-can-tractor-resistance.png',28:'28-iso12098-can-trailer-safety.png',
    29:'29-iso12098-can-trailer-resistance.png',30:'30-lamp-test-select.png',31:'31-lamp-test-measurement.png',
    32:'32-axle-lift-safety.png',33:'33-reports.png',34:'34-report-result.png',35:'35-report-save-modal.png',
    36:'36-report-save-common-modal.png',37:'37-settings.png',38:'38-settings-detail.png',39:'39-battery-status.png',
    40:'40-old-record-search-alt.png',
  };
  return names[number];
}

async function fresh(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-screen="01-login"]');
}

async function vehicleEntry(page) {
  await fresh(page);
  await page.click('[data-action="continue-login"]');
  await page.waitForSelector('[data-screen="02-vehicle-entry"]');
}

async function withRecord(page) {
  await vehicleEntry(page);
  await page.click('[data-action="new-vehicle"]');
  await page.waitForSelector('[data-screen="03-new-vehicle"]');
  await page.fill('[data-field="tractor-plate"]', '34 ABC 123');
  await page.fill('[data-field="trailer-plate"]', '34 DRS 456');
  await page.click('[data-action="save-vehicle"]');
  await page.waitForSelector('[data-screen="05-iso7638-select"]');
}

async function moveMain(page, count) {
  for (let index = 0; index < count; index += 1) {
    await page.click('.p5-carousel__arrow--right');
  }
}

async function moveCan(page, count) {
  for (let index = 0; index < count; index += 1) {
    await page.locator('.p5-can-subselector > button').last().click();
  }
}

async function canSafety(page, subSlide) {
  await withRecord(page);
  await moveMain(page, 3);
  await moveCan(page, subSlide);
  await page.click('[data-action="start-can"]');
  await page.waitForSelector('.p5-termination-safety');
}

async function confirmCan(page) {
  await page.check('.p5-termination-confirm input');
  await page.click('[data-action="confirm-can-safety"]');
  await page.waitForSelector('.p5-termination-result');
}

async function capture(page, number, prepare) {
  await prepare(page);
  await page.waitForTimeout(80);
  const file = refName(number);
  const currentPath = resolve(currentDir, file);
  await page.screenshot({ path: currentPath, fullPage: false });

  const reference = PNG.sync.read(await readFile(resolve(referenceDir, file)));
  const current = PNG.sync.read(await readFile(currentPath));
  if (reference.width !== current.width || reference.height !== current.height) {
    throw new Error(file + ': dimension mismatch ' + current.width + 'x' + current.height);
  }

  const diff = new PNG({ width: reference.width, height: reference.height });
  const mismatched = pixelmatch(
    reference.data,
    current.data,
    diff.data,
    reference.width,
    reference.height,
    { threshold: 0.12, includeAA: false },
  );
  await writeFile(resolve(diffDir, file), PNG.sync.write(diff));
  return {
    screen: file,
    mismatchedPixels: mismatched,
    ratio: mismatched / (reference.width * reference.height),
  };
}

await waitForServer();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: 'tr-TR',
});
const page = await context.newPage();

const cases = [
  [1, async p => fresh(p)],
  [2, async p => vehicleEntry(p)],
  [3, async p => { await vehicleEntry(p); await p.click('[data-action="new-vehicle"]'); await p.waitForSelector('[data-screen="03-new-vehicle"]'); }],
  [4, async p => { await vehicleEntry(p); await p.click('[data-action="old-record"]'); await p.waitForSelector('[data-overlay="old-record-search"]'); }],
  [5, async p => withRecord(p)],
  [6, async p => { await withRecord(p); await p.click('[data-action="start-test"]'); await p.waitForSelector('[data-screen="06-iso7638-live"]'); }],
  [7, async p => { await withRecord(p); await moveMain(p,1); }],
  [8, async p => { await withRecord(p); await moveMain(p,1); await p.click('[data-action="start-test"]'); await p.waitForSelector('[data-screen="08-iso12098-live"]'); }],
  [9, async p => { await withRecord(p); await moveMain(p,1); await p.click('[data-action="start-test"]'); await p.click('[data-action="validate-pin-10"]'); }],
  [10, async p => { await withRecord(p); await moveMain(p,1); await p.click('[data-action="start-test"]'); await p.click('[data-action="validate-pin-11"]'); }],
  [11, async p => { await withRecord(p); await moveMain(p,1); await p.click('[data-action="start-test"]'); await p.click('[data-action="validate-pin-12"]'); }],
  [12, async p => { await withRecord(p); await moveMain(p,2); }],
  [13, async p => { await withRecord(p); await moveMain(p,2); await p.click('[data-action="cable-iso7638"]'); }],
  [14, async p => { await withRecord(p); await moveMain(p,2); await p.click('[data-action="cable-iso7638"]'); await p.click('[data-action="start-cable"]'); }],
  [15, async p => { await withRecord(p); await moveMain(p,2); await p.click('[data-action="cable-iso12098"]'); }],
  [16, async p => { await withRecord(p); await moveMain(p,2); await p.click('[data-action="cable-iso12098"]'); await p.click('[data-action="start-cable"]'); }],
  [17, async p => { await withRecord(p); await moveMain(p,3); }],
  [18, async p => { await withRecord(p); await moveMain(p,3); }],
  [19, async p => { await withRecord(p); await moveMain(p,3); await moveCan(p,2); }],
  [20, async p => { await withRecord(p); await moveMain(p,3); await moveCan(p,1); }],
  [21, async p => { await withRecord(p); await moveMain(p,3); await moveCan(p,3); }],
  [22, async p => canSafety(p,0)],
  [23, async p => { await canSafety(p,0); await confirmCan(p); }],
  [24, async p => canSafety(p,2)],
  [25, async p => { await canSafety(p,2); await confirmCan(p); }],
  [26, async p => canSafety(p,1)],
  [27, async p => { await canSafety(p,1); await confirmCan(p); }],
  [28, async p => canSafety(p,3)],
  [29, async p => { await canSafety(p,3); await confirmCan(p); }],
  [30, async p => { await withRecord(p); await moveMain(p,4); }],
  [31, async p => { await withRecord(p); await moveMain(p,4); await p.click('[data-action="start-lamp"]'); }],
  [32, async p => { await withRecord(p); await moveMain(p,4); await p.click('[data-action="start-lamp"]'); await p.click('[data-action="open-axle-safety"]'); }],
  [33, async p => { await withRecord(p); await moveMain(p,5); }],
  [34, async p => { await withRecord(p); await moveMain(p,5); await p.click('[data-action="open-reports"]'); }],
  [35, async p => { await withRecord(p); await moveMain(p,5); await p.click('[data-action="open-reports"]'); await p.click('[data-action="open-report-save"]'); }],
  [36, async p => { await withRecord(p); await moveMain(p,4); await p.click('[data-action="start-lamp"]'); await p.click('[data-action="save-lamp"]'); }],
  [37, async p => { await withRecord(p); await moveMain(p,6); }],
  [38, async p => { await withRecord(p); await moveMain(p,6); await p.click('[data-action="open-settings"]'); }],
  [39, async p => { await withRecord(p); await moveMain(p,7); }],
  [40, async p => { await vehicleEntry(p); await p.click('[data-nav="settings"]'); await p.click('.p5-carousel__arrow--left'); await p.click('[data-action="open-reports"]'); await p.waitForSelector('[data-overlay="40-old-record-search-alt"]'); }],
];

const results = [];
try {
  for (const [number, prepare] of cases) {
    const result = await capture(page, number, prepare);
    results.push(result);
    console.log(
      String(number).padStart(2,'0') +
      ' ' + result.screen +
      ' mismatch=' + (result.ratio * 100).toFixed(2) + '%',
    );
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

results.sort((a,b) => b.ratio - a.ratio);
const summary = {
  generatedAt: new Date().toISOString(),
  viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  averageMismatchRatio: results.reduce((sum,item)=>sum+item.ratio,0) / results.length,
  worstScreens: results.slice(0,10),
  screens: results,
};
await writeFile(resolve(outputDir,'visual-report.json'), JSON.stringify(summary,null,2) + '\n');

const markdown = [
  '# BREMSECU PWA visual audit',
  '',
  'Viewport: 390x844 @ 1x',
  '',
  '| Screen | Pixel mismatch |',
  '|---|---:|',
  ...results.map(item => '| ' + item.screen + ' | ' + (item.ratio * 100).toFixed(2) + '% |'),
  '',
].join('\n');
await writeFile(resolve(outputDir,'visual-report.md'), markdown);

if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, markdown, { flag: 'a' });
}

if (results.length !== 40) {
  throw new Error('Expected 40 visual audit results, got ' + results.length);
}
