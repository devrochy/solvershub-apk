import { cobradorApi } from "./cobrador";

describe("cobradorApi", () => {
  const request = jest.fn();
  const api = cobradorApi({ request } as never);

  beforeEach(() => jest.clearAllMocks());

  it("misRutas llama a GET /cobrador/mis-rutas", async () => {
    request.mockResolvedValue([]);

    await api.misRutas();

    expect(request).toHaveBeenCalledWith("/cobrador/mis-rutas");
  });

  it("dia llama a GET /cobrador/rutas/:id/dia", async () => {
    request.mockResolvedValue({ clientes: [], trayectos: null });

    await api.dia(6);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/dia");
  });

  it("registrarVisitaPago hace POST con el input", async () => {
    request.mockResolvedValue({ id: 1 });

    const input = { prestamoId: 1, clienteId: 2, resultado: "pago" as const };
    await api.registrarVisitaPago(6, input);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/visitas/pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("registrarVisitaNoPago hace POST al endpoint no-pago", async () => {
    request.mockResolvedValue({ id: 1 });

    const input = {
      prestamoId: 1,
      clienteId: 2,
      resultado: "no_pago" as const,
      motivoNoPago: "no_tiene_dinero",
    };
    await api.registrarVisitaNoPago(6, input);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/visitas/no-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("registrarGasto construye FormData con descripcion, valor y evidencias", async () => {
    request.mockResolvedValue({ id: 1 });

    await api.registrarGasto(
      6,
      { descripcion: "Combustible", valor: 50 },
      [{ uri: "file:///tmp/x.jpg", name: "x.jpg", type: "image/jpeg" }],
    );

    const [, opts] = request.mock.calls[0] as [
      string,
      { method: string; body: FormData },
    ];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get("descripcion")).toBe("Combustible");
    expect(opts.body.get("valor")).toBe("50");
  });

  it("registrarTrayectoriaReal hace POST con los puntos", async () => {
    request.mockResolvedValue({ id: 1, tipo: "real" });

    const input = {
      puntos: [
        { latitud: -17.78, longitud: -63.18 },
        { latitud: -17.79, longitud: -63.19 },
      ],
    };
    await api.registrarTrayectoriaReal(6, input);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/trayectoria-real", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("tarjeta llama a GET del estado de cuenta", async () => {
    request.mockResolvedValue({ clienteId: 2 });

    await api.tarjeta(6, 2);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/clientes/2/tarjeta");
  });

  it("listarPrestamosDeCliente llama a GET de préstamos del cliente", async () => {
    request.mockResolvedValue([]);

    await api.listarPrestamosDeCliente(6, 2);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/clientes/2/prestamos");
  });
});