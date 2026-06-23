import { createBedId, type DashboardBed, type DashboardBuildingLayout } from './dashboardLayout.ts';

export type BedStatus = 'checked' | 'missing' | 'empty';
export type RoomStatus = 'complete' | 'incomplete';

export interface DashboardLuggageRecord {
  id: string;
  building: string;
  ownerId: string;
  checkerEmail?: string | null;
  checkerName?: string | null;
  qrId?: string;
  scannedAtMillis: number;
}

export interface EmptyBedSettings {
  beds: Record<string, true>;
}

export interface DashboardBedStats extends DashboardBed {
  ownerId: string;
  status: BedStatus;
  record?: DashboardLuggageRecord;
}

export interface DashboardRoomStats {
  building: string;
  floor: string;
  roomNumber: string;
  beds: DashboardBedStats[];
  checkedCount: number;
  emptyCount: number;
  remainingCount: number;
  targetCount: number;
  status: RoomStatus;
}

export interface DashboardFloorStats {
  building: string;
  floor: string;
  rooms: DashboardRoomStats[];
  checkedCount: number;
  emptyCount: number;
  remainingCount: number;
  targetCount: number;
}

export interface DashboardBuildingStats {
  building: string;
  floors: DashboardFloorStats[];
  checkedCount: number;
  emptyCount: number;
  remainingCount: number;
  targetCount: number;
  progress: number;
}

export interface DashboardStaffStats {
  checkerEmail: string;
  checkerName?: string | null;
  checkedCount: number;
  lastScannedAtMillis: number;
  coverage: string[];
  records: DashboardLuggageRecord[];
}

export interface DashboardStats {
  buildings: DashboardBuildingStats[];
  staff: DashboardStaffStats[];
}

const sum = <T>(items: T[], selector: (item: T) => number) =>
  items.reduce((total, item) => total + selector(item), 0);

const latestRecordsByBed = (records: DashboardLuggageRecord[]) => {
  const latest = new Map<string, DashboardLuggageRecord>();

  records.forEach((record) => {
    if (!record.building || !record.ownerId) return;

    const bedId = createBedId(record.building, record.ownerId);
    const current = latest.get(bedId);
    if (!current || record.scannedAtMillis >= current.scannedAtMillis) {
      latest.set(bedId, record);
    }
  });

  return latest;
};

const getRecordFloor = (record: DashboardLuggageRecord, bedLookup: Map<string, DashboardBed>) => {
  return bedLookup.get(createBedId(record.building, record.ownerId))?.floor;
};

export const buildDashboardStats = ({
  layouts,
  records,
  emptyBeds,
}: {
  layouts: DashboardBuildingLayout[];
  records: DashboardLuggageRecord[];
  emptyBeds: EmptyBedSettings;
}): DashboardStats => {
  const latest = latestRecordsByBed(records);
  const bedLookup = new Map<string, DashboardBed>();
  const staffRecords = new Map<string, DashboardLuggageRecord[]>();

  layouts.forEach((layout) => {
    layout.floors.forEach((floor) => {
      floor.rooms.forEach((room) => {
        room.beds.forEach((bed) => {
          bedLookup.set(bed.id, bed);
        });
      });
    });
  });

  const buildings = layouts.map((layout) => {
    const floors = layout.floors.map((floor) => {
      const rooms = floor.rooms.map((room) => {
        const beds = room.beds.map((bed) => {
          const ownerId = `${bed.roomNumber}-${bed.bedNumber}`;
          const record = latest.get(bed.id);
          const status: BedStatus = emptyBeds.beds[bed.id] ? 'empty' : record ? 'checked' : 'missing';

          if (record?.checkerEmail && status === 'checked') {
            const bucket = staffRecords.get(record.checkerEmail) ?? [];
            bucket.push(record);
            staffRecords.set(record.checkerEmail, bucket);
          }

          return { ...bed, ownerId, status, record };
        });
        const checkedCount = beds.filter((bed) => bed.status === 'checked').length;
        const emptyCount = beds.filter((bed) => bed.status === 'empty').length;
        const remainingCount = beds.filter((bed) => bed.status === 'missing').length;
        const targetCount = beds.length - emptyCount;
        const roomStatus: RoomStatus = remainingCount === 0 ? 'complete' : 'incomplete';

        return {
          building: room.building,
          floor: room.floor,
          roomNumber: room.roomNumber,
          beds,
          checkedCount,
          emptyCount,
          remainingCount,
          targetCount,
          status: roomStatus,
        };
      });

      return {
        building: floor.building,
        floor: floor.floor,
        rooms,
        checkedCount: sum(rooms, (room) => room.checkedCount),
        emptyCount: sum(rooms, (room) => room.emptyCount),
        remainingCount: sum(rooms, (room) => room.remainingCount),
        targetCount: sum(rooms, (room) => room.targetCount),
      };
    });

    const checkedCount = sum(floors, (floor) => floor.checkedCount);
    const emptyCount = sum(floors, (floor) => floor.emptyCount);
    const remainingCount = sum(floors, (floor) => floor.remainingCount);
    const targetCount = sum(floors, (floor) => floor.targetCount);

    return {
      building: layout.name,
      floors,
      checkedCount,
      emptyCount,
      remainingCount,
      targetCount,
      progress: targetCount > 0 ? Math.round((checkedCount / targetCount) * 100) : 100,
    };
  });

  const staff = Array.from(staffRecords.entries())
    .map(([checkerEmail, staffItems]) => {
      const sorted = [...staffItems].sort((a, b) => b.scannedAtMillis - a.scannedAtMillis);
      const coverage = Array.from(
        new Set(
          sorted
            .map((record) => {
              const floor = getRecordFloor(record, bedLookup);
              return floor ? `${record.building} ${floor}F` : null;
            })
            .filter((item): item is string => Boolean(item)),
        ),
      ).sort();

      return {
        checkerEmail,
        checkerName: sorted[0]?.checkerName,
        checkedCount: sorted.length,
        lastScannedAtMillis: sorted[0]?.scannedAtMillis ?? 0,
        coverage,
        records: sorted,
      };
    })
    .sort((a, b) => b.checkedCount - a.checkedCount || b.lastScannedAtMillis - a.lastScannedAtMillis);

  return { buildings, staff };
};
