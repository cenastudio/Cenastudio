import { useAuth } from "@/contexts/AuthContext";

export default function ContextPanel() {
  const { plan } = useAuth();

  if (!plan) return null;

  return (
    <div className="mt-auto px-[18px] py-4 border-t border-frame-gray-3 bg-frame-black/50 shrink-0">
      <div className="flex items-center gap-2 text-frame-gray-light">
        <div className="w-1.5 h-1.5 rounded-full bg-frame-orange animate-pulse" />
        <span className="font-frame-mono text-[0.55rem] tracking-wider uppercase">
          NVIDIA MiniMax / IA
        </span>
      </div>
      <div className="mt-2 text-[0.63rem] font-frame-mono text-frame-gray-light flex flex-col gap-1">
        <div className="flex justify-between">
          <span>Plano:</span>
          <span className="text-frame-white font-medium">{plan.planName}</span>
        </div>
        <div className="flex justify-between">
          <span>Cota:</span>
          <span className="text-frame-orange">
            {plan.generationLimit === -1 ? "Ilimitado" : `${plan.generationLimit} gerações`}
          </span>
        </div>
      </div>
    </div>
  );
}
