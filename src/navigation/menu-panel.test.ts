import { seccionesDeMenu } from "./PanelShell";

describe("seccionesDeMenu (HU-APP-03)", () => {
  it("dueño con cobranza parcial solo ve las secciones de sus permisos", () => {
    const items = seccionesDeMenu(
      { "pack_cobranza:clientes": "read", plan: "read" },
      false,
    );
    const secciones = items.map((i) => i.seccion);
    expect(secciones).toContain("pack_cobranza:clientes");
    expect(secciones).toContain("plan");
    expect(secciones).not.toContain("pack_cobranza:carteras");
    expect(secciones).not.toContain("tenants");
  });

  it("master ve plataforma aunque no tenga permisos", () => {
    const items = seccionesDeMenu({}, true);
    expect(items.map((i) => i.seccion)).toContain("tenants");
  });

  it("no-master nunca ve plataforma", () => {
    const items = seccionesDeMenu({ tenants: "write" }, false);
    expect(items.map((i) => i.seccion)).not.toContain("tenants");
  });

  it("sin permisos y sin master el menú queda vacío", () => {
    expect(seccionesDeMenu({}, false)).toEqual([]);
  });
});
