jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({
    bytes: () => Promise.resolve(new Uint8Array([9, 9, 9])),
  })),
}));

import { cobradorApi } from "./cobrador";

describe("cobradorApi", () => {
  const request = jest.fn();
  const requestBytes = jest.fn();
  const api = cobradorApi({ request, requestBytes } as never);

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

  it("registrarGasto construye multipart con descripcion, valor y evidencias", async () => {
    request.mockResolvedValue({ id: 1 });

    await api.registrarGasto(
      6,
      { descripcion: "Combustible", valor: 50 },
      [{ uri: "file:///tmp/x.jpg", name: "x.jpg", type: "image/jpeg" }],
    );

    const [, opts] = request.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: Uint8Array },
    ];
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
    const texto = new TextDecoder().decode(opts.body);
    expect(texto).toContain(`name="descripcion"`);
    expect(texto).toContain("Combustible");
    expect(texto).toContain(`name="valor"`);
    expect(texto).toContain("50");
    expect(texto).toContain(`name="evidencias"; filename="x.jpg"`);
    expect(texto).toContain("Content-Type: image/jpeg");
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

  it("detalleCuota llama a GET del detalle de la cuota", async () => {
    request.mockResolvedValue({
      cuotaId: 10,
      pagos: [],
      abonosAcumulados: 0,
      saldoPendiente: 300,
      ultimaVisita: null,
    });

    await api.detalleCuota(6, 1, 10);

    expect(request).toHaveBeenCalledWith(
      "/cobrador/rutas/6/prestamos/1/cuotas/10/detalle",
    );
  });

  it("crearPrestamo hace POST con el input", async () => {
    request.mockResolvedValue({ id: 1 });

    await api.crearPrestamo(6, {
      clienteId: 2,
      valor: 800,
      numCuotas: 4,
      diasEntreCuotas: 7,
    });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/prestamos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteId: 2,
        valor: 800,
        numCuotas: 4,
        diasEntreCuotas: 7,
      }),
    });
  });

  it("editarCuota hace PATCH con valor, password y motivo", async () => {
    request.mockResolvedValue({ id: 10 });

    await api.editarCuota(6, 10, {
      valorEsperado: 500,
      password: "secreto",
      motivo: "corrección",
    });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/cuotas/10", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        valorEsperado: 500,
        password: "secreto",
        motivo: "corrección",
      }),
    });
  });

  it("eliminarCuota hace DELETE con password y motivo", async () => {
    request.mockResolvedValue({ id: 10 });

    await api.eliminarCuota(6, 10, { password: "secreto", motivo: "error" });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/cuotas/10", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secreto", motivo: "error" }),
    });
  });

  it("eliminarAbono hace DELETE con password y motivo", async () => {
    request.mockResolvedValue({ id: 30 });

    await api.eliminarAbono(6, 30, { password: "secreto", motivo: "error" });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/abonos/30", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secreto", motivo: "error" }),
    });
  });

  it("registrarApertura hace POST con las coordenadas", async () => {
    request.mockResolvedValue({ id: 1, rutaId: 6 });

    await api.registrarApertura(6, { latitud: -17.78, longitud: -63.18 });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/apertura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitud: -17.78, longitud: -63.18 }),
    });
  });

  it("listarNotas llama a GET de notas de la ruta", async () => {
    request.mockResolvedValue([{ id: 1, nota: "Nota" }]);

    await api.listarNotas(6);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/notas");
  });

  it("crearNota hace POST con el texto de la nota", async () => {
    request.mockResolvedValue({ id: 1, nota: "Comprar combustible" });

    await api.crearNota(6, "Comprar combustible");

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/notas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nota: "Comprar combustible" }),
    });
  });

  it("generarLiquidacion hace POST al endpoint de liquidaciones", async () => {
    request.mockResolvedValue({ id: 5 });

    await api.generarLiquidacion(6, { comentario: "cierre" });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/liquidaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario: "cierre" }),
    });
  });

  it("listarLiquidaciones llama a GET de liquidaciones de la ruta", async () => {
    request.mockResolvedValue([]);

    await api.listarLiquidaciones(6);

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/liquidaciones");
  });

  it("exportarLiquidacionPdf usa requestBytes en el endpoint export-pdf", async () => {
    requestBytes.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));

    const bytes = await api.exportarLiquidacionPdf(6, 5);

    expect(requestBytes).toHaveBeenCalledWith(
      "/cobrador/rutas/6/liquidaciones/5/export-pdf",
    );
    expect(Array.from(bytes)).toEqual([37, 80, 68, 70]);
  });

  it("crearCliente hace POST multipart con los datos y evidencias", async () => {
    request.mockResolvedValue({ id: 50 });

    await api.crearCliente(
      6,
      {
        nombre: "Ana",
        apellido: "Ríos",
        negocio: "Tienda",
        telefonoWhatsapp: "+5917000111",
        latitud: -17.78,
        longitud: -63.18,
        topeMaximoDeuda: 1500,
        tipoDocumento: "ci",
        numeroDocumento: "1234567",
      },
      [
        { campo: "foto_facial", uri: "file:///f.jpg", name: "f.jpg", type: "image/jpeg" },
        { campo: "documento_frente", uri: "file:///d.jpg", name: "d.jpg", type: "image/jpeg" },
      ],
    );

    const [, opts] = request.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body: Uint8Array },
    ];
    expect(opts.method).toBe("POST");
    expect(opts.headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
    const texto = new TextDecoder().decode(opts.body);
    expect(texto).toContain(`name="nombre"`);
    expect(texto).toContain("Ana");
    expect(texto).toContain("Ríos");
    expect(texto).toContain("Tienda");
    expect(texto).toContain("+5917000111");
    expect(texto).toContain("-17.78");
    expect(texto).toContain("-63.18");
    expect(texto).toContain("1500");
    expect(texto).toContain(`name="foto_facial"; filename="f.jpg"`);
    expect(texto).toContain(`name="documento_frente"; filename="d.jpg"`);
    expect(texto).toContain("Content-Type: image/jpeg");
  });

  it("actualizarCliente hace PATCH al cliente con lat/lng", async () => {
    request.mockResolvedValue({ id: 2 });

    await api.actualizarCliente(6, 2, {
      latitud: -17.79,
      longitud: -63.19,
    });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/clientes/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitud: -17.79, longitud: -63.19 }),
    });
  });

  it("actualizarCliente acepta lat/lng de domicilio", async () => {
    request.mockResolvedValue({ id: 2 });

    await api.actualizarCliente(6, 2, {
      latitudDomicilio: -17.8,
      longitudDomicilio: -63.2,
    });

    expect(request).toHaveBeenCalledWith("/cobrador/rutas/6/clientes/2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitudDomicilio: -17.8, longitudDomicilio: -63.2 }),
    });
  });
});