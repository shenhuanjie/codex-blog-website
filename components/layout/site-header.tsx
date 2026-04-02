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
      <Container className="flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="font-heading text-sm uppercase tracking-[0.3em] text-accent">
          NeonStack
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-label text-xs uppercase tracking-[0.22em] text-mutedForeground transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <CyberButton href="/blog" variant="outline" className="px-3 text-[10px] sm:text-xs">
          Enter Feed
        </CyberButton>
      </Container>
    </header>
  );
}
