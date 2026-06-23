import type { DashboardLuggageRecord } from './dashboardStats.ts';

export interface DashboardQrFilterRule {
  id: string;
  label: string;
  enabled: boolean;
  prefix?: string;
  suffix?: string;
  contains?: string;
}

export interface DashboardFilterSettings {
  excludedQrRules: DashboardQrFilterRule[];
}

export interface DashboardWhitelistEntry {
  reason?: string;
  addedBy?: string | null;
  addedAtMillis?: number;
}

export interface DashboardWhitelistSettings {
  records: Record<string, DashboardWhitelistEntry>;
  qrIds: Record<string, DashboardWhitelistEntry>;
}

export interface DashboardRecordFilterOptions {
  startDate: string;
  endDate: string;
  filters: DashboardFilterSettings;
  whitelist: DashboardWhitelistSettings;
}

export const defaultDashboardFilterSettings: DashboardFilterSettings = {
  excludedQrRules: [
    {
      id: 'test-qr',
      label: '測試 QR',
      enabled: true,
      prefix: 'ASTST',
      suffix: '-1',
    },
    {
      id: 'asdgb-test-qr',
      label: 'ASDGB 測試 QR',
      enabled: true,
      prefix: 'ASDGB',
    },
  ],
};

export const mergeDashboardFilterSettings = (
  settings?: Partial<DashboardFilterSettings> | null,
): DashboardFilterSettings => {
  const savedRules = Array.isArray(settings?.excludedQrRules) ? settings.excludedQrRules : [];
  if (!savedRules.length) return defaultDashboardFilterSettings;

  const savedRulesById = new Map(savedRules.map((rule) => [rule.id, rule]));
  const defaultRuleIds = new Set(defaultDashboardFilterSettings.excludedQrRules.map((rule) => rule.id));
  const mergedDefaultRules = defaultDashboardFilterSettings.excludedQrRules.map((defaultRule) => ({
    ...defaultRule,
    ...(savedRulesById.get(defaultRule.id) ?? {}),
  }));
  const customRules = savedRules.filter((rule) => !defaultRuleIds.has(rule.id));

  return {
    excludedQrRules: [...mergedDefaultRules, ...customRules],
  };
};

export const emptyDashboardWhitelistSettings: DashboardWhitelistSettings = {
  records: {},
  qrIds: {},
};

export const isRecordWhitelisted = (
  record: DashboardLuggageRecord,
  whitelist: DashboardWhitelistSettings,
) => {
  return Boolean(whitelist.records[record.id] || (record.qrId && whitelist.qrIds[record.qrId]));
};

export const matchesQrFilterRule = (qrId: string | undefined, rule: DashboardQrFilterRule) => {
  if (!qrId || !rule.enabled) return false;
  if (rule.prefix && !qrId.startsWith(rule.prefix)) return false;
  if (rule.suffix && !qrId.endsWith(rule.suffix)) return false;
  if (rule.contains && !qrId.includes(rule.contains)) return false;
  return Boolean(rule.prefix || rule.suffix || rule.contains);
};

export const isRecordExcludedByQrFilters = (
  record: DashboardLuggageRecord,
  filters: DashboardFilterSettings,
) => filters.excludedQrRules.some((rule) => matchesQrFilterRule(record.qrId, rule));

const getDateStartMillis = (date: string) => (date ? new Date(`${date}T00:00:00`).getTime() : null);
const getDateEndMillis = (date: string) => (date ? new Date(`${date}T23:59:59.999`).getTime() : null);

export const isRecordWithinDashboardDateRange = (
  record: DashboardLuggageRecord,
  startDate: string,
  endDate: string,
) => {
  if (!startDate && !endDate) return true;
  if (!record.scannedAtMillis) return false;

  const startMillis = getDateStartMillis(startDate);
  const endMillis = getDateEndMillis(endDate);

  if (startMillis !== null && record.scannedAtMillis < startMillis) return false;
  if (endMillis !== null && record.scannedAtMillis > endMillis) return false;
  return true;
};

export const getDashboardVisibleRecords = (
  records: DashboardLuggageRecord[],
  options: DashboardRecordFilterOptions,
) => records.filter((record) => {
  if (isRecordWhitelisted(record, options.whitelist)) return true;
  if (isRecordExcludedByQrFilters(record, options.filters)) return false;
  return isRecordWithinDashboardDateRange(record, options.startDate, options.endDate);
});
