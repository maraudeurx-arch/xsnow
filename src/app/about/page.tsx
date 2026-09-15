import { LocalizedLegal } from "@/components/LocalizedLegal";

export const metadata = {
  title: "Qui est derrière OPC",
  description:
    "Politzer est le responsable public du lancement souple indépendant d’Open Community (OPC). Pas une société enregistrée. Contact : GitHub Issues et opencommunity.opc@gmail.com.",
};

export default function AboutPage() {
  return <LocalizedLegal kind="about" />;
}
