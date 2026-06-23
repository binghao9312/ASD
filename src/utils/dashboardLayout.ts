export interface DashboardFloorSetting {
  floor: string;
  roomStart: number;
  roomEnd: number;
  roomPrefix?: string;
  bedsPerRoom?: number;
}

export interface DashboardBuildingSetting {
  name: string;
  floors: DashboardFloorSetting[];
}

export interface CurrentBuildingSetting {
  floors?: number;
  luggageLimit?: number;
  roomsPerFloor?: number;
  bedsPerRoom?: number;
}

export type CurrentBuildingSettings = Record<string, CurrentBuildingSetting | undefined>;

export interface DashboardBed {
  id: string;
  building: string;
  floor: string;
  roomNumber: string;
  bedNumber: number;
}

export interface DashboardRoom {
  building: string;
  floor: string;
  roomNumber: string;
  beds: DashboardBed[];
}

export interface DashboardFloor {
  building: string;
  floor: string;
  rooms: DashboardRoom[];
}

export interface DashboardBuildingLayout {
  name: string;
  floors: DashboardFloor[];
}

const padRoom = (value: number) => value.toString().padStart(2, '0');

export const createBedId = (building: string, ownerId: string) => `${building}|${ownerId}`;

export const defaultDashboardBuildingSettings: DashboardBuildingSetting[] = [
  {
    name: '毅志',
    floors: Array.from({ length: 11 }, (_, index) => {
      const floor = String(index + 1);
      return {
        floor,
        roomPrefix: `2${floor.padStart(2, '0')}`,
        roomStart: 1,
        roomEnd: 16,
        bedsPerRoom: 4,
      };
    }),
  },
  {
    name: '弘德',
    floors: Array.from({ length: 8 }, (_, index) => {
      const floor = String(index + 1);
      return {
        floor,
        roomPrefix: `1${floor}`,
        roomStart: 1,
        roomEnd: 10,
        bedsPerRoom: 4,
      };
    }),
  },
  {
    name: '慧樓',
    floors: Array.from({ length: 6 }, (_, index) => {
      const floor = String(index + 1);
      return {
        floor,
        roomPrefix: `5${floor}`,
        roomStart: 1,
        roomEnd: 10,
        bedsPerRoom: 4,
      };
    }),
  },
];

export const applyCurrentBuildingSettings = (
  defaults: DashboardBuildingSetting[],
  currentSettings: CurrentBuildingSettings,
): DashboardBuildingSetting[] => {
  return defaults.map((building) => {
    const current = currentSettings[building.name];
    if (!current) return building;

    const floorCount = Math.max(1, Math.floor(current.floors ?? building.floors.length));
    const floors = building.floors.slice(0, floorCount).map((floor) => ({
      ...floor,
      roomEnd: current.roomsPerFloor ?? floor.roomEnd,
      bedsPerRoom: current.bedsPerRoom ?? floor.bedsPerRoom,
    }));

    return { ...building, floors };
  });
};

export const createBuildingLayout = (setting: DashboardBuildingSetting): DashboardBuildingLayout => {
  const floors = setting.floors.map((floorSetting) => {
    const bedsPerRoom = floorSetting.bedsPerRoom ?? 4;
    const rooms: DashboardRoom[] = [];

    for (let room = floorSetting.roomStart; room <= floorSetting.roomEnd; room += 1) {
      const roomNumber = `${floorSetting.roomPrefix ?? floorSetting.floor}${padRoom(room)}`;
      rooms.push({
        building: setting.name,
        floor: floorSetting.floor,
        roomNumber,
        beds: Array.from({ length: bedsPerRoom }, (_, index) => {
          const bedNumber = index + 1;
          return {
            id: createBedId(setting.name, `${roomNumber}-${bedNumber}`),
            building: setting.name,
            floor: floorSetting.floor,
            roomNumber,
            bedNumber,
          };
        }),
      });
    }

    return { building: setting.name, floor: floorSetting.floor, rooms };
  });

  return { name: setting.name, floors };
};
