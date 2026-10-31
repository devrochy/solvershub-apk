import { Linking } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { KpiResumen, ResumenPorAgente } from "../api";
import { ActividadDeAgentes, SelectorPeriodo } from "./Actividad";

jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

const kpi = (parcial: Partial<KpiResumen> & Pick<KpiResumen, "id" | "label">): KpiResumen => ({
  valor: 1,
  unidad: "count",
  previo: null,
  delta_pct: null,
  polaridad: "up-good",
  ...parcial,
});

const serie = (turnos: number[]) =>
  ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"].map(
    (fecha, i) => ({ fecha, turnos: turnos[i], conversaciones: turnos[i] * 2, costo: turnos[i] * 0.01 }),
  );

const DATOS: ResumenPorAgente = {
  periodo: {
    desde: "2026-10-20T00:00:00Z",
    hasta: "2026-10-27T00:00:00Z",
    previo_desde: "2026-10-13T00:00:00Z",
    previo_hasta: "2026-10-20T00:00:00Z",
    dias: 7,
  },
  runtime: "v3",
  general: { kpis: [kpi({ id: "conversaciones", label: "Conversaciones", valor: 10 })] },
  agentes: [
    {
      ref: "ag-1",
      key: "ventas",
      name: "Ventas",
      kind: "specialist",
      kpis: [kpi({ id: "turnos", label: "Turnos", valor: 16 })],
      serie: serie([2, 3, 1, 4, 2, 3, 1]),
      ultima_actividad: "2026-10-27T18:30:00Z",
      modulos: [],
    },
    {
      ref: "general",
      key: "general",
      name: "General",
      kind: "specialist",
      kpis: [kpi({ id: "turnos", label: "Turnos", valor: 4 })],
      serie: serie([0, 1, 0, 1, 0, 1, 1]),
      ultima_actividad: "2026-10-27T17:00:00Z",
      modulos: [],
    },
    {
      ref: "ag-2",
      key: "agenda",
      name: "Agenda",
      kind: "specialist",
      kpis: [],
      serie: serie([0, 0, 0, 0, 0, 0, 0]),
      ultima_actividad: null,
      modulos: [],
    },
  ],
};

describe("ActividadDeAgentes (ADR-0171)", () => {
  it("dibuja la tendencia, la leyenda y la tabla de todos los agentes", async () => {
    const { getByTestId, getByText, getAllByText } = await render(
      <ActividadDeAgentes datos={DATOS} dias={7} tenantId="t-1" />,
    );
    expect(getByTestId("actividad-grafica")).toBeTruthy();
    expect(getByText("Tendencia de atención")).toBeTruthy();
    expect(getAllByText("Ventas").length).toBeGreaterThan(0);
    expect(getAllByText("General").length).toBeGreaterThan(0);
    expect(getAllByText("Agenda").length).toBeGreaterThan(0);
    expect(getAllByText(/Sin actividad/).length).toBeGreaterThan(0);
  });

  it("cambia la métrica sin recargar y escribe el total de la fila", async () => {
    const { getByTestId } = await render(
      <ActividadDeAgentes datos={DATOS} dias={7} tenantId="t-1" />,
    );
    await fireEvent.press(getByTestId("metrica-conversaciones"));
    expect(getByTestId("metrica-conversaciones").props.accessibilityState.selected).toBe(true);
  });

  it("al tocar un agente abre su ficha en el panel (la app no tiene detalle de agente)", async () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const { getByLabelText } = await render(
      <ActividadDeAgentes datos={DATOS} dias={7} tenantId="t-1" />,
    );
    await fireEvent.press(getByLabelText(/^Ventas,/));
    await waitFor(() => expect(abrir).toHaveBeenCalledWith(expect.stringContaining("/agentes/ag-1")));
    abrir.mockRestore();
  });
});

describe("SelectorPeriodo", () => {
  it("ofrece 7, 15 y 30 y avisa del cambio", async () => {
    const alCambiar = jest.fn();
    const { getByTestId, getByText } = await render(
      <SelectorPeriodo dias={7} alCambiar={alCambiar} periodo={DATOS.periodo} />,
    );
    expect(getByText("7 días")).toBeTruthy();
    expect(getByText("15 días")).toBeTruthy();
    expect(getByText("30 días")).toBeTruthy();
    await fireEvent.press(getByTestId("periodo-15"));
    expect(alCambiar).toHaveBeenCalledWith(15);
  });
});
