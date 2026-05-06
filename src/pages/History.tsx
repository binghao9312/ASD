import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, MapPin, Clock, Trash2, Pencil, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export interface LuggageRecord {
  id: string;
  qrId: string;
  ownerId: string;
  building: string;
  checkerEmail: string;
  checkerName?: string | null;
  conditions?: Record<string, boolean>;
  remarks?: Record<string, string>;
  scannedAt: any;
  pieceCount?: number;
  synced: boolean;
}

import { getFormFields, type FormField } from '../services/settings';

export function History() {
  const { userData } = useAuth();
  const [records, setRecords] = useState<LuggageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPieceCount, setEditPieceCount] = useState<number | ''>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    getFormFields().then(setFormFields);
  }, []);

  useEffect(() => {
    if (!userData) return;

    let q;
    if (userData.role === 'admin') {
      q = query(
        collection(db, 'luggages'),
        orderBy('scannedAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'luggages'),
        where('checkerEmail', '==', userData.email),
        orderBy('scannedAt', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as LuggageRecord[];
      setRecords(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching history: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除這筆紀錄嗎？此動作無法復原。')) return;
    try {
      await deleteDoc(doc(db, 'luggages', id));
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("刪除失敗");
    }
  };

  const startEdit = (record: LuggageRecord) => {
    setEditingId(record.id);
    setEditPieceCount(record.pieceCount || 3);
  };

  const saveEdit = async (id: string) => {
    if (typeof editPieceCount !== 'number' || editPieceCount < 1 || editPieceCount > 5) {
      alert('行李數量必須是 1~5 件');
      return;
    }
    try {
      await updateDoc(doc(db, 'luggages', id), { pieceCount: editPieceCount });
      setEditingId(null);
    } catch (err) {
      console.error(err);
      alert('更新失敗');
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '尚未同步';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('zh-TW', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-800">最近掃描紀錄</h2>
      
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-slate-500 glass-card">
          <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>目前尚無紀錄</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="glass-card p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-bold text-slate-800 text-lg">{record.qrId}</span>
                  <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(record.scannedAt)}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="bg-primary-50 text-primary-700 text-xs font-bold px-2 py-1 rounded-md border border-primary-100">
                    {record.building}
                  </div>
                  
                  {/* Action Buttons (Allowed for Admin or Owner) */}
                  {(userData?.role === 'admin' || record.checkerEmail === userData?.email) && (
                    <div className="flex gap-1">
                      {editingId === record.id ? (
                        <>
                          <button onClick={() => saveEdit(record.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                            <Check className="w-5 h-5" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 text-xs text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-700">
                  登記人: <span className="font-medium text-slate-700 dark:text-slate-300">{record.checkerName || record.checkerEmail}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    房床號: <span className="font-semibold text-slate-800 dark:text-slate-100 ml-1">{record.ownerId}</span>
                  </div>
                  <div className="flex items-center gap-1 border-l pl-4 border-slate-200 dark:border-slate-700">
                    <Package className="w-4 h-4 text-slate-400" />
                    行李: 
                    {editingId === record.id ? (
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editPieceCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditPieceCount(val === '' ? '' : Number(val));
                        }}
                        className="w-12 ml-1 px-1 py-0.5 border border-primary-300 rounded text-sm text-slate-800 text-center"
                      />
                    ) : (
                      <span className="font-semibold text-slate-800 dark:text-slate-100 ml-1">{record.pieceCount || 3} 件</span>
                    )}
                  </div>
                </div>

                {record.conditions && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    {Object.entries(record.conditions).map(([fieldId, isChecked]) => {
                      if (!isChecked) return null;
                      const field = formFields.find(f => f.id === fieldId);
                      const remark = record.remarks?.[fieldId];
                      return (
                        <span key={fieldId} className="text-xs bg-primary-100/50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-md border border-primary-200/50 dark:border-primary-800">
                          {field?.label || fieldId}
                          {remark && <span className="ml-1 opacity-70">({remark})</span>}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
