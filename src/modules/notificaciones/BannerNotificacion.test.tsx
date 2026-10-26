import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BannerNotificacion, type AvisoBanner } from "./BannerNotificacion";

const aviso = (extra: Partial<AvisoBanner> = {}): AvisoBanner => ({
  id: "n1",
  titulo: "Nueva escalación",
  cuerpo: "Un cliente pidió atención humana.",
  categoria: "conversaciones",
  severidad: "critical",
  datos: { category: "conversaciones", target: { entity: "conversacion", id: "c1", section: "escalations" } },
  ...extra,
});

const metrics = { frame: { x: 0, y: 0, width: 360, height: 800 }, insets: { top: 24, left: 0, right: 0, bottom: 0 } };

function montar(props: Partial<React.ComponentProps<typeof BannerNotificacion>> = {}) {
  const onAbrir = jest.fn();
  const onCerrar = jest.fn();
  const ui = (a: AvisoBanner | null) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <BannerNotificacion aviso={a} onAbrir={onAbrir} onCerrar={onCerrar} {...props} />
    </SafeAreaProvider>
  );
  return { onAbrir, onCerrar, ui };
}

describe("BannerNotificacion (push con la app abierta)", () => {
  it("muestra título, cuerpo y la etiqueta accesible con categoría y severidad", async () => {
    const { ui } = montar();
    await render(ui(aviso()));
    expect(screen.getByText("Nueva escalación")).toBeTruthy();
    expect(screen.getByText("Un cliente pidió atención humana.")).toBeTruthy();
    expect(screen.getByLabelText(/Nueva escalación\. Conversaciones\. Urgente/)).toBeTruthy();
  });

  it("tocarlo entrega el aviso para navegar", async () => {
    const { ui, onAbrir } = montar();
    await render(ui(aviso()));
    await fireEvent.press(screen.getByRole("button", { name: /Nueva escalación/ }));
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: "n1" }));
  });

  it("la X lo cierra", async () => {
    const { ui, onCerrar } = montar();
    await render(ui(aviso()));
    await fireEvent.press(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("se cierra solo pasado el tiempo en pantalla", async () => {
    const { ui, onCerrar } = montar({ duracionMs: 30 });
    await render(ui(aviso()));
    await waitFor(() => expect(onCerrar).toHaveBeenCalledTimes(1));
  });

  it("al salir sigue montado mientras anima y luego se desmonta (cierre animado)", async () => {
    const { ui } = montar();
    const { rerender } = await render(ui(aviso()));
    expect(screen.getByText("Nueva escalación")).toBeTruthy();

    await rerender(ui(null));
    expect(screen.getByText("Nueva escalación")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Nueva escalación")).toBeNull());
  });

  it("un aviso nuevo reemplaza al anterior", async () => {
    const { ui } = montar();
    const { rerender } = await render(ui(aviso()));
    await rerender(ui(aviso({ id: "n2", titulo: "Pedido nuevo", categoria: "ventas", severidad: "success" })));
    expect(screen.getByText("Pedido nuevo")).toBeTruthy();
    expect(screen.queryByText("Nueva escalación")).toBeNull();
  });

  it("sin aviso no pinta nada", async () => {
    const { ui } = montar();
    await render(ui(null));
    expect(screen.queryByTestId("banner-notificacion")).toBeNull();
  });
});
