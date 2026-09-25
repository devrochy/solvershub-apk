import {
  enlaceWhatsApp,
  textoReportePrestamo,
} from "./estado-cuenta";
import type { ClienteTarjetaPublic, PrestamoPublic } from "../../types/gestor";

const prestamo: PrestamoPublic = {
  id: "1",
  carteraId: "6",
  clienteId: "2",
  valor: 1000,
  numCuotas: 2,
  tipoInteres: 20,
  diasEntreCuotas: 7,
  fechaOtorgado: "2026-08-01",
  estatus: "vigente",
  cuotas: [
    {
      id: "10",
      numeroCuota: 1,
      valorEsperado: 600,
      fechaVencimiento: "2026-08-08",
      estatus: "pagada",
    },
    {
      id: "11",
      numeroCuota: 2,
      valorEsperado: 600,
      fechaVencimiento: "2026-08-15",
      estatus: "atrasada",
    },
  ],
};

const tarjeta: ClienteTarjetaPublic = {
  clienteId: "2",
  carteraId: "6",
  nombre: "Juan",
  negocio: null,
  telefonoWhatsapp: "+59170000000",
  color: "azul",
  fotoUrl: null,
  tipoDocumento: "ci",
  numeroDocumento: "1234567",
  tipoPago: null,
  saldoPendiente: 600,
  diasMora: 2,
};

describe("estado-cuenta (reporte y enlace WhatsApp)", () => {
  it("textoReportePrestamo describe cuotas con estatus y saldo", () => {
    const texto = textoReportePrestamo(prestamo, tarjeta);

    expect(texto).toContain("Juan");
    expect(texto).toContain("Cuota 1: 600 (pagada)");
    expect(texto).toContain("Cuota 2: 600 (atrasada)");
    expect(texto).toContain("Saldo pendiente: 600");
  });

  it("enlaceWhatsApp arma wa.me con el número sin + y el texto codificado", () => {
    const enlace = enlaceWhatsApp("+591 7000 0000", "Hola");
    expect(enlace).toBe(
      "https://wa.me/59170000000?text=Hola",
    );
  });
});