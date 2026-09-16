"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/locale";
import { subscribeDurableStorage } from "@/lib/durable-storage";
import {
  brandingForPlace,
  coordsOnlyPlace,
  frenchVoiceLangFor,
  parseCityOverride,
  parseGeoPromptOverride,
  placeFromCityName,
  placeToKeepOnSkip,
  readConsent,
  readStoredPlace,
  reverseGeocode,
  sanitizeStoredPlace,
  unresolvedPlace,
  writeConsent,
  writeStoredPlace,
  type GeoConsent,
  type StoredPlace,
} from "@/lib/location";

const listeners = new Set<() => void>();

type Snapshot = {
  consent: GeoConsent;
  place: StoredPlace;
};

let cached: Snapshot | undefined;

function emit() {
  cached = undefined;
  listeners.forEach((listener) => listener());
}

function readSnapshot(): Snapshot {
  if (cached) return cached;
  const consent = readConsent();
  cached = {
    consent,
    place: sanitizeStoredPlace(readStoredPlace(), consent),
  };
  return cached;
}

function persist(consent: GeoConsent, place: StoredPlace) {
  writeConsent(consent);
  writeStoredPlace(place);
  emit();
}

export type PlaceSource = "fallback" | "stored" | "gps" | "override";

export type GeoErrorKind =
  | "unsupported"
  | "generic"
  | "denied"
  | "timeout"
  | "unavailable";

export type PlaceValue = {
  city: string;
  placeName: string;
  demonym: string;
  countryCode: string;
  localeHint: string;
  frenchVoiceLang: string;
  lat: number | null;
  lon: number | null;
  consent: GeoConsent;
  source: PlaceSource;
  ready: boolean;
  resolved: boolean;
  needsPrompt: boolean;
  locating: boolean;
  error: GeoErrorKind | null;
  requestLocation: () => void;
  skipLocation: () => void;
};

const PlaceContext = createContext<PlaceValue | null>(null);

function geoErrorKind(error: GeolocationPositionError | null, unsupported: boolean): GeoErrorKind {
  if (unsupported) return "unsupported";
  if (!error) return "generic";
  if (error.code === error.PERMISSION_DENIED) return "denied";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unavailable";
}

const SERVER_SNAPSHOT: Snapshot = {
  consent: "unset",
  place: unresolvedPlace(0),
};

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function PlaceProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const cityOverride = parseCityOverride(search);
  const forcePrompt = parseGeoPromptOverride(search);
  const { locale, m } = useI18n();

  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    const stopDurable = subscribeDurableStorage(() => {
      cached = undefined;
      onStoreChange();
    });
    return () => {
      listeners.delete(onStoreChange);
      stopDurable();
    };
  }, []);

  const stored = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<GeoErrorKind | null>(null);
  const refreshedRef = useRef(false);

  const overridePlace = useMemo(
    () => (cityOverride ? placeFromCityName(cityOverride) : null),
    [cityOverride],
  );

  const activePlace = overridePlace ?? stored.place;
  const consent = stored.consent;
  const branding = brandingForPlace(activePlace.city, locale, {
    neighborhood: m.place.neighborhood,
    wordmark: m.place.wordmark,
    demonym: m.place.demonym,
  });
  const source: PlaceSource = overridePlace
    ? "override"
    : !branding.resolved
      ? "fallback"
      : consent === "granted" && activePlace.lat != null
        ? "gps"
        : consent === "unset"
          ? "fallback"
          : "stored";

  const ready = Boolean(overridePlace) || consent !== "unset";
  const needsPrompt = !overridePlace && (forcePrompt || consent === "unset");

  const skipLocation = useCallback(() => {
    setError(null);
    setLocating(false);
    persist("skipped", placeToKeepOnSkip(readStoredPlace()));
  }, []);

  const applyCoords = useCallback(async (lat: number, lon: number, consentValue: GeoConsent) => {
    const geo = await reverseGeocode(lat, lon);
    persist(
      consentValue,
      geo
        ? {
            lat,
            lon,
            city: geo.city,
            countryCode: geo.countryCode,
            localeHint: geo.localeHint,
            updatedAt: Date.now(),
          }
        : coordsOnlyPlace(lat, lon),
    );
  }, []);

  const requestLocation = useCallback(() => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(geoErrorKind(null, true));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyCoords(position.coords.latitude, position.coords.longitude, "granted")
          .catch(() => {
            persist("granted", coordsOnlyPlace(position.coords.latitude, position.coords.longitude));
          })
          .finally(() => {
            setLocating(false);
          });
      },
      (geoError) => {
        setLocating(false);
        setError(geoErrorKind(geoError, false));
      },
      {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, [applyCoords]);

  useEffect(() => {
    if (overridePlace || refreshedRef.current) return;
    if (consent !== "granted") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    refreshedRef.current = true;
    const needsCity = !stored.place.city.trim();
    if (needsCity) setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyCoords(position.coords.latitude, position.coords.longitude, "granted").finally(() => {
          if (needsCity) setLocating(false);
        });
      },
      () => {
        if (needsCity) setLocating(false);
        // Keep the last known city — never wipe a granted place on a quiet refresh miss.
      },
      {
        enableHighAccuracy: false,
        timeout: 8_000,
        maximumAge: 30 * 60 * 1000,
      },
    );
  }, [applyCoords, consent, overridePlace, stored.place.city]);

  const value = useMemo<PlaceValue>(
    () => ({
      city: branding.city,
      placeName: branding.placeName,
      demonym: branding.demonym,
      countryCode: activePlace.countryCode,
      localeHint: activePlace.localeHint,
      frenchVoiceLang: frenchVoiceLangFor(activePlace.localeHint),
      lat: activePlace.lat,
      lon: activePlace.lon,
      consent,
      source,
      ready,
      resolved: branding.resolved,
      needsPrompt,
      locating,
      error,
      requestLocation,
      skipLocation,
    }),
    [
      activePlace.countryCode,
      activePlace.lat,
      activePlace.localeHint,
      activePlace.lon,
      branding.city,
      branding.demonym,
      branding.placeName,
      branding.resolved,
      consent,
      error,
      locating,
      needsPrompt,
      ready,
      requestLocation,
      skipLocation,
      source,
    ],
  );

  return <PlaceContext.Provider value={value}>{children}</PlaceContext.Provider>;
}

function UnresolvedPlaceFallback({ children }: { children: ReactNode }) {
  const { locale, m } = useI18n();
  const branding = brandingForPlace("", locale, {
    neighborhood: m.place.neighborhood,
    wordmark: m.place.wordmark,
    demonym: m.place.demonym,
  });
  return (
    <PlaceContext.Provider
      value={{
        city: branding.city,
        placeName: branding.placeName,
        demonym: branding.demonym,
        countryCode: "",
        localeHint: "",
        frenchVoiceLang: frenchVoiceLangFor(""),
        lat: null,
        lon: null,
        consent: "unset",
        source: "fallback",
        ready: false,
        resolved: false,
        needsPrompt: true,
        locating: false,
        error: null,
        requestLocation: () => {},
        skipLocation: () => {},
      }}
    >
      {children}
    </PlaceContext.Provider>
  );
}

export function PlaceProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<UnresolvedPlaceFallback>{children}</UnresolvedPlaceFallback>}>
      <PlaceProviderInner>{children}</PlaceProviderInner>
    </Suspense>
  );
}

export function usePlace() {
  const ctx = useContext(PlaceContext);
  if (!ctx) {
    throw new Error("usePlace must be used within PlaceProvider");
  }
  return ctx;
}
