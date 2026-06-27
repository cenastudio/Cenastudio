import { FOOTER_LINKS, SITE_CONFIG } from "@shared/site";
import { motion } from "framer-motion";
import { BadgeCheck, CreditCard, LockKeyhole, Receipt, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

/**
 * Footer Component
 * Design: Simples e elegante com links organizados em colunas
 */
export default function Footer() {
  const currentYear = new Date().getFullYear();
  const paymentBrands = ["Visa", "Mastercard", "Elo", "Amex", "PIX"];

  return (
    <footer id="site-footer" className="bg-frame-black border-t border-frame-gray-3 px-6 py-16 sm:px-9 md:px-12">
      <div className="max-w-7xl mx-auto space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 border border-frame-gray-3 bg-frame-gray-1/10"
        >
          <div className="p-5 border-b md:border-b-0 md:border-r border-frame-gray-3">
            <div className="flex items-center gap-2 mb-2 text-frame-orange">
              <LockKeyhole className="w-4 h-4" />
              <span className="font-frame-mono text-[0.55rem] tracking-[0.16em] uppercase">Checkout Seguro</span>
            </div>
            <p className="text-sm text-frame-gray-light leading-relaxed">Pagamentos processados em ambiente Stripe.</p>
          </div>
          <div className="p-5 border-b md:border-b-0 md:border-r border-frame-gray-3">
            <div className="flex items-center gap-2 mb-2 text-frame-orange">
              <ShieldCheck className="w-4 h-4" />
              <span className="font-frame-mono text-[0.55rem] tracking-[0.16em] uppercase">Dados do Estúdio</span>
            </div>
            <p className="text-sm text-frame-gray-light leading-relaxed">Projetos, clientes e documentos protegidos por autenticação.</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2 text-frame-orange">
              <Receipt className="w-4 h-4" />
              <span className="font-frame-mono text-[0.55rem] tracking-[0.16em] uppercase">Planos Claros</span>
            </div>
            <p className="text-sm text-frame-gray-light leading-relaxed">Free, Pro e Studio alinhados ao que o produto entrega hoje.</p>
          </div>
        </motion.div>

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.45fr] gap-12 pb-10 border-b border-frame-gray-3">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <a href="/" className="mb-3 inline-block">
              <BrandLogo className="scale-125 origin-left" />
            </a>
            <p className="text-frame-gray-light text-[0.8rem] font-light max-w-sm leading-relaxed">
              Central operacional audiovisual para produtoras, filmmakers e equipes criativas:
              projetos, IA, clientes, arquivos, aprovações, documentos e equipe por job.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="frame-tag">Produto BR</span>
              <span className="frame-tag">Stripe test-ready</span>
              <span className="frame-tag">Operação audiovisual</span>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-8"
          >
            {Object.entries(FOOTER_LINKS).map(([key, section]: any) => (
              <div key={key}>
                <h4 className="font-frame-mono text-[0.56rem] tracking-[0.2em] uppercase text-frame-orange mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-2">
                  {section.links.map((link: any) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-[0.82rem] text-frame-gray-light hover:text-frame-white transition-colors"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-4 pb-10 border-b border-frame-gray-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-2 text-frame-white">
            <CreditCard className="w-4 h-4 text-frame-orange" />
            <span className="font-frame-mono text-[0.58rem] tracking-[0.18em] uppercase">Pagamentos</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {paymentBrands.map((brand) => (
              <span
                key={brand}
                className="border border-frame-gray-3 bg-frame-gray-1/40 px-3 py-1.5 font-frame-mono text-[0.5rem] tracking-[0.12em] uppercase text-frame-gray-light"
              >
                {brand}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row justify-between gap-5 font-frame-mono text-[0.56rem] tracking-[0.08em] text-frame-gray-muted"
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
