import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Monétisé ce que vous avez" };

export default function MonetisePage() {
  return (
    <FeaturePanel title={FEATURE_COPY.monetise.title} lead={FEATURE_COPY.monetise.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Bientôt : publiez un talent, un outil ou une heure à monétiser. En attendant, ouvrez{" "}
        <span className="font-extrabold text-gold">Accueil → Professionnelle</span>.
      </p>
    </FeaturePanel>
  );
}
