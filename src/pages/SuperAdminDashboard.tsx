import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { Ban, BarChart3, Bed, Building2, CheckCircle2, Clock, Save, UserCheck } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { getTimestampMillis } from '../services/dateRange';
import { getDataValiditySettings } from '../services/settings';
import {
  getDashboardBuildingSettings,
  getDashboardFilterSettings,
  getDashboardWhitelistSettings,
  getEmptyBedSettings,
  saveDashboardFilterSettings,
  saveDashboardWhitelistSettings,
  saveEmptyBedSettings,
} from '../services/dashboardSettings';
import { createBuildingLayout, type DashboardBuildingSetting } from '../utils/dashboardLayout';
import {
  buildDashboardStats,
  type DashboardBedStats,
  type DashboardBuildingStats,
  type DashboardFloorStats,
  type DashboardLuggageRecord,
  type DashboardStaffStats,
  type EmptyBedSettings,
} from '../utils/dashboardStats';
import {
  defaultDashboardFilterSettings,
  emptyDashboardWhitelistSettings,
  getDashboardVisibleRecords,
  type DashboardFilterSettings,
  type DashboardWhitelistSettings,
} from '../utils/dashboardFilters';
import { cn } from '../utils/cn';
import { isSuperAdminUser } from '../services/permissions';

type TimestampLike = { toDate?: () => Date; toMillis?: () => number } | Date | string | number | null | undefined;

interface ManualCheckState {
  bed: DashboardBedStats;
  luggagePlaced: boolean;
  luggageNumber: string;
}

const statusClass: Record<DashboardBedStats['status'], string> = {
  checked: 'bg-green-500 text-white',
  missing: 'bg-red-500 text-white',
  empty: 'bg-slate-300 text-slate-600 line-through dark:bg-slate-700 dark:text-slate-300',
};

