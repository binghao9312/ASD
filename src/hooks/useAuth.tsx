import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

export interface UserData {
  email: string;
  name?: string;
  building?: string;
  floor?: string;
  floorRole?: string;
  roleId?: string; // Links to settings/roles
  role: 'admin' | 'user'; // System fallback
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

  const fetchUserData = async (email: string) => {
    try {
      const userDocRef = doc(db, 'users', email);
      const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data() as UserData);
        } else {
        // 自動建立新使用者
        const isMasterAdmin = email === 'a0938676069@gmail.com';
        const newUserData: UserData = {
          email: email,
          role: isMasterAdmin ? 'admin' : 'user',
          roleId: isMasterAdmin ? 'superadmin' : '',
          status: isMasterAdmin ? 'approved' : 'pending'
        };
        setDoc(userDocRef, newUserData);
        }
      });
    } catch (error) {
      console.error("Error fetching user data", error);
    }
  };

  const refreshUserData = async () => {
    if (user?.email) {
      await fetchUserData(user.email);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        await fetchUserData(firebaseUser.email);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
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
