import { notFound } from "next/navigation";
import { LocalizedService } from "@/components/LocalizedService";
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

  return <LocalizedService kind={kind} />;
}
