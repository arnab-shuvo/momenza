import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Typography } from '../theme';

type ViewMode = 'list' | 'calendar';

interface HeaderProps {
  activeCount: number;
  viewMode: ViewMode;
  onToggleView: () => void;
  onMenuPress: () => void;
}

export default function Header({
  activeCount,
  viewMode,
  onToggleView,
  onMenuPress,
}: HeaderProps) {
  const { colors } = useTheme();

  const label =
    activeCount === 0
      ? 'All done! Great work 🎉'
      : activeCount === 1
        ? '1 task remaining'
        : `${activeCount} tasks remaining`;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.top}>
        {/* Gradient accent bar */}
        <LinearGradient
          colors={['#A78BFA', '#5B5FED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accent}
        />

        {/* Right controls: toggle + burger */}
        <View style={styles.rightControls}>
          {/* View toggle pill */}
          <View
            style={[
              styles.togglePill,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <ToggleSegment active={viewMode === 'list'} onPress={onToggleView}>
              <ListIcon
                color={viewMode === 'list' ? '#fff' : colors.textSecondary}
              />
            </ToggleSegment>

            <View
              style={[styles.toggleDivider, { backgroundColor: colors.border }]}
            />

            <ToggleSegment
              active={viewMode === 'calendar'}
              onPress={onToggleView}
            >
              <CalendarIcon
                color={viewMode === 'calendar' ? '#fff' : colors.textSecondary}
              />
            </ToggleSegment>
          </View>

          {/* Burger menu button */}
          <TouchableOpacity
            style={[
              styles.menuBtn,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            onPress={onMenuPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.burgerLines}>
              <View
                style={[styles.line, { backgroundColor: colors.textPrimary }]}
              />
              <View
                style={[
                  styles.line,
                  styles.lineMid,
                  { backgroundColor: colors.textPrimary },
                ]}
              />
              <View
                style={[styles.line, { backgroundColor: colors.textPrimary }]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]}>Momenza</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── ToggleSegment ────────────────────────────────────────────────────────────
function ToggleSegment({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  colors?: any;
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

// ─── Icons (drawn with Views for consistency with the burger lines) ────────────
function ListIcon({ color }: { color: string }) {
  return (
    <View style={{ gap: 3.5, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 16,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: 11,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: 16,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
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
      {/* Header bar */}
      <View style={{ height: 5, backgroundColor: color }} />
      {/* Grid rows */}
      <View style={{ flex: 1, padding: 2, gap: 1.5 }}>
        <View style={{ flexDirection: 'row', gap: 1.5, flex: 1 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: color,
                borderRadius: 0.5,
                opacity: 0.75,
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 1.5, flex: 1 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: color,
                borderRadius: 0.5,
                opacity: 0.75,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  accent: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 20,
  },

  // Toggle pill
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

  // Burger button
  menuBtn: {
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
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
  },
});
