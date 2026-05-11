import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface RoleGroup {
  id: string;
  name: string;
  permissions: {
    manageUsers: boolean;
    viewAllData: boolean;
    manageSettings: boolean;
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
    id: 'coordinator',
    name: '總幹事',
    permissions: { manageUsers: true, viewAllData: true, manageSettings: false }
  },
  {
    id: 'dorm_head',
    name: '正舍長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false }
  },
  {
    id: 'deputy_dorm_head',
    name: '副舍長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false }
  },
  {
    id: 'floor_head',
    name: '正樓長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false }
  },
  {
    id: 'deputy_floor_head',
    name: '副樓長',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: false }
  },
  {
    id: 'admin',
    name: '管理員',
    permissions: { manageUsers: false, viewAllData: true, manageSettings: true }
  },
  {
    id: 'user',
    name: '一般使用者',
    permissions: { manageUsers: false, viewAllData: false, manageSettings: false }
  }
];

export const defaultFormFields: FormField[] = [
  { id: 'clean', label: '周圍環境清空且乾淨', enabled: true, requiresRemark: false },
  { id: 'trash', label: '垃圾已清理', enabled: true, requiresRemark: false },
  { id: 'key', label: '鑰匙已繳回', enabled: true, requiresRemark: false },
  { id: 'damage', label: '設施設備損壞', enabled: true, requiresRemark: true }
];

export const getRoles = async (): Promise<RoleGroup[]> => {
  try {
    const docRef = doc(db, 'settings', 'roles');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().groups as RoleGroup[];
    }
    try {
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

export const getFormFields = async (building: string = '毅志'): Promise<FormField[]> => {
  try {
    const docRef = doc(db, 'settings', `form_${building}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().fields as FormField[];
    }
    try {
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

export const saveFormFields = async (building: string, fields: FormField[]) => {
  await setDoc(doc(db, 'settings', `form_${building}`), { fields });
};

export interface BuildingConfig {
  totalPeople: number;
  staffCount: number;
}

export const defaultBuildingConfig: BuildingConfig = {
  totalPeople: 704, // e.g. for 毅志
  staffCount: 15
};

export const getBuildingConfig = async (building: string): Promise<BuildingConfig> => {
  try {
    const docRef = doc(db, 'settings', `config_${building}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as BuildingConfig;
    }
    return defaultBuildingConfig;
  } catch (error) {
    console.warn("Error fetching building config", error);
    return defaultBuildingConfig;
  }
};

export const saveBuildingConfig = async (building: string, config: BuildingConfig) => {
  await setDoc(doc(db, 'settings', `config_${building}`), config);
};
