import { z } from "zod";

/**
 * Strong password rule for user-facing flows (register and reset).
 * Not applied to internal seed passwords (admin/demo) that are set via env vars.
 *
 * Requirements:
 * - Minimum 10 characters, maximum 128
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character (non-alphanumeric)
 */
export const strongPasswordSchema = z
  .string()
  .min(10, "A senha deve ter no mínimo 10 caracteres")
  .max(128, "A senha deve ter no máximo 128 caracteres")
  .refine((value) => /[A-Z]/.test(value), {
    message: "A senha deve conter ao menos uma letra maiúscula",
  })
  .refine((value) => /[a-z]/.test(value), {
    message: "A senha deve conter ao menos uma letra minúscula",
  })
  .refine((value) => /[0-9]/.test(value), {
    message: "A senha deve conter ao menos um número",
  })
  .refine((value) => /[^A-Za-z0-9]/.test(value), {
    message: "A senha deve conter ao menos um caractere especial (ex: ! @ # $ % & * ?)",
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: strongPasswordSchema,
  desiredPlan: z.enum(["pro", "studio"]).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: strongPasswordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
