import React, { useRef, useState } from 'react';
import { View, ScrollView, PanResponder, Animated, StyleSheet, Text, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Task } from '../types/task';
import TaskItem from './TaskItem';
import EmptyState from './EmptyState';
import ShareQRModal from './ShareQRModal';
import { Spacing, Shadow, Typography, Radius } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface TaskListProps {
  tasks: Task[];
  completedTasks?: Task[];
  projectName?: string;
  projectColor?: string;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (tasks: Task[]) => void;
  onPress?: (task: Task) => void;
  onUncomplete?: (id: string) => void;
  onDeleteSelected?: (ids: string[]) => void;
  onArchiveSelected?: (ids: string[]) => void;
  onSelectingChange?: (isSelecting: boolean) => void;
  onAdd?: (title: string) => void;
}

export default function TaskList({
  tasks,
  completedTasks = [],
  projectName,
  projectColor,
  onComplete,
  onArchive,
  onDelete,
  onReorder,
  onPress,
  onUncomplete,
  onDeleteSelected,
  onArchiveSelected,
  onSelectingChange,
  onAdd,
}: TaskListProps) {
  const { colors } = useTheme();

  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareVisible, setShareVisible] = useState(false);

  // ── inline quick-add rows ───────────────────────────────────────────────────
  const [inlineInputs, setInlineInputs] = useState<string[]>([]);
  const inlineRefs = useRef<(TextInput | null)[]>([]);

  function addInlineRow() {
    const newIndex = inlineInputs.length;
    setInlineInputs(prev => [...prev, '']);
    setTimeout(() => inlineRefs.current[newIndex]?.focus(), 80);
  }

  function handleInlineChange(index: number, text: string) {
    setInlineInputs(prev => prev.map((v, i) => i === index ? text : v));
  }

  function handleInlineSubmit(index: number) {
    const text = inlineInputs[index].trim();
    if (text) onAdd?.(text);
    setInlineInputs(prev => prev.map((v, i) => i === index ? '' : v));
    inlineRefs.current[index]?.focus();
  }

  function removeInlineRow(index: number) {
    setInlineInputs(prev => prev.filter((_, i) => i !== index));
  }

  // ── selection ───────────────────────────────────────────────────────────────
  function enterSelecting(id: string) {
    setIsSelecting(true);
    setSelectedIds(new Set([id]));
    onSelectingChange?.(true);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function cancelSelecting() {
    setIsSelecting(false);
    setSelectedIds(new Set());
    onSelectingChange?.(false);
  }

  function toggleSelectAll() {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.id)));
    }
  }

  function deleteSelected() {
    const ids = [...selectedIds];
    setIsSelecting(false);
    setSelectedIds(new Set());
    onSelectingChange?.(false);
    onDeleteSelected?.(ids);
  }

  function archiveSelected() {
    const ids = [...selectedIds];
    setIsSelecting(false);
    setSelectedIds(new Set());
    onSelectingChange?.(false);
    onArchiveSelected?.(ids);
  }

  // ── drag-to-reorder ─────────────────────────────────────────────────────────
  const [fromIndex, setFromIndex] = useState<number | null>(null);
  const [toIndex, setToIndex]     = useState<number | null>(null);

  const fromRef  = useRef<number | null>(null);
  const toRef    = useRef<number | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const touchedHandle  = useRef<number | null>(null);
  const containerRef   = useRef<View>(null);
  const containerPageY = useRef(0);
  const scrollRef      = useRef<ScrollView>(null);
  const scrollOffset   = useRef(0);
  const itemLayouts    = useRef<{ y: number; height: number }[]>([]);
  const ghostY         = useRef(new Animated.Value(0)).current;

  function pageYToIndex(pageY: number): number {
    const relY  = pageY - containerPageY.current + scrollOffset.current;
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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: ()     => touchedHandle.current !== null,
      onMoveShouldSetPanResponder:  (_, gs) =>
        touchedHandle.current !== null && Math.abs(gs.dy) > 5,

      onPanResponderGrant: () => {
        const idx = touchedHandle.current;
        if (idx === null) return;
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

  const isDragging  = fromIndex !== null;
  const draggedTask = fromIndex !== null ? tasks[fromIndex] : null;

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
      {/* ── Quick-add: always pinned at top, never scrolls away ── */}
      {onAdd && (
        <View style={[styles.quickAddSection, { borderBottomColor: colors.border }]}>
          {inlineInputs.map((text, index) => (
            <View key={`inline-${index}`} style={[styles.inlineRow, { borderColor: colors.border }]}>
              <Feather name="square" size={20} color={colors.border} style={styles.inlineCheckbox} />
              <TextInput
                ref={(r) => { inlineRefs.current[index] = r; }}
                style={[styles.inlineInput, { color: colors.textPrimary }]}
                placeholder="Task title…"
                placeholderTextColor={colors.textSecondary}
                value={text}
                onChangeText={(v) => handleInlineChange(index, v)}
                onSubmitEditing={() => handleInlineSubmit(index)}
                returnKeyType="done"
                blurOnSubmit={false}
                autoFocus={index === inlineInputs.length - 1}
              />
              {text.trim().length > 0 && (
                <TouchableOpacity
                  onPress={() => handleInlineSubmit(index)}
                  activeOpacity={0.8}
                  style={styles.inlineSubmitBtn}
                >
                  <LinearGradient
                    colors={['#6C9EFF', '#4F6FFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inlineSubmitGradient}
                  >
                    <Feather name="check" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => removeInlineRow(index)}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemRow} onPress={addInlineRow} activeOpacity={0.6}>
            <Feather name="plus" size={18} color={colors.textSecondary} />
            <Text style={[styles.addItemLabel, { color: colors.textSecondary }]}>Quick add task</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        scrollEnabled={!isDragging}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={tasks.length === 0 && completedTasks.length === 0 ? styles.emptyContent : undefined}
      >
        <View style={styles.listHeader} />

        {tasks.length === 0 && completedTasks.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {tasks.map((task, index) => {
              const isDraggedItem      = isDragging && fromIndex === index;
              const showIndicatorAbove = isDragging && toIndex === index && fromIndex! > index;
              const showIndicatorBelow = isDragging && toIndex === index && fromIndex! < index;

              return (
                <View
                  key={task.id}
                  onLayout={(e) => {
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
                      onLongPress={() => enterSelecting(task.id)}
                      isDragging={isDraggedItem}
                      onDragHandleTouch={() => { touchedHandle.current = index; }}
                      onDragHandleRelease={() => {
                        if (fromRef.current === null) touchedHandle.current = null;
                      }}
                      isSelecting={isSelecting}
                      isSelected={selectedIds.has(task.id)}
                      onSelect={() => toggleSelect(task.id)}
                    />
                  </View>
                  {showIndicatorBelow && (
                    <View style={[styles.dropIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              );
            })}

            {completedTasks.length > 0 && (
              <>
                <View style={[styles.completedHeader, { borderTopColor: colors.border }]}>
                  <Text style={[styles.completedLabel, { color: colors.textSecondary }]}>
                    Completed
                  </Text>
                  <View style={[styles.completedBadge, { backgroundColor: colors.border }]}>
                    <Text style={[styles.completedBadgeText, { color: colors.textSecondary }]}>
                      {completedTasks.length}
                    </Text>
                  </View>
                </View>

                {completedTasks.map((task) => (
                  <View key={task.id} style={styles.completedItem}>
                    <TaskItem
                      task={task}
                      onComplete={onComplete}
                      onUncomplete={onUncomplete}
                      onArchive={onArchive}
                      onDelete={onDelete}
                      onPress={onPress ? () => onPress(task) : undefined}
                      isDragging={false}
                      onDragHandleTouch={() => {}}
                      onDragHandleRelease={() => {}}
                      isCompleted
                    />
                  </View>
                ))}
              </>
            )}
          </>
        )}

        <View style={styles.listFooter} />
      </ScrollView>

      {isSelecting && (
        <LinearGradient
          colors={['rgba(91,95,237,0)', 'rgba(91,95,237,0.12)', 'rgba(91,95,237,0.22)']}
          style={styles.selectionBarWrap}
          pointerEvents="box-none"
        >
          <View style={[styles.selectionBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={toggleSelectAll}
              activeOpacity={0.7}
              style={[
                styles.selectAllBox,
                {
                  borderColor: selectedIds.size === tasks.length ? colors.primary : colors.border,
                  backgroundColor: selectedIds.size === tasks.length ? colors.primary : 'transparent',
                },
              ]}
            >
              {selectedIds.size > 0 && (
                <Feather
                  name={selectedIds.size === tasks.length ? 'check' : 'minus'}
                  size={12}
                  color="#fff"
                />
              )}
            </TouchableOpacity>

            <View style={[styles.selectionCountBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.selectionCount, { color: colors.primary }]}>
                {selectedIds.size}
              </Text>
            </View>
            <Text style={[styles.selectionLabel, { color: colors.textSecondary }]}>selected</Text>

            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={[styles.selectionIconBtn, { backgroundColor: colors.primaryLight, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
                onPress={() => setShareVisible(true)}
                activeOpacity={0.75}
                disabled={selectedIds.size === 0}
              >
                <Feather name="share-2" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectionIconBtn, { backgroundColor: colors.primaryLight, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
                onPress={archiveSelected}
                activeOpacity={0.75}
                disabled={selectedIds.size === 0}
              >
                <Feather name="archive" size={18} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectionIconBtn, { backgroundColor: colors.dangerLight, opacity: selectedIds.size === 0 ? 0.4 : 1 }]}
                onPress={deleteSelected}
                activeOpacity={0.75}
                disabled={selectedIds.size === 0}
              >
                <Feather name="trash-2" size={18} color={colors.danger} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.selectionIconBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                onPress={cancelSelecting}
                activeOpacity={0.75}
              >
                <Feather name="x" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      )}

      <ShareQRModal
        visible={shareVisible}
        tasks={tasks.filter(t => selectedIds.has(t.id))}
        projectName={projectName}
        projectColor={projectColor}
        onClose={() => setShareVisible(false)}
      />

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
  flex:        { flex: 1 },
  listHeader:  { height: Spacing.sm },
  listFooter:  { height: Spacing.xl * 3 },
  emptyContent: { flexGrow: 1 },
  placeholder: { opacity: 0 },
  dropIndicator: {
    height: 3,
    borderRadius: 2,
    marginHorizontal: Spacing.lg,
    marginVertical: 2,
  },
  // ── quick-add section (pinned above scroll) ──
  quickAddSection: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.xs,
  },
  // ── inline add rows ──
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  inlineCheckbox: {
    marginRight: 2,
  },
  inlineInput: {
    flex: 1,
    ...Typography.body,
    lineHeight: 22,
    paddingVertical: 4,
  },
  inlineSubmitBtn: {
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  inlineSubmitGradient: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addItemLabel: {
    ...Typography.body,
  },
  // ── completed section ──
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  completedLabel: {
    ...Typography.captionMedium,
    letterSpacing: 0.5,
  },
  completedBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  completedBadgeText: { fontSize: 11, fontWeight: '600' },
  completedItem:      { opacity: 0.6 },
  ghost: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  // ── selection bar ──
  selectionBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.md,
  },
  selectAllBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCountBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  selectionCount:  { ...Typography.bodyMedium },
  selectionLabel:  { ...Typography.caption, flex: 1 },
  selectionActions: { flexDirection: 'row', gap: Spacing.sm },
  selectionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
