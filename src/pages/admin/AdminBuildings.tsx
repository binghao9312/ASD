import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Building, Save } from 'lucide-react';
import { buildings, getBuildingConfig, saveBuildingConfig } from '../../services/settings';

interface BuildingSettings {
  [key: string]: {
    floors: number;
    luggageLimit: number;
  };
}

export function AdminBuildings() {
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings>({
    '毅志': { floors: 11, luggageLimit: 5 },
    '弘德': { floors: 11, luggageLimit: 5 },
    '慧樓': { floors: 11, luggageLimit: 6 },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadBuildingSettings = async () => {
      try {
        const [settingsDoc, ...configs] = await Promise.all([
          getDoc(doc(db, 'settings', 'buildings')),
          ...buildings.map((building) => getBuildingConfig(building)),
        ]);
        if (settingsDoc.exists()) {
          setBuildingSettings((prev) => {
            const saved = settingsDoc.data() as Partial<BuildingSettings>;
            const next = { ...prev };
            Object.entries(saved).forEach(([building, settings]) => {
              next[building] = {
                floors: settings?.floors ?? prev[building]?.floors ?? 11,
                luggageLimit: settings?.luggageLimit ?? prev[building]?.luggageLimit ?? 5,
              };
            });
            return next;
          });
        }
        setBuildingSettings((prev) => {
          const next = { ...prev };
          buildings.forEach((building, index) => {
            next[building] = {
              ...next[building],
              luggageLimit: configs[index].luggageLimit,
            };
          });
          return next;
        });
      } catch (error) {
        console.error("Error loading building settings:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBuildingSettings();
  }, []);

  const updateBuildingSetting = (building: string, updates: Partial<BuildingSettings[string]>) => {
    setBuildingSettings(prev => ({
      ...prev,
      [building]: { ...prev[building], ...updates }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await setDoc(doc(db, 'settings', 'buildings'), buildingSettings);
      await Promise.all(
        buildings.map(async (building) => {
          const config = await getBuildingConfig(building);
          await saveBuildingConfig(building, {
            ...config,
            luggageLimit: buildingSettings[building]?.luggageLimit ?? config.luggageLimit,
          });
        }),
      );
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
              <label className="text-xs font-semibold text-slate-500">樓層數</label>
              <input
                type="number"
                min="1"
                max="20"
                value={settings.floors}
                onChange={(e) => updateBuildingSetting(building, { floors: parseInt(e.target.value) || 1 })}
                className="input-styled mt-1 w-full"
              />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">行李上限</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={settings.luggageLimit}
                  onChange={(e) => updateBuildingSetting(building, { luggageLimit: parseInt(e.target.value) || 0 })}
                  className="input-styled mt-1 w-full"
                />
              </div>
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
