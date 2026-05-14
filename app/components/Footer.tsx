import Link from "next/link";

function FooterCol({ label, links }: { label: string; links: string[] }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted">
        {label}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map((l) => (
          <li key={l}>
            <Link href="#" className="transition-colors hover:text-accent">
              {l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-[0.18em]">
                OPUS
              </span>
              <span className="text-[10px] uppercase tracking-[0.4em] text-muted">
                Elevate
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted">
              A new energy drink built for clarity, drive, and finish.
            </p>
          </div>
          <FooterCol
            label="Shop"
            links={["Drink", "Bundles", "Merch", "Subscribe"]}
          />
          <FooterCol
            label="Brand"
            links={["Story", "Ingredients", "Sustainability", "Press"]}
          />
          <FooterCol
            label="Support"
            links={["Contact", "Shipping", "Returns", "FAQ"]}
          />
        </div>
        <div className="mt-16 flex flex-col gap-4 border-t border-border pt-8 md:flex-row md:items-center md:justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-muted">
            © {new Date().getFullYear()} Opus Elevate · All rights reserved
          </div>
          <div className="flex flex-wrap gap-6 font-mono text-[10px] uppercase tracking-[0.35em] text-muted">
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Refund Policy
            </Link>
            <Link href="#" className="hover:text-foreground">
              Subscription
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
