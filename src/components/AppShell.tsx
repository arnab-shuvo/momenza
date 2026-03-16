import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '../hooks/useTasks';
import { useTheme } from '../context/ThemeContext';
import Header from './Header';
import TaskList from './TaskList';
import ArchiveScreen from './ArchiveScreen';
import AddTaskModal from './AddTaskModal';
import FloatingAddButton from './FloatingAddButton';
import FilterBar from './FilterBar';
import BurgerMenu from './BurgerMenu';
import CalendarView from './CalendarView';
import TaskDetailModal from './TaskDetailModal';
import { TaskFilter, SortMode } from '../types/filter';
import { Task } from '../types/task';

const EMPTY_FILTER: TaskFilter = { query: '', date: null };

export default function AppShell() {
  const { colors } = useTheme();

  const [burgerVisible,   setBurgerVisible]   = useState(false);
  const [archiveVisible,  setArchiveVisible]  = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<TaskFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<SortMode>('priority');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const {
    activeTasks,
    archivedTasks,
    activeCount,
    archivedCount,
    addTask,
    completeTask,
    archiveTask,
    deleteTask,
    restoreTask,
    updateTask,
    reorderTasks,
  } = useTasks();

  // All tasks with dates go to the calendar (active + archived)
  const allTasksForCalendar = useMemo(
    () => [...activeTasks, ...archivedTasks].filter(t => t.taskDate),
    [activeTasks, archivedTasks]
  );

  // Filtered + sorted active tasks for the main list
  const filteredTasks = useMemo(() => {
    const { query, date } = filter;

    let result = activeTasks.filter((task) => {
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
    // 'priority' = original drag order, no sort needed

    return result;
  }, [activeTasks, filter, sort]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header
          activeCount={activeCount}
          viewMode={viewMode}
          onToggleView={() => setViewMode(v => v === 'list' ? 'calendar' : 'list')}
          onMenuPress={() => setBurgerVisible(true)}
        />

        {viewMode === 'list' ? (
          <>
            <FilterBar onChange={setFilter} currentSort={sort} onSortChange={setSort} />
            <View style={styles.flex}>
              <TaskList
                tasks={filteredTasks}
                onComplete={completeTask}
                onArchive={archiveTask}
                onDelete={deleteTask}
                onReorder={reorderTasks}
                onPress={setSelectedTask}
              />
            </View>
          </>
        ) : (
          <View style={styles.flex}>
            <CalendarView tasks={allTasksForCalendar} onTaskPress={setSelectedTask} />
          </View>
        )}
      </View>

      <FloatingAddButton onPress={() => setAddModalVisible(true)} />

      <AddTaskModal
        visible={addModalVisible}
        onAdd={addTask}
        onClose={() => setAddModalVisible(false)}
      />

      <BurgerMenu
        visible={burgerVisible}
        archivedCount={archivedCount}
        onClose={() => setBurgerVisible(false)}
        onArchive={() => setArchiveVisible(true)}
      />

      <ArchiveScreen
        visible={archiveVisible}
        tasks={archivedTasks}
        onRestore={restoreTask}
        onDelete={deleteTask}
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
