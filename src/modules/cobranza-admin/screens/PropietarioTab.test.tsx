jest.mock("expo-secure-store");

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { PropietarioTab } from "./PropietarioTab";

const mockGet = jest.fn();
const mockPost = jest.fn();
const api = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() } as never;

describe("PropietarioTab (cierre de réplica)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/cobranza/owner-charges") {
        return Promise.resolve({
          cobros: [
            { id: "c-1", periodo: "Octubre 2026", monto: 200000, pagado: null, vence: "2026-10-31", estado: "pendiente" },
          ],
          links: [],
        });
      }
      if (path === "/pack/cobranza/owner-thread") {
        return Promise.resolve({
          whatsapp: "573001234567",
          asunto: "Cobranza Demo",
          estado: "abierto",
          abierto: true,
          mensajes: [{ id: "m-1", direccion: "entrante", tipo: "texto", autor: "Gestor Demo", contenido: "Buen día", fecha: "2026-10-07" }],
        });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("muestra cobros al propietario y el hilo", async () => {
    const { getByTestId, getByText } = await render(<PropietarioTab api={api} />);
    await waitFor(() => expect(getByTestId("propietario-contenedor")).toBeTruthy());
    expect(getByText("Octubre 2026")).toBeTruthy();
    expect(getByText("Buen día")).toBeTruthy();
  });

  it("crea un cobro al propietario", async () => {
    const { getByTestId } = await render(<PropietarioTab api={api} />);
    await waitFor(() => expect(getByTestId("propietario-contenedor")).toBeTruthy());

    await fireEvent.press(getByTestId("propietario-nuevo-cobro"));
    await fireEvent.changeText(getByTestId("cobro-periodo"), "Noviembre 2026");
    await fireEvent.changeText(getByTestId("cobro-monto"), "250000");
    await fireEvent.changeText(getByTestId("cobro-vence"), "2026-11-30");
    await fireEvent.press(getByTestId("cobro-crear"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/owner-charges", {
        periodo: "Noviembre 2026",
        monto: 250000,
        fecha_vencimiento: "2026-11-30",
      }),
    );
  });

  it("registra el pago de un cobro", async () => {
    const { getByTestId } = await render(<PropietarioTab api={api} />);
    await waitFor(() => expect(getByTestId("propietario-contenedor")).toBeTruthy());

    await fireEvent.press(getByTestId("cobro-pagar-c-1"));
    await fireEvent.changeText(getByTestId("pago-monto"), "200000");
    await fireEvent.press(getByTestId("pago-guardar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/owner-charges/c-1/payment", {
        monto_pagado: 200000,
        metodo_pago: "efectivo",
      }),
    );
  });

  it("envía un mensaje al hilo", async () => {
    const { getByTestId } = await render(<PropietarioTab api={api} />);
    await waitFor(() => expect(getByTestId("propietario-contenedor")).toBeTruthy());

    await fireEvent.changeText(getByTestId("propietario-mensaje"), "Seguimos mañana");
    await fireEvent.press(getByTestId("propietario-enviar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/owner-thread/messages", {
        contenido: "Seguimos mañana",
        direccion: "saliente",
      }),
    );
  });
});
