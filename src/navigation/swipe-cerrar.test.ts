import { Animated, Dimensions } from "react-native";
import { debeCerrarConSwipe, crearPanResponderCerrar } from "./swipe-cerrar";

const anchoPantalla = Dimensions.get("window").width;

function valorDe(animated: Animated.Value): number {
  let valor = 0;
  animated.stopAnimation((v) => {
    valor = v;
  });
  return valor;
}

function espiaTiming() {
  return jest.spyOn(Animated, "timing").mockReturnValue({
    start: jest.fn((cb?: (result: { finished: boolean }) => void) =>
      cb?.({ finished: true }),
    ),
  } as never);
}

function espiaSpring() {
  return jest.spyOn(Animated, "spring").mockReturnValue({
    start: jest.fn(),
  } as never);
}

describe("debeCerrarConSwipe", () => {
  it("cierra cuando el swipe a la derecha supera el umbral", () => {
    expect(debeCerrarConSwipe(150)).toBe(true);
    expect(debeCerrarConSwipe(121)).toBe(true);
  });

  it("NO cierra con swipe corto, en el umbral exacto o hacia la izquierda", () => {
    expect(debeCerrarConSwipe(120)).toBe(false);
    expect(debeCerrarConSwipe(40)).toBe(false);
    expect(debeCerrarConSwipe(-50)).toBe(false);
  });
});

describe("crearPanResponderCerrar", () => {
  let translateX: Animated.Value;

  beforeEach(() => {
    translateX = new Animated.Value(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("anima hacia fuera de pantalla y llama onCerrar al terminar cuando el swipe supera el umbral", () => {
    const timing = espiaTiming();
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({ onCerrar, translateX });

    config.onPanResponderRelease({} as never, { dx: 200 });

    expect(timing).toHaveBeenCalledWith(
      translateX,
      expect.objectContaining({
        toValue: anchoPantalla,
        duration: 200,
        useNativeDriver: true,
      }),
    );
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("anima hacia el anchoSalida indicado cuando se pasa explícitamente", () => {
    const timing = espiaTiming();
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({
      onCerrar,
      translateX,
      anchoSalida: 500,
    });

    config.onPanResponderRelease({} as never, { dx: 200 });

    expect(timing).toHaveBeenCalledWith(
      translateX,
      expect.objectContaining({ toValue: 500 }),
    );
  });

  it("con animarSalida=false llama onCerrar directo sin animar la salida", () => {
    const timing = espiaTiming();
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({
      onCerrar,
      translateX,
      animarSalida: false,
    });

    config.onPanResponderMove({} as never, { dx: 200 });
    config.onPanResponderRelease({} as never, { dx: 200 });

    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(timing).not.toHaveBeenCalled();
  });

  it("NO cierra con swipe corto o hacia la izquierda y devuelve con spring", () => {
    const spring = espiaSpring();
    const timing = espiaTiming();
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({ onCerrar, translateX });

    config.onPanResponderRelease({} as never, { dx: 30 });
    config.onPanResponderRelease({} as never, { dx: -40 });

    expect(onCerrar).not.toHaveBeenCalled();
    expect(spring).toHaveBeenCalledWith(
      translateX,
      expect.objectContaining({ toValue: 0 }),
    );
    expect(timing).not.toHaveBeenCalled();
  });

  it("mueve translateX mientras el swipe es a la derecha", () => {
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({ onCerrar, translateX });

    config.onPanResponderMove({} as never, { dx: 90 });

    expect(valorDe(translateX)).toBe(90);
  });

  it("no desplaza al mover hacia la izquierda", () => {
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({ onCerrar, translateX });

    config.onPanResponderMove({} as never, { dx: -60 });

    expect(valorDe(translateX)).toBe(0);
  });

  it("clampea el desplazamiento al anchoSalida (no excede la pantalla)", () => {
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({
      onCerrar,
      translateX,
      anchoSalida: 400,
    });

    config.onPanResponderMove({} as never, { dx: 800 });

    expect(valorDe(translateX)).toBe(400);
  });

  it("solo concede el responder a movimientos horizontales a la derecha", () => {
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({ onCerrar, translateX });

    expect(
      config.onMoveShouldSetPanResponder({} as never, { dx: 25, dy: 2 }),
    ).toBe(true);
    expect(
      config.onMoveShouldSetPanResponder({} as never, { dx: 5, dy: 2 }),
    ).toBe(false);
    expect(
      config.onMoveShouldSetPanResponder({} as never, { dx: 40, dy: 80 }),
    ).toBe(false);
    expect(
      config.onMoveShouldSetPanResponder({} as never, { dx: -40, dy: 2 }),
    ).toBe(false);
  });

  it("al terminar el gesto devuelve con spring y NO cierra", () => {
    const spring = espiaSpring();
    const onCerrar = jest.fn();
    const { config } = crearPanResponderCerrar({ onCerrar, translateX });

    config.onPanResponderMove({} as never, { dx: 80 });
    config.onPanResponderTerminate();

    expect(spring).toHaveBeenCalledWith(
      translateX,
      expect.objectContaining({ toValue: 0 }),
    );
    expect(onCerrar).not.toHaveBeenCalled();
  });
});