import { fireEvent, render } from "@testing-library/react-native";
import { MapaPin } from "./MapaPin";

describe("MapaPin", () => {
  it("renderiza el contenedor con la webview y las coordenadas iniciales", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <MapaPin latitud={-17.78} longitud={-63.18} onChange={onChange} testID="mapa-pin-negocio" />,
    );

    expect(getByTestId("mapa-pin-negocio")).toBeTruthy();
    const webview = getByTestId("mapa-pin-negocio-webview");
    const html = webview.props.source.html as string;
    expect(html).toContain("-17.78");
    expect(html).toContain("-63.18");
    expect(html).toContain("draggable");
  });

  it("mueve el pin con un toque y se apaga en solo lectura", async () => {
    const { getByTestId, rerender } = await render(
      <MapaPin latitud={-17.78} longitud={-63.18} onChange={jest.fn()} testID="mapa-pin-editable" />,
    );
    const html = getByTestId("mapa-pin-editable-webview").props.source.html as string;
    expect(html).toContain("map.on('click'");
    expect(html).toContain("soloLectura = false");

    await rerender(
      <MapaPin
        latitud={-17.78}
        longitud={-63.18}
        onChange={jest.fn()}
        soloLectura
        testID="mapa-pin-editable"
      />,
    );
    const htmlLectura = getByTestId("mapa-pin-editable-webview").props.source.html as string;
    expect(htmlLectura).toContain("soloLectura = true");
    expect(htmlLectura).toContain("draggable: !soloLectura");
  });

  it("notifica las nuevas coordenadas al arrastrar el pin (postMessage bridge)", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <MapaPin latitud={-17.78} longitud={-63.18} onChange={onChange} />,
    );

    await fireEvent(
      getByTestId("mapa-pin-webview"),
      "message",
      {
        nativeEvent: {
          data: JSON.stringify({ latitud: -17.79, longitud: -63.19 }),
        },
      },
    );

    expect(onChange).toHaveBeenCalledWith(-17.79, -63.19);
  });

  it("ignora mensajes malformados del puente", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <MapaPin latitud={-17.78} longitud={-63.18} onChange={onChange} />,
    );

    await fireEvent(
      getByTestId("mapa-pin-webview"),
      "message",
      { nativeEvent: { data: "no-json" } },
    );

    expect(onChange).not.toHaveBeenCalled();
  });
});