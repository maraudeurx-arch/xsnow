import { ConnectWallet } from "@/components/ConnectWallet";
import { LocalProfileBoard } from "@/components/LocalProfileBoard";
import { LocalizedStubProfile } from "@/components/LocalizedStub";

export const metadata = { title: "Mes infos" };

export default function MesInfosPage() {
  return (
    <LocalizedStubProfile feature="mesInfos" stub="mesInfos">
      <div className="grid gap-3">
        <LocalProfileBoard />
        <div className="flex justify-center">
          <ConnectWallet />
        </div>
      </div>
    </LocalizedStubProfile>
  );
}
