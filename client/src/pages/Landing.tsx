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
  FileVideo, FileText, Users, BarChart3, GitBranch, Film,
  MessageSquare, FolderOpen, CheckCircle, ArrowRight,
} from "lucide-react";

const PLATFORM_HIGHLIGHTS = [
  {
    icon: Film,
    title: "Estúdio IA",
    items: ["Roteiro inteligente", "Callsheet automático", "Decupagem técnica", "Orçamento em segundos", "Briefing, contrato, proposta"],
  },
  {
    icon: FolderOpen,
    title: "Gestão de Arquivos",
    items: ["Upload drag-and-drop", "Organização por projeto", "Preview de imagens e vídeos", "Filtros por tipo de arquivo", "Download direto"],
  },
  {
    icon: MessageSquare,
    title: "Review de Vídeo",
    items: ["Player com anotações no frame", "Comentários com timestamp", "Marcadores no timeline", "Aprovação e rejeição", "Links compartilháveis"],
  },
  {
    icon: Users,
    title: "CRM de Clientes",
    items: ["Cadastro completo", "Kanban de oportunidades", "Segmentação por perfil", "Histórico de interações", "Gestão financeira"],
  },
  {
    icon: BarChart3,
    title: "Analytics",
    items: ["Métricas de produção", "Relatórios de desempenho", "Acompanhamento de projetos", "Receita por cliente", "Indicadores do estúdio"],
  },
  {
    icon: GitBranch,
    title: "Pipeline & Colaboração",
    items: ["Pipeline de produção", "Convite de colaboradores", "Compartilhamento externo", "Notificações em tempo real", "Fluxo de aprovação"],
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

export default function Landing() {
  const { openModal, modals } = useApp();

  return (
    <div className="cinematic-theme min-h-screen bg-frame-black text-frame-white overflow-x-hidden">
      <Navigation />
      <Hero />
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
              TUDO QUE VOCÊ PRECISA <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">NUM SÓ LUGAR</em>
            </h2>
            <p className="text-frame-gray-light text-[0.93rem] font-light max-w-2xl leading-relaxed">
              Do roteiro à entrega final, o Frame.ai unifica todas as etapas da produção audiovisual
              em uma plataforma integrada com inteligência artificial.
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
              <p className="text-sm text-frame-gray-light">contato@frame.ai</p>
            </div>
            <div className="border border-frame-gray-3 p-5">
              <p className="font-frame-mono text-[0.56rem] tracking-[0.2em] uppercase text-frame-orange mb-2">Suporte</p>
              <p className="text-sm text-frame-gray-light">suporte@frame.ai</p>
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
