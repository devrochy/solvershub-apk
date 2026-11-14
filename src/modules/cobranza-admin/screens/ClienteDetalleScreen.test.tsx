jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: { token: "t", role: "master", permissions: { "pack_cobranza:clientes": "write" } },
    loading: false,
  }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ClienteDetalleScreen } from "./ClienteDetalleScreen";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDel = jest.fn();
const mockGoBack = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: mockDel };

const DETALLE = {
  cliente: {
    id: "c-1", nombre: "Juana", apellido: "Perez", telefono: "7000111", tipo_documento: "cc",
    numero_documento: "555", negocio: "Tienda", cartera: "Cobranza Demo", cartera_id: "car-1",
    tope_maximo_deuda: "100000", color_riesgo: "rojo",
  },
  prestamos: [
    {
      id: "l-1", valor: "1000", saldo: "600", num_cuotas: 4, tipo_interes: "10",
      fecha_otorgado: "2026-09-01", estatus: "vigente",
      cuotas: [{ id: "q-1", numero: 1, valor: 250, vence: "2026-10-01", estatus: "pendiente" }],
    },
  ],
  movimientos: [
    { id: "ab-1", tipo: "abono", fecha: "2026-10-21", valor: 100, metodo: "efectivo" },
  ],
  cambios: [
    { id: "ch-1", campos_propuestos: { telefono: "7000999" }, estado: "pendiente", solicitado_por: "gestor", fecha: "2026-10-06", motivo_rechazo: null },
  ],
};

const route = { params: { id: "c-1", titulo: "Juana Perez" } } as never;
const navigation = { navigate: jest.fn(), goBack: mockGoBack } as never;

async function pantalla() {
  return render(<ClienteDetalleScreen route={route} navigation={navigation} />);
}

describe("ClienteDetalleScreen (cobranza)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    mockGet.mockResolvedValue(DETALLE);
    mockPost.mockResolvedValue(undefined);
    mockPut.mockResolvedValue({ id: "q-1", numero: 1, valor: 300, vence: "2026-10-01", estatus: "pagada" });
    mockDel.mockResolvedValue(undefined);
  });

  it("muestra la ficha con riesgo, préstamos, cuotas, movimientos y cambios", async () => {
    const { getByText, findByTestId } = await pantalla();
    expect(await findByTestId("cobranza-cliente-cabecera")).toBeTruthy();
    expect(getByText("Riesgo alto")).toBeTruthy();
    expect(getByText("$ 1.000 · 4 cuotas")).toBeTruthy();
    expect(getByText("Cambios propuestos")).toBeTruthy();
    expect(getByText("abono")).toBeTruthy();
    expect(getByText("$ 100")).toBeTruthy();
  });

  it("aprueba un cambio con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });
    const { findByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("aprobar-ch-1"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/client-changes/ch-1/decision", {
        decision: "aprobar",
        motivo: "",
      }),
    );
    alertSpy.mockRestore();
  });

  it("rechaza un cambio con su motivo", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });
    const { findByTestId, getByTestId } = await pantalla();
    await fireEvent.changeText(await findByTestId("motivo-rechazo-ch-1"), "Dato incorrecto");
    await fireEvent.press(getByTestId("rechazar-ch-1"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/client-changes/ch-1/decision", {
        decision: "rechazar",
        motivo: "Dato incorrecto",
      }),
    );
    alertSpy.mockRestore();
  });

  it("crea un préstamo desde la ficha", async () => {
    const { findByTestId, getByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("detalle-nuevo-prestamo"));
    await fireEvent.changeText(getByTestId("prestamo-valor"), "1000");
    await fireEvent.press(getByTestId("prestamo-crear"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/pack/cobranza/clients/c-1/loans",
        expect.objectContaining({ valor: 1000 }),
      ),
    );
  });

  it("registra un pago y edita una cuota", async () => {
    const { findByTestId, getByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("detalle-pago-l-1"));
    await fireEvent.changeText(getByTestId("movimiento-valor"), "500");
    await fireEvent.press(getByTestId("movimiento-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/loans/l-1/payments", {
        valor: 500,
        metodo_pago: "efectivo",
        cuota_id: null,
      }),
    );

    await fireEvent.press(getByTestId("detalle-cuota-q-1"));
    await fireEvent.changeText(getByTestId("cuota-valor"), "300");
    await fireEvent.press(getByTestId("cuota-estado-pagada"));
    await fireEvent.press(getByTestId("cuota-guardar"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/pack/cobranza/installments/q-1", {
        valor: 300,
        vence: "2026-10-01",
        estatus: "pagada",
      }),
    );
  });

  it("elimina un abono con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Eliminar")?.onPress?.();
    });
    const { findByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("detalle-eliminar-abono-ab-1"));
    await waitFor(() => expect(mockDel).toHaveBeenCalledWith("/pack/cobranza/credits/ab-1"));
    alertSpy.mockRestore();
  });

  it("elimina el cliente y vuelve atrás", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Eliminar")?.onPress?.();
    });
    const { findByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("detalle-eliminar"));
    await waitFor(() => expect(mockDel).toHaveBeenCalledWith("/pack/cobranza/clients/c-1"));
    expect(mockGoBack).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
