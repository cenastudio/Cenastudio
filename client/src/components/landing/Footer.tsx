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
    <footer id="site-footer" className="bg-frame-black border-t border-frame-gray-3 px-6 py-14 sm:px-9 md:px-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-8 border-y border-frame-gray-3 py-8 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div>
            <p className="frame-label mb-4">// Operação audiovisual</p>
            <h2 className="frame-title max-w-3xl text-[clamp(2.4rem,5vw,5.4rem)] leading-[0.92] text-frame-white">
              Feito por filmmakers,
              <br />
              <span className="text-frame-orange">para filmmakers.</span>
            </h2>
          </div>

          <div className="flex flex-col justify-between gap-6 lg:items-end lg:text-right">
            <p className="max-w-md text-[0.95rem] leading-relaxed text-frame-gray-light">
              Projetos, IA, clientes, arquivos, aprovações e documentos no mesmo fluxo de produção.
            </p>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {trustItems.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 border border-frame-gray-3 bg-frame-gray-1/25 px-3 py-2 font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light"
                >
                  <Icon className="h-3.5 w-3.5 text-frame-orange" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Top Section */}
        <div className="grid grid-cols-1 gap-12 border-b border-frame-gray-3 pb-10 lg:grid-cols-[0.95fr_1.6fr]">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <a href="/" className="mb-6 inline-block">
              <BrandLogo className="h-14 w-auto" />
            </a>
            <p className="max-w-md text-[0.92rem] font-light leading-relaxed text-frame-gray-light">
              Central operacional audiovisual para produtoras, filmmakers e equipes criativas:
              projetos, IA, clientes, arquivos, aprovações, documentos e equipe por job.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 border border-frame-orange bg-frame-orange px-4 py-2.5 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-frame-black transition hover:bg-frame-orange-dark"
              >
                Entrar no produto
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 border border-frame-gray-3 px-4 py-2.5 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-frame-gray-light transition hover:border-frame-gray-2 hover:text-frame-white"
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
                        className="text-[0.9rem] text-frame-gray-light transition-colors hover:text-frame-white"
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
          className="flex flex-col justify-between gap-5 font-frame-mono text-[0.64rem] tracking-[0.08em] text-frame-gray-muted lg:flex-row"
        >
          <div className="max-w-2xl leading-relaxed">
            © {currentYear} {SITE_CONFIG.title}. Todos os direitos reservados. Plataforma em evolução contínua;
            recursos, integrações e limites podem variar conforme o plano contratado.
          </div>
          <div className="flex items-center gap-2 text-frame-gray-light">
            <BadgeCheck className="w-3.5 h-3.5 text-frame-orange" />
            Feito por filmmakers, para filmmakers.
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
