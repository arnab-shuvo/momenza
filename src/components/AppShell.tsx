import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useTheme } from '../context/ThemeContext';
import Header from './Header';
import TaskList from './TaskList';
import HomeScreen from './HomeScreen';
import ArchiveScreen from './ArchiveScreen';
import AddTaskModal from './AddTaskModal';
import FloatingAddButton from './FloatingAddButton';
import FilterBar from './FilterBar';
import BurgerMenu from './BurgerMenu';
import SettingsScreen from './SettingsScreen';
import QRScannerModal from './QRScannerModal';
import CalendarView from './CalendarView';
import TaskDetailModal from './TaskDetailModal';
import CreateProjectModal from './CreateProjectModal';
import { TaskFilter, SortMode } from '../types/filter';
import { Task } from '../types/task';
import { Project } from '../types/project';

const EMPTY_FILTER: TaskFilter = { query: '', date: null };

export default function AppShell() {
  const { colors } = useTheme();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [burgerVisible,    setBurgerVisible]    = useState(false);
  const [archiveVisible,   setArchiveVisible]   = useState(false);
  const [settingsVisible,  setSettingsVisible]  = useState(false);
  const [addModalVisible,  setAddModalVisible]  = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortMode>('priority');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isListSelecting, setIsListSelecting] = useState(false);
  const [scannerVisible,  setScannerVisible]  = useState(false);
  const [createProjectVisible, setCreateProjectVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const {
    tasks,
    activeTasks,
    archivedTasks,
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
  } = useTasks();

  const {
    projects,
    activeProjects,
    archivedProjects,
    addProject,
    updateProject,
    archiveProject,
    restoreProject,
    deleteProject,
  } = useProjects();

  // Keep selectedProject in sync if it gets archived/deleted
  useEffect(() => {
    if (!selectedProject) return;
    const current = projects.find(p => p.id === selectedProject.id);
    if (!current || current.status === 'archived') {
      setSelectedProject(null);
    } else {
      setSelectedProject(current);
    }
  }, [projects]);

  // Android hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedTask)         { setSelectedTask(null);          return true; }
      if (addModalVisible)      { setAddModalVisible(false);      return true; }
      if (createProjectVisible) { setCreateProjectVisible(false); setEditingProject(null); return true; }
      if (scannerVisible)       { setScannerVisible(false);       return true; }
      if (settingsVisible)      { setSettingsVisible(false);      return true; }
      if (archiveVisible)       { setArchiveVisible(false);       return true; }
      if (burgerVisible)        { setBurgerVisible(false);        return true; }
      if (selectedProject)      { setSelectedProject(null);       return true; }
      return false; // default: exit app
    });
    return () => sub.remove();
  }, [selectedTask, addModalVisible, createProjectVisible, scannerVisible, settingsVisible, archiveVisible, burgerVisible, selectedProject]);

  // Deep link handler
  useEffect(() => {
    async function handleUrl({ url }: { url: string }) {
      if (!url.startsWith('momenza://import')) return;
      try {
        const raw  = url.split('?d=')[1];
        if (!raw) return;
        const json = decodeURIComponent(Array.from(atob(raw), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
        const parsed = JSON.parse(json);

        let taskArr: { t: string; d?: string; dt?: 'single' | 'range'; s?: number; e?: number }[] = [];
        let pName: string | undefined;
        let pColor: string | undefined;

        if (Array.isArray(parsed)) {
          taskArr = parsed;
        } else {
          taskArr = Array.isArray(parsed.tasks) ? parsed.tasks : [];
          pName   = parsed.pn;
          pColor  = parsed.pc;
        }

        const mappedTasks = taskArr.map((item: any) => ({
          title: item.t,
          ...(item.d ? { description: item.d } : {}),
          ...(item.s ? { taskDate: { type: item.dt ?? 'single' as const, start: item.s, ...(item.e ? { end: item.e } : {}) } } : {}),
        }));

        await handleImport(mappedTasks, pName, pColor);
      } catch {}
    }
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });
    return () => sub.remove();
  }, [importTasks, projects]);

  const handleImport = useCallback(async (
    incomingTasks: { title: string; description?: string; taskDate?: any }[],
    projectName?: string,
    projectColor?: string,
  ) => {
    if (!projectName) {
      await importTasks(incomingTasks, selectedProject?.id);
      return;
    }

    const existing = projects.find(p => p.name === projectName && p.status === 'active');
    if (existing) {
      await importTasks(incomingTasks, existing.id);
    } else {
      const color = projectColor ?? '#6C5CE7';
      const newProject = await addProject(projectName, color);
      await importTasks(incomingTasks, newProject.id);
    }
  }, [importTasks, addProject, projects, selectedProject]);

  const handleDeleteProject = useCallback(async (id: string) => {
    deleteTasksByProject(id);
    await deleteProject(id);
  }, [deleteProject, deleteTasksByProject]);

  const handleRestoreProject = useCallback(async (id: string) => {
    await restoreProject(id);
  }, [restoreProject]);

  // Tasks scoped to the selected project
  const projectActiveTasks = useMemo(() => {
    if (!selectedProject) return [];
    return activeTasks.filter(t => t.projectId === selectedProject.id);
  }, [activeTasks, selectedProject]);

  const projectCompletedTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks.filter(t => t.projectId === selectedProject.id && t.status === 'completed');
  }, [tasks, selectedProject]);

  // All tasks with dates for calendar
  const allTasksForCalendar = useMemo(() => {
    const base = selectedProject
      ? tasks.filter(t => t.projectId === selectedProject.id)
      : [...activeTasks, ...archivedTasks];
    return base.filter(t => t.taskDate);
  }, [tasks, activeTasks, archivedTasks, selectedProject]);

  // Filtered + sorted active tasks for the project task list
  const filteredTasks = useMemo(() => {
    const { query, date } = filter;
    let result = projectActiveTasks.filter((task) => {
      if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (date) {
        if (date.mode === 'no-date') return !task.taskDate;
        if (!task.taskDate) return false;
        const taskStart = task.taskDate.start;
        const taskEnd   = task.taskDate.end ?? task.taskDate.start;
        if (taskEnd < date.start || taskStart > date.end) return false;
      }
      return true;
    });

    if (sort === 'alpha') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'date-asc') {
      result = [...result].sort((a, b) => {
        const aDate = a.taskDate?.start ?? Infinity;
        const bDate = b.taskDate?.start ?? Infinity;
        return aDate - bDate;
      });
    }
    return result;
  }, [projectActiveTasks, filter, sort]);

  const calendarProjects = useMemo(
    () => (selectedProject ? [] : activeProjects),
    [activeProjects, selectedProject]
  );

  const isInsideProject = selectedProject !== null;

  function handleFABPress() {
    if (isInsideProject) {
      setAddModalVisible(true);
    } else {
      setCreateProjectVisible(true);
    }
  }

  async function handleCreateProject(name: string, color: string) {
    await addProject(name, color);
  }

  async function handleEditProject(name: string, color: string) {
    if (!editingProject) return;
    await updateProject(editingProject.id, name, color);
    setEditingProject(null);
  }

  function openEditProject(project: Project) {
    setEditingProject(project);
    setCreateProjectVisible(true);
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          activeCount={isInsideProject ? projectActiveTasks.length : activeTasks.length}
          viewMode={viewMode}
          onToggleView={() => setViewMode(v => v === 'list' ? 'calendar' : 'list')}
          onMenuPress={() => setBurgerVisible(true)}
          onScanQR={() => setScannerVisible(true)}
          projectName={selectedProject?.name}
          projectColor={selectedProject?.color}
          onBack={isInsideProject ? () => setSelectedProject(null) : undefined}
        />

        {isInsideProject ? (
          viewMode === 'list' ? (
            <>
              <FilterBar onChange={setFilter} currentSort={sort} onSortChange={setSort} />
              <View style={styles.flex}>
                <TaskList
                  tasks={filteredTasks}
                  completedTasks={projectCompletedTasks}
                  projectName={selectedProject?.name}
                  projectColor={selectedProject?.color}
                  onComplete={completeTask}
                  onUncomplete={uncompleteTask}
                  onArchive={archiveTask}
                  onDelete={deleteTask}
                  onReorder={reorderTasks}
                  onPress={setSelectedTask}
                  onDeleteSelected={deleteManyTasks}
                  onArchiveSelected={archiveManyTasks}
                  onSelectingChange={setIsListSelecting}
                  onAdd={(title) => addTask(title, undefined, undefined, selectedProject?.id)}
                />
              </View>
            </>
          ) : (
            <View style={styles.flex}>
              <CalendarView
                tasks={allTasksForCalendar}
                onTaskPress={setSelectedTask}
              />
            </View>
          )
        ) : (
          viewMode === 'list' ? (
            <View style={styles.flex}>
              <HomeScreen
                projects={activeProjects}
                tasks={tasks}
                onSelectProject={setSelectedProject}
                onEditProject={openEditProject}
                onArchiveProject={archiveProject}
                onDeleteProject={handleDeleteProject}
              />
            </View>
          ) : (
            <View style={styles.flex}>
              <CalendarView
                tasks={allTasksForCalendar}
                projects={calendarProjects}
                onTaskPress={setSelectedTask}
              />
            </View>
          )
        )}
      </View>

      {!isListSelecting && <FloatingAddButton onPress={handleFABPress} />}

      <AddTaskModal
        visible={addModalVisible}
        onAdd={(title, taskDate, description) =>
          addTask(title, taskDate, description, selectedProject?.id)
        }
        onClose={() => setAddModalVisible(false)}
      />

      <CreateProjectModal
        visible={createProjectVisible}
        editingProject={editingProject}
        onSubmit={editingProject ? handleEditProject : handleCreateProject}
        onClose={() => { setCreateProjectVisible(false); setEditingProject(null); }}
      />

      <BurgerMenu
        visible={burgerVisible}
        archivedCount={archivedCount}
        projects={activeProjects}
        onClose={() => setBurgerVisible(false)}
        onArchive={() => setArchiveVisible(true)}
        onSettings={() => setSettingsVisible(true)}
        onSelectProject={(project) => {
          setSelectedProject(project);
          setViewMode('list');
        }}
        onNewProject={() => setCreateProjectVisible(true)}
      />

      <SettingsScreen
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onImport={handleImport}
      />

      <ArchiveScreen
        visible={archiveVisible}
        tasks={archivedTasks}
        projects={projects}
        archivedProjects={archivedProjects}
        onRestore={restoreTask}
        onDelete={deleteTask}
        onDeleteMany={deleteManyTasks}
        onRestoreProject={handleRestoreProject}
        onDeleteProject={handleDeleteProject}
        onClose={() => setArchiveVisible(false)}
      />

      <TaskDetailModal
        task={selectedTask}
        visible={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        onSave={(id, title, taskDate, description) => { updateTask(id, title, taskDate, description); setSelectedTask(null); }}
        onComplete={(id) => { completeTask(id); setSelectedTask(null); }}
        onArchive={(id) => { archiveTask(id); setSelectedTask(null); }}
        onDelete={(id) => { deleteTask(id); setSelectedTask(null); }}
        onRestore={(id) => { restoreTask(id); setSelectedTask(null); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1 },
  flex:      { flex: 1 },
  container: { flex: 1 },
});
