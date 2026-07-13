import { Star, Quote } from "lucide-react";
import { SITE_CONFIG } from "@shared/site";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
  text: string;
  highlight?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Carlos Silva",
    role: "Diretor de Fotografia",
    company: "Silva Productions",
    avatar: "CS",
    rating: 5,
    text: "Antes eu usava 4 ferramentas diferentes: Frame.io para review, planilhas para orçamento, Trello para shot list e email para propostas. Agora tudo está em um só lugar.",
    highlight: "Economizei R$ 400/mês em assinaturas",
  },
  {
    name: "Marina Costa",
    role: "Produtora Executiva",
    company: "Onda Filmes",
    avatar: "MC",
    rating: 5,
    text: "O CRM mudou completamente como gerencio meus clientes. Antes eu perdia oportunidades por falta de follow-up. Agora está tudo organizado e nunca mais deixei passar um lead.",
    highlight: "+35% em conversão de propostas",
  },
  {
    name: "João Mendes",
    role: "Editor & Colorista",
    company: "JM Post Production",
    avatar: "JM",
    rating: 5,
    text: "Os reviews de vídeo com timestamp preciso são incríveis. Meus clientes adoram poder comentar frame a frame sem confusão. Reduzi drasticamente o tempo de aprovação.",
    highlight: "Ciclo de aprovação 60% mais rápido",
  },
  {
    name: "Ana Rodrigues",
    role: "Diretora Criativa",
    company: "Estúdio Prisma",
    avatar: "AR",
    rating: 5,
    text: "As propostas digitais com assinatura eletrônica são profissionais demais. Meus clientes ficam impressionados e eu fecho negócios muito mais rápido do que enviando PDF por email.",
    highlight: "Fechamento em média 3 dias vs 12 antes",
  },
  {
    name: "Pedro Oliveira",
    role: "Produtor de Conteúdo",
    company: "Pulso Creative",
    avatar: "PO",
    rating: 5,
    text: "O controle de equipamentos salvou minha vida. Agora sei exatamente o que está disponível, reservado ou em manutenção. Nunca mais tive problema de double booking.",
    highlight: "Zero conflitos de equipamento em 6 meses",
  },
  {
    name: "Juliana Santos",
    role: "Gerente de Produção",
    company: "Luz & Cena",
    avatar: "JS",
    rating: 5,
    text: "O timesheet integrado com projetos é uma mão na roda. Finalmente consigo ver quanto tempo real cada projeto está tomando e ajustar orçamentos de forma precisa.",
    highlight: "Margem de lucro aumentou 18%",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-frame-gray-1/40 border border-frame-gray-3/30 rounded-2xl p-6 sm:p-8 backdrop-blur-sm hover:border-frame-orange/40 transition-all hover:scale-[1.02] group">
      {/* Quote Icon */}
      <Quote className="w-8 h-8 text-frame-orange/40 mb-4 group-hover:text-frame-orange/60 transition-colors" />

      {/* Rating */}
      <div className="flex gap-1 mb-4">
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-frame-gold text-frame-gold" />
        ))}
      </div>

      {/* Text */}
      <p className="text-frame-white text-sm sm:text-base leading-relaxed mb-6">
        "{testimonial.text}"
      </p>

      {/* Highlight */}
      {testimonial.highlight && (
        <div className="mb-6 px-4 py-3 bg-frame-orange/10 border-l-2 border-frame-orange rounded">
          <p className="text-xs sm:text-sm text-frame-orange font-medium">
            ✨ {testimonial.highlight}
          </p>
        </div>
      )}

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-frame-gray-3/30">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-frame-orange to-frame-orange/60 flex items-center justify-center text-frame-black font-bold text-sm shrink-0">
          {testimonial.avatar}
        </div>
        <div className="min-w-0">
          <div className="text-frame-white font-semibold text-sm truncate">
            {testimonial.name}
          </div>
          <div className="text-frame-gray-light text-xs truncate">
            {testimonial.role} • {testimonial.company}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="relative py-20 sm:py-28 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-frame-black via-frame-black/98 to-frame-black pointer-events-none" />
      <div
        className="absolute bottom-0 left-1/3 w-96 h-96 bg-frame-gold/5 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-frame-mono text-[0.65rem] sm:text-xs tracking-[0.2em] uppercase text-frame-orange mb-4">
            // Depoimentos
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-frame-white mb-6">
            Mais de <span className="text-frame-orange">500 produtoras</span>
            <br />
            já confiam no {SITE_CONFIG.brandName}
          </h2>
          <p className="text-frame-gray-light text-base sm:text-lg max-w-2xl mx-auto">
            Veja como profissionais audiovisuais estão transformando seus workflows
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {testimonials.map((testimonial, idx) => (
            <TestimonialCard key={idx} testimonial={testimonial} />
          ))}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="text-center p-4 bg-frame-gray-1/20 rounded-xl border border-frame-gray-3/20">
            <div className="text-2xl sm:text-3xl font-bold text-frame-white mb-1">500+</div>
            <div className="text-xs text-frame-gray-light">Produtoras ativas</div>
          </div>
          <div className="text-center p-4 bg-frame-gray-1/20 rounded-xl border border-frame-gray-3/20">
            <div className="text-2xl sm:text-3xl font-bold text-frame-white mb-1">15K+</div>
            <div className="text-xs text-frame-gray-light">Projetos gerenciados</div>
          </div>
          <div className="text-center p-4 bg-frame-gray-1/20 rounded-xl border border-frame-gray-3/20">
            <div className="text-2xl sm:text-3xl font-bold text-frame-white mb-1">98%</div>
            <div className="text-xs text-frame-gray-light">Satisfação</div>
          </div>
          <div className="text-center p-4 bg-frame-gray-1/20 rounded-xl border border-frame-gray-3/20">
            <div className="text-2xl sm:text-3xl font-bold text-frame-white mb-1">4.9/5</div>
            <div className="text-xs text-frame-gray-light">Rating médio</div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-frame-gray-light text-sm mb-6">
            Junte-se a centenas de produtoras que já transformaram seus workflows
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-frame-white text-frame-black font-bold rounded-lg hover:scale-105 transition-transform text-sm sm:text-base shadow-lg"
          >
            Começar agora
          </a>
        </div>
      </div>
    </section>
  );
}
