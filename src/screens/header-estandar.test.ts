import { readdirSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Guard del estándar de headers: toda pantalla autenticada debe invocar el
 * componente `HeaderApp` (hamburguesa + campana + título) en vez de armar su
 * propia banda. `LoginScreen` es la única excepción (pantalla previa a la
 * sesión, con diseño propio).
 */
const EXCLUIDAS = new Set(["LoginScreen.tsx"]);

const DIRECTORIO = __dirname;

function pantallas(): string[] {
  return readdirSync(DIRECTORIO).filter(
    (archivo) =>
      archivo.endsWith(".tsx") &&
      !archivo.endsWith(".test.tsx") &&
      !EXCLUIDAS.has(archivo),
  );
}

function fuente(archivo: string): string {
  return readFileSync(join(DIRECTORIO, archivo), "utf8");
}

describe("estándar de headers", () => {
  it("detecta las pantallas del directorio (sanity check)", () => {
    expect(pantallas().length).toBeGreaterThan(5);
  });

  it("toda pantalla invoca HeaderApp", () => {
    const sinHeader = pantallas().filter(
      (archivo) => !fuente(archivo).includes("<HeaderApp"),
    );

    expect(sinHeader).toEqual([]);
  });

  it("ninguna pantalla arma su propia banda con HeaderPantalla", () => {
    const conBandaPropia = pantallas().filter((archivo) =>
      fuente(archivo).includes("<HeaderPantalla"),
    );

    expect(conBandaPropia).toEqual([]);
  });
});
