import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
  Pressable,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Task, TaskDate } from '../types/task';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';

const SCREEN_W = Dimensions.get('window').width;

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date}  ⏰ ${time}`;
}

function formatTaskDate(d: TaskDate): string {
  if (d.type === 'range' && d.end) {
    return `${fmtDateTime(d.start)}  →  ${fmtDateTime(d.end)}`;
  }
  return fmtDateTime(d.start);
}

// ─── props ────────────────────────────────────────────────────────────────────
interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onPress?: () => void;
  onLongPress?: () => void;
  onUncomplete?: (id: string) => void;
  isDragging?: boolean;
  onDragHandleTouch: () => void;
  onDragHandleRelease: () => void;
  isSelecting?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  isCompleted?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function TaskItem({
  task,
  onComplete,
  onArchive,
  onDelete,
  onPress,
  onLongPress,
  onUncomplete,
  isDragging = false,
  onDragHandleTouch,
  onDragHandleRelease,
  isSelecting = false,
  isSelected = false,
  onSelect,
  isCompleted = false,
}: TaskItemProps) {
  const { colors } = useTheme();
  const longPressHandled = useRef(false);
  const checkScale      = useRef(new Animated.Value(1)).current;
  const checkFill       = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const checkMarkScale  = useRef(new Animated.Value(isCompleted ? 1 : 0)).current;
  const itemOpacity     = useRef(new Animated.Value(1)).current;
  const dropAnim        = useRef(new Animated.Value(0)).current;
  const menuBtnRef      = useRef<React.ElementRef<typeof TouchableOpacity>>(null);

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 });

  const checkBorderColor = checkFill.interpolate({
    inputRange: [0, 1], outputRange: [colors.border, '#00B894'],
  });

  function handleComplete() {
    if (isCompleted) {
      // reverse: uncheck animation then restore
      Animated.parallel([
        Animated.spring(checkMarkScale, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 0 }),
        Animated.timing(checkFill,      { toValue: 0, duration: 180, useNativeDriver: false }),
      ]).start(() => onUncomplete?.(task.id));
      return;
    }
    Animated.parallel([
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.35, useNativeDriver: true, speed: 50, bounciness: 14 }),
        Animated.spring(checkScale, { toValue: 1,    useNativeDriver: true, speed: 30 }),
      ]),
      Animated.timing(checkFill,      { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.spring(checkMarkScale, { toValue: 1, useNativeDriver: true, bounciness: 16, speed: 18, delay: 80 }),
    ]).start(() => {
      setTimeout(() => onComplete(task.id), 260);
    });
  }

  function handleDelete() {
    setMenuVisible(false);
    Animated.timing(itemOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      .start(() => onDelete(task.id));
  }

  function handleArchive() {
    setMenuVisible(false);
    onArchive(task.id);
  }

  function openMenu() {
    menuBtnRef.current?.measure((_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
      setMenuPos({ top: pageY + h + 6, right: SCREEN_W - pageX - w });
      setMenuVisible(true);
      dropAnim.setValue(0);
      Animated.spring(dropAnim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 4,
        speed: 20,
      }).start();
    });
  }

  function closeMenu() {
    setMenuVisible(false);
  }

  const dropScale   = dropAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const dropOpacity = dropAnim;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : isDragging ? colors.primary : colors.border,
          opacity: itemOpacity,
        },
        isDragging ? Shadow.md : Shadow.sm,
        isSelected && { backgroundColor: colors.primaryLight },
      ]}
    >
      {/* Drag handle / selection circle */}
      {isSelecting ? (
        <TouchableOpacity
          style={styles.dragHandle}
          onPress={onSelect}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        >
          <View style={[
            styles.selectionCircle,
            { borderColor: isSelected ? colors.primary : colors.border },
            isSelected && { backgroundColor: colors.primary },
          ]}>
            {isSelected && <Text style={styles.selectionCheck}>✓</Text>}
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={styles.dragHandle}
          onTouchStart={onDragHandleTouch}
          onTouchEnd={onDragHandleRelease}
          onTouchCancel={onDragHandleRelease}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
        >
          <View style={styles.dotsGrid}>
            {[0, 1, 2].map((row) => (
              <View key={row} style={styles.dotsRow}>
                <View style={[styles.dot, { backgroundColor: isDragging ? colors.primary : colors.textSecondary }]} />
                <View style={[styles.dot, { backgroundColor: isDragging ? colors.primary : colors.textSecondary }]} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Complete checkbox */}
      <TouchableOpacity onPress={handleComplete} activeOpacity={0.7} style={styles.checkArea}>
        {/* Outer: scale — native driver */}
        <Animated.View style={{ transform: [{ scale: checkScale }] }}>
          {/* Border color — JS driver */}
          <Animated.View style={[styles.checkbox, { borderColor: checkBorderColor, backgroundColor: colors.surface }]}>
            {/* Gradient fill — JS driver opacity */}
            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 3, opacity: checkFill }]}>
              <LinearGradient
                colors={['#00C896', '#00B4D8']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            {/* Check icon — native driver scale */}
            <Animated.View style={{ transform: [{ scale: checkMarkScale }], zIndex: 1 }}>
              <Feather name="check" size={13} color="#fff" strokeWidth={3} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      {/* Title + date badge */}
      <TouchableOpacity
        style={styles.titleArea}
        onPress={() => {
          if (longPressHandled.current) {
            longPressHandled.current = false;
            return;
          }
          if (isSelecting) onSelect?.();
          else onPress?.();
        }}
        onLongPress={isSelecting ? undefined : () => {
          longPressHandled.current = true;
          onLongPress?.();
        }}
        activeOpacity={0.6}
      >
        <Text
          style={[
            styles.title,
            { color: isCompleted ? colors.completed : colors.textPrimary },
            isCompleted && styles.titleStrikethrough,
          ]}
          numberOfLines={3}
        >
          {task.title}
        </Text>
        {task.taskDate && (
          <View style={[styles.dateBadge, { backgroundColor: isSelected ? colors.surface : colors.primaryLight }]}>
            <Text style={styles.dateIcon}>📅</Text>
            <Text style={[styles.dateText, { color: colors.primary }]}>
              {formatTaskDate(task.taskDate)}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ⋮ Action button (hidden when selecting) */}
      {!isSelecting && (
        <TouchableOpacity
          ref={menuBtnRef}
          onPress={openMenu}
          activeOpacity={0.7}
          style={styles.menuArea}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.menuButton, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.menuDots, { color: colors.textSecondary }]}>⋮</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Dropdown modal */}
      <Modal visible={menuVisible} transparent animationType="none" onRequestClose={closeMenu}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
        <Animated.View
          style={[
            styles.dropdown,
            {
              top: menuPos.top,
              right: menuPos.right,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              transform: [{ scale: dropScale }],
              opacity: dropOpacity,
            },
            Shadow.md,
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            onPress={handleArchive}
            activeOpacity={0.75}
            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
          >
            <Feather name="archive" size={16} color={colors.textPrimary} />
            <Text style={[styles.dropdownLabel, { color: colors.textPrimary }]}>Archive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.75}
            style={styles.dropdownItem}
          >
            <Feather name="trash-2" size={16} color={colors.danger} />
            <Text style={[styles.dropdownLabel, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </Animated.View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
  },

  // Drag handle
  dragHandle: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsGrid: { gap: 4 },
  dotsRow:  { flexDirection: 'row', gap: 3 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheck: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', lineHeight: 14 },

  titleStrikethrough: { textDecorationLine: 'line-through' },

  // Checkbox
  checkArea: { marginRight: Spacing.sm },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15,
  },

  // Title
  titleArea: { flex: 1, paddingRight: Spacing.xs },
  title: { ...Typography.bodyMedium, lineHeight: 22 },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  dateIcon: { fontSize: 11 },
  dateText: { ...Typography.caption, fontWeight: '500' },

  // Action button
  menuArea: { marginLeft: Spacing.xs },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDots: { fontSize: 18, lineHeight: 20, fontWeight: '700' },

  // Dropdown
  dropdown: {
    position: 'absolute',
    width: 160,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  dropdownIcon:  { fontSize: 16 },
  dropdownLabel: { ...Typography.bodyMedium },
});
