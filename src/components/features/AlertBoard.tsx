"use client";

import { FormEvent } from "react";
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
        <Input name="person" label="Prénom" required />
        <label className="grid gap-1 text-sm font-semibold">
          Lien
          <select
            name="relation"
            className="tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal outline-none focus:border-gold"
            defaultValue="enfant"
          >
            <option value="enfant">Enfant</option>
            <option value="conjoint">Mari / conjoint</option>
            <option value="grands-parents">Grands-parents</option>
            <option value="autre">Autre proche</option>
          </select>
        </label>
        <Input name="place" label="Endroit où la personne doit être" required />
        <Input name="radius" label="Distance d’alerte" placeholder="200 m" />
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          Créer l’alerte
        </button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">
              {item.person}{" "}
              <span className="text-xs font-semibold uppercase tracking-wide text-gold">
                {item.relation}
              </span>
            </p>
            <p className="text-sm text-snow/80">
              Zone : {item.place}
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
