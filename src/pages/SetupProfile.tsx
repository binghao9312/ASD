import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc, collection, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { UserCircle2 } from 'lucide-react';

const FLOOR_ROLES = ['總幹事', '舍長', '副舍長', '樓長', '副樓長'];

interface BuildingSettings {
  [key: string]: {
    floors: number;
  };
}

export function SetupProfile() {
  const { user, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(userData?.name || '');
  const [building, setBuilding] = useState(userData?.building || '毅志');
  const [floor, setFloor] = useState(userData?.floor || '1');
  const [floorRole, setFloorRole] = useState(userData?.floorRole || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [takenRoles, setTakenRoles] = useState<Set<string>>(new Set());
  const [buildingSettings, setBuildingSettings] = useState<BuildingSettings>({
    '毅志': { floors: 11 },
    '弘德': { floors: 11 },
    '慧樓': { floors: 11 },
  });

  useEffect(() => {
    if (userData) {
      if (userData.name) setName(userData.name);
      if (userData.building) setBuilding(userData.building);
      if (userData.floor) setFloor(userData.floor);
      if (userData.floorRole) setFloorRole(userData.floorRole);
    }
  }, [userData]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadTakenRoles = async () => {
      try {
        unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
          const roles = new Set<string>();
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            // 排除當前用戶的職位
            if (data.email !== user?.email && data.floorRole && data.building === building && data.floor === floor) {
              roles.add(data.floorRole);
            }
          });
          setTakenRoles(roles);
        });
      } catch (error) {
        console.error("Error loading taken roles:", error);
      }
    };

    loadTakenRoles();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.email, building, floor]);

  useEffect(() => {
    const loadBuildingSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'buildings'));
        if (settingsDoc.exists()) {
          setBuildingSettings(settingsDoc.data() as BuildingSettings);
        } else {
          // 初始化默認設置
          await setDoc(doc(db, 'settings', 'buildings'), buildingSettings);
        }
      } catch (error) {
        console.error("Error loading building settings:", error);
      }
    };

    loadBuildingSettings();
  }, []);

  const isAdmin = userData?.roleId === 'superadmin' || userData?.roleId === 'admin' || userData?.role === 'admin';

  const availableRoles = FLOOR_ROLES.filter(role => {
    // 總幹事只有 admin 可以選
    if (role === '總幹事') {
      return isAdmin;
    }
    // 舍長、副舍長只有 admin 可以選
    if (role === '舍長' || role === '副舍長') {
      return isAdmin;
    }
    // 樓長、副樓長所有人都可以選
    // 其他職位如果已經被選過就不能選（除非是當前用戶自己的職位）
    if (takenRoles.has(role) && role !== userData?.floorRole) {
      return false;
    }
    return true;
  });

  const currentBuildingFloors = buildingSettings[building]?.floors || 11;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user?.email) return;
    setLoading(true);
    setSuccess(false);
    try {
      // 舍長、副舍長不需要樓層
      const updateData: any = {
        name: name.trim(),
        building,
        floorRole
      };

      if (floorRole !== '舍長' && floorRole !== '副舍長') {
        updateData.floor = floor;
      } else {
        updateData.floor = '';
      }

      await updateDoc(doc(db, 'users', user.email), updateData);
      await refreshUserData();
      setSuccess(true);
      setTimeout(() => {
        if (!userData?.name) {
          navigate('/scan');
        }
      }, 1500);
    } catch (error) {
      alert('設定失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const showFloorSelect = floorRole !== '舍長' && floorRole !== '副舍長';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="glass-card max-w-sm w-full p-8 text-center space-y-6 shadow-xl">
        <UserCircle2 className="w-12 h-12 text-primary-600 mx-auto" />
        <h2 className="text-2xl font-bold">{userData?.name ? '編輯個人檔案' : '歡迎使用 ASD'}</h2>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-sm">
            更新成功！
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-slate-500">姓名</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="真實姓名..." className="input-styled mt-1" autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">住宿棟別</label>
            <select value={building} onChange={(e) => setBuilding(e.target.value)} className="input-styled mt-1">
              <option value="毅志">毅志</option>
              <option value="弘德">弘德</option>
              <option value="慧樓">慧樓</option>
            </select>
          </div>
          {showFloorSelect && (
            <div>
              <label className="text-xs font-semibold text-slate-500">樓層</label>
              <select value={floor} onChange={(e) => setFloor(e.target.value)} className="input-styled mt-1">
                {[...Array(currentBuildingFloors)].map((_, i) => <option key={i+1} value={i+1}>{i+1} 樓</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500">職位</label>
            <select value={floorRole} onChange={(e) => setFloorRole(e.target.value)} className="input-styled mt-1">
              <option value="">請選擇職位</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={!name.trim() || loading} className="btn-primary mt-4 w-full">
            {loading ? '儲存中...' : (userData?.name ? '儲存變更' : '確認送出')}
          </button>
        </form>
      </div>
    </div>
  );
}
