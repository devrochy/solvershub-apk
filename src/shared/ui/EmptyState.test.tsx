import { fireEvent, render, screen } from "@testing-library/react-native";
import { EmptyState } from "./EmptyState";

describe("EmptyState (kit)", () => {
  it("explica y ofrece la acción principal (y la secundaria)", async () => {
    const accion = jest.fn();
    const secundaria = jest.fn();
    await render(
      <EmptyState
        icon="people-outline"
        title="Aún no hay clientes"
        description="Registra el primero para empezar a cobrar."
        action={{ label: "Nuevo cliente", onPress: accion }}
        secondaryAction={{ label: "Importar", onPress: secundaria }}
      />,
    );

    expect(screen.getByRole("header", { name: "Aún no hay clientes" })).toBeTruthy();
    expect(screen.getByText("Registra el primero para empezar a cobrar.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Nuevo cliente" }));
    await fireEvent.press(screen.getByRole("button", { name: "Importar" }));
    expect(accion).toHaveBeenCalled();
    expect(secundaria).toHaveBeenCalled();
  });

  it("acepta solo la acción secundaria", async () => {
    await render(
      <EmptyState icon="inbox" title="Sin novedades" secondaryAction={{ label: "Actualizar", onPress: jest.fn() }} />,
    );
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeTruthy();
  });
});
