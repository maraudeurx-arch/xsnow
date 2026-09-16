import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { APP_RELEASE_DATE, APP_VERSION } from "../../lib/app-version.ts";
import { en } from "../../lib/i18n/en.ts";
import { es } from "../../lib/i18n/es.ts";
import { fr } from "../../lib/i18n/fr.ts";
import { interpolate } from "../../lib/i18n/locales.ts";
import {
  IDEAS_KEY,
  ideaFormIssues,
  ideaFromForm,
  parseStoredIdea,
  type CommunityIdea,
} from "../../lib/ideas.ts";
import { postIdeaToInbox } from "../../lib/idea-inbox.ts";
import {
  FEATURED_CAR_MORNING_ID,
  IMPORTED_OFFERS_KEY,
  OFFERS_KEY,
  OFFER_REQUESTS_KEY,
  canPublish,
  carMorningDefaults,
  isInjectedSeedId,
  mergeBrowseOffers,
  offerFromForm,
  parseStoredOffer,
} from "../../lib/offers.ts";
import {
  EMPTY_PUBLIC_CATALOG,
  parsePublicCatalog,
  type PublicCatalog,
} from "../../lib/public-catalog.ts";
import {
  SERVICE_KINDS,
  SERVICE_SEEDS,
  SERVICES,
  type ServiceKind,
  type ServiceListing,
} from "../../lib/services.ts";
import {
  LOCAL_PROFILE_KEY,
  headerDisplayName,
  profileFromForm,
  readLocalProfile,
  writeLocalProfile,
} from "../../lib/local-profile.ts";
import { publicInviteUrl, resolveShareCode } from "../../lib/invite.ts";
import { readList, writeList } from "../../lib/storage.ts";

function memoryWindow() {
  const data: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = String(value);
    },
    removeItem(key: string) {
      delete data[key];
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    key() {
      return null;
    },
    get length() {
      return Object.keys(data).length;
    },
  } as Storage;
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window: { localStorage: Storage } }).window = { localStorage };
  return {
    data,
    restore() {
      if (previous === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window: unknown }).window = previous;
      }
    },
  };
}

function visibleIdeas(stored: unknown[], catalog: PublicCatalog) {
  const items = stored
    .map(parseStoredIdea)
    .filter((item): item is CommunityIdea => Boolean(item));
  const catalogIdeas = catalog.ideas.filter((idea) => !items.some((item) => item.id === idea.id));
  return { items, catalogIdeas };
}

/** Same merge as ServiceBoard: drop leftover seed ids, then catalog extras for that kind. */
function visibleServices(
  stored: ServiceListing[],
  catalog: PublicCatalog,
  kind: ServiceKind,
) {
  const local = stored.filter((item) => !isInjectedSeedId(item.id));
  const extras = catalog.services.filter(
    (item) => item.service === kind && !local.some((row) => row.id === item.id),
  );
  return [...local, ...extras];
}

