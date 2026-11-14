import { motivosDePerdida, textoDeValor, valorEstimadoValido, filtrosDeEmbudo, resumenesDeEtapa, sinEtapa, opcionesDeEtapa } from "./etapas";

// HU-CRM-23: motivos que se pueden elegir, valor estimado como número simple y en pesos.

describe("motivo de pérdida y valor estimado", () => {
  it("los motivos para elegir salen del filtro del pack y no incluyen «Sin motivo registrado»", () => {
    const filtros = [
      { key: "estado_lead", label: "Etapa", options: [{ value: "nuevo", label: "Nuevo" }] },
      {
        key: "motivo_perdida",
        label: "Motivo de pérdida",
        options: [
          { value: "precio", label: "Precio" },
          { value: "sin_motivo", label: "Sin motivo registrado" },
        ],
      },
    ];
    expect(motivosDePerdida(filtros)).toEqual([{ value: "precio", label: "Precio" }]);
  });

  it("sin el filtro (backend anterior) no hay motivos que pedir", () => {
    expect(motivosDePerdida(undefined)).toEqual([]);
    expect(motivosDePerdida([])).toEqual([]);
  });

  it("el valor es vacío o un número simple con hasta dos decimales", () => {
    for (const bueno of ["", "  ", "0", "250000", "250000.5", "250000,50"]) expect(valorEstimadoValido(bueno)).toBe(true);
    for (const malo of ["150.000", "$150000", "-5", "1e3", "12.345", "abc"]) expect(valorEstimadoValido(malo)).toBe(false);
  });

  it("el valor se muestra en pesos y sin valor es null", () => {
    expect(textoDeValor(250000)).toBe("$ 250.000");
    expect(textoDeValor(1500000)).toBe("$ 1.500.000");
    expect(textoDeValor(0)).toBe("$ 0");
    expect(textoDeValor(null)).toBeNull();
    expect(textoDeValor("250000")).toBeNull();
  });
});

describe("embudo por etapas (HU-CRM-24)", () => {
  it("filtrosDeEmbudo pone la etapa de la pestaña, quita cualquier otra y pide contadores con sumas", () => {
    const res = filtrosDeEmbudo(
      { q: "ana", channel: "whatsapp", filtros: ["estado_lead:perdido", "clasificacion:fiel"] },
      "calificado",
    );
    expect(res).toEqual({
      q: "ana",
      channel: "whatsapp",
      filtros: ["clasificacion:fiel", "estado_lead:calificado"],
      facetas: ["estado_lead"],
      resumen: "valor",
    });
    expect(filtrosDeEmbudo({}, "nuevo").filtros).toEqual(["estado_lead:nuevo"]);
  });

  it("sinEtapa quita solo el filtro de etapa", () => {
    expect(sinEtapa(["estado_lead:nuevo", "valor:1"])).toEqual(["valor:1"]);
    expect(sinEtapa(undefined)).toEqual([]);
  });

  it("resumenesDeEtapa une cada etapa con su cantidad y su suma, y deja null lo que el servidor no trae", () => {
    const opciones = opcionesDeEtapa();
    const faceta = {
      key: "estado_lead",
      counts: { nuevo: 3, calificado: 1 },
      sin_valor: 0,
      total: 4,
      sumas: { nuevo: 900, calificado: 0 },
    };
    const res = resumenesDeEtapa(opciones, [faceta]);
    expect(res[0]).toEqual({ value: "nuevo", label: "Nuevo", cantidad: 3, suma: 900 });
    expect(res.find((r) => r.value === "perdido")).toEqual({ value: "perdido", label: "Perdido", cantidad: 0, suma: 0 });
    // Backend anterior: sin faceta o sin sumas.
    expect(resumenesDeEtapa(opciones, [])[0]).toEqual({ value: "nuevo", label: "Nuevo", cantidad: null, suma: null });
    expect(resumenesDeEtapa(opciones, [{ ...faceta, sumas: undefined }])[0]).toMatchObject({ cantidad: 3, suma: null });
  });
});
