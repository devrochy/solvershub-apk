jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { StyleSheet } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import type { GuardarEstacion } from "@shared/ruta/estacion-del-agente";
import { EstacionDatosDelCliente } from "./EstacionDatosDelCliente";

const mockGet = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: mockPut, patch: jest.fn(), del: jest.fn() };

const PEDIDO = "ventas.crear_pedido";
const POLITICA = {
  agente_id: "a-1",
  niveles: ["requerido", "recomendado", "no_pedir"],
  herramientas_del_agente: false,
  metodos_entrega: ["domicilio", "recoger_en_tienda"],
  procedimientos: [],
  acciones: [
    {
      id: PEDIDO,
      modulo: "ventas",
      etiqueta: "Crear un pedido",
      campos: [
        {
          clave: "nombre",
          etiqueta: "Nombre",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: true,
          ajustado: false,
        },
        {
          clave: "telefono",
          etiqueta: "Teléfono",
          nivel: "requerido",
          por_defecto: "requerido",
          ajustable: false,
          ajustado: false,
        },
        {
          clave: "direccion",
          etiqueta: "Dirección",
          nivel: "recomendado",
          por_defecto: "recomendado",
          ajustable: true,
          ajustado: false,
        },
        {
          clave: "correo",
          etiqueta: "Correo",
          nivel: "no_pedir",
          por_defecto: "no_pedir",
          ajustable: true,
          ajustado: false,
        },
      ],
    },
  ],
};

let politicaDelServidor: Record<string, unknown> = POLITICA;

function preparar() {
  politicaDelServidor = POLITICA;
  mockGet.mockImplementation((path: string) =>
    path === "/admin/agents/a-1/datos-cliente" ? Promise.resolve(politicaDelServidor) : Promise.reject(new Error(path)),
  );
  mockPut.mockImplementation((_path: string, cuerpo: { metodos_entrega: string[] }) => {
    // El servidor devuelve lo guardado: al volver a la estación se ve como quedó.
    politicaDelServidor = { ...POLITICA, metodos_entrega: cuerpo.metodos_entrega };
    return Promise.resolve(politicaDelServidor);
  });
}

async function montar() {
  let guardar: GuardarEstacion | null = null;
  const onResumen = jest.fn();
  const onSeguir = jest.fn();
  const api = await render(
    <EstacionDatosDelCliente
      estacion="datos-cliente"
      agenteId="a-1"
      tipo="ventas"
      nombre="Laura"
      negocio="La Espiga"
      registrarGuardar={(g) => {
        guardar = g;
      }}
      onResumen={onResumen}
      onCargados={jest.fn()}
      onSeguir={onSeguir}
    />,
  );
  await waitFor(() => api.getByTestId("datos-cliente"));
  return { api, onResumen, onSeguir, guardar: () => guardar!() };
}

const nivel = (dato: string, valor: string) => `datos-cliente-${PEDIDO}-${dato}-${valor}`;

beforeEach(() => {
  jest.clearAllMocks();
  (useAdminApi as jest.Mock).mockReturnValue(cliente);
  preparar();
});

