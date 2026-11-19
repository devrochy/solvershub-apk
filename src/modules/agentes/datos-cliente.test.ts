import {
  agruparPorModulo,
  alPorDefecto,
  cambiosFrenteAPorDefecto,
  conCuantoPregunta,
  conMetodo,
  conNivel,
  cuantoPreguntaActual,
  cuerpoParaGuardar,
  esUltimoMetodo,
  estaAjustada,
  estadoInicial,
  hayCambios,
  mensajeDeErrorAlGuardar,
  metodosIniciales,
  nombreModulo,
  opcionesDeCuantoPregunta,
  pistaDePiso,
  pistaDePorDefecto,
  restablecida,
  resumenDeAccion,
  resumenDeCuantoPregunta,
  resumenDeDatosCliente,
  tieneVentas,
  type PoliticaDatos,
} from "./datos-cliente";

// Mismo fixture que `politicaDatosCliente` del panel (lib/testing/fixtures.ts).
const politica: PoliticaDatos = {
  agente_id: "11111111-1111-1111-1111-111111111111",
  niveles: ["requerido", "recomendado", "no_pedir"],
  herramientas_del_agente: false,
  acciones: [
    {
      id: "ventas.crear_pedido",
      modulo: "ventas",
      etiqueta: "Crear un pedido",
      campos: [
        {
          clave: "nombre",
          etiqueta: "Nombre",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: true,
          ajustado: false,
        },
        {
          clave: "direccion",
          etiqueta: "Dirección de entrega",
          nivel: "recomendado",
          por_defecto: "requerido",
          ajustable: true,
          ajustado: true,
        },
      ],
    },
    {
      id: "agenda.agendar_cita",
      modulo: "agenda",
      etiqueta: "Agendar una cita",
      campos: [
        {
          clave: "nombre",
          etiqueta: "Nombre",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: true,
          ajustado: false,
        },
        {
          clave: "correo",
          etiqueta: "Correo electrónico",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: false,
          ajustado: false,
        },
      ],
    },
  ],
  procedimientos: [],
};

describe("estado y cambios", () => {
  it("parte de los niveles que trae el servidor, sin cambios", () => {
    const estado = estadoInicial(politica);
    expect(estado["ventas.crear_pedido"]).toEqual({
      nombre: "requerido",
      direccion: "recomendado",
    });
    expect(hayCambios(politica, estado)).toBe(false);
  });

  it("no deja cambiar lo que exige el sistema ni datos que no existen", () => {
    const inicial = estadoInicial(politica);
    expect(conNivel(politica, inicial, "agenda.agendar_cita", "correo", "no_pedir")).toBe(inicial);
    expect(conNivel(politica, inicial, "agenda.agendar_cita", "otro", "no_pedir")).toBe(inicial);
    expect(conNivel(politica, inicial, "no.existe", "nombre", "no_pedir")).toBe(inicial);
    expect(hayCambios(politica, conNivel(politica, inicial, "ventas.crear_pedido", "nombre", "no_pedir"))).toBe(true);
  });

  it("restablecer deja los valores por defecto sin tocar lo que no es ajustable", () => {
    const estado = restablecida(politica, estadoInicial(politica), "ventas.crear_pedido");
    expect(estado["ventas.crear_pedido"]).toEqual({
      nombre: "requerido",
      direccion: "requerido",
    });
    expect(estaAjustada(politica, estadoInicial(politica), "ventas.crear_pedido")).toBe(true);
    expect(estaAjustada(politica, estado, "ventas.crear_pedido")).toBe(false);
    expect(restablecida(politica, estadoInicial(politica), "agenda.agendar_cita")["agenda.agendar_cita"].correo).toBe(
      "requerido",
    );
  });
});

