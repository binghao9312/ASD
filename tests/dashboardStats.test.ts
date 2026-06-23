import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardStats,
  type DashboardLuggageRecord,
  type EmptyBedSettings,
} from '../src/utils/dashboardStats.ts';
import {
  applyCurrentBuildingSettings,
  createBuildingLayout,
  defaultDashboardBuildingSettings,
  type DashboardBuildingSetting,
} from '../src/utils/dashboardLayout.ts';

const building: DashboardBuildingSetting = {
  name: 'Building A',
  floors: [
    { floor: '2', roomStart: 1, roomEnd: 2, roomPrefix: '20', bedsPerRoom: 4 },
    { floor: '3', roomStart: 1, roomEnd: 1, roomPrefix: '30', bedsPerRoom: 4 },
  ],
};

const records: DashboardLuggageRecord[] = [
  {
    id: 'r1',
    building: 'Building A',
    ownerId: '2001-1',
    checkerEmail: 'a@example.com',
    checkerName: 'Staff A',
    scannedAtMillis: 1000,
  },
  {
    id: 'r2',
    building: 'Building A',
    ownerId: '2001-2',
    checkerEmail: 'a@example.com',
    checkerName: 'Staff A',
    scannedAtMillis: 2000,
  },
  {
    id: 'r3',
    building: 'Building A',
    ownerId: '2002-1',
    checkerEmail: 'b@example.com',
    checkerName: 'Staff B',
    scannedAtMillis: 3000,
  },
  {
    id: 'r4-latest',
    building: 'Building A',
    ownerId: '2001-1',
    checkerEmail: 'b@example.com',
    checkerName: 'Staff B',
    scannedAtMillis: 4000,
  },
  {
    id: 'r5-floor-3',
    building: 'Building A',
    ownerId: '3001-1',
    checkerEmail: 'a@example.com',
    checkerName: 'Staff A',
    scannedAtMillis: 5000,
  },
];

test('buildDashboardStats counts checked missing and empty beds', () => {
  const emptyBeds: EmptyBedSettings = { beds: { 'Building A|2001-4': true } };
  const stats = buildDashboardStats({
    layouts: [createBuildingLayout(building)],
    records,
    emptyBeds,
  });

  assert.equal(stats.buildings[0].checkedCount, 4);
  assert.equal(stats.buildings[0].emptyCount, 1);
  assert.equal(stats.buildings[0].remainingCount, 7);
  assert.equal(stats.buildings[0].targetCount, 11);
  assert.equal(stats.buildings[0].progress, 36);
});

test('room is complete when all beds are checked or empty', () => {
  const stats = buildDashboardStats({
    layouts: [createBuildingLayout(building)],
    records: [
      ...records,
      {
        id: 'r6',
        building: 'Building A',
        ownerId: '2001-3',
        checkerEmail: 'a@example.com',
        checkerName: 'Staff A',
        scannedAtMillis: 6000,
      },
    ],
    emptyBeds: { beds: { 'Building A|2001-4': true } },
  });

  const room = stats.buildings[0].floors[0].rooms.find((item) => item.roomNumber === '2001');
  assert.equal(room?.status, 'complete');
});

test('staff cards aggregate unique latest beds across multiple floors', () => {
  const stats = buildDashboardStats({
    layouts: [createBuildingLayout(building)],
    records,
    emptyBeds: { beds: {} },
  });

  const staffA = stats.staff.find((item) => item.checkerEmail === 'a@example.com');
  const staffB = stats.staff.find((item) => item.checkerEmail === 'b@example.com');

  assert.equal(staffA?.checkedCount, 2);
  assert.deepEqual(staffA?.coverage, ['Building A 2F', 'Building A 3F']);
  assert.equal(staffB?.checkedCount, 2);
  assert.deepEqual(staffB?.records.map((item) => item.ownerId).sort(), ['2001-1', '2002-1']);
});

test('applyCurrentBuildingSettings uses superadmin building floor counts', () => {
  const settings = applyCurrentBuildingSettings(defaultDashboardBuildingSettings, {
    '毅志': { floors: 2, luggageLimit: 5 },
    '弘德': { floors: 1, luggageLimit: 5 },
  });

  const yizhi = settings.find((item) => item.name === '毅志');
  const hongde = settings.find((item) => item.name === '弘德');
  const huilou = settings.find((item) => item.name === '慧樓');

  assert.equal(yizhi?.floors.length, 2);
  assert.equal(yizhi?.floors[1].roomPrefix, '202');
  assert.equal(hongde?.floors.length, 1);
  assert.equal(huilou?.floors.length, 6);
});
