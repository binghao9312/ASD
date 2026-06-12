import React, { useEffect, useRef, useState } from 'react';
import { collection, addDoc, getDocs, query, serverTimestamp, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  MapPin,
  Package,
  QrCode,
  Search,
  UserCheck,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { getBuildingConfig, getDefaultBuildingConfig, getFormFields, type FormField } from '../services/settings';
import type { LuggageRecord } from './History';
import type { Html5Qrcode } from 'html5-qrcode';

type ScanMode = 'register' | 'lookup';
type TimestampLike = { toDate?: () => Date; toMillis?: () => number } | Date | string | number | null | undefined;

const DEFAULT_BUILDING = '毅志';

const validateRoom = (room: string) => {
  const rules = [
    { name: '毅志', regex: /^2(0[1-9]|1[0-1])(0[1-9]|1[0-6])-[1-4]$/ },
    { name: '弘德', regex: /^1[1-8](0[1-9]|10)-[1-4]$/ },
    { name: '慧樓', regex: /^5[1-6](0[1-9]|10)-[1-4]$/ },
  ];

  for (const rule of rules) {
    if (rule.regex.test(room)) return rule.name;
  }
  return null;
};

const getRecordTime = (record: LuggageRecord) => {
  const timestamp = record.scannedAt as TimestampLike;
  if (!timestamp) return 0;
  if (typeof timestamp === 'object' && 'toMillis' in timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime();
  }
  if (timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp).getTime();
  }
  return 0;
};

