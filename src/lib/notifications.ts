import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_SUMMARY_ID = 'daily-summary';
const TASK_PREFIX = 'task-reminder-';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Momenza',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleDailySummary(taskCount: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_SUMMARY_ID);
    if (taskCount === 0) return;
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_SUMMARY_ID,
      content: {
        title: 'Good morning! ☀️',
        body: `You have ${taskCount} task${taskCount === 1 ? '' : 's'} due today`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
      },
    });
  } catch {}
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  dueTimestamp: number,
): Promise<void> {
  try {
    const triggerTime = dueTimestamp - 60 * 60 * 1000; // 1 hour before
    if (triggerTime <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: TASK_PREFIX + taskId,
      content: {
        title: '⏰ Task due soon',
        body: `"${title}" is due in 1 hour`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerTime),
      },
    });
  } catch {}
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(TASK_PREFIX + taskId);
  } catch {}
}
