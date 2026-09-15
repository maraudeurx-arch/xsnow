import { LocalizedLegal } from "@/components/LocalizedLegal";

export const metadata = {
  title: "Sécurité",
  description:
    "UGC en texte brut, assainissement, pas d’upload de fichiers, suggestions jamais auto-fusionnées. Pas encore d’audit tiers indépendant. Signalement : GitHub Issues ou opencommunity.opc@gmail.com. L’app ne custodie ni crypto ni fiat.",
};

export default function SecurityPage() {
  return <LocalizedLegal kind="security" />;
}
