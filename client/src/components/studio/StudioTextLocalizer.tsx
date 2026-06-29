import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const TEXT_EN: Record<string, string> = {
  "Sua Dúvida ou Consulta": "Your question or request",
  "Dica: Após gerar a resposta inicial no painel direito, você pode usar a aba \"Refinar com IA\" para continuar a conversa e detalhar as respostas da IA.": "Tip: after generating the first answer in the right panel, use the “Refine with AI” tab to continue the conversation and expand the response.",
  "// Cliente & Identidade": "// Client & identity",
  "Nome do Cliente / Empresa": "Client / company name",
  "Segmento de Atuação": "Industry segment",
  "Tipo de Conteúdo/Vídeo": "Content/video type",
  "// Contexto": "// Context",
  "Objetivo Principal": "Main objective",
  "Público-Alvo": "Target audience",
  "Canal de Veiculação principal": "Main distribution channel",
  "Duração Desejada": "Desired duration",
  "Prazo Ideal": "Ideal deadline",
  "Referências de Vídeos": "Video references",
  "O que NÃO deve aparecer/conter (Restrições)": "What must NOT appear / restrictions",
  "// Escopo do Projeto": "// Project scope",
  "Tipo de Produção": "Production type",
  "Nº de Diárias": "Number of shoot days",
  "Nº de Locações": "Number of locations",
  "// Recursos": "// Resources",
  "Tamanho da Equipe Técnica": "Technical crew size",
  "Elenco / Atores": "Cast / actors",
  "// Equipamento": "// Equipment",
  "Câmeras & Ópticas": "Cameras & lenses",
  "Drone e Capturas Aéreas": "Drone and aerial footage",
  "Kit de Iluminação": "Lighting kit",
  "// Pós-Produção & Finalização": "// Post-production & finishing",
  "Serviços de Edição / Montagem": "Editing / assembly services",
  "Trilha Sonora / Licenciamento": "Soundtrack / licensing",
  "// Produção & Locação": "// Production & location",
  "Nome da Produção": "Production name",
  "Data de Filmagem": "Shoot date",
  "Local / Cidade": "Location / city",
  "Endereço da Locação": "Location address",
  "Call Time Geral": "General call time",
  "Início das Filmagens": "Shoot start",
  "Wrap Previsto (Término)": "Expected wrap",
  "// Equipe": "// Crew",
  "Direção": "Direction",
  "Produção": "Production",
  "Câmera": "Camera",
  "Som": "Sound",
  "Equipe Extra": "Extra crew",
  "// Logística & Notas": "// Logistics & notes",
  "Equipamentos Principais": "Main equipment",
  "Instruções / Alimentação / Notas de Set": "Instructions / catering / set notes",
  "// Modelo Contratual": "// Contract model",
  "Tipo de Contrato": "Contract type",
  "// Partes Contratantes": "// Contracting parties",
  "Contratante (Cliente)": "Contracting party (client)",
  "Documento do Contratante": "Client document",
  "Contratado (Você)": "Contractor (you)",
  "Documento do Contratado": "Contractor document",
  "// Objeto do Serviço": "// Service object",
  "Objeto (Descrição do Serviço)": "Object (service description)",
  "Valor Total": "Total value",
  "Prazo de Vigência/Entrega": "Term / delivery deadline",
  "Foro para Resolução de Conflitos": "Jurisdiction for dispute resolution",
  "// Cena": "// Scene",
  "Descrição da Cena": "Scene description",
  "Número de Planos": "Number of shots",
  "Duração Estimada": "Estimated duration",
  "// Câmera & Estilo Visual": "// Camera & visual style",
  "Modelo da Câmera / Sensor": "Camera model / sensor",
  "Movimento de Câmera": "Camera movement",
  "Referência Estética / Fotografia": "Aesthetic / photography reference",
  "Equipe Técnica Principal": "Key technical crew",
  "Observações / Luz Disponível": "Notes / available light",
  "// Identificação do Projeto": "// Project identification",
  "Nome do Projeto": "Project name",
  "Cliente / Empresa": "Client / company",
  "Data de Início": "Start date",
  "Data de Entrega": "Delivery date",
  "// Entregáveis & Specs": "// Deliverables & specs",
  "Arquivos Entregues": "Delivered files",
  "Especificações Técnicas dos Arquivos": "Technical file specifications",
  "Notas Finais / Instruções para o Cliente": "Final notes / client instructions",
  "Descrição / contexto geral": "Description / general context",
  "// Conceito & Estética": "// Concept & aesthetics",
  "Tom Visual": "Visual tone",
  "Referências Visuais (Diretores/Filmes)": "Visual references (directors/films)",
  "Paleta de Cores": "Color palette",
  "// Aspectos Técnicos do Look": "// Technical look aspects",
  "Proporção de Tela (Aspect Ratio)": "Aspect ratio",
  "Look de Colorização / Color Grading": "Color grading look",
  "Estilo de Iluminação": "Lighting style",
  "Descrição Sensorial do Projeto": "Sensory description of the project",
  "// Identidade do Proponente": "// Proponent identity",
  "Nome da Produtora / Empresa": "Production company name",
  "Seu Nome Completo": "Your full name",
  "Credenciais / Experiência": "Credentials / experience",
  "// O Negócio": "// The business",
  "Nome do Cliente": "Client name",
  "Escopo Detalhado do Projeto": "Detailed project scope",
  "Valor da Proposta": "Proposal value",
  "Prazo de Entrega": "Delivery deadline",
  "Condição de Pagamento": "Payment terms",
  "Revisões Inclusas no Valor": "Revisions included",
  "Tom de Comunicação": "Communication tone",
  "// Projeto": "// Project",
  "Título do Roteiro": "Script title",
  "Formato": "Format",
  "Duração": "Duration",
  "Gênero / Tom": "Genre / tone",
  "// História & Conceito": "// Story & concept",
  "Sinopse / Ideia Central": "Synopsis / core idea",
  "Personagens Principais": "Main characters",
  "Locações": "Locations",
  "Referências Estéticas": "Aesthetic references",
  "Observações Especiais": "Special notes",
  "Equipe Envolvida": "Crew involved",
  "Entregáveis Finais do Projeto": "Final project deliverables",
  "Tipo de Produção / Detalhes do Set": "Production type / set details",
};

