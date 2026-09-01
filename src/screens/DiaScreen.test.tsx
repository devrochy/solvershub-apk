import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { DiaScreen } from "./DiaScreen";
import { ApiError } from "../api/client";
import * as cache from "../offline/cache";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";

jest.mock("../offline/cache", () => ({
  guardarDia: jest.fn().mockResolvedValue(undefined),
  leerDia: jest.fn().mockResolvedValue(null),
}));

const offlineValor: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  encolar: jest.fn().mockResolvedValue(undefined),
  sincronizar: jest.fn().mockResolvedValue(undefined),
};

async function renderConApi(
  api: Partial<SessionValue["api"]>,
  offline = offlineValor,
) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "C", apellido: "L" },
    loading: false,
    api: { dia: jest.fn().mockResolvedValue({ clientes: [], trayectos: null }), ...api } as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate: jest.fn() } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <DiaScreen
          navigation={navigation}
          route={{ key: "dia", name: "Dia", params: { rutaId: 6, rutaNombre: "Ruta" } }}
        />
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("DiaScreen — gasto offline", () => {  it("encola el gasto en la cola offline cuando hay error de red", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    const registrarGasto = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const { getByTestId } = await renderConApi({ registrarGasto }, offlineConError);

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(encolar).toHaveBeenCalledWith("gasto", { descripcion: "Combustible", valor: 50 }),
    );
  });

  it("NO encola si el error es una respuesta HTTP válida (ApiError)", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    const registrarGasto = jest.fn().mockRejectedValue(new ApiError(400, "inválido"));
    const { getByTestId } = await renderConApi({ registrarGasto }, offlineConError);

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(getByTestId("gasto-form")).toBeTruthy(),
    );
    expect(encolar).not.toHaveBeenCalled();
  });
});

describe("DiaScreen — cache del día", () => {
  const dia = {
    clientes: [{ clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const }],
    trayectos: null,
  };

  it("guarda el snapshot del día al cargar online", async () => {
    (cache.guardarDia as jest.Mock).mockResolvedValue(undefined);
    await renderConApi({ dia: jest.fn().mockResolvedValue(dia) });

    await waitFor(() =>
      expect(cache.guardarDia).toHaveBeenCalledWith(6, dia),
    );
  });

  it("lee el cache y muestra los clientes + aviso en error de red", async () => {
    (cache.leerDia as jest.Mock).mockResolvedValue(dia);
    const { getByTestId, getByText } = await renderConApi({
      dia: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    await waitFor(() => expect(getByTestId("aviso-offline")).toBeTruthy());
  });

  it("muestra error si no hay red ni cache", async () => {
    (cache.leerDia as jest.Mock).mockResolvedValue(null);
    const { getByText } = await renderConApi({
      dia: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() =>
      expect(getByText("No se pudo cargar la lista del día.")).toBeTruthy(),
    );
  });
});