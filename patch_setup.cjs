const fs = require('fs');

const setupProfileContent = `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { UserCircle2 } from 'lucide-react';

export function SetupProfile() {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('毅志');
  const [floor, setFloor] = useState('1');
  const [floorRole, setFloorRole] = useState('一般舍民');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user?.email) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.email), { 
        name: name.trim(), building, floor, floorRole 
      });
      await refreshUserData();
      navigate('/scan');
    } catch (error) {
      alert('設定失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="glass-card max-w-sm w-full p-8 text-center space-y-6 shadow-xl">
        <UserCircle2 className="w-12 h-12 text-primary-600 mx-auto" />
        <h2 className="text-2xl font-bold">歡迎使用 ASD</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">樓層</label>
              <select value={floor} onChange={(e) => setFloor(e.target.value)} className="input-styled mt-1">
                {[...Array(11)].map((_, i) => <option key={i+1} value={i+1}>{i+1} 樓</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">職位</label>
              <select value={floorRole} onChange={(e) => setFloorRole(e.target.value)} className="input-styled mt-1">
                <option value="一般舍民">一般舍民</option>
                <option value="正樓長">正樓長</option>
                <option value="副樓長">副樓長</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={!name.trim() || loading} className="btn-primary mt-4 w-full">
            {loading ? '儲存中...' : '確認送出'}
          </button>
        </form>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/SetupProfile.tsx', setupProfileContent, 'utf8');
console.log("Rewrote SetupProfile.tsx");

