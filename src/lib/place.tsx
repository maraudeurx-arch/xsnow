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
import { demonymFor, placeName as toPlaceName } from "@/lib/demonym";
import {
  fallbackPlace,
  frenchVoiceLangFor,
  parseCityOverride,
  parseGeoPromptOverride,
  placeFromCityName,
  readConsent,
  readStoredPlace,
  reverseGeocode,
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
    place: readStoredPlace() ?? fallbackPlace(),
  };
  return cached;
}

function persist(consent: GeoConsent, place: StoredPlace) {
  writeConsent(consent);
  writeStoredPlace(place);
  emit();
}

export type PlaceSource = "fallback" | "stored" | "gps" | "override";

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
  needsPrompt: boolean;
  locating: boolean;
  error: string | null;
  requestLocation: () => void;
  skipLocation: () => void;
};

const PlaceContext = createContext<PlaceValue | null>(null);

function geoErrorMessage(error: GeolocationPositionError | null, unsupported: boolean) {
  if (unsupported) {
    return "La géolocalisation n’est pas disponible sur cet appareil. Tu peux continuer avec Gatineau.";
  }
  if (!error) {
    return "Impossible d’obtenir ta position. Tu peux réessayer, ou continuer avec Gatineau.";
  }
  if (error.code === error.PERMISSION_DENIED) {
    return "Safari a refusé la position. Dans Réglages → Safari → Localisation, ou continue avec Gatineau.";
  }
  if (error.code === error.TIMEOUT) {
    return "La position a pris trop de temps. Réessaie, ou continue avec Gatineau.";
  }
  return "Position indisponible pour le moment. Réessaie, ou continue avec Gatineau.";
}

function PlaceProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const cityOverride = parseCityOverride(search);
  const forcePrompt = parseGeoPromptOverride(search);

  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  const stored = useSyncExternalStore(subscribe, readSnapshot, () => ({
    consent: "unset" as const,
    place: fallbackPlace(0),
  }));

  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshedRef = useRef(false);

  const overridePlace = useMemo(
    () => (cityOverride ? placeFromCityName(cityOverride) : null),
    [cityOverride],
  );

  const activePlace = overridePlace ?? stored.place;
  const consent = stored.consent;
  const source: PlaceSource = overridePlace
    ? "override"
    : consent === "granted" && stored.place.city
      ? stored.place.lat != null
        ? "gps"
        : "stored"
      : consent === "unset"
        ? "fallback"
        : "stored";

  const ready = Boolean(overridePlace) || consent !== "unset";
  const needsPrompt = !overridePlace && (forcePrompt || consent === "unset");

  const skipLocation = useCallback(() => {
    setError(null);
    setLocating(false);
    persist("skipped", fallbackPlace());
  }, []);

  const applyCoords = useCallback(async (lat: number, lon: number, consentValue: GeoConsent) => {
    const geo = await reverseGeocode(lat, lon);
    persist(consentValue, {
      lat,
      lon,
      city: geo.city,
      countryCode: geo.countryCode,
      localeHint: geo.localeHint,
      updatedAt: Date.now(),
    });
  }, []);

  const requestLocation = useCallback(() => {
    setError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(geoErrorMessage(null, true));
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyCoords(position.coords.latitude, position.coords.longitude, "granted")
          .catch(() => {
            persist("granted", {
              ...fallbackPlace(),
              lat: position.coords.latitude,
              lon: position.coords.longitude,
              updatedAt: Date.now(),
            });
          })
          .finally(() => {
            setLocating(false);
          });
      },
      (geoError) => {
        setLocating(false);
        setError(geoErrorMessage(geoError, false));
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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyCoords(position.coords.latitude, position.coords.longitude, "granted");
      },
      () => {
        // Keep the last known city — never wipe a granted place on a quiet refresh miss.
      },
      {
        enableHighAccuracy: false,
        timeout: 8_000,
        maximumAge: 30 * 60 * 1000,
      },
    );
  }, [applyCoords, consent, overridePlace]);

  const value = useMemo<PlaceValue>(
    () => ({
      city: activePlace.city,
      placeName: toPlaceName(activePlace.city),
      demonym: demonymFor(activePlace.city),
      countryCode: activePlace.countryCode,
      localeHint: activePlace.localeHint,
      frenchVoiceLang: frenchVoiceLangFor(activePlace.localeHint),
      lat: activePlace.lat,
      lon: activePlace.lon,
      consent,
      source,
      ready,
      needsPrompt,
      locating,
      error,
      requestLocation,
      skipLocation,
    }),
    [
      activePlace.city,
      activePlace.countryCode,
      activePlace.lat,
      activePlace.localeHint,
      activePlace.lon,
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

export function PlaceProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <PlaceContext.Provider
          value={{
            city: fallbackPlace(0).city,
            placeName: toPlaceName(fallbackPlace(0).city),
            demonym: demonymFor(fallbackPlace(0).city),
            countryCode: fallbackPlace(0).countryCode,
            localeHint: fallbackPlace(0).localeHint,
            frenchVoiceLang: frenchVoiceLangFor(fallbackPlace(0).localeHint),
            lat: fallbackPlace(0).lat,
            lon: fallbackPlace(0).lon,
            consent: "unset",
            source: "fallback",
            ready: false,
            needsPrompt: true,
            locating: false,
            error: null,
            requestLocation: () => {},
            skipLocation: () => {},
          }}
        >
          {children}
        </PlaceContext.Provider>
      }
    >
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
