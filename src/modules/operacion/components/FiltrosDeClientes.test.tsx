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

  it("sin el filtro de valor del backend no ofrece ordenar por valor (HU-CRM-23)", async () => {
    const { getByTestId, queryByTestId } = await filtros();
    await fireEvent.press(getByTestId("clientes-filtros"));
    expect(queryByTestId("filtro-clasificacion-vip")).toBeTruthy();
    expect(queryByTestId("orden-valor_desc")).toBeNull();
  });

  it("ofrece ordenar por valor cuando el backend declara el filtro de valor (HU-CRM-23)", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = await render(
      <FiltrosDeClientes
        valor={{ q: "ana" }}
        conexiones={[]}
        filtrosDePack={[...FILTROS, { key: "valor", label: "Valor estimado", options: [{ value: "sin_valor", label: "Sin valor" }] }]}
        onChange={onChange}
      />,
    );
    await fireEvent.press(getByTestId("clientes-filtros"));
    await fireEvent.press(getByTestId("orden-valor_desc"));
    expect(onChange).toHaveBeenCalledWith({ q: "ana", orden: "valor_desc" });
    await fireEvent.press(getByTestId("orden-predeterminado"));
    expect(onChange).toHaveBeenCalledWith({ q: "ana", orden: undefined });
    expect(getByText("Ordenar por")).toBeTruthy();
  });

  it("muestra el orden por valor como filtro activo y lo quita", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = await render(
      <FiltrosDeClientes valor={{ orden: "valor" }} conexiones={[]} filtrosDePack={FILTROS} onChange={onChange} />,
    );
    expect(getByText("Valor estimado (menor primero)")).toBeTruthy();
    await fireEvent.press(getByTestId("filtro-activo-orden"));
    expect(onChange).toHaveBeenCalledWith({ orden: undefined });
  });
});
