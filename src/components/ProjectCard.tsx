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
import { Project } from '../types/project';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Shadow, Typography } from '../theme';

const SCREEN_W = Dimensions.get('window').width;

interface ProjectCardProps {
  project: Project;
  taskCount: number;
  dueTodayCount?: number;
  onPress: () => void;
  onLongPress?: () => void;
  onEdit: (project: Project) => void;
  onShare: (project: Project) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  isSelecting?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function ProjectCard({
  project,
  taskCount,
  dueTodayCount = 0,
  onPress,
  onLongPress,
  onEdit,
  onShare,
  onArchive,
  onDelete,
  isSelecting = false,
  isSelected  = false,
  onSelect,
}: ProjectCardProps) {
  const { colors } = useTheme();
  const longPressHandled = useRef(false);
  const menuBtnRef  = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const dropAnim    = useRef(new Animated.Value(0)).current;
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPos, setMenuPos]         = useState({ top: 0, right: 0 });

  function openMenu() {
    menuBtnRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
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
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
        Shadow.sm,
        isSelected && { borderWidth: 2 },
      ]}
      onPress={() => {
        if (longPressHandled.current) { longPressHandled.current = false; return; }
        if (isSelecting) { onSelect?.(); } else { onPress(); }
      }}
      onLongPress={() => { longPressHandled.current = true; onLongPress?.(); }}
      activeOpacity={0.75}
    >
      <View style={[styles.colorBar, { backgroundColor: project.color }]} />

      <View style={styles.content}>
        <View style={styles.row}>
          {isSelecting ? (
            <View style={[
              styles.checkbox,
              { borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: isSelected ? colors.primary : 'transparent' },
            ]}>
              {isSelected && <Feather name="check" size={12} color="#fff" />}
            </View>
          ) : (
            <View style={[styles.colorDot, { backgroundColor: project.color }]} />
          )}
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
            {project.name}
          </Text>
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
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.taskCount, { color: colors.textSecondary }]}>
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
          </Text>
          {dueTodayCount > 0 && (
            <View style={styles.dueTodayBadge}>
              <Text style={styles.dueTodayText}>
                🔴 {dueTodayCount} due today
              </Text>
            </View>
          )}
        </View>
      </View>

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
            onPress={() => { closeMenu(); onEdit(project); }}
            activeOpacity={0.75}
            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
          >
            <Text style={styles.dropdownIcon}>✏️</Text>
            <Text style={[styles.dropdownLabel, { color: colors.textPrimary }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { closeMenu(); onShare(project); }}
            activeOpacity={0.75}
            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
          >
            <Feather name="share-2" size={16} color={colors.textPrimary} style={styles.dropdownFeather} />
            <Text style={[styles.dropdownLabel, { color: colors.textPrimary }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { closeMenu(); onArchive(project.id); }}
            activeOpacity={0.75}
            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
          >
            <Text style={styles.dropdownIcon}>📦</Text>
            <Text style={[styles.dropdownLabel, { color: colors.textPrimary }]}>Archive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { closeMenu(); onDelete(project.id); }}
            activeOpacity={0.75}
            style={styles.dropdownItem}
          >
            <Text style={styles.dropdownIcon}>🗑</Text>
            <Text style={[styles.dropdownLabel, { color: colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    flex: 1,
    ...Typography.bodyMedium,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.sm + 10,
  },
  taskCount: {
    ...Typography.caption,
  },
  dueTodayBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  dueTodayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D63031',
  },
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
  dropdownIcon:    { fontSize: 16 },
  dropdownFeather: { width: 16 },
  dropdownLabel:   { ...Typography.bodyMedium },
});
