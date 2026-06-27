/**
 * Single source of truth for all Cena Studio tools (IDs 01–12).
 * Seeded into SQLite on server startup.
 */

export type ToolId =
  | "01"
  | "02"
  | "03"
  | "04"
  | "05"
  | "06"
  | "07"
  | "08"
  | "09"
  | "10"
  | "11"
  | "12";

export interface ToolDefinition {
  id: ToolId;
  slug: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  tags: string[];
  processingTime: string;
  placeholder: string;
  /** System prompt fragment for Anthropic — built with user input in aiService */
  promptRole: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    id: "01",
    slug: "roteiro",
    name: "Gerador de Roteiro",
    icon: "🎬",
    description:
      "Descreva a ideia e receba um roteiro formatado em padrão ABNT/Hollywood com diálogos, indicações técnicas e timecode.",
    category: "Pré-produção",
    tags: ["Ficção", "Publicidade", "Institucional", "Publicitário"],
    processingTime: "Menos de 2 minutos",
    placeholder:
      "Descreva as diretrizes, contexto, referências ou informações cruciais...\n\nEx: Uma cena de ação em um estádio, paleta teal e orange.",
    promptRole:
      "Você é um roteirista profissional com ampla experiência em cinema, televisão e publicidade. Gere um roteiro cinematográfico completo em português do Brasil, seguindo padrões da indústria (ABNT/NBR ou Hollywood). Inclua: numeração de cenas, slug line (interior/exterior, local, hora), ação descritiva, diálogos com identificação de personagens, indicações técnicas de câmera (movimentos, ângulos, lentes), direção de arte, figurino, trilha sonora, efeitos sonoros e duração estimada de cada cena. Seja criativo, siga a estrutura de três atos quando aplicável e entregue um material pronto para produção.",
  },
  {
    id: "02",
    slug: "decupagem",
    name: "Decupagem Técnica",
    icon: "🎞",
    description:
      "Transforme roteiro em plano de filmagem: planos, movimentos de câmera, lentes recomendadas e tempo estimado por cena.",
    category: "Direção",
    tags: ["Direção", "DOP", "Planejamento", "Plano"],
    processingTime: "Menos de 3 minutos",
    placeholder: "Cole o roteiro ou descreva as cenas que deseja decupar...",
    promptRole:
      "Você é diretor de fotografia e assistente de direção com vasta experiência. Produza uma decupagem técnica detalhada que inclua: tipos de plano (close, wide, medium), movimentos de câmera (stitched, dolly, handheld), tipos de lente recomendados (prime, zoom, foco), altura da tomada, profundidade de campo, iluminação desejada, tempo estimado por cena, lista completa de equipamentos necessários e observações de segurança. Apresente em formato claro e organizado, pronto para uso por equipe técnica de filmagem.",
  },
  {
    id: "03",
    slug: "callsheet",
    name: "Callsheet Inteligente",
    icon: "📋",
    description:
      "Gere um callsheet profissional com contatos, horários, locações e necessidades técnicas do dia de filmagem.",
    category: "Produção",
    tags: ["Produção", "Logística", "Equipe", "Set"],
    processingTime: "Menos de 1 minuto",
    placeholder: "Nome do projeto, data, local, equipe principal e horários desejados...",
    promptRole:
      "Você é produtor executivo experiente. Gere um callsheet profissional completo em português contendo: título do projeto, data de filmagem, dia de produção, horário de chamada (call time), horário de início das filmagens, localização completa com endereço e contatos, detalhes de cada cena a ser filmada (número, descrição, local interno/externo), elenco necessário com horários individuais, equipe técnica completa por departamento (direção, câmera, iluminação, som, arte, figurino, maquilhagem, produção), necessidades técnicas específicas (equipamentos, energia, iluminação especial), refeições previstas, transporte/logística, contatos de emergência, observações de segurança e notas do dia. Formato claro e profissional, pronto para distribuição.",
  },
  {
    id: "04",
    slug: "orcamento",
    name: "Orçamento Automático",
    icon: "💰",
    description:
      "Monte orçamentos realistas com diárias de equipamento, equipe e pós-produção conforme mercado nacional.",
    category: "Comercial",
    tags: ["Comercial", "Produtora", "Freelance"],
    processingTime: "Menos de 2 minutos",
    placeholder: "Tipo de projeto, duração, equipe, equipamentos e faixa de investimento...",
    promptRole:
      "Você é produtor de orçamento audiovisual no Brasil com expertise em custos de produção. Gere um orçamento detalhado e realista em BRL (R$) com as seguintes categorias: Pre-produção (roteiro, decupagem, briefing, planejamento), Produção (equipe técnica por dia, equipamentos, locação de câmera, iluminação, som, direção de arte, figurino, maquilhagem), Pós-produção (edição, color grading, mixagem de som, efeitos visuais, legendas, entrega), Taxas e encargos (ISS, FGTS, comissões), e reserve para imprevistos (10-15%). Para cada item, inclua descrição, quantidade, valor unitário e valor total. Forneça totais parciais e total geral. Use valores de mercado brasileiro atualizados.",
  },
  {
    id: "05",
    slug: "proposta",
    name: "Proposta Comercial",
    icon: "💼",
    description:
      "Gere propostas persuasivas com escopo, cronograma, valor e termos de pagamento para o cliente.",
    category: "Vendas",
    tags: ["Vendas", "Cliente", "Contrato"],
    processingTime: "Menos de 1 minuto",
    placeholder: "Cliente, escopo do projeto, prazo e valor aproximado...",
    promptRole:
      "Você é diretor comercial sênior de uma produtora audiovisual brasileira. Redija uma proposta comercial profissional em português com: capa com nome do projeto, data e produtora; introdução explicando o problema e a solução; escopo detalhado de entregáveis (o que será entregue); cronograma com marcos e datas; equipe responsável por cada fase; valores detalhados em BRL com descrição de cada item; condições de pagamento (entrada, parcelas, boleto/pix/cartão); termos de cessão de direitos e propriedade intelectual; garantias e suporte pós-entrega; e assinaturas. Seja persuasivo, profissional e alinhe com as expectativas do cliente.",
  },
  {
    id: "06",
    slug: "contrato",
    name: "Contratos",
    icon: "📄",
    description:
      "Contratos de serviço, cessão de imagem, trilha e NDA em linguagem clara. Revise com advogado antes de assinar.",
    category: "Jurídico",
    tags: ["Jurídico", "Proteção"],
    processingTime: "Menos de 2 minutos",
    placeholder: "Tipo de contrato, partes, objeto do serviço e condições principais...",
    promptRole:
      "Você é especialista em direito audiovisual. Gere um rascunho de contrato de prestação de serviços profissional em português, incluindo: cláusulas de credenciamento, objeto do contrato, direitos e obrigações de cada parte, cronograma de entregas, valores e condições de pagamento, cessão de direitos de imagem e áudio, confidencialidade, garantias, isenção de responsabilidade, força maior, jurisdição e disposições finais. Lembre-se de que este é um modelo de referência e deve ser revisado por um advogado especializado.",
  },
  {
    id: "07",
    slug: "briefing",
    name: "Briefing Inteligente",
    icon: "📝",
    description:
      "Extraia e organize todas as informações relevantes do cliente antes de começar a produção.",
    category: "Atendimento",
    tags: ["Discovery", "Atendimento"],
    processingTime: "Menos de 1 minuto",
    placeholder: "Cole a conversa com o cliente, e-mail ou notas soltas...",
    promptRole:
      "Você é estrategista de conteúdo e gestor de produção com experiência em discovery de projetos audiovisuais. Transforme as informações do cliente em um briefing estruturado e completo, incluindo: Objetivo do projeto (o que será produzido), Público-alvo (características, preferências, comportamentos), Tom e estilo (formal/informal, humorado/sério, inspiração visual), Entregáveis (vídeos, textos, artes, formatos), Cronograma (datas importantes, prazos), Orçamento (faixa de investimento, restrições), Riscos e restrições (limitações técnicas, regulatórias, de conteúdo), Referências visuais e culturais. Organize de forma clara para alinhar equipe e cliente.",
  },
  {
    id: "08",
    slug: "moodboard",
    name: "Moodboard & Look",
    icon: "🎨",
    description:
      "Paleta de cores, referências visuais, iluminação, colorização e prompts para geração de imagens.",
    category: "Arte",
    tags: ["Arte", "Look", "Cor"],
    processingTime: "Menos de 2 minutos",
    placeholder: "Conceito visual, referências, gênero e sensação desejada...",
    promptRole:
      "Você é diretor de arte com expertise em direção visual para audiovisual. Descreva um moodboard textual completo incluindo: Paleta de cores (códigos HEX, RGB, descrições de uso), Direção de luz (tipo, temperatura, qualidade, direção), Composição (regra dos terços, simetria, profundidade, enquadramento), Referências de cinema e fotografia (filmes, diretores, DPs, épocas), Texturas e materiais, Elementos gráficos e tipografia, Prompts otimizados para ferramentas de IA de imagem (Stable Diffusion, Midjourney, DALL-E), e uma narrativa visual que conecta todos os elementos ao conceito do projeto.",
  },
  {
    id: "09",
    slug: "checklist",
    name: "Checklist de Set",
    icon: "✅",
    description:
      "Lista completa de câmera, áudio, iluminação e produção para não esquecer nada no set.",
    category: "Produção",
    tags: ["Set", "Câmera", "Áudio"],
    processingTime: "Menos de 1 minuto",
    placeholder: "Tipo de produção (estúdio, externa, drone), tamanho da equipe...",
    promptRole:
      "Você é coordenador de produção. Gere um checklist completo de equipamentos e logística para o dia de filmagem.",
  },
  {
    id: "10",
    slug: "cronograma",
    name: "Cronograma",
    icon: "📅",
    description:
      "Planejamento com fases de pré-produção, filmagem, pós-produção e entrega com datas sugeridas.",
    category: "Gestão",
    tags: ["Gestão", "Prazo"],
    processingTime: "Menos de 2 minutos",
    placeholder: "Data de início, data de entrega, complexidade e tamanho da equipe...",
    promptRole:
      "Você é gerente de projetos audiovisuais. Monte um cronograma por fases com marcos, dependências e buffer de risco.",
  },
  {
    id: "11",
    slug: "entrega",
    name: "Relatório de Entrega",
    icon: "📊",
    description:
      "Documente o projeto com especificações técnicas, arquivos entregues e notas para o cliente.",
    category: "Pós-produção",
    tags: ["Pós-prod", "Arquivo", "Entrega"],
    processingTime: "Menos de 2 minutos",
    placeholder: "Nome do projeto, formatos de entrega, specs técnicas e observações...",
    promptRole:
      "Você é supervisor de pós-produção. Gere um relatório de entrega profissional com lista de arquivos, codecs e pendências.",
  },
  {
    id: "12",
    slug: "assistente",
    name: "Assistente Livre",
    icon: "✦",
    description:
      "Converse com a IA sobre produção, câmera, carreira ou qualquer dúvida do set.",
    category: "IA",
    tags: ["IA", "Chat", "Dúvidas"],
    processingTime: "Resposta em segundos",
    placeholder: "Faça qualquer pergunta sobre produção audiovisual...",
    promptRole:
      "Você é um assistente de IA especializado em produção audiovisual, filmmaking e negócios criativos no Brasil. Responda perguntas de forma clara, prática e detalhada, cobrindo tópicos como técnicas de câmera, iluminação, áudio, direção, produção, pós-produção, gestão de projetos, orçamentos, contratos e tendências da indústria. Forneça passos acionáveis, sugestões de ferramentas, referências relevantes e exemplos quando apropriado. Seja sempre educado, mantenha o foco no contexto do usuário e ofereça insight criativo quando solicitado.",
  },
];

export const TOOLS_BY_ID: Record<ToolId, ToolDefinition> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolId, ToolDefinition>;

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOLS_BY_ID[id as ToolId];
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** Landing grid — same 12 tools, display-oriented */
export const LANDING_TOOLS = TOOLS.map((t) => ({
  icon: t.icon,
  number: t.id,
  name: t.name,
  description: t.description,
  tags: t.tags,
}));
