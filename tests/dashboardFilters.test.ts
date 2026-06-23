import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultDashboardFilterSettings,
  emptyDashboardWhitelistSettings,
  getDashboardVisibleRecords,
  isRecordExcludedByQrFilters,
  mergeDashboardFilterSettings,
  type DashboardFilterSettings,
} from '../src/utils/dashboardFilters.ts';
import type { DashboardLuggageRecord } from '../src/utils/dashboardStats.ts';

const record = (updates: Partial<DashboardLuggageRecord>): DashboardLuggageRecord => ({
  id: 'record-1',
  building: '毅志',
  ownerId: '20101-1',
  checkerEmail: 'super@example.com',
  checkerName: 'Super Admin',
  qrId: 'REAL-001',
  scannedAtMillis: new Date('2026-06-10T12:00:00').getTime(),
  ...updates,
});

test('default dashboard QR filter excludes ASTST serial numbers ending with dash one', () => {
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'ASTST0001-1' }), defaultDashboardFilterSettings), true);
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'ASTST0001-2' }), defaultDashboardFilterSettings), false);
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'REAL-0001-1' }), defaultDashboardFilterSettings), false);
});

test('default dashboard QR filter excludes ASDGB serial numbers', () => {
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'ASDGB003' }), defaultDashboardFilterSettings), true);
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'REAL-ASDGB003' }), defaultDashboardFilterSettings), false);
});

test('dashboard QR filter is configurable and not hard-coded to ASTST', () => {
  const filters: DashboardFilterSettings = {
    excludedQrRules: [
      { id: 'dev', label: 'Dev codes', enabled: true, prefix: 'DEV', suffix: '-X' },
    ],
  };

  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'DEV123-X' }), filters), true);
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'ASTST123-1' }), filters), false);
});

test('stored dashboard QR filters inherit newly added default rules', () => {
  const stored: DashboardFilterSettings = {
    excludedQrRules: [
      { id: 'test-qr', label: 'Custom test QR', enabled: false, prefix: 'OLD', suffix: '-T' },
    ],
  };

  const merged = mergeDashboardFilterSettings(stored);

  assert.equal(merged.excludedQrRules.find((rule) => rule.id === 'test-qr')?.prefix, 'OLD');
  assert.equal(isRecordExcludedByQrFilters(record({ qrId: 'ASDGB003' }), merged), true);
});

test('whitelist takes priority over QR filters and date range', () => {
  const outsideRangeTestRecord = record({
    id: 'late-record',
    qrId: 'ASTST999-1',
    scannedAtMillis: new Date('2026-05-01T12:00:00').getTime(),
  });

  const visible = getDashboardVisibleRecords([outsideRangeTestRecord], {
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    filters: defaultDashboardFilterSettings,
    whitelist: {
      records: { 'late-record': { reason: '合法資料，時間輸入錯誤' } },
      qrIds: {},
    },
  });

  assert.deepEqual(visible.map((item) => item.id), ['late-record']);
});

test('records outside date range are hidden unless whitelisted by QR id', () => {
  const outsideRangeRecord = record({
    id: 'wrong-time',
    qrId: 'REAL-WRONG-TIME',
    scannedAtMillis: new Date('2026-05-01T12:00:00').getTime(),
  });

  const hidden = getDashboardVisibleRecords([outsideRangeRecord], {
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    filters: defaultDashboardFilterSettings,
    whitelist: emptyDashboardWhitelistSettings,
  });
  const visible = getDashboardVisibleRecords([outsideRangeRecord], {
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    filters: defaultDashboardFilterSettings,
    whitelist: {
      records: {},
      qrIds: { 'REAL-WRONG-TIME': { reason: '合法資料' } },
    },
  });

  assert.deepEqual(hidden, []);
  assert.deepEqual(visible.map((item) => item.id), ['wrong-time']);
});