const formatTime = (timestamp: TimestampLike) => {
  if (!timestamp) return '尚未同步';
  const date =
    typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function'
      ? timestamp.toDate()
      : timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number'
        ? new Date(timestamp)
        : null;
  if (!date) return '尚未同步';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const createEmptyInspectionState = (fields: FormField[]) => {
  const nextConditions: Record<string, boolean> = {};
  const nextRemarks: Record<string, string> = {};
  fields.forEach((field) => {
    nextConditions[field.id] = false;
    nextRemarks[field.id] = '';
  });
  return { nextConditions, nextRemarks };
};

export function Scan() {
  const { user, userData } = useAuth();
  const [mode, setMode] = useState<ScanMode>('register');
  const [qrId, setQrId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [building, setBuilding] = useState<string | null>(null);
  const [pieceCount, setPieceCount] = useState<number | ''>(3);
  const [pieceLimit, setPieceLimit] = useState(getDefaultBuildingConfig(DEFAULT_BUILDING).luggageLimit);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupRecords, setLookupRecords] = useState<LuggageRecord[] | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const resetInspectionFields = (fields: FormField[]) => {
    const { nextConditions, nextRemarks } = createEmptyInspectionState(fields);
    setConditions(nextConditions);
    setRemarks(nextRemarks);
  };

  useEffect(() => {
    getFormFields(DEFAULT_BUILDING).then((fields) => {
      setFormFields(fields);
      resetInspectionFields(fields);
    });
  }, []);

  useEffect(() => {
    if (!building) return;

    Promise.all([getFormFields(building), getBuildingConfig(building)]).then(([fields, config]) => {
      setFormFields(fields);
      setPieceLimit(config.luggageLimit);
      resetInspectionFields(fields);
    });
  }, [building]);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => undefined);
      }
    };
  }, []);

  const lookupByQrId = async (value = qrId) => {
    const normalizedQrId = value.trim();
    if (!normalizedQrId) {
      setMessage({ type: 'error', text: '請先掃描或輸入貼紙 QR Code' });
      return;
    }

    setLookupLoading(true);
    setLookupRecords(null);
    setMessage(null);

    try {
      const snapshot = await getDocs(query(
        collection(db, 'luggages'),
        where('qrId', '==', normalizedQrId),
        limit(20),
      ));
      const records = snapshot.docs
        .map((document) => ({ id: document.id, ...document.data() }) as LuggageRecord)
        .sort((a, b) => getRecordTime(b) - getRecordTime(a));

      setLookupRecords(records);
      if (records.length === 0) {
        setMessage({ type: 'error', text: '查無這張貼紙的登記資料' });
      }
    } catch (error) {
      console.error('Error looking up luggage:', error);
      setMessage({ type: 'error', text: '查詢失敗，請稍後再試' });
    } finally {
      setLookupLoading(false);
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setMessage(null);
    setTimeout(() => {
      void (async () => {
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          const html5QrCode = new Html5Qrcode('qr-reader');
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
            (decodedText) => {
              setQrId(decodedText);
              stopScanner();
              if (mode === 'lookup') {
                lookupByQrId(decodedText);
              }
            },
            () => {
              // Ignore scan errors while the camera is searching for a QR code.
            },
          );
        } catch (err) {
          console.error('Unable to start camera', err);
          setMessage({ type: 'error', text: '相機啟動失敗，請確認已給予權限。' });
          setIsScanning(false);
        }
      })();
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        })
        .catch(console.error);
    }
    setIsScanning(false);
  };

  const handleModeChange = (nextMode: ScanMode) => {
    if (nextMode === mode) return;
    stopScanner();
    setMode(nextMode);
    setMessage(null);
    setLookupRecords(null);
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().toUpperCase();
    const nextBuilding = val ? validateRoom(val) : null;
    setRoomNumber(val);
    setBuilding(nextBuilding);
    if (!nextBuilding) {
      setPieceLimit(getDefaultBuildingConfig(DEFAULT_BUILDING).luggageLimit);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building) {
      setMessage({ type: 'error', text: '請輸入有效的房床號' });
      return;
    }
    if (typeof pieceCount !== 'number' || pieceCount < 0 || pieceCount > pieceLimit) {
      setMessage({ type: 'error', text: `行李件數必須在 0 到 ${pieceLimit} 件之間` });
      return;
    }

    for (const field of formFields) {
      if (field.enabled && conditions[field.id] && field.requiresRemark && !remarks[field.id]?.trim()) {
        setMessage({ type: 'error', text: `請填寫「${field.label}」的備註` });
        return;
      }
    }

    setMessage(null);
    setConfirmOpen(true);
  };

  const submitRegistration = async () => {
    if (!building || typeof pieceCount !== 'number') return;
    setLoading(true);
    setMessage(null);
    setConfirmOpen(false);

    try {
      await addDoc(collection(db, 'luggages'), {
        qrId: qrId.trim(),
        ownerId: roomNumber,
        building,
        pieceCount,
        checkerEmail: user?.email,
        checkerName: userData?.name || null,
        conditions,
        remarks,
        scannedAt: serverTimestamp(),
      });

      setMessage({ type: 'success', text: '行李登記完成' });
      setQrId('');
      setRoomNumber('');
      setBuilding(null);
      setPieceCount(3);
      setPieceLimit(getDefaultBuildingConfig(DEFAULT_BUILDING).luggageLimit);
      resetInspectionFields(formFields);
    } catch (error) {
      console.error('Error adding luggage:', error);
      setMessage({ type: 'error', text: '登記失敗，請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  const latestLookupRecord = lookupRecords?.[0];
  const selectedInspectionItems = formFields
    .filter((field) => field.enabled && conditions[field.id])
    .map((field) => ({
      label: field.label,
      remark: remarks[field.id]?.trim(),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {mode === 'register' ? '登記行李' : '查詢行李'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {mode === 'register' ? '掃描貼紙並綁定房床號' : '掃描貼紙查看已登記資料'}
          </p>
        </div>
      </div>

      <div className="glass-card grid grid-cols-2 gap-2 p-2">
        <button
          type="button"
          onClick={() => handleModeChange('register')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            mode === 'register'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          <ClipboardList className="h-4 w-4" />
          登記模式
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('lookup')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
            mode === 'lookup'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          )}
        >
          <Search className="h-4 w-4" />
          查詢模式
        </button>
      </div>

      {message && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl p-4 text-sm font-medium',
            message.type === 'success'
              ? 'border border-green-200 bg-green-50 text-green-700'
              : 'border border-red-200 bg-red-50 text-red-700',
          )}
        >
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      <div className="glass-card p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && formFields.some((field) => field.enabled) && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">檢查項目</label>
              <div className="flex flex-col gap-3">
                {formFields
                  .filter((field) => field.enabled)
                  .map((field) => (
                    <div key={field.id} className="flex flex-col gap-2">
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={conditions[field.id] || false}
                          onChange={(e) => setConditions({ ...conditions, [field.id]: e.target.checked })}
                          className="h-5 w-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{field.label}</span>
                      </label>
                      {conditions[field.id] && field.requiresRemark && (
                        <div className="pl-10">
                          <input
                            type="text"
                            required
                            value={remarks[field.id] || ''}
                            onChange={(e) => setRemarks({ ...remarks, [field.id]: e.target.value })}
                            placeholder="請輸入備註"
                            className="input-styled py-2 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {!isScanning ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">QR Code ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrId}
                    onChange={(e) => {
                      setQrId(e.target.value);
                      if (mode === 'lookup') setLookupRecords(null);
                    }}
                    placeholder="請掃描或輸入貼紙編號"
                    className="input-styled flex-1"
                  />
                  <button
                    type="button"
                    onClick={startScanner}
                    className="shrink-0 rounded-xl bg-slate-100 p-3 text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    aria-label="掃描 QR Code"
                  >
                    <QrCode className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700" />
              <button type="button" onClick={stopScanner} className="btn-secondary">
                取消掃描
              </button>
            </div>
          )}

          {mode === 'lookup' ? (
            <button
              type="button"
              onClick={() => lookupByQrId()}
              disabled={!qrId.trim() || lookupLoading}
              className="btn-primary disabled:opacity-50 disabled:active:scale-100"
            >
              {lookupLoading ? '查詢中...' : '查詢行李資料'}
            </button>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">房床號</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={handleRoomChange}
                  placeholder="例如：20502-3"
                  className="input-styled uppercase"
                />
                <div className="h-5">
                  {roomNumber &&
                    (building ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3 w-3" /> 已辨識棧別：{building}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertCircle className="h-3 w-3" /> 房床號格式不符合已知棧別
                      </span>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">行李件數</label>
                <input
                  type="number"
                  min="0"
                  max={pieceLimit}
                  value={pieceCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPieceCount(val === '' ? '' : Number(val));
                  }}
                  className="input-styled"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {building ? `${building} 上限 ${pieceLimit} 件，可填 0 件` : '請先輸入房床號以套用棟別上限'}
                </p>
              </div>

              <button
                type="submit"
                disabled={!building || loading}
                className="btn-primary disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? '登記中...' : '送出登記'}
              </button>
            </>
          )}
        </form>
      </div>

      {mode === 'lookup' && latestLookupRecord && (
        <div className="glass-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">最新登記資料</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">{latestLookupRecord.qrId}</div>
            </div>
            <span className="rounded-md border border-primary-100 bg-primary-50 px-2 py-1 text-xs font-bold text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
              {latestLookupRecord.building || '未辨識'}
            </span>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>房床號</span>
              <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">{latestLookupRecord.ownerId || '未填寫'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-400" />
              <span>行李件數</span>
              <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">
                {latestLookupRecord.pieceCount ?? 3} 件
              </span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-400" />
              <span>檢查者</span>
              <span className="ml-auto text-right font-semibold text-slate-900 dark:text-slate-100">
                {latestLookupRecord.checkerName || latestLookupRecord.checkerEmail || '未記錄'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>登記時間</span>
              <span className="ml-auto font-semibold text-slate-900 dark:text-slate-100">
                {formatTime(latestLookupRecord.scannedAt as TimestampLike)}
              </span>
            </div>
          </div>

          {latestLookupRecord.conditions && Object.values(latestLookupRecord.conditions).some(Boolean) && (
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">檢查註記</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(latestLookupRecord.conditions).map(([fieldId, isChecked]) => {
                  if (!isChecked) return null;
                  const field = formFields.find((item) => item.id === fieldId);
                  const remark = latestLookupRecord.remarks?.[fieldId];
                  return (
                    <span
                      key={fieldId}
                      className="rounded-md border border-primary-200/50 bg-primary-100/50 px-2 py-1 text-xs text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                    >
                      {field?.label || fieldId}
                      {remark && <span className="ml-1 opacity-70">({remark})</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {lookupRecords && lookupRecords.length > 1 && (
            <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              這張貼紙共有 {lookupRecords.length} 筆登記紀錄，畫面顯示最新一筆。
            </div>
          )}
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">DOUBLE CHECK</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">請確認這筆登記資料。</p>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950">
              {[
                ['QR Code', qrId.trim() || '未輸入'],
                ['房床號', roomNumber],
                ['棟別', building || '未辨識'],
                ['行李件數', `${pieceCount || 0} 件`],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[5rem_1fr] gap-3">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                <div className="grid grid-cols-[5rem_1fr] gap-3">
                  <span className="text-slate-500 dark:text-slate-400">檢查項目</span>
                  <div className="space-y-1 font-semibold text-slate-900 dark:text-slate-100">
                    {selectedInspectionItems.length > 0 ? (
                      selectedInspectionItems.map((item) => (
                        <div key={item.label}>
                          {item.label}
                          {item.remark && (
                            <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
                              ({item.remark})
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span>無</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={loading} className="btn-secondary w-auto px-4 py-2">
                取消
              </button>
              <button type="button" onClick={submitRegistration} disabled={loading} className="btn-primary w-auto px-4 py-2">
                {loading ? '送出中...' : '確認送出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
