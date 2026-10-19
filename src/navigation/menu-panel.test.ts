import { gruposDeMenu, modulosVisibles, seccionesDeMenu, tituloDeDestino } from "./menu-panel";

describe("menú del panel en la app (HU-DS-11, D-34; menú v2, HU-UX-11)", () => {
  it("dueño con todo: mismos grupos y entradas, en el orden del menú v2", () => {
    const grupos = gruposDeMenu({}, true, { dev: false });
    expect(grupos.map((g) => [g.label, g.entradas.map((e) => e.label)])).toEqual([
      ["Operación", ["Resumen", "Conversaciones", "Clientes"]],
      ["Tu asistente", ["Agentes", "Conexiones"]],
      ["Negocio", ["Agenda", "Ventas", "Cobranza"]],
      ["Cuenta", ["Consumo y plan", "Equipo", "Configuración"]],
      ["Plataforma", ["Negocios"]],
    ]);
    // Sin el módulo Herramientas: sus secciones viven en Configuración y Plataforma.
    expect(grupos.map((g) => g.label)).not.toContain("Herramientas");
  });

  it("una entrada se ve con permiso en al menos una de sus pestañas y abre la primera permitida", () => {
    const grupos = gruposDeMenu({ escalations: "read", "pack_cobranza:gestores": "write" }, false, { dev: false });
    const entradas = grupos.flatMap((g) => g.entradas);
    expect(entradas.map((e) => e.id)).toEqual(["conversaciones", "cobranza"]);

    const conversaciones = entradas.find((e) => e.id === "conversaciones")!;
    expect(conversaciones.pestanas.map((p) => p.label)).toEqual(["Escalaciones"]);
    expect(conversaciones.destino).toMatchObject({ modulo: "conversaciones", pestana: "escalaciones" });

    const cobranza = entradas.find((e) => e.id === "cobranza")!;
    expect(cobranza.destino).toMatchObject({ modulo: "cobranza", pestana: "gestores", sub: "Operación" });
  });

  it("Cobranza agrupa sus pestañas en Operación, Monitoreo y Seguridad", () => {
    const cobranza = gruposDeMenu({}, true, { dev: false })
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "cobranza")!;
    expect([...new Set(cobranza.pestanas.flatMap((p) => (p.sub ? [p.sub] : [])))]).toEqual([
      "Operación",
      "Monitoreo",
      "Seguridad",
    ]);
    expect(cobranza.destino).toMatchObject({ pestana: "resumen" });
  });

  it("Agenda usa `pack_calendar:configuracion` para el Horario", () => {
    const items = seccionesDeMenu({ "pack_calendar:configuracion": "write" }, false, { dev: false });
    expect(items).toEqual([
      expect.objectContaining({ entrada: "agenda", modulo: "calendario", pestana: "horario", grupo: "Negocio" }),
    ]);
    expect(seccionesDeMenu({ "pack_calendar:conexion": "write" }, false, { dev: false })).toEqual([
      expect.objectContaining({ entrada: "agenda", label: "Google Calendar", pestana: "conexion" }),
    ]);
  });

  it("Configuración absorbe Mensajes fallidos; Equipo es Colaboradores", () => {
    const items = seccionesDeMenu({ settings: "write", collaborators: "read" }, false, { dev: false });
    expect(items.filter((i) => i.entrada === "configuracion").map((i) => [i.modulo, i.pestana])).toEqual([
      ["configuracion", "ajustes"],
      ["herramientas", "fallos"],
      ["configuracion", "notificaciones"],
    ]);
    expect(items.find((i) => i.entrada === "equipo")).toMatchObject({ modulo: "configuracion", pestana: "colaboradores" });
  });

  it("master ve Plataforma aunque no tenga permisos; un no-master nunca", () => {
    expect(seccionesDeMenu({}, true, { dev: false }).map((i) => i.seccion)).toContain("tenants");
    expect(seccionesDeMenu({ tenants: "write" }, false, { dev: false }).map((i) => i.seccion)).not.toContain("tenants");
  });

  it("sin permisos y sin master el menú queda vacío", () => {
    expect(seccionesDeMenu({}, false, { dev: false })).toEqual([]);
    expect(modulosVisibles({}, false, { dev: false })).toEqual([]);
    // Un permiso con `null` oculta la sección.
    expect(gruposDeMenu({ dashboard: null }, false, { dev: false })).toEqual([]);
  });

  it("en desarrollo aparece el grupo Desarrollo con el Catálogo de UI", () => {
    const grupos = gruposDeMenu({}, false, { dev: true });
    expect(grupos.map((g) => g.id)).toEqual(["desarrollo"]);
    expect(grupos[0].entradas[0]).toMatchObject({ id: "catalogo", destino: { modulo: "catalogo" } });
  });

  it("el candado de un pack no habilitado va por entrada", () => {
    const grupos = gruposDeMenu(
      { dashboard: "read", "pack_cobranza:resumen": "read", pack_commerce: "read" },
      false,
      { dev: false, packs: { pack_commerce: false } },
    );
    const negocio = grupos.find((g) => g.id === "negocio")!;
    expect(negocio.entradas.map((e) => [e.id, e.bloqueado])).toEqual([
      ["ventas", true],
      ["cobranza", false],
    ]);
  });

  it("los módulos visibles salen en el orden fijo del shell, con la Búsqueda", () => {
    expect(
      modulosVisibles({ settings: "write", pack_commerce: "read", dashboard: "read" }, false, { dev: false }),
    ).toEqual(["inicio", "comercio", "configuracion", "herramientas", "busqueda"]);
  });

  it("el título del header es el de la entrada; sin pestaña, el del módulo", () => {
    expect(tituloDeDestino({ modulo: "configuracion", pestana: "colaboradores" })).toBe("Equipo");
    expect(tituloDeDestino({ modulo: "conversaciones", pestana: "playground" })).toBe("Agentes");
    expect(tituloDeDestino({ modulo: "herramientas", pestana: "fallos" })).toBe("Configuración");
    expect(tituloDeDestino({ modulo: "inicio" })).toBe("Resumen");
    expect(tituloDeDestino({ modulo: "configuracion" })).toBe("Configuración");
  });
});
