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
  FileText, Users, BarChart3, GitBranch, Film,
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
    label: "Hub por projeto",
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
    <section id="product-proof" className="py-24 px-6 sm:px-9 md:px-12 bg-frame-black border-t border-frame-gray-3">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-10 items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="frame-label mb-3">// Produto real, não mockup</p>
            <h2 className="frame-title text-[clamp(2.4rem,5vw,4.4rem)] text-frame-white leading-none mb-5">
              A OPERAÇÃO APARECE <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">NA TELA</em>
            </h2>
            <p className="text-frame-gray-light text-[0.95rem] leading-relaxed max-w-xl font-light">
              Prints capturados da aplicação rodando localmente: painel, hub do projeto e studio de IA com um projeto demo real.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-3 border border-frame-gray-3 bg-frame-gray-1/20"
          >
            {["Criar briefing", "Gerar documentos", "Acompanhar entrega"].map((step, index) => (
              <div key={step} className="p-4 sm:p-5 border-r border-frame-gray-3 last:border-r-0">
                <span className="block font-frame-mono text-[0.52rem] tracking-[0.16em] uppercase text-frame-orange mb-3">
                  0{index + 1}
                </span>
                <p className="text-xs sm:text-sm text-frame-white font-medium leading-snug">{step}</p>
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
              className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-10 items-center border border-frame-gray-3 bg-frame-gray-1/10 p-4 sm:p-6"
            >
              <div className="space-y-3">
                <p className="font-frame-mono text-[0.55rem] tracking-[0.18em] uppercase text-frame-orange">
                  {screen.label}
                </p>
                <h3 className="text-2xl font-semibold text-frame-white">{screen.title}</h3>
                <p className="text-sm text-frame-gray-light leading-relaxed">{screen.description}</p>
              </div>

              <div className="border border-frame-gray-3 bg-black overflow-hidden">
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
              <p className="frame-label mb-3">// Casos de uso</p>
              <h2 className="frame-title text-[clamp(2rem,3.8vw,3.2rem)] text-frame-white">
                PARA QUEM PRODUZ <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">AUDIOVISUAL</em>
              </h2>
            </div>
            <p className="text-sm text-frame-gray-light leading-relaxed max-w-md">
              O foco inicial é operação audiovisual real: planejamento, documentos, arquivos, revisão, cliente e equipe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
            {USE_CASES.map((useCase) => (
              <div key={useCase.title} className="border border-frame-gray-3 bg-frame-gray-1/10 p-6">
                <h3 className="text-lg font-semibold text-frame-white mb-2">{useCase.title}</h3>
                <p className="text-sm text-frame-gray-light leading-relaxed">{useCase.description}</p>
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
    <div className="cinematic-theme min-h-screen bg-frame-black text-frame-white overflow-x-hidden">
      <Navigation />
      <Hero />
      <ProductProofSection />
      <ToolsSection />

      {/* About Section */}
      <section id="about" className="py-24 px-9 md:px-12 bg-frame-black border-t border-frame-gray-3">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="frame-label mb-3">// Plataforma</p>
            <h2 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white mb-4">
              MÓDULOS PARA OPERAR <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">CADA JOB</em>
            </h2>
            <p className="text-frame-gray-light text-[0.93rem] font-light max-w-2xl leading-relaxed">
              A plataforma conecta as partes que mais se perdem na rotina: projeto, cliente,
              briefing, IA, arquivos, revisão, equipe e documentos.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5">
            {PLATFORM_HIGHLIGHTS.map((section, idx) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/10 p-6 hover:border-frame-orange/50 transition group"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-frame-gray-2 rounded-lg group-hover:bg-frame-orange/10 transition">
                      <Icon className="w-5 h-5 text-frame-orange" />
                    </div>
                    <h3 className="font-bold text-lg text-frame-white">{section.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-frame-gray-light">
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
      <section className="py-24 px-9 md:px-12 bg-frame-black border-t border-frame-gray-3">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="frame-label mb-3">// Fluxo de Trabalho</p>
            <h2 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white mb-4">
              DO CONCEITO À <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">ENTREGA</em>
            </h2>
            <p className="text-frame-gray-light text-[0.93rem] font-light max-w-2xl mx-auto leading-relaxed">
              Seis etapas que cobrem todo o ciclo de produção audiovisual, integradas em uma plataforma única.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5 max-w-5xl mx-auto">
            {PLATFORM_FLOW.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="border border-frame-gray-3 p-6 hover:border-frame-orange/30 transition group"
              >
                <span className="text-[2.5rem] font-bold text-frame-orange/20 group-hover:text-frame-orange/40 transition">
                  {item.step}
                </span>
                <h3 className="text-lg font-bold text-frame-white mt-2 mb-1">{item.title}</h3>
                <p className="text-sm text-frame-gray-light">{item.desc}</p>
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
      <section id="contact" className="py-24 px-9 md:px-12 bg-frame-black border-t border-frame-gray-3">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="frame-label mb-3">// Contato</p>
            <h2 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white mb-4">
              VAMOS <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">CONVERSAR</em>
            </h2>
            <p className="text-frame-gray-light text-[0.93rem] font-light max-w-xl mx-auto leading-relaxed mb-10">
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
            <div className="border border-frame-gray-3 p-5">
              <p className="font-frame-mono text-[0.56rem] tracking-[0.2em] uppercase text-frame-orange mb-2">Email</p>
              <p className="text-sm text-frame-gray-light">contato@cenastudio.com.br</p>
            </div>
            <div className="border border-frame-gray-3 p-5">
              <p className="font-frame-mono text-[0.56rem] tracking-[0.2em] uppercase text-frame-orange mb-2">Suporte</p>
              <p className="text-sm text-frame-gray-light">suporte@cenastudio.com.br</p>
            </div>
            <div className="border border-frame-gray-3 p-5">
              <p className="font-frame-mono text-[0.56rem] tracking-[0.2em] uppercase text-frame-orange mb-2">Horário</p>
              <p className="text-sm text-frame-gray-light">Seg-Sex, 9h às 18h</p>
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
