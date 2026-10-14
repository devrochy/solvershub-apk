import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { usePestanaInicial, type SolicitudPestana } from "./pestana-inicial";

const VALIDAS = ["resumen", "pedidos", "productos"] as const;

function Probe({ solicitud }: { solicitud?: SolicitudPestana }) {
  const [pestana, setPestana] = usePestanaInicial<(typeof VALIDAS)[number]>("resumen", VALIDAS, solicitud);
  return (
    <Pressable testID="a-productos" onPress={() => setPestana("productos")}>
      <Text testID="pestana">{pestana}</Text>
    </Pressable>
  );
}

describe("usePestanaInicial", () => {
  it("sin solicitud arranca en la pestaña por defecto y el setter local sigue funcionando", async () => {
    const { getByTestId } = await render(<Probe />);
    expect(getByTestId("pestana").props.children).toBe("resumen");
    await fireEvent.press(getByTestId("a-productos"));
    expect(getByTestId("pestana").props.children).toBe("productos");
  });

  it("abre en la pestaña pedida y vuelve a aplicarla con un pedido nuevo aunque sea la misma", async () => {
    const { getByTestId, rerender } = await render(<Probe solicitud={{ pestana: "pedidos", n: 1 }} />);
    expect(getByTestId("pestana").props.children).toBe("pedidos");

    // El usuario cambia a mano…
    await fireEvent.press(getByTestId("a-productos"));
    expect(getByTestId("pestana").props.children).toBe("productos");

    // …y vuelve a tocar «Pedidos» en el cajón: mismo destino, otro `n`.
    await rerender(<Probe solicitud={{ pestana: "pedidos", n: 2 }} />);
    expect(getByTestId("pestana").props.children).toBe("pedidos");

    // El mismo pedido (mismo `n`) no pisa lo que el usuario eligió después.
    await fireEvent.press(getByTestId("a-productos"));
    await rerender(<Probe solicitud={{ pestana: "pedidos", n: 2 }} />);
    expect(getByTestId("pestana").props.children).toBe("productos");
  });

  it("ignora una pestaña que no está entre las válidas (p. ej. sin permiso)", async () => {
    const { getByTestId, rerender } = await render(<Probe solicitud={{ pestana: "auditoria", n: 1 }} />);
    expect(getByTestId("pestana").props.children).toBe("resumen");
    await rerender(<Probe solicitud={{ pestana: "auditoria", n: 2 }} />);
    expect(getByTestId("pestana").props.children).toBe("resumen");
  });
});
