/**
 * Contact Modal Component
 * Modal para formulário de contato/demo
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ContactForm } from "@/components/landing/forms/ContactForm";
import { useApp } from "@/contexts/AppContext";

interface ContactModalProps {
  type?: "contact" | "demo" | "support";
  title?: string;
  description?: string;
}

export function ContactModal({
  type = "contact",
  title = "Entre em Contato",
  description = "Preencha o formulário abaixo e entraremos em contato em breve.",
}: ContactModalProps) {
  const { modals, closeModal } = useApp();
  const isOpen = modals.contact;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal("contact")}>
      <DialogContent className="cinematic-theme sm:max-w-md bg-frame-gray-2 border border-frame-gray-3">
        <DialogHeader>
          <DialogTitle className="frame-title text-xl text-frame-white">{title}</DialogTitle>
          <DialogDescription className="text-frame-gray-light font-light">{description}</DialogDescription>
        </DialogHeader>
        <ContactForm type={type} onSuccess={() => closeModal("contact")} />
      </DialogContent>
    </Dialog>
  );
}
