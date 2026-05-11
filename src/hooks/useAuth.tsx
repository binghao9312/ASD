import React, { createContext, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Cleanup previous listener
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser?.email) {
        const userDocRef = doc(db, 'users', firebaseUser.email);
        unsubscribeUserDoc = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            const isMasterAdmin = firebaseUser.email === 'a0938676069@gmail.com';
            const newUserData: UserData = {
              email: firebaseUser.email!,
              role: isMasterAdmin ? 'admin' : 'user',
              roleId: isMasterAdmin ? 'superadmin' : '',
              status: isMasterAdmin ? 'approved' : 'pending'
            };
            await setDoc(userDocRef, newUserData);
            setUserData(newUserData);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user data", error);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
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

  const refreshUserData = async () => {
    // This is mostly handled by onSnapshot now, but keeping for compatibility
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
