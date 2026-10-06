import { fireEvent, render } from "@testing-library/react-native";
import { EvidenciaPicker } from "./EvidenciaPicker";

const base = {
  cargando: false,
  error: null,
  onAgregarLibreria: jest.fn(),
  onAgregarCamara: jest.fn(),
  onQuitar: jest.fn(),
  max: 5,
};

describe("EvidenciaPicker", () => {
  it("muestra botones de librería/cámara y el contador", async () => {
    const { getByTestId, getByText } = await render(
      <EvidenciaPicker {...base} evidencias={[]} />,
    );

    expect(getByTestId("evidencia-libreria")).toBeTruthy();
    expect(getByTestId("evidencia-camara")).toBeTruthy();
    expect(getByText("0/5 evidencias")).toBeTruthy();
  });

  it("muestra miniaturas y quita al tocar el botón", async () => {
    const onQuitar = jest.fn();
    const { getByTestId } = await render(
      <EvidenciaPicker
        {...base}
        evidencias={[{ uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" }]}
        onQuitar={onQuitar}
      />,
    );

    expect(getByTestId("evidencia-miniatura-file:///a.jpg")).toBeTruthy();
    await fireEvent.press(getByTestId("evidencia-quitar-file:///a.jpg"));
    expect(onQuitar).toHaveBeenCalledWith("file:///a.jpg");
  });

  it("deshabilita los botones al llegar al máximo", async () => {
    const evidencias = Array.from({ length: 5 }, (_, i) => ({
      uri: `file:///e${i}.jpg`,
      name: `e${i}.jpg`,
      type: "image/jpeg",
      base64: "AAAA",
    }));
    const { getByTestId } = await render(
      <EvidenciaPicker {...base} evidencias={evidencias} />,
    );

    expect(getByTestId("evidencia-libreria")).toBeDisabled();
    expect(getByTestId("evidencia-camara")).toBeDisabled();
  });
});
describe("EvidenciaPicker — tap targets", () => {
  it("amplía el área táctil del botón quitar (hitSlop) y lo etiqueta", async () => {
    const evidencias = [
      { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" },
    ];
    const { getByTestId } = await render(
      <EvidenciaPicker
        evidencias={evidencias}
        cargando={false}
        error={null}
        onAgregarLibreria={jest.fn()}
        onAgregarCamara={jest.fn()}
        onQuitar={jest.fn()}
        max={5}
      />,
    );

    const quitar = getByTestId("evidencia-quitar-file:///a.jpg");
    expect(quitar.props.hitSlop).toBe(12);
    expect(quitar.props.accessibilityLabel).toBe("Quitar evidencia");
  });
});
