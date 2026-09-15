"use client";

import { FormEvent } from "react";
import { useI18n } from "@/lib/i18n/locale";
import { uid } from "@/lib/storage";
import { useStoredList } from "@/lib/useStoredList";

type Report = {
  id: string;
  brand: string;
  color: string;
  lastSeen: string;
  note: string;
};

const KEY = "xsnow.phones";

export function PhoneBoard() {
  const [items, setItems] = useStoredList<Report>(KEY);
  const { m } = useI18n();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Report = {
      id: uid(),
      brand: String(data.get("brand") || "").trim(),
      color: String(data.get("color") || "").trim(),
      lastSeen: String(data.get("lastSeen") || "").trim(),
      note: String(data.get("note") || "").trim(),
    };
    if (!next.brand) return;
    setItems([next, ...items]);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="grid gap-3">
        <Input name="brand" label={m.phone.brand} required />
        <Input name="color" label={m.phone.color} />
        <Input name="lastSeen" label={m.phone.lastSeen} placeholder={m.phone.lastSeenPh} />
        <Input name="note" label={m.phone.note} />
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          {m.phone.submit}
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">{item.brand}</p>
            <p className="text-xs text-ice/80">
              {item.color || m.phone.unknownColor} · {item.lastSeen || m.phone.unknownPlace}
            </p>
            {item.note ? <p className="mt-1 text-sm">{item.note}</p> : null}
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