describe("fresh storage empty slate", () => {
  it("lists no Mes services / En demande offers and no bundled Gatineau car", () => {
    const mock = memoryWindow();
    try {
      assert.deepEqual(readList(OFFERS_KEY), []);
      const catalog = parsePublicCatalog({
        version: APP_VERSION,
        offers: [
          {
            ...offerFromForm({
              ...carMorningDefaults(),
              interacContact: "owner@opc.test",
              insuranceOk: true,
            }),
            id: FEATURED_CAR_MORNING_ID,
            published: true,
            neighborhood: "Gatineau",
          },
        ],
        ideas: [],
        services: SERVICE_SEEDS.courses,
      });
      const browse = mergeBrowseOffers(readList(OFFERS_KEY), [], null, catalog.offers);
      assert.equal(browse.length, 0);
      assert.equal(catalog.offers.length, 0);
      assert.equal(catalog.services.length, 0);
      assert.equal(isInjectedSeedId(FEATURED_CAR_MORNING_ID), true);
      assert.match(fr.offers.emptyList, /Pas encore d’offre sur cet appareil/);
      assert.match(fr.offers.browseEmpty, /appareil neuf commence vide/);
      assert.doesNotMatch(fr.offers.browseEmpty, /featured-car-morning/);
      assert.deepEqual(readList(IMPORTED_OFFERS_KEY), []);
      assert.deepEqual(readList(OFFER_REQUESTS_KEY), []);
    } finally {
      mock.restore();
    }
  });

  it("lists no Mes services kind boards from empty storage or demo seeds", () => {
    const mock = memoryWindow();
    try {
      for (const kind of SERVICE_KINDS) {
        assert.deepEqual(readList(SERVICES[kind].storageKey), []);
        const leftoverSeeds = visibleServices(SERVICE_SEEDS[kind], EMPTY_PUBLIC_CATALOG, kind);
        assert.equal(leftoverSeeds.length, 0, kind);
      }

      const catalog = parsePublicCatalog({
        version: APP_VERSION,
        offers: [],
        ideas: [],
        services: SERVICE_KINDS.flatMap((kind) => SERVICE_SEEDS[kind]),
      });
      assert.equal(catalog.services.length, 0);
      for (const kind of SERVICE_KINDS) {
        assert.equal(visibleServices(readList(SERVICES[kind].storageKey), catalog, kind).length, 0);
      }

      assert.match(fr.services.empty, /Aucune annonce/);
      assert.match(en.services.empty, /No listings/);
      assert.match(es.services.empty, /Ningún anuncio/);
      assert.doesNotMatch(fr.services.empty, /seed-/);
      assert.doesNotMatch(fr.services.courses.title, /Plateau/);
    } finally {
      mock.restore();
    }
  });
});

describe("Vos idées stay on-device", () => {
  it("keeps a submit in local storage and does not resurrect it from an empty catalog", () => {
    const mock = memoryWindow();
    try {
      const idea = ideaFromForm({
        text: "Déneiger les allées du Plateau",
        involvement: ["mains"],
        hoursPerWeek: "2",
        neighborhood: "Hull",
      });
      writeList(IDEAS_KEY, [idea]);
      const stored = readList(IDEAS_KEY);
      const onDevice = visibleIdeas(stored, EMPTY_PUBLIC_CATALOG);
      assert.equal(onDevice.items.length, 1);
      assert.equal(onDevice.items[0]?.text, "Déneiger les allées du Plateau");
      assert.equal(onDevice.catalogIdeas.length, 0);

      writeList(IDEAS_KEY, []);
      const freshPhone = visibleIdeas(readList(IDEAS_KEY), EMPTY_PUBLIC_CATALOG);
      assert.equal(freshPhone.items.length, 0);
      assert.equal(freshPhone.catalogIdeas.length, 0);
      assert.equal(EMPTY_PUBLIC_CATALOG.ideas.length, 0);
      assert.match(fr.ideas.wallEmpty, /Pas encore d’idée ici/);
      assert.match(en.ideas.wallEmpty, /No idea here yet/);
      assert.match(es.ideas.wallEmpty, /Aún no hay ninguna idea/);
    } finally {
      mock.restore();
    }
  });

  it("confirms a local receipt after a successful submit, then invites another idea", () => {
    const mock = memoryWindow();
    try {
      const form = {
        text: "Prêter une perceuse le samedi",
        involvement: [] as const,
        hoursPerWeek: "",
        neighborhood: "",
      };
      assert.deepEqual(ideaFormIssues(form), []);
      const idea = ideaFromForm(form);
      writeList(IDEAS_KEY, [idea, ...readList(IDEAS_KEY)]);
      const stored = readList(IDEAS_KEY);
      assert.equal(stored[0]?.text, "Prêter une perceuse le samedi");
      assert.equal(EMPTY_PUBLIC_CATALOG.ideas.length, 0);

      assert.equal(fr.ideas.thankYou, "Idée bien reçue");
      assert.equal(fr.ideas.newIdea, "Ajouter une autre idée");
      assert.match(fr.ideas.thankYouBody, /enregistrée sur cet appareil/);
      assert.match(en.ideas.thankYouBody, /saved on this device/);
      assert.match(es.ideas.thankYouBody, /guardada en este aparato/);
      assert.doesNotMatch(fr.ideas.thankYou, /serveur/i);
      assert.doesNotMatch(fr.ideas.thankYouBody, /pipeline|serveur|GitHub/i);
      assert.equal(en.ideas.newIdea, "Add another idea");
      assert.equal(es.ideas.newIdea, "Añadir otra idea");
    } finally {
      mock.restore();
    }
  });

  it("keeps the local idea and confirm copy when the Worker POST fails", async () => {
    const mock = memoryWindow();
    try {
      const idea = ideaFromForm({
        text: "Partager une perceuse",
        involvement: [],
        hoursPerWeek: "",
        neighborhood: "",
      });
      writeList(IDEAS_KEY, [idea]);
      const result = await postIdeaToInbox(
        { id: idea.id, text: idea.text, city: "Gatineau" },
        async () => {
          throw new Error("offline");
        },
      );
      assert.equal(result, "failed");
      assert.equal(readList(IDEAS_KEY)[0]?.text, "Partager une perceuse");
      assert.equal(fr.ideas.thankYou, "Idée bien reçue");
      assert.equal(fr.ideas.newIdea, "Ajouter une autre idée");
      assert.match(fr.ideas.inboxFailed, /enregistrée ici/);
    } finally {
      mock.restore();
    }
  });
});

