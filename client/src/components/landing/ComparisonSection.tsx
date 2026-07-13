import { Check, X, Zap, DollarSign, Users, Clock } from "lucide-react";
import { SITE_CONFIG } from "@shared/site";

interface Feature {
  name: string;
  cena: boolean | string;
  frameio: boolean | string;
  studiobinder: boolean | string;
}

const features: Feature[] = [
  {
    name: "Video Reviews com Anotações",
    cena: true,
    frameio: true,
    studiobinder: false,
  },
  {
    name: "CRM + Pipeline Completo",
    cena: true,
    frameio: false,
    studiobinder: "Básico",
  },
  {
    name: "Propostas Digitais com Assinatura",
    cena: true,
    frameio: false,
    studiobinder: "Básico",
  },
  {
    name: "Agendamento de Reuniões",
    cena: true,
    frameio: false,
    studiobinder: false,
  },
  {
    name: "Shot List Colaborativo",
    cena: true,
    frameio: false,
    studiobinder: true,
  },
  {
    name: "Gestão de Equipamentos",
    cena: true,
    frameio: false,
    studiobinder: "Básico",
  },
  {
    name: "Budget Tracking",
    cena: true,
    frameio: false,
    studiobinder: true,
  },
  {
    name: "Timesheet + Controle de Horas",
    cena: true,
    frameio: false,
    studiobinder: "Básico",
  },
  {
    name: "Webhooks + API Aberta",
    cena: true,
    frameio: "Enterprise",
    studiobinder: false,
  },
  {
    name: "Preço (plano médio)",
    cena: "R$ 97/mês",
    frameio: "~R$ 300/mês",
    studiobinder: "~R$ 240/mês",
  },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return (
      <span className="text-xs text-frame-gray-light font-medium">
        {value}
      </span>
    );
  }

  return value ? (
    <Check className="w-5 h-5 text-frame-green mx-auto" />
  ) : (
    <X className="w-5 h-5 text-frame-gray-3 mx-auto opacity-40" />
  );
}

export default function ComparisonSection() {
  return (
    <section className="relative py-20 sm:py-28 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-frame-black via-frame-black/95 to-frame-black pointer-events-none" />
      <div
        className="absolute top-0 right-1/4 w-96 h-96 bg-frame-orange/5 rounded-full blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="font-frame-mono text-[0.65rem] sm:text-xs tracking-[0.2em] uppercase text-frame-orange mb-4">
            // Por que escolher {SITE_CONFIG.brandName}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-frame-white mb-6">
            Economize <span className="text-frame-orange">R$ 563/mês</span>
            <br />
            com todas as features que você precisa
          </h2>
          <p className="text-frame-gray-light text-base sm:text-lg max-w-2xl mx-auto">
            Compare com as ferramentas mais usadas por produtoras audiovisuais
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          <div className="bg-frame-gray-1/40 border border-frame-orange/20 rounded-xl p-6 text-center backdrop-blur-sm">
            <DollarSign className="w-8 h-8 text-frame-green mx-auto mb-3" />
            <div className="text-2xl font-bold text-frame-white mb-1">70%</div>
            <div className="text-xs text-frame-gray-light">Mais barato que concorrentes</div>
          </div>
          <div className="bg-frame-gray-1/40 border border-frame-orange/20 rounded-xl p-6 text-center backdrop-blur-sm">
            <Zap className="w-8 h-8 text-frame-orange mx-auto mb-3" />
            <div className="text-2xl font-bold text-frame-white mb-1">11+</div>
            <div className="text-xs text-frame-gray-light">Features integradas</div>
          </div>
          <div className="bg-frame-gray-1/40 border border-frame-orange/20 rounded-xl p-6 text-center backdrop-blur-sm">
            <Clock className="w-8 h-8 text-frame-gold mx-auto mb-3" />
            <div className="text-2xl font-bold text-frame-white mb-1">-60%</div>
            <div className="text-xs text-frame-gray-light">Tempo gasto em admin</div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-2xl border border-frame-gray-3/30 backdrop-blur-sm bg-frame-gray-1/20">
              <table className="min-w-full divide-y divide-frame-gray-3/30">
                {/* Header */}
                <thead>
                  <tr className="bg-frame-gray-2/40">
                    <th className="px-4 py-5 text-left text-xs font-medium text-frame-gray-light uppercase tracking-wider w-2/5">
                      Feature
                    </th>
                    <th className="px-4 py-5 text-center w-1/5">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-lg font-bold text-frame-orange">
                          {SITE_CONFIG.brandName}
                        </div>
                        <span className="text-[0.6rem] font-mono uppercase tracking-wider px-2 py-1 rounded bg-frame-orange/10 border border-frame-orange/30 text-frame-orange">
                          Recomendado
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-5 text-center text-sm font-medium text-frame-gray-light w-1/5">
                      Frame.io
                    </th>
                    <th className="px-4 py-5 text-center text-sm font-medium text-frame-gray-light w-1/5">
                      StudioBinder
                    </th>
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-frame-gray-3/20">
                  {features.map((feature, idx) => (
                    <tr
                      key={idx}
                      className={`${
                        idx % 2 === 0 ? "bg-frame-black/40" : "bg-frame-gray-1/10"
                      } hover:bg-frame-orange/5 transition-colors`}
                    >
                      <td className="px-4 py-4 text-sm text-frame-white font-medium">
                        {feature.name}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <FeatureCell value={feature.cena} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <FeatureCell value={feature.frameio} />
                      </td>
                      <td className="px-4 py-4 text-center">
                        <FeatureCell value={feature.studiobinder} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-frame-gray-light text-sm mb-6">
            Teste grátis por 14 dias. Sem cartão de crédito.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-frame-orange to-frame-orange/90 text-frame-black font-bold rounded-lg hover:scale-105 transition-transform text-sm sm:text-base shadow-lg shadow-frame-orange/20"
          >
            <Zap className="w-5 h-5" />
            Começar gratuitamente
          </a>
        </div>
      </div>
    </section>
  );
}
