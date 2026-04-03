import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { TerminalPanel } from "@/components/layout/terminal-panel";
import { CyberCard } from "@/components/ui/cyber-card";
import { GlitchHeadline } from "@/components/ui/glitch-headline";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "关于我",
  description: "个人简介、技能矩阵与工作方式。",
  alternates: {
    canonical: "/about",
  },
};

const skillBlocks = [
  {
    marker: "[F]",
    title: "Frontend Architecture",
    description: "大型组件系统、可维护 CSS 架构、复杂交互编排。",
  },
  {
    marker: "[D]",
    title: "Design Systems",
    description: "Token 驱动设计系统、跨页面一致性与可复用组件规范。",
  },
  {
    marker: "[A]",
    title: "AI Engineering",
    description: "Agent 工作流、提示词工程与可验证的自动化执行链路。",
  },
  {
    marker: "[R]",
    title: "Delivery",
    description: "以监控与测试保障质量，把设计落地为稳定可上线产品。",
  },
];

export default function AboutPage() {
  return (
    <Section className="pt-12 md:pt-16">
      <Container className="space-y-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <p className="font-label text-xs uppercase tracking-[0.2em] text-accent terminal-cursor sm:tracking-[0.3em]">
              Operator Profile
            </p>
            <GlitchHeadline text="SYSTEM DESIGNER / FRONTEND ENGINEER" className="text-4xl sm:text-5xl lg:text-6xl" />
            <p className="max-w-2xl text-mutedForeground">
              我专注于把复杂产品需求转化为可扩展、可维护、可观测的前端系统。偏好用明确的设计 token、
              清晰的组件边界和严格的工程约束，降低长期演进成本。
            </p>
          </div>

          <TerminalPanel
            title="Operator Timeline"
            lines={[
              "2019 -> 全职前端开发",
              "2022 -> 负责设计系统升级",
              "2024 -> AI + 前端工程融合",
              "2026 -> 构建高可信交付流",
            ]}
          />
        </div>

        <SectionHeading
          eyebrow="Skill Matrix"
          title="能力矩阵"
          description="聚焦长期可维护的 Web 产品交付，而不是一次性页面实现。"
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {skillBlocks.map((item) => (
            <CyberCard key={item.title} hoverEffect className="space-y-3">
              <p className="inline-flex items-center gap-2 font-label text-xs uppercase tracking-[0.2em] text-accentSecondary">
                {item.marker}
                {item.title}
              </p>
              <p className="text-sm text-mutedForeground">{item.description}</p>
            </CyberCard>
          ))}
        </div>

        <CyberCard variant="terminal" className="max-w-3xl">
          <p className="font-label text-xs uppercase tracking-[0.25em] text-accent">Collaboration Protocol</p>
          <ol className="mt-4 space-y-2 text-sm text-foreground">
            <li>1. 先定义边界与验收标准，再开始编码。</li>
            <li>2. 将设计系统能力沉淀为可复用组件，而非页面特例。</li>
            <li>3. 用测试与指标验证改动结果，保证回归可控。</li>
          </ol>
        </CyberCard>
      </Container>
    </Section>
  );
}
