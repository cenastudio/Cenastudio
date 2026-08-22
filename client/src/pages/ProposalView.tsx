import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { apiUrl } from "@/lib/api";
import BrandLogo from "@/components/BrandLogo";
import { CheckCircle2, AlertCircle, Loader2, FileSignature, Download } from "lucide-react";
import { toast } from "sonner";
import { applyDocumentMetadata } from "@/lib/documentMetadata";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Opens a hidden iframe with the proposal HTML and triggers the browser's
 * native print dialog (same approach used elsewhere in the app, e.g.
 * Proposals.tsx's printHtmlDocument). This is the most reliable way to get
 * a real PDF on mobile: it doesn't depend on rendering the A4 document
 * legibly on a small screen first, and works even inside restricted
 * in-app browsers (WhatsApp, Instagram) where CSS transform/ResizeObserver
 * based scaling can be unreliable.
 */
function printProposalAsPdf(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      return;
    }
    frameWindow.focus();
    frameWindow.onafterprint = cleanup;
    window.setTimeout(() => {
      frameWindow.print();
      cleanup();
    }, 250);
  };

  iframe.srcdoc = html;
}

/**
 * The proposal document is built at a fixed A4 pixel width (~800px) so PDF
 * export stays print-accurate — we don't want to touch that HTML/CSS. To
 * make it readable on phones, we measure the rendered content inside the
 * iframe and scale the whole thing down visually (CSS transform), instead
 * of relying on the document's own (nonexistent) responsiveness.
 */
function useIframeAutoScale(iframeRef: React.RefObject<HTMLIFrameElement | null>, wrapRef: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    const iframe = iframeRef.current;
    const wrap = wrapRef.current;
    if (!iframe || !wrap) return;

    const recompute = () => {
      try {
        const doc = iframe.contentDocument;
        const pageEl = doc?.querySelector(".page") as HTMLElement | null;
        const contentWidth = pageEl?.scrollWidth || iframe.clientWidth;
        const contentHeight = pageEl?.scrollHeight || iframe.clientHeight;
        const containerWidth = wrap.clientWidth;
        if (!contentWidth || !containerWidth) return;
        const nextScale = Math.min(1, containerWidth / contentWidth);
        setScale(nextScale);
        setScaledHeight(contentHeight * nextScale);
      } catch {
        // Cross-origin or not-yet-loaded — fall back to no scaling.
      }
    };

    iframe.addEventListener("load", recompute);
    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(wrap);
    recompute();

    return () => {
      iframe.removeEventListener("load", recompute);
      resizeObserver.disconnect();
    };
  }, [iframeRef, wrapRef, ready]);

  return { scale, scaledHeight };
}

interface PublicProposal {
  title: string;
  html: string;
  total: number;
  status: "viewed" | "accepted" | "rejected";
  client_name: string;
  document_hash: string;
  accepted_at: string | null;
  accepted_by_name: string | null;
}

/**
 * Public "simple acceptance" flow for proposals — no login required.
 * The client reviews the exact HTML that was sent, types their full name,
 * and clicking Accept records name + IP + user-agent + timestamp server-side,
 * bound to the document's hash captured at send time.
 */
/**
 * In-app browsers (WhatsApp, Instagram, Facebook, TikTok) use a restricted
 * WebView that often lacks reliable support for window.print() and can
 * behave inconsistently with iframe/ResizeObserver-based scaling. Detecting
 * these lets us proactively suggest opening in the system browser, which is
 * the only way to guarantee full functionality across all Android/iOS
 * versions — trying to patch around each WebView's quirks isn't reliable.
 */
function isRestrictedInAppBrowser(): boolean {
  const ua = navigator.userAgent || "";
  return /\bFBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok\b/i.test(ua);
}