describe("cuerpo del PUT", () => {
  it("manda todas las acciones, solo con lo que difiere del valor por defecto", () => {
    expect(cuerpoParaGuardar(politica, estadoInicial(politica))).toEqual({
      politica: {
        "ventas.crear_pedido": { direccion: "recomendado" },
        "agenda.agendar_cita": {},
      },
    });
  });

  it("una acción en lo recomendado va vacía y los datos del sistema nunca se envían", () => {
    let estado = alPorDefecto(politica, estadoInicial(politica));
    estado = conNivel(politica, estado, "agenda.agendar_cita", "nombre", "recomendado");
    const { politica: cuerpo } = cuerpoParaGuardar(politica, estado);
    expect(cuerpo["ventas.crear_pedido"]).toEqual({});
    expect(cuerpo["agenda.agendar_cita"]).toEqual({ nombre: "recomendado" });
    expect(JSON.stringify(cuerpo)).not.toContain("correo");
  });
});

describe("textos y agrupación", () => {
  it("nombra los módulos de forma legible", () => {
    expect(nombreModulo("ventas")).toBe("Ventas");
    expect(nombreModulo("pack_nuevo")).toBe("Pack nuevo");
    expect(nombreModulo("")).toBe("Otros");
  });

  it("agrupa por módulo conservando el orden y sabe si cierra pedidos", () => {
    const grupos = agruparPorModulo([
      ...politica.acciones,
      {
        id: "ventas.cotizar",
        modulo: "ventas",
        etiqueta: "Cotizar",
        campos: [],
      },
    ]);
    expect(grupos.map((g) => [g.nombre, g.acciones.map((a) => a.id)])).toEqual([
      ["Ventas", ["ventas.crear_pedido", "ventas.cotizar"]],
      ["Agenda", ["agenda.agendar_cita"]],
    ]);
    expect(tieneVentas(politica)).toBe(true);
    expect(tieneVentas({ ...politica, acciones: [politica.acciones[1]] })).toBe(false);
  });

  it("la pista del valor por defecto solo aparece cuando difiere; el piso dice para qué se necesita", () => {
    const direccion = politica.acciones[0].campos[1];
    expect(pistaDePorDefecto(direccion, "recomendado")).toBe("Por defecto: Requerido.");
    expect(pistaDePorDefecto(direccion, "requerido")).toBeNull();
    expect(pistaDePiso({ etiqueta: "Agendar una cita" })).toBe("Necesario para agendar una cita.");
    expect(pistaDePiso({ etiqueta: " " })).toBe("Necesario para esta operación.");
  });

  it("resume una operación plegada por sus requeridos", () => {
    const estado = estadoInicial(politica);
    expect(resumenDeAccion(politica.acciones[1], estado)).toBe("2 requeridos");
    expect(resumenDeAccion(politica.acciones[0], estado)).toBe("1 requerido");
    const nada = conNivel(politica, estado, "ventas.crear_pedido", "nombre", "no_pedir");
    expect(resumenDeAccion(politica.acciones[0], nada)).toBe("Ningún dato requerido");
  });

  it("explica los errores al guardar sin jerga", () => {
    expect(mensajeDeErrorAlGuardar(403)).toMatch(/permiso/);
    expect(mensajeDeErrorAlGuardar(422)).toMatch(/vuelve a abrir/);
    expect(mensajeDeErrorAlGuardar(422, "Deja al menos un tipo de pedido.")).toBe("Deja al menos un tipo de pedido.");
    expect(mensajeDeErrorAlGuardar(500)).toMatch(/No se pudieron guardar/);
  });
});

describe("Tipos de pedido", () => {
  it("sin métodos del servidor parte de los dos", () => {
    expect(metodosIniciales({ ...politica, metodos_entrega: undefined })).toEqual(["domicilio", "recoger_en_tienda"]);
    expect(metodosIniciales({ ...politica, metodos_entrega: ["recoger_en_tienda"] })).toEqual(["recoger_en_tienda"]);
  });

  it("apaga y enciende en el orden de siempre; el último encendido no se apaga", () => {
    const solo = conMetodo(["domicilio", "recoger_en_tienda"], "domicilio", false);
    expect(solo).toEqual(["recoger_en_tienda"]);
    expect(esUltimoMetodo(solo, "recoger_en_tienda")).toBe(true);
    expect(esUltimoMetodo(solo, "domicilio")).toBe(false);
    expect(conMetodo(solo, "recoger_en_tienda", false)).toEqual(["recoger_en_tienda"]);
    expect(conMetodo(solo, "domicilio", true)).toEqual(["domicilio", "recoger_en_tienda"]);
    expect(conMetodo(solo, "domicilio", false)).toEqual(["recoger_en_tienda"]);
  });
});

