import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Typography } from '../theme';

type ViewMode = 'list' | 'calendar';

interface HeaderProps {
  activeCount: number;
  viewMode: ViewMode;
  onToggleView: () => void;
  onMenuPress: () => void;
  onScanQR: () => void;
  projectName?: string;
  projectColor?: string;
  onBack?: () => void;
}

export default function Header({
  activeCount,
  viewMode,
  onToggleView,
  onMenuPress,
  onScanQR,
  projectName,
  projectColor,
  onBack,
}: HeaderProps) {
  const { colors } = useTheme();

  const isInsideProject = !!projectName;

  const label = isInsideProject
    ? (activeCount === 0
        ? 'All done! Great work 🎉'
        : activeCount === 1
          ? '1 task remaining'
          : `${activeCount} tasks remaining`)
    : (activeCount === 0
        ? 'All done! Great work 🎉'
        : activeCount === 1
          ? '1 task remaining'
          : `${activeCount} tasks remaining`);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      {/* Controls row — always full width */}
      <View style={styles.row}>
        {isInsideProject && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.circleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          /* Home: show app title on the left */
          <View style={styles.homeTitleArea}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Momenza</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
          </View>
        )}

        <View style={styles.spacer} />

        <View style={styles.rightControls}>
          <View style={[styles.togglePill, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ToggleSegment active={viewMode === 'list'} onPress={onToggleView}>
              <ListIcon color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
            </ToggleSegment>
            <View style={[styles.toggleDivider, { backgroundColor: colors.border }]} />
            <ToggleSegment active={viewMode === 'calendar'} onPress={onToggleView}>
              <CalendarIcon color={viewMode === 'calendar' ? '#fff' : colors.textSecondary} />
            </ToggleSegment>
          </View>

          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={onScanQR}
            activeOpacity={0.7}
          >
            <Feather name="maximize" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={onMenuPress}
            activeOpacity={0.7}
          >
            <View style={styles.burgerLines}>
              <View style={[styles.line, { backgroundColor: colors.textPrimary }]} />
              <View style={[styles.line, styles.lineMid, { backgroundColor: colors.textPrimary }]} />
              <View style={[styles.line, { backgroundColor: colors.textPrimary }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Project info — only when inside a project */}
      {isInsideProject && (
        <View style={styles.projectInfo}>
          <View style={styles.projectNameRow}>
            {projectColor && (
              <View style={[styles.projectColorDot, { backgroundColor: projectColor }]} />
            )}
            <Text style={[styles.projectTitle, { color: colors.textPrimary }]}>
              {projectName}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

function ToggleSegment({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  if (active) {
    return (
      <LinearGradient
        colors={['#A78BFA', '#5B5FED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.segment}
      >
        <TouchableOpacity
          onPress={onPress}
          style={styles.segmentInner}
          activeOpacity={0.85}
        >
          {children}
        </TouchableOpacity>
      </LinearGradient>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.segment}
      activeOpacity={0.65}
    >
      {children}
    </TouchableOpacity>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <View style={{ gap: 3.5, alignItems: 'flex-start' }}>
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 11, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: color,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: 5, backgroundColor: color }} />
      <View style={{ flex: 1, padding: 2, gap: 1.5 }}>
        <View style={{ flexDirection: 'row', gap: 1.5, flex: 1 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, backgroundColor: color, borderRadius: 0.5, opacity: 0.75 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 1.5, flex: 1 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flex: 1, backgroundColor: color, borderRadius: 0.5, opacity: 0.75 }} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleArea: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  homeTitleArea: {
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  projectInfo: {
    marginTop: Spacing.sm,
    gap: 2,
  },
  projectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  projectTitle: {
    ...Typography.h1,
    flexShrink: 1,
  },
  projectColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 0,
  },

  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    overflow: 'hidden',
  },
  segment: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentInner: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDivider: {
    width: 1,
    height: 26,
  },

  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burgerLines: {
    width: 18,
    height: 14,
    justifyContent: 'space-between',
  },
  line: {
    height: 2,
    borderRadius: 1,
  },
  lineMid: {
    width: 13,
  },

  title: {
    ...Typography.h1,
  },
  subtitle: {
    ...Typography.caption,
  },
});
