import { ProfileStub } from "@/components/ProfileStub";
import { FEATURE_COPY } from "@/lib/content";

export const metadata = { title: "Inviter" };

export default function InviterPage() {
  return (
    <ProfileStub title={FEATURE_COPY.inviter.title} lead={FEATURE_COPY.inviter.lead}>
      <p className="text-sm leading-relaxed text-ice/85">
        Bientôt : un lien d’invitation à envoyer par message. Pour l’instant, indiquez
        https://maraudeurx-arch.github.io/xsnow/ à vos voisins.
      </p>
    </ProfileStub>
  );
}
