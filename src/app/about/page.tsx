import { LocalizedLegal } from "@/components/LocalizedLegal";

export const metadata = {
  title: "Qui est derrière OPC",
  description:
    "L’équipe de développement assure le lancement souple d’Open Community (OPC), exploité par Essaim-Agents Inc., société enregistrée en Ontario (Canada). Contact : GitHub Issues et opencommunity.opc@gmail.com.",
};

export default function AboutPage() {
  return <LocalizedLegal kind="about" />;
}
