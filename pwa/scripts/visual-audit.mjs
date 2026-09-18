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
const referenceCopyDir = resolve(outputDir, 'reference');
const diffDir = resolve(outputDir, 'diff');
const baseUrl = 'http://127.0.0.1:4173/';

await rm(outputDir, { recursive: true, force: true });
await mkdir(currentDir, { recursive: true });
await mkdir(referenceCopyDir, { recursive: true });
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

const files = [
  '01-login.png','02-vehicle-entry.png','03-new-vehicle-form.png','04-old-record-search.png',
  '05-iso7638-voltage-select.png','06-iso7638-voltage-measurement.png','07-iso12098-voltage-select.png',
  '08-iso12098-voltage-measurement.png','09-iso12098-pin10-validation.png','10-iso12098-pin11-validation.png',
  '11-iso12098-pin12-validation.png','12-cable-test-select.png','13-iso7638-cable-select.png',
  '14-iso7638-cable-measurement.png','15-iso12098-cable-select.png','16-iso12098-cable-measurement.png',
  '17-can-termination-select.png','18-iso7638-can-tractor-select.png','19-iso7638-can-trailer-select.png',
  '20-iso12098-can-tractor-select.png','21-iso12098-can-trailer-select.png','22-iso7638-can-tractor-safety.png',
  '23-iso7638-can-tractor-resistance.png','24-iso7638-can-trailer-safety.png','25-iso7638-can-trailer-resistance.png',
  '26-iso12098-can-tractor-safety.png','27-iso12098-can-tractor-resistance.png','28-iso12098-can-trailer-safety.png',
  '29-iso12098-can-trailer-resistance.png','30-lamp-test-select.png','31-lamp-test-measurement.png',
  '32-axle-lift-safety.png','33-reports.png','34-report-result.png','35-report-save-modal.png',
  '36-report-save-common-modal.png','37-settings.png','38-settings-detail.png','39-battery-status.png',
  '40-old-record-search-alt.png',
];

await waitForServer();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  locale: 'tr-TR',
});
const page = await context.newPage();
const results = [];

try {
  for (let index = 0; index < files.length; index += 1) {
    const screen = index + 1;
    const file = files[index];
    await page.goto(baseUrl + '?visual=1&screen=' + String(screen).padStart(2, '0'), { waitUntil: 'networkidle' });
    await page.waitForTimeout(80);

    const currentPath = resolve(currentDir, file);
    await page.screenshot({ path: currentPath, fullPage: false });

    const referenceBuffer = await readFile(resolve(referenceDir, file));
    await writeFile(resolve(referenceCopyDir, file), referenceBuffer);
    const reference = PNG.sync.read(referenceBuffer);
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

    const result = {
      screen: file,
      mismatchedPixels: mismatched,
      ratio: mismatched / (reference.width * reference.height),
    };
    results.push(result);
    console.log(
      String(screen).padStart(2,'0') + ' ' + file +
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
