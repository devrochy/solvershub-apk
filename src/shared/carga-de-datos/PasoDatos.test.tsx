jest.mock("expo-secure-store");
jest.mock("@core/session/admin-session-context", () => ({ useAdminSession: () => ({ sesion: { token: "t", tenantId: "n-1" } }) }));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));
jest.mock("@shared/media/preparar-foto-producto", () => ({
  prepararFotoDeProducto: jest.fn(async (a: { uri: string }, i: number) => ({ uri: a.uri, name: `producto-${i + 1}.jpg`, type: "image/jpeg" })),
}));
jest.mock("./carga", () => {
  const real = jest.requireActual("./carga");
  return { ...real, subirFoto: jest.fn() };
});

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import type { ClienteAdmin } from "@core/api/admin";
import { ErrorDeFoto, conteoLegible, registrosDesdeFilas, subirFoto, sugerenciasDePrueba, textoDeCotizacion } from "./carga";
import { PasoDatos } from "./PasoDatos";
import { PasoLoCargado } from "./PasoLoCargado";

const PLANTILLA = {
  id: "productos",
  titulo: "Productos",
  ayuda: "",
  columna_clave: "sku",
  columnas: [
    { nombre: "sku", descripcion: "", obligatoria: true },
    { nombre: "nombre", descripcion: "", obligatoria: true },
    { nombre: "precio", descripcion: "", obligatoria: true },
    { nombre: "imagen", descripcion: "", obligatoria: false },
  ],
  tope_filas: 500,
  tope_bytes: 1_000_000,
  en_produccion: true,
  importa_fotos: true,
};

function cliente(conPrueba: boolean) {
  const get = jest.fn((path: string) => {
    if (path.endsWith("/datos-de-prueba"))
      return conPrueba ? Promise.resolve({ disponible: true, falta_descripcion: false, lote: null }) : Promise.reject(new Error("404"));
    if (path.endsWith("/importar-datos")) return Promise.resolve({ disponible: true, plantilla: PLANTILLA, importado: null });
    if (path.endsWith("/fotos/cotizacion"))
      return Promise.resolve({ fotos: 2, creditos: 4, por_foto: 2, llave_propia: false, usado: 0, limite: 2500, disponible: 2500, alcanza: true });
    return Promise.reject(new Error(path));
  });
  const post = jest.fn((path: string) => {
    if (path.endsWith("/filas/validar"))
      return Promise.resolve({ total_filas: 1, nuevas: 1, existentes: 0, con_errores: 0, errores: [], errores_total: 0, columnas_ignoradas: [], columnas_faltantes: [] });
    if (path.endsWith("/importar-datos/filas"))
      return Promise.resolve({ lote_id: "l", plantilla: "productos", creado_en: "", creadas: 1, existentes: 0, con_errores: 0, conteos: { producto: 1 } });
    if (path.endsWith("/datos-de-prueba"))
      return Promise.resolve({ lote_id: "l", modo: "agente", origen: "llm", motivo_plantilla: null, creado_en: "", conteos: { producto: 3, categoria: 1 }, retirados: {} });
    return Promise.reject(new Error(path));
  });
  return { get, post, put: jest.fn(), patch: jest.fn(), del: jest.fn() };
}

/** El doble del cliente admin con el tipo que esperan los componentes. */
const comoCliente = (c: object) => c as unknown as ClienteAdmin;

describe("lógica de carga (SPEC-45)", () => {
  it("cotización, lista y frases", () => {
    expect(
      textoDeCotizacion({ fotos: 3, creditos: 6, por_foto: 2, llave_propia: false, usado: 100, limite: 2500, disponible: 2400, alcanza: true }),
    ).toBe("Reconocer 3 fotos cuesta 6 créditos. Te quedan 2400 créditos este mes.");
    const registros = registrosDesdeFilas([{ fila: 2, valores: { nombre: "Taza", precio: "15000" }, inferidas: [] }]);
    expect(registros).toEqual([{ tipo: "producto", nombre: "Taza", detalle: "15000", origen: "importacion" }]);
    expect(sugerenciasDePrueba(registros)).toEqual(["¿Tienen Taza?", "¿Cuánto cuesta Taza?"]);
    expect(conteoLegible({ producto: 3, categoria: 1 })).toBe("3 productos y 1 categoría");
  });
});

