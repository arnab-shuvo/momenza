import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, Typography } from '../theme';
import { TaskDate } from '../types/task';

interface ImportPayload {
  title: string;
  description?: string;
  taskDate?: TaskDate;
}

interface QRPayload {
  tasks: ImportPayload[];
  projectName?: string;
  projectColor?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (tasks: ImportPayload[], projectName?: string, projectColor?: string) => void;
}

function mapTasks(arr: any[]): ImportPayload[] {
  return arr.map((item: any) => ({
    title: item.t,
    ...(item.d ? { description: item.d } : {}),
    ...(item.s ? { taskDate: { type: item.dt ?? 'single', start: item.s, ...(item.e ? { end: item.e } : {}) } as TaskDate } : {}),
  }));
}

function decodePayload(url: string): QRPayload | null {
  try {
    if (!url.startsWith('momenza://import')) return null;
    const raw = url.split('?d=')[1];
    if (!raw) return null;
    const json = decodeURIComponent(Array.from(atob(raw), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    const parsed = JSON.parse(json);

    // Array of tasks (no project)
    if (Array.isArray(parsed)) {
      return { tasks: mapTasks(parsed) };
    }

    // Single project object
    const obj = parsed as { tasks?: unknown[]; pn?: string; pc?: string };
    return {
      tasks: mapTasks(Array.isArray(obj.tasks) ? obj.tasks : []),
      ...(obj.pn ? { projectName: obj.pn } : {}),
      ...(obj.pc ? { projectColor: obj.pc } : {}),
    };
  } catch {
    return null;
  }
}

export default function QRScannerModal({ visible, onClose, onImport }: Props) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => { if (visible) setScanned(false); }, [visible]);

  function handleBarcode({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    const payload = decodePayload(data);

    if (!payload || payload.tasks.length === 0) {
      Alert.alert('Invalid QR', 'This QR code was not created by Momenza.', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
        { text: 'Cancel',     onPress: onClose },
      ]);
      return;
    }

    const { tasks, projectName, projectColor } = payload;
    const projectInfo = projectName ? ` into "${projectName}"` : '';
    Alert.alert(
      'Import Tasks',
      `Import ${tasks.length} task${tasks.length > 1 ? 's' : ''}${projectInfo}?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
        {
          text: 'Import',
          onPress: () => { onImport(tasks, projectName, projectColor); onClose(); },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

        <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan QR Code</Text>
          <View style={styles.closeBtn} />
        </View>

        {!permission ? (
          <View style={styles.center}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>Checking camera permission…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Feather name="camera-off" size={48} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>Camera permission required</Text>
            <TouchableOpacity
              style={[styles.permBtn, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarcode}
          >
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.viewfinder}>
                  <View style={[styles.corner, styles.topLeft]}  />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.botLeft]}  />
                  <View style={[styles.corner, styles.botRight]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                <Text style={styles.scanHint}>
                  {scanned ? 'Processing…' : 'Point at a Momenza QR code'}
                </Text>
              </View>
            </View>
          </CameraView>
        )}

      </SafeAreaView>
    </Modal>
  );
}

const VF = 260;
const CORNER = 22;
const CORNER_T = 3;
const CORNER_C = '#fff';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 10,
  },
  closeBtn: { width: 36 },
  title: { flex: 1, textAlign: 'center', ...Typography.h2, color: '#fff' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    padding: Spacing.xl,
    backgroundColor: '#000',
  },
  infoText: { ...Typography.body, textAlign: 'center' },
  permBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  permBtnText: { color: '#fff', ...Typography.bodyMedium },

  overlay: { flex: 1 },
  overlayTop:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: VF },
  overlaySide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  viewfinder:    { width: VF, height: VF },
  scanHint: { color: 'rgba(255,255,255,0.85)', ...Typography.body },

  corner: { position: 'absolute', width: CORNER, height: CORNER },
  topLeft:  { top: 0, left: 0,  borderTopWidth: CORNER_T,    borderLeftWidth: CORNER_T,    borderTopLeftRadius: 4,     borderColor: CORNER_C },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_T,    borderRightWidth: CORNER_T,   borderTopRightRadius: 4,    borderColor: CORNER_C },
  botLeft:  { bottom: 0, left: 0,  borderBottomWidth: CORNER_T, borderLeftWidth: CORNER_T, borderBottomLeftRadius: 4,  borderColor: CORNER_C },
  botRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_T, borderRightWidth: CORNER_T, borderBottomRightRadius: 4, borderColor: CORNER_C },
});
