import React, { createContext, useCallback, useContext, useState } from "react";
import type { Language } from "@/lib/types";

export type { Language };

const TRANSLATIONS: Record<Language, Record<string, string | Record<string, unknown>>> = {
  pt: {
    "language.label": "Idioma",
    "language.pt": "PT",
    "language.en": "EN",
    navigation: {
      product: "Produto",
      tools: "Ferramentas",
      about: "Sobre",
      pricing: "Preços",
      contact: "Contato",
    },
    hero: {
      tag: "Feito por filmmakers, para filmmakers",
      title: ["SISTEMA", "OPERACIONAL", "AUDIOVISUAL"],
      subtitle:
        "Crie projetos com briefing, gere documentos com IA, organize arquivos, acompanhe aprovações e mantenha cliente, equipe e entrega dentro do mesmo fluxo.",
      cta: {
        primary: "Entrar no Produto",
        secondary: "Ver fluxo real",
      },
      stats: [
        { number: "IA", label: "Documentos de produção" },
        { number: "JOB", label: "Centro de operação" },
        { number: "BR", label: "Produto em evolução" },
      ],
    },
    login: "Login",
    start: "Começar",
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
    proof: {
      eyebrow: "// Produto real, não mockup",
      heading: "A OPERAÇÃO APARECE <span class=\"landing-outline-text\">NA TELA</span>",
      copy: "Prints capturados da aplicação rodando localmente: painel, centro do job e studio de IA com um projeto demo real.",
    },
    useCases: {
      eyebrow: "// Casos de uso",
      heading: "PARA QUEM PRODUZ <span class=\"landing-accent-text\">AUDIOVISUAL</span>",
      copy: "O foco inicial é operação audiovisual real: planejamento, documentos, arquivos, revisão, cliente e equipe.",
    },
    workflow: {
      eyebrow: "// Fluxo de Trabalho",
      heading: "DO CONCEITO À <span class=\"landing-accent-text\">ENTREGA</span>",
      copy: "Seis etapas que cobrem todo o ciclo de produção audiovisual, integradas em uma plataforma única.",
    },
    seePlatform: "Ver plataforma completa",
    contact: {
      eyebrow: "// Contato",
      heading: "VAMOS <span class=\"landing-outline-text\">CONVERSAR</span>",
      copy: "Quer saber mais sobre a plataforma, tirar dúvidas ou solicitar uma demonstração personalizada para sua produtora?",
      sendMessage: "Enviar Mensagem",
      scheduleDemo: "Agendar Demonstração",
    },
    footer: {
      platform: "Plataforma",
      operation: "Operação",
      legal: "Legal",
      support: "Suporte",
      realProduct: "Produto real",
      studioIA: "Estúdio IA",
      files: "Arquivos",
      videoReview: "Review de Vídeo",
      about: "Sobre",
      flow: "Fluxo",
      plans: "Planos",
      contact: "Contato",
      terms: "Termos",
      privacy: "Privacidade",
      cookies: "Cookies",
      scheduleDemo: "Agendar demo",
      productCenter: "Central do produto",
      login: "Login",
    },
    landing: {
      about: {
        eyebrow: "// Plataforma",
        title: { part1: "MÓDULOS PARA OPERAR", highlight: "CADA JOB" },
        copy: "A plataforma conecta as partes que mais se perdem na rotina: projeto, cliente, briefing, IA, arquivos, revisão, equipe e documentos.",
      },
      highlights: {
        iaStudio: {
          title: "Estúdio IA",
          item1: "Roteiro por projeto",
          item2: "Callsheet inteligente",
          item3: "Decupagem técnica",
          item4: "Orçamento estruturado",
          item5: "Briefing, contrato, proposta",
        },
        files: {
          title: "Gestão de Arquivos",
          item1: "Upload por projeto",
          item2: "Organização de materiais",
          item3: "Preview quando disponível",
          item4: "Filtros por tipo",
          item5: "Download direto",
        },
        videoReview: {
          title: "Review de Vídeo",
          item1: "Review por projeto",
          item2: "Comentários com timestamp",
          item3: "Status de aprovação",
          item4: "Links compartilháveis",
          item5: "Histórico de revisão",
        },
        crm: {
          title: "CRM de Clientes",
          item1: "Cadastro de clientes",
          item2: "Pipeline comercial",
          item3: "Segmentação por perfil",
          item4: "Histórico de interações",
          item5: "Dados comerciais",
        },
        operation: {
          title: "Operação",
          item1: "Projetos ativos",
          item2: "Briefings pendentes",
          item3: "Atividades recentes",
          item4: "Plano e cota",
          item5: "Indicadores do estúdio",
        },
        pipeline: {
          title: "Pipeline & Colaboração",
          item1: "Fluxo por etapa",
          item2: "Convite de colaboradores",
          item3: "Compartilhamento externo",
          item4: "Aprovação de vídeo",
          item5: "Equipe por projeto",
        },
      },
      flow: {
        step1: { title: "Projeto", desc: "Crie um projeto e cadastre o cliente" },
        step2: { title: "Pré-produção", desc: "Roteiro, briefing, decupagem e callsheet com IA" },
        step3: { title: "Orçamento", desc: "Proposta, contrato e orçamento automático" },
        step4: { title: "Produção", desc: "Checklist, cronograma e gestão de arquivos" },
        step5: { title: "Revisão", desc: "Review de vídeo com anotações e aprovação" },
        step6: { title: "Entrega", desc: "Relatório final e faturamento" },
      },
      screens: {
        dashboard: {
          label: "Painel operacional",
          title: "O que precisa de atenção aparece primeiro",
          desc: "Projetos ativos, briefing pendente, plano atual e próximo passo ficam na entrada do app.",
        },
        projectHub: {
          label: "Centro do job",
          title: "Cada job vira um centro de produção",
          desc: "Objetivo, prazo, direção criativa, progresso, equipe e atalhos seguem conectados ao projeto.",
        },
        studio: {
          label: "Studio IA",
          title: "IA sem perder o contexto do projeto",
          desc: "Roteiro, decupagem, callsheet, briefing e documentos operam dentro do job selecionado.",
        },
      },
      useCases: {
        freelancers: {
          title: "Freelas e creators",
          desc: "Sair do improviso: briefing, roteiro, arquivos e entrega em um fluxo simples por projeto.",
        },
        smallStudios: {
          title: "Produtoras pequenas",
          desc: "Organizar jobs simultâneos com cliente, IA, arquivos, aprovações e equipe conectados.",
        },
        agencies: {
          title: "Agências e social teams",
          desc: "Produzir campanhas com múltiplos formatos, histórico por cliente e revisão centralizada.",
        },
      },
      proof: {
        eyebrow: "Produto real, não mockup",
        heading: "A OPERAÇÃO APARECE <span class=\"landing-outline-text\">NA TELA</span>",
        copy: "Prints capturados da aplicação rodando localmente: painel, centro do job e studio de IA com um projeto demo real.",
        step1: "Criar briefing",
        step2: "Gerar documentos",
        step3: "Acompanhar entrega",
      },
      seePlatform: "Ver plataforma completa",
    },
  },
  en: {
    "language.label": "Language",
    "language.pt": "PT",
    "language.en": "EN",
    navigation: {
      product: "Product",
      tools: "Tools",
      about: "About",
      pricing: "Pricing",
      contact: "Contact",
    },
    hero: {
      tag: "Made by filmmakers, for filmmakers",
      title: ["SYSTEM", "OPERATIONAL", "VIDEOUL"],
      subtitle:
        "Create projects with briefing, generate documents with AI, organize files, track approvals, and keep client, team, and delivery in the same workflow.",
      cta: {
        primary: "Enter Product",
        secondary: "See real flow",
      },
      stats: [
        { number: "AI", label: "Production documents" },
        { number: "JOB", label: "Operations center" },
        { number: "BR", label: "Product in evolution" },
      ],
    },
    login: "Login",
    start: "Get Started",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    proof: {
      eyebrow: "// Real product, not mockup",
      heading: "THE OPERATION APPEARS <span class=\"landing-outline-text\">ON SCREEN</span>",
      copy: "Screenshots from the running application: panel, job center, and AI studio with a real demo project.",
    },
    useCases: {
      eyebrow: "// Use cases",
      heading: "FOR WHO PRODUCES <span class=\"landing-accent-text\">VIDEOUL</span>",
      copy: "The initial focus is real audiovisual operations: planning, documents, files, review, client, and team.",
    },
    workflow: {
      eyebrow: "// Workflow",
      heading: "FROM CONCEPT TO <span class=\"landing-accent-text\">DELIVERY</span>",
      copy: "Six stages covering the entire audiovisual production cycle, integrated in a single platform.",
    },
    seePlatform: "See full platform",
    contact: {
      eyebrow: "// Contact",
      heading: "LET'S <span class=\"landing-outline-text\">TALK</span>",
      copy: "Want to know more about the platform, have questions, or request a personalized demo for your production company?",
      sendMessage: "Send Message",
      scheduleDemo: "Schedule Demo",
    },
    footer: {
      platform: "Platform",
      operation: "Operation",
      legal: "Legal",
      support: "Support",
      realProduct: "Real product",
      studioIA: "AI Studio",
      files: "Files",
      videoReview: "Video Review",
      about: "About",
      flow: "Flow",
      plans: "Plans",
      contact: "Contact",
      terms: "Terms",
      privacy: "Privacy",
      cookies: "Cookies",
      scheduleDemo: "Schedule demo",
      productCenter: "Product center",
      login: "Login",
    },
    landing: {
      about: {
        eyebrow: "// Platform",
        title: { part1: "MODULES TO OPERATE", highlight: "EVERY JOB" },
        copy: "The platform connects the parts that get lost in daily routine: project, client, briefing, AI, files, review, team, and documents.",
      },
      highlights: {
        iaStudio: {
          title: "AI Studio",
          item1: "Script by project",
          item2: "Smart callsheet",
          item3: "Technical breakdown",
          item4: "Structured budget",
          item5: "Briefing, contract, proposal",
        },
        files: {
          title: "File Management",
          item1: "Upload by project",
          item2: "Material organization",
          item3: "Preview when available",
          item4: "Filter by type",
          item5: "Direct download",
        },
        videoReview: {
          title: "Video Review",
          item1: "Review by project",
          item2: "Timestamped comments",
          item3: "Approval status",
          item4: "Shareable links",
          item5: "Review history",
        },
        crm: {
          title: "Client CRM",
          item1: "Client registration",
          item2: "Commercial pipeline",
          item3: "Profile segmentation",
          item4: "Interaction history",
          item5: "Commercial data",
        },
        operation: {
          title: "Operations",
          item1: "Active projects",
          item2: "Pending briefings",
          item3: "Recent activities",
          item4: "Plan and quota",
          item5: "Studio indicators",
        },
        pipeline: {
          title: "Pipeline & Collaboration",
          item1: "Stage flow",
          item2: "Collaborator invites",
          item3: "External sharing",
          item4: "Video approval",
          item5: "Team by project",
        },
      },
      flow: {
        step1: { title: "Project", desc: "Create a project and register the client" },
        step2: { title: "Pre-production", desc: "Script, briefing, breakdown and callsheet with AI" },
        step3: { title: "Budget", desc: "Proposal, contract and automatic budget" },
        step4: { title: "Production", desc: "Checklist, schedule and file management" },
        step5: { title: "Review", desc: "Video review with annotations and approval" },
        step6: { title: "Delivery", desc: "Final report and billing" },
      },
      screens: {
        dashboard: {
          label: "Operations Panel",
          title: "What needs attention appears first",
          desc: "Active projects, pending briefing, current plan and next step are at the app's entrance.",
        },
        projectHub: {
          label: "Job Center",
          title: "Each job becomes a production center",
          desc: "Objective, deadline, creative direction, progress, team and shortcuts stay connected to the project.",
        },
        studio: {
          label: "AI Studio",
          title: "AI without losing project context",
          desc: "Script, breakdown, callsheet, briefing and documents operate within the selected job.",
        },
      },
      useCases: {
        freelancers: {
          title: "Freelancers and creators",
          desc: "Get out of improvisation: briefing, script, files and delivery in a simple per-project workflow.",
        },
        smallStudios: {
          title: "Small studios",
          desc: "Organize simultaneous jobs with client, AI, files, approvals and team connected.",
        },
        agencies: {
          title: "Agencies and social teams",
          desc: "Produce campaigns with multiple formats, history by client and centralized review.",
        },
      },
      proof: {
        eyebrow: "Real product, not mockup",
        heading: "THE OPERATION APPEARS <span class=\"landing-outline-text\">ON SCREEN</span>",
        copy: "Screenshots from the running application: panel, job center, and AI studio with a real demo project.",
        step1: "Create briefing",
        step2: "Generate documents",
        step3: "Track delivery",
      },
      seePlatform: "See full platform",
    },
  },
};

type LanguageContextType = {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (key: string) => string | Record<string, unknown>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("language") as Language | null;
      if (saved === "pt" || saved === "en") return saved;
    }
    return "pt";
  });

  const setLocaleCallback = useCallback((lang: Language) => {
    setLocale(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("language", lang);
    }
  }, []);

  const t = (key: string): string | Record<string, unknown> => {
    const parts = key.split(".");
    let value: unknown = TRANSLATIONS[locale];
    for (const part of parts) {
      if (typeof value === "object" && value !== null && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    return typeof value === "string" ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale: setLocaleCallback, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}