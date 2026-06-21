export function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-7 h-7 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center text-xs font-extrabold"
          aria-hidden
        >
          {n}
        </span>
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
