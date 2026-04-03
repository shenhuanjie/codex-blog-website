import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { TerminalPanel } from "@/components/layout/terminal-panel";
import { PostList } from "@/components/blog/post-list";
import { CyberButton } from "@/components/ui/cyber-button";
import { CyberCard } from "@/components/ui/cyber-card";
import { GlitchHeadline } from "@/components/ui/glitch-headline";
import { SectionHeading } from "@/components/ui/section-heading";
import { getFeaturedPosts, getSiteStats } from "@/lib/content";

const stack = [
  "Next.js App Router",
  "TypeScript Strict",
  "Tailwind CSS v4",
  "MDX 内容管线",
];

export default async function Home() {
  const [featuredPosts, stats] = await Promise.all([
    getFeaturedPosts(3),
    getSiteStats(),
  ]);

  return (
    <>
      <Section className="pb-8 pt-14 md:pt-20">
        <Container>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-5">
            <div className="space-y-7 lg:col-span-3">
              <p className="font-label text-xs uppercase tracking-[0.2em] text-accent terminal-cursor sm:tracking-[0.3em]">
                Access Point // Personal Engineering Feed
              </p>

              <GlitchHeadline text="CODE IN THE NEON NOISE" className="max-w-4xl" />

              <p className="max-w-2xl text-base text-mutedForeground sm:text-lg">
                这里记录前端架构、AI 工程实践与性能优化。每一篇文章都从真实项目复盘出发，保留工程细节，
                不做空洞总结。
              </p>

              <div className="flex flex-wrap gap-3">
                <CyberButton href="/blog" variant="glitch">
                  Read Articles
                </CyberButton>
                <CyberButton href="/about" variant="secondary">
                  About Operator
                </CyberButton>
              </div>

              <div className="grid grid-cols-2 gap-4 border border-border bg-card/50 p-4 sm:grid-cols-4">
                <div className="space-y-2 border-r border-border pr-3 sm:pr-4">
                  <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">posts</p>
                  <p className="font-heading text-2xl text-accent">{stats.totalPosts}</p>
                </div>
                <div className="space-y-2 border-r border-border pr-3 sm:pr-4">
                  <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">tags</p>
                  <p className="font-heading text-2xl text-accentSecondary">{stats.totalTags}</p>
                </div>
                <div className="space-y-2 border-r border-border pr-3 sm:pr-4">
                  <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">uptime</p>
                  <p className="font-heading text-2xl text-accentTertiary">99.99%</p>
                </div>
                <div className="space-y-2">
                  <p className="font-label text-xs uppercase tracking-[0.2em] text-mutedForeground">signal</p>
                  <p className="font-heading text-2xl text-accent">stable</p>
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-2">
              <CyberCard variant="holographic" glow className="space-y-5">
                <p className="font-label text-xs uppercase tracking-[0.25em] text-accentSecondary">
                  Operator Deck
                </p>

                <ul className="space-y-3 text-sm text-foreground/90">
                  {stack.map((item) => (
                    <li key={item} className="flex items-center gap-3 border-b border-border/70 pb-3">
                      <span className="inline-flex h-7 w-7 items-center justify-center border border-accent/60 text-accent">
                        +
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CyberCard>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="-mt-6 pb-10">
        <Container>
          <div className="cyber-grid-bg cyber-chamfer border border-border bg-card/70 p-6 md:p-8">
            <SectionHeading
              eyebrow="Latest Transmission"
              title="精选技术文章"
              description="围绕 React 工程化、渲染性能与产品可维护性的实战文章。"
              action={
                <CyberButton href="/blog" variant="outline" className="w-full sm:w-auto">
                  全部文章
                </CyberButton>
              }
            />
            <PostList posts={featuredPosts} />
          </div>
        </Container>
      </Section>

      <Section className="pt-8">
        <Container>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TerminalPanel
              title="System Log"
              lines={[
                "pnpm build --filter web",
                "lighthouse-ci --preset blog",
                "ship:canary -> production",
              ]}
              footer={
                <CyberButton href="/blog" variant="ghost" className="px-0 text-xs">
                  查看完整日志
                </CyberButton>
              }
            />

            <CyberCard variant="default" hoverEffect className="space-y-4 rotate-1">
              <p className="font-label text-xs uppercase tracking-[0.25em] text-accent">Capabilities</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="cyber-chamfer-sm border border-border bg-muted/40 p-3">
                  <p className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-[0.2em] text-accentTertiary">
                    [F]
                    Frontend
                  </p>
                  <p className="mt-2 text-sm text-mutedForeground">复杂 UI 系统、组件抽象、可访问性优化。</p>
                </div>
                <div className="cyber-chamfer-sm border border-border bg-muted/40 p-3">
                  <p className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-[0.2em] text-accentSecondary">
                    [I]
                    Infra
                  </p>
                  <p className="mt-2 text-sm text-mutedForeground">CI/CD、性能指标与端到端交付流程。</p>
                </div>
                <div className="cyber-chamfer-sm border border-border bg-muted/40 p-3 sm:col-span-2">
                  <p className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-[0.2em] text-accent">
                    [R]
                    Reliability
                  </p>
                  <p className="mt-2 text-sm text-mutedForeground">
                    用测试和可观测性保障改动可追踪、可回滚、可验证。
                  </p>
                </div>
              </div>
            </CyberCard>
          </div>
        </Container>
      </Section>
    </>
  );
}
