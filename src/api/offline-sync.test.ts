import { sincronizarCola } from "./offline-sync";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const evento = {
  eventoIdCliente: "11111111-2222-4333-8444-000000000001",
  tipoEvento: "visita",
  payload: { clienteId: 2 },
  creadoEn: "2026-09-01T00:00:00.000Z",
};

describe("sincronizarCola", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("envía el lote con la api key y devuelve los confirmados", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { eventoIdCliente: evento.eventoIdCliente, estado: "sincronizado" },
        {
          eventoIdCliente: "bbbbbbbb-0000-0000-0000-000000000002",
          estado: "error",
          error: "boom",
        },
      ]),
    );

    const confirmados = await sincronizarCola([evento], "dev.key");

    expect(confirmados).toEqual([evento.eventoIdCliente]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/sync-offline/eventos",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-device-key": "dev.key",
        }),
        body: JSON.stringify({
          eventos: [
            {
              eventoIdCliente: evento.eventoIdCliente,
              tipoEvento: "visita",
              payload: { clienteId: 2 },
            },
          ],
        }),
      }),
    );
  });

  it("trata duplicado como confirmado (no re-sincronizar)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ eventoIdCliente: evento.eventoIdCliente, estado: "duplicado" }]),
    );

    const confirmados = await sincronizarCola([evento], "dev.key");

    expect(confirmados).toEqual([evento.eventoIdCliente]);
  });

  it("lanza ApiError si el servidor responde error", async () => {
    fetchMock.mockResolvedValue(new Response("No autorizado", { status: 401 }));

    await expect(sincronizarCola([evento], "dev.key")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("no hace nada si la cola está vacía", async () => {
    await expect(sincronizarCola([], "dev.key")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});