import { fireEvent, render } from "@testing-library/react-native";
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
  it("dibuja la evolución diaria con su leyenda y ya no la tabla por agente", async () => {
    const { getByTestId, getByText, queryByText } = await render(<ActividadDeAgentes datos={DATOS} dias={7} />);
    expect(getByTestId("actividad-grafica")).toBeTruthy();
    expect(getByText("Evolución diaria")).toBeTruthy();
    // Solo los agentes con actividad entran en la leyenda; la tabla pasó a las tarjetas de «Agentes».
    expect(getByText("Ventas")).toBeTruthy();
    expect(getByText("General")).toBeTruthy();
    expect(queryByText("Agenda")).toBeNull();
    expect(queryByText("Actividad por agente")).toBeNull();
  });

  it("cambia la métrica sin recargar", async () => {
    const { getByTestId } = await render(<ActividadDeAgentes datos={DATOS} dias={7} />);
    await fireEvent.press(getByTestId("metrica-conversaciones"));
    expect(getByTestId("metrica-conversaciones").props.accessibilityState.selected).toBe(true);
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
