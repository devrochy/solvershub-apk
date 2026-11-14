import { fireEvent, render } from "@testing-library/react-native";
import { ClienteCobranzaCard } from "./ClienteCard";
import type { ClientRow } from "../api";

const ITEM: ClientRow = {
  id: "c-1",
  nombre: "Juana",
  apellido: "Pérez",
  telefono: "3001112233",
  tipo_documento: "cc",
  numero_documento: "123",
  negocio: "Tienda",
  cartera: "Cobranza Demo",
  cartera_id: "car-1",
  tope_maximo_deuda: "100000",
  color_riesgo: "rojo",
};

function tarjeta(extra: Partial<React.ComponentProps<typeof ClienteCobranzaCard>> = {}) {
  return render(
    <ClienteCobranzaCard
      item={ITEM}
      puedeEscribir
      onAbrir={jest.fn()}
      onEditar={jest.fn()}
      onEliminar={jest.fn()}
      {...extra}
    />,
  );
}

describe("ClienteCobranzaCard", () => {
  it("muestra nombre, riesgo, teléfono, documento, negocio y tope", async () => {
    const { getByText, getByTestId } = await tarjeta();
    expect(getByText("Juana Pérez")).toBeTruthy();
    expect(getByText("Riesgo alto")).toBeTruthy();
    expect(getByText("3001112233")).toBeTruthy();
    expect(getByText("Cédula de ciudadanía 123")).toBeTruthy();
    expect(getByText("Tienda")).toBeTruthy();
    expect(getByText("Tope $ 100.000")).toBeTruthy();
    expect(getByTestId("cobranza-cliente-c-1").props.accessibilityLabel).toContain("Riesgo alto");
  });

  it("abre la ficha y ejecuta editar/eliminar sin abrirla", async () => {
    const onAbrir = jest.fn();
    const onEditar = jest.fn();
    const onEliminar = jest.fn();
    const { getByTestId } = await tarjeta({ onAbrir, onEditar, onEliminar });
    await fireEvent.press(getByTestId("cobranza-cliente-c-1"));
    await fireEvent.press(getByTestId("cobranza-editar-c-1"));
    await fireEvent.press(getByTestId("cobranza-eliminar-c-1"));
    expect(onAbrir).toHaveBeenCalledTimes(1);
    expect(onEditar).toHaveBeenCalledTimes(1);
    expect(onEliminar).toHaveBeenCalledTimes(1);
  });

  it("sin permiso de escritura no muestra editar ni eliminar", async () => {
    const { queryByTestId } = await tarjeta({ puedeEscribir: false });
    expect(queryByTestId("cobranza-editar-c-1")).toBeNull();
    expect(queryByTestId("cobranza-eliminar-c-1")).toBeNull();
  });
});
