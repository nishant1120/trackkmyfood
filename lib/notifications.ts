import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Tag used to identify our reminder schedules so we can clear/replace them
// without nuking unrelated notifications.
const TAG_KEY = 'nutritrack_meal_reminder';

const REMINDERS: { hour: number; minute: number; title: string; body: string }[] = [
  {
    hour: 8,
    minute: 0,
    title: 'Good morning ☀️',
    body: 'Log your breakfast in NutriTrack to start the day on track.',
  },
  {
    hour: 13,
    minute: 0,
    title: 'Lunch break',
    body: "Don't forget to log what you're eating.",
  },
  {
    hour: 20,
    minute: 0,
    title: 'Dinner check-in',
    body: 'A quick log keeps your streak alive.',
  },
];

export type NotifSetupResult =
  | { kind: 'ok'; scheduledCount: number }
  | { kind: 'denied' }
  | { kind: 'unsupported' }
  | { kind: 'error'; message: string };

export async function enableMealReminders(): Promise<NotifSetupResult> {
  if (Platform.OS === 'web') {
    return { kind: 'unsupported' };
  }
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (!settings.granted) {
      const req = await Notifications.requestPermissionsAsync();
      if (!req.granted) return { kind: 'denied' };
    }
    // Clear any prior schedules so we don't stack duplicates
    await disableMealReminders();
    let scheduled = 0;
    for (const r of REMINDERS) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.body,
          data: { tag: TAG_KEY },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: r.hour,
          minute: r.minute,
        },
      });
      scheduled++;
    }
    return { kind: 'ok', scheduledCount: scheduled };
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function disableMealReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      const tag = (n.content?.data as { tag?: string } | undefined)?.tag;
      if (tag === TAG_KEY) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch {
    // Best-effort
  }
}
