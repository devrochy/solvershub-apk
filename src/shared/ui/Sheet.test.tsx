import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { Sheet } from "./Sheet";
import { areaTactil } from "./test-utils";

describe("Sheet (kit)", () => {
  it("muestra asa, título, contenido y un cerrar accesible de 48 dp", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible title="Registrar pago" description="Cuota 3 de 12" onClose={onClose}>
        <Text>Formulario</Text>
      </Sheet>,
    );

    expect(screen.getByTestId("sheet-asa", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Registrar pago" })).toBeTruthy();
    expect(screen.getByText("Cuota 3 de 12")).toBeTruthy();
    expect(screen.getByText("Formulario")).toBeTruthy();

    const cerrar = screen.getByRole("button", { name: "Cerrar" });
    expect(areaTactil(cerrar).alto).toBeGreaterThanOrEqual(48);
    await fireEvent.press(cerrar);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("el back de Android (onRequestClose) cierra la hoja", async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible title="Nota" onClose={onClose} testID="hoja">
        <Text>Cuerpo</Text>
      </Sheet>,
    );
    await fireEvent(screen.getByTestId("hoja-modal"), "requestClose");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no renderiza contenido si no está visible", async () => {
    await render(
      <Sheet visible={false} title="Nota" onClose={jest.fn()}>
        <Text>Cuerpo</Text>
      </Sheet>,
    );
    expect(screen.queryByText("Cuerpo")).toBeNull();
  });

  it("pinta el pie (acciones) cuando se pasa", async () => {
    await render(
      <Sheet visible title="Nota" onClose={jest.fn()} footer={<Text>Acciones</Text>}>
        <Text>Cuerpo</Text>
      </Sheet>,
    );
    expect(screen.getByText("Acciones")).toBeTruthy();
  });
});
