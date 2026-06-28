/**
 * Demo Modal Component
 * Modal para agendamento de demo
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";

export function DemoModal() {
  const { modals, closeModal, submitDemo, isLoading } = useApp();
  const isOpen = modals.demo;
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: { name: string; email: string }) => {
    try {
      await submitDemo(data);
      reset();
      closeModal("demo");
    } catch (error) {
      // Erro já é tratado pelo context
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal("demo")}>
      <DialogContent className="cinematic-theme sm:max-w-md bg-frame-gray-2 border border-frame-gray-3">
        <DialogHeader>
          <DialogTitle className="frame-title text-xl text-frame-white">Agendar demo</DialogTitle>
          <DialogDescription className="text-frame-gray-light font-light">
            Preencha seus dados e agende uma demonstração personalizada com nosso time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="demo-name" className="text-sm font-medium">
              Nome Completo *
            </Label>
            <Input
              id="demo-name"
              placeholder="Seu nome"
              {...register("name", { required: "Nome é obrigatório" })}
              className="mt-1"
              disabled={isLoading}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{(errors.name as any).message}</p>}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="demo-email" className="text-sm font-medium">
              Email *
            </Label>
            <Input
              id="demo-email"
              type="email"
              placeholder="seu@email.com"
              {...register("email", {
                required: "Email é obrigatório",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Email inválido",
                },
              })}
              className="mt-1"
              disabled={isLoading}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{(errors.email as any).message}</p>}
          </div>

          {/* Info */}
          <div className="bg-frame-gray-1 p-4 border border-frame-gray-3 text-sm text-frame-gray-light">
            <p className="font-frame-mono text-[0.6rem] tracking-[0.12em] uppercase text-frame-orange mb-2">
              O que esperar
            </p>
            <ul className="space-y-1 text-xs">
              <li>• Demo ao vivo de 30 minutos</li>
              <li>• Apresentação personalizada</li>
              <li>• Resposta a todas as suas dúvidas</li>
              <li>• Próximos passos para começar</li>
            </ul>
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
                Agendando...
              </>
            ) : (
              "Agendar Demo"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
