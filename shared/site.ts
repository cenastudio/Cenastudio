export const SITE_CONFIG = {
  title: "Cena Studio",
  description:
    "Feito por filmmakers, para filmmakers. Central operacional para produtoras: projetos, IA, clientes, arquivos, aprovações, equipe e documentos conectados por job.",
  domain: "cenastudio.com.br",
};

export const NAVIGATION = [
  { label: "Produto", href: "#product-proof" },
  { label: "Ferramentas", href: "#tools" },
  { label: "Sobre", href: "#about" },
  { label: "Preços", href: "#pricing" },
  { label: "Contato", href: "#contact" },
];

export const HERO = {
  tag: "Feito por filmmakers, para filmmakers",
  title: ["SISTEMA", "OPERACIONAL", "AUDIOVISUAL"],
  subtitle:
    "Crie projetos com briefing, gere documentos com IA, organize arquivos, acompanhe aprovações e mantenha cliente, equipe e entrega dentro do mesmo fluxo.",
  cta: {
    primary: { label: "Entrar no Produto", href: "/login" },
    secondary: { label: "Ver fluxo real", href: "#" },
  },
  stats: [
    { number: "IA", label: "Documentos de produção" },
    { number: "JOB", label: "Centro de operação" },
    { number: "BR", label: "Produto em evolução" },
  ],
};

export type PlanTier = "iniciante" | "profissional" | "produtora";

export const PRICING = [
  {
    id: "iniciante" as PlanTier,
    tier: "// Free",
    price: "R$0",
    period: "/mês",
    description: "Para freelancers e criadores independentes",
    features: [
      "5 gerações com IA/mês",
      "Acesso inicial às ferramentas",
      "Export .txt",
      "Projetos para teste",
      "CRM básico de clientes",
      "Suporte por email",
    ],
    cta: { label: "Começar Grátis", href: "#" },
    highlight: false,
  },
  {
    id: "profissional" as PlanTier,
    tier: "// Pro",
    price: "R$49",
    period: "/mês — mais popular",
    description: "Para produtoras e profissionais",
    features: [
      "50 gerações com IA/mês",
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
    price: "R$99",
    period: "/mês",
    description: "Para grandes produtoras e agências",
    features: [
      "Tudo do Profissional",
      "Gerações ilimitadas",
      "Projetos e pastas",
      "Equipe e colaboradores",
      "Arquivos e aprovações por projeto",
      "Suporte prioritário",
      "Relatórios operacionais",
    ],
    cta: { label: "Falar com equipe", href: "#" },
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
