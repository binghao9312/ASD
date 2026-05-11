import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Building, Save } from 'lucide-react';

interface BuildingSettings {
  [key: string]: {
    floors: number;
  };
}

export function AdminBuildings() {
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings>({
    '毅志': { floors: 11 },
    '弘德': { floors: 11 },
    '慧樓': { floors: 11 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadBuildingSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'buildings'));
        if (settingsDoc.exists()) {
          setBuildingSettings(settingsDoc.data() as BuildingSettings);
        }
      } catch (error) {
        console.error("Error loading building settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBuildingSettings();
  }, []);

  const handleFloorChange = (building: string, floors: number) => {
    setBuildingSettings(prev => ({
      ...prev,
      [building]: { floors }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, 'settings', 'buildings'), buildingSettings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      alert('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-500">載入中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Building className="w-5 h-5" />
        <h2 className="text-lg font-bold">棟別樓層設定</h2>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-sm">
          儲存成功！
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(buildingSettings).map(([building, settings]) => (
          <div key={building} className="glass-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{building}</h3>
              <span className="text-sm text-slate-500">目前樓層數: {settings.floors}</span>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">樓層數</label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.floors}
                onChange={(e) => handleFloorChange(building, parseInt(e.target.value) || 1)}
                className="input-styled mt-1 w-full"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full flex justify-center items-center gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? '儲存中...' : '儲存設定'}
      </button>
    </div>
  );
}
