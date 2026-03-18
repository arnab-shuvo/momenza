import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppShell from './src/components/AppShell';

const INBOX_ID = 'inbox-default';

async function initDB(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      color       TEXT    NOT NULL DEFAULT '#6C5CE7',
      status      TEXT    NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT,
      status      TEXT    NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL,
      task_date   TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      project_id  TEXT    NOT NULL DEFAULT '${INBOX_ID}'
    );
  `);

  const inboxExists = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM projects WHERE id = ?`, INBOX_ID
  );
  if (!inboxExists) {
    await db.runAsync(
      `INSERT INTO projects (id, name, color, status, created_at, sort_order)
       VALUES (?, 'Inbox', '#6C5CE7', 'active', ?, 0)`,
      INBOX_ID, Date.now()
    );
  }

  // Migrate: add project_id column if it doesn't exist yet
  const taskCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(tasks)`
  );
  const hasProjectId = taskCols.some(c => c.name === 'project_id');
  if (!hasProjectId) {
    await db.runAsync(
      `ALTER TABLE tasks ADD COLUMN project_id TEXT NOT NULL DEFAULT '${INBOX_ID}'`
    );
  }

  await db.runAsync(
    `UPDATE tasks SET project_id = ? WHERE project_id IS NULL OR project_id = ''`,
    INBOX_ID
  );
}

function Root() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppShell />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName='tasks.db' onInit={initDB}>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
