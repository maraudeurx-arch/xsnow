"use client";

import { FormEvent } from "react";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { uid } from "@/lib/storage";
import { useStoredList } from "@/lib/useStoredList";

type Zone = {
  id: string;
  person: string;
  relation: string;
  place: string;
  radius: string;
};

const KEY = "xsnow.alerts";

export function AlertBoard() {
  const [items, setItems] = useStoredList<Zone>(KEY);
  const { m } = useI18n();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Zone = {
      id: uid(),
      person: String(data.get("person") || "").trim(),
      relation: String(data.get("relation") || "").trim(),
      place: String(data.get("place") || "").trim(),
      radius: String(data.get("radius") || "").trim(),
    };
    if (!next.person || !next.place) return;
    setItems([next, ...items]);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="grid gap-3">
        <Input name="person" label={m.alerts.person} required />
        <label className="grid gap-1 text-sm font-semibold">
          {m.alerts.relation}
          <select
            name="relation"
            className="tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal outline-none focus:border-gold"
            defaultValue="enfant"
          >
            <option value="enfant">{m.alerts.child}</option>
            <option value="conjoint">{m.alerts.partner}</option>
            <option value="grands-parents">{m.alerts.grandparents}</option>
            <option value="autre">{m.alerts.other}</option>
          </select>
        </label>
        <Input name="place" label={m.alerts.place} required />
        <Input name="radius" label={m.alerts.radius} placeholder={m.alerts.radiusPh} />
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          {m.alerts.submit}
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">
              {item.person}{" "}
              <span className="text-xs font-semibold uppercase tracking-wide text-gold">
              {item.relation === "enfant"
                ? m.alerts.child
                : item.relation === "conjoint"
                  ? m.alerts.partner
                  : item.relation === "grands-parents"
                    ? m.alerts.grandparents
                    : m.alerts.other}
              </span>
            </p>
            <p className="text-sm text-snow/80">
              {interpolate(m.alerts.zone, { place: item.place })}
              {item.radius ? ` · ${item.radius}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Input({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal outline-none focus:border-gold"
      />
    </label>
  );
}
