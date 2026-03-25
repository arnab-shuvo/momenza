import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppShell from './src/components/AppShell';
import { supabase } from './src/lib/supabase';
import type { Session } from '@supabase/supabase-js';

async function initDB(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL,
      color       TEXT    NOT NULL DEFAULT '#6C5CE7',
      status      TEXT    NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      updated_at  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT,
      status      TEXT    NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL,
      task_date   TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      project_id  TEXT    NOT NULL DEFAULT '',
      updated_at  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id          TEXT    PRIMARY KEY,
      operation   TEXT    NOT NULL,
      table_name  TEXT    NOT NULL,
      record_id   TEXT    NOT NULL,
      payload     TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migrations
  const taskCols    = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(tasks)`);
  const projectCols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(projects)`);

  if (!taskCols.some(c => c.name === 'project_id')) {
    await db.runAsync(`ALTER TABLE tasks ADD COLUMN project_id TEXT NOT NULL DEFAULT ''`);
  }
  if (!taskCols.some(c => c.name === 'updated_at')) {
    await db.runAsync(`ALTER TABLE tasks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
  }
  if (!projectCols.some(c => c.name === 'updated_at')) {
    await db.runAsync(`ALTER TABLE projects ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`);
  }
}

function Root() {
  const { isDark } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes (sign in / sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppShell userId={session?.user.id ?? null} userEmail={session?.user.email} />
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
