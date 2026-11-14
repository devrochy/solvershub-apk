jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CuotaSheet, MovimientoSheet, PrestamoSheet } from "./PrestamoSheets";
import type { CuotaOut, Loan } from "../api";

const CUOTA: CuotaOut = { id: "q-1", numero: 1, valor: 250, vence: "2026-11-01", estatus: "pendiente" };
const PRESTAMO: Loan = {
  id: "l-1",
  valor: 1000,
  saldo: 750,
  num_cuotas: 4,
  tipo_interes: 10,
  fecha_otorgado: "2026-10-21",
  estatus: "vigente",
  cuotas: [CUOTA],
};

describe("PrestamoSheets", () => {
  const mockPost = jest.fn();
  const mockPut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({
      get: jest.fn(),
      post: mockPost,
      put: mockPut,
      patch: jest.fn(),
      del: jest.fn(),
    });
  });

  it("crea un préstamo", async () => {
    mockPost.mockResolvedValue(PRESTAMO);
    const onCreado = jest.fn();
    const { getByTestId } = await render(
      <PrestamoSheet visible onClose={jest.fn()} clienteId="c-1" onCreado={onCreado} />,
    );
    await fireEvent.changeText(getByTestId("prestamo-valor"), "1000");
    await fireEvent.press(getByTestId("prestamo-crear"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/pack/cobranza/clients/c-1/loans",
        expect.objectContaining({ valor: 1000, num_cuotas: 4 }),
      ),
    );
    expect(onCreado).toHaveBeenCalled();
  });

  it("registra un pago de una cuota", async () => {
    mockPost.mockResolvedValue(undefined);
    const onGuardado = jest.fn();
    const { getByTestId } = await render(
      <MovimientoSheet visible onClose={jest.fn()} prestamo={PRESTAMO} tipo="pago" onGuardado={onGuardado} />,
    );
    await fireEvent.press(getByTestId("movimiento-cuota-q-1"));
    await fireEvent.press(getByTestId("movimiento-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/loans/l-1/payments", {
        valor: 250,
        metodo_pago: "efectivo",
        cuota_id: "q-1",
      }),
    );
    expect(onGuardado).toHaveBeenCalled();
  });

  it("edita una cuota", async () => {
    mockPut.mockResolvedValue(CUOTA);
    const onGuardado = jest.fn();
    const { getByTestId } = await render(
      <CuotaSheet visible onClose={jest.fn()} cuota={CUOTA} onGuardado={onGuardado} />,
    );
    await fireEvent.changeText(getByTestId("cuota-valor"), "300");
    await fireEvent.press(getByTestId("cuota-estado-pagada"));
    await fireEvent.press(getByTestId("cuota-guardar"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/pack/cobranza/installments/q-1", {
        valor: 300,
        vence: "2026-11-01",
        estatus: "pagada",
      }),
    );
    expect(onGuardado).toHaveBeenCalled();
  });
});
