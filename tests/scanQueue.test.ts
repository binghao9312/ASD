import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addScannedQrToQueue,
  getAlreadyRegisteredQrIds,
  getAlreadyRegisteredRoomNumbers,
  getDuplicateWarnings,
  getRegistrationQrIds,
} from '../src/utils/scanQueue.ts';

test('stores the first scanned QR in the pending queue', () => {
  const result = addScannedQrToQueue([], ' QR-001 ');

  assert.deepEqual(result.qrIds, ['QR-001']);
  assert.equal(result.added, true);
  assert.equal(result.duplicate, false);
});

test('keeps the first pending QR when the same QR is scanned again', () => {
  const result = addScannedQrToQueue(['QR-001'], 'QR-001');

  assert.deepEqual(result.qrIds, ['QR-001']);
  assert.equal(result.added, false);
  assert.equal(result.duplicate, true);
});

test('keeps a different QR scanned before submit', () => {
  const result = addScannedQrToQueue(['QR-001'], 'QR-002');

  assert.deepEqual(result.qrIds, ['QR-001', 'QR-002']);
  assert.equal(result.added, true);
  assert.equal(result.duplicate, false);
});

test('uses the pending queue for registration when it has scanned QR ids', () => {
  const qrIds = getRegistrationQrIds(['QR-001', 'QR-002'], 'MANUAL-QR');

  assert.deepEqual(qrIds, ['QR-001', 'QR-002']);
});

test('falls back to the manual QR field when nothing has been scanned', () => {
  const qrIds = getRegistrationQrIds([], ' MANUAL-QR ');

  assert.deepEqual(qrIds, ['MANUAL-QR']);
});

test('identifies QR ids that already have registration records', () => {
  const qrIds = getAlreadyRegisteredQrIds(
    ['QR-001', 'QR-002', 'QR-001', ' '],
    [' QR-002 ', 'QR-003'],
  );

  assert.deepEqual(qrIds, ['QR-002']);
});

test('identifies room numbers that already have registration records', () => {
  const roomNumbers = getAlreadyRegisteredRoomNumbers(' 20502-3 ', ['20502-3', '106-1']);

  assert.deepEqual(roomNumbers, ['20502-3']);
});

test('builds duplicate warnings for registered QR ids and room numbers', () => {
  const warnings = getDuplicateWarnings({
    candidateQrIds: ['QR-001', 'QR-002'],
    registeredQrIds: ['QR-002'],
    candidateRoomNumber: '20502-3',
    registeredRoomNumbers: ['20502-3'],
  });

  assert.deepEqual(warnings, [
    { type: 'qr', value: 'QR-002' },
    { type: 'room', value: '20502-3' },
  ]);
});
