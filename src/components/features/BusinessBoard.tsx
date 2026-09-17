"use client";

import { FormEvent, useState } from "react";
import { draftBusinessAd } from "@/lib/business-draft";
import { useI18n } from "@/lib/i18n/locale";
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
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const { locale, m } = useI18n();
  const copy = m.business;

  async function onDraft() {
    setDraftNote(null);
    setDrafting(true);
    try {
      const result = await draftBusinessAd({
        name,
        category,
        city,
        notes: description,
        locale,
      });
      if (!result.ok) {
        if (result.error === "no_facebook_scrape") {
          setDraftNote(copy.noFacebook);
        } else if (result.error === "bad_request") {
          setDraftNote(copy.draftNeedName);
        } else {
          setDraftNote(copy.draftError);
        }
        return;
      }
      setDescription(result.draft);
      setDraftNote(copy.draftReady);
    } catch {
      setDraftNote(copy.draftError);
    } finally {
      setDrafting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Business = {
      id: uid(),
      name: name.trim(),
      category: category.trim(),
      city: city.trim(),
      description: description.trim(),
    };
    if (!next.name) return;
    setItems([next, ...items]);
    setSaved(true);
    setName("");
    setCategory("");
    setCity("");
    setDescription("");
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="grid gap-3" data-business-form>
        <Field name="name" label={copy.name} value={name} onChange={setName} required />
        <Field
          name="category"
          label={copy.category}
          value={category}
          onChange={setCategory}
          placeholder={copy.categoryPh}
        />
        <Field
          name="city"
          label={copy.city}
          value={city}
          onChange={setCity}
          placeholder={copy.cityPh}
        />
        <label className="grid gap-1 text-sm font-semibold">
          {copy.description}
          <textarea
            name="description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-[88px] rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold"
          />
        </label>
        <p className="text-[11px] leading-snug text-ice/80">{copy.aiHint}</p>
        <button
          type="button"
          data-business-ai
          className="tap rounded-full border border-gold/55 bg-gold/10 font-extrabold text-gold disabled:opacity-50"
          disabled={drafting}
          onClick={() => void onDraft()}
        >
          {drafting ? copy.drafting : copy.draftCta}
        </button>
        {draftNote ? (
          <p className="text-sm text-gold" role="status" data-business-ai-status>
            {draftNote}
          </p>
        ) : null}
        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          {copy.publish}
        </button>
        {saved ? <p className="text-sm text-gold">{copy.saved}</p> : null}
      </form>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">{item.name}</p>
            <p className="text-xs text-ice/80">
              {item.category || copy.fallbackCategory} · {item.city || copy.fallbackCity}
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
  value,
  onChange,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold"
      />
    </label>
  );
}
