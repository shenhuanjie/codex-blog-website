import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CyberButton } from "@/components/ui/cyber-button";
import { GlitchHeadline } from "@/components/ui/glitch-headline";

export default function NotFound() {
  return (
    <Section className="py-24">
      <Container className="space-y-8 text-center">
        <p className="font-label text-xs uppercase tracking-[0.3em] text-accentSecondary">404 // Lost Signal</p>
        <GlitchHeadline text="TARGET NOT FOUND" className="mx-auto max-w-4xl text-5xl" />
        <p className="mx-auto max-w-2xl text-mutedForeground">
          当前路径没有可解析的内容。你可以返回首页或进入文章列表继续浏览。
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <CyberButton href="/" variant="default">
            回到首页
          </CyberButton>
          <CyberButton href="/blog" variant="secondary">
            浏览文章
          </CyberButton>
        </div>
      </Container>
    </Section>
  );
}
