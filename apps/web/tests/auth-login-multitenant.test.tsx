import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { App } from "../src/App";
import { useUiSessionStore } from "../src/lib/store";

describe("Segurança, Login Obrigatório e Isolamento Multi-Tenant", () => {
  beforeEach(() => {
    localStorage.clear();
    useUiSessionStore.setState({
      isAuthenticated: false,
      currentUser: null,
      activeTab: "overview",
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("exige login e renderiza a tela de login quando o usuário não está autenticado", () => {
    render(<App />);

    expect(screen.getByTestId("login-screen")).toBeDefined();
    expect(screen.getByTestId("login-card")).toBeDefined();
    expect(screen.getByTestId("input-login-email")).toBeDefined();
    expect(screen.getByTestId("input-login-password")).toBeDefined();
    expect(screen.getByTestId("btn-login-submit")).toBeDefined();
    expect(screen.queryByTestId("standard-page-template")).toBeNull();
  });

  it("exibe alerta de erro ao tentar autenticar com credenciais incorretas", async () => {
    render(<App />);

    const emailInput = screen.getByTestId("input-login-email");
    const passwordInput = screen.getByTestId("input-login-password");
    const submitBtn = screen.getByTestId("btn-login-submit");

    fireEvent.change(emailInput, { target: { value: "desconhecido@empresa.com" } });
    fireEvent.change(passwordInput, { target: { value: "senhaerrada" } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    const errorAlert = screen.getByTestId("login-error-alert");
    expect(errorAlert.textContent).toContain("Credenciais inválidas");
    expect(useUiSessionStore.getState().isAuthenticated).toBe(false);
  });

  it("preenche credenciais com o botão de teste e efetua login com iwcosta@gmail.com e senha 123456", async () => {
    render(<App />);

    const quickFillBtn = screen.getByTestId("btn-quick-fill-demo");
    fireEvent.click(quickFillBtn);

    const emailInput = screen.getByTestId("input-login-email") as HTMLInputElement;
    const passwordInput = screen.getByTestId("input-login-password") as HTMLInputElement;
    expect(emailInput.value).toBe("iwcosta@gmail.com");
    expect(passwordInput.value).toBe("123456");

    const submitBtn = screen.getByTestId("btn-login-submit");
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Usuário autenticado com sucesso
    expect(useUiSessionStore.getState().isAuthenticated).toBe(true);
    expect(useUiSessionStore.getState().currentUser?.email).toBe("iwcosta@gmail.com");
    expect(useUiSessionStore.getState().currentUser?.role).toBe("ADMIN");
    expect(useUiSessionStore.getState().activeTenantId).toBe("comp-001");

    // Tela principal agora está visível
    expect(screen.getByTestId("standard-page-template")).toBeDefined();
    expect(screen.getByTestId("sidebar-user-name").textContent).toContain("Igor W. Costa");
  });

  it("permite logout via botão de saída no rodapé da barra lateral", async () => {
    // Inicializa autenticado
    await act(async () => {
      await useUiSessionStore.getState().login("iwcosta@gmail.com", "123456");
    });

    render(<App />);
    expect(screen.getByTestId("standard-page-template")).toBeDefined();

    const logoutBtn = screen.getByTestId("btn-sidebar-logout");
    fireEvent.click(logoutBtn);

    expect(useUiSessionStore.getState().isAuthenticated).toBe(false);
    expect(screen.getByTestId("login-screen")).toBeDefined();
    expect(screen.queryByTestId("standard-page-template")).toBeNull();
  });
});

