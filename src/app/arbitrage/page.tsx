import { LocalizedFeature } from "@/components/LocalizedFeature";
import { ArbitrageBoard } from "@/components/arbitrage/ArbitrageBoard";

export const metadata = { title: "Arbitrage" };

export default function ArbitragePage() {
  return (
    <LocalizedFeature feature="arbitrage" compact>
      <ArbitrageBoard />
    </LocalizedFeature>
  );
}