describe("EstacionDatosDelCliente", () => {
  it("llega con lo recomendado: «Lo justo», una tarjeta por operación y «Consultar historial»; sin cambios no escribe", async () => {
    const { api, onResumen, guardar } = await montar();
    expect(mockGet).toHaveBeenCalledWith("/admin/agents/a-1/datos-cliente");
    expect(api.getByText("Cuánto pregunta")).toBeTruthy();
    expect(api.getByTestId("datos-cliente-cuanto-justo").props.accessibilityState.checked).toBe(true);
    expect(api.getByTestId("datos-cliente-cuanto-justo").props.accessibilityHint).toContain("Recomendado");
    expect(api.getByTestId(`datos-cliente-accion-${PEDIDO}`)).toBeTruthy();
    expect(api.getByText("Consultar historial")).toBeTruthy();
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
    expect(onResumen).toHaveBeenLastCalledWith("datos-cliente", "«Lo justo»");

    let ok = false;
    await act(async () => {
      ok = await guardar();
    });
    expect(ok).toBe(true);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("«No pedir» se marca con palomita y palabra, con 48 dp, y aparece «Usar lo recomendado» que lo devuelve", async () => {
    const { api, onResumen } = await montar();
    await fireEvent.press(api.getByTestId(`datos-cliente-accion-${PEDIDO}-abrir`));
    const noPedir = api.getByTestId(nivel("direccion", "no_pedir"));
    expect(noPedir.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(noPedir);
    expect(api.getByTestId(nivel("direccion", "no_pedir")).props.accessibilityState.checked).toBe(true);
    expect(api.getByTestId(nivel("direccion", "recomendado")).props.accessibilityState.checked).toBe(false);
    // Ícono (palomita) y palabra: no solo color.
    // (el ícono de prueba se dibuja con su nombre: «check» es la palomita de lo marcado)
    expect(api.getByTestId(nivel("direccion", "no_pedir"))).toHaveTextContent("checkNo pedir");
    expect(api.getByTestId(nivel("direccion", "recomendado"))).toHaveTextContent("back-handRecomendado");
    expect(api.getByTestId(`datos-cliente-${PEDIDO}-direccion-pista`)).toHaveTextContent("Por defecto: Recomendado.");
    for (const opcion of ["requerido", "recomendado", "no_pedir"]) {
      const estilo = StyleSheet.flatten(api.getByTestId(nivel("direccion", opcion)).props.style);
      expect(estilo.minHeight).toBeGreaterThanOrEqual(48);
    }
    // Con solo la dirección en «No pedir» coincide con «Lo mínimo».
    expect(onResumen).toHaveBeenLastCalledWith("datos-cliente", "«Lo mínimo»");
    expect(api.getByTestId("datos-cliente-cuanto-minimo").props.accessibilityState.checked).toBe(true);
    expect(api.getByText(/1 cambio/)).toBeTruthy();

    await fireEvent.press(api.getByText("Usar lo recomendado"));
    expect(api.getByTestId(nivel("direccion", "recomendado")).props.accessibilityState.checked).toBe(true);
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
  });

  it("un dato con piso técnico no baja y la tarjeta dice por qué", async () => {
    const { api } = await montar();
    await fireEvent.press(api.getByTestId(`datos-cliente-accion-${PEDIDO}-abrir`));
    const bajar = api.getByTestId(nivel("telefono", "no_pedir"));
    expect(bajar.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(bajar);
    expect(api.getByTestId(nivel("telefono", "requerido")).props.accessibilityState.checked).toBe(true);
    expect(api.getByTestId(`datos-cliente-${PEDIDO}-telefono-piso`)).toHaveTextContent(
      "Necesario para crear un pedido.",
    );
    // «Completo» tampoco toca el piso, y «Lo mínimo» lo deja requerido.
    await fireEvent.press(api.getByTestId("datos-cliente-cuanto-minimo"));
    expect(api.getByTestId(nivel("telefono", "requerido")).props.accessibilityState.checked).toBe(true);
    expect(api.getByTestId(nivel("direccion", "no_pedir")).props.accessibilityState.checked).toBe(true);
  });

  it("Ventas: apaga «A domicilio», guarda politica, herramientas y métodos, y al volver sigue apagado", async () => {
    const primera = await montar();
    await fireEvent.press(primera.api.getByTestId("datos-cliente-metodo-domicilio"));
    // El último encendido queda fijo: el backend respondería 422 `metodos_entrega_vacios`.
    const recoger = primera.api.getByTestId("datos-cliente-metodo-recoger_en_tienda");
    expect(recoger.props.accessibilityState.disabled).toBe(true);
    expect(recoger.props.accessibilityHint).toContain("Debe quedar al menos uno.");
    await fireEvent.press(recoger);
    expect(primera.api.getByTestId("datos-cliente-metodo-recoger_en_tienda").props.accessibilityState.checked).toBe(
      true,
    );

    let ok = false;
    await act(async () => {
      ok = await primera.guardar();
    });
    expect(ok).toBe(true);
    expect(mockPut).toHaveBeenCalledTimes(1);
    expect(mockPut).toHaveBeenCalledWith("/admin/agents/a-1/datos-cliente", {
      politica: { [PEDIDO]: {} },
      herramientas_del_agente: false,
      metodos_entrega: ["recoger_en_tienda"],
    });

    // Volver a la estación la monta de nuevo y lee lo guardado del servidor.
    const vuelta = await montar();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(vuelta.api.getByTestId("datos-cliente-metodo-domicilio").props.accessibilityState.checked).toBe(false);
    expect(vuelta.api.getByTestId("datos-cliente-metodo-recoger_en_tienda").props.accessibilityState.checked).toBe(
      true,
    );
  });

  it("si el guardado falla, muestra el error con «Reintentar» y no deja avanzar", async () => {
    mockPut.mockRejectedValueOnce(new TypeError("Network request failed"));
    const { api, guardar, onSeguir } = await montar();
    await fireEvent.press(api.getByTestId("datos-cliente-historial"));
    let ok = true;
    await act(async () => {
      ok = await guardar();
    });
    expect(ok).toBe(false);
    expect(api.getByTestId("datos-cliente-error")).toHaveTextContent(/Se cortó la conexión/);
    // «Reintentar» es «Guardar y seguir» otra vez: la ruta guarda y solo avanza si sale bien.
    await fireEvent.press(api.getByTestId("datos-cliente-reintentar"));
    expect(onSeguir).toHaveBeenCalledTimes(1);
    await act(async () => {
      ok = await guardar();
    });
    expect(ok).toBe(true);
    expect(mockPut).toHaveBeenLastCalledWith(
      "/admin/agents/a-1/datos-cliente",
      expect.objectContaining({ herramientas_del_agente: true }),
    );
    expect(api.queryByTestId("datos-cliente-error")).toBeNull();
  });

  it("explica un 403 sin jerga", async () => {
    mockPut.mockRejectedValueOnce(new AdminApiError(403, "forbidden", "Forbidden"));
    const { api, guardar } = await montar();
    await fireEvent.press(api.getByTestId("datos-cliente-historial"));
    await act(async () => {
      await guardar();
    });
    expect(api.getByTestId("datos-cliente-error")).toHaveTextContent(/No tienes permiso/);
  });

  it("si no carga, lo dice y «Reintentar» vuelve a pedirlo", async () => {
    mockGet.mockRejectedValueOnce(new TypeError("Network request failed"));
    const api = await render(
      <EstacionDatosDelCliente
        estacion="datos-cliente"
        agenteId="a-1"
        tipo="ventas"
        nombre="Laura"
        negocio="La Espiga"
        registrarGuardar={jest.fn()}
        onResumen={jest.fn()}
        onCargados={jest.fn()}
        onSeguir={jest.fn()}
      />,
    );
    await waitFor(() => api.getByTestId("datos-cliente-recargar"));
    await fireEvent.press(api.getByTestId("datos-cliente-recargar"));
    await waitFor(() => api.getByTestId("datos-cliente"));
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
