import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  applyCurrentBuildingSettings,
  defaultDashboardBuildingSettings,
  type CurrentBuildingSettings,
  type DashboardBuildingSetting,
} from '../utils/dashboardLayout';
import type { EmptyBedSettings } from '../utils/dashboardStats';
import {
  emptyDashboardWhitelistSettings,
  mergeDashboardFilterSettings,
  type DashboardFilterSettings,
  type DashboardWhitelistSettings,
} from '../utils/dashboardFilters';

const currentBuildingsRef = doc(db, 'settings', 'buildings');
const emptyBedsRef = doc(db, 'settings', 'emptyBeds');
const dashboardFiltersRef = doc(db, 'settings', 'dashboardFilters');
const dashboardWhitelistRef = doc(db, 'settings', 'dashboardWhitelist');

export const getDashboardBuildingSettings = async (): Promise<DashboardBuildingSetting[]> => {
  const snapshot = await getDoc(currentBuildingsRef);
  if (!snapshot.exists()) return defaultDashboardBuildingSettings;

  return applyCurrentBuildingSettings(defaultDashboardBuildingSettings, snapshot.data() as CurrentBuildingSettings);
};

export const getEmptyBedSettings = async (): Promise<EmptyBedSettings> => {
  const snapshot = await getDoc(emptyBedsRef);
  if (!snapshot.exists()) return { beds: {} };

  const data = snapshot.data() as Partial<EmptyBedSettings>;
  return { beds: data.beds ?? {} };
};

export const saveEmptyBedSettings = async (settings: EmptyBedSettings, updatedBy?: string | null) => {
  await setDoc(emptyBedsRef, {
    beds: settings.beds,
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy ?? null,
  });
};

export const getDashboardFilterSettings = async (): Promise<DashboardFilterSettings> => {
  const snapshot = await getDoc(dashboardFiltersRef);
  if (!snapshot.exists()) return mergeDashboardFilterSettings();

  const data = snapshot.data() as Partial<DashboardFilterSettings>;
  return mergeDashboardFilterSettings(data);
};

export const saveDashboardFilterSettings = async (settings: DashboardFilterSettings, updatedBy?: string | null) => {
  await setDoc(dashboardFiltersRef, {
    excludedQrRules: settings.excludedQrRules,
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy ?? null,
  });
};

export const getDashboardWhitelistSettings = async (): Promise<DashboardWhitelistSettings> => {
  const snapshot = await getDoc(dashboardWhitelistRef);
  if (!snapshot.exists()) return emptyDashboardWhitelistSettings;

  const data = snapshot.data() as Partial<DashboardWhitelistSettings>;
  return {
    records: data.records ?? {},
    qrIds: data.qrIds ?? {},
  };
};

export const saveDashboardWhitelistSettings = async (settings: DashboardWhitelistSettings, updatedBy?: string | null) => {
  await setDoc(dashboardWhitelistRef, {
    records: settings.records,
    qrIds: settings.qrIds,
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy ?? null,
  });
};
