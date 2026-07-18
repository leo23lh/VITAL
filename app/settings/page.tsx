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
import { Disclaimer } from "@/components/Disclaimer";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    getSettings().then(setSettings);
    if (notificationsSupported()) setPermission(Notification.permission);
  }, []);

  if (!settings) return <p className="font-sans text-[13px] text-muted">Loading…</p>;

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
    <div>
      <p className="eyebrow">Settings</p>
      <h1 className="mt-3 font-serif text-[38px] font-bold text-ink">Settings</h1>
      <p className="mt-3 max-w-[640px] font-serif text-[15px] italic leading-[1.6] text-body">
        Dose reminders, quiet hours, and your disclaimer acknowledgment.
      </p>

      <section className="mt-10 max-w-[640px]">
        <h2 className="section-head">Dose reminders</h2>

        <div className="mt-5 flex items-start justify-between gap-4">
          <p className="font-sans text-[13px] leading-[1.5] text-body">
            Local notifications for upcoming doses when the app is open or installed.
          </p>
          <label className="flex shrink-0 items-center gap-2 font-sans text-[13px] text-ink">
            <input
              type="checkbox"
              disabled={!supported}
              checked={settings.notificationsEnabled}
              onChange={(e) => toggleNotifications(e.target.checked)}
              className="h-4 w-4 accent-ink disabled:opacity-40"
            />
            Enabled
          </label>
        </div>

        {!supported && (
          <div className="mt-5">
            <Disclaimer title="Notifications unavailable">
              <p>
                This browser doesn&apos;t support notifications. The in-app due-doses list is your
                reminder here.
              </p>
            </Disclaimer>
          </div>
        )}

        <p className="mt-5 font-sans text-[12px] leading-[1.5] text-muted">
          On iPhone/iPad, notifications only work after you add this app to your Home Screen
          (Share → Add to Home Screen), on iOS 16.4+. The in-app list always works regardless.
        </p>

        <div className="mt-6 grid max-w-sm grid-cols-2 gap-4">
          <label className="block">
            <span className="font-sans text-[11px] uppercase tracking-wide text-muted">
              Quiet hours start
            </span>
            <input
              type="time"
              value={settings.quietHours?.start ?? "22:00"}
              onChange={(e) => updateQuiet("start", e.target.value)}
              className="mt-1 w-full border border-rule bg-transparent px-2.5 py-2 font-sans text-[13px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
            />
          </label>
          <label className="block">
            <span className="font-sans text-[11px] uppercase tracking-wide text-muted">
              Quiet hours end
            </span>
            <input
              type="time"
              value={settings.quietHours?.end ?? "07:00"}
              onChange={(e) => updateQuiet("end", e.target.value)}
              className="mt-1 w-full border border-rule bg-transparent px-2.5 py-2 font-sans text-[13px] text-ink outline-none focus:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
            />
          </label>
        </div>
        <p className="mt-2 font-sans text-[12px] text-muted">
          Reminders won&apos;t fire during quiet hours.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-rule pt-6">
          <button
            onClick={test}
            disabled={!supported || permission !== "granted"}
            className="btn-secondary disabled:opacity-40"
          >
            Send test notification
          </button>
          <span className="font-sans text-[12px] text-muted">Permission: {permission}</span>
        </div>

        {status && <p className="mt-3 font-sans text-[13px] text-rust">{status}</p>}
      </section>

      <section className="mt-12 max-w-[640px]">
        <h2 className="section-head">Disclaimer</h2>
        <p className="mt-5 font-sans text-[13px] leading-[1.5] text-body">
          You acknowledged that this app is educational and not medical advice
          {settings.acknowledgedDisclaimerAt
            ? ` on ${new Date(settings.acknowledgedDisclaimerAt).toLocaleDateString()}.`
            : "."}
        </p>
        <button
          onClick={async () =>
            setSettings(await updateSettings({ acknowledgedDisclaimerAt: undefined }))
          }
          className="btn-secondary mt-4"
        >
          Show disclaimer again
        </button>
      </section>
    </div>
  );
}
