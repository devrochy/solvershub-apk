import type { AgenteResumen, KpiResumen, ResumenPorAgente } from "./api";
import {
  agentesConTarjeta,
  cifrasDelTitulo,
  esTarjetaDeAgente,
  llevaInsignia,
  modulosSinAgente,
} from "./resumenAgente";

const k = (id: string, valor: number | null, extra: Partial<KpiResumen> = {}): KpiResumen => ({
  id,
  label: id,
  valor,
  unidad: "count",
  previo: null,
  delta_pct: null,
  polaridad: "up-good",
  ...extra,
});

const agente = (parcial: Partial<AgenteResumen>): AgenteResumen => ({
  ref: "x",
  key: "x",
  name: "X",
  kind: "specialist",
  kpis: [],
  modulos: [],
  serie: [],
  ultima_actividad: null,
  ...parcial,
});

describe("resumen por agente (APK)", () => {
  it("el Coordinador no es tarjeta; cualquier especialista sí", () => {
    expect(esTarjetaDeAgente(agente({ key: "coordinador", kind: "core" }))).toBe(false);
    expect(esTarjetaDeAgente(agente({ key: "ventas" }))).toBe(true);
  });

  it("solo el back-office lleva insignia", () => {
    expect(llevaInsignia(agente({ kind: "backoffice" }))).toBe(true);
    expect(llevaInsignia(agente({ kind: "specialist" }))).toBe(false);
  });

  it("separa las tarjetas y los módulos sin agente (del bloque del negocio, ADR-0192)", () => {
    const huerfano = { id: "pack_calendar", nombre: "Agenda", kpis: [], error: null };
    const datos = {
      general: { kpis: [], serie: [], modulos_sin_agente: [huerfano] },
      agentes: [agente({ key: "coordinador", kind: "core" }), agente({ key: "ventas" })],
    } as unknown as ResumenPorAgente;
    expect(agentesConTarjeta(datos).map((a) => a.key)).toEqual(["ventas"]);
    expect(modulosSinAgente(datos)).toEqual([huerfano]);
  });

  it("el título plegado muestra las dos cifras del módulo, en el orden definido", () => {
    const a = agente({
      kpis: [k("turnos", 60)],
      modulos: [
        {
          id: "pack_commerce",
          nombre: "Ventas",
          error: null,
          kpis: [k("pedidos", 2), k("clientes_nuevos", 1), k("ventas_pagadas", 1500, { unidad: "money" })],
        },
      ],
    });
    expect(cifrasDelTitulo(a).map((c) => c.id)).toEqual(["ventas_pagadas", "pedidos"]);
  });

  it("sin módulo usa la actividad; con el módulo caído también", () => {
    const base = { kpis: [k("conversaciones", 4), k("turnos", 9), k("tareas_abiertas", 1)] };
    expect(cifrasDelTitulo(agente(base)).map((c) => c.id)).toEqual(["turnos", "conversaciones"]);
    const caido = agente({ ...base, modulos: [{ id: "pack_cobranza", nombre: "Cobranza", kpis: [], error: "falló" }] });
    expect(cifrasDelTitulo(caido).map((c) => c.id)).toEqual(["turnos", "conversaciones"]);
  });

  it("un módulo desconocido muestra sus dos primeras cifras; un valor sin datos, un guion", () => {
    const a = agente({ modulos: [{ id: "pack_nuevo", nombre: "Nuevo", error: null, kpis: [k("a", 1), k("b", 2), k("c", 3)] }] });
    expect(cifrasDelTitulo(a).map((c) => c.id)).toEqual(["a", "b"]);
    expect(cifrasDelTitulo(agente({ kpis: [k("turnos", null)] }))[0].valor).toBe("—");
  });
});
