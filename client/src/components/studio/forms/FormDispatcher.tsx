import ScriptForm from "./ScriptForm";
import DecupagemForm from "./DecupagemForm";
import CallsheetForm from "./CallsheetForm";
import ChecklistForm from "./ChecklistForm";
import ScheduleForm from "./ScheduleForm";
import BriefingForm from "./BriefingForm";
import BudgetForm from "./BudgetForm";
import ProposalForm from "./ProposalForm";
import ContractForm from "./ContractForm";
import MoodboardForm from "./MoodboardForm";
import DeliveryForm from "./DeliveryForm";
import AssistantForm from "./AssistantForm";

interface FormDispatcherProps {
  slug: string;
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSetOutput?: (output: string) => void;
}

export default function FormDispatcher({ slug, data, onChange, onSetOutput }: FormDispatcherProps) {
  switch (slug) {
    case "roteiro":
      return <ScriptForm data={data} onChange={onChange} />;
    case "decupagem":
      return <DecupagemForm data={data} onChange={onChange} />;
    case "callsheet":
      return <CallsheetForm data={data} onChange={onChange} />;
    case "checklist":
      return <ChecklistForm data={data} onChange={onChange} onSetOutput={onSetOutput} />;
    case "cronograma":
      return <ScheduleForm data={data} onChange={onChange} />;
    case "briefing":
      return <BriefingForm data={data} onChange={onChange} />;
    case "orcamento":
      return <BudgetForm data={data} onChange={onChange} />;
    case "proposta":
      return <ProposalForm data={data} onChange={onChange} />;
    case "contrato":
      return <ContractForm data={data} onChange={onChange} />;
    case "moodboard":
      return <MoodboardForm data={data} onChange={onChange} />;
    case "entrega":
      return <DeliveryForm data={data} onChange={onChange} />;
    case "assistente":
      return <AssistantForm data={data} onChange={onChange} />;
    default:
      return (
        <div className="flex flex-col gap-3">
          <label className="block font-frame-mono text-[0.64rem] tracking-[0.12em] uppercase text-frame-gray-light">
            Descrição / contexto geral
          </label>
          <textarea
            value={data.prompt || ""}
            onChange={(e) => onChange("prompt", e.target.value)}
            placeholder="Descreva as instruções para a ferramenta..."
            className="frame-input min-h-[150px] resize-y"
          />
        </div>
      );
  }
}
