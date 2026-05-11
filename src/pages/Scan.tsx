import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { QrCode, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { cn } from '../components/Layout';
import { getFormFields, type FormField } from '../services/settings';

// 驗證邏輯
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

export function Scan() {
  const { user, userData } = useAuth();
  const [qrId, setQrId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [building, setBuilding] = useState<string | null>(null);
  const [pieceCount, setPieceCount] = useState<number | ''>(3);
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // 預先加載默認棧別的檢查項目
    getFormFields('毅志').then(fields => {
      setFormFields(fields);
      const initCond: Record<string, boolean> = {};
      const initRem: Record<string, string> = {};
      fields.forEach(f => {
        initCond[f.id] = false;
        initRem[f.id] = '';
      });
      setConditions(initCond);
      setRemarks(initRem);
    });
  }, []);

  useEffect(() => {
    // 當棧別改變時，更新檢查項目
    if (building) {
      getFormFields(building).then(fields => {
        setFormFields(fields);
        const initCond: Record<string, boolean> = {};
        const initRem: Record<string, string> = {};
        fields.forEach(f => {
          initCond[f.id] = false;
          initRem[f.id] = '';
        });
        setConditions(initCond);
        setRemarks(initRem);
      });
    }
  }, [building]);

  const startScanner = () => {
    setIsScanning(true);
    setMessage(null);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          setQrId(decodedText);
          stopScanner();
        },
        () => {
          // ignore scan errors
        }
      ).catch((err) => {
        console.error("相機啟動失敗", err);
        setMessage({ type: 'error', text: '相機啟動失敗，請確認已給予權限。' });
        setIsScanning(false);
      });
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
      }).catch(console.error);
    }
    setIsScanning(false);
  };

  const handleRoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setRoomNumber(val);
    if (val.length > 0) {
      setBuilding(validateRoom(val));
    } else {
      setBuilding(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrId) {
      setMessage({ type: 'error', text: '請先掃描貼紙 QR Code' });
      return;
    }
    if (!building) {
      setMessage({ type: 'error', text: '房床號格式不正確' });
      return;
    }
    if (typeof pieceCount !== 'number' || pieceCount < 0 || pieceCount > 5) {
      setMessage({ type: 'error', text: '行李件數必須在 0 到 5 件之間' });
      return;
    }

    // Validate required remarks
    for (const field of formFields) {
      if (field.enabled && conditions[field.id] && field.requiresRemark) {
        if (!remarks[field.id]?.trim()) {
          setMessage({ type: 'error', text: `請填寫「${field.label}」的備註內容` });
          return;
        }
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      await addDoc(collection(db, 'luggages'), {
        qrId,
        ownerId: roomNumber,
        building,
        pieceCount,
        checkerEmail: user?.email,
        checkerName: userData?.name || null,
        conditions,
        remarks,
        scannedAt: serverTimestamp(),
        synced: isOnline
      });
      setMessage({ type: 'success', text: '登記成功！' });
      setQrId('');
      setRoomNumber('');
      setBuilding(null);
      setPieceCount(3);
      
      const resetCond = { ...conditions };
      const resetRem = { ...remarks };
      Object.keys(resetCond).forEach(k => resetCond[k] = false);
      Object.keys(resetRem).forEach(k => resetRem[k] = '');
      setConditions(resetCond);
      setRemarks(resetRem);
    } catch (error) {
      console.error("Error adding document: ", error);
      setMessage({ type: 'error', text: '登記失敗，請稍後再試。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">登記行李</h2>
        {!isOnline && (
          <div className="flex items-center gap-1 text-xs font-medium bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
            <WifiOff className="w-3 h-3" />
            <span>離線模式</span>
          </div>
        )}
      </div>

      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
          message.type === 'success' ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="glass-card p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formFields.some(f => f.enabled) && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">檢查項目</label>
              <div className="flex flex-col gap-3">
                {formFields.filter(f => f.enabled).map(field => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={conditions[field.id] || false}
                        onChange={(e) => setConditions({ ...conditions, [field.id]: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
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
                          placeholder="請輸入備註內容 (必填)"
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
                <label className="text-sm font-semibold text-slate-700">QR Code ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={qrId}
                    onChange={(e) => setQrId(e.target.value)}
                    placeholder="請掃描或輸入貼紙編號"
                    className="input-styled flex-1"
                  />
                  <button
                    type="button"
                    onClick={startScanner}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl transition-colors shrink-0"
                  >
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full overflow-hidden rounded-xl border border-slate-200" />
              <button
                onClick={stopScanner}
                className="btn-secondary"
              >
                取消掃描
              </button>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">房床號</label>
            <input
              type="text"
              value={roomNumber}
              onChange={handleRoomChange}
              placeholder="例如: 20502-3"
              className="input-styled uppercase"
            />
            <div className="h-5">
              {roomNumber && (
                building ? (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> 已辨識：{building}
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 格式不符合任何建築物
                  </span>
                )
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">總共幾件 (最多5件)</label>
            <input
              type="number"
              min="0"
              max="5"
              value={pieceCount}
              onChange={(e) => {
                const val = e.target.value;
                setPieceCount(val === '' ? '' : Number(val));
              }}
              className="input-styled"
            />
          </div>

          <button
            type="submit"
            disabled={!qrId || !building || loading}
            className="btn-primary disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? '儲存中...' : '確認登記'}
          </button>
        </form>
      </div>
    </div>
  );
}
