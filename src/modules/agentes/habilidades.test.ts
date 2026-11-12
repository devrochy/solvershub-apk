import type { AccionDeAgente } from "./api";
import { agruparAcciones, cuentaDelAgente, estadoDeHabilidad, nombreDeAccion, tituloDeGrupo } from "./habilidades";

const accion = (tool: string, group: string): AccionDeAgente => ({
  tool,
  group,
  pack_id: "pack_x",
  enabled: true,
  in_agent: true,
  max_calls_per_conversation: null,
  requires_confirmation: false,
});

describe("habilidades del agente (HU-AOS-66)", () => {
  it("agrupa en el orden de la app, con los grupos desconocidos antes de «Otras acciones»", () => {
    const grupos = agruparAcciones([
      accion("x_raro", "otras"),
      accion("check_availability", "citas"),
      accion("crear_pedido", "pedidos"),
      accion("nueva", "inventario"),
      accion("create_calendar_event", "citas"),
    ]);
    expect(grupos.map((g) => g.titulo)).toEqual(["Pedidos", "Citas", "Inventario", "Otras acciones"]);
    expect(grupos[1].acciones.map((a) => a.tool)).toEqual(["check_availability", "create_calendar_event"]);
  });

  it("nombra las acciones en lenguaje del dueño y, si no la conoce, en palabras", () => {
    expect(nombreDeAccion("create_calendar_event")).toBe("Agendar una cita");
    expect(nombreDeAccion("enviar_recordatorio_x")).toBe("Enviar recordatorio x");
    expect(tituloDeGrupo("promesas")).toBe("Promesas de pago");
  });

  it("estado de la habilidad y cuenta elegida", () => {
    const pagos = {
      pack_id: "pack_payments",
      installed: true,
      status: "active" as const,
      config: { cuenta_id: "c1" },
    };
    expect(estadoDeHabilidad(pagos)).toBe("lista");
    expect(estadoDeHabilidad({ ...pagos, status: "pending_config" })).toBe("falta_configurar");
    expect(estadoDeHabilidad({ ...pagos, installed: false, status: null })).toBe("sin_agregar");
    const cuenta = { id: "c1", name: "Tienda", sandbox: true } as never;
    expect(cuentaDelAgente(pagos, [cuenta])).toBe(cuenta);
    expect(cuentaDelAgente({ ...pagos, config: {} }, [cuenta])).toBeUndefined();
  });
});