const ATTRIBUTE_EN: Record<string, string> = {
  "Ex: Como estruturar um plano de contingência para filmagens na chuva? Quais os microfones indicados para som direto em externa com vento?": "Ex: How should I structure a contingency plan for rain shoots? Which microphones work best for windy exteriors?",
  "Ex: Startup TechXYZ": "Ex: TechXYZ startup",
  "Ex: Tecnologia, Saúde, Educação, Finanças": "Ex: Technology, health, education, finance",
  "O que o cliente deseja comunicar com este vídeo? Qual o problema a resolver?": "What does the client want to communicate with this video? What problem should it solve?",
  "Ex: Jovens profissionais de 20-30 anos, B2B...": "Ex: young professionals aged 20–30, B2B...",
  "Ex: YouTube, Instagram, TV Corporativa, Site Institucional": "Ex: YouTube, Instagram, corporate TV, institutional website",
  "Ex: Estilo documentário da Apple, cores frias...": "Ex: Apple documentary style, cool colors...",
  "Linguagem agressiva, piadas internas, cenas externas de dia...": "Aggressive language, inside jokes, daytime exterior scenes...",
  "Razão Social / Nome completo": "Legal name / full name",
  "Seu nome / Nome da sua empresa": "Your name / company name",
  "Descreva o serviço a ser contratado de forma precisa...": "Describe the contracted service precisely...",
  "Descreva as instruções para a ferramenta...": "Describe the instructions for the tool...",
  "Ex: Perseguição em rua movimentada, noturno, 2 personagens...": "Ex: chase on a busy street, night, 2 characters...",
  "Ex: Cidade de Deus, Drive, Euphoria": "Ex: City of God, Drive, Euphoria",
  "Ex: Diretor, DOP, Assistente de Câmera, Gaffer": "Ex: Director, DOP, camera assistant, gaffer",
  "Luz natural, kit de LED portátil, locação externa sem energia...": "Natural light, portable LED kit, exterior location without power...",
  "Descreva o sentimento, atmosfera e o ambiente visual do projeto...": "Describe the feeling, atmosphere and visual world of the project...",
  "Roteirização, 2 diárias de gravação em estúdio com equipamentos de ponta, edição finalizada com trilha sonora...": "Scriptwriting, 2 studio shoot days with high-end gear, final edit with soundtrack...",
  "Ex: 30 dias úteis": "Ex: 30 business days",
  "Descreva a história ou o conceito...": "Describe the story or concept...",
  "Restrições, mensagem central, chamadas de ação...": "Restrictions, core message, calls to action...",
};

function localizeText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return TEXT_EN[normalized] ?? ATTRIBUTE_EN[normalized] ?? value;
}

const originalTextNodes = new WeakMap<Text, string>();

function localizeElement(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const original = originalTextNodes.get(node) ?? node.nodeValue ?? "";
    originalTextNodes.set(node, original);
    const next = localizeText(original);
    if (next !== original && node.nodeValue !== original.replace(original.trim(), next)) {
      node.nodeValue = original.replace(original.trim(), next);
    }
    node = walker.nextNode() as Text | null;
  }

  root.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => {
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const value = element.getAttribute(attr);
      if (!value) continue;
      const dataKey = `original${attr.replace(/(^|-)([a-z])/g, (_, __, char: string) => char.toUpperCase())}`;
      const original = element.dataset[dataKey] ?? value;
      element.dataset[dataKey] = original;
      const next = localizeText(original);
      if (element.getAttribute(attr) !== next) element.setAttribute(attr, next);
    }
  });
}

function restoreElement(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  while (node) {
    const original = originalTextNodes.get(node);
    if (original && node.nodeValue !== original) node.nodeValue = original;
    node = walker.nextNode() as Text | null;
  }

  root.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => {
    for (const attr of ["placeholder", "title", "aria-label"]) {
      const dataKey = `original${attr.replace(/(^|-)([a-z])/g, (_, __, char: string) => char.toUpperCase())}`;
      const original = element.dataset[dataKey];
      if (original && element.getAttribute(attr) !== original) element.setAttribute(attr, original);
    }
  });
}

export default function StudioTextLocalizer({ children }: { children: React.ReactNode }) {
  const { locale } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (locale !== "en") {
      restoreElement(root);
      return;
    }

    localizeElement(root);
    const observer = new MutationObserver(() => localizeElement(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });
    return () => observer.disconnect();
  }, [locale, children]);

  return <div ref={ref}>{children}</div>;
}
