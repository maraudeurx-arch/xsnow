import { FeaturePanel } from "@/components/FeaturePanel";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Monétiser vous : votre image, votre voix." };

export default function MonetisePage() {
  return (
    <FeaturePanel title={FEATURE_COPY.monetise.title} lead={FEATURE_COPY.monetise.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Bientôt : proposez votre image ou votre voix à monétiser. En attendant, ouvrez{" "}
        <span className="font-extrabold text-gold">Accueil → Professionnelle</span>.
      </p>
    </FeaturePanel>
  );
}
