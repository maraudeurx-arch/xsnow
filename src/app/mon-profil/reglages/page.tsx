import { ProfileStub } from "@/components/ProfileStub";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Réglages" };

export default function ReglagesPage() {
  return (
    <ProfileStub title={FEATURE_COPY.reglages.title} lead={FEATURE_COPY.reglages.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Langue, notifications et saison d’affichage arriveront ici. Rien n’est encore enregistré
        sur cet appareil.
      </p>
    </ProfileStub>
  );
}
