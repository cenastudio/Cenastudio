import type { ToolFromApi } from "@/lib/api";
import type { Language } from "@/lib/types";

type ToolLike = ToolFromApi & { number?: string };

type ToolCopy = {
  name: string;
  description: string;
  category: string;
  tags: string[];
  processingTime?: string;
  placeholder?: string;
};

const EN_TOOLS: Record<string, ToolCopy> = {
  "01": { name: "Script Generator", description: "Describe the idea and receive a production-ready script with dialogue, technical notes and timing.", category: "Pre-production", tags: ["Fiction", "Advertising", "Institutional", "Commercial"], processingTime: "Under 2 minutes", placeholder: "Describe guidelines, context, references or crucial information..." },
  "02": { name: "Technical Shot Breakdown", description: "Turn a script into a shooting plan: shots, camera movement, suggested lenses and timing by scene.", category: "Direction", tags: ["Direction", "DOP", "Planning", "Shot plan"], processingTime: "Under 3 minutes", placeholder: "Paste the script or describe the scenes you want to break down..." },
  "03": { name: "Smart Callsheet", description: "Generate a professional callsheet with contacts, schedule, locations and technical needs.", category: "Production", tags: ["Production", "Logistics", "Crew", "Set"], processingTime: "Under 1 minute", placeholder: "Project name, date, location, key crew and desired schedule..." },
  "04": { name: "Automatic Budget", description: "Build realistic budgets with equipment, crew and post-production costs.", category: "Commercial", tags: ["Commercial", "Production company", "Freelance"], processingTime: "Under 2 minutes", placeholder: "Project type, duration, crew, equipment and investment range..." },
  "05": { name: "Commercial Proposal", description: "Generate persuasive proposals with scope, timeline, value and payment terms for the client.", category: "Sales", tags: ["Sales", "Client", "Contract"], processingTime: "Under 1 minute", placeholder: "Client, project scope, timeline and approximate value..." },
  "06": { name: "Contracts", description: "Service, image rights, music licensing and NDA drafts in clear language. Review with a lawyer before signing.", category: "Legal", tags: ["Legal", "Protection"], processingTime: "Under 2 minutes", placeholder: "Contract type, parties, service object and main conditions..." },
  "07": { name: "Smart Briefing", description: "Extract and organize all relevant client information before production begins.", category: "Client service", tags: ["Discovery", "Client service"], processingTime: "Under 1 minute", placeholder: "Paste the client conversation, email or loose notes..." },
  "08": { name: "Moodboard & Look", description: "Color palette, visual references, lighting, color grading and prompts for image generation.", category: "Art", tags: ["Art", "Look", "Color"], processingTime: "Under 2 minutes", placeholder: "Visual concept, references, genre and desired feeling..." },
  "09": { name: "Set Checklist", description: "Complete camera, audio, lighting and production checklist so nothing is forgotten on set.", category: "Production", tags: ["Set", "Camera", "Audio"], processingTime: "Under 1 minute", placeholder: "Production type, location style, drone needs and crew size..." },
  "10": { name: "Schedule", description: "Planning with pre-production, shoot, post-production and delivery phases with suggested dates.", category: "Management", tags: ["Management", "Deadline"], processingTime: "Under 2 minutes", placeholder: "Start date, delivery date, complexity and crew size..." },
  "11": { name: "Delivery Report", description: "Document the project with technical specifications, delivered files and client notes.", category: "Post-production", tags: ["Post", "Archive", "Delivery"], processingTime: "Under 2 minutes", placeholder: "Project name, delivery formats, technical specs and notes..." },
  "12": { name: "Free Assistant", description: "Chat with AI about production, camera, career or any set question.", category: "AI", tags: ["AI", "Chat", "Questions"], processingTime: "Answer in seconds", placeholder: "Ask anything about audiovisual production..." },
};

export function localizeTool<T extends ToolLike>(tool: T, locale: Language): T {
  if (locale !== "en") return tool;
  const copy = EN_TOOLS[tool.id] ?? EN_TOOLS[tool.number ?? ""];
  if (!copy) return tool;
  return { ...tool, ...copy } as T;
}

export function localizeTools<T extends ToolLike>(tools: T[], locale: Language): T[] {
  return tools.map((tool) => localizeTool(tool, locale));
}
