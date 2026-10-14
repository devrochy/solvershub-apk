import { gruposDeMenu, modulosVisibles, seccionesDeMenu } from "./menu-panel";

describe("menú del panel en la app (HU-DS-11, D-34)", () => {
  it("dueño con cobranza parcial solo ve las secciones de sus permisos", () => {
    const items = seccionesDeMenu({ "pack_cobranza:clientes": "read", plan: "read" }, false, { dev: false });
    const secciones = items.map((i) => i.seccion);
    expect(secciones).toContain("pack_cobranza:clientes");
    expect(secciones).toContain("plan");
    expect(secciones).not.toContain("pack_cobranza:carteras");
    expect(secciones).not.toContain("tenants");
    // Cada sección apunta al módulo y a la pestaña interna real de la app.
    expect(items.find((i) => i.seccion === "pack_cobranza:clientes")).toMatchObject({
      modulo: "cobranza",
      pestana: "clientes",
      grupo: "Cobranza",
    });
    expect(items.find((i) => i.seccion === "plan")).toMatchObject({ modulo: "negocio", pestana: "plan" });
    // Buscar aparece con cualquier permiso.
    expect(items.find((i) => i.modulo === "busqueda")).toBeTruthy();
  });

  it("master ve plataforma aunque no tenga permisos", () => {
    const items = seccionesDeMenu({}, true, { dev: false });
    expect(items.map((i) => i.seccion)).toContain("tenants");
  });

  it("no-master nunca ve plataforma", () => {
    const items = seccionesDeMenu({ tenants: "write" }, false, { dev: false });
    expect(items.map((i) => i.seccion)).not.toContain("tenants");
  });

  it("sin permisos y sin master el menú queda vacío", () => {
    expect(seccionesDeMenu({}, false, { dev: false })).toEqual([]);
    expect(modulosVisibles({}, false, { dev: false })).toEqual([]);
  });

  it("en desarrollo aparece el grupo Desarrollo con el Catálogo de UI", () => {
    const grupos = gruposDeMenu({}, false, { dev: true });
    expect(grupos.map((g) => g.id)).toEqual(["desarrollo"]);
    expect(grupos[0].items[0]).toMatchObject({ modulo: "catalogo", label: "Catálogo de UI" });
  });

  it("agrupa como el sidebar del panel y marca los packs no habilitados", () => {
    const grupos = gruposDeMenu(
      { dashboard: "read", "pack_cobranza:resumen": "read", pack_commerce: "read", settings: "write" },
      false,
      { dev: false, packs: { pack_commerce: false } },
    );
    expect(grupos.map((g) => g.id)).toEqual(["operacion", "pack_cobranza", "pack_commerce", "configuracion", "herramientas"]);
    expect(grupos.find((g) => g.id === "pack_commerce")?.bloqueado).toBe(true);
    expect(grupos.find((g) => g.id === "pack_cobranza")?.bloqueado).toBe(false);
    // Un permiso con `null` oculta la sección.
    expect(gruposDeMenu({ dashboard: null }, false, { dev: false })).toEqual([]);
  });

  it("los módulos visibles salen en el orden fijo del shell", () => {
    expect(
      modulosVisibles({ settings: "write", pack_commerce: "read", dashboard: "read" }, false, { dev: false }),
    ).toEqual(["inicio", "comercio", "configuracion", "herramientas", "busqueda"]);
  });
});
