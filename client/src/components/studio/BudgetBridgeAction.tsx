import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  budgetBlockTotal,
  buildBaselinePayload,
  extractBudgetBlock,
  type BudgetBaselinePayload,
  type BudgetBound,
} from "@/lib/budgetBlock";

interface BudgetBridgeActionProps {
  /** Output cru da geração — o bloco estruturado vem no fim dele. */
  output: string;
  /** O baseline é por projeto; sem projeto a ponte não tem destino. */
  projectId?: number | null;
  /**
   * Override da persistência. Por padrão a confirmação chama
   * `api.budgets.updateBaseline` (`PUT /api/budgets/:projectId` →
   * `budgetService.updateBudgetBaseline`). Este prop existe para teste e para
   * um eventual host que precise interceptar a gravação — quem não passa nada
   * grava de verdade.
   */
  onApplyBaseline?: (payload: BudgetBaselinePayload) => Promise<void> | void;
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export default function BudgetBridgeAction({
  output,
  projectId,
  onApplyBaseline,
}: BudgetBridgeActionProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [bound, setBound] = useState<BudgetBound>("max");
  const [replaceAcknowledged, setReplaceAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [existingUnknown, setExistingUnknown] = useState(false);

  const block = extractBudgetBlock(output);

  // Só ao abrir o diálogo: descobre se o projeto já tem baseline, porque
  // `updateBaseline` substitui as categorias (ADR-013, sem merge na v1).
  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    setExistingCount(null);
    setExistingUnknown(false);
    api.budgets
      .getOverview(projectId)
      .then((overview) => {
        if (cancelled) return;
        setExistingCount(overview.byCategory.length);
      })
      .catch(() => {
        if (cancelled) return;
        setExistingUnknown(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const needsReplaceConfirmation = existingUnknown || (existingCount ?? 0) > 0;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setBound("max");
      setReplaceAcknowledged(false);
    }
  };

  const handleConfirm = async () => {
    if (!block.ok || !projectId) return;
    if (needsReplaceConfirmation && !replaceAcknowledged) return;

    const payload = buildBaselinePayload(block, bound);
    setSaving(true);
    try {
      if (onApplyBaseline) {
        await onApplyBaseline(payload);
      } else {
        // `PUT /api/budgets/:projectId` → `budgetService.updateBudgetBaseline`.
        // Substitui as categorias do baseline (ADR-013, sem merge na v1).
        await api.budgets.updateBaseline(projectId, payload);
      }
      // Não há cache de servidor no cliente (o app não usa react-query):
      // `Budget.tsx` refaz `getOverview` a cada montagem, então o atalho abaixo
      // já mostra o baseline novo sem recarregar a página.
      toast.success("Orçamento gravado no módulo do projeto", {
        action: {
          label: "Abrir Orçamento",
          onClick: () => setLocation(`/project/${projectId}/budget`),
        },
      });
      setOpen(false);
    } catch (error) {
      // Diálogo fica aberto de propósito: o usuário pode corrigir piso/teto e
      // tentar de novo sem reabrir e revisar tudo.
      toast.error(error instanceof Error ? error.message : "Falha ao gravar o orçamento");
    } finally {
      setSaving(false);
    }
  };

  // ── Sem projeto: a ponte não tem destino, e isso precisa ser dito ──
  if (!projectId) {
    return (
      <div className="border border-frame-gray-3 bg-frame-gray-1/40 p-3">
        <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">
          Usar este orçamento no módulo
        </p>
        <p className="mt-1 text-[0.76rem] leading-relaxed text-frame-gray-light">
          O orçamento do módulo é por projeto. Abra esta ferramenta dentro de um projeto para enviar
          as rubricas para lá.
        </p>
      </div>
    );
  }

  // ── Bloco ausente/inválido: botão inerte, sem tentar ler a prosa (ADR-013) ──
  if (!block.ok) {
    return (
      <div className="flex flex-col gap-3 border border-frame-gray-3 bg-frame-gray-1/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">
            Usar este orçamento no módulo
          </p>
          <p className="mt-1 text-[0.76rem] leading-relaxed text-frame-gray-light">
            Indisponível: este orçamento foi gerado sem os dados estruturados. Preencha as categorias
            direto na tela de Orçamento do projeto.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Este orçamento foi gerado sem os dados estruturados"
            className="frame-btn-ghost flex min-h-11 items-center justify-center gap-2 px-3 py-2 opacity-40"
          >
            <Wallet className="h-3.5 w-3.5" />
            Usar no módulo
          </button>
          <button
            type="button"
            onClick={() => setLocation(`/project/${projectId}/budget`)}
            className="frame-btn-ghost flex min-h-11 items-center justify-center gap-2 px-3 py-2"
          >
            Abrir Orçamento do projeto
          </button>
        </div>
      </div>
    );
  }

  const chosenTotal = budgetBlockTotal(block.categories, bound);

  return (
    <>
      <div className="flex flex-col gap-3 border border-frame-orange/40 bg-frame-orange/[0.06] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
            Usar este orçamento no módulo
          </p>
          <p className="mt-1 text-[0.76rem] leading-relaxed text-frame-gray-light">
            {block.categories.length} rubricas estimadas em faixa. Você escolhe piso ou teto e revisa
            antes de qualquer gravação.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          className="frame-btn-primary flex min-h-11 items-center justify-center gap-2 px-3 py-2"
        >
          <Wallet className="h-3.5 w-3.5" />
          Usar este orçamento no módulo de Orçamento
        </button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-xl rounded-none p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-xl sm:text-2xl">
              Enviar orçamento para o módulo
            </DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Confira as rubricas extraídas da geração. Nada é gravado no projeto até você confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <fieldset className="border border-frame-gray-3/60 p-3">
              <legend className="px-1 font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                Valor que vai para o orçamento
              </legend>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["max", "Teto da faixa", "Recomendado: o orçado é o limite autorizado."],
                    ["min", "Piso da faixa", "Mais apertado — pode marcar “estourado” cedo."],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={`flex min-h-11 cursor-pointer items-start gap-2 border p-2.5 transition ${
                      bound === value
                        ? "border-frame-orange bg-frame-orange/10"
                        : "border-frame-gray-3/60 hover:border-frame-gray-3"
                    }`}
                  >
                    <input
                      type="radio"
                      name="budget-bridge-bound"
                      value={value}
                      checked={bound === value}
                      onChange={() => setBound(value)}
                      className="mt-0.5 accent-frame-orange"
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.8rem] font-semibold text-frame-white">
                        {label} · {formatMoney(budgetBlockTotal(block.categories, value), block.currency)}
                      </span>
                      <span className="mt-0.5 block text-[0.66rem] leading-relaxed text-frame-gray-light">
                        {hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-1.5">
              {block.categories.map((category, index) => (
                <div
                  key={`${category.key}-${index}`}
                  className="flex flex-col gap-0.5 border border-frame-gray-3/50 bg-frame-gray-1/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-[0.8rem] text-frame-white">{category.label}</span>
                  <span className="font-mono text-[0.7rem] text-frame-gray-light">
                    {formatMoney(category.min, block.currency)} – {formatMoney(category.max, block.currency)}
                    <span className="ml-2 text-frame-orange">
                      → {formatMoney(category[bound], block.currency)}
                    </span>
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border border-frame-orange/40 bg-frame-orange/[0.06] px-3 py-2">
                <span className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange">
                  Total do orçamento
                </span>
                <span className="font-mono text-sm font-bold text-frame-white">
                  {formatMoney(chosenTotal, block.currency)}
                </span>
              </div>
            </div>

            {block.margin && (
              <p className="border border-frame-gray-3/50 px-3 py-2 text-[0.7rem] leading-relaxed text-frame-gray-light">
                Margem da produtora: {formatMoney(block.margin.min, block.currency)} –{" "}
                {formatMoney(block.margin.max, block.currency)}.{" "}
                <strong className="text-frame-white">Não entra no orçamento</strong> — margem é
                receita, não custo.
              </p>
            )}

            {block.assumptions && (
              <p className="border border-frame-gray-3/50 px-3 py-2 text-[0.7rem] leading-relaxed text-frame-gray-light">
                <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light">
                  Premissas ·{" "}
                </span>
                {block.assumptions}
              </p>
            )}

            {block.dropped.length > 0 && (
              <div className="border border-yellow-500/40 bg-yellow-500/[0.06] px-3 py-2">
                <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-yellow-400">
                  Rubricas descartadas
                </p>
                <ul className="mt-1 space-y-0.5 text-[0.7rem] text-frame-gray-light">
                  {block.dropped.map((item, index) => (
                    <li key={`${item.label}-${index}`}>
                      {item.label} — {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {needsReplaceConfirmation && (
              <div className="border border-red-500/50 bg-red-500/[0.07] px-3 py-2.5">
                <p className="flex items-start gap-2 text-[0.74rem] leading-relaxed text-frame-white">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span>
                    {existingUnknown
                      ? "Não foi possível verificar o orçamento atual do projeto. Salvar substitui todas as categorias existentes."
                      : `Este projeto já tem orçamento definido (${existingCount} categoria${existingCount === 1 ? "" : "s"}). Salvar substitui as categorias existentes — não há junção.`}
                  </span>
                </p>
                <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-[0.72rem] text-frame-gray-light">
                  <input
                    type="checkbox"
                    checked={replaceAcknowledged}
                    onChange={(e) => setReplaceAcknowledged(e.target.checked)}
                    className="accent-frame-orange"
                  />
                  Entendi que as categorias atuais serão substituídas
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-frame-gray-3 pt-4">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="frame-btn-ghost min-h-11"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="frame-btn-primary inline-flex min-h-11 items-center justify-center gap-2"
              disabled={saving || (needsReplaceConfirmation && !replaceAcknowledged)}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Confirmar e enviar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
