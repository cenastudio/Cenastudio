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
  "Vídeo Institucional (1-3 min)": "Institutional video (1-3 min)",
  "Vídeo Publicitário / TVC 30s": "Advertising video / 30s TVC",
  "Curta-metragem": "Short film",
  "Documentário": "Documentary",
  "Vídeo para Redes Sociais": "Social media video",
  "Evento Corporativo": "Corporate event",
  "Videoclipe": "Music video",
  "Pequena (2-4 pessoas)": "Small (2-4 people)",
  "Média (5-8 pessoas)": "Medium (5-8 people)",
  "Grande (9-15 pessoas)": "Large (9-15 people)",
  "Não": "No",
  "Equipe interna do cliente": "Client internal team",
  "Atores contratados (2)": "Hired actors (2)",
  "Atores contratados (4+)": "Hired actors (4+)",
  "Câmera própria (sem custo)": "Own camera (no cost)",
  "Aluguel básico (Sony A7, Lumix S5)": "Basic rental (Sony A7, Lumix S5)",
  "Aluguel cinema intermediário (FX6, C70)": "Intermediate cinema rental (FX6, C70)",
  "Aluguel cinema topo (ARRI, RED, FX9)": "High-end cinema rental (ARRI, RED, FX9)",
  "Moderno e tecnológico": "Modern and technological",
  "Quente e humano": "Warm and human",
  "Frio e minimalista": "Cool and minimalist",
  "Vintage / analógico": "Vintage / analog",
  "Documental e real": "Documentary and real",
  "Onírico e poético": "Dreamlike and poetic",
  "Urbano e dinâmico": "Urban and dynamic",
  "Natural e orgânico": "Natural and organic",
  "16:9 — Cinema/TV": "16:9 — Cinema/TV",
  "2.39:1 — Cinemascope": "2.39:1 — Cinemascope",
  "1.85:1 — Flat": "1.85:1 — Flat",
  "4:3 — Vintage": "4:3 — Vintage",
  "9:16 — Vertical (Reels/TikTok)": "9:16 — Vertical (Reels/TikTok)",
  "1:1 — Quadrado": "1:1 — Square",
  "Natural / realista": "Natural / realistic",
  "Cinematográfico — alto contraste": "Cinematic — high contrast",
  "Prestação de Serviços Audiovisuais": "Audiovisual services agreement",
  "Cessão de Direitos de Imagem": "Image rights assignment",
  "Cessão de Uso de Trilha Sonora": "Soundtrack usage assignment",
  "Contrato de Locação de Espaço": "Location rental agreement",
  "NDA — Termo de Confidencialidade": "NDA — Non-disclosure agreement",
  "Contrato de Freelancer / Prestador de Serviço": "Freelancer / service provider agreement",
  "Curta-metragem (ficção)": "Short film (fiction)",
  "Vídeo Institucional": "Institutional video",
  "Vídeo Publicitário / TVC": "Advertising video / TVC",
  "Websérie / Episódio": "Web series / episode",
  "Longa-metragem": "Feature film",
  "Vídeo de Produto": "Product video",
  "Depoimento / Testimonial": "Testimonial",
  "Treinamento Interno": "Internal training",
  "Redes Sociais": "Social media",
  "Câmera na mão (handheld)": "Handheld camera",
  "Tripé — planos fixos": "Tripod — locked shots",
  "Steadicam / Gimbal": "Steadicam / gimbal",
  "Drone / aéreo": "Drone / aerial",
  "Misto": "Mixed",
  "50% entrada + 50% entrega": "50% upfront + 50% on delivery",
  "30% entrada + 70% entrega": "30% upfront + 70% on delivery",
  "100% faturamento antes do início": "100% invoiced before start",
  "3x mensais iguais": "3 equal monthly payments",
  "2 rodadas de revisão": "2 revision rounds",
  "3 rodadas de revisão": "3 revision rounds",
  "1 rodada — alterações extras cobradas": "1 round — extra changes billed separately",
  "Profissional e formal": "Professional and formal",
  "Próximo e descontraído": "Close and relaxed",
  "Criativo e diferenciado": "Creative and distinctive",
  "Nome — Celular": "Name — Phone",
};

const ATTRIBUTE_EN: Record<string, string> = {
  "Ex: Wong Kar-Wai, Terrence Malick, Ari Aster, Roger Deakins...": "Ex: Wong Kar-Wai, Terrence Malick, Ari Aster, Roger Deakins...",
  "Ex: Tons terrosos, azul frio, preto e laranja, pastel neon...": "Ex: earth tones, cool blue, black and orange, pastel neon...",
  "Ex: Cena Filmes": "Ex: Cena Films",
  "Ex: João Silva": "Ex: John Silva",
  "Ex: 5 anos de experiência, prêmios locais, portfólio robusto...": "Ex: 5 years of experience, local awards, strong portfolio...",
  "Ex: Empresa ABC": "Ex: ABC Company",
  "Ex: R$ 8.000,00": "Ex: $8,000.00",
  "Ex: 5 min": "Ex: 5 min",
  "Ex: Drama, humor...": "Ex: drama, comedy...",
  "Ex: João (30 anos), Maria (28 anos)": "Ex: John (30), Maria (28)",
  "Ex: Metrô SP, apartamento, rua": "Ex: subway, apartment, street",
  "Ex: Kiarostami, Nolan, Cidade de Deus": "Ex: Kiarostami, Nolan, City of God",
  "Ex: R$ 5.000,00": "Ex: $5,000.00",
  "Ex: São Paulo, SP": "Ex: São Paulo, SP",
  "Ex: Vídeo Institucional XYZ": "Ex: XYZ institutional video",
  "Ex: Rua das Flores, 123 — Vila Madalena": "Ex: 123 Flower Street — Vila Madalena",
  "Função — Nome — Celular (um por linha)...": "Role — Name — Phone (one per line)...",
  "Sony FX3, Gimbal DJI, Kit de LEDs, Microfone Boom...": "Sony FX3, DJI gimbal, LED kit, boom microphone...",
  "Estacionamento livre, alimentação no local às 12h, trazer casaco...": "Free parking, lunch on site at 12pm, bring a jacket...",
  "Ex: Diretor, Produtor, DOP, Editor, Gaffer, Técnico de Áudio...": "Ex: Director, producer, DOP, editor, gaffer, audio technician...",
  "Ex: 1 vídeo principal de 2min, 3 cortes verticais de 30s...": "Ex: one 2-min main video, three 30s vertical cuts...",

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
