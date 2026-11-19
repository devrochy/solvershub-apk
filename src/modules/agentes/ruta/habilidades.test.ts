import type { FormasDePago, Superpoder } from "../api";
import {
  agruparPorDominio,
  conFrase,
  contenidoConHabilidades,
  cuentaDeLaRuta,
  errorDeHabilidades,
  errorDeLaCuenta,
  estadoDesdeBorrador,
  formasConCuenta,
  frasesDistintas,
  habilidadesRecomendadas,
  mismaCuenta,
  resumenDeHabilidades,
  textoDeRecomendadoDelGrupo,
} from "./habilidades";

const poder = (id: string, group = "citas", phrases = ["quiero una cita", "agendar", "reservar"]): Superpoder => ({
  id,
  title: id,
  description: "",
  group,
  group_label: group === "citas" ? "Al agendar" : "Al cobrar",
  phrases,
  skill: "pack_calendar",
  version: "2.3.1",
});

const CATALOGO = [poder("pack_calendar.agendar"), poder("pack_calendar.cancelar"), poder("pack_payments.link", "pagos")];

describe("estación 2, Habilidades (HU-APP-23)", () => {
  it("lee los superpoderes encendidos y sus frases del borrador", () => {
    const estado = estadoDesdeBorrador({
      procedures: [{ id: "pack_calendar.agendar", version: "^2.0", overrides: { examples: ["sacar turno"] } }, { id: 3 }],
    });
    expect(estado).toEqual({ activos: ["pack_calendar.agendar"], frases: { "pack_calendar.agendar": ["sacar turno"] } });
  });

  it("lo recomendado es tenerlos todos encendidos", () => {
    expect(habilidadesRecomendadas(CATALOGO)).toEqual(CATALOGO.map((p) => p.id));
    expect(textoDeRecomendadoDelGrupo(5)).toBe("Recomendado: las 5");
  });

  it("guarda solo `procedures`: conserva la versión y la descripción anteriores y el resto del borrador", () => {
    const base = {
      persona: { maxLength: 500 },
      procedures: [{ id: "pack_calendar.agendar", version: "^1.0", overrides: { description: "propia" } }],
    };
    const nuevo = contenidoConHabilidades(
      base,
      { activos: ["pack_calendar.agendar", "pack_payments.link"], frases: { "pack_payments.link": [" pagar ya "] } },
      CATALOGO,
    );
    expect(nuevo.persona).toEqual({ maxLength: 500 });
    expect(nuevo.procedures).toEqual([
      { id: "pack_calendar.agendar", version: "^1.0", overrides: { description: "propia" } },
      { id: "pack_payments.link", version: "^2.0", overrides: { examples: ["pagar ya"] } },
    ]);
  });

  it("exige al menos uno y el mínimo de frases distintas", () => {
    expect(errorDeHabilidades({ activos: [], frases: {} }, CATALOGO, 3)).toBe("Marca al menos un superpoder para este agente.");
    expect(errorDeHabilidades({ activos: ["pack_calendar.agendar"], frases: {} }, CATALOGO, 3)).toBeNull();
    expect(errorDeHabilidades({ activos: ["pack_calendar.agendar"], frases: {} }, CATALOGO, 4)).toMatch(/agrega 1 más/);
    expect(frasesDistintas(poder("x", "citas", ["Agendar", "agendar!"]), ["agéndar"])).toBe(1);
    expect(conFrase(["Agendar"], " agendar ")).toEqual(["Agendar"]);
    expect(conFrase(["Agendar"], "Otra")).toEqual(["Agendar", "Otra"]);
  });

  it("agrupa por dominio y resume lo encendido", () => {
    expect(agruparPorDominio(CATALOGO).map((g) => [g.label, g.items.length])).toEqual([
      ["Al agendar", 2],
      ["Al cobrar", 1],
    ]);
    expect(resumenDeHabilidades({ activos: ["pack_calendar.agendar"], frases: {} }, CATALOGO)).toBe("1 de 3 encendidas");
  });

  it("«Al cobrar» guarda la cuenta, enciende transferencia y conserva lo demás", () => {
    const formas: FormasDePago = {
      agent_id: "a",
      configurada: true,
      pago_en_linea_disponible: false,
      transfer_proof_required: true,
      transfer_ocr_enabled: false,
      transfer_accounts: [{ entity: "Nequi", accountNumber: "1", accountType: "ahorros", holderName: "Ana", holderDocument: "9" }],
      forms: [
        { method: "efectivo_contraentrega", enabled: true, instructions: "", estado: "activa", falta: "", label: "", superpoder: null },
        { method: "transferencia", enabled: false, instructions: "x", estado: "apagada", falta: "", label: "", superpoder: null },
      ],
    };
    expect(cuentaDeLaRuta(formas)).toEqual({ entidad: "Nequi", numero: "1" });
    expect(mismaCuenta(formas, { entidad: "Nequi ", numero: "1" })).toBe(true);
    const cuerpo = formasConCuenta(formas, { entidad: "Bancolombia", numero: "123" });
    expect(cuerpo.transfer_accounts).toEqual([
      { entity: "Bancolombia", accountNumber: "123", accountType: "ahorros", holderName: "Ana", holderDocument: "9" },
    ]);
    expect(cuerpo.forms).toEqual([
      { method: "efectivo_contraentrega", enabled: true, instructions: "" },
      { method: "transferencia", enabled: true, instructions: "x" },
    ]);
    expect(errorDeLaCuenta({ entidad: "Nequi", numero: "" })).toBe("La cuenta necesita la entidad y el número.");
    expect(errorDeLaCuenta({ entidad: "", numero: "" })).toBeNull();
  });
});
