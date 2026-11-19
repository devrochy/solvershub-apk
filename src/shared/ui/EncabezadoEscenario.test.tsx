import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { EncabezadoEscenario, PildoraDelAgente, TarjetaDelEscenario } from "./EncabezadoEscenario";
import { kitDeTema } from "./tema";

const ESTACIONES = [
  { id: "tipo", titulo: "Tipo" },
  { id: "habilidades", titulo: "Habilidades" },
];

describe("EncabezadoEscenario (kit, HU-APP-23)", () => {
  it("es una franja oscura con ✕ «Cerrar», el título y la mini ruta", async () => {
    const onCerrar = jest.fn();
    await render(
      <EncabezadoEscenario onCerrar={onCerrar} titulo="Nuevo agente · 2 de 2" estaciones={ESTACIONES} actual={1} testID="e">
        <PildoraDelAgente siglas="TO" nombre="Tomás" detalle="Agenda · Borrador" />
        <TarjetaDelEscenario etiqueta="Se dedica a" valor="Agenda" hecha />
      </EncabezadoEscenario>,
    );
    expect(screen.getByTestId("e")).toHaveStyle({ backgroundColor: kitDeTema("claro").escenario.fondo });
    expect(screen.getByText("Nuevo agente · 2 de 2")).toBeTruthy();
    expect(screen.getByText("Paso 2 de 2 · Habilidades")).toBeTruthy();
    expect(screen.getByLabelText("Se dedica a: Agenda, listo")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Cerrar"));
    expect(onCerrar).toHaveBeenCalled();
  });

  it("en la bienvenida lleva la marca en vez de ✕", async () => {
    await render(<EncabezadoEscenario marca={<Text>Logo</Text>} estaciones={ESTACIONES} actual={0} />);
    expect(screen.getByText("Logo")).toBeTruthy();
    expect(screen.queryByLabelText("Cerrar")).toBeNull();
  });

  it("la franja es la misma en claro y en oscuro", () => {
    expect(kitDeTema("claro").escenario).toEqual(kitDeTema("oscuro").escenario);
  });
});
