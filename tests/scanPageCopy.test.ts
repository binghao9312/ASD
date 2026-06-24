import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('scan registration room field explains current login room and next semester sticker room', () => {
  const scanSource = readFileSync(new URL('../src/pages/Scan.tsx', import.meta.url), 'utf8');

  assert.match(scanSource, /登入請填寫當前房床號/);
  assert.match(scanSource, /貼紙請寫下學期的房床號/);
});
