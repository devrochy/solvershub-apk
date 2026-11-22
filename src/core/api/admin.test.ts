jest.mock("./http", () => ({ fetchApi: jest.fn() }));

import { AdminApiError, crearClienteAdmin } from "./admin";
import { fetchApi } from "./http";
import type { AdminSesion } from "@core/session/types";

// El 409 del plan trae `error.details` (HU-BILL-25: `{feature, plan, historial_dias}`); el cliente lo conserva.

const sesion = { token: "t", adminId: "a", email: "e@test", role: "admin", tenantId: "t-1", tenantName: "Negocio" } as AdminSesion;

describe("AdminApiError con details", () => {
  it("guarda code, mensaje y details del error anidado", async () => {
    (fetchApi as jest.Mock).mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "plan_feature_not_included",
            message: "Tu plan no incluye esto.",
            details: { feature: "historial", plan: "basic", historial_dias: 90 },
          },
        }),
        { status: 409 },
      ),
    );
    const fallo = await crearClienteAdmin(sesion)
      .get("/admin/conversations/c-1")
      .catch((e: unknown) => e);
    expect(fallo).toBeInstanceOf(AdminApiError);
    expect(fallo).toMatchObject({
      status: 409,
      code: "plan_feature_not_included",
      message: "Tu plan no incluye esto.",
      details: { feature: "historial", plan: "basic", historial_dias: 90 },
    });
  });

  it("sin details (o con un valor que no es objeto) queda undefined", async () => {
    (fetchApi as jest.Mock).mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "x", message: "y", details: ["no"] } }), { status: 409 }),
    );
    const fallo = (await crearClienteAdmin(sesion)
      .get("/admin/x")
      .catch((e: unknown) => e)) as AdminApiError;
    expect(fallo.details).toBeUndefined();
  });
});
