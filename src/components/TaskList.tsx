import React, { useRef, useState } from 'react';
import { View, ScrollView, PanResponder, Animated, StyleSheet } from 'react-native';
import { Task } from '../types/task';
import TaskItem from './TaskItem';
import EmptyState from './EmptyState';
import { Spacing, Shadow } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface TaskListProps {
  tasks: Task[];
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (tasks: Task[]) => void;
  onPress?: (task: Task) => void;
}

export default function TaskList({ tasks, onComplete, onArchive, onDelete, onReorder, onPress }: TaskListProps) {
  const { colors } = useTheme();

  // ── Drag state (also mirrored in refs to avoid stale closures) ──────────────
  const [fromIndex, setFromIndex] = useState<number | null>(null);
  const [toIndex, setToIndex]     = useState<number | null>(null);

  const fromRef  = useRef<number | null>(null);
  const toRef    = useRef<number | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  // Which drag handle is being pressed
  const touchedHandle = useRef<number | null>(null);

  // Absolute Y of the outer container (to convert pageY → container-relative Y)
  const containerRef     = useRef<View>(null);
  const containerPageY   = useRef(0);
  const scrollRef        = useRef<ScrollView>(null);
  const scrollOffset     = useRef(0);

  // Layout of each item in the list (Y relative to scroll content, height)
  const itemLayouts = useRef<{ y: number; height: number }[]>([]);

  // Ghost follows the finger
  const ghostY = useRef(new Animated.Value(0)).current;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function pageYToIndex(pageY: number): number {
    const relY = pageY - containerPageY.current + scrollOffset.current;
    const count = tasksRef.current.length;
    for (let i = 0; i < count; i++) {
      const lay = itemLayouts.current[i];
      if (!lay) continue;
      if (relY < lay.y + lay.height / 2) return i;
    }
    return Math.max(0, count - 1);
  }

  function finishDrag() {
    const from = fromRef.current;
    const to   = toRef.current;
    touchedHandle.current = null;
    fromRef.current       = null;
    toRef.current         = null;
    setFromIndex(null);
    setToIndex(null);
    if (from !== null && to !== null && from !== to) {
      const arr = [...tasksRef.current];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      onReorder(arr);
    }
  }

  // ── Single PanResponder on the outer container ───────────────────────────────
  // Only activates when a drag handle is touched.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: ()    => touchedHandle.current !== null,
      onMoveShouldSetPanResponder:  (_, gs) =>
        touchedHandle.current !== null && Math.abs(gs.dy) > 5,

      onPanResponderGrant: () => {
        const idx = touchedHandle.current;
        if (idx === null) return;
        // Measure container page position for accurate coordinate conversion
        containerRef.current?.measure((_x, _y, _w, _h, _px, py) => {
          containerPageY.current = py;
        });
        const lay   = itemLayouts.current[idx];
        const initY = (lay ? lay.y : idx * 72) - scrollOffset.current;
        ghostY.setValue(initY);
        fromRef.current = idx;
        toRef.current   = idx;
        setFromIndex(idx);
        setToIndex(idx);
      },

      onPanResponderMove: (e, gs) => {
        if (fromRef.current === null) return;
        const lay   = itemLayouts.current[fromRef.current];
        const baseY = (lay ? lay.y : fromRef.current * 72) - scrollOffset.current;
        ghostY.setValue(baseY + gs.dy);
        const newTo = pageYToIndex(e.nativeEvent.pageY);
        if (newTo !== toRef.current) {
          toRef.current = newTo;
          setToIndex(newTo);
        }
      },

      onPanResponderRelease:   finishDrag,
      onPanResponderTerminate: finishDrag,
    })
  ).current;

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isDragging  = fromIndex !== null;
  const draggedTask = fromIndex !== null ? tasks[fromIndex] : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View
      ref={containerRef}
      style={styles.flex}
      onLayout={() => {
        containerRef.current?.measure((_x, _y, _w, _h, _px, py) => {
          containerPageY.current = py;
        });
      }}
      {...panResponder.panHandlers}
    >
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!isDragging}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={tasks.length === 0 ? styles.emptyContent : undefined}
      >
        <View style={styles.listHeader} />

        {tasks.length === 0 ? (
          <EmptyState />
        ) : (
          tasks.map((task, index) => {
            const isDraggedItem = isDragging && fromIndex === index;
            const showIndicatorAbove =
              isDragging && toIndex === index && fromIndex! > index;
            const showIndicatorBelow =
              isDragging && toIndex === index && fromIndex! < index;

            return (
              <View
                key={task.id}
                onLayout={(e) => {
                  // Don't update layout measurements while a drag is in progress
                  if (fromRef.current !== null) return;
                  itemLayouts.current[index] = {
                    y: e.nativeEvent.layout.y,
                    height: e.nativeEvent.layout.height,
                  };
                }}
              >
                {showIndicatorAbove && (
                  <View style={[styles.dropIndicator, { backgroundColor: colors.primary }]} />
                )}

                <View style={isDraggedItem ? styles.placeholder : undefined}>
                  <TaskItem
                    task={task}
                    onComplete={onComplete}
                    onArchive={onArchive}
                    onDelete={onDelete}
                    onPress={onPress ? () => onPress(task) : undefined}
                    isDragging={isDraggedItem}
                    onDragHandleTouch={() => { touchedHandle.current = index; }}
                    onDragHandleRelease={() => {
                      if (fromRef.current === null) touchedHandle.current = null;
                    }}
                  />
                </View>

                {showIndicatorBelow && (
                  <View style={[styles.dropIndicator, { backgroundColor: colors.primary }]} />
                )}
              </View>
            );
          })
        )}

        <View style={styles.listFooter} />
      </ScrollView>

      {/* Ghost — floating copy of the dragged item */}
      {draggedTask && (
        <Animated.View
          style={[styles.ghost, Shadow.md, { transform: [{ translateY: ghostY }] }]}
          pointerEvents="none"
        >
          <TaskItem
            task={draggedTask}
            onComplete={() => {}}
            onArchive={() => {}}
            onDelete={() => {}}
            isDragging
            onDragHandleTouch={() => {}}
            onDragHandleRelease={() => {}}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  listHeader:   { height: Spacing.sm },
  listFooter:   { height: Spacing.xl * 3 },
  emptyContent: { flexGrow: 1 },
  placeholder:  { opacity: 0 },
  dropIndicator: {
    height: 3,
    borderRadius: 2,
    marginHorizontal: Spacing.lg,
    marginVertical: 2,
  },
  ghost: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
});