const formatTime = (millis: number) =>
  millis
    ? new Intl.DateTimeFormat('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(millis))
    : '無紀錄';

function BuildingSummaryCards({
  buildings,
  selectedBuilding,
  onSelect,
}: {
  buildings: DashboardBuildingStats[];
  selectedBuilding?: string;
  onSelect: (building: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {buildings.map((building) => (
        <button
          key={building.building}
          type="button"
          onClick={() => onSelect(building.building)}
          className={cn(
            'rounded-lg border bg-white p-4 text-left shadow-sm transition-colors dark:bg-slate-900',
            selectedBuilding === building.building
              ? 'border-green-400 ring-2 ring-green-100 dark:ring-green-900/40'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-800',
          )}
        >
          <div className="flex items-center justify-between text-sm font-black text-slate-800 dark:text-slate-100">
            <span className="inline-flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              {building.building}
            </span>
            <span className="text-green-600 dark:text-green-400">{building.progress}%</span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">
            {building.checkedCount} / {building.targetCount}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            剩餘 {building.remainingCount}，空床 {building.emptyCount}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(3, building.progress)}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function StaffCards({
  staff,
  selectedStaff,
  onSelect,
}: {
  staff: DashboardStaffStats[];
  selectedStaff: DashboardStaffStats | null;
  onSelect: (staff: DashboardStaffStats) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
          <UserCheck className="h-4 w-4 text-slate-400" />
          幹部檢查卡片
        </h3>
        <span className="text-xs text-slate-500">依完成數排序</span>
      </div>
      <div className="grid gap-3">
        {staff.slice(0, 8).map((item) => (
          <button
            key={item.checkerEmail}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              selectedStaff?.checkerEmail === item.checkerEmail
                ? 'border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-black text-slate-900 dark:text-slate-100">{item.checkerName || item.checkerEmail}</div>
                <div className="text-xs text-slate-500">{item.checkerEmail}</div>
              </div>
              <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-black text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {item.checkedCount} 筆
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {item.coverage.slice(0, 4).map((coverage) => (
                <span key={coverage} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {coverage}
                </span>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>最後檢查</span>
              <span>{formatTime(item.lastScannedAtMillis)}</span>
            </div>
          </button>
        ))}
        {staff.length === 0 && <div className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500 dark:bg-slate-950">尚無檢查紀錄</div>}
      </div>
    </section>
  );
}

function FloorCards({
  floors,
  selectedFloor,
  onSelect,
}: {
  floors: DashboardFloorStats[];
  selectedFloor?: string;
  onSelect: (floor: string) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
          <BarChart3 className="h-4 w-4 text-slate-400" />
          樓層進度
        </h3>
        <span className="text-xs text-slate-500">點選樓層看房間</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {floors.map((floor) => {
          const progress = floor.targetCount > 0 ? Math.round((floor.checkedCount / floor.targetCount) * 100) : 100;
          return (
            <button
              key={floor.floor}
              type="button"
              onClick={() => onSelect(floor.floor)}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors',
                selectedFloor === floor.floor
                  ? 'border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800',
              )}
            >
              <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-slate-100">
                <span>{floor.floor}F</span>
                <span>{floor.checkedCount} / {floor.targetCount}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500">剩餘 {floor.remainingCount}，空床 {floor.emptyCount}</div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-red-100 dark:bg-red-950/50">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(3, progress)}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RoomMap({
  floor,
  canManageDashboard,
  onToggleEmpty,
  onManualCheck,
}: {
  floor?: DashboardFloorStats;
  canManageDashboard: boolean;
  onToggleEmpty: (bedId: string) => void;
  onManualCheck: (bed: DashboardBedStats) => void;
}) {
  if (!floor) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">尚未選擇樓層</section>;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
          <Bed className="h-4 w-4 text-slate-400" />
          {floor.building} {floor.floor}F 房號 / 床號
        </h3>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-green-500" />全清空</span>
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-red-500" />未完成</span>
          <span className="inline-flex items-center gap-1"><i className="h-3 w-3 rounded-sm bg-slate-300" />空床</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {floor.rooms.map((room) => (
          <div
            key={room.roomNumber}
            className={cn(
              'rounded-lg border-2 p-3',
              room.status === 'complete'
                ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                : 'border-red-500 bg-red-50 dark:bg-red-950/20',
            )}
          >
            <div className="flex items-center justify-between text-sm font-black text-slate-900 dark:text-slate-100">
              <span>{room.roomNumber}</span>
              <span>{room.status === 'complete' ? '完成' : `缺 ${room.remainingCount}`}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {room.beds.map((bed) => (
                <div key={bed.id} className="grid grid-cols-[1fr_auto] gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (canManageDashboard) onManualCheck(bed);
                    }}
                    className={cn('h-9 rounded-md text-xs font-black transition-transform active:scale-95', statusClass[bed.status])}
                    title={canManageDashboard ? '手動完成檢查' : '檢視床位狀態'}
                  >
                    {bed.bedNumber}
                  </button>
                  {canManageDashboard && (
                    <button
                      type="button"
                      onClick={() => onToggleEmpty(bed.id)}
                      className={cn(
                        'h-9 w-8 rounded-md border text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                        bed.status === 'empty' && 'border-slate-500 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white',
                      )}
                      title="切換空床"
                      aria-label={`${bed.roomNumber}-${bed.bedNumber} 切換空床`}
                    >
                      <Ban className="mx-auto h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StaffDetail({
  staff,
  canManageDashboard,
  onWhitelistQr,
}: {
  staff: DashboardStaffStats | null;
  canManageDashboard: boolean;
  onWhitelistQr: (record: DashboardLuggageRecord) => void;
}) {
  if (!staff) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
        點選一位幹部後，這裡會顯示他的檢查紀錄。
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-slate-900 dark:text-slate-100">{staff.checkerName || staff.checkerEmail}</h3>
        <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-black text-green-700 dark:bg-green-900/30 dark:text-green-300">
          {staff.checkedCount} 筆
        </span>
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto pr-1">
        {staff.records.map((record) => (
          <div key={`${record.id}-${record.ownerId}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <span className="font-black text-slate-800 dark:text-slate-100">{record.building} {record.ownerId}</span>
              <span className="text-right text-slate-500">{formatTime(record.scannedAtMillis)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-slate-500">{record.qrId || '無 QR 編號'}</span>
              {canManageDashboard && (
                <button
                  type="button"
                  onClick={() => onWhitelistQr(record)}
                  className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  加入白名單
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SuperAdminDashboard() {
  const { user, userData } = useAuth();
  const canManageDashboard = isSuperAdminUser(userData);
  const [records, setRecords] = useState<DashboardLuggageRecord[]>([]);
  const [emptyBeds, setEmptyBeds] = useState<EmptyBedSettings>({ beds: {} });
  const [layoutSettings, setLayoutSettings] = useState<DashboardBuildingSetting[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<DashboardStaffStats | null>(null);
  const [dataStartDate, setDataStartDate] = useState('');
  const [dataEndDate, setDataEndDate] = useState('');
  const [filterSettings, setFilterSettings] = useState<DashboardFilterSettings>(defaultDashboardFilterSettings);
  const [whitelistSettings, setWhitelistSettings] = useState<DashboardWhitelistSettings>(emptyDashboardWhitelistSettings);
  const [whitelistQrInput, setWhitelistQrInput] = useState('');
  const [manualCheck, setManualCheck] = useState<ManualCheckState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBedId, setSavingBedId] = useState<string | null>(null);
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    Promise.all([
      getDashboardBuildingSettings(),
      getEmptyBedSettings(),
      getDataValiditySettings(),
      getDashboardFilterSettings(),
      getDashboardWhitelistSettings(),
    ]).then(([settings, empty, dataValidity, filters, whitelist]) => {
      setLayoutSettings(settings);
      setEmptyBeds(empty);
      setFilterSettings(filters);
      setWhitelistSettings(whitelist);
      setSelectedBuilding(settings[0]?.name ?? '');
      setSelectedFloor(settings[0]?.floors[0]?.floor ?? '');
      setDataStartDate(dataValidity.startDate);
      setDataEndDate(dataValidity.endDate);
      setLoading(false);
    }).catch((error) => {
      console.error('Unable to load dashboard settings', error);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const recordsQuery = query(
      collection(db, 'luggages'),
      orderBy('scannedAt', 'desc'),
      limit(2000),
    );

    const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
      setRecords(snapshot.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          building: data.building,
          ownerId: data.ownerId,
          checkerEmail: data.checkerEmail,
          checkerName: data.checkerName,
          qrId: data.qrId,
          scannedAtMillis: getTimestampMillis(data.scannedAt as TimestampLike),
        };
      }));
    });

    return () => unsubscribe();
  }, []);

  const visibleRecords = useMemo(() => getDashboardVisibleRecords(records, {
    startDate: dataStartDate,
    endDate: dataEndDate,
    filters: filterSettings,
    whitelist: whitelistSettings,
  }), [dataEndDate, dataStartDate, filterSettings, records, whitelistSettings]);

  const stats = useMemo(() => buildDashboardStats({
    layouts: layoutSettings.map(createBuildingLayout),
    records: visibleRecords,
    emptyBeds,
  }), [emptyBeds, layoutSettings, visibleRecords]);

  const selectedBuildingStats = stats.buildings.find((item) => item.building === selectedBuilding) ?? stats.buildings[0];
  const selectedFloorStats = selectedBuildingStats?.floors.find((item) => item.floor === selectedFloor) ?? selectedBuildingStats?.floors[0];

  const handleSelectBuilding = (building: string) => {
    const nextBuilding = stats.buildings.find((item) => item.building === building);
    setSelectedBuilding(building);
    setSelectedFloor(nextBuilding?.floors[0]?.floor ?? '');
  };

  const updateFilterRule = (
    ruleId: string,
    updates: Partial<DashboardFilterSettings['excludedQrRules'][number]>,
  ) => {
    setFilterSettings((current) => ({
      excludedQrRules: current.excludedQrRules.map((rule) => (
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )),
    }));
  };

  const toggleEmptyBed = async (bedId: string) => {
    if (!canManageDashboard) return;
    if (savingBedId) return;
    const previous = emptyBeds;
    const nextBeds = { ...emptyBeds.beds };
    if (nextBeds[bedId]) {
      delete nextBeds[bedId];
    } else {
      nextBeds[bedId] = true;
    }

    const next = { beds: nextBeds };
    setSavingBedId(bedId);
    setEmptyBeds(next);

    try {
      await saveEmptyBedSettings(next, user?.email);
    } catch (error) {
      console.error('Unable to save empty bed settings', error);
      setEmptyBeds(previous);
      alert('空床設定儲存失敗，請再試一次。');
    } finally {
      setSavingBedId(null);
    }
  };

  const saveFilterSettings = async () => {
    if (!canManageDashboard) return;
    try {
      await saveDashboardFilterSettings(filterSettings, user?.email);
      alert('QR 遮蔽設定已儲存。');
    } catch (error) {
      console.error('Unable to save dashboard filter settings', error);
      alert('QR 遮蔽設定儲存失敗，請再試一次。');
    }
  };

  const saveWhitelistSettings = async (next: DashboardWhitelistSettings) => {
    if (!canManageDashboard) return;
    const previous = whitelistSettings;
    setWhitelistSettings(next);
    try {
      await saveDashboardWhitelistSettings(next, user?.email);
    } catch (error) {
      console.error('Unable to save dashboard whitelist settings', error);
      setWhitelistSettings(previous);
      alert('白名單儲存失敗，請再試一次。');
    }
  };

  const addQrToWhitelist = async (qrId: string, reason = '手動加入白名單') => {
    if (!canManageDashboard) return;
    const normalizedQrId = qrId.trim();
    if (!normalizedQrId) return;

    await saveWhitelistSettings({
      records: whitelistSettings.records,
      qrIds: {
        ...whitelistSettings.qrIds,
        [normalizedQrId]: { reason, addedBy: user?.email ?? null, addedAtMillis: Date.now() },
      },
    });
    setWhitelistQrInput('');
  };

  const addRecordToWhitelist = async (record: DashboardLuggageRecord) => {
    if (!canManageDashboard) return;
    if (record.qrId) {
      await addQrToWhitelist(record.qrId, '由 Dashboard 紀錄加入白名單');
      return;
    }

    await saveWhitelistSettings({
      records: {
        ...whitelistSettings.records,
        [record.id]: { reason: '由 Dashboard 紀錄加入白名單', addedBy: user?.email ?? null, addedAtMillis: Date.now() },
      },
      qrIds: whitelistSettings.qrIds,
    });
  };

  const submitManualCheck = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManageDashboard) return;
    if (!manualCheck || savingManual) return;
    if (!user?.email) {
      alert('找不到登入信箱，請重新登入後再試。');
      return;
    }

    setSavingManual(true);
    try {
      await addDoc(collection(db, 'luggages'), {
        qrId: manualCheck.luggageNumber.trim(),
        ownerId: manualCheck.bed.ownerId,
        building: manualCheck.bed.building,
        pieceCount: manualCheck.luggagePlaced ? 1 : 0,
        checkerEmail: user.email,
        checkerName: user.displayName || null,
        conditions: { dashboardManual: true },
        remarks: {
          dashboardManual: '超級管理員 Dashboard 手動完成',
          luggagePlaced: manualCheck.luggagePlaced ? '是' : '否',
        },
        source: 'dashboard-manual',
        luggagePlaced: manualCheck.luggagePlaced,
        manualCreatedBy: user.email,
        scannedAt: serverTimestamp(),
      });
      setManualCheck(null);
    } catch (error) {
      console.error('Unable to create manual dashboard record', error);
      alert('手動完成檢查失敗，請再試一次。');
    } finally {
      setSavingManual(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-slate-500">載入 Dashboard...</div>;
  }

  return (
    <div className="w-full space-y-5 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">超級管理員 Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            統整三棟檢查進度、幹部紀錄、樓層房號與床位狀態。
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Clock className="mr-1 inline h-3.5 w-3.5" />
          {dataStartDate || '不限'} - {dataEndDate || '不限'}
        </div>
      </div>

      <BuildingSummaryCards buildings={stats.buildings} selectedBuilding={selectedBuildingStats?.building} onSelect={handleSelectBuilding} />

      {canManageDashboard && (
        <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">QR 測試資料遮蔽</h3>
              <p className="text-xs text-slate-500">目前規則可修改前綴與後綴，預設遮蔽 ASTST 任意流水號 -1。</p>
            </div>
            <div className="space-y-2">
              {filterSettings.excludedQrRules.map((rule) => (
                <div key={rule.id} className="grid gap-2 sm:grid-cols-[auto_1fr_1fr_auto]">
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(event) => updateFilterRule(rule.id, { enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-primary-600"
                    />
                    {rule.label}
                  </label>
                  <input
                    type="text"
                    value={rule.prefix ?? ''}
                    onChange={(event) => updateFilterRule(rule.id, { prefix: event.target.value })}
                    className="input-styled py-2 text-sm"
                    placeholder="前綴，例如 ASTST 或 ASDGB"
                  />
                  <input
                    type="text"
                    value={rule.suffix ?? ''}
                    onChange={(event) => updateFilterRule(rule.id, { suffix: event.target.value })}
                    className="input-styled py-2 text-sm"
                    placeholder="後綴，可留白"
                  />
                  <button type="button" onClick={saveFilterSettings} className="btn-primary w-auto px-4 py-2 text-sm">
                    <Save className="mr-1 inline h-4 w-4" />
                    儲存
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">合法資料白名單</h3>
              <p className="text-xs text-slate-500">白名單會優先保留資料，不受日期區間與測試 QR 遮蔽影響。</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={whitelistQrInput}
                onChange={(event) => setWhitelistQrInput(event.target.value)}
                className="input-styled py-2 text-sm"
                placeholder="輸入行李編號 / QR id"
              />
              <button type="button" onClick={() => addQrToWhitelist(whitelistQrInput)} className="btn-secondary w-auto px-4 py-2 text-sm">
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                加入白名單
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <StaffCards staff={stats.staff} selectedStaff={selectedStaff} onSelect={setSelectedStaff} />
          <StaffDetail staff={selectedStaff} canManageDashboard={canManageDashboard} onWhitelistQr={addRecordToWhitelist} />
        </div>
        <div className="space-y-4">
          <FloorCards floors={selectedBuildingStats?.floors ?? []} selectedFloor={selectedFloorStats?.floor} onSelect={setSelectedFloor} />
          <RoomMap
            floor={selectedFloorStats}
            canManageDashboard={canManageDashboard}
            onToggleEmpty={toggleEmptyBed}
            onManualCheck={(bed) => setManualCheck({ bed, luggagePlaced: true, luggageNumber: bed.record?.qrId ?? '' })}
          />
        </div>
      </div>

      {canManageDashboard && manualCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={submitManualCheck} className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">手動完成檢查</h3>
              <p className="mt-1 text-sm text-slate-500">
                {manualCheck.bed.building} {manualCheck.bed.ownerId}
              </p>
            </div>

            <label className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-bold dark:border-slate-800">
              <input
                type="checkbox"
                checked={manualCheck.luggagePlaced}
                onChange={(event) => setManualCheck({ ...manualCheck, luggagePlaced: event.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-primary-600"
              />
              是否放置行李
            </label>

            <label className="mb-5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              行李編號
              <input
                type="text"
                value={manualCheck.luggageNumber}
                onChange={(event) => setManualCheck({ ...manualCheck, luggageNumber: event.target.value })}
                className="input-styled mt-2"
                placeholder="沒有編號可留白"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setManualCheck(null)} className="btn-secondary w-auto px-4 py-2" disabled={savingManual}>
                取消
              </button>
              <button type="submit" className="btn-primary w-auto px-4 py-2" disabled={savingManual}>
                {savingManual ? '儲存中...' : '確認完成'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
