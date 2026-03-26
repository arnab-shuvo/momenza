import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { supabase } from '../lib/supabase';

export type SyncStatus = 'idle' | 'syncing' | 'synced';

type SyncTable = 'tasks' | 'projects';

type QueueItem = {
  id: string;
  operation: 'upsert' | 'delete';
  table_name: SyncTable;
  record_id: string;
  payload: string | null;
  created_at: number;
};

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function useSync(userId: string | null) {
  const db = useSQLiteContext();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFlushing = useRef(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pullVersion, setPullVersion] = useState(0);

  // Pull on sign-in
  useEffect(() => {
    if (!userId) return;
    pull();
  }, [userId]);

  // Flush immediately when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background' || state === 'inactive') {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
        }
        flush();
      }
    });
    return () => sub.remove();
  }, [userId]);

  function scheduleFlush() {
    if (!userId) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flush, 20_000);
  }

  const queueUpsert = useCallback(async (table: SyncTable, record: Record<string, any>) => {
    if (!userId) return;
    const payload = JSON.stringify({ ...record, user_id: userId, updated_at: Date.now() });
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (id, operation, table_name, record_id, payload, created_at)
       VALUES (?, 'upsert', ?, ?, ?, ?)`,
      generateId(), table, record.id, payload, Date.now(),
    );
    scheduleFlush();
  }, [db, userId]);

  const queueDelete = useCallback(async (table: SyncTable, recordId: string) => {
    if (!userId) return;
    // Remove any pending upserts for this record — no point pushing then deleting
    await db.runAsync(
      `DELETE FROM sync_queue WHERE table_name = ? AND record_id = ?`,
      table, recordId,
    );
    await db.runAsync(
      `INSERT INTO sync_queue (id, operation, table_name, record_id, payload, created_at)
       VALUES (?, 'delete', ?, ?, NULL, ?)`,
      generateId(), table, recordId, Date.now(),
    );
    scheduleFlush();
  }, [db, userId]);

  const flush = useCallback(async () => {
    if (!userId || isFlushing.current) return;
    isFlushing.current = true;
    try {
      const items = await db.getAllAsync<QueueItem>(
        'SELECT * FROM sync_queue ORDER BY created_at ASC',
      );
      if (items.length === 0) return;

      setSyncStatus('syncing');
      for (const item of items) {
        try {
          if (item.operation === 'upsert' && item.payload) {
            const record = JSON.parse(item.payload);
            const { error } = await supabase.from(item.table_name).upsert(record);
            if (!error) await db.runAsync('DELETE FROM sync_queue WHERE id = ?', item.id);
          } else if (item.operation === 'delete') {
            const { error } = await supabase
              .from(item.table_name)
              .delete()
              .eq('id', item.record_id)
              .eq('user_id', userId);
            if (!error) await db.runAsync('DELETE FROM sync_queue WHERE id = ?', item.id);
          }
        } catch {
          // Keep item in queue — will retry next flush
        }
      }
      setSyncStatus('synced');
    } finally {
      isFlushing.current = false;
    }
  }, [db, userId]);

  const pull = useCallback(async () => {
    if (!userId) return;
    setSyncStatus('syncing');
    try {
      const meta = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM sync_meta WHERE key = 'last_synced_at'`,
      );
      const lastSyncedAt = meta ? parseInt(meta.value) : 0;
      const now = Date.now();
      const isFirstSync = lastSyncedAt === 0;

      // ── Pull projects ──────────────────────────────────────────────
      const { data: remoteProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSyncedAt);

      for (const p of remoteProjects ?? []) {
        const local = await db.getFirstAsync<{ updated_at: number }>(
          `SELECT updated_at FROM projects WHERE id = ?`, p.id,
        );
        if (!local || local.updated_at <= p.updated_at) {
          await db.runAsync(
            `INSERT OR REPLACE INTO projects (id, name, color, status, created_at, sort_order, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            p.id, p.name, p.color, p.status, p.created_at, p.sort_order, p.updated_at,
          );
        }
      }

      // ── Pull tasks ─────────────────────────────────────────────────
      const { data: remoteTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gt('updated_at', lastSyncedAt);

      for (const t of remoteTasks ?? []) {
        const local = await db.getFirstAsync<{ updated_at: number }>(
          `SELECT updated_at FROM tasks WHERE id = ?`, t.id,
        );
        if (!local || local.updated_at <= t.updated_at) {
          await db.runAsync(
            `INSERT OR REPLACE INTO tasks
               (id, title, description, status, created_at, task_date, sort_order, project_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            t.id, t.title, t.description ?? null, t.status,
            t.created_at, t.task_date ?? null, t.sort_order, t.project_id, t.updated_at,
          );
        }
      }

      // ── On first sync: push all existing local data ────────────────
      if (isFirstSync) {
        const localProjects = await db.getAllAsync<any>('SELECT * FROM projects');
        for (const p of localProjects) {
          await db.runAsync(
            `INSERT OR REPLACE INTO sync_queue (id, operation, table_name, record_id, payload, created_at)
             VALUES (?, 'upsert', 'projects', ?, ?, ?)`,
            generateId(), p.id,
            JSON.stringify({ ...p, user_id: userId, updated_at: Date.now() }),
            Date.now(),
          );
        }
        const localTasks = await db.getAllAsync<any>('SELECT * FROM tasks');
        for (const t of localTasks) {
          await db.runAsync(
            `INSERT OR REPLACE INTO sync_queue (id, operation, table_name, record_id, payload, created_at)
             VALUES (?, 'upsert', 'tasks', ?, ?, ?)`,
            generateId(), t.id,
            JSON.stringify({ ...t, user_id: userId, updated_at: Date.now() }),
            Date.now(),
          );
        }
        await flush();
      }

      await db.runAsync(
        `INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_synced_at', ?)`,
        String(now),
      );
      setSyncStatus('synced');
      setPullVersion(v => v + 1);
    } catch (e) {
      console.warn('Sync pull failed:', e);
      setSyncStatus('idle');
    }
  }, [db, userId, flush]);

  return { queueUpsert, queueDelete, flush, syncStatus, pullVersion };
}
