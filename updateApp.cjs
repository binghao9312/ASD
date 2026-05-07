const fs = require('fs');
const path = require('path');

const files = {
  'src/hooks/useAuth.tsx': `import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export interface UserData {
  email: string;
  name?: string;
  building?: string;
  floor?: string;
  floorRole?: string;
  roleId?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved';
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState<(() => void) | null>(null);

  const setupUserDataListener = (email: string) => {
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }

    const userDocRef = doc(db, 'users', email);

    // First check if user exists
    const unsubscribe = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
          // Auto create new user
          const isMasterAdmin = email === 'a0938676069@gmail.com';
          const newUserData: UserData = {
            email: email,
            role: isMasterAdmin ? 'admin' : 'user',
            roleId: isMasterAdmin ? 'superadmin' : '',
            status: isMasterAdmin ? 'approved' : 'pending'
          };
          await setDoc(userDocRef, newUserData);
          setUserData(newUserData);
        }
      },
      (error) => {
        console.error("Error listening to user data", error);
      }
    );

    setUnsubscribeSnapshot(() => unsubscribe);
  };

  const refreshUserData = async () => {
    if (user?.email) {
      // onSnapshot will automatically update userData
      setupUserDataListener(user.email);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        setupUserDataListener(firebaseUser.email);
      } else {
        setUserData(null);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          setUnsubscribeSnapshot(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, logout, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
`,

  'src/components/Layout.tsx': `import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, ScanLine, Clock, Building, Shield, Sun, Moon } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const { user, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: '???餉?', path: '/scan', icon: ScanLine },
    { name: '甇瑕蝝??, path: '/history', icon: Clock },
  ];

  if (userData?.roleId === 'superadmin' || userData?.roleId === 'admin' || userData?.role === 'admin') {
    navItems.push({ name: '蝞∠?敺', path: '/admin', icon: Shield });
  }

  const headerInfo = userData ? `\${userData.name || '雿輻??} | \${userData.building || '?芾身摰?} \${userData.floor || ''}`.trim() : '';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* 撠汗??*/}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-500 font-bold text-lg">
            <Building className="w-6 h-6" />
            <span>ASD</span>
          </div>
          <div className="flex items-center gap-1">
            {userData && (
              <span className="text-xs text-slate-600 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded">
                {headerInfo}
              </span>
            )}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="??瘛梯璅∪?"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="?餃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ?批捆?憛?*/}
      <main className="flex-1 w-full max-w-md mx-auto p-4 flex flex-col pb-24">
        <Outlet />
      </main>

      {/* 摨撠汗 (??亙?憿舐內) */}
      {user && (
        <nav className="fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-bottom z-50 transition-colors duration-300">
          <div className="max-w-md mx-auto flex justify-around p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center gap-1 w-20 py-2 rounded-xl transition-all",
                    isActive ? "text-primary-600 dark:text-primary-500" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("w-6 h-6 transition-transform", isActive && "scale-110")} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
`,

  'src/pages/SetupProfile.tsx': `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { UserCircle2 } from 'lucide-react';

export function SetupProfile() {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [floorRole, setFloorRole] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user?.email) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.email), { 
        name: name.trim(),
        building: building.trim() || undefined,
        floor: floor.trim() || undefined,
        floorRole: floorRole.trim() || undefined
      });
      await refreshUserData();
      navigate('/scan');
    } catch (error) {
      console.error("Error updating profile", error);
      alert('閮剖?憭望?嚗?蝔??岫');
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
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">甇∟?雿輻 ASD</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            隢??游‵撖急??祈?閮?          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="憪??蝔?
            className="input-styled text-center"
            autoFocus
          />
          <input
            type="text"
            value={building}
            onChange={(e) => setBuilding(e.target.value)}
            placeholder="撱箇? (靘?嚗?敹?敺瑯璅?"
            className="input-styled text-center"
          />
          <input
            type="text"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="璅惜 (?詨‵)"
            className="input-styled text-center"
          />
          <input
            type="text"
            value={floorRole}
            onChange={(e) => setFloorRole(e.target.value)}
            placeholder="?瑕? (靘?嚗??瑯璅嚗憛?"
            className="input-styled text-center"
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? '?脣?銝?..' : '蝣箄??'}
          </button>
        </form>
      </div>
    </div>
  );
}
`,

  'src/pages/Scan.tsx': `import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { QrCode, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import { cn } from '../components/Layout';
import { getFormFields, type FormField } from '../services/settings';

// 撽??摩
const validateRoom = (room: string) => {
  const rules = [
    { name: '瘥?', regex: /^2(0[1-9]|1[0-1])(0[1-9]|1[0-6])-[1-4]$/ },
    { name: '撘噸', regex: /^1[1-8](0[1-9]|10)-[1-4]$/ },
    { name: '?扳?', regex: /^5[1-6](0[1-9]|10)-[1-4]$/ },
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
    
    getFormFields().then(fields => {
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        console.error("?豢???憭望?", err);
        setMessage({ type: 'error', text: '?豢???憭望?嚗?蝣箄?撌脩策鈭??? });
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
      setMessage({ type: 'error', text: '隢???鞎潛? QR Code' });
      return;
    }
    if (!building) {
      setMessage({ type: 'error', text: '?踹??撘?甇?Ⅱ' });
      return;
    }
    if (typeof pieceCount !== 'number' || pieceCount < 1 || pieceCount > 5) {
      setMessage({ type: 'error', text: '銵?隞嗆敹???1 ??5 隞嗡??? });
      return;
    }

    // Validate required remarks
    for (const field of formFields) {
      if (field.enabled && conditions[field.id] && field.requiresRemark) {
        if (!remarks[field.id]?.trim()) {
          setMessage({ type: 'error', text: `隢‵撖怒${field.label}???酉?批捆` });
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
        checkerBuilding: userData?.building || null,
        checkerFloor: userData?.floor || null,
        checkerFloorRole: userData?.floorRole || null,
        conditions,
        remarks,
        scannedAt: serverTimestamp(),
        synced: isOnline
      });
      setMessage({ type: 'success', text: '?餉???嚗? });
      setQrId('');
      setRoomNumber('');
      setBuilding(null);
      setPieceCount(3);
      setConditions({});
      setRemarks({});
    } catch (error) {
      console.error("Error adding luggage record", error);
      setMessage({ type: 'error', text: '?餉?憭望?嚗?蝔??岫' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-10 text-slate-500">隢??餃</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="w-5 h-5" />
        <h2 className="text-lg font-bold">???餉?</h2>
      </div>

      {!isOnline && (
        <div className="glass-card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <span className="text-sm text-yellow-700 dark:text-yellow-300">?Ｙ?璅∪? - 鞈?撠?????甇?/span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-card p-4 space-y-3">
          <div id="qr-reader" className="w-full h-48 rounded-lg overflow-hidden bg-slate-900"></div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={isScanning ? stopScanner : startScanner}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg font-medium transition-colors",
                isScanning 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-primary-500 hover:bg-primary-600 text-white"
              )}
            >
              {isScanning ? '?迫??' : '????'}
            </button>
          </div>
          {qrId && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-600 dark:text-green-400">QR Code 撌脫???/p>
                <p className="text-sm font-mono text-green-700 dark:text-green-300 break-all">{qrId}</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">?踹???/span>
            <input
              type="text"
              required
              value={roomNumber}
              onChange={handleRoomChange}
              placeholder="靘?嚗?01-1"
              className="input-styled"
              disabled={isScanning}
            />
            {building && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">??{building}</p>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">銵?隞嗆</span>
            <input
              type="number"
              required
              min="1"
              max="5"
              value={pieceCount}
              onChange={(e) => {
                const val = e.target.value;
                setPieceCount(val === '' ? '' : Number(val));
              }}
              className="input-styled"
            />
          </label>
        </div>

        {formFields.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h3 className="font-medium text-slate-700 dark:text-slate-300">銵??瘜?/h3>
            {formFields.map((field) => {
              if (!field.enabled) return null;
              return (
                <div key={field.id} className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conditions[field.id] || false}
                      onChange={(e) => setConditions({ ...conditions, [field.id]: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{field.label}</span>
                  </label>
                  {conditions[field.id] && field.requiresRemark && (
                    <input
                      type="text"
                      value={remarks[field.id] || ''}
                      onChange={(e) => setRemarks({ ...remarks, [field.id]: e.target.value })}
                      placeholder="隢撓?亙?閮?
                      className="input-styled text-sm ml-6"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {message && (
          <div className={cn(
            "glass-card p-4 flex items-center gap-2",
            message.type === 'success' 
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          )}>
            {message.type === 'success' ? (
              <CheckCircle2 className={cn("w-5 h-5 flex-shrink-0", message.type === 'success' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")} />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            )}
            <span className={cn("text-sm", message.type === 'success' ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
              {message.text}
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !qrId || !building}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? '?餉?銝?..' : '蝣箄??餉?'}
        </button>
      </form>
    </div>
  );
}
`,

  'src/pages/admin/AdminLuggages.tsx': `import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Database, Check, X, Trash2, Package, Pencil } from 'lucide-react';
import type { LuggageRecord } from '../History';
import { getFormFields, type FormField } from '../../services/settings';

export function AdminLuggages() {
  const [luggages, setLuggages] = useState<LuggageRecord[]>([]);
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
      // Setup real-time listener for luggages
      const luggagesQuery = query(collection(db, 'luggages'), orderBy('scannedAt', 'desc'));
      const unsubscribe = onSnapshot(
        luggagesQuery,
        (snapshot) => {
          const luggagesData = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          })) as LuggageRecord[];
          setLuggages(luggagesData);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching luggages:", error);
          setLoading(false);
        }
      );

      // Also get form fields
      const fields = await getFormFields();
      setFormFields(fields);

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up data listener:", error);
      setLoading(false);
    }
  };

  const handleDeleteLuggage = async (id: string) => {
    if (!window.confirm('蝣箏?閬?日?蝝??嚗迨???⊥?敺拙???)) return;
    try {
      await deleteDoc(doc(db, 'luggages', id));
      setLuggages(luggages.filter(l => l.id !== id));
    } catch (error) {
      alert("?芷憭望?");
    }
  };

  const startEdit = (record: LuggageRecord) => {
    setEditingId(record.id);
    setEditPieceCount(record.pieceCount || 3);
  };

  const saveEdit = async (id: string) => {
    if (typeof editPieceCount !== 'number' || editPieceCount < 1 || editPieceCount > 5) {
      alert('銵??賊?敹???1~5 隞?);
      return;
    }
    try {
      await updateDoc(doc(db, 'luggages', id), { pieceCount: editPieceCount });
      setLuggages(luggages.map(l => l.id === id ? { ...l, pieceCount: editPieceCount } : l));
      setEditingId(null);
    } catch (err) {
      alert('?湔憭望?');
    }
  };

  const filteredLuggages = filterBuilding === 'all' 
    ? luggages 
    : luggages.filter(l => l.building === filterBuilding);

  if (loading) return <div className="text-center py-10 text-slate-500">頛銝?..</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5" />
        <h2 className="text-lg font-bold">鞈?蝮質汗</h2>
      </div>

      <div className="glass-card p-2 flex gap-2">
        {['all', '瘥?', '撘噸', '?扳?'].map(b => (
          <button
            key={b}
            onClick={() => setFilterBuilding(b)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors \${filterBuilding === b ? 'bg-primary-500 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            {b === 'all' ? '?券' : b}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredLuggages.length === 0 ? (
          <div className="text-center py-10 text-slate-500">甇日尹?亦??????/div>
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
                      min="1"
                      max="5"
                      value={editPieceCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditPieceCount(val === '' ? '' : Number(val));
                      }}
                      className="w-12 px-1 py-0.5 border border-primary-300 rounded text-sm text-slate-800 text-center"
                    />
                  ) : (
                    <span>{record.pieceCount || 3} 隞嗉???/span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>瑼Ｘ?∴?{record.checkerName || record.checkerEmail}</div>
                  {record.checkerBuilding && <div>瑼Ｘ?∪遣蝭?{record.checkerBuilding}</div>}
                  {record.checkerFloor && <div>瑼Ｘ?⊥?撅歹?{record.checkerFloor}</div>}
                  {record.checkerFloorRole && <div>瑼Ｘ?∟??{record.checkerFloorRole}</div>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
`
};

const baseDir = 'd:\\luggage-pwa';

Object.entries(files).forEach(([relPath, content]) => {
  const fullPath = path.join(baseDir, relPath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`??Updated: \${relPath}`);
});

console.log('\\nAll files updated successfully!');

