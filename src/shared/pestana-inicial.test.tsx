import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import {
  usePestanaInicial,
  usePestanasDeEntrada,
  type EntradaPestanas,
  type SolicitudPestana,
} from "./pestana-inicial";

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

function ProbeEntrada({ solicitud, entrada }: { solicitud?: SolicitudPestana; entrada?: EntradaPestanas }) {
  const { pestana, propias, ajenas } = usePestanasDeEntrada<(typeof VALIDAS)[number]>(
    "comercio",
    "resumen",
    VALIDAS,
    solicitud,
    entrada,
  );
  return (
    <>
      <Text testID="pestana">{pestana}</Text>
      <Text testID="propias">{propias.join(",")}</Text>
      <Text testID="ajenas">{ajenas.map((a) => `${a.tab}/${a.pestana}`).join(",")}</Text>
    </>
  );
}

const SOLO_PEDIDOS: EntradaPestanas = {
  id: "pedidos",
  pestanas: [
    { tab: "comercio", pestana: "pedidos", label: "Pedidos" },
    { tab: "comercio", pestana: "productos", label: "Productos" },
    { tab: "herramientas", pestana: "fallos", label: "Mensajes fallidos" },
  ],
};

describe("usePestanasDeEntrada", () => {
  it("sin entrada muestra todas las pestañas de la pantalla", async () => {
    const { getByTestId } = await render(<ProbeEntrada />);
    expect(getByTestId("propias").props.children).toBe("resumen,pedidos,productos");
    expect(getByTestId("ajenas").props.children).toBe("");
  });

  it("con entrada filtra las propias, separa las de otra pantalla y arranca en la primera", async () => {
    const { getByTestId } = await render(<ProbeEntrada entrada={SOLO_PEDIDOS} />);
    expect(getByTestId("propias").props.children).toBe("pedidos,productos");
    expect(getByTestId("ajenas").props.children).toBe("herramientas/fallos");
    expect(getByTestId("pestana").props.children).toBe("pedidos");
  });

  it("si la entrada cambia sin solicitud (back) y la pestaña ya no es suya, muestra la primera", async () => {
    const { getByTestId, rerender } = await render(<ProbeEntrada solicitud={{ pestana: "resumen", n: 1 }} />);
    expect(getByTestId("pestana").props.children).toBe("resumen");
    await rerender(<ProbeEntrada solicitud={{ pestana: "resumen", n: 1 }} entrada={SOLO_PEDIDOS} />);
    expect(getByTestId("pestana").props.children).toBe("pedidos");
  });
});
