import { FOOTER_LINKS, SITE_CONFIG } from "@shared/site";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, LockKeyhole, Receipt, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

/**
 * Footer Component
 * Design: Simples e elegante com links organizados em colunas
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  const trustItems = [
    { icon: LockKeyhole, label: "Checkout seguro" },
    { icon: ShieldCheck, label: "Dados protegidos" },
    { icon: Receipt, label: "Planos claros" },
  ];

  return (
    <footer id="site-footer" className="landing-section pb-10">
      <div className="landing-shell space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-glass-strong grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div>
            <p className="landing-eyebrow mb-4">// Operação audiovisual</p>
            <h2 className="landing-heading max-w-3xl text-[clamp(2.8rem,6vw,6rem)]">
              Feito por filmmakers,
              <br />
              <span className="landing-accent-text">para filmmakers.</span>
            </h2>
          </div>

          <div className="flex flex-col justify-between gap-6 lg:items-end lg:text-right">
            <p className="landing-copy max-w-md">
              Projetos, IA, clientes, arquivos, aprovações e documentos no mesmo fluxo de produção.
            </p>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {trustItems.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="landing-pill"
                >
                  <Icon className="h-3.5 w-3.5 text-frame-orange" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Section */}
        <div className="grid grid-cols-1 gap-12 border-b border-[var(--landing-line)] pb-10 lg:grid-cols-[0.95fr_1.6fr]">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <a href="/" className="mb-6 inline-block">
              <BrandLogo tone="onDark" className="text-2xl" />
            </a>
            <p className="max-w-md text-[0.92rem] font-light leading-relaxed text-[var(--landing-muted)]">
              Central operacional audiovisual para produtoras, filmmakers e equipes criativas:
              projetos, IA, clientes, arquivos, aprovações, documentos e equipe por job.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 border border-frame-orange bg-frame-orange px-4 py-2.5 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-black transition hover:bg-frame-orange-dark"
              >
                Entrar no produto
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 border border-[var(--landing-line)] px-4 py-2.5 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-[var(--landing-muted)] transition hover:border-frame-orange/40 hover:text-[var(--landing-text)]"
              >
                Agendar demo
              </a>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4"
          >
            {Object.entries(FOOTER_LINKS).map(([key, section]: any) => (
              <div key={key}>
                  <h4 className="mb-5 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link: any) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-[0.9rem] text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col justify-between gap-5 font-frame-mono text-[0.64rem] tracking-[0.08em] text-[var(--landing-muted)] lg:flex-row"
        >
          <div className="max-w-2xl leading-relaxed space-y-2">
            <div>© {currentYear} {SITE_CONFIG.title}. Todos os direitos reservados.</div>
            <div>Licenciado sob MIT License. Plataforma em evolução contínua; recursos, integrações e limites podem variar conforme o plano contratado.</div>
          </div>
          <div className="flex items-center gap-2 text-[var(--landing-subtle)]">
            <BadgeCheck className="w-3.5 h-3.5 text-frame-orange" />
            Feito por filmmakers, para filmmakers.
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
