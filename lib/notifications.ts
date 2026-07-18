import type { DoseLog, QuietHours, Settings } from "./types";
import { getCompound } from "@/content/compounds";

/**
 * Local dose reminders. Notifications are scheduled by handing the service
 * worker a set of (id, title, body, at) messages; the SW fires them with
 * setTimeout while the app/PWA is alive. This is the "when installed" path; the
 * in-app Due Doses list is the always-reliable fallback.
 */

export function notificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** True if the given time falls inside the quiet-hours window (handles wrap past midnight). */
export function isWithinQuietHours(date: Date, quiet?: QuietHours): boolean {
  if (!quiet) return false;
  const mins = date.getHours() * 60 + date.getMinutes();
  const start = toMinutes(quiet.start);
  const end = toMinutes(quiet.end);
  if (start === end) return false;
  return start < end ? mins >= start && mins < end : mins >= start || mins < end;
}

async function controller(): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.active;
}

/**
 * Schedule notifications for today's still-pending doses that are in the future,
 * skipping any that fall in quiet hours. Clears nothing else; the SW replaces a
 * timer if the same dose id is scheduled again.
 */
export async function scheduleDoseReminders(
  logs: DoseLog[],
  settings: Settings,
): Promise<{ scheduled: number; reason?: string }> {
  if (!settings.notificationsEnabled) return { scheduled: 0, reason: "disabled" };
  if (!notificationsSupported() || Notification.permission !== "granted") {
    return { scheduled: 0, reason: "no-permission" };
  }
  const sw = await controller();
  if (!sw) return { scheduled: 0, reason: "no-sw" };

  const now = Date.now();
  let scheduled = 0;
  for (const l of logs) {
    if (l.status !== "pending") continue;
    if (l.scheduledAt <= now) continue;
    if (isWithinQuietHours(new Date(l.scheduledAt), settings.quietHours)) continue;
    const name = getCompound(l.compoundId)?.name ?? l.compoundId;
    sw.postMessage({
      type: "SCHEDULE_DOSE",
      id: l.id,
      title: "Dose due",
      body: `${name} · ${l.dose} ${l.unit}`,
      at: l.scheduledAt,
    });
    scheduled += 1;
  }
  return { scheduled };
}

/** Fire a test notification immediately so the user can confirm it works. */
export async function sendTestNotification(): Promise<boolean> {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const sw = await controller();
  if (!sw) return false;
  sw.postMessage({
    type: "SCHEDULE_DOSE",
    id: "test-notification",
    title: "Reminders are on",
    body: "This is what a dose reminder will look like.",
    at: Date.now() + 1000,
  });
  return true;
}
