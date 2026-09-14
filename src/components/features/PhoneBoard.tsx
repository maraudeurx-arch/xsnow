"use client";

import { FormEvent } from "react";
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
        <Input name="brand" label="Marque / modèle" required />
        <Input name="color" label="Couleur / étui" />
        <Input name="lastSeen" label="Dernier endroit vu" placeholder="Bus 24, café, école…" />
        <Input name="note" label="Détail utile" />
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          Alerter la communauté
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">{item.brand}</p>
            <p className="text-xs text-ice/80">
              {item.color || "Couleur inconnue"} · {item.lastSeen || "Lieu inconnu"}
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
