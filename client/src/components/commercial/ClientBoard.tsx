import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSensors, useSensor, PointerSensor, TouchSensor } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Client } from "@/lib/api";
import { User, Phone, GripVertical } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ClientCardProps {
  client: Client;
  dragHandle?: boolean;
}

export function ClientCard({ client, dragHandle = false }: ClientCardProps) {
  const { t } = useLanguage();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "frame-card p-4 rounded-ds-space-2 relative group transition-all duration-200",
        isDragging ? "scale-95 shadow-lg" : "hover:scale-[1.02]"
      )}
    >
      {dragHandle && (
        <button
          {...attributes}
          {...listeners}
          className="absolute top-3 right-3 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-ds-orange cursor-grab active:cursor-grabbing"
          aria-label={t("app.dragDrop.drag") as string}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-ds-surface-2 flex items-center justify-center">
          <User className="w-5 h-5 text-ds-text-2" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ds-text-1 truncate">{client.name}</h3>
          <p className="text-xs text-ds-text-3 truncate">{client.company || client.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-ds-surface-3">
        {client.phone && (
          <button
            className="flex-1 flex items-center gap-1 text-xs text-ds-text-2 hover:text-ds-text-1"
            onClick={() => window.open(`tel:${client.phone}`)}
          >
            <Phone className="w-3 h-3" />
            <span className="truncate">{client.phone}</span>
          </button>
        )}
      </div>
    </div>
  );
}

interface ClientBoardProps {
  clients: Client[];
  onDragEnd: (activeId: string, overId: string | null) => void;
}

export function ClientBoard({ clients, onDragEnd }: ClientBoardProps) {
  const { t } = useLanguage();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor)
  );

  return (
    <div className="space-y-ds-space-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("app.nav.clients") as string}</h2>
        <span className="text-xs text-ds-text-3">{clients.length} {t("app.commercial.clientsCount") as string}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} dragHandle />
        ))}
      </div>
    </div>
  );
}