describe("PasoDatos (HU-AOS-73)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("en producción no ofrece generar; las fotos se cotizan, se reconocen hasta que se acaba el crédito y se confirman", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///1.jpg", width: 3000, height: 2000 },
        { uri: "file:///2.jpg", width: 3000, height: 2000 },
      ],
    });
    (subirFoto as jest.Mock)
      .mockResolvedValueOnce({ image_key: "k1", image_url: "https://x/1.jpg", valores: { sku: "FOTO-1", nombre: "Taza", precio: "", imagen: "k1" }, creditos: 2, repetida: false })
      .mockRejectedValueOnce(new ErrorDeFoto("plan_limit_creditos", "Sin crédito"));
    const api = cliente(false);
    const onCargado = jest.fn();
    const r = await render(<PasoDatos api={comoCliente(api)} agenteId="ag-1" onCargado={onCargado} />);
    await waitFor(() => r.getByTestId("datos-modo"));
    expect(r.queryByText("Generar datos de prueba")).toBeNull();
    await fireEvent.press(r.getByText("Cargar desde fotos"));
    await fireEvent.press(r.getByTestId("fotos-galeria"));
    await waitFor(() => r.getByText("Reconocer 2 fotos por 4 créditos"));
    expect(r.getByText(/Te quedan 2500 créditos/)).toBeTruthy();

    await fireEvent.press(r.getByTestId("fotos-reconocer"));
    await waitFor(() => r.getByText(/se reconocieron 1 de 2 fotos/));
    expect(r.getByTestId("precarga-2-nombre").props.value).toBe("Taza");
    expect(r.getAllByText("IA").length).toBeGreaterThan(0);

    await fireEvent.changeText(r.getByTestId("precarga-2-precio"), "15000");
    await fireEvent.press(r.getByTestId("precarga-revisar"));
    await waitFor(() => r.getByText("Confirmar e importar 1"));
    await fireEvent.press(r.getByTestId("precarga-confirmar"));
    await waitFor(() => expect(onCargado).toHaveBeenCalled());
    expect(onCargado.mock.calls[0][0].registros[0]).toMatchObject({ nombre: "Taza", detalle: "15000" });
    const confirmado = api.post.mock.calls.find(([p]) => p.endsWith("/importar-datos/filas")) as unknown as [string, { filas: { valores: Record<string, string> }[] }];
    expect(confirmado[1].filas[0].valores).toMatchObject({ precio: "15000", imagen: "k1" });
  });

  it("en test genera datos de prueba", async () => {
    const onCargado = jest.fn();
    const r = await render(<PasoDatos api={comoCliente(cliente(true))} agenteId="ag-1" onCargado={onCargado} />);
    await waitFor(() => r.getByTestId("datos-modo"));
    await fireEvent.press(r.getByText("Generar datos de prueba"));
    await fireEvent.press(r.getByTestId("datos-generar"));
    await waitFor(() => expect(onCargado).toHaveBeenCalledWith({ registros: [], resumen: "Listo: 3 productos y 1 categoría." }));
  });
});

describe("PasoLoCargado", () => {
  it("muestra lo que devuelve la API de registros, con frases para probar", async () => {
    const api = {
      ...cliente(true),
      get: jest.fn().mockResolvedValue({ lote: null, total: 1, sin_detalle: 0, registros: [{ tipo: "producto", nombre: "Pan", detalle: "$3.000", origen: "llm" }] }),
    };
    const r = await render(<PasoLoCargado api={comoCliente(api)} agenteId="ag-1" locales={[]} resumen={null} />);
    await waitFor(() => r.getByText("Pan"));
    expect(r.getByText("«¿Tienen Pan?»")).toBeTruthy();
  });
});
