import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl font-extrabold">
        Page introuvable
      </p>
      <Link href="/" className="tap mt-4 inline-flex items-center rounded-full bg-gold px-5 font-extrabold text-night">
        Retour à Accueil
      </Link>
    </div>
  );
}
