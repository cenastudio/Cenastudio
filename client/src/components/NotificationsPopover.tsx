import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bell, CheckCheck, CheckCircle, AlertTriangle, Inbox, Trash2 } from "lucide-react";
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

function relativeTime(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("app.notifications.justNow") as string;
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
  const { t } = useLanguage();
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
      toast.error(t("app.notifications.errorLoad") as string);
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
      toast.error(t("app.notifications.errorMarkAllRead") as string);
    }
  };

  const handleClearRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        const removed = json.data?.removed ?? 0;
        setNotifications((prev) => prev.filter((n) => !n.read));
        toast.success(removed > 0 ? `${removed} ${t("app.notifications.removed") as string}` : t("app.notifications.nothingToClear") as string);
      }
    } catch {
      toast.error(t("app.notifications.errorClear") as string);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t("app.notifications.confirmClearAll") as string)) return;

    try {
      const res = await fetch(`${API_BASE}/api/notifications/all`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        const removed = json.data?.removed ?? 0;
        setNotifications([]);
        setUnreadCount(0);
        toast.success(removed > 0 ? `${removed} ${t("app.notifications.removed") as string}` : t("app.notifications.nothingToClear") as string);
      }
    } catch {
      toast.error(t("app.notifications.errorClearAll") as string);
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
      toast.error(t("app.notifications.errorMarkRead") as string);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="notification-trigger relative flex h-9 w-9 items-center justify-center border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition"
          title={t("app.notifications.title") as string}
          aria-label={unreadCount > 0 ? `${unreadCount} ${t("app.notifications.unread") as string}` : t("app.notifications.title") as string}
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="notification-count absolute -top-1 -right-1 flex min-w-4 h-4 items-center justify-center rounded-full px-1 text-[0.58rem] font-bold font-frame-mono bg-frame-orange text-black shadow-[0_0_0_2px_var(--app-surface-strong)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="notification-panel w-[min(420px,calc(100vw-1rem))] overflow-hidden p-0"
      >
        <div className="notification-header flex items-start justify-between gap-3 px-4 py-4 border-b border-frame-gray-3">
          <div>
            <span className="font-frame-mono text-[0.62rem] tracking-[0.18em] text-frame-orange uppercase">
              {t("app.notifications.central") as string}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <h2 className="font-frame-body text-sm font-semibold text-frame-white">{t("app.notifications.title") as string}</h2>
              {unreadCount > 0 && (
                <span className="rounded-full border border-frame-orange/35 bg-frame-orange/10 px-2 py-0.5 font-frame-mono text-[0.58rem] text-frame-orange">
                  {unreadCount > 9 ? "9+" : unreadCount} {t("app.notifications.new") as string}
                </span>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="notification-read-all h-8 shrink-0 px-2.5 py-1 text-[0.58rem] text-frame-gray-light hover:text-frame-orange gap-1 border border-frame-gray-3"
            >
              <CheckCheck className="w-3 h-3" />
              {t("app.notifications.markAllRead") as string}
            </Button>
          )}
        </div>

        <ScrollArea className="notification-list h-[min(520px,calc(100vh-260px))] min-h-[260px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <span className="font-frame-mono text-[0.6rem] text-frame-gray-light">
                {t("app.notifications.loading") as string}
              </span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="flex h-11 w-11 items-center justify-center border border-frame-gray-3 text-frame-gray-light">
                <Inbox className="w-5 h-5" />
              </div>
              <span className="font-frame-mono text-[0.62rem] uppercase tracking-[0.12em] text-frame-gray-light">
                {t("app.notifications.empty") as string}
              </span>
            </div>
          ) : (
            <div className="notification-items p-2">
              {notifications.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                const color = typeColors[n.type] || "text-frame-gray-light";
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleMarkRead(n)}
                    className={cn(
                      "notification-item group w-full text-left px-3.5 py-3 transition flex gap-3",
                      !n.read && "is-unread",
                    )}
                  >
                    <div className={cn("notification-icon mt-0.5 shrink-0", color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "font-frame-mono text-[0.62rem] tracking-[0.04em] truncate",
                            n.read ? "text-frame-gray-light" : "text-frame-white font-bold",
                          )}
                        >
                          {n.title}
                        </span>
                        <span className="shrink-0 font-frame-mono text-[0.62rem] text-frame-gray-light whitespace-nowrap">
                          {relativeTime(n.created_at, t)}
                        </span>
                      </div>
                      <p className="font-frame-mono text-[0.64rem] text-frame-gray-light mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="notification-dot w-1.5 h-1.5 mt-1.5 shrink-0 rounded-full bg-frame-orange" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="notification-footer flex items-center justify-between gap-3 border-t border-frame-gray-3 px-3 py-2.5">
            <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light">
              {notifications.filter((n) => !n.read).length} {t("app.notifications.pending") as string}
            </span>
            <div className="flex items-center gap-2">
              {notifications.some((n) => n.read) && (
                <button
                  type="button"
                  onClick={handleClearRead}
                  className="notification-clear-button inline-flex min-h-8 items-center gap-1.5 border border-frame-gray-3 px-2.5 font-frame-mono text-[0.58rem] uppercase tracking-[0.1em] text-frame-gray-light transition hover:border-frame-orange hover:text-frame-orange"
                >
                  {t("app.notifications.clearRead") as string}
                </button>
              )}
              <button
                type="button"
                onClick={handleClearAll}
                className="notification-clear-button inline-flex min-h-8 items-center gap-1.5 border border-frame-gray-3 px-2.5 font-frame-mono text-[0.58rem] uppercase tracking-[0.1em] text-frame-gray-light transition hover:border-frame-red hover:text-frame-red"
              >
                <Trash2 className="h-3 w-3" />
                {t("app.notifications.clearAll") as string}
              </button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
