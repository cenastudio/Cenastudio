import { CheckCircle2, CircleDashed } from "lucide-react";

interface SessionGuideProps {
  label: string;
  title: string;
  steps: string[];
  output: string;
  completed?: number;
}

export default function SessionGuide({ label, title, steps, output, completed = 0 }: SessionGuideProps) {
  return (
    <section className="border border-frame-orange/30 bg-frame-orange/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.16em] text-frame-orange">
            {label}
          </p>
          <h3 className="mt-1 text-[0.92rem] font-semibold leading-tight text-frame-white">{title}</h3>
        </div>
        <span className="shrink-0 border border-frame-orange/35 px-2 py-1 font-frame-mono text-[0.54rem] uppercase tracking-[0.12em] text-frame-orange">
          {completed}/{steps.length}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {steps.map((step, index) => {
          const done = index < completed;
          const Icon = done ? CheckCircle2 : CircleDashed;
          return (
            <div key={step} className="flex items-center gap-2 text-[0.68rem] leading-snug text-frame-gray-light">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${done ? "text-frame-orange" : "text-frame-gray-muted"}`} />
              <span>{step}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 border-t border-frame-orange/20 pt-2 text-[0.66rem] leading-relaxed text-frame-gray-light">
        {output}
      </p>
    </section>
  );
}
