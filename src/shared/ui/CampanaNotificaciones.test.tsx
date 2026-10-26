import { fireEvent, render, screen } from "@testing-library/react-native";
import { CampanaNotificaciones, textoContador } from "./CampanaNotificaciones";
import { areaTactil } from "./test-utils";

describe("CampanaNotificaciones (ADR-0167)", () => {
  it("sin no leídas: sin globo y nombre simple", async () => {
    await render(<CampanaNotificaciones noLeidas={0} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeTruthy();
    expect(screen.queryByTestId("campana-notificaciones-globo")).toBeNull();
  });

  it("con no leídas: el nombre accesible lleva el número y el globo se ve", async () => {
    await render(<CampanaNotificaciones noLeidas={3} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Notificaciones, 3 sin leer" })).toBeTruthy();
    expect(screen.getByTestId("campana-notificaciones-globo", { includeHiddenElements: true })).toBeTruthy();
  });

  it("tope 99+ y área táctil de 48 dp", async () => {
    expect(textoContador(250)).toBe("99+");
    const onPress = jest.fn();
    await render(<CampanaNotificaciones noLeidas={120} onPress={onPress} />);
    const boton = screen.getByRole("button", { name: "Notificaciones, 99+ sin leer" });
    expect(areaTactil(boton).alto).toBeGreaterThanOrEqual(48);
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
