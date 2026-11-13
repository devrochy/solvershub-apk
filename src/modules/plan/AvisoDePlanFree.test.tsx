let mockAdminSession: Record<string, unknown> = {};

jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => mockAdminSession,
  useAdminSessionOpcional: () => mockAdminSession,
}));

import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@core/theme/theme-context";
import { AvisoDePlanFree, BannerPlanFree } from "./AvisoDePlanFree";
import { TarjetaPlanFree, TarjetaPlanFreePresentacional } from "./TarjetaPlanFree";

const PLAN_FREE = {
  plan_id: "free",
  plan_name: "Free",
  status: "trialing",
  days_left: 12,
  trial_ends_at: null,
  has_plan: true,
};

const AVISO = {
  tono: "warning" as const,
  titulo: "Estás en el plan Free",
  texto: "Te quedan 12 días de prueba. Con un plan pago tienes más agentes.",
  cta: "Mejorar mi plan",
};

function montar(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

afterEach(() => {
  mockAdminSession = {};
});

describe("banner de plan Free (HU-BILL-15)", () => {
  it("muestra el texto y responde al CTA y al cierre", async () => {
    const onCerrar = jest.fn();
    const onMejorar = jest.fn();
    await montar(<BannerPlanFree aviso={AVISO} onCerrar={onCerrar} onMejorar={onMejorar} />);

    expect(screen.getByTestId("aviso-plan-free")).toBeTruthy();
    expect(screen.getByText("Estás en el plan Free")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("aviso-plan-mejorar"));
    await fireEvent.press(screen.getByTestId("aviso-plan-cerrar"));

    expect(onMejorar).toHaveBeenCalledTimes(1);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("la tarjeta de la campana usa el mismo aviso", async () => {
    const onMejorar = jest.fn();
    await montar(
      <TarjetaPlanFreePresentacional aviso={AVISO} onCerrar={jest.fn()} onMejorar={onMejorar} />,
    );

    expect(screen.getByTestId("tarjeta-plan-free")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("tarjeta-plan-mejorar"));
    expect(onMejorar).toHaveBeenCalledTimes(1);
  });
});

describe("contenedores de plan Free (HU-BILL-15)", () => {
  it("aparece en Free para quien puede pagar", async () => {
    mockAdminSession = {
      sesion: { tenantId: "t1", role: "owner", permissions: { plan: "write" }, plan: PLAN_FREE },
      avisoPlanCerrado: false,
      cerrarAvisoPlan: jest.fn(),
    };
    await montar(<AvisoDePlanFree />);
    expect(screen.getByTestId("aviso-plan-free")).toBeTruthy();
  });

  it("no aparece en un plan pago, con permiso de solo lectura ni para master", async () => {
    mockAdminSession = {
      sesion: {
        tenantId: "t1",
        role: "owner",
        permissions: { plan: "write" },
        plan: { ...PLAN_FREE, plan_id: "basic", plan_name: "Basic" },
      },
      avisoPlanCerrado: false,
      cerrarAvisoPlan: jest.fn(),
    };
    await montar(<AvisoDePlanFree />);
    expect(screen.queryByTestId("aviso-plan-free")).toBeNull();

    mockAdminSession = {
      sesion: { tenantId: "t1", role: "colaborador", permissions: { plan: "read" }, plan: PLAN_FREE },
      avisoPlanCerrado: false,
      cerrarAvisoPlan: jest.fn(),
    };
    await montar(<AvisoDePlanFree />);
    expect(screen.queryByTestId("aviso-plan-free")).toBeNull();

    mockAdminSession = {
      sesion: { tenantId: "t1", role: "master", permissions: { plan: "write" }, plan: PLAN_FREE },
      avisoPlanCerrado: false,
      cerrarAvisoPlan: jest.fn(),
    };
    await montar(<AvisoDePlanFree />);
    expect(screen.queryByTestId("aviso-plan-free")).toBeNull();
  });

  it("la tarjeta de la campana se oculta al cerrar el aviso en la sesión", async () => {
    mockAdminSession = {
      sesion: { tenantId: "t1", role: "owner", permissions: { plan: "write" }, plan: PLAN_FREE },
      avisoPlanCerrado: true,
      cerrarAvisoPlan: jest.fn(),
    };
    await montar(<TarjetaPlanFree onCerrar={jest.fn()} />);
    expect(screen.queryByTestId("tarjeta-plan-free")).toBeNull();
  });
});
