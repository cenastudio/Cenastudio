import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ArrowRight, FileSignature, GitBranch, MessageSquare, Plus, Users } from "lucide-react";
import { useLocation } from "wouter";

const AREAS = [
  { number: "01", title: "Clientes", description: "Cadastre quem contrata e preserve o histórico de cada relação.", route: "/clients", action: "Abrir carteira", icon: Users },
  { number: "02", title: "Pipeline", description: "Conduza oportunidades do primeiro interesse até o fechamento.", route: "/pipeline", action: "Ver oportunidades", icon: GitBranch },
  { number: "03", title: "Interações", description: "Registre conversas, retornos e próximos compromissos.", route: "/interactions", action: "Abrir agenda", icon: MessageSquare },
  { number: "04", title: "Propostas", description: "Acompanhe o que foi apresentado e o que aguarda decisão.", route: "/proposals", action: "Ver propostas", icon: FileSignature },
];

function CommercialHubContent() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <AppNavBar />
      <main id="main-content" className="mx-auto w-full max-w-7xl space-y-9 px-4 py-8 sm:px-6 md:py-12">
        <header className="grid gap-6 border-b border-frame-gray-3 pb-7 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <p className="frame-label mb-2">// Antes do set</p>
            <h1 className="frame-title text-[clamp(2.2rem,4vw,3.8rem)]">COMERCIAL</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              A história do job começa na relação: cliente, oportunidade, conversa, proposta e decisão conectados antes de virar produção.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setLocation("/clients/new")} className="frame-btn-ghost flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Cliente</button>
            <button type="button" onClick={() => setLocation("/pipeline")} className="frame-btn-primary flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Oportunidade</button>
          </div>
        </header>

        <section className="border border-frame-orange/35 bg-frame-orange/[0.05] p-5 sm:p-6">
          <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.18em] text-frame-orange">O arco comercial</p>
          <div className="mt-4 grid gap-2 md:grid-cols-5">
            {["Interesse", "Diagnóstico", "Proposta", "Negociação", "Projeto"].map((step, index) => (
              <div key={step} className="flex items-center gap-2 border border-frame-gray-3 bg-frame-black/25 px-3 py-3">
                <span className="font-frame-mono text-[0.58rem] text-frame-orange">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-xs font-semibold">{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <button key={area.route} type="button" onClick={() => setLocation(area.route)} className="group min-h-[220px] border border-frame-gray-3 bg-frame-gray-1/20 p-5 text-left transition hover:border-frame-orange/60 sm:p-6">
                <div className="flex items-start justify-between"><span className="frame-label">// {area.number}</span><Icon className="h-5 w-5 text-frame-orange" /></div>
                <h2 className="mt-8 text-2xl font-semibold group-hover:text-frame-orange">{area.title}</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-frame-gray-light">{area.description}</p>
                <span className="mt-6 flex items-center gap-2 font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-orange">{area.action}<ArrowRight className="h-3.5 w-3.5" /></span>
              </button>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default function CommercialHub() {
  return <ProtectedRoute><CommercialHubContent /></ProtectedRoute>;
}
