import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface RoleGroup {
  id: string;
  name: string;
  permissions: {
    manageUsers: boolean; // 核准/管理人員
    viewAllData: boolean; // 查看全館資料
    manageSettings: boolean; // 系統設定(表單設定、身分組)
  };
}

export interface FormField {
  id: string;
  label: string;
  enabled: boolean;
  requiresRemark: boolean;
}

export const defaultRoles: RoleGroup[] = [
  {
    id: 'superadmin',
    name: '超級管理員',
    permissions: { manageUsers: true, viewAllData: true, manageSettings: true }
  },
  {
    id: 'admin',
    name: '一般管理員',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: true }
  },
  {
    id: 'user',
    name: '一般人員',
    permissions: { manageUsers: false, viewAllData: false, manageSettings: false }
  }
];

export const defaultFormFields: FormField[] = [
  { id: 'clean', label: '座位是否已乾淨', enabled: true, requiresRemark: false },
  { id: 'trash', label: '垃圾清空', enabled: true, requiresRemark: false },
  { id: 'key', label: '房間鑰匙', enabled: true, requiresRemark: false },
  { id: 'damage', label: '有無損毀', enabled: true, requiresRemark: true }
];

export const getRoles = async (): Promise<RoleGroup[]> => {
  try {
    const docRef = doc(db, 'settings', 'roles');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().groups as RoleGroup[];
    }
    try {
      // Initialize if not exists
      await setDoc(docRef, { groups: defaultRoles });
    } catch (e) {
      console.warn("Failed to write default roles", e);
    }
    return defaultRoles;
  } catch (error) {
    console.warn("Error fetching roles", error);
    return defaultRoles;
  }
};

export const saveRoles = async (groups: RoleGroup[]) => {
  await setDoc(doc(db, 'settings', 'roles'), { groups });
};

export const getFormFields = async (): Promise<FormField[]> => {
  try {
    const docRef = doc(db, 'settings', 'form');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().fields as FormField[];
    }
    try {
      // Initialize if not exists
      await setDoc(docRef, { fields: defaultFormFields });
    } catch (e) {
      console.warn("Failed to write default form fields", e);
    }
    return defaultFormFields;
  } catch (error) {
    console.warn("Error fetching form fields", error);
    return defaultFormFields;
  }
};

export const saveFormFields = async (fields: FormField[]) => {
  await setDoc(doc(db, 'settings', 'form'), { fields });
};
