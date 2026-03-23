"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const BANNER_KEY = "medspa_banner_dismissed";

export default function DailyReminderBanner() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const today = new Date().toDateString();
    const dismissed = sessionStorage.getItem(BANNER_KEY);
    if (dismissed === today) return;

    const userId = session.user.id;
    const from = new Date();
    from.setHours(0, 0, 0, 0);

    fetch(`/api/transactions?performedById=${userId}&from=${from.toISOString()}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length === 0) setShow(true);
      })
      .catch(() => {});
  }, [status, session]);

  function dismiss() {
    sessionStorage.setItem(BANNER_KEY, new Date().toDateString());
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3">
      <span className="text-amber-600 text-sm">⚠</span>
      <p className="text-sm text-amber-800 flex-1">
        No usage logged today.{" "}
        <Link href="/log" className="font-medium underline underline-offset-2 hover:text-amber-900">
          Tap to log →
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-amber-500 hover:text-amber-700 text-lg leading-none p-1"
      >
        ×
      </button>
    </div>
  );
}
