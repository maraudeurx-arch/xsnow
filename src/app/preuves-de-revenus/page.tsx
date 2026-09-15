import { LocalizedLegal } from "@/components/LocalizedLegal";

export const metadata = {
  title: "Preuves de revenus",
  description:
    "Open Community ne revendique aucune preuve de revenus pour l’instant. Des preuves anonymisées pourront être ajoutées plus tard, avec consentement. Aucune capture fabriquée.",
};

export default function RevenueProofsPage() {
  return <LocalizedLegal kind="proofs" />;
}
