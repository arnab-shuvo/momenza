import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Project } from '../types/project';

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

export function useProjects() {
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
      `INSERT INTO projects (id, name, color, status, created_at, sort_order)
       VALUES (?, ?, ?, 'active', ?, ?)`,
      id, name, color, now, maxOrder
    );

    return newProject;
  }, [db, projects]);

  const updateProject = useCallback(async (id: string, name?: string, color?: string) => {
    setProjects(prev => prev.map(p =>
      p.id === id
        ? { ...p, ...(name !== undefined ? { name } : {}), ...(color !== undefined ? { color } : {}) }
        : p
    ));
    if (name !== undefined && color !== undefined) {
      await db.runAsync(`UPDATE projects SET name = ?, color = ? WHERE id = ?`, name, color, id);
    } else if (name !== undefined) {
      await db.runAsync(`UPDATE projects SET name = ? WHERE id = ?`, name, id);
    } else if (color !== undefined) {
      await db.runAsync(`UPDATE projects SET color = ? WHERE id = ?`, color, id);
    }
  }, [db]);

  const archiveProject = useCallback(async (id: string) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'archived' as const } : p
    ));
    await db.runAsync(`UPDATE projects SET status = 'archived' WHERE id = ?`, id);
  }, [db]);

  const restoreProject = useCallback(async (id: string) => {
    setProjects(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'active' as const } : p
    ));
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE projects SET status = 'active' WHERE id = ?`, id);
      await db.runAsync(
        `UPDATE tasks SET status = 'active' WHERE project_id = ? AND status = 'archived'`,
        id
      );
    });
  }, [db]);

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM tasks WHERE project_id = ?`, id);
      await db.runAsync(`DELETE FROM projects WHERE id = ?`, id);
    });
  }, [db]);

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
  };
}
