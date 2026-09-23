import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EN_DEMANDE_SHORTCUTS, MES_SERVICE_SHORTCUTS } from "./board-shortcuts.ts";
import { en } from "./i18n/en.ts";
import { es } from "./i18n/es.ts";
import { fr } from "./i18n/fr.ts";

describe("board shortcuts", () => {
  it("lists ménage and homme à tout faire, and hides car lending and moving", () => {
    assert.equal(MES_SERVICE_SHORTCUTS.length, 4);
    assert.deepEqual(
      MES_SERVICE_SHORTCUTS.map((item) => item.id),
      ["cleaning", "handyman", "babysitting", "skills"],
    );
    assert.equal(MES_SERVICE_SHORTCUTS[0]?.href, "/services/menage");
    assert.equal(MES_SERVICE_SHORTCUTS[1]?.href, "/services/handyman");
    assert.equal(MES_SERVICE_SHORTCUTS[2]?.href, "/services/garde");
    assert.equal(MES_SERVICE_SHORTCUTS[3]?.action, "skills");
    assert.match(MES_SERVICE_SHORTCUTS[3]?.href ?? "", /template=skills/);
    assert.equal(
      MES_SERVICE_SHORTCUTS.some((item) => item.id === "lend-car" || item.id === "moving"),
      false,
    );
  });

  it("mirrors ménage and homme à tout faire on En demande without moving help", () => {
    assert.equal(EN_DEMANDE_SHORTCUTS.length, 5);
    assert.deepEqual(
      EN_DEMANDE_SHORTCUTS.map((item) => item.id),
      ["cleaning", "handyman", "diy", "carpool", "equipment"],
    );
    assert.match(EN_DEMANDE_SHORTCUTS[0]?.href ?? "", /menage\?side=demande/);
    assert.match(EN_DEMANDE_SHORTCUTS[1]?.href ?? "", /handyman\?side=demande/);
    assert.match(EN_DEMANDE_SHORTCUTS[2]?.href ?? "", /pret\?side=demande/);
    assert.match(EN_DEMANDE_SHORTCUTS[2]?.href ?? "", /bricolage/);
    assert.match(EN_DEMANDE_SHORTCUTS[3]?.href ?? "", /kind=car-morning/);
    assert.match(EN_DEMANDE_SHORTCUTS[4]?.href ?? "", /pret\?side=demande/);
    assert.equal(
      EN_DEMANDE_SHORTCUTS.some((item) => item.id === "moving"),
      false,
    );
  });

  it("keeps FR/EN/ES labels for both boards", () => {
    assert.equal(fr.mesServicesButtons.lendCar, "Prêter ma voiture");
    assert.equal(fr.mesServicesButtons.moving, "Aider au déménagement");
    assert.equal(fr.mesServicesButtons.cleaning, "Ménage");
    assert.equal(fr.mesServicesButtons.handyman, "Homme à tout faire");
    assert.equal(fr.mesServicesButtons.babysitting, "Baby-sitting");
    assert.equal(fr.mesServicesButtons.skills, "Mes compétences");
    assert.equal(fr.enDemandeButtons.moving, "Aide au déménagement");
    assert.equal(fr.enDemandeButtons.cleaning, "Ménage");
    assert.equal(fr.enDemandeButtons.handyman, "Homme à tout faire");
    assert.equal(fr.enDemandeButtons.diy, "Aide au bricolage");
    assert.equal(fr.enDemandeButtons.carpool, "Co-voiturage");
    assert.equal(fr.enDemandeButtons.equipment, "Prêt d’équipement");
    assert.equal(en.mesServicesButtons.lendCar, "Lend my car");
    assert.equal(en.mesServicesButtons.cleaning, "Cleaning");
    assert.equal(en.mesServicesButtons.handyman, "Handyman");
    assert.equal(en.enDemandeButtons.carpool, "Carpool");
    assert.equal(es.mesServicesButtons.babysitting, "Niñera");
    assert.equal(es.mesServicesButtons.cleaning, "Limpieza");
    assert.equal(es.mesServicesButtons.handyman, "Manitas");
    assert.equal(es.enDemandeButtons.diy, "Ayuda de bricolaje");
    assert.equal(en.mesServicesButtons.skills, "My skills");
    assert.equal(es.mesServicesButtons.skills, "Mis competencias");
    assert.deepEqual(Object.keys(en.skills), Object.keys(fr.skills));
    assert.deepEqual(Object.keys(es.skills), Object.keys(fr.skills));
    assert.equal(fr.skills.mechanic, "Mécanicien");
    assert.equal(fr.skills.plumber, "Plombier");
    assert.equal(fr.skills.electrician, "Électricien");
    assert.equal(fr.skills.driver, "Chauffeur");
    assert.equal(fr.skills.other, "Autres");
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
