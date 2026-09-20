import { InviteShareBoard } from "@/components/InviteShareBoard";
import { LocalizedProfileStub } from "@/components/LocalizedFeature";

export const metadata = { title: "Inviter" };

export default function InviterPage() {
  return (
    <LocalizedProfileStub feature="inviter">
        <InviteShareBoard />
      </LocalizedProfileStub>
  );
}
