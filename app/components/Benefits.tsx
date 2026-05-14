const benefits = [
  {
    n: "01",
    title: "Clean lift",
    body: "200mg caffeine paired with L-theanine. Sharp, not jittery.",
  },
  {
    n: "02",
    title: "Real focus",
    body: "Lion's mane and tyrosine for sustained mental clarity.",
  },
  {
    n: "03",
    title: "Zero sugar",
    body: "Sweetened with allulose. No crash, no compromise.",
  },
  {
    n: "04",
    title: "Built to finish",
    body: "Electrolytes, B-complex, and adaptogens for the long set.",
  },
];

export function Benefits() {
  return (
    <section id="drink" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-16 flex flex-col gap-4">
          <div className="font-mono text-xs uppercase tracking-[0.35em] text-muted">
            — Specs
          </div>
          <h2 className="max-w-2xl font-sans text-3xl font-black leading-[1.05] tracking-tight md:text-5xl">
            Engineered for the long sit, the long set, the long shift.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-lg bg-border md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.n}
              className="group flex flex-col gap-6 bg-background p-8 transition-colors hover:bg-surface"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs tracking-[0.25em] text-accent">
                  {b.n}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted">
                  Spec
                </span>
              </div>
              <h3 className="font-sans text-2xl font-bold leading-tight">
                {b.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
