import Link from "next/link";

import { Container } from "@/components/layout/container";
import { CyberButton } from "@/components/ui/cyber-button";

const links = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur">
      <Container className="flex flex-col gap-3 py-3 md:min-h-16 md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
        <div className="flex w-full items-center justify-between gap-3 md:w-auto">
          <Link href="/" className="font-heading text-xs uppercase tracking-[0.24em] text-accent sm:text-sm sm:tracking-[0.3em]">
            NeonStack
          </Link>
          <CyberButton href="/blog" variant="outline" className="px-3 text-[10px] sm:text-xs">
            Enter Feed
          </CyberButton>
        </div>

        <nav className="w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-label text-[11px] uppercase tracking-[0.18em] text-mutedForeground transition-colors hover:text-accent sm:text-xs sm:tracking-[0.22em]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </Container>
    </header>
  );
}
