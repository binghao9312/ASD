import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { UserCircle2 } from 'lucide-react';

export function SetupProfile() {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user?.email) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.email), { name: name.trim() });
      await refreshUserData();
      navigate('/scan');
    } catch (error) {
      console.error("Error updating profile", error);
      alert('設定失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="glass-card max-w-sm w-full p-8 text-center space-y-6 shadow-xl">
        <div className="flex justify-center">
          <div className="bg-primary-100 dark:bg-primary-900/50 p-4 rounded-full text-primary-600 dark:text-primary-400">
            <UserCircle2 className="w-12 h-12" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">歡迎使用 ASD</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            這是您第一次登入，為了讓管理員能夠辨識您，請輸入您的真實姓名或暱稱。
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：王大明"
            className="input-styled text-center"
            autoFocus
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? '儲存中...' : '確認送出'}
          </button>
        </form>
      </div>
    </div>
  );
}
