type Card = {
  title: string;
  meta: string;
  blurb: string;
};

export function CatalogBoard({ items }: { items: Card[] }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-bold tracking-wide text-gold uppercase">{item.meta}</p>
          <p className="mt-1 text-lg font-extrabold">{item.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-snow/80">{item.blurb}</p>
        </li>
      ))}
    </ul>
  );
}
