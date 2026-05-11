import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Database, Check, X, Trash2, Package, Pencil } from 'lucide-react';
import type { LuggageRecord } from '../History';
import { getFormFields, type FormField, getBuildingConfig, saveBuildingConfig, type BuildingConfig } from '../../services/settings';

export function AdminLuggages({ isSuper }: { isSuper?: boolean }) {
  const [luggages, setLuggages] = useState<LuggageRecord[]>([]);
  const [configs, setConfigs] = useState<Record<string, BuildingConfig>>({
    '毅志': { totalPeople: 704, staffCount: 15 },
    '弘德': { totalPeople: 320, staffCount: 10 },
    '慧樓': { totalPeople: 240, staffCount: 8 }
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);

  const buildingStats = useMemo(() => {
    const stats: Record<string, { total: number; checkedBeds: Set<unknown>; target: number }> = {};
    for (const b of ['毅志', '弘德', '慧樓']) {
      const conf = configs[b];
      // target is total - staff
      stats[b] = { total: conf.totalPeople, target: conf.totalPeople - conf.staffCount, checkedBeds: new Set() };
    }

    luggages.forEach(l => {
      if (stats[l.building] && l.ownerId) {
        stats[l.building].checkedBeds.add(l.ownerId);
      }
    });
    return stats;
  }, [luggages, configs]);


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
      const [
        luggagesSnap, 
        fields1, fields2, fields3,
        conf1, conf2, conf3
      ] = await Promise.all([
        getDocs(query(collection(db, 'luggages'), orderBy('scannedAt', 'desc'))),
        getFormFields('毅志'),
        getFormFields('弘德'),
        getFormFields('慧樓'),
        getBuildingConfig('毅志'),
        getBuildingConfig('弘德'),
        getBuildingConfig('慧樓')
      ]);
      const allFields = [...fields1, ...fields2, ...fields3];
      const uniqueFields = Array.from(new Map(allFields.map(f => [f.id, f])).values());
      const luggagesData = luggagesSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as LuggageRecord[];
      setLuggages(luggagesData);
      setFormFields(uniqueFields);
      setConfigs({
        '毅志': conf1,
        '弘德': conf2,
        '慧樓': conf3
      });
    } catch (error) {
      console.error("Error fetching luggages:", error);
    }
    setLoading(false);
  };

  const handleDeleteLuggage = async (id: string) => {
    if (!window.confirm('確定要刪除這筆資料嗎？此操作不可恢復。')) return;
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
      alert('行李件數必須在 0 到 5 之間');
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
        <h2 className="text-lg font-bold">資料管理</h2>
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

      
        {/* === 進度 === */}
        <div className="relative mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">檢查進度</h3>
            {isSuper && (
              <button 
                onClick={() => setIsEditingConfig(!isEditingConfig)}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" /> 設定人數
              </button>
            )}
          </div>
          
          {isEditingConfig && isSuper && (
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['毅志', '弘德', '慧樓'].map(b => (
                <div key={'edit-' + b} className="space-y-2">
                  <div className="font-bold text-sm">{b}</div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs w-16">設定人數</label>
                    <input 
                      type="number" 
                      value={configs[b]?.totalPeople || 0}
                      onChange={(e) => setConfigs({ ...configs, [b]: { ...configs[b], totalPeople: Number(e.target.value) }})}
                      className="input-styled py-1 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs w-16">幹部數量</label>
                    <input 
                      type="number" 
                      value={configs[b]?.staffCount || 0}
                      onChange={(e) => setConfigs({ ...configs, [b]: { ...configs[b], staffCount: Number(e.target.value) }})}
                      className="input-styled py-1 text-xs"
                    />
                  </div>
                  <button 
                    onClick={() => {
                        saveBuildingConfig(b, configs[b]);
                        alert(b + ' 設定已儲存');
                    }}
                    className="btn-primary py-1 px-2 w-full text-xs"
                  >
                    儲存 {b} 設定
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {Object.entries(buildingStats).map(([b, stat]) => {
              const totalTarget = stat.target;
              const percent = totalTarget > 0 ? Math.min(100, Math.round((stat.checkedBeds.size / totalTarget) * 100)) : 0;
              return (
                <div key={b} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    <span>{b}</span>
                    <span className={percent >= 100 ? "text-green-600" : ""}>{stat.checkedBeds.size} / {totalTarget}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div className={"h-full rounded-full transition-all duration-500 " + (percent === 100 ? 'bg-green-500' : 'bg-primary-500')} style={{ width: Math.max(3, percent) + '%' }} />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                    <span>總人數: {stat.total}</span>
                    <span>幹部: {stat.total - totalTarget}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
        {filteredLuggages.length === 0 ? (
          <div className="text-center py-10 text-slate-500">目前尚無紀錄</div>
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
                    <span>{record.pieceCount || 3} 件</span>
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
                  <span>檢查人: {record.checkerName || record.checkerEmail}</span>
                  <span>時間: {record.scannedAt?.toDate?.()?.toLocaleString() || '未掃描'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

