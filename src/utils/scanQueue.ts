export type ScanQueueResult = {
  qrIds: string[];
  qrId: string;
  added: boolean;
  duplicate: boolean;
};

export type DuplicateWarning = {
  type: 'qr' | 'room';
  value: string;
};

const normalizeQrId = (value: string) => value.trim();

export const getUniqueNonEmptyQrIds = (qrIds: string[]) => {
  return Array.from(new Set(qrIds.map(normalizeQrId).filter(Boolean)));
};

export const addScannedQrToQueue = (currentQrIds: string[], scannedQrId: string): ScanQueueResult => {
  const qrId = normalizeQrId(scannedQrId);

  if (!qrId) {
    return {
      qrIds: currentQrIds,
      qrId,
      added: false,
      duplicate: false,
    };
  }

  if (currentQrIds.includes(qrId)) {
    return {
      qrIds: currentQrIds,
      qrId,
      added: false,
      duplicate: true,
    };
  }

  return {
    qrIds: [...currentQrIds, qrId],
    qrId,
    added: true,
    duplicate: false,
  };
};

export const getRegistrationQrIds = (pendingQrIds: string[], manualQrId: string) => {
  if (pendingQrIds.length > 0) {
    return pendingQrIds;
  }

  return [normalizeQrId(manualQrId)];
};

export const getAlreadyRegisteredQrIds = (candidateQrIds: string[], registeredQrIds: string[]) => {
  const registeredQrIdSet = new Set(getUniqueNonEmptyQrIds(registeredQrIds));

  return getUniqueNonEmptyQrIds(candidateQrIds).filter((qrId) => registeredQrIdSet.has(qrId));
};

export const getAlreadyRegisteredRoomNumbers = (candidateRoomNumber: string, registeredRoomNumbers: string[]) => {
  const roomNumber = candidateRoomNumber.trim().toUpperCase();
  const registeredRoomSet = new Set(registeredRoomNumbers.map((value) => value.trim().toUpperCase()).filter(Boolean));

  return roomNumber && registeredRoomSet.has(roomNumber) ? [roomNumber] : [];
};

export const getDuplicateWarnings = ({
  candidateQrIds,
  registeredQrIds,
  candidateRoomNumber,
  registeredRoomNumbers,
}: {
  candidateQrIds: string[];
  registeredQrIds: string[];
  candidateRoomNumber: string;
  registeredRoomNumbers: string[];
}): DuplicateWarning[] => {
  const qrWarnings = getAlreadyRegisteredQrIds(candidateQrIds, registeredQrIds).map((value) => ({
    type: 'qr' as const,
    value,
  }));
  const roomWarnings = getAlreadyRegisteredRoomNumbers(candidateRoomNumber, registeredRoomNumbers).map((value) => ({
    type: 'room' as const,
    value,
  }));

  return [...qrWarnings, ...roomWarnings];
};
