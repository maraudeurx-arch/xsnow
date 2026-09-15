import { LocalizedLegal } from "@/components/LocalizedLegal";

export const metadata = {
  title: "Comment ça marche",
  description:
    "Open Community est un babillard d’entraide. Les paiements d’aujourd’hui sont de pair à pair (Interac / PayPal.me). OPC ne détient pas les fonds. Aucun contrat intelligent de paiement OPC n’est en service pour les services aujourd’hui.",
};

export default function HowItWorksPage() {
  return <LocalizedLegal kind="how" />;
}
