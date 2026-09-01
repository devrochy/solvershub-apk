import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ClienteScreen } from "./ClienteScreen";
import { SessionContext, SessionValue } from "../session/session-context";

const prestamo = {
  id: 1,
  rutaId: 6,
  clienteId: 2,
  valor: 1000,
  numCuotas: 4,
  tipoInteres: 20,
  diasEntreCuotas: 7,
  fechaOtorgado: "2026-08-01",
  estatus: "vigente" as const,
  cuotas: [
    {
      id: 10,
      numeroCuota: 1,
      valorEsperado: 300,
      fechaVencimiento: "2026-08-08",
      estatus: "pendiente" as const,
    },
  ],
};

const tarjeta = {
  clienteId: 2,
  rutaId: 6,
  nombre: "Juan",
  negocio: null,
  telefonoWhatsapp: "+59170000000",
  color: "azul" as const,
  fotoUrl: null,
  tipoPago: null,
  saldoPendiente: 300,
  diasMora: 0,
};

async function renderConApi(api: Partial<SessionValue["api"]>) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "C", apellido: "L" },
    loading: false,
    api: {
      tarjeta: jest.fn().mockResolvedValue(tarjeta),
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamo]),
      ...api,
    } as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate: jest.fn() } as never;
  return render(
    <SessionContext.Provider value={valor}>
      <ClienteScreen
        navigation={navigation}
        route={{
          key: "cliente",
          name: "Cliente",
          params: { rutaId: 6, clienteId: 2, nombre: "Juan" },
        }}
      />
    </SessionContext.Provider>,
  );
}

describe("ClienteScreen", () => {
  it("registra un abono parcial con tipoPago abono sin cuotaId", async () => {
    const registrarVisitaPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId } = await renderConApi({ registrarVisitaPago });

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.press(getByTestId("tipo-abono"));
    await fireEvent.changeText(getByTestId("pago-valor"), "100");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(registrarVisitaPago).toHaveBeenCalledWith(6, {
        prestamoId: 1,
        clienteId: 2,
        resultado: "pago",
        tipoPago: "abono",
        cuotaId: undefined,
        valor: 100,
        metodoPago: "efectivo",
      }),
    );
  });

  it("registra una visita no-pago con promesa de pago (compromiso_de_pago)", async () => {
    const registrarVisitaNoPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId, getByText } = await renderConApi({
      registrarVisitaNoPago,
    });

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByText("compromiso_de_pago"));
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await fireEvent.changeText(getByTestId("fecha-prometida"), manana);
    await fireEvent.changeText(getByTestId("valor-prometido"), "150");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(registrarVisitaNoPago).toHaveBeenCalledWith(6, {
        prestamoId: 1,
        clienteId: 2,
        resultado: "no_pago",
        motivoNoPago: "compromiso_de_pago",
        fechaPrometida: manana,
        valorPrometido: 150,
      }),
    );
  });

  it("exige fecha prometida para compromiso de pago", async () => {
    const registrarVisitaNoPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId, getByText, getByTestId: getByTestId2 } =
      await renderConApi({ registrarVisitaNoPago });

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByText("compromiso_de_pago"));
    await fireEvent.press(getByTestId2("guardar-visita"));

    await waitFor(() =>
      expect(getByText("Para compromiso de pago se requiere la fecha prometida.")).toBeTruthy(),
    );
    expect(registrarVisitaNoPago).not.toHaveBeenCalled();
  });
});