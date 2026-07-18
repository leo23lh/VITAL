"use client";

import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "@/lib/db";
import { ensureDayLogs } from "@/lib/tracker";
import {
  notificationsSupported,
  requestNotificationPermission,
  scheduleDoseReminders,
  sendTestNotification,
} from "@/lib/notifications";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    getSettings().then(setSettings);
    if (notificationsSupported()) setPermission(Notification.permission);
  }, []);

  if (!settings) return <p className="text-sm text-[var(--foreground)]/50">Loading…</p>;

  const supported = notificationsSupported();

  async function toggleNotifications(enabled: boolean) {
    if (enabled) {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setStatus("Notifications were blocked in the browser. The in-app list still works.");
        const s = await updateSettings({ notificationsEnabled: false });
        setSettings(s);
        return;
      }
    }
    const s = await updateSettings({ notificationsEnabled: enabled });
    setSettings(s);
    if (enabled) {
      const { logs } = await ensureDayLogs(Date.now());
      const res = await scheduleDoseReminders(logs, s);
      setStatus(
        res.scheduled > 0
          ? `Scheduled ${res.scheduled} reminder(s) for today's upcoming doses.`
          : "Reminders on. No upcoming doses to schedule right now.",
      );
    } else {
      setStatus("Reminders turned off. Your in-app due-doses list still works.");
    }
  }

  async function updateQuiet(part: "start" | "end", value: string) {
    const quietHours = {
      start: part === "start" ? value : (settings!.quietHours?.start ?? "22:00"),
      end: part === "end" ? value : (settings!.quietHours?.end ?? "07:00"),
    };
    setSettings(await updateSettings({ quietHours }));
  }

  async function test() {
    const ok = await sendTestNotification();
    setStatus(ok ? "Test notification sent." : "Could not send — check permission below.");
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          Reminders, quiet hours, and your disclaimer acknowledgment.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Dose reminders</h2>
            <p className="mt-1 text-sm text-[var(--foreground)]/60">
              Local notifications for upcoming doses when the app is open or installed.
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              disabled={!supported}
              checked={settings.notificationsEnabled}
              onChange={(e) => toggleNotifications(e.target.checked)}
            />
            <div className="h-6 w-11 rounded-full bg-black/20 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-brand-600 peer-checked:after:translate-x-5 dark:bg-white/20" />
          </label>
        </div>

        {!supported && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
            This browser doesn&apos;t support notifications. The in-app due-doses list is your
            reminder here.
          </p>
        )}

        <div className="rounded-lg bg-black/[0.03] p-3 text-xs text-[var(--foreground)]/60 dark:bg-white/[0.03]">
          On iPhone/iPad, notifications only work after you add this app to your Home Screen
          (Share → Add to Home Screen), on iOS 16.4+. The in-app list always works regardless.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Quiet hours start</span>
            <input
              type="time"
              value={settings.quietHours?.start ?? "22:00"}
              onChange={(e) => updateQuiet("start", e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Quiet hours end</span>
            <input
              type="time"
              value={settings.quietHours?.end ?? "07:00"}
              onChange={(e) => updateQuiet("end", e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
            />
          </label>
        </div>
        <p className="text-xs text-[var(--foreground)]/50">
          Reminders won&apos;t fire during quiet hours.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={test}
            disabled={!supported || permission !== "granted"}
            className="rounded-lg border border-black/15 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-white/15"
          >
            Send test notification
          </button>
          <span className="text-xs text-[var(--foreground)]/50">Permission: {permission}</span>
        </div>

        {status && <p className="text-sm text-brand-600 dark:text-brand-300">{status}</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <h2 className="font-semibold">Disclaimer</h2>
        <p className="text-sm text-[var(--foreground)]/60">
          You acknowledged that this app is educational and not medical advice
          {settings.acknowledgedDisclaimerAt
            ? ` on ${new Date(settings.acknowledgedDisclaimerAt).toLocaleDateString()}.`
            : "."}
        </p>
        <button
          onClick={async () => setSettings(await updateSettings({ acknowledgedDisclaimerAt: undefined }))}
          className="rounded-lg border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
        >
          Show disclaimer again
        </button>
      </section>
    </div>
  );
}
