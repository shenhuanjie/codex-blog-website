import Link from "next/link";

import { Container } from "@/components/layout/container";
import { siteConfig } from "@/lib/site";

const quickLinks = [
  { href: "/", label: "首页" },
  { href: "/blog", label: "文章" },
  { href: "/about", label: "关于" },
  { href: "/rss.xml", label: "RSS" },
];

export function SiteFooter() {
  return (
    <footer className="relative border-t border-border py-10">
      <Container className="grid gap-8 text-sm text-mutedForeground md:grid-cols-4">
        <div className="space-y-2 md:col-span-2">
          <p className="font-heading text-lg uppercase tracking-[0.2em] text-accent">NeonStack</p>
          <p>{siteConfig.description}</p>
          <p className="font-label text-xs uppercase tracking-[0.2em] text-accentSecondary">
            {new Date().getFullYear()} | {siteConfig.author}
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-foreground">Navigate</p>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-accent">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.2em] text-foreground">Signal</p>
          <p>
            通过 <a className="text-accent hover:underline" href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>{" "}
            联系我。
          </p>
        </div>
      </Container>
    </footer>
  );
}
