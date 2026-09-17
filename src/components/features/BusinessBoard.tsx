"use client";

import { FormEvent, useState } from "react";
import { postBusinessAdToInbox } from "@/lib/business-ad-inbox";
import {
  AD_IMAGE_MAX_KB,
  prepareAdImage,
  type PreparedAdImage,
} from "@/lib/compress-ad-image";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import { readLocalProfile } from "@/lib/local-profile";
import { usePlace } from "@/lib/place";
import { uid } from "@/lib/storage";
import { useStoredList } from "@/lib/useStoredList";

type Business = {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string;
  contactEmail?: string;
  imageDataUrl?: string;
  imageBytes?: number;
  reviewStatus?: "pending" | "local_only";
};

const KEY = "xsnow.businesses";

export function BusinessBoard() {
  const [items, setItems] = useStoredList<Business>(KEY);
  const [saved, setSaved] = useState(false);
  const [inboxStatus, setInboxStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [photo, setPhoto] = useState<PreparedAdImage | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const { m } = useI18n();
  const { city: placeCity } = usePlace();
  const copy = m.business;
  const kb = String(AD_IMAGE_MAX_KB);

  async function onPhotoChange(file: File | undefined) {
    setPhotoError("");
    setPhoto(null);
    if (!file) return;
    setPhotoBusy(true);
    const result = await prepareAdImage(file);
    setPhotoBusy(false);
    if (result.ok) {
      setPhoto(result.value);
      return;
    }
    if (result.reason === "too_large") setPhotoError(interpolate(copy.photoTooBig, { kb }));
    else if (result.reason === "undecodable") setPhotoError(copy.photoUndecodable);
    else setPhotoError(copy.photoNotImage);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next: Business = {
      id: uid(),
      name: String(data.get("name") || "").trim(),
      category: String(data.get("category") || "").trim(),
      city: String(data.get("city") || "").trim() || placeCity || "",
      description: String(data.get("description") || "").trim(),
      contactEmail: String(data.get("contactEmail") || "").trim(),
    };
    if (!next.name) return;
    if (!photo) {
      setPhotoError(copy.photoRequired);
      return;
    }
    if (!next.contactEmail) return;

    next.imageDataUrl = photo.dataUrl;
    next.imageBytes = photo.bytes;
    next.reviewStatus = "pending";

    setInboxStatus("sending");
    const profile = readLocalProfile();
    const result = await postBusinessAdToInbox({
      id: next.id,
      name: next.name,
      category: next.category,
      city: next.city,
      description: next.description,
      contactEmail: next.contactEmail,
      opcId: profile?.id || "",
      imageDataUrl: photo.dataUrl,
      imageBytes: photo.bytes,
    });
    setInboxStatus(result === "sent" ? "sent" : "failed");
    if (result !== "sent") {
      next.reviewStatus = "local_only";
    }

    setItems([next, ...items]);
    setSaved(true);
    setPhoto(null);
    setPhotoError("");
    event.currentTarget.reset();
  }

  return (
    <div className="space-y-5" data-business-board>
      {copy.reviewLead ? (
        <p className="text-sm leading-snug text-snow/85">{copy.reviewLead}</p>
      ) : null}
      <form onSubmit={(event) => void onSubmit(event)} className="grid gap-3">
        <Field name="name" label={copy.name} required />
        <Field name="category" label={copy.category} placeholder={copy.categoryPh} />
        <Field name="city" label={copy.city} placeholder={copy.cityPh} />
        <Field
          name="contactEmail"
          label={copy.contactEmail}
          placeholder={copy.contactEmailPh}
          required
          type="email"
        />
        <label className="grid gap-1 text-sm font-semibold">
          {copy.description}
          <textarea
            name="description"
            rows={3}
            className="min-h-[88px] rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-normal text-snow outline-none focus:border-gold"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          {copy.photo}
          <span className="text-xs font-normal text-ice/80">{copy.photoHint}</span>
          <input
            data-ad-photo-input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            required
            onChange={(event) => void onPhotoChange(event.currentTarget.files?.[0])}
            className="tap max-w-full text-xs font-normal text-snow file:mr-2 file:rounded-full file:border-0 file:bg-cobalt file:px-3 file:py-1 file:text-xs file:font-extrabold file:text-snow"
          />
        </label>
        {photoBusy ? <p className="text-xs text-ice/80">{copy.photoBusy}</p> : null}
        {photo ? (
          <div className="space-y-2" data-ad-photo-ready>
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img
              src={photo.dataUrl}
              alt=""
              className="max-h-48 w-full rounded-xl object-cover object-center"
            />
            <p className="text-xs font-semibold text-gold">
              {interpolate(copy.photoReady, { kb: String(Math.ceil(photo.bytes / 1024)) })}
            </p>
          </div>
        ) : null}
        {photoError ? (
          <p className="text-xs font-semibold text-gold" data-ad-photo-error role="alert">
            {photoError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={photoBusy || inboxStatus === "sending"}
          className="tap rounded-full bg-cobalt font-extrabold text-snow disabled:opacity-60"
        >
          {inboxStatus === "sending" ? copy.sending : copy.publish}
        </button>
        {saved ? (
          <p className="text-sm text-gold" role="status">
            {inboxStatus === "sent" ? copy.savedSent : copy.savedLocal}
          </p>
        ) : null}
      </form>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="font-bold">{item.name}</p>
            <p className="text-xs text-ice/80">
              {item.category || copy.fallbackCategory} · {item.city || copy.fallbackCity}
              {item.reviewStatus === "pending" ? ` · ${copy.statusPending}` : null}
              {item.reviewStatus === "local_only" ? ` · ${copy.statusLocal}` : null}
            </p>
            {item.description ? (
              <p className="mt-1 text-sm text-snow/80">{item.description}</p>
            ) : null}
            {item.imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- visitor data-URL
              <img
                src={item.imageDataUrl}
                alt=""
                className="mt-2 max-h-40 w-full rounded-xl object-cover object-top"
              />
            ) : null}
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
  type = "text",
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold"
      />
    </label>
  );
}
