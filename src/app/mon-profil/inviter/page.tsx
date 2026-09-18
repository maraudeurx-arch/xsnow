import { InviteShareBoard } from "@/components/InviteShareBoard";
import { LocalizedProfileStub } from "@/components/LocalizedFeature";
import { SignupGate } from "@/components/SignupGate";

export const metadata = { title: "Inviter" };

export default function InviterPage() {
  return (
    <SignupGate>
      <LocalizedProfileStub feature="inviter">
        <InviteShareBoard />
      </LocalizedProfileStub>
    </SignupGate>
  );
}
