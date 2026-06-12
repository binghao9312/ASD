import { Timestamp, type QueryConstraint, where } from 'firebase/firestore';

const DAY_END = 'T23:59:59.999';
const DAY_START = 'T00:00:00';

type TimestampLike = { toDate?: () => Date; toMillis?: () => number } | Date | string | number | null | undefined;

export const getDateRangeLabel = (startDate: string, endDate: string) => {
  if (!startDate && !endDate) return '不限制';
  return `${startDate || '最早'} 到 ${endDate || '最新'}`;
};

export const getDateRangeConstraints = (startDate: string, endDate: string): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [];

  if (startDate) {
    constraints.push(where('scannedAt', '>=', Timestamp.fromDate(new Date(`${startDate}${DAY_START}`))));
  }

  if (endDate) {
    constraints.push(where('scannedAt', '<=', Timestamp.fromDate(new Date(`${endDate}${DAY_END}`))));
  }

  return constraints;
};

export const getTimestampMillis = (timestamp: TimestampLike) => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'object' && 'toMillis' in timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime();
  }
  if (timestamp instanceof Date || typeof timestamp === 'string' || typeof timestamp === 'number') {
    return new Date(timestamp).getTime();
  }
  return 0;
};

const getDateStartMillis = (date: string) => (date ? new Date(`${date}${DAY_START}`).getTime() : null);
const getDateEndMillis = (date: string) => (date ? new Date(`${date}${DAY_END}`).getTime() : null);

export const isTimestampWithinDateRange = (timestamp: TimestampLike, startDate: string, endDate: string) => {
  if (!startDate && !endDate) return true;
  const timestampMillis = getTimestampMillis(timestamp);
  if (!timestampMillis) return false;

  const startMillis = getDateStartMillis(startDate);
  const endMillis = getDateEndMillis(endDate);

  if (startMillis !== null && timestampMillis < startMillis) return false;
  if (endMillis !== null && timestampMillis > endMillis) return false;
  return true;
};
