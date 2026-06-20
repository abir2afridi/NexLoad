/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dexie, { Table } from "dexie";

export interface HistoryRecord {
  id: string;
  url: string;
  platform: string;
  title: string;
  thumbnail: string;
  author: string;
  durationLabel: string;
  format: string;
  quality: string;
  fileSizeLabel: string;
  date: number; // timestamp
  status: "completed" | "failed";
}

class NexLoadDatabase extends Dexie {
  history!: Table<HistoryRecord>;

  constructor() {
    super("NexLoadDatabase");
    this.version(1).stores({
      history: "id, url, platform, title, date, status"
    });
  }
}

export const db = new NexLoadDatabase();

export async function addHistoryRecord(record: HistoryRecord) {
  try {
    await db.history.put(record);
    
    // Auto-prune beyond 500 items (Part 12 spec)
    const count = await db.history.count();
    if (count > 500) {
      const records = await db.history.orderBy("date").limit(count - 500).toArray();
      const idsToDelete = records.map(r => r.id);
      await db.history.bulkDelete(idsToDelete);
    }
  } catch (error) {
    console.error("Dexie IndexedDB write error:", error);
  }
}

export async function getHistoryRecords(): Promise<HistoryRecord[]> {
  try {
    return await db.history.orderBy("date").reverse().toArray();
  } catch (error) {
    console.error("Dexie read error:", error);
    return [];
  }
}

export async function deleteHistoryRecord(id: string) {
  try {
    await db.history.delete(id);
  } catch (error) {
    console.error("Dexie delete error:", error);
  }
}

export async function clearAllHistory() {
  try {
    await db.history.clear();
  } catch (error) {
    console.error("Dexie clear error:", error);
  }
}
