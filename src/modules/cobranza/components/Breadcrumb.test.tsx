import { fireEvent, render } from "@testing-library/react-native";
import { Breadcrumb } from "./Breadcrumb";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  };
});

describe("Breadcrumb", () => {
  beforeEach(() => mockNavigate.mockClear());

  it("muestra Inicio y la sección actual", async () => {
    const { getByTestId, getByText } = await render(<Breadcrumb seccion="Clientes" />);

    expect(getByTestId("breadcrumb")).toBeTruthy();
    expect(getByText("Inicio")).toBeTruthy();
    expect(getByText("Clientes")).toBeTruthy();
  });

  it("navega a Main al pulsar Inicio", async () => {
    const { getByTestId } = await render(<Breadcrumb seccion="Clientes" />);

    fireEvent.press(getByTestId("breadcrumb-inicio"));

    expect(mockNavigate).toHaveBeenCalledWith("Main");
  });

  it("normaliza acentos en el testID de la sección", async () => {
    const { getByTestId } = await render(<Breadcrumb seccion="Configuración" />);

    expect(getByTestId("breadcrumb-configuracion")).toBeTruthy();
  });

  it("expone Inicio como enlace accesible", async () => {
    const { getByTestId } = await render(<Breadcrumb seccion="Clientes" />);
    const inicio = getByTestId("breadcrumb-inicio");

    expect(inicio.props.accessibilityRole).toBe("link");
    expect(inicio.props.accessibilityLabel).toBe("Ir a Inicio");
  });

  it("la sección actual no es un enlace", async () => {
    const { getByTestId } = await render(<Breadcrumb seccion="Clientes" />);
    const actual = getByTestId("breadcrumb-clientes");

    expect(actual.props.accessibilityRole).toBeUndefined();
    expect(actual.props.onPress).toBeUndefined();
  });
});
