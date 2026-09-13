import { notFound } from "next/navigation";
import { FeaturePanel } from "@/components/FeaturePanel";
import { ServiceBoard } from "@/components/features/ServiceBoard";
import { SERVICE_KINDS, SERVICES, isServiceKind } from "@/lib/services";

export function generateStaticParams() {
  return SERVICE_KINDS.map((kind) => ({ kind }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isServiceKind(kind)) return { title: "Services" };
  return { title: SERVICES[kind].title };
}

export default async function ServiceKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isServiceKind(kind)) notFound();
  const def = SERVICES[kind];

  return (
    <FeaturePanel title={def.title} lead={def.lead}>
      <ServiceBoard kind={kind} />
    </FeaturePanel>
  );
}
