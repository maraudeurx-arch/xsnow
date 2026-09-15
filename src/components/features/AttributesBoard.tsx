"use client";

import { useState } from "react";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { useStoredList } from "@/lib/useStoredList";

const KEY = "xsnow.attributes";

export function AttributesBoard() {
  const [selected, setSelected] = useStoredList<string>(KEY);
  const [custom, setCustom] = useState("");
  const { m } = useI18n();

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((item) => item !== tag)
      : [...selected, tag];
    setSelected(next);
  }

  function addCustom() {
    const tag = custom.trim();
    if (!tag) return;
    if (!selected.includes(tag)) {
      setSelected([...selected, tag]);
    }
    setCustom("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {m.attributes.suggestions.map((tag) => {
          const on = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`tap rounded-full px-4 text-sm font-bold ${
                on ? "bg-gold text-night" : "border border-white/15 bg-white/5 text-snow"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder={m.attributes.other}
          className="tap flex-1 rounded-full border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={addCustom}
          className="tap rounded-full bg-cobalt px-4 font-extrabold text-snow"
        >
          {m.attributes.add}
        </button>
      </div>
      {selected.length ? (
        <p className="text-sm text-ice/80">
          {interpolate(m.attributes.yours, { list: selected.join(" · ") })}
        </p>
      ) : (
        <p className="text-sm text-snow/60">{m.attributes.none}</p>
      )}
    </div>
  );
}