// «Cuánto pregunta» (Lo mínimo, Lo justo, Completo). «Lo justo» = `por_defecto` de cada dato.
const politicaCita: PoliticaDatos = {
  ...politica,
  acciones: [
    {
      id: "agenda.agendar_cita",
      modulo: "agenda",
      etiqueta: "Agendar una cita",
      campos: [
        {
          clave: "nombre",
          etiqueta: "Nombre completo",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: true,
          ajustado: false,
        },
        {
          clave: "correo",
          etiqueta: "Correo",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: false,
          ajustado: false,
        },
        {
          clave: "fecha",
          etiqueta: "Fecha del evento",
          nivel: "recomendado",
          por_defecto: "recomendado",
          ajustable: true,
          ajustado: false,
        },
        {
          clave: "invitados",
          etiqueta: "Número de invitados",
          nivel: "no_pedir",
          por_defecto: "no_pedir",
          ajustable: true,
          ajustado: false,
        },
      ],
    },
  ],
};
const CITA = "agenda.agendar_cita";

describe("Cuánto pregunta", () => {
  it("«Lo justo» coincide dato por dato con el por_defecto y viene elegido", () => {
    const estado = estadoInicial(politicaCita);
    expect(cuantoPreguntaActual(politicaCita, estado)).toBe("justo");
    expect(cambiosFrenteAPorDefecto(politicaCita, estado)).toBe(0);
    expect(resumenDeDatosCliente(politicaCita, estado)).toBe("«Lo justo»");
    expect(resumenDeDatosCliente(null, estado)).toBe("Sin cargar");
  });

  it("«Completo» sube a requerido los ajustables y «Usar lo recomendado» los devuelve", () => {
    const completo = conCuantoPregunta(politicaCita, estadoInicial(politicaCita), "completo");
    expect(completo[CITA]).toEqual({
      nombre: "requerido",
      correo: "requerido",
      fecha: "requerido",
      invitados: "requerido",
    });
    expect(cuantoPreguntaActual(politicaCita, completo)).toBe("completo");
    expect(cambiosFrenteAPorDefecto(politicaCita, completo)).toBe(2);
    expect(alPorDefecto(politicaCita, completo)).toEqual(estadoInicial(politicaCita));
  });

  it("«Lo mínimo» deja lo requerido por defecto y los pisos técnicos, que nunca bajan", () => {
    const minimo = conCuantoPregunta(politicaCita, estadoInicial(politicaCita), "minimo");
    expect(minimo[CITA]).toEqual({
      nombre: "requerido",
      correo: "requerido",
      fecha: "no_pedir",
      invitados: "no_pedir",
    });
    expect(conNivel(politicaCita, minimo, CITA, "correo", "no_pedir")[CITA].correo).toBe("requerido");
    expect(cuerpoParaGuardar(politicaCita, minimo).politica[CITA]).toEqual({
      fecha: "no_pedir",
    });
  });

  it("un ajuste a mano es «A tu medida»; los niveles que no separan nada no se ofrecen", () => {
    const amano = conNivel(politicaCita, estadoInicial(politicaCita), CITA, "invitados", "recomendado");
    expect(cuantoPreguntaActual(politicaCita, amano)).toBeNull();
    expect(resumenDeDatosCliente(politicaCita, amano)).toBe("A tu medida");
    expect(opcionesDeCuantoPregunta(politicaCita)).toEqual(["minimo", "justo", "completo"]);
    expect(opcionesDeCuantoPregunta(politica)).toEqual(["justo"]);
  });

  it("resume qué pide cada nivel", () => {
    expect(resumenDeCuantoPregunta(politicaCita, "minimo")).toBe("Pide nombre completo y correo.");
    expect(resumenDeCuantoPregunta(politicaCita, "completo")).toBe(
      "Pide nombre completo, correo, fecha del evento y 1 más.",
    );
    expect(resumenDeCuantoPregunta({ ...politicaCita, acciones: [] }, "justo")).toBe("No pide datos.");
  });
});
