import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Register from "./Register";

const register = vi.fn();
const setLocation = vi.fn();

const copy: Record<string, string> = {
  "app.auth.createAccount": "Criar conta",
  "app.auth.trialIncluded": "14 dias de acesso Pro. Sem cartão para começar.",
  "app.auth.name": "Nome completo",
  "app.auth.namePlaceholder": "Seu nome completo",
  "app.auth.email": "E-mail",
  "app.auth.emailPlaceholder": "seu@email.com",
  "app.auth.password": "Senha",
  "app.auth.confirmPassword": "Confirmar senha",
  "app.auth.passwordRuleLength": "10+ caracteres",
  "app.auth.passwordRuleUppercase": "Uma letra maiúscula",
  "app.auth.passwordRuleLowercase": "Uma letra minúscula",
  "app.auth.passwordRuleNumber": "Um número",
  "app.auth.passwordRuleSymbol": "Um símbolo",
  "app.auth.passwordRulesHint": "Sua senha precisa atender a estes requisitos.",
  "app.auth.repeatPassword": "Repita a senha",
  "app.auth.passwordsMatch": "As senhas coincidem.",
  "app.auth.passwordsDontMatch": "As senhas não coincidem.",
  "app.auth.passwordRulesIncomplete": "Crie uma senha que cumpra todos os requisitos.",
  "app.auth.createAndStart": "Criar conta e começar",
  "app.auth.createAndCheckout": "Criar conta e continuar para pagamento",
  "app.auth.creatingAccount": "Criando conta...",
  "app.auth.haveAccount": "Já tem conta?",
  "app.auth.loginTab": "Entrar",
  "app.errors.fillAllFields": "Preencha todos os campos.",
  "app.errors.createAccount": "Não foi possível criar a conta.",
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ register }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (key: string) => copy[key] || key }),
}));

vi.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  startCheckout: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/register", setLocation],
  useSearch: () => "",
}));

describe("Register", () => {
  it("shows the actual password requirements before the account is created", () => {
    render(<Register />);

    expect(screen.getByText("14 dias de acesso Pro. Sem cartão para começar.")).toBeInTheDocument();
    expect(screen.getByText("10+ caracteres")).toBeInTheDocument();
    expect(screen.getByText("Uma letra maiúscula")).toBeInTheDocument();
    expect(screen.getByText("Uma letra minúscula")).toBeInTheDocument();
    expect(screen.getByText("Um número")).toBeInTheDocument();
    expect(screen.getByText("Um símbolo")).toBeInTheDocument();
  });

  it("stops a weak password before sending a registration request", () => {
    render(<Register />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Clara Souza" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "clara@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "curta" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "curta" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta e começar" }));

    expect(screen.getByText("Crie uma senha que cumpra todos os requisitos.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("creates the account when the password matches the server policy", async () => {
    register.mockResolvedValue({ id: 1, email: "clara@example.com", role: "user" });
    render(<Register />);

    fireEvent.change(screen.getByLabelText("Nome completo"), { target: { value: "Clara Souza" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "clara@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "CenaStudio1!" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "CenaStudio1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar conta e começar" }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("Clara Souza", "clara@example.com", "CenaStudio1!", undefined, undefined);
    });
    expect(setLocation).toHaveBeenCalledWith("/tools");
  });
});