export default function ProposalView() {
  const { t } = useLanguage();
  const { token } = useParams<{ token: string }>();
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [inAppBrowser] = useState(isRestrictedInAppBrowser);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { scale, scaledHeight } = useIframeAutoScale(iframeRef, wrapRef, Boolean(proposal));

  const load = () => {
    if (!token) return;
    fetch(apiUrl(`/public-proposal/${token}`))
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || "Proposta não encontrada.");
        setProposal(json.data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar proposta."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!proposal || !token) return;
    applyDocumentMetadata({
      title: `${proposal.title} | ${t("app.publicShare.proposal.label") as string} | Cena Studio`,
      description: t("app.publicShare.proposal.description") as string,
      path: `/proposal/${token}`,
      robots: "noindex, nofollow, noarchive",
    });
  }, [proposal, token, t]);

  const handleAccept = async () => {
    if (!name.trim()) {
      toast.error("Digite seu nome completo para aceitar.");
      return;
    }
    setIsAccepting(true);
    try {
      const res = await fetch(apiUrl(`/public-proposal/${token}/accept`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Erro ao aceitar proposta.");
      toast.success("Proposta aceita com sucesso!");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aceitar proposta.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertCircle className="w-10 h-10 text-frame-orange" />
        <p className="text-frame-gray-light">{error || "Proposta não encontrada."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-center">
          <BrandLogo tone="onDark" />
        </div>

        {inAppBrowser && (
          <div className="border border-frame-orange/40 bg-frame-orange/[0.06] p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-frame-orange shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-frame-white">Abra no navegador do seu celular</p>
              <p className="text-xs text-frame-gray-light mt-1 leading-relaxed">
                Você está vendo esta página dentro do WhatsApp/Instagram, que às vezes limita a visualização e o download do PDF.
                Toque no menu (⋮ ou ...) no topo e escolha "Abrir no navegador" para a melhor experiência.
              </p>
              <button
                type="button"
                onClick={async () => { await navigator.clipboard.writeText(window.location.href); toast.success("Link copiado"); }}
                className="frame-btn-ghost !py-2 !px-3 mt-3 text-xs"
              >
                Copiar link
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => printProposalAsPdf(proposal.html)}
          className="frame-btn-ghost w-full flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Baixar/Visualizar PDF
        </button>

        <div
          ref={wrapRef}
          className="border border-frame-gray-3 bg-frame-gray-1/10 overflow-hidden"
          style={{ height: scaledHeight ? `${scaledHeight}px` : "70vh" }}
        >
          <iframe
            ref={iframeRef}
            title="Proposta"
            srcDoc={proposal.html}
            sandbox="allow-same-origin"
            className="bg-[var(--ds-surface-tooltip)] border-0"
            style={{
              width: scale < 1 ? `${100 / scale}%` : "100%",
              height: scale < 1 ? `${100 / scale}%` : "70vh",
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: "top left",
            }}
          />
        </div>

        <div className="glow-card p-6 space-y-4">
          {proposal.status === "accepted" ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-frame-green shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-frame-white">Proposta aceita</p>
                <p className="text-sm text-frame-gray-light mt-1">
                  Aceita por <strong className="text-frame-white">{proposal.accepted_by_name}</strong> em{" "}
                  {proposal.accepted_at && new Date(proposal.accepted_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}.
                </p>
                <p className="text-[0.65rem] text-frame-gray-light mt-2 font-mono break-all">
                  Documento: {proposal.document_hash.slice(0, 16)}...
                </p>
              </div>
            </div>
          ) : proposal.status === "rejected" ? (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-frame-red shrink-0 mt-0.5" />
              <p className="text-sm text-frame-gray-light">Esta proposta foi rejeitada.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <FileSignature className="w-5 h-5 text-frame-orange" />
                <p className="text-base font-semibold text-frame-white">Aceitar proposta</p>
              </div>
              <p className="text-xs text-frame-gray-light leading-relaxed">
                Ao digitar seu nome completo e clicar em "Aceitar proposta", você confirma que leu e concorda
                com os termos acima. Registramos data, hora e origem do aceite para fins de comprovação.
              </p>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                disabled={isAccepting}
                className="frame-input w-full"
              />
              <button
                type="button"
                onClick={handleAccept}
                disabled={isAccepting}
                className="frame-btn-primary w-full flex items-center justify-center gap-2"
              >
                {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Aceitar proposta
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
