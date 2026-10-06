import { fireEvent, render } from "@testing-library/react-native";
import { EvidenciasModal } from "./EvidenciasModal";

function props(overrides: Partial<React.ComponentProps<typeof EvidenciasModal>> = {}) {
  return {
    visible: true,
    titulo: "Foto del cliente",
    pendiente: undefined,
    urlActual: null,
    cargando: false,
    confirmando: false,
    error: null,
    mensaje: null,
    iconoVacio: "person" as const,
    textoVacio: "Este cliente no tiene foto.",
    testID: "avatar-modal",
    prefijoTestID: "avatar",
    guardarTestID: "avatar-guardar",
    onElegir: jest.fn(),
    onCerrar: jest.fn(),
    onConfirmar: jest.fn(),
    ...overrides,
  };
}

describe("EvidenciasModal", () => {
  it("muestra el estado vacío con ícono y texto cuando no hay imagen", async () => {
    const { getByText, getByTestId } = await render(<EvidenciasModal {...props()} />);

    expect(getByText("Este cliente no tiene foto.")).toBeTruthy();
    expect(getByTestId("avatar-modal")).toBeTruthy();
  });

  it("previsualiza la imagen pendiente sobre la actual", async () => {
    const { getByTestId, queryByTestId } = await render(
      <EvidenciasModal
        {...props({
          pendiente: { campo: "foto_facial", uri: "file://nueva.jpg", name: "n.jpg", type: "image/jpeg" },
          urlActual: "http://api/foto.jpg",
        })}
      />,
    );

    expect(getByTestId("avatar-preview")).toBeTruthy();
    expect(queryByTestId("avatar-foto-actual")).toBeNull();
  });

  it("muestra la imagen actual si no hay pendiente", async () => {
    const { getByTestId } = await render(
      <EvidenciasModal {...props({ urlActual: "http://api/foto.jpg" })} />,
    );

    expect(getByTestId("avatar-foto-actual")).toBeTruthy();
  });

  it("elegir de librería o cámara llama onElegir con la fuente", async () => {
    const onElegir = jest.fn();
    const { getByTestId } = await render(<EvidenciasModal {...props({ onElegir })} />);

    await fireEvent.press(getByTestId("avatar-libreria"));
    await fireEvent.press(getByTestId("avatar-camara"));

    expect(onElegir).toHaveBeenNthCalledWith(1, "libreria");
    expect(onElegir).toHaveBeenNthCalledWith(2, "camara");
  });

  it("llama onConfirmar y onCerrar desde el footer", async () => {
    const onConfirmar = jest.fn();
    const onCerrar = jest.fn();
    const { getByTestId } = await render(
      <EvidenciasModal {...props({ onConfirmar, onCerrar })} />,
    );

    await fireEvent.press(getByTestId("avatar-guardar"));
    await fireEvent.press(getByTestId("modal-cancelar"));

    expect(onConfirmar).toHaveBeenCalledTimes(1);
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("muestra el error del hook y el mensaje global", async () => {
    const { getByText } = await render(
      <EvidenciasModal {...props({ error: "sin permiso", mensaje: "Foto actualizada." })} />,
    );

    expect(getByText("sin permiso")).toBeTruthy();
    expect(getByText("Foto actualizada.")).toBeTruthy();
  });

  it("deshabilita los botones mientras carga o confirma", async () => {
    const onElegir = jest.fn();
    const { getByTestId } = await render(
      <EvidenciasModal {...props({ onElegir, cargando: true })} />,
    );

    await fireEvent.press(getByTestId("avatar-libreria"));

    expect(onElegir).not.toHaveBeenCalled();
  });
});
