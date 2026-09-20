import { Pressable, Text, View } from "react-native";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { CarteraFlujo } from "./CarteraFlujo";
import { MenuLateralProvider, useMenuLateral, type MenuItem } from "./menu-lateral-context";
import { CarteraActivaContext } from "../session/cartera-activa-context";
import { SessionContext, SessionValue } from "../session/session-context";

const carteraA = {
  id: 6,
  nombre: "Cartera Centro",
  estatus: "activo",
  tipoInteres: 20,
  numCuotas: 8,
  config: {} as never,
  permisos: [],
};
const carteraB = { ...carteraA, id: 7, nombre: "Cartera Sur" };

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock("./pantalla-activa-context", () => ({
  usePantallaActiva: () => ({ pantalla: null, cerrar: jest.fn() }),
}));
jest.mock("./trayectos-overlay-context", () => ({
  useTrayectosOverlay: () => ({ contenido: null, cerrar: jest.fn() }),
}));
jest.mock("./OverlaysActivos", () => ({ OverlaysActivos: () => null }));
jest.mock("../screens/CarteraDetalleScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    CarteraDetalleScreen: () =>
      React.createElement(Text, { testID: "seccion-cartera" }, "cartera"),
  };
});
jest.mock("../screens/TrayectoDiarioScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    TrayectoDiarioScreen: () =>
      React.createElement(Text, { testID: "seccion-trayecto" }, "trayecto"),
  };
});
jest.mock("../screens/ClientesScreen", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    ClientesScreen: () =>
      React.createElement(Text, { testID: "seccion-clientes" }, "clientes"),
  };
});

function ProbeItem({ item }: { item: MenuItem }) {
  if (item.grupo) {
    return (
      <View testID={`probe-grupo-${item.key}`}>
        <Text>{item.label}</Text>
        {(item.subItems ?? []).map((sub) => (
          <ProbeItem key={sub.key} item={sub} />
        ))}
      </View>
    );
  }
  return (
    <>
      <Pressable testID={`probe-${item.key}`} onPress={item.onPress}>
        <Text>{item.label}</Text>
      </Pressable>
      {(item.subItems ?? []).map((sub) => (
        <ProbeItem key={sub.key} item={sub} />
      ))}
    </>
  );
}

function Probe() {
  const { itemsExtra } = useMenuLateral();
  return (
    <>
      {itemsExtra.map((item) => (
        <ProbeItem key={item.key} item={item} />
      ))}
    </>
  );
}

let navigate: jest.Mock = jest.fn();

function renderFlujo(
  carteras = [carteraA, carteraB],
  carteraActiva: { carteraId: number; carteraNombre: string } | null = null,
) {
  navigate = jest.fn();
  const session: SessionValue = {
    gestor: { id: 20, usuario: "gestor1", nombre: "C", apellido: "L", rol: "gestor" },
    loading: false,
    api: {
      misCarteras: jest.fn().mockResolvedValue(carteras),
    } as unknown as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
  };
  return render(
    <SessionContext.Provider value={session}>
      <CarteraActivaContext.Provider
        value={{ carteraActiva: carteraActiva as never, setCarteraActiva: jest.fn() }}
      >
        <MenuLateralProvider>
          <CarteraFlujo
            route={{ key: "c", name: "Cartera", params: undefined } as never}
            navigation={{ navigate } as never}
          />
          <Probe />
        </MenuLateralProvider>
      </CarteraActivaContext.Provider>
    </SessionContext.Provider>,
  );
}

describe("CarteraFlujo", () => {
  it("abre en la sección Inicio (información)", async () => {
    const { getByTestId, queryByTestId } = await renderFlujo();

    expect(getByTestId("seccion-cartera")).toBeTruthy();
    expect(queryByTestId("seccion-clientes")).toBeNull();
  });

  it("cambia a Clientes con el filtro elegido y a Diario desde el menú", async () => {
    const { getByTestId } = await renderFlujo();

    await waitFor(() => expect(getByTestId("probe-filtro-en_mora")).toBeTruthy());
    await fireEvent.press(getByTestId("probe-filtro-en_mora"));
    expect(getByTestId("seccion-clientes")).toBeTruthy();

    await fireEvent.press(getByTestId("probe-seccion-diario"));
    expect(getByTestId("seccion-trayecto")).toBeTruthy();
  });

  it("con más de una cartera muestra el submenú Carteras con la lista", async () => {
    const { findByTestId } = await renderFlujo();

    expect(await findByTestId("probe-carteras-lista")).toBeTruthy();
    expect(await findByTestId("probe-car-6")).toBeTruthy();
    expect(await findByTestId("probe-car-7")).toBeTruthy();
  });

  it("con una sola cartera no muestra el ítem Carteras", async () => {
    const { getByTestId, queryByTestId } = await renderFlujo([carteraA]);

    await waitFor(() => expect(getByTestId("probe-seccion-inicio")).toBeTruthy());
    expect(queryByTestId("probe-carteras-lista")).toBeNull();
  });

  it("agrupa Clientes y Diario bajo el nombre de la cartera activa", async () => {
    const { findByTestId } = await renderFlujo([carteraA, carteraB], {
      carteraId: 6,
      carteraNombre: "Cartera Centro",
    });

    const grupo = await findByTestId("probe-grupo-cartera");
    expect(within(grupo).getByText("Cartera Centro")).toBeTruthy();
    expect(within(grupo).getByTestId("probe-seccion-clientes")).toBeTruthy();
    expect(within(grupo).getByTestId("probe-seccion-diario")).toBeTruthy();
  });

  it("con más de una cartera, Inicio navega a la lista (Main)", async () => {
    const { getByTestId } = await renderFlujo();

    await waitFor(() => expect(getByTestId("probe-seccion-inicio")).toBeTruthy());
    await fireEvent.press(getByTestId("probe-seccion-inicio"));

    expect(navigate).toHaveBeenCalledWith("Main");
  });

  it("con una sola cartera, Inicio muestra la información de esa cartera", async () => {
    const { getByTestId } = await renderFlujo([carteraA]);

    await waitFor(() => expect(getByTestId("probe-seccion-inicio")).toBeTruthy());
    await fireEvent.press(getByTestId("probe-seccion-inicio"));

    expect(getByTestId("seccion-cartera")).toBeTruthy();
    expect(navigate).toHaveBeenCalledWith("Cartera");
  });
});
