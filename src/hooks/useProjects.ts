import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Project } from '../types/project';

export const QUICK_TASKS_ID = 'quick-tasks-default';

type DBRow = {
  id: string;
  name: string;
  color: string;
  status: string;
  created_at: number;
  sort_order: number;
};

function rowToProject(row: DBRow): Project {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    status: row.status as 'active' | 'archived',
    createdAt: row.created_at,
    sortOrder: row.sort_order,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

type SyncCallbacks = {
  queueUpsert: (table: 'tasks' | 'projects', record: Record<string, any>) => Promise<void>;
  queueDelete: (table: 'tasks' | 'projects', id: string) => Promise<void>;
};

export function useProjects(sync?: SyncCallbacks) {
  const db = useSQLiteContext();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    (async () => {
      const rows = await db.getAllAsync<DBRow>(
        'SELECT * FROM projects ORDER BY sort_order ASC, created_at ASC'
      );
      setProjects(rows.map(rowToProject));
    })();
  }, []);

  const addProject = useCallback(async (name: string, color: string): Promise<Project> => {
    const id  = generateId();
    const now = Date.now();
    const maxOrder = projects.length > 0
      ? Math.max(...projects.map(p => p.sortOrder)) + 1
      : 0;

    const newProject: Project = {
      id, name, color,
      status: 'active',
      createdAt: now,
      sortOrder: maxOrder,
    };

    setProjects(prev => [...prev, newProject]);

    await db.runAsync(
      `INSERT INTO projects (id, name, color, status, created_at, sort_order, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      id, name, color, now, maxOrder, now
    );
    await sync?.queueUpsert('projects', { id, name, color, status: 'active', created_at: now, sort_order: maxOrder });

    return newProject;
  }, [db, projects, sync]);

  const updateProject = useCallback(async (id: string, name?: string, color?: string) => {
    const now = Date.now();
    setProjects(prev => prev.map(p =>
      p.id === id
        ? { ...p, ...(name !== undefined ? { name } : {}), ...(color !== undefined ? { color } : {}) }
        : p
    ));
    if (name !== undefined && color !== undefined) {
      await db.runAsync(`UPDATE projects SET name = ?, color = ?, updated_at = ? WHERE id = ?`, name, color, now, id);
    } else if (name !== undefined) {
      await db.runAsync(`UPDATE projects SET name = ?, updated_at = ? WHERE id = ?`, name, now, id);
    } else if (color !== undefined) {
      await db.runAsync(`UPDATE projects SET color = ?, updated_at = ? WHERE id = ?`, color, now, id);
    }
    const row = await db.getFirstAsync<any>(`SELECT * FROM projects WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('projects', row);
  }, [db, sync]);

  const archiveProject = useCallback(async (id: string) => {
    const now = Date.now();
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'archived' as const } : p
    ));
    await db.runAsync(`UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ?`, now, id);
    const row = await db.getFirstAsync<any>(`SELECT * FROM projects WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('projects', row);
  }, [db, sync]);

  const restoreProject = useCallback(async (id: string) => {
    const now = Date.now();
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'active' as const } : p
    ));
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE projects SET status = 'active', updated_at = ? WHERE id = ?`, now, id);
      await db.runAsync(
        `UPDATE tasks SET status = 'active', updated_at = ? WHERE project_id = ? AND status = 'archived'`,
        now, id
      );
    });
    const row = await db.getFirstAsync<any>(`SELECT * FROM projects WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('projects', row);
  }, [db, sync]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM tasks WHERE project_id = ?`, id);
      await db.runAsync(`DELETE FROM projects WHERE id = ?`, id);
    });
    await sync?.queueDelete('projects', id);
  }, [db, sync]);

  const archiveManyProjects = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const now = Date.now();
    setProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'archived' as const } : p));
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`UPDATE projects SET status = 'archived', updated_at = ? WHERE id IN (${placeholders})`, now, ...ids);
    for (const id of ids) {
      const row = await db.getFirstAsync<any>(`SELECT * FROM projects WHERE id = ?`, id);
      if (row) await sync?.queueUpsert('projects', row);
    }
  }, [db, sync]);

  const deleteManyProjects = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setProjects(prev => prev.filter(p => !ids.includes(p.id)));
    const placeholders = ids.map(() => '?').join(',');
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM tasks WHERE project_id IN (${placeholders})`, ...ids);
      await db.runAsync(`DELETE FROM projects WHERE id IN (${placeholders})`, ...ids);
    });
    for (const id of ids) await sync?.queueDelete('projects', id);
  }, [db, sync]);

  const ensureQuickTasksProject = useCallback(async (): Promise<string> => {
    const existing = projects.find(p => p.id === QUICK_TASKS_ID);
    if (existing) return QUICK_TASKS_ID;
    const now = Date.now();
    const newProject: Project = {
      id: QUICK_TASKS_ID, name: 'Quick Tasks', color: '#FF9F43',
      status: 'active', createdAt: now, sortOrder: 0,
    };
    setProjects(prev => [newProject, ...prev]);
    await db.runAsync(
      `INSERT OR IGNORE INTO projects (id, name, color, status, created_at, sort_order, updated_at) VALUES (?, 'Quick Tasks', '#FF9F43', 'active', ?, 0, ?)`,
      QUICK_TASKS_ID, now, now
    );
    await sync?.queueUpsert('projects', { id: QUICK_TASKS_ID, name: 'Quick Tasks', color: '#FF9F43', status: 'active', created_at: now, sort_order: 0 });
    return QUICK_TASKS_ID;
  }, [db, projects, sync]);

  const activeProjects   = projects.filter(p => p.status === 'active');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  return {
    projects,
    activeProjects,
    archivedProjects,
    addProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
    archiveManyProjects,
    deleteManyProjects,
    ensureQuickTasksProject,
  };
}
