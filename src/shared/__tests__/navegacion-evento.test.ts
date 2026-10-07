import { emitirNavegacion, suscribirNavegacion } from "../navegacion-evento";

describe("navegacion-evento (HU-APP-21)", () => {
  it("notifica a todos los suscriptores y permite cancelar", () => {
    const recibidos: string[] = [];
    const finA = suscribirNavegacion((d) => recibidos.push(`a:${d.tab}`));
    suscribirNavegacion((d) => recibidos.push(`b:${d.tab}`));

    emitirNavegacion({ tab: "comercio" });
    expect(recibidos).toEqual(["a:comercio", "b:comercio"]);

    finA();
    emitirNavegacion({ tab: "inicio" });
    expect(recibidos).toEqual(["a:comercio", "b:comercio", "b:inicio"]);
  });
});