describe("catalog publish gate", () => {
  it("blocks incomplete car offers and never lists unpublished catalog rows", () => {
    const draft = carMorningDefaults();
    assert.equal(canPublish(draft), false);
    const ready = offerFromForm({
      ...draft,
      interacContact: "voisin@opc.test",
      insuranceOk: true,
    });
    assert.equal(canPublish({ ...draft, interacContact: "voisin@opc.test", insuranceOk: true }), true);
    assert.equal(ready.published, true);

    const unpublished = { ...ready, published: false };
    const catalog = parsePublicCatalog({
      version: APP_VERSION,
      updated: APP_RELEASE_DATE,
      offers: [unpublished, { ...ready, id: FEATURED_CAR_MORNING_ID }],
      ideas: [],
      services: [],
    });
    assert.equal(catalog.offers.length, 0);
    assert.equal(mergeBrowseOffers([], [], null, catalog.offers).length, 0);

    const owned = [ready];
    const mineOnly = mergeBrowseOffers(owned.map(parseStoredOffer).filter(Boolean), [], null, catalog.offers);
    assert.equal(mineOnly.length, 1);
    assert.equal(mineOnly[0]?.interacContact, "voisin@opc.test");
  });
});

describe("About version copy", () => {
  it("shows the shipped app version on the About page strings", () => {
    assert.equal(APP_VERSION, "0.3.4");
    assert.match(fr.profile.versionLabel, /Version/);
    assert.match(fr.profile.releaseNotesBody, new RegExp(APP_VERSION.replace(".", "\\.")));
    assert.match(fr.legal.about.sections[4].body, /version/i);
    assert.match(fr.legal.about.sections[4].body, /catalogue public/i);
    const spoken = interpolate(fr.profile.aProposBody, {
      placeName: "VOTRE QUARTIER",
      community: fr.brand.community,
      slogan: fr.brand.slogan,
    });
    assert.match(spoken, /Open Community/);
    assert.match(spoken, /Monétisé Vous/);
  });
});

describe("local registration profile", () => {
  it("stays on this device and never promotes email or phone to the header", () => {
    const mock = memoryWindow();
    try {
      const created = profileFromForm(
        {
          firstName: "Marie",
          lastName: "Tremblay",
          email: "marie@voisin.test",
          phone: "819-555-0100",
        },
        null,
        () => "2026-09-16T00:00:00.000Z",
        () => "OPC-7K3M",
      );
      assert.ok(created);
      writeLocalProfile(created);
      const stored = readLocalProfile();
      assert.equal(stored?.id, "OPC-7K3M");
      assert.equal(stored?.email, "marie@voisin.test");
      assert.equal(headerDisplayName(stored!), "M.T.");
      assert.doesNotMatch(headerDisplayName(stored!), /@|555/);
      const inviteCode = resolveShareCode(stored!.id);
      assert.equal(inviteCode, "opc-7k3m");
      assert.match(publicInviteUrl(inviteCode), /invite=opc-7k3m/);
      assert.equal(mock.data[LOCAL_PROFILE_KEY]?.includes("marie@voisin.test"), true);
    } finally {
      mock.restore();
    }
  });
});
