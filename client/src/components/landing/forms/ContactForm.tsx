/**
 * Contact Form Component
 * Formulário para contato, demo ou suporte
 */

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ContactFormData } from "@/lib/types";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2 } from "lucide-react";

interface ContactFormProps {
  type?: "contact" | "demo" | "support";
  onSuccess?: () => void;
}

export function ContactForm({ type = "contact", onSuccess }: ContactFormProps) {
  const { t } = useLanguage();
  const { submitContact, isLoading } = useApp();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    defaultValues: {
      type,
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    try {
      await submitContact(data);
      reset();
      onSuccess?.();
    } catch (error) {
      // Erro já é tratado pelo context
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div>
        <Label htmlFor="name" className="font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light">
          {t("app.landing.modals.fullName") as string} *
        </Label>
        <Input
          id="name"
          placeholder={t("app.landing.modals.yourName") as string}
          {...register("name", { required: t("app.landing.modals.nameRequired") as string })}
          className="mt-1 frame-input"
          disabled={isLoading}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email" className="font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light">
          {t("app.landing.modals.email") as string} *
        </Label>
        <Input
          id="email"
          type="email"
          placeholder={t("app.landing.modals.emailPlaceholder") as string}
          {...register("email", {
            required: t("app.landing.modals.emailRequired") as string,
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: t("app.landing.modals.invalidEmail") as string,
            },
          })}
          className="mt-1 frame-input"
          disabled={isLoading}
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>

      {/* Phone */}
      <div>
        <Label htmlFor="phone" className="font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light">
          {t("app.landing.modals.phone") as string}
        </Label>
        <Input
          id="phone"
          placeholder={t("app.landing.modals.phonePlaceholder") as string}
          {...register("phone")}
          className="mt-1 frame-input"
          disabled={isLoading}
        />
      </div>

      {/* Message */}
      <div>
        <Label
          htmlFor="message"
          className="font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light"
        >
          {t("app.landing.modals.message") as string} *
        </Label>
        <Textarea
          id="message"
          placeholder={t("app.landing.modals.messagePlaceholder") as string}
          {...register("message", { required: t("app.landing.modals.messageRequired") as string })}
          className="mt-1 min-h-24 frame-input"
          disabled={isLoading}
        />
        {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-frame-orange hover:bg-frame-orange-dark text-frame-black font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {t("app.landing.modals.sending") as string}
          </>
        ) : (
          t("app.landing.modals.sendMessage") as string
        )}
      </Button>
    </form>
  );
}
