import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EN_DEMANDE_SHORTCUTS, MES_SERVICE_SHORTCUTS } from "./board-shortcuts.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";

describe("board shortcuts", () => {
  it("exposes four Mes services actions wired to offer / service flows", () => {
    assert.equal(MES_SERVICE_SHORTCUTS.length, 4);
    assert.deepEqual(
      MES_SERVICE_SHORTCUTS.map((item) => item.id),
      ["lend-car", "moving", "babysitting", "tools"],
    );
    assert.equal(MES_SERVICE_SHORTCUTS[0]?.action, "car_morning");
    assert.match(MES_SERVICE_SHORTCUTS[0]?.href ?? "", /template=car-morning/);
    assert.equal(MES_SERVICE_SHORTCUTS[1]?.href, "/services/demenagement");
    assert.equal(MES_SERVICE_SHORTCUTS[2]?.href, "/services/garde");
    assert.equal(MES_SERVICE_SHORTCUTS[3]?.href, "/services/pret");
  });

  it("exposes four En demande actions wired to demand / car filters", () => {
    assert.equal(EN_DEMANDE_SHORTCUTS.length, 4);
    assert.deepEqual(
      EN_DEMANDE_SHORTCUTS.map((item) => item.id),
      ["moving", "diy", "carpool", "equipment"],
    );
    assert.match(EN_DEMANDE_SHORTCUTS[0]?.href ?? "", /demenagement\?side=demande/);
    assert.match(EN_DEMANDE_SHORTCUTS[1]?.href ?? "", /pret\?side=demande/);
    assert.match(EN_DEMANDE_SHORTCUTS[1]?.href ?? "", /bricolage/);
    assert.match(EN_DEMANDE_SHORTCUTS[2]?.href ?? "", /kind=car-morning/);
    assert.match(EN_DEMANDE_SHORTCUTS[3]?.href ?? "", /pret\?side=demande/);
  });

  it("keeps FR/EN/ES labels for both boards", () => {
    assert.equal(fr.mesServicesButtons.lendCar, "Prêter ma voiture");
    assert.equal(fr.mesServicesButtons.moving, "Aider au déménagement");
    assert.equal(fr.mesServicesButtons.babysitting, "Baby-sitting");
    assert.equal(fr.mesServicesButtons.tools, "Prêt d’outils");
    assert.equal(fr.enDemandeButtons.moving, "Aide au déménagement");
    assert.equal(fr.enDemandeButtons.diy, "Aide au bricolage");
    assert.equal(fr.enDemandeButtons.carpool, "Co-voiturage");
    assert.equal(fr.enDemandeButtons.equipment, "Prêt d’équipement");
    assert.equal(en.mesServicesButtons.lendCar, "Lend my car");
    assert.equal(en.enDemandeButtons.carpool, "Carpool");
    assert.equal(es.mesServicesButtons.babysitting, "Niñera");
    assert.equal(es.enDemandeButtons.diy, "Ayuda de bricolaje");
    assert.deepEqual(Object.keys(en.mesServicesButtons), Object.keys(fr.mesServicesButtons));
    assert.deepEqual(Object.keys(es.mesServicesButtons), Object.keys(fr.mesServicesButtons));
    assert.deepEqual(Object.keys(en.enDemandeButtons), Object.keys(fr.enDemandeButtons));
    assert.deepEqual(Object.keys(es.enDemandeButtons), Object.keys(fr.enDemandeButtons));
    assert.equal(fr.features.mesServices.lead, "");
    assert.equal(en.features.mesServices.lead, "");
    assert.equal(es.features.mesServices.lead, "");
    assert.equal(fr.features.enDemande.lead, "");
    assert.equal(en.features.enDemande.lead, "");
    assert.equal(es.features.enDemande.lead, "");
  });
});
