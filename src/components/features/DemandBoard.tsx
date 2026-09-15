"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { noteRequestCreated } from "@/lib/analytics";
import { interpolate } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/locale";
import {
  FEATURED_CAR_MORNING_ID,
  IMPORTED_OFFERS_KEY,
  OFFERS_KEY,
  OFFER_REQUESTS_KEY,
  copyText,
  decodeSharePayload,
  formatCad,
  formatHourFr,
  looksLikeEmail,
  looksLikePhone,
  mailtoHref,
  mergeBrowseOffers,
  offerFromSharePayload,
  parseOfferKindQuery,
  paypalMeUrl,
  smsHref,
  type CommunityOffer,
  type OfferKind,
  type OfferRequest,
} from "@/lib/offers";
import { uid } from "@/lib/storage";
import { useStoredList } from "@/lib/useStoredList";

const fieldClass =
  "tap rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-normal text-snow outline-none focus:border-gold";

function kindLabel(
  kind: OfferKind,
  copy: { typeCarMorning: string; typeHotspot: string; typeUxSession: string },
) {
  if (kind === "hotspot") return copy.typeHotspot;
  if (kind === "ux_session") return copy.typeUxSession;
  return copy.typeCarMorning;
}

export function DemandBoard() {
  return (
    <Suspense fallback={null}>
      <DemandBoardInner />
    </Suspense>
  );
}

