import AppNavBar from "@/components/AppNavBar";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useProject } from "@/contexts/ProjectContext";
import { Archive, ArrowRight, FolderKanban, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

function getDeadline(metadataJson: string) {
  try {
    return JSON.parse(metadataJson || "{}").deadline as string | undefined;
  } catch {
    return undefined;
  }
}

function ProjectsContent() {
  const { projects, isLoading } = useProject();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) =>
      (status === "all" || project.status === status) &&
      (!term || project.name.toLowerCase().includes(term) || project.clientName?.toLowerCase().includes(term)),
    );
  }, [projects, search, status]);

  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <AppNavBar />
      <main id="main-content" className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 md:py-12">
        <header className="flex flex-col gap-5 border-b border-frame-gray-3 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="frame-label mb-2">// Todos os capítulos</p>
            <h1 className="frame-title text-[clamp(2.2rem,4vw,3.8rem)]">PROJETOS</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              Cada job guarda cliente, decisões, produção, aprovação, entrega e resultado na mesma história.
            </p>
          </div>
          <button type="button" onClick={() => setLocation("/dashboard?newProject=1")} className="frame-btn-primary flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Novo projeto
          </button>
        </header>

        <section className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-frame-gray-light" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="frame-input w-full pl-10" placeholder="Buscar projeto ou cliente" />
          </label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="frame-input w-full">
            <option value="active">Ativos</option>
            <option value="completed">Concluídos</option>
            <option value="archived">Arquivados</option>
            <option value="all">Todos</option>
          </select>
        </section>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Carregando projetos">
            {[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse border border-frame-gray-3 bg-frame-gray-1/30" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Archive} title="Nenhum projeto neste recorte" description="Ajuste a busca ou inicie um novo job a partir de um cliente." action={{ label: "Novo projeto", onClick: () => setLocation("/dashboard?newProject=1") }} />
        ) : (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project) => {
              const deadline = getDeadline(project.metadataJson);
              return (
                <button key={project.id} type="button" onClick={() => setLocation(`/project/${project.id}`)} className="group min-h-[210px] border border-frame-gray-3 bg-frame-gray-1/20 p-5 text-left transition hover:border-frame-orange/60">
                  <div className="flex items-start justify-between gap-4">
                    <FolderKanban className="h-5 w-5 text-frame-orange" />
                    <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light">{project.status}</span>
                  </div>
                  <p className="mt-7 font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">Projeto #{project.id}</p>
                  <h2 className="mt-2 text-xl font-semibold text-frame-white group-hover:text-frame-orange">{project.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-frame-gray-light">{project.clientName || project.description || "Cliente e contexto ainda não definidos"}</p>
                  <div className="mt-6 flex items-center justify-between border-t border-frame-gray-3 pt-3 font-frame-mono text-[0.6rem] uppercase tracking-[0.1em]">
                    <span className="text-frame-gray-light">{deadline ? new Date(`${deadline}T00:00:00`).toLocaleDateString("pt-BR") : "Sem prazo"}</span>
                    <span className="flex items-center gap-1 text-frame-orange">Continuar <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default function Projects() {
  return <ProtectedRoute><ProjectsContent /></ProtectedRoute>;
}
