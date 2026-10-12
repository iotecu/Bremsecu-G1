import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function pngSize(buffer) {
  assert.equal(buffer.toString('ascii',1,4),'PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('all approved screenshots use the canonical 390x844 reference frame', async () => {
  const dir = resolve(process.cwd(), '../docs/figma/screens');
  const files = (await readdir(dir)).filter((name) => /^[0-9]{2}-.*[.]png$/.test(name)).sort();
  assert.equal(files.length, 40);
  for (const name of files) {
    const size = pngSize(await readFile(resolve(dir, name)));
    assert.deepEqual(size, { width: 390, height: 844 }, name + ' is not canonical 390x844');
  }
});
