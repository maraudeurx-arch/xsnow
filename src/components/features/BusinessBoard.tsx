"use client";

import { FormEvent, useState } from "react";
import { uid } from "@/lib/storage";
import { useStoredList } from "@/lib/useStoredList";

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string;
};

const KEY = "xsnow.businesses";

export function BusinessBoard() {
  const [items, setItems] = useStoredList<Business>(KEY);
  const [saved, setSaved] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Business = {
      id: uid(),
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "").trim(),
      city: String(data.get("city") || "").trim(),
      description: String(data.get("description") || "").trim(),
    };
    if (!next.name) return;
    setItems([next, ...items]);
    setSaved(true);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field name="name" label="Nom du commerce" required />
        <Field name="category" label="Catégorie" placeholder="Café, réparation, services…" />
        <Field name="city" label="Ville ou quartier" placeholder="Plateau, Rosemont…" />
        <label className="grid gap-1 text-sm font-semibold">
          Description
          <textarea
            name="description"
            rows={3}
            className="min-h-[88px] rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold"
          />
        </label>
        <button type="submit" className="tap rounded-full bg-gold font-extrabold text-night">
          Publier dans Open-Community
        </button>
        {saved ? (
          <p className="text-sm text-gold">Enregistré sur cet appareil. La vitrine publique arrive bientôt.</p>
        ) : null}
      </form>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">{item.name}</p>
            <p className="text-xs text-ice/80">
              {item.category || "Commerce"} · {item.city || "Quartier"}
            </p>
            {item.description ? <p className="mt-1 text-sm text-snow/80">{item.description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
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
        className="tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold"
      />
    </label>
  );
}
