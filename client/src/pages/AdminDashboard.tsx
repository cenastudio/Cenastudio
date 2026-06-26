import { useAuth } from "@/contexts/AuthContext";
import { api, type ToolFromApi } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Edit2, LogOut, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function AdminContent() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [tools, setTools] = useState<ToolFromApi[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newTool, setNewTool] = useState({ id: "", name: "", description: "", category: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [toolList, users] = await Promise.all([api.admin.listTools(), api.admin.users()]);
      setTools(toolList);
      setUserCount(users.count);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar admin");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleTool = async (tool: ToolFromApi) => {
    try {
      await api.admin.updateTool(tool.id, { is_active: !tool.isActive });
      await load();
      toast.success("Ferramenta atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await api.admin.updateTool(id, { name: editName });
      setEditingId(null);
      await load();
      toast.success("Nome atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
  };

  const deleteTool = async (id: string) => {
    try {
      await api.admin.deleteTool(id);
      await load();
      toast.success("Ferramenta desativada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  };

  const createTool = async () => {
    try {
      await api.admin.createTool(newTool);
      setNewTool({ id: "", name: "", description: "", category: "" });
      await load();
      toast.success("Ferramenta criada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  };

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const activeCount = tools.filter((t) => t.isActive).length;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white pt-[62px]">
      <header className="fixed top-0 left-0 right-0 z-50 frame-nav">
        <button
          type="button"
          onClick={() => setLocation("/tools")}
          className="font-frame-display text-[1.55rem] tracking-[0.1em] text-frame-white bg-transparent border-none"
        >
          FRAME<span className="text-frame-orange">.</span>AI
        </button>
        <p className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gold hidden sm:block">
          Admin
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="font-frame-mono text-[0.58rem] tracking-[0.09em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2.5 py-1.5 transition hover:border-frame-red hover:text-frame-red flex items-center gap-1.5"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
      </header>

      <div className="px-9 py-7 border-b border-frame-gray-2">
        <h1 className="frame-title text-[2.1rem] text-frame-white">
          PAINEL <span className="text-frame-gold">ADMIN</span>
        </h1>
      </div>

      <div className="px-9 py-7">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-9">
          {[
            { label: "Ferramentas ativas", value: activeCount, accent: "border-b-frame-orange" },
            { label: "Total ferramentas", value: tools.length, accent: "border-b-frame-green" },
            { label: "Usuários (DB)", value: userCount, accent: "border-b-[#4d9fff]" },
            { label: "Planos", value: "3", accent: "border-b-frame-gold" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`bg-frame-gray-2 border border-frame-gray-3 p-5 relative overflow-hidden border-b-2 ${stat.accent}`}
            >
              <p className="font-frame-mono text-[0.56rem] tracking-[0.14em] uppercase text-frame-gray-light mb-2">
                {stat.label}
              </p>
              <p className="frame-title text-[2.6rem] text-frame-white leading-none">{stat.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <p className="font-frame-mono text-[0.65rem] tracking-[0.15em] uppercase text-frame-gray-light">
            Carregando...
          </p>
        ) : (
          <div className="space-y-0 mb-8">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="bg-frame-gray-2 border border-frame-gray-3 p-4 flex flex-wrap items-center justify-between gap-4 mb-0 border-b-0 last:border-b"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{tool.icon}</span>
                  <div>
                    {editingId === tool.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="frame-input max-w-xs !py-2"
                      />
                    ) : (
                      <h3 className="font-frame-body text-frame-white font-medium">{tool.name}</h3>
                    )}
                    <p className="font-frame-mono text-[0.58rem] text-frame-gray-light">
                      {tool.id} — {tool.category}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className="font-frame-mono text-[0.53rem] tracking-[0.07em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2 py-1 transition hover:border-frame-orange hover:text-frame-orange"
                  >
                    {tool.isActive ? "Desativar" : "Ativar"}
                  </button>
                  {editingId === tool.id ? (
                    <button
                      type="button"
                      onClick={() => saveEdit(tool.id)}
                      className="font-frame-mono text-[0.53rem] uppercase bg-frame-orange text-frame-black border-none px-2 py-1"
                    >
                      Salvar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(tool.id);
                        setEditName(tool.name);
                      }}
                      className="font-frame-mono text-[0.53rem] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2 py-1 hover:border-frame-orange hover:text-frame-orange"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteTool(tool.id)}
                    className="font-frame-mono text-[0.53rem] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2 py-1 hover:border-frame-red hover:text-frame-red"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-frame-gray-2 border border-frame-gray-3 p-6">
          <h2 className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-orange mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nova ferramenta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
            <input
              placeholder="ID (ex: 13)"
              value={newTool.id}
              onChange={(e) => setNewTool({ ...newTool, id: e.target.value })}
              className="frame-input"
            />
            <input
              placeholder="Nome"
              value={newTool.name}
              onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
              className="frame-input"
            />
            <input
              placeholder="Descrição"
              value={newTool.description}
              onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
              className="frame-input"
            />
            <input
              placeholder="Categoria"
              value={newTool.category}
              onChange={(e) => setNewTool({ ...newTool, category: e.target.value })}
              className="frame-input"
            />
          </div>
          <button type="button" onClick={createTool} className="frame-btn-primary">
            Criar ferramenta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute adminOnly>
      <AdminContent />
    </ProtectedRoute>
  );
}
