import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Database, Check, X, Trash2, Package, Pencil } from 'lucide-react';
import type { LuggageRecord } from '../History';
import { getFormFields, type FormField } from '../../services/settings';

export function AdminLuggages() {
  const [luggages, setLuggages] = useState<LuggageRecord[]>([]);

  const buildingStats = useMemo(() => {
    const stats = {
      '毅志': { total: 704, checkedBeds: new Set() },
      '弘德': { total: 320, checkedBeds: new Set() },
      '慧樓': { total: 240, checkedBeds: new Set() }
    };
    luggages.forEach(l => {
      if (stats[l.building] && l.ownerId) {
        stats[l.building].checkedBeds.add(l.ownerId);
      }
    });
    return stats;
  }, [luggages]);

  const [loading, setLoading] = useState(true);
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPieceCount, setEditPieceCount] = useState<number | ''>('');
  const [formFields, setFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [luggagesSnap, fields] = await Promise.all([
        getDocs(query(collection(db, 'luggages'), orderBy('scannedAt', 'desc'))),
        getFormFields()
      ]);
      const luggagesData = luggagesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as LuggageRecord[];
      setLuggages(luggagesData);
      setFormFields(fields);
    } catch (error) {
      console.error("Error fetching luggages:", error);
    }
    setLoading(false);
  };

  const handleDeleteLuggage = async (id: string) => {
    if (!window.confirm('確定要刪除這筆紀錄嗎？此動作無法復原。')) return;
    try {
      await deleteDoc(doc(db, 'luggages', id));
      setLuggages(luggages.filter(l => l.id !== id));
    } catch (error) {
      alert("刪除失敗");
    }
  };

  const startEdit = (record: LuggageRecord) => {
    setEditingId(record.id);
    setEditPieceCount(record.pieceCount || 3);
  };

  const saveEdit = async (id: string) => {
    if (typeof editPieceCount !== 'number' || editPieceCount < 0 || editPieceCount > 5) {
      alert('行李數量必須是 0~5 件');
      return;
    }
    try {
      await updateDoc(doc(db, 'luggages', id), { pieceCount: editPieceCount });
      setLuggages(luggages.map(l => l.id === id ? { ...l, pieceCount: editPieceCount } : l));
      setEditingId(null);
    } catch (err) {
      alert('更新失敗');
    }
  };

  const filteredLuggages = filterBuilding === 'all' 
    ? luggages 
    : luggages.filter(l => l.building === filterBuilding);

  if (loading) return <div className="text-center py-10 text-slate-500">載入中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5" />
        <h2 className="text-lg font-bold">資料總覽</h2>
      </div>

      <div className="glass-card p-2 flex gap-2">
        {['all', '毅志', '弘德', '慧樓'].map(b => (
          <button
            key={b}
            onClick={() => setFilterBuilding(b)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${filterBuilding === b ? 'bg-primary-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {b === 'all' ? '全部' : b}
          </button>
        ))}
      </div>

      
        {/* === 各棟進度條區塊 === */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {Object.entries(buildingStats).map(([b, stat]) => {
            const percent = Math.min(100, Math.round((stat.checkedBeds.size / stat.total) * 100));
            return (
              <div key={b} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <span>{b}</span>
                  <span className={percent >= 100 ? "text-green-600" : ""}>{stat.checkedBeds.size} / {stat.total}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-primary-500'}`} style={{ width: `${Math.max(3, percent)}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
        {filteredLuggages.length === 0 ? (
          <div className="text-center py-10 text-slate-500">此館別目前沒有紀錄</div>
        ) : (
          filteredLuggages.map(record => (
            <div key={record.id} className="glass-card p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-800 dark:text-slate-100">{record.ownerId}</span>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {record.building}
                  </span>
                </div>
                
                <div className="flex gap-1">
                  {editingId === record.id ? (
                    <>
                      <button onClick={() => saveEdit(record.id!)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(record)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg">
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteLuggage(record.id!)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">{record.qrId}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Package className="w-4 h-4 text-slate-400" />
                  {editingId === record.id ? (
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={editPieceCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditPieceCount(val === '' ? '' : Number(val));
                      }}
                      className="w-12 px-1 py-0.5 border border-primary-300 rounded text-sm text-slate-800 text-center"
                    />
                  ) : (
                    <span>{record.pieceCount || 3} 件行李</span>
                  )}
                </div>

                {record.conditions && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {Object.entries(record.conditions).map(([fieldId, isChecked]) => {
                      if (!isChecked) return null;
                      const field = formFields.find(f => f.id === fieldId);
                      const remark = record.remarks?.[fieldId];
                      return (
                        <span key={fieldId} className="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-md border border-primary-100 dark:border-primary-800">
                          {field?.label || fieldId}
                          {remark && <span className="ml-1 opacity-70">({remark})</span>}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="text-xs text-slate-400 pt-2 flex flex-col gap-1">
                  <span>登記人: {record.checkerName || record.checkerEmail}</span>
                  <span>時間: {record.scannedAt?.toDate?.()?.toLocaleString() || '尚未同步'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
