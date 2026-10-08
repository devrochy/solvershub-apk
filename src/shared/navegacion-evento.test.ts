import { emitirNavegacion, suscribirNavegacion } from "./navegacion-evento";

describe("bus de navegación (HU-APP-21)", () => {
  it("entrega el destino a los suscriptores activos", () => {
    const fn = jest.fn();
    const quitar = suscribirNavegacion(fn);
    emitirNavegacion({ tab: "cobranza" });
    quitar();
    expect(fn).toHaveBeenCalledWith({ tab: "cobranza" });
  });

  it("si nadie escucha (push tocado en arranque en frío) lo guarda para el primer suscriptor", () => {
    emitirNavegacion({ tab: "conversaciones" });
    const primero = jest.fn();
    const quitar = suscribirNavegacion(primero);
    expect(primero).toHaveBeenCalledWith({ tab: "conversaciones" });

    // Se entrega una sola vez.
    const segundo = jest.fn();
    const quitar2 = suscribirNavegacion(segundo);
    expect(segundo).not.toHaveBeenCalled();
    quitar();
    quitar2();
  });
});
