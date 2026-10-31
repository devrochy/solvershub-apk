import { derivarPerfil, packsConEscritura } from "./perfil";

describe("derivarPerfil (D-SPEC-29-7)", () => {
  it("master → dueño", () => {
    expect(derivarPerfil({ role: "master", permissions: {} })).toBe("dueno");
  });

  it("tester (entorno de test) → dueño", () => {
    expect(derivarPerfil({ role: "tester", permissions: {} })).toBe("dueno");
  });

  it("dueño del negocio → dueño, aunque tenga permisos de pack", () => {
    expect(derivarPerfil({ role: "admin", tenantRole: "owner", permissions: { pack_cobranza: "write" } })).toBe("dueno");
  });

  it("colaborador con escritura en un pack → supervisor", () => {
    expect(
      derivarPerfil({ role: "admin", tenantRole: "colaborador", permissions: { "pack_cobranza:resumen": "write" } }),
    ).toBe("supervisor");
  });

  it("colaborador con solo lectura de packs → operador", () => {
    expect(
      derivarPerfil({ role: "admin", tenantRole: "colaborador", permissions: { pack_cobranza: "read", conversations: "write" } }),
    ).toBe("operador");
  });

  it("colaborador con solo conversaciones y escalaciones → operador", () => {
    expect(
      derivarPerfil({
        role: "admin",
        tenantRole: "colaborador",
        permissions: { conversations: "read", escalations: "write", plan: null },
      }),
    ).toBe("operador");
  });

  it("escribir en una sección del core que no es de un pack no vuelve supervisor", () => {
    expect(derivarPerfil({ tenantRole: "colaborador", permissions: { settings: "write" } })).toBe("operador");
  });

  it("sin permisos → operador", () => {
    expect(derivarPerfil({ permissions: undefined })).toBe("operador");
  });
});

describe("packsConEscritura", () => {
  it("cuenta la sub-sección como el pack y no repite", () => {
    expect(
      packsConEscritura({ "pack_cobranza:resumen": "write", "pack_cobranza:pagos": "write", pack_commerce: "read" }),
    ).toEqual(["pack_cobranza"]);
  });
});
