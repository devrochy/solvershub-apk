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

  it("puede pedir una pestaña interna del módulo (cajón del panel, HU-DS-11)", () => {
    const fn = jest.fn();
    const quitar = suscribirNavegacion(fn);
    emitirNavegacion({ tab: "comercio", pestana: "pedidos" });
    quitar();
    expect(fn).toHaveBeenCalledWith({ tab: "comercio", pestana: "pedidos" });
  });
});
