import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-black tracking-[0.18em]">OPUS</span>
          <span className="text-[10px] uppercase tracking-[0.4em] text-muted">
            Elevate
          </span>
        </Link>
        <nav className="hidden gap-8 text-xs uppercase tracking-[0.2em] md:flex">
          <Link href="#drink" className="transition-colors hover:text-accent">
            Drink
          </Link>
          <Link href="#story" className="transition-colors hover:text-accent">
            Story
          </Link>
          <Link href="#shop" className="transition-colors hover:text-accent">
            Shop
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em]">
          <Link
            href="#account"
            className="hidden transition-colors hover:text-accent sm:inline"
          >
            Account
          </Link>
          <Link
            href="#cart"
            className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 transition-colors hover:border-accent"
          >
            <span>Cart</span>
            <span className="font-mono text-muted">0</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
