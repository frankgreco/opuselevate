import { CanGraphic } from "./CanGraphic";
import { WaitlistForm } from "./WaitlistForm";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(212,165,116,0.08),transparent_60%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-32">
        <div className="space-y-8">
          <div className="font-mono text-xs uppercase tracking-[0.35em] text-muted">
            Vol. 01 · Original Composition
          </div>
          <h1 className="font-sans text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
            Performance,
            <br />
            <span className="text-accent">composed.</span>
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted md:text-lg">
            A clean lift built on real ingredients. No sugar. No shortcuts. No
            afterburn — just the focus to finish what you started.
          </p>
          <WaitlistForm />
        </div>
        <div className="relative flex items-center justify-center">
          <CanGraphic />
        </div>
      </div>
    </section>
  );
}