function DemandBoardInner() {
  const { locale, m } = useI18n();
  const copy = m.offers;
  const searchParams = useSearchParams();
  const [owned] = useStoredList<CommunityOffer>(OFFERS_KEY);
  const [imported, setImported] = useStoredList<CommunityOffer>(IMPORTED_OFFERS_KEY);
  const [requests, setRequests] = useStoredList<OfferRequest>(OFFER_REQUESTS_KEY);
  const [pickedId, setPickedId] = useState<string | null | false>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [copied, setCopied] = useState("");
  const [formError, setFormError] = useState("");

  const fromUrl = useMemo(() => {
    const raw = searchParams.get("o");
    if (!raw) return null;
    const payload = decodeSharePayload(raw);
    return payload ? offerFromSharePayload(payload) : null;
  }, [searchParams]);

  const offers = useMemo(
    () => mergeBrowseOffers(owned, imported, fromUrl),
    [fromUrl, imported, owned],
  );

  const today = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const queryKind = parseOfferKindQuery(searchParams.get("kind"));
  const queryTarget =
    fromUrl?.id ??
    (queryKind
      ? (offers.find((item) => item.kind === queryKind)?.id ?? null)
      : null);
  const activeId = pickedId === false ? null : (pickedId ?? queryTarget);
  const paid = offers.find((item) => item.id === paidId) ?? null;

  function onRequest(event: FormEvent<HTMLFormElement>, offer: CommunityOffer) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    const contact = String(data.get("contact") || "").trim();
    const date = String(data.get("date") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name) {
      setFormError(copy.nameRequired);
      return;
    }
    if (!contact) {
      setFormError(copy.contactRequired);
      return;
    }
    if (!date) {
      setFormError(copy.dateRequired);
      return;
    }
    const next: OfferRequest = {
      id: uid(),
      offerId: offer.id,
      offerTitle: offer.title,
      name,
      contact,
      date,
      message,
      createdAt: new Date().toISOString(),
    };
    setRequests([next, ...requests]);
    if (fromUrl && fromUrl.id === offer.id) {
      setImported([fromUrl, ...imported.filter((item) => item.id !== fromUrl.id)]);
    }
    setPaidId(offer.id);
    setFormError("");
    noteRequestCreated(offer.kind);
    event.currentTarget.reset();
  }

  async function copyValue(label: string, value: string) {
    const ok = await copyText(value);
    if (ok) setCopied(label);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-ice/85">{copy.terms}</p>

      {offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-3">
          <p className="text-sm leading-relaxed text-snow/75">{copy.browseEmpty}</p>
          <p className="mt-2 text-center text-xs">
            <Link href="/mes-services" className="font-bold text-gold underline decoration-gold/50 underline-offset-2">
              {m.nav.mesServices}
            </Link>
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {offers.map((offer) => {
          const open = activeId === offer.id;
          const showPay = paidId === offer.id;
          return (
            <li
              key={offer.id}
              id={`offer-${offer.id}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {offer.id === FEATURED_CAR_MORNING_ID ? (
                  <span className="rounded-full bg-ice/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ice">
                    {copy.featuredBadge}
                  </span>
                ) : (
                  <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-gold">
                    {kindLabel(offer.kind, copy)}
                  </span>
                )}
                <p className="font-bold">{offer.title}</p>
              </div>
              <p className="mt-1 text-xs text-ice/80">
                {interpolate(copy.windowLine, {
                  from: formatHourFr(offer.windowFrom),
                  to: formatHourFr(offer.windowTo),
                })}{" "}
                · {formatCad(offer.priceCad, locale)}{" "}
                {offer.kind === "car_morning" ? copy.perMorning : copy.perSession}
                {offer.neighborhood ? ` · ${offer.neighborhood}` : ""}
                {offer.kind === "car_morning" && offer.gasBorrowerPays ? ` · ${copy.gasBadge}` : ""}
              </p>
              {offer.notes ? (
                <p className="mt-1 text-sm leading-relaxed text-snow/80">{offer.notes}</p>
              ) : null}

              <button
                type="button"
                className="tap mt-3 w-full rounded-full bg-cobalt text-sm font-extrabold text-snow"
                onClick={() => {
                  setPickedId(open && !showPay ? false : offer.id);
                  setFormError("");
                }}
              >
                {open ? copy.closeRequest : copy.request}
              </button>

              {open && !showPay ? (
                <form onSubmit={(event) => onRequest(event, offer)} className="mt-3 grid gap-3">
                  <p className="text-sm font-bold">{copy.requesting}</p>
                  <label className="grid gap-1 text-sm font-semibold">
                    {copy.yourName}
                    <input name="name" required autoComplete="name" className={fieldClass} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    {copy.yourContact}
                    <input
                      name="contact"
                      required
                      autoComplete="tel"
                      inputMode="email"
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    {copy.date}
                    <input name="date" type="date" min={today} required className={fieldClass} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    {copy.message}
                    <textarea
                      name="message"
                      rows={3}
                      placeholder={copy.messagePh}
                      className={`${fieldClass} min-h-[88px] py-2`}
                    />
                  </label>
                  {formError ? <p className="text-sm text-gold">{formError}</p> : null}
                  <button type="submit" className="tap rounded-full bg-gold font-extrabold text-night">
                    {copy.sendRequest}
                  </button>
                </form>
              ) : null}

              {showPay ? <PaymentPanel offer={offer} copied={copied} onCopy={copyValue} /> : null}
            </li>
          );
        })}
      </ul>

      {paid && requests[0] ? (
        <ConfirmLinks offer={paid} request={requests[0]} />
      ) : null}

      <section className="space-y-2">
        <h3 className="text-base font-extrabold">{copy.yourRequests}</h3>
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-3">
            <p className="text-sm leading-relaxed text-snow/75">{copy.emptyRequests}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {requests.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                <p className="font-bold">{item.offerTitle}</p>
                <p className="text-xs text-ice/80">
                  {item.date} · {item.name} · {item.contact}
                </p>
                {item.message ? <p className="mt-1 text-snow/80">{item.message}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-snow/55">
        <Link href="/mes-services" className="underline decoration-gold/50 underline-offset-2">
          {m.nav.mesServices}
        </Link>
      </p>
    </div>
  );
}

function PaymentPanel({
  offer,
  copied,
  onCopy,
}: {
  offer: CommunityOffer;
  copied: string;
  onCopy: (label: string, value: string) => void;
}) {
  const { locale, m } = useI18n();
  const copy = m.offers;
  const amount = formatCad(offer.priceCad, locale);
  const amountRaw = String(offer.priceCad);

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-3">
      <p className="text-sm font-extrabold text-gold">{copy.paymentTitle}</p>
      <p className="text-sm leading-relaxed text-snow/90">
        {interpolate(offer.kind === "car_morning" ? copy.paymentAmount : copy.paymentAmountGeneric, {
          amount,
        })}
      </p>
      {offer.kind === "car_morning" ? (
        <p className="text-sm leading-relaxed text-snow/90">{copy.paymentGas}</p>
      ) : null}
      <p className="text-sm leading-relaxed text-snow/90">
        {offer.interacContact
          ? interpolate(copy.paymentTo, { contact: offer.interacContact })
          : copy.paymentToUnknown}
      </p>
      <p className="text-xs leading-relaxed text-ice/85">{copy.paymentConfirm}</p>
      <p className="text-xs leading-relaxed text-snow/70">{copy.terms}</p>
      <div className="grid gap-2">
        <button
          type="button"
          className="tap rounded-full bg-cobalt text-sm font-extrabold text-snow"
          onClick={() => onCopy("amount", amountRaw)}
        >
          {copied === "amount" ? copy.copied : copy.copyAmount}
        </button>
        {offer.interacContact ? (
          <button
            type="button"
            className="tap rounded-full border border-white/20 bg-white/5 text-sm font-bold"
            onClick={() => onCopy("interac", offer.interacContact)}
          >
            {copied === "interac" ? copy.copied : copy.copyInterac}
          </button>
        ) : null}
        {offer.paypalMe ? (
          <a
            href={paypalMeUrl(offer.paypalMe)}
            target="_blank"
            rel="noreferrer"
            className="tap flex items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-sm font-extrabold text-gold"
          >
            {copy.paypalPay}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ConfirmLinks({ offer, request }: { offer: CommunityOffer; request: OfferRequest }) {
  const { m } = useI18n();
  const copy = m.offers;
  const subject = interpolate(copy.requestMailSubject, { title: offer.title });
  const body = interpolate(copy.requestMailBody, {
    title: offer.title,
    date: request.date,
    name: request.name,
    contact: request.contact,
    message: request.message || "—",
  });
  const provider = offer.interacContact;
  const mail = provider && looksLikeEmail(provider) ? mailtoHref(provider, subject, body) : "";
  const sms = provider && looksLikePhone(provider) ? smsHref(provider, `${subject}\n\n${body}`) : "";

  if (!mail && !sms) return <p className="text-sm text-gold">{copy.requestSaved}</p>;

  return (
    <div className="grid gap-2">
      <p className="text-sm text-gold">{copy.requestSaved}</p>
      {mail ? (
        <a
          href={mail}
          className="tap flex items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm font-bold"
        >
          {copy.mailProvider}
        </a>
      ) : null}
      {sms ? (
        <a
          href={sms}
          className="tap flex items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm font-bold"
        >
          {copy.smsProvider}
        </a>
      ) : null}
    </div>
  );
}
