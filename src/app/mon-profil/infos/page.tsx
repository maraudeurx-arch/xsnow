import { ConnectWallet } from "@/components/ConnectWallet";
import { LocalizedStubProfile } from "@/components/LocalizedStub";

export const metadata = { title: "Mes infos" };

export default function MesInfosPage() {
  return (
    <LocalizedStubProfile feature="mesInfos" stub="mesInfos">
      <div className="flex justify-center">
        <ConnectWallet />
      </div>
    </LocalizedStubProfile>
  );
}
