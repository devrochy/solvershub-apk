import { VENTANA_MENSAJES, ventanaDeMensajes } from "./HiloMensajes";

describe("ventana del hilo", () => {
  const mensajes = Array.from({ length: 130 }, (_, i) => i + 1);

  it("muestra solo los últimos mensajes de la ventana", () => {
    const visibles = ventanaDeMensajes(mensajes, VENTANA_MENSAJES);
    expect(visibles).toHaveLength(VENTANA_MENSAJES);
    expect(visibles[0]).toBe(130 - VENTANA_MENSAJES + 1);
    expect(visibles[visibles.length - 1]).toBe(130);
  });

  it("con menos mensajes que la ventana los devuelve todos", () => {
    expect(ventanaDeMensajes([1, 2, 3], 60)).toEqual([1, 2, 3]);
  });
});
