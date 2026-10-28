import { fireEvent, render } from "@testing-library/react-native";
import { FiltrosDeClientes } from "./FiltrosDeClientes";
import type { LeadFilter } from "../api";

const FILTROS: LeadFilter[] = [
  {
    key: "clasificacion",
    label: "Clasificación",
    options: [
      { value: "vip", label: "VIP" },
      { value: "inactivo", label: "Inactivo" },
    ],
  },
];

function filtros(valor = {}, onChange = jest.fn()) {
  return render(
    <FiltrosDeClientes
      valor={valor}
      conexiones={[]}
      filtrosDePack={FILTROS}
      onChange={onChange}
    />,
  );
}

describe("FiltrosDeClientes", () => {
  it("emite la búsqueda al escribir", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await filtros({}, onChange);
    await fireEvent.changeText(getByTestId("clientes-busqueda"), "juana");
    expect(onChange).toHaveBeenCalledWith({ q: "juana" });
  });

  it("aplica canal y filtros de packs desde la hoja", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await filtros({}, onChange);
    await fireEvent.press(getByTestId("clientes-filtros"));
    await fireEvent.press(getByTestId("filtro-canal-whatsapp"));
    expect(onChange).toHaveBeenCalledWith({ channel: "whatsapp" });
    await fireEvent.press(getByTestId("filtro-clasificacion-vip"));
    expect(onChange).toHaveBeenCalledWith({ filtros: ["clasificacion:vip"] });
  });

  it("quita un filtro activo y muestra su etiqueta", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = await filtros({ channel: "whatsapp" }, onChange);
    expect(getByText("WhatsApp")).toBeTruthy();
    await fireEvent.press(getByTestId("filtro-activo-channel"));
    expect(onChange).toHaveBeenCalledWith({ channel: undefined });
  });

  it("limpia todos los filtros y conserva la búsqueda", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await filtros({ q: "ana", channel: "whatsapp" }, onChange);
    await fireEvent.press(getByTestId("clientes-limpiar"));
    expect(onChange).toHaveBeenCalledWith({ q: "ana" });
  });
});
