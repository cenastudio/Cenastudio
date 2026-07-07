export const SITE_CONFIG = {
  title: "Cena Studio — Software para Produtoras de Vídeo | Gestão com IA",
  description:
    "Software para produtoras de vídeo: gerencie clientes, projetos, arquivos e aprovações em um só lugar. Gere documentos com IA e economize 10h/semana. Teste grátis.",
  domain: "cenastudio.dev",
};

export const NAVIGATION = [
  { label: "navigation.howItWorks", href: "#how-it-works" },
  { label: "navigation.tools", href: "#tools" },
  { label: "navigation.pricing", href: "#pricing" },
  { label: "navigation.contact", href: "#contact" },
];

export const HERO = {
  tag: "Feito por filmmakers, para filmmakers",
  title: ["DO BRIEFING", "À ENTREGA", "EM UM SÓ LUGAR"],
  subtitle:
    "Pare de perder tempo entre WhatsApp, Drive, planilhas e e-mails. Centralize cliente, equipe, arquivos e aprovações em um único lugar — pra você voltar a fazer cinema.",
  cta: {
    primary: { label: "Experimentar grátis por 14 dias", href: "/login" },
    secondary: { label: "Ver produto funcionando", href: "#product-proof" },
  },
  stats: [
    { number: "87+", label: "Produtoras ativas" },
    { number: "10h", label: "Economizadas/semana" },
    { number: "4.8★", label: "Avaliação média" },
  ],
};

export type PlanTier = "iniciante" | "profissional" | "produtora";

export const PRICING = [
  {
    id: "iniciante" as PlanTier,
    tier: "// Free",
    price: "R$0",
    period: "/mês",
    description: "Para freelancers validarem o fluxo com até 5 clientes",
    features: [
      "5 gerações com IA/mês",
      "Acesso inicial às ferramentas",
      "Export .txt",
      "Projetos para teste",
      "CRM básico de clientes",
      "Até 5 clientes cadastrados",
      "Suporte por email",
    ],
    cta: { label: "Começar Grátis", href: "#" },
    highlight: false,
  },
  {
    id: "profissional" as PlanTier,
    tier: "// Pro",
    price: "R$199",
    period: "/mês — mais popular",
    description: "Para profissionais operarem até 15 clientes ativos",
    roi: "💡 Economize 10h/mês em burocracia",
    features: [
      "15 clientes",
      "+ Clientes adicionais",
      "100 gerações com IA/mês",
      "Fluxos principais de produção",
      "Histórico completo",
      "Export PDF e DOCX",
      "Review de vídeos com anotações",
      "CRM completo + pipeline",
      "Suporte prioritário",
    ],
    cta: { label: "Assinar Pro", href: "#" },
    highlight: true,
  },
  {
    id: "produtora" as PlanTier,
    tier: "// Studio",
    price: "R$399",
    period: "/mês — ativação após pagamento",
    description: "Para produtoras com equipe, 50 clientes e operação compartilhada",
    roi: "🚀 Ganhe 20% mais capacidade operacional sem contratar",
    features: [
      "50 clientes",
      "+ Clientes adicionais",
      "Tudo do Profissional",
      "Gerações ilimitadas",
      "Projetos e pastas",
      "Equipe e colaboradores",
      "Arquivos e aprovações por projeto",
      "Suporte prioritário",
      "Relatórios operacionais",
    ],
    cta: { label: "Ativar Produtora", href: "#" },
    highlight: false,
  },
];

export const MARQUEE_ITEMS = [
  "PRÉ-PRODUÇÃO",
  "ROTEIRO IA",
  "CALLSHEET",
  "DECUPAGEM",
  "ORÇAMENTO",
  "CONTRATO",
  "PROPOSTA",
  "BRIEFING",
  "MOODBOARD",
  "CHECKLIST",
  "CRONOGRAMA",
  "ENTREGA",
  "ARQUIVOS",
  "REVIEW DE VÍDEO",
  "CRM",
  "PIPELINE",
  "ANALYTICS",
];

export const FOOTER_LINKS = {
  tools: {
    title: "Plataforma",
    links: [
      { label: "Produto real", href: "#product-proof" },
      { label: "Estúdio IA", href: "#tools" },
      { label: "Arquivos", href: "#tools" },
      { label: "Review de Vídeo", href: "#tools" },
    ],
  },
  company: {
    title: "Operação",
    links: [
      { label: "Sobre", href: "#about" },
      { label: "Fluxo", href: "#about" },
      { label: "Preços", href: "#pricing" },
      { label: "Contato", href: "#contact" },
    ],
  },
  legal: {
    title: "Legal",
    links: [
      { label: "Termos", href: "#" },
      { label: "Privacidade", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
  support: {
    title: "Suporte",
    links: [
      { label: "Agendar demo", href: "#contact" },
      { label: "Central do produto", href: "#product-proof" },
      { label: "Planos", href: "#pricing" },
      { label: "Login", href: "/login" },
    ],
  },
};
