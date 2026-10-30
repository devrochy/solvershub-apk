import { act, fireEvent, render } from "@testing-library/react-native";
import { PresentacionScreen } from "./PresentacionScreen";

interface VideoMock {
  __player: { muted: boolean };
  __emitir(evento: string, payload?: unknown): void;
  __limpiar(): void;
}

const video = jest.requireMock("expo-video") as VideoMock;

beforeEach(() => {
  video.__limpiar();
  jest.clearAllMocks();
});

describe("PresentacionScreen", () => {
  it("muestra el video con salir y sonido", async () => {
    const { getByTestId, getByLabelText } = await render(
      <PresentacionScreen onTerminar={jest.fn()} />,
    );

    expect(getByTestId("presentacion-saltar")).toBeTruthy();
    expect(getByTestId("presentacion-sonido")).toBeTruthy();
    expect(getByLabelText("SolversHub")).toBeTruthy();
    expect(getByLabelText("Presentación de SolversHub")).toBeTruthy();
    expect(video.__player.muted).toBe(true);
  });

  it("termina al saltar", async () => {
    const onTerminar = jest.fn();
    const { getByTestId } = await render(<PresentacionScreen onTerminar={onTerminar} />);

    await fireEvent.press(getByTestId("presentacion-saltar"));

    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("termina cuando el video llega al final", async () => {
    const onTerminar = jest.fn();
    await render(<PresentacionScreen onTerminar={onTerminar} />);

    await act(async () => video.__emitir("playToEnd"));

    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("si el video falla, sigue al login", async () => {
    const onTerminar = jest.fn();
    await render(<PresentacionScreen onTerminar={onTerminar} />);

    await act(async () => video.__emitir("statusChange", { status: "error" }));

    expect(onTerminar).toHaveBeenCalledTimes(1);
  });

  it("alterna el sonido sin repetir el cierre", async () => {
    const onTerminar = jest.fn();
    const { getByTestId } = await render(<PresentacionScreen onTerminar={onTerminar} />);

    await fireEvent.press(getByTestId("presentacion-sonido"));
    expect(video.__player.muted).toBe(false);

    await fireEvent.press(getByTestId("presentacion-sonido"));
    expect(video.__player.muted).toBe(true);
    expect(onTerminar).not.toHaveBeenCalled();
  });
});
