import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * StudioTextLocalizer
 *
 * Legacy DOM-walking localizer for Studio panel text that hasn't yet been
 * migrated to use t() directly. As forms and panels adopt useLanguage + t(),
 * entries can be removed from TEXT_EN / ATTRIBUTE_EN below.
 *
 * For EN locale it walks the subtree and replaces Portuguese text nodes and
 * attributes (placeholder, title, aria-label) with their EN equivalents.
 */

const TEXT_EN: Record<string, string> = {
  "Sua Dúvida ou Consulta": "Your question or request",
  "Dica: Após gerar a resposta inicial no painel direito, você pode usar a aba \"Refinar com IA\" para continuar a conversa e detalhar as respostas da IA.": "Tip: after generating the first answer in the right panel, use the \u201cRefine with AI\u201d tab to continue the conversation and expand the response.",
};

const ATTRIBUTE_EN: Record<string, string> = {
  "Descreva as instruções para a ferramenta...": "Describe the instructions for the tool...",
  "Ex: Como estruturar um plano de contingência para filmagens na chuva? Quais os microfones indicados para som direto em externa com vento?": "Ex: How should I structure a contingency plan for rain shoots? Which microphones work best for windy exteriors?",
  "Ex: Casamento ao ar livre, comercial de moda em estúdio...": "Ex: Outdoor wedding, fashion commercial in studio...",
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
