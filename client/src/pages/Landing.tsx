import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Navigation from "@/components/landing/Navigation";
import PricingSection from "@/components/landing/PricingSection";
import ToolsSection from "@/components/landing/ToolsSection";
import { CheckoutModal } from "@/components/landing/modals/CheckoutModal";
import { ContactModal } from "@/components/landing/modals/ContactModal";
import { DemoModal } from "@/components/landing/modals/DemoModal";
import { motion } from "framer-motion";
import { useApp } from "@/contexts/AppContext";

import {
  Users, BarChart3, GitBranch, Film,
  MessageSquare, FolderOpen, CheckCircle, ArrowRight,
} from "lucide-react";

const PLATFORM_HIGHLIGHTS = [
  {
    icon: Film,
    title: "Estúdio IA",
    items: ["Roteiro por projeto", "Callsheet inteligente", "Decupagem técnica", "Orçamento estruturado", "Briefing, contrato, proposta"],
  },
  {
    icon: FolderOpen,
    title: "Gestão de Arquivos",
    items: ["Upload por projeto", "Organização de materiais", "Preview quando disponível", "Filtros por tipo", "Download direto"],
  },
  {
    icon: MessageSquare,
    title: "Review de Vídeo",
    items: ["Review por projeto", "Comentários com timestamp", "Status de aprovação", "Links compartilháveis", "Histórico de revisão"],
  },
  {
    icon: Users,
    title: "CRM de Clientes",
    items: ["Cadastro de clientes", "Pipeline comercial", "Segmentação por perfil", "Histórico de interações", "Dados comerciais"],
  },
  {
    icon: BarChart3,
    title: "Operação",
    items: ["Projetos ativos", "Briefings pendentes", "Atividades recentes", "Plano e cota", "Indicadores do estúdio"],
  },
  {
    icon: GitBranch,
    title: "Pipeline & Colaboração",
    items: ["Fluxo por etapa", "Convite de colaboradores", "Compartilhamento externo", "Aprovação de vídeo", "Equipe por projeto"],
  },
];

const PLATFORM_FLOW = [
  { step: "01", title: "Projeto", desc: "Crie um projeto e cadastre o cliente" },
  { step: "02", title: "Pré-produção", desc: "Roteiro, briefing, decupagem e callsheet com IA" },
  { step: "03", title: "Orçamento", desc: "Proposta, contrato e orçamento automático" },
  { step: "04", title: "Produção", desc: "Checklist, cronograma e gestão de arquivos" },
  { step: "05", title: "Revisão", desc: "Review de vídeo com anotações e aprovação" },
  { step: "06", title: "Entrega", desc: "Relatório final e faturamento" },
];

const PRODUCT_SCREENS = [
  {
    label: "Painel operacional",
    title: "O que precisa de atenção aparece primeiro",
    description:
      "Projetos ativos, briefing pendente, plano atual e próximo passo ficam na entrada do app.",
    image: "/landing/product/dashboard.png",
  },
  {
    label: "Centro do job",
    title: "Cada job vira um centro de produção",
    description:
      "Objetivo, prazo, direção criativa, progresso, equipe e atalhos seguem conectados ao projeto.",
    image: "/landing/product/project-hub.png",
  },
  {
    label: "Studio IA",
    title: "IA sem perder o contexto do projeto",
    description:
      "Roteiro, decupagem, callsheet, briefing e documentos operam dentro do job selecionado.",
    image: "/landing/product/studio.png",
  },
];

const USE_CASES = [
  {
    title: "Freelas e creators",
    description: "Sair do improviso: briefing, roteiro, arquivos e entrega em um fluxo simples por projeto.",
  },
  {
    title: "Produtoras pequenas",
    description: "Organizar jobs simultâneos com cliente, IA, arquivos, aprovações e equipe conectados.",
  },
  {
    title: "Agências e social teams",
    description: "Produzir campanhas com múltiplos formatos, histórico por cliente e revisão centralizada.",
  },
];

