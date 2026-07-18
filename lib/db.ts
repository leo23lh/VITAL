import Dexie, { type Table } from "dexie";
import {
  DEFAULT_USER_ID,
  type DoseLog,
  type Protocol,
  type Settings,
} from "./types";

/**
 * Local-first persistence. All user data lives in IndexedDB via Dexie.
 * This module is the ONLY place that talks to the database, so swapping to a
 * hosted backend later means reimplementing these functions, nothing else.
 */
class AppDatabase extends Dexie {
  protocols!: Table<Protocol, string>;
  doseLogs!: Table<DoseLog, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super("peptide-companion");
    this.version(1).stores({
      protocols: "id, userId, active, createdAt",
      doseLogs: "id, userId, protocolId, compoundId, scheduledAt, status",
      settings: "userId",
    });
  }
}

// Guard against constructing IndexedDB during SSR.
export const db =
  typeof window !== "undefined" ? new AppDatabase() : (undefined as unknown as AppDatabase);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: Settings = {
  userId: DEFAULT_USER_ID,
  notificationsEnabled: false,
};

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get(DEFAULT_USER_ID);
  if (existing) return existing;
  await db.settings.put(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch, userId: DEFAULT_USER_ID };
  await db.settings.put(next);
  return next;
}

export async function acknowledgeDisclaimer(): Promise<void> {
  await updateSettings({ acknowledgedDisclaimerAt: Date.now() });
}

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

export async function saveProtocol(
  protocol: Omit<Protocol, "userId" | "createdAt"> & Partial<Pick<Protocol, "createdAt">>,
): Promise<Protocol> {
  const record: Protocol = {
    ...protocol,
    userId: DEFAULT_USER_ID,
    createdAt: protocol.createdAt ?? Date.now(),
  };
  await db.protocols.put(record);
  return record;
}

export async function listProtocols(): Promise<Protocol[]> {
  return db.protocols.where("userId").equals(DEFAULT_USER_ID).reverse().sortBy("createdAt");
}

export async function getProtocol(id: string): Promise<Protocol | undefined> {
  return db.protocols.get(id);
}

export async function getActiveProtocol(): Promise<Protocol | undefined> {
  const all = await db.protocols.where("userId").equals(DEFAULT_USER_ID).toArray();
  return all.find((p) => p.active);
}

/** Activating one protocol deactivates all others (single active protocol in v1). */
export async function setActiveProtocol(id: string): Promise<void> {
  await db.transaction("rw", db.protocols, async () => {
    const all = await db.protocols.where("userId").equals(DEFAULT_USER_ID).toArray();
    await Promise.all(
      all.map((p) => db.protocols.update(p.id, { active: p.id === id })),
    );
  });
}

export async function deleteProtocol(id: string): Promise<void> {
  await db.transaction("rw", db.protocols, db.doseLogs, async () => {
    await db.protocols.delete(id);
    await db.doseLogs.where("protocolId").equals(id).delete();
  });
}

// ---------------------------------------------------------------------------
// Dose logs
// ---------------------------------------------------------------------------

export async function putDoseLog(log: DoseLog): Promise<void> {
  await db.doseLogs.put(log);
}

export async function bulkPutDoseLogs(logs: DoseLog[]): Promise<void> {
  await db.doseLogs.bulkPut(logs);
}

export async function getDoseLogsInRange(startMs: number, endMs: number): Promise<DoseLog[]> {
  return db.doseLogs
    .where("scheduledAt")
    .between(startMs, endMs, true, true)
    .toArray();
}

export async function setDoseStatus(
  id: string,
  status: DoseLog["status"],
): Promise<void> {
  await db.doseLogs.update(id, {
    status,
    takenAt: status === "taken" ? Date.now() : undefined,
  });
}
