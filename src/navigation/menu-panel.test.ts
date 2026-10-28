import {
  entradaDeDestino,
  gruposDeMenu,
  modulosVisibles,
  pestanasDeEntrada,
  seccionesDeMenu,
  tituloDeDestino,
} from "./menu-panel";

describe("menú del panel en la app (HU-DS-11, D-34; menú v2, HU-UX-11)", () => {
  it("dueño con todo: mismos grupos y entradas, en el orden del menú v2", () => {
    const grupos = gruposDeMenu({}, true, { dev: false });
    expect(grupos.map((g) => [g.label, g.entradas.map((e) => e.label)])).toEqual([
      ["Operación", ["Resumen", "Conversaciones", "Clientes"]],
      ["Tu asistente", ["Agentes", "Conexiones"]],
      ["Negocio", ["Agenda", "Ventas", "Cobranza", "Suscripciones"]],
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
    expect(cobranza.destino).toMatchObject({ modulo: "cobranza", pestana: "gestores", sub: "Equipo" });
  });

  it("Cobranza agrupa sus pestañas por jerarquía en 5 áreas, sin Cobros al propietario (HU-UX-12)", () => {
    const cobranza = gruposDeMenu({}, true, { dev: false })
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "cobranza")!;
    const porArea = Object.fromEntries(
      [...new Set(cobranza.pestanas.map((p) => p.sub))].map((sub) => [
        sub,
        cobranza.pestanas.filter((p) => p.sub === sub).map((p) => p.label),
      ]),
    );
    expect(porArea).toEqual({
      Resumen: ["Resumen"],
      Carteras: ["Carteras", "Clientes"],
      Actividad: ["Pagos", "Promesas", "Reportes"],
      Equipo: ["Gestores", "Dispositivos", "Alertas de acceso", "Auditoría"],
      Asistente: ["Monitoreo IA", "Reglas de negociación"],
    });
    expect(Object.keys(porArea)).toEqual(["Resumen", "Carteras", "Actividad", "Equipo", "Asistente"]);
    expect(cobranza.pestanas.every((p) => p.sub)).toBe(true);
    expect(cobranza.pestanas.map((p) => p.label.toLowerCase()).join(" ")).not.toContain("propietario");
    expect(cobranza.destino).toMatchObject({ pestana: "resumen" });
  });

  it("Agenda es una sola vista y se abre con `pack_calendar:citas` (HU-CAL-08)", () => {
    expect(seccionesDeMenu({ "pack_calendar:citas": "read" }, false, { dev: false })).toEqual([
      expect.objectContaining({ entrada: "agenda", modulo: "calendario", pestana: "agenda", grupo: "Negocio" }),
    ]);
    // Los ajustes ya no son entradas propias: viven dentro de Agenda.
    expect(seccionesDeMenu({ "pack_calendar:configuracion": "write" }, false, { dev: false })).toEqual([]);
    expect(seccionesDeMenu({ "pack_calendar:conexion": "write" }, false, { dev: false })).toEqual([]);
    expect(seccionesDeMenu({ "pack_calendar:bloqueos": "write" }, false, { dev: false })).toEqual([]);
  });

  it("Clientes es oculta pero conserva su clave RBAC y su destino; Pagos conserva `cobros`", () => {
    const cobranza = gruposDeMenu({}, true, { dev: false })
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "cobranza")!;
    expect(cobranza.pestanas.find((p) => p.pestana === "clientes")).toMatchObject({
      seccion: "pack_cobranza:clientes",
      oculta: true,
    });
    expect(cobranza.pestanas.find((p) => p.pestana === "pagos")).toMatchObject({ seccion: "pack_cobranza:cobros" });
    expect(cobranza.pestanas.filter((p) => !p.oculta)).toHaveLength(11);
    // Quien solo puede ver Clientes sigue entrando a Cobranza, directo a esa pestaña.
    const soloClientes = gruposDeMenu({ "pack_cobranza:clientes": "read" }, false, { dev: false })
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "cobranza")!;
    expect(soloClientes.destino).toMatchObject({ pestana: "clientes", sub: "Carteras" });
    expect(entradaDeDestino({}, true, { modulo: "cobranza", pestana: "clientes" })).toMatchObject({ id: "cobranza" });
  });

  it("pestanasDeEntrada lleva el área (`sub`) y la marca de oculta de Cobranza", () => {
    const cobranza = gruposDeMenu({}, true, { dev: false })
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "cobranza")!;
    const { pestanas } = pestanasDeEntrada(cobranza);
    expect(pestanas.find((p) => p.pestana === "alertas")).toEqual({
      tab: "cobranza",
      pestana: "alertas",
      label: "Alertas de acceso",
      sub: "Equipo",
    });
    expect(pestanas.find((p) => p.pestana === "clientes")).toEqual({
      tab: "cobranza",
      pestana: "clientes",
      label: "Clientes",
      sub: "Carteras",
      oculta: true,
    });
  });

  it("Agenda: una entrada y una pestaña, sin Google ni Bloqueos (HU-CAL-08)", () => {
    const agenda = gruposDeMenu({}, true, { dev: false })
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "agenda")!;
    expect(agenda.pestanas.map((p) => p.label)).toEqual(["Agenda"]);
    expect(agenda.destino).toMatchObject({ pestana: "agenda", seccion: "pack_calendar:citas" });
    expect(pestanasDeEntrada(agenda).pestanas).toEqual([
      { tab: "calendario", pestana: "agenda", label: "Agenda" },
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

  it("eliminar un negocio vive en Plataforma → Negocios: ninguna entrada abre la vieja pestaña Plan de Configuración", () => {
    const items = seccionesDeMenu({ plan: "write", settings: "write" }, true, { dev: false });
    expect(items.find((i) => i.entrada === "negocios")).toMatchObject({ modulo: "herramientas", pestana: "negocios" });
    expect(items.some((i) => i.modulo === "configuracion" && i.pestana === "plan")).toBe(false);
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
    ).toEqual(["inicio", "comercio", "agentes", "configuracion", "herramientas", "busqueda"]);
  });

  it("Agentes abre su propia pantalla (lista y asistente), con la clave de Ajustes", () => {
    expect(modulosVisibles({ settings: "write" }, false, { dev: false })).toContain("agentes");
    expect(modulosVisibles({ pack_commerce: "read" }, false, { dev: false })).not.toContain("agentes");
    expect(tituloDeDestino({ modulo: "agentes" })).toBe("Agentes");
  });

  it("el título del header es el de la entrada; sin pestaña, el del módulo", () => {
    expect(tituloDeDestino({ modulo: "configuracion", pestana: "colaboradores" })).toBe("Equipo");
    expect(tituloDeDestino({ modulo: "conversaciones", pestana: "playground" })).toBe("Agentes");
    expect(tituloDeDestino({ modulo: "herramientas", pestana: "fallos" })).toBe("Configuración");
    expect(tituloDeDestino({ modulo: "inicio" })).toBe("Resumen");
    expect(tituloDeDestino({ modulo: "configuracion" })).toBe("Configuración");
  });

  it("con la entrada explícita, el título es el de esa entrada", () => {
    expect(tituloDeDestino({ modulo: "configuracion", entrada: "conexiones" })).toBe("Conexiones");
    expect(tituloDeDestino({ modulo: "herramientas", pestana: "fallos", entrada: "configuracion" })).toBe(
      "Configuración",
    );
  });

  it("la entrada de un destino: la explícita, la que lo contiene o la primera del módulo", () => {
    const permisos = { collaborators: "read", settings: "write", leads: "read", conversations: "read" } as const;
    expect(entradaDeDestino(permisos, false, { modulo: "configuracion", entrada: "equipo" })?.id).toBe("equipo");
    expect(entradaDeDestino(permisos, false, { modulo: "conversaciones", pestana: "leads" })?.id).toBe("clientes");
    expect(entradaDeDestino(permisos, false, { modulo: "configuracion" })?.id).toBe("equipo");
    expect(entradaDeDestino(permisos, false, { modulo: "herramientas", pestana: "fallos" })?.id).toBe(
      "configuracion",
    );
    // Sin permiso en ninguna pestaña del módulo: sin entrada.
    expect(entradaDeDestino({ leads: "read" }, false, { modulo: "configuracion" })).toBeNull();
  });

  it("las pestañas de una entrada salen filtradas por permiso y sin repetir", () => {
    const [conexiones] = gruposDeMenu({ connections: "read" }, false, { dev: false })
      .flatMap((g) => g.entradas)
      .filter((e) => e.id === "conexiones");
    expect(pestanasDeEntrada(conexiones)).toEqual({
      id: "conexiones",
      pestanas: [{ tab: "configuracion", pestana: "conexiones", label: "Conexiones" }],
    });

    const configuracion = entradaDeDestino({ settings: "write" }, false, { modulo: "configuracion", entrada: "configuracion" });
    expect(pestanasDeEntrada(configuracion!).pestanas.map((p) => `${p.tab}/${p.pestana}`)).toEqual([
      "configuracion/ajustes",
      "herramientas/fallos",
      "configuracion/notificaciones",
    ]);

    // Agenda sin `pack_calendar:configuracion`: sin Horario.
    const agenda = entradaDeDestino({ "pack_calendar:citas": "read", "pack_calendar:tipos": "read" }, false, {
      modulo: "calendario",
    });
    expect(pestanasDeEntrada(agenda!).pestanas.map((p) => p.pestana)).toEqual(["agenda"]);
  });
});
