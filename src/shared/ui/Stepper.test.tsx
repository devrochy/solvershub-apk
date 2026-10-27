import { render, screen } from "@testing-library/react-native";
import { shTheme } from "@core/theme/tokens";
import { pasoActual, Stepper, textoPaso, type StepItem } from "./Stepper";

const PASOS: StepItem[] = [
  { id: "negocio", title: "Tu negocio", state: "complete" },
  { id: "canal", title: "Canal", state: "current" },
  { id: "horario", title: "Horario", state: "upcoming" },
  { id: "tono", title: "Tono", state: "upcoming" },
];

describe("Stepper (kit)", () => {
  it("dice «Paso X de N» y el título del paso activo", async () => {
    await render(<Stepper label="Crear agente" steps={PASOS} />);
    expect(screen.getByText("Paso 2 de 4")).toBeTruthy();
    expect(screen.getByText("Canal")).toBeTruthy();
  });

  it("es un solo elemento accesible con el paso actual en el nombre y el valor", async () => {
    await render(<Stepper label="Crear agente" steps={PASOS} />);
    const indicador = screen.getByRole("progressbar", { name: "Crear agente. Paso 2 de 4: Canal" });
    expect(indicador.props.accessibilityValue).toEqual({ min: 1, max: 4, now: 2 });
  });

  it("completo lleva palomita; activo y pendientes, su número", async () => {
    await render(<Stepper label="Crear agente" steps={PASOS} testID="st" />);
    expect(screen.getByTestId("icono-check")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.queryByText("1")).toBeNull();
  });

  it("con error: ícono, aviso en texto con el número del paso y color de peligro", async () => {
    const pasos: StepItem[] = [
      { id: "a", title: "Uno", state: "complete" },
      { id: "b", title: "Dos", state: "error" },
      { id: "c", title: "Tres", state: "current" },
    ];
    await render(<Stepper label="Crear agente" steps={pasos} testID="st" />);
    expect(screen.getByTestId("icono-priority-high")).toBeTruthy();
    expect(screen.getByText("Revisa el paso 2")).toHaveStyle({ color: shTheme.light.statusDangerFg });
    expect(screen.getByTestId("st-b")).toHaveStyle({ borderColor: shTheme.light.statusDangerFg });
    expect(
      screen.getByRole("progressbar", { name: "Crear agente. Paso 3 de 3: Tres. Revisa el paso 2" }),
    ).toBeTruthy();
  });

  it("varios errores se listan en plural", async () => {
    const pasos: StepItem[] = [
      { id: "a", title: "Uno", state: "error" },
      { id: "b", title: "Dos", state: "error" },
      { id: "c", title: "Tres", state: "error" },
      { id: "d", title: "Cuatro", state: "current" },
    ];
    await render(<Stepper label="Crear agente" steps={pasos} />);
    expect(screen.getByText("Revisa los pasos 1, 2 y 3")).toBeTruthy();
  });

  it("el paso activo lleva borde de foco", async () => {
    await render(<Stepper label="Crear agente" steps={PASOS} testID="st" />);
    expect(screen.getByTestId("st-canal")).toHaveStyle({ borderColor: shTheme.light.focus });
  });

  it("sin paso 'current' el activo es el primero sin completar; todo completo, el último", () => {
    const sinActual: StepItem[] = [
      { id: "a", title: "Uno", state: "complete" },
      { id: "b", title: "Dos", state: "upcoming" },
    ];
    expect(pasoActual(sinActual)).toBe(2);
    expect(textoPaso(sinActual)).toBe("Paso 2 de 2");
    expect(pasoActual(sinActual.map((s) => ({ ...s, state: "complete" as const })))).toBe(2);
  });

  it("acepta 10 pasos (el máximo del asistente)", async () => {
    const diez: StepItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i + 1}`,
      title: `Paso ${i + 1}`,
      state: i < 4 ? "complete" : i === 4 ? "current" : "upcoming",
    }));
    await render(<Stepper label="Crear agente" steps={diez} testID="st" />);
    expect(screen.getByText("Paso 5 de 10")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
  });

  it("sin pasos no pinta nada", async () => {
    await render(<Stepper label="Crear agente" steps={[]} testID="st" />);
    expect(screen.queryByTestId("st")).toBeNull();
  });
});