function ProductProofSection() {
  return (
    <section id="product-proof" className="landing-section">
      <div className="landing-shell space-y-16">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="landing-eyebrow mb-3">// Produto real, não mockup</p>
            <h2 className="landing-heading mb-5 text-[clamp(2.8rem,6vw,5.7rem)]">
              A OPERAÇÃO APARECE <span className="landing-outline-text">NA TELA</span>
            </h2>
              <p className="landing-copy max-w-xl">
              Prints capturados da aplicação rodando localmente: painel, centro do job e studio de IA com um projeto demo real.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-glass grid grid-cols-1 sm:grid-cols-3"
          >
            {["Criar briefing", "Gerar documentos", "Acompanhar entrega"].map((step, index) => (
              <div key={step} className="border-b border-[var(--landing-line)] p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <span className="mb-3 block font-frame-mono text-[0.62rem] uppercase tracking-[0.16em] text-frame-orange">
                  0{index + 1}
                </span>
                <p className="text-sm font-medium leading-snug text-[var(--landing-text)]">{step}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="space-y-8">
          {PRODUCT_SCREENS.map((screen, index) => (
            <motion.article
              key={screen.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.08 }}
              className="landing-card grid grid-cols-1 items-center gap-6 p-4 sm:p-6 lg:grid-cols-[340px_1fr] lg:gap-10"
            >
              <div className="relative z-10 space-y-3">
                <p className="font-frame-mono text-[0.64rem] uppercase tracking-[0.18em] text-frame-orange">
                  {screen.label}
                </p>
                <h3 className="text-2xl font-semibold text-[var(--landing-text)]">{screen.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--landing-muted)]">{screen.description}</p>
              </div>

              <div className="relative z-10 overflow-hidden border border-[var(--landing-line)] bg-[var(--landing-glass-soft)]">
                <img
                  src={screen.image}
                  alt={`${screen.title} no Cena Studio`}
                  loading="lazy"
                  className="block w-full aspect-[16/9] object-cover object-top"
                />
              </div>
            </motion.article>
          ))}
        </div>

        <div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="landing-eyebrow mb-3">// Casos de uso</p>
              <h2 className="landing-heading text-[clamp(2.4rem,4.5vw,4rem)]">
                PARA QUEM PRODUZ <span className="landing-accent-text">AUDIOVISUAL</span>
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--landing-muted)]">
              O foco inicial é operação audiovisual real: planejamento, documentos, arquivos, revisão, cliente e equipe.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <div key={useCase.title} className="landing-card p-6">
                <h3 className="relative z-10 mb-2 text-lg font-semibold text-[var(--landing-text)]">{useCase.title}</h3>
                <p className="relative z-10 text-sm leading-relaxed text-[var(--landing-muted)]">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { openModal, modals } = useApp();

  return (
    <div className="cena-landing min-h-screen overflow-x-hidden">
      <Navigation />
      <Hero />
      <ProductProofSection />
      <ToolsSection />

      {/* About Section */}
      <section id="about" className="landing-section">
        <div className="landing-shell">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="landing-eyebrow mb-3">// Plataforma</p>
            <h2 className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]">
              MÓDULOS PARA OPERAR <span className="landing-outline-text">CADA JOB</span>
            </h2>
            <p className="landing-copy max-w-2xl">
              A plataforma conecta as partes que mais se perdem na rotina: projeto, cliente,
              briefing, IA, arquivos, revisão, equipe e documentos.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_HIGHLIGHTS.map((section, idx) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="landing-card group p-6"
                >
                  <div className="relative z-10 mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center border border-[var(--landing-line)] bg-[var(--landing-glass-soft)] transition group-hover:border-frame-orange/40">
                      <Icon className="w-5 h-5 text-frame-orange" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--landing-text)]">{section.title}</h3>
                  </div>
                  <ul className="relative z-10 space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[var(--landing-muted)]">
                        <CheckCircle className="w-3.5 h-3.5 text-frame-orange shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="landing-section">
        <div className="landing-shell">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="landing-eyebrow mb-3">// Fluxo de Trabalho</p>
            <h2 className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]">
              DO CONCEITO À <span className="landing-accent-text">ENTREGA</span>
            </h2>
            <p className="landing-copy mx-auto max-w-2xl">
              Seis etapas que cobrem todo o ciclo de produção audiovisual, integradas em uma plataforma única.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FLOW.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="landing-card group p-6"
              >
                <span className="relative z-10 text-[2.5rem] font-bold text-frame-orange/40 transition group-hover:text-frame-orange">
                  {item.step}
                </span>
                <h3 className="relative z-10 mt-2 mb-1 text-lg font-bold text-[var(--landing-text)]">{item.title}</h3>
                <p className="relative z-10 text-sm text-[var(--landing-muted)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <button
              onClick={() => openModal("demo")}
              className="frame-btn-primary inline-flex items-center gap-2"
            >
              Ver plataforma completa <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      <PricingSection />

      {/* Contact Section */}
      <section id="contact" className="landing-section">
        <div className="landing-shell max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-glass-strong px-6 py-12 sm:px-10 sm:py-16"
          >
            <p className="landing-eyebrow mb-3">// Contato</p>
            <h2 className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]">
              VAMOS <span className="landing-outline-text">CONVERSAR</span>
            </h2>
            <p className="landing-copy mx-auto mb-10 max-w-xl">
              Quer saber mais sobre a plataforma, tirar dúvidas ou solicitar uma demonstração personalizada para sua produtora?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => openModal("contact")}
                className="frame-btn-primary inline-flex items-center gap-2"
              >
                Enviar Mensagem
              </button>
              <button
                onClick={() => openModal("demo")}
                className="frame-btn-ghost inline-flex items-center gap-2"
              >
                Agendar Demonstração <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            <div className="landing-card p-5">
              <p className="relative z-10 mb-2 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">Email</p>
              <p className="relative z-10 text-sm text-[var(--landing-muted)]">contato@cenastudio.com.br</p>
            </div>
            <div className="landing-card p-5">
              <p className="relative z-10 mb-2 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">Suporte</p>
              <p className="relative z-10 text-sm text-[var(--landing-muted)]">suporte@cenastudio.com.br</p>
            </div>
            <div className="landing-card p-5">
              <p className="relative z-10 mb-2 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">Horário</p>
              <p className="relative z-10 text-sm text-[var(--landing-muted)]">Seg-Sex, 9h às 18h</p>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      {modals.contact && <ContactModal />}
      {modals.checkout && <CheckoutModal />}
      {modals.demo && <DemoModal />}
    </div>
  );
}
