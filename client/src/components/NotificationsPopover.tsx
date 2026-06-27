import { useEffect, useState, useCallback } from "react";
import { Bell, CheckCheck, CheckCircle, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  read: number;
  link: string | null;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(dateStr + "Z").toLocaleDateString("pt-BR");
}

const typeIcons: Record<string, typeof Bell> = {
  info: Bell,
  success: CheckCircle,
  warning: AlertTriangle,
};

const typeColors: Record<string, string> = {
  info: "text-frame-orange",
  success: "text-green-500",
  warning: "text-yellow-500",
};

export default function NotificationsPopover() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setUnreadCount(json.data.count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications?limit=20`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.success) setNotifications(json.data);
    } catch {
      toast.error("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
        setUnreadCount(0);
      }
    } catch {
      toast.error("Erro ao marcar como lidas");
    }
  };

  const handleMarkRead = async (notification: Notification) => {
    if (notification.read) {
      if (notification.link) setLocation(notification.link);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/notifications/${notification.id}/read`,
        { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" } },
      );
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: 1 } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (notification.link) setLocation(notification.link);
      }
    } catch {
      toast.error("Erro ao marcar notificação como lida");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition"
          title="Notificações"
          aria-label={unreadCount > 0 ? `${unreadCount} notificações não lidas` : "Notificações"}
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[0.64rem] font-bold font-frame-mono bg-frame-red text-white rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-1rem))] p-0 bg-frame-black border border-frame-gray-3 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-frame-gray-3">
          <span className="font-frame-mono text-[0.65rem] tracking-[0.08em] text-frame-white uppercase">
            Notificações
          </span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-auto px-2 py-1 text-[0.64rem] text-frame-gray-light hover:text-frame-orange gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-frame-mono text-[0.6rem] text-frame-gray-light">
                Carregando...
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Bell className="w-8 h-8 text-frame-gray-3" />
              <span className="font-frame-mono text-[0.6rem] text-frame-gray-light">
                Nenhuma notificação
              </span>
            </div>
          ) : (
            <div className="divide-y divide-frame-gray-3">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                const color = typeColors[n.type] || "text-frame-gray-light";
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleMarkRead(n)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition hover:bg-frame-gray-3/30 flex gap-3",
                      !n.read && "bg-frame-gray-3/10",
                    )}
                  >
                    <div className={cn("mt-0.5 shrink-0", color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "font-frame-mono text-[0.6rem] tracking-[0.04em] truncate",
                            n.read ? "text-frame-gray-light" : "text-frame-white font-bold",
                          )}
                        >
                          {n.title}
                        </span>
                        <span className="shrink-0 font-frame-mono text-[0.62rem] text-frame-gray-light whitespace-nowrap">
                          {relativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="font-frame-mono text-[0.64rem] text-frame-gray-light mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full bg-frame-orange" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
