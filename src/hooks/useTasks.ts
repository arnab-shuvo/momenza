import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Task, TaskDate, TaskStatus } from '../types/task';
import { scheduleTaskReminder, cancelTaskReminder } from '../lib/notifications';

type DBRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: number;
  task_date: string | null;
  sort_order: number;
  project_id: string;
};

function rowToTask(row: DBRow): Task {
  return {
    id: row.id,
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    status: row.status as TaskStatus,
    createdAt: row.created_at,
    taskDate: row.task_date ? JSON.parse(row.task_date) : undefined,
    projectId: row.project_id,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

type SyncCallbacks = {
  queueUpsert: (table: 'tasks' | 'projects', record: Record<string, any>) => Promise<void>;
  queueDelete: (table: 'tasks' | 'projects', id: string) => Promise<void>;
};

export function useTasks(sync?: SyncCallbacks) {
  const db = useSQLiteContext();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    (async () => {
      const rows = await db.getAllAsync<DBRow>(
        'SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC'
      );
      setTasks(rows.map(rowToTask));
    })();
  }, []);

  const activeTasks   = useMemo(() => tasks.filter(t => t.status === 'active'),  [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => t.status !== 'active'),  [tasks]);
  const activeCount   = activeTasks.length;
  const archivedCount = archivedTasks.length;

  const addTask = useCallback(async (
    title: string,
    taskDate?: TaskDate,
    description?: string,
    projectId?: string,
  ) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const resolvedProjectId = projectId ?? 'inbox-default';
    const id  = generateId();
    const now = Date.now();
    const desc        = description?.trim() || null;
    const taskDateStr = taskDate ? JSON.stringify(taskDate) : null;

    const newTask: Task = {
      id, title: trimmed, status: 'active', createdAt: now,
      projectId: resolvedProjectId,
      ...(desc     ? { description: desc } : {}),
      ...(taskDate ? { taskDate }          : {}),
    };

    setTasks(prev => [newTask, ...prev]);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tasks SET sort_order = sort_order + 1 WHERE status = 'active' AND project_id = ?`,
        resolvedProjectId
      );
      await db.runAsync(
        `INSERT INTO tasks (id, title, description, status, created_at, task_date, sort_order, project_id, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, 0, ?, ?)`,
        id, trimmed, desc, now, taskDateStr, resolvedProjectId, now
      );
    });
    await sync?.queueUpsert('tasks', { id, title: trimmed, description: desc, status: 'active', created_at: now, task_date: taskDateStr, sort_order: 0, project_id: resolvedProjectId });
    if (taskDate) scheduleTaskReminder(id, trimmed, taskDate.start);
  }, [db, sync]);

  const completeTask = useCallback(async (id: string) => {
    const now = Date.now();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t));
    await db.runAsync(`UPDATE tasks SET status = 'completed', updated_at = ? WHERE id = ?`, now, id);
    const row = await db.getFirstAsync<any>(`SELECT * FROM tasks WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('tasks', row);
    cancelTaskReminder(id);
  }, [db, sync]);

  const uncompleteTask = useCallback(async (id: string) => {
    const now = Date.now();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'active' as const } : t));
    await db.runAsync(`UPDATE tasks SET status = 'active', updated_at = ? WHERE id = ?`, now, id);
    const row = await db.getFirstAsync<any>(`SELECT * FROM tasks WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('tasks', row);
  }, [db, sync]);

  const archiveTask = useCallback(async (id: string) => {
    const now = Date.now();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'archived' as const } : t));
    await db.runAsync(`UPDATE tasks SET status = 'archived', updated_at = ? WHERE id = ?`, now, id);
    const row = await db.getFirstAsync<any>(`SELECT * FROM tasks WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('tasks', row);
    cancelTaskReminder(id);
  }, [db, sync]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await db.runAsync(`DELETE FROM tasks WHERE id = ?`, id);
    await sync?.queueDelete('tasks', id);
    cancelTaskReminder(id);
  }, [db, sync]);

  const deleteManyTasks = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    setTasks(prev => prev.filter(t => !ids.includes(t.id)));
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM tasks WHERE id IN (${placeholders})`, ...ids);
    for (const id of ids) { await sync?.queueDelete('tasks', id); cancelTaskReminder(id); }
  }, [db, sync]);

  const restoreTask = useCallback(async (id: string) => {
    const now = Date.now();
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'active' as const } : t));
    await db.withTransactionAsync(async () => {
      if (task) {
        await db.runAsync(
          `UPDATE tasks SET sort_order = sort_order + 1 WHERE status = 'active' AND project_id = ?`,
          task.projectId
        );
      }
      await db.runAsync(`UPDATE tasks SET status = 'active', sort_order = 0, updated_at = ? WHERE id = ?`, now, id);
    });
    const row = await db.getFirstAsync<any>(`SELECT * FROM tasks WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('tasks', row);
  }, [db, tasks, sync]);

  const updateTask = useCallback(async (
    id: string, title: string, taskDate?: TaskDate, description?: string, projectId?: string
  ) => {
    const now         = Date.now();
    const desc        = description?.trim() || null;
    const taskDateStr = taskDate ? JSON.stringify(taskDate) : null;
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, title, taskDate: taskDate ?? undefined, description: desc ?? undefined, ...(projectId ? { projectId } : {}) }
        : t
    ));
    if (projectId) {
      await db.runAsync(
        `UPDATE tasks SET title = ?, task_date = ?, description = ?, project_id = ?, updated_at = ? WHERE id = ?`,
        title, taskDateStr, desc, projectId, now, id
      );
    } else {
      await db.runAsync(
        `UPDATE tasks SET title = ?, task_date = ?, description = ?, updated_at = ? WHERE id = ?`,
        title, taskDateStr, desc, now, id
      );
    }
    const row = await db.getFirstAsync<any>(`SELECT * FROM tasks WHERE id = ?`, id);
    if (row) await sync?.queueUpsert('tasks', row);
    cancelTaskReminder(id);
    if (taskDate) scheduleTaskReminder(id, title, taskDate.start);
  }, [db, sync]);

  const importTasks = useCallback(async (
    incoming: { title: string; description?: string; taskDate?: TaskDate }[],
    projectId?: string,
  ) => {
    const resolvedProjectId = projectId ?? 'inbox-default';
    const now = Date.now();
    const newTasks: Task[] = incoming.map((t, i) => ({
      id: generateId(),
      title: t.title,
      ...(t.description ? { description: t.description } : {}),
      ...(t.taskDate    ? { taskDate: t.taskDate }        : {}),
      status: 'active' as const,
      createdAt: now + i,
      projectId: resolvedProjectId,
    }));

    setTasks(prev => [...newTasks, ...prev]);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tasks SET sort_order = sort_order + ? WHERE status = 'active' AND project_id = ?`,
        newTasks.length, resolvedProjectId
      );
      for (let i = 0; i < newTasks.length; i++) {
        const t = newTasks[i];
        await db.runAsync(
          `INSERT INTO tasks (id, title, description, status, created_at, task_date, sort_order, project_id)
           VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
          t.id, t.title, t.description ?? null, t.createdAt,
          t.taskDate ? JSON.stringify(t.taskDate) : null, i, resolvedProjectId
        );
      }
    });
  }, [db]);

  const reorderTasks = useCallback(async (reordered: Task[]) => {
    setTasks(prev => {
      const reorderedIds = new Set(reordered.map(t => t.id));
      const rest = prev.filter(t => !reorderedIds.has(t.id));
      return [...reordered, ...rest];
    });
    await db.withTransactionAsync(async () => {
      for (let i = 0; i < reordered.length; i++) {
        await db.runAsync(`UPDATE tasks SET sort_order = ? WHERE id = ?`, i, reordered[i].id);
      }
    });
  }, [db]);

  const archiveManyTasks = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    const now = Date.now();
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'archived' as const } : t));
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`UPDATE tasks SET status = 'archived', updated_at = ? WHERE id IN (${placeholders})`, now, ...ids);
    for (const id of ids) {
      const row = await db.getFirstAsync<any>(`SELECT * FROM tasks WHERE id = ?`, id);
      if (row) await sync?.queueUpsert('tasks', row);
      cancelTaskReminder(id);
    }
  }, [db, sync]);

  const deleteTasksByProject = useCallback(async (projectId: string) => {
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
  }, []);

  return {
    tasks,
    activeTasks,
    archivedTasks,
    activeCount,
    archivedCount,
    addTask,
    completeTask,
    uncompleteTask,
    archiveTask,
    deleteTask,
    deleteManyTasks,
    restoreTask,
    updateTask,
    reorderTasks,
    importTasks,
    archiveManyTasks,
    deleteTasksByProject,
  };
}
