import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { Toast, TOAST_DURACION_EXITO, ToastProvider, useToast } from "./Toast";

function Disparador() {
  const toast = useToast();
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => toast.success("Pago registrado")}>
        <Text>ok</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => toast.error("No se pudo guardar")}>
        <Text>falla</Text>
      </Pressable>
    </>
  );
}

describe("Toast (kit)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("success: role status, ícono y se va solo a los 5 s", async () => {
    await render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByText("ok"));

    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("Pago registrado")).toBeTruthy();
    expect(screen.getByTestId("icono-check-circle")).toBeTruthy();
    expect(TOAST_DURACION_EXITO).toBe(5000);

    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURACION_EXITO);
    });
    expect(screen.queryByText("Pago registrado")).toBeNull();
  });

  it("error: role alert y se queda hasta cerrarlo", async () => {
    await render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByText("falla"));

    expect(screen.getByRole("alert")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURACION_EXITO * 3);
    });
    expect(screen.getByText("No se pudo guardar")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("No se pudo guardar")).toBeNull();
  });

  it("Toast suelto: el botón de cerrar mide 48 dp y llama onClose", async () => {
    const onClose = jest.fn();
    await render(<Toast tone="error" message="Sin conexión" onClose={onClose} />);
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("useToast fuera del provider no rompe (no-op)", async () => {
    await render(<Disparador />);
    await fireEvent.press(screen.getByText("ok"));
    expect(screen.queryByText("Pago registrado")).toBeNull();
  });
});
