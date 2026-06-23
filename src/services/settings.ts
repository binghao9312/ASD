import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { defaultRoles, mergeRoleGroups, type RoleGroup } from './roleDefaults.ts';
export { defaultRoles, type RoleGroup } from './roleDefaults.ts';

export interface FormField {
  id: string;
  label: string;
  enabled: boolean;
  requiresRemark: boolean;
}

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
      return mergeRoleGroups(docSnap.data().groups as RoleGroup[]);
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
  luggageLimit: number;
}

export const buildings = ['毅志', '弘德', '慧樓'] as const;
export type BuildingName = (typeof buildings)[number];

export const defaultBuildingConfigs: Record<BuildingName, BuildingConfig> = {
  '毅志': { totalPeople: 704, staffCount: 15, luggageLimit: 5 },
  '弘德': { totalPeople: 320, staffCount: 10, luggageLimit: 5 },
  '慧樓': { totalPeople: 240, staffCount: 8, luggageLimit: 6 },
};

export const getDefaultBuildingConfig = (building: string): BuildingConfig => {
  return defaultBuildingConfigs[building as BuildingName] ?? defaultBuildingConfigs['毅志'];
};

export const getBuildingConfig = async (building: string): Promise<BuildingConfig> => {
  const defaults = getDefaultBuildingConfig(building);
  try {
    const docRef = doc(db, 'settings', `config_${building}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...defaults, ...(docSnap.data() as Partial<BuildingConfig>) };
    }
    return defaults;
  } catch (error) {
    console.warn("Error fetching building config", error);
    return defaults;
  }
};

export const saveBuildingConfig = async (building: string, config: BuildingConfig) => {
  await setDoc(doc(db, 'settings', `config_${building}`), config);
};

export interface DataValiditySettings {
  startDate: string;
  endDate: string;
}

export const defaultDataValiditySettings: DataValiditySettings = {
  startDate: '',
  endDate: '',
};

export const getDataValiditySettings = async (): Promise<DataValiditySettings> => {
  try {
    const docRef = doc(db, 'settings', 'dataValidity');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<DataValiditySettings> & { validDays?: number };
      return {
        ...defaultDataValiditySettings,
        startDate: data.startDate ?? '',
        endDate: data.endDate ?? '',
      };
    }
    return defaultDataValiditySettings;
  } catch (error) {
    console.warn("Error fetching data validity settings", error);
    return defaultDataValiditySettings;
  }
};

export const saveDataValiditySettings = async (settings: DataValiditySettings) => {
  await setDoc(doc(db, 'settings', 'dataValidity'), settings);
};
