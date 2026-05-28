"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { eventIcon, formatDateTime } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.timeline(0, 100).then((res) => {
      setEvents(res.items);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Timeline активности</h1>
        <p className="mt-1 text-slate-500">История ваших действий и событий</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <EmptyState
            title="Лента пуста"
            description="Здесь появятся задачи, KPI и загрузки отчётов"
          />
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 hidden h-full w-px bg-brand-200 sm:block" />
          <ul className="space-y-4">
            {events.map((e, i) => (
              <li key={e.id} className="relative sm:pl-14">
                <span className="absolute left-3 top-4 hidden h-4 w-4 rounded-full border-2 border-brand-500 bg-white sm:block" />
                <Card
                  className={`transition ${i === 0 ? "ring-2 ring-brand-500/20" : ""}`}
                >
                  <div className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
                      {eventIcon(e.event_type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                        {e.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {e.description ?? "Событие"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDateTime(e.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
