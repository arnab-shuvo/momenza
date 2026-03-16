import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppShell from './src/components/AppShell';

async function initDB(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT    PRIMARY KEY,
      title       TEXT    NOT NULL,
      description TEXT,
      status      TEXT    NOT NULL DEFAULT 'active',
      created_at  INTEGER NOT NULL,
      task_date   TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );
  `);
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
      <SQLiteProvider databaseName="tasks.db" onInit={initDB}>
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
