import { grupoVisible, puedeVerSeccion, seccionesPermitidas } from "./permisos";

const PERMISOS: Record<string, string | null> = {
  dashboard: "read",
  conversations: "write",
  escalations: null,
  "pack_cobranza:clientes": "read",
};

describe("permisos (ADR-APP-02)", () => {
  it("el master ve cualquier sección aunque no tenga permiso", () => {
    expect(puedeVerSeccion({}, "tenants", true)).toBe(true);
    expect(puedeVerSeccion({}, "no_existe", true)).toBe(true);
  });

  it("una sección sin entrada (null o ausente) queda oculta", () => {
    expect(puedeVerSeccion(PERMISOS, "escalations", false)).toBe(false);
    expect(puedeVerSeccion(PERMISOS, "tenants", false)).toBe(false);
  });

  it("cualquier acceso (read o write) hace visible la sección", () => {
    expect(puedeVerSeccion(PERMISOS, "conversations", false)).toBe(true);
    expect(puedeVerSeccion(PERMISOS, "pack_cobranza:clientes", false)).toBe(true);
  });

  it("seccionesPermitidas filtra por permiso y grupoVisible resume", () => {
    const cobranza = ["pack_cobranza:resumen", "pack_cobranza:clientes", "pack_cobranza:carteras"];
    expect(seccionesPermitidas(PERMISOS, cobranza, false)).toEqual(["pack_cobranza:clientes"]);
    expect(seccionesPermitidas(PERMISOS, cobranza, true)).toEqual(cobranza);

    expect(grupoVisible(PERMISOS, cobranza, false)).toBe(true);
    expect(grupoVisible(PERMISOS, ["tenants"], false)).toBe(false);
  });
});
