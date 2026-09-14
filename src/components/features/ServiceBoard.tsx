"use client";

import { FormEvent, useMemo, useState } from "react";
import { uid } from "@/lib/storage";
import {
  COLLATERAL_STATUS_LABEL,
  CURRENCIES,
  RATE_UNIT_LABEL,
  SERVICES,
  SERVICE_SEEDS,
  formatMoney,
  sideLabel,
  type CollateralStatus,
  type ListingSide,
  type RateUnit,
  type ServiceKind,
  type ServiceListing,
} from "@/lib/services";
import { useSeededList } from "@/lib/useStoredList";

type Filter = "tous" | ListingSide;

const fieldClass =
  "tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

export function ServiceBoard({ kind }: { kind: ServiceKind }) {
  const def = SERVICES[kind];
  const [items, setItems] = useSeededList<ServiceListing>(
    def.storageKey,
    SERVICE_SEEDS[kind],
  );
  const [filter, setFilter] = useState<Filter>("tous");
  const [saved, setSaved] = useState(false);

  const visible = useMemo(
    () => (filter === "tous" ? items : items.filter((item) => item.side === filter)),
    [filter, items],
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const side = String(data.get("side") || "offre") as ListingSide;
    const next: ServiceListing = {
      id: uid(),
      service: kind,
      side: side === "demande" ? "demande" : "offre",
      title: String(data.get("title") || "").trim(),
      description: String(data.get("description") || "").trim(),
      neighborhood: String(data.get("neighborhood") || "").trim(),
      radiusKm: Number(data.get("radiusKm") || 3),
      price: Number(data.get("price") || 0),
      currency: String(data.get("currency") || "CAD"),
      rateUnit: String(data.get("rateUnit") || def.rateUnits[0]) as RateUnit,
      createdAt: new Date().toISOString(),
    };
    if (!next.title) return;

    if (def.hasCollateral) {
      next.objectName = String(data.get("objectName") || "").trim();
      next.collateralAmount = Number(data.get("collateralAmount") || 0);
      next.collateralCurrency = String(data.get("collateralCurrency") || next.currency);
      next.collateralStatus = "proposee";
      if (!next.objectName || !next.collateralAmount) return;
    }

    setItems([next, ...items]);
    setSaved(true);
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Type d’annonce</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="tap flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 text-sm font-semibold">
              <input type="radio" name="side" value="offre" defaultChecked className="accent-gold" />
              Offre
            </label>
            <label className="tap flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 text-sm font-semibold">
              <input type="radio" name="side" value="demande" className="accent-gold" />
              Demande
            </label>
          </div>
        </fieldset>

        <Field name="title" label="Titre" required placeholder="Ex. Courses du samedi" />
        {def.hasCollateral ? (
          <Field name="objectName" label="Objet prêté ou emprunté" required placeholder="Perceuse, tente, vélo…" />
        ) : null}
        <label className="grid gap-1 text-sm font-semibold">
          Description
          <textarea name="description" rows={3} className={`${fieldClass} min-h-[88px] py-2`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="neighborhood" label="Quartier" placeholder="Plateau, Rosemont…" required />
          <label className="grid gap-1 text-sm font-semibold">
            Rayon
            <select name="radiusKm" defaultValue="3" className={fieldClass}>
              <option value="1">1 km</option>
              <option value="3">3 km</option>
              <option value="5">5 km</option>
              <option value="10">10 km</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field name="price" label="Tarif" type="number" min="0" step="0.5" placeholder="0" />
          <label className="grid gap-1 text-sm font-semibold">
            Devise
            <select name="currency" defaultValue="CAD" className={fieldClass}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Unité
            <select name="rateUnit" defaultValue={def.rateUnits[0]} className={fieldClass}>
              {def.rateUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {RATE_UNIT_LABEL[unit]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {def.hasCollateral ? (
          <div className="grid gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-3">
            <p className="text-sm leading-relaxed text-gold">
              Caution (dépôt) : montant convenu entre les parties. Aucun paiement n’est prélevé
              pour l’instant — l’accord est seulement enregistré.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                name="collateralAmount"
                label="Montant de la caution"
                type="number"
                min="1"
                step="1"
                required
              />
              <label className="grid gap-1 text-sm font-semibold">
                Devise de la caution
                <select name="collateralCurrency" defaultValue="CAD" className={fieldClass}>
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        <button type="submit" className="tap rounded-full bg-cobalt font-extrabold text-snow">
          Publier dans Open-Community
        </button>
        {saved ? (
          <p className="text-sm text-gold">
            Annonce enregistrée sur cet appareil. Une API pourra la reprendre plus tard.
          </p>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-2">
        {(["tous", "offre", "demande"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`tap rounded-full px-4 text-sm font-bold ${
              filter === value
                ? "bg-gold text-night"
                : "border border-white/15 bg-white/5 text-snow"
            }`}
          >
            {value === "tous" ? "Toutes" : value === "offre" ? "Offres" : "Demandes"}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {visible.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                  item.side === "offre" ? "bg-ice/20 text-ice" : "bg-gold/20 text-gold"
                }`}
              >
                {sideLabel(item.side)}
              </span>
              <p className="font-bold">{item.title}</p>
            </div>
            {item.objectName ? (
              <p className="mt-1 text-sm font-semibold text-ice">Objet : {item.objectName}</p>
            ) : null}
            {item.description ? (
              <p className="mt-1 text-sm leading-relaxed text-snow/80">{item.description}</p>
            ) : null}
            <p className="mt-2 text-xs text-ice/80">
              {item.neighborhood} · {item.radiusKm} km ·{" "}
              {item.price === 0
                ? "Gratuit"
                : `${formatMoney(item.price, item.currency)} ${RATE_UNIT_LABEL[item.rateUnit]}`}
            </p>
            {item.collateralAmount != null && item.collateralCurrency ? (
              <CollateralLine
                amount={item.collateralAmount}
                currency={item.collateralCurrency}
                status={item.collateralStatus ?? "proposee"}
              />
            ) : null}
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="text-sm text-snow/60">Aucune annonce pour ce filtre.</li>
        ) : null}
      </ul>
    </div>
  );
}

function CollateralLine({
  amount,
  currency,
  status,
}: {
  amount: number;
  currency: string;
  status: CollateralStatus;
}) {
  return (
    <p className="mt-2 rounded-xl border border-gold/25 bg-gold/10 px-2 py-1.5 text-xs leading-relaxed text-gold">
      Caution {formatMoney(amount, currency)} · {COLLATERAL_STATUS_LABEL[status]} (accord, pas
      d’escrow réel)
    </p>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
  type = "text",
  min,
  step,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
  min?: string;
  step?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        className={fieldClass}
      />
    </label>
  );
}
