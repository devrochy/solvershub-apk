import { fireEvent, render, screen } from "@testing-library/react-native";
import { CentroSheet } from "./CentroSheet";
import type { NotificacionItem } from "./tipos";
import type { EstadoCentro } from "./use-centro";

const item = (over: Partial<NotificacionItem>): NotificacionItem =>
  ({
    id: "n1",
    title: "Cliente esperando",
    body: "Ana pidió hablar con una persona",
    category: "conversaciones",
    severity: "critical",
    read: false,
    created_at: new Date().toISOString(),
    target: { entity: "conversacion", id: "c1", section: "escalations" },
    data: {},
    ...over,
  }) as NotificacionItem;

function estado(over: Partial<EstadoCentro> = {}): EstadoCentro {
  return {
    noLeidas: 1,
    items: [item({})],
    siguiente: null,
    cargando: false,
    conocidas: new Set(["n1"]),
    ahora: new Date(),
    fallo: false,
    pestana: "todas",
    setPestana: jest.fn(),
    categoria: null,
    setCategoria: jest.fn(),
    preferencias: null,
    cargarPreferencias: jest.fn(),
    cargarMas: jest.fn(),
    recargar: jest.fn(),
    refrescarContador: jest.fn(),
    marcarLeida: jest.fn(),
    marcarTodas: jest.fn(),
    archivar: jest.fn(),
    guardarPushApagado: jest.fn(),
    silenciar: jest.fn(),
    ...over,
  } as unknown as EstadoCentro;
}

describe("CentroSheet (ADR-0167)", () => {
  it("lista las notificaciones con su categoría y abre la tocada", async () => {
    const onAbrir = jest.fn();
    await render(<CentroSheet visible onClose={jest.fn()} n={estado()} onAbrirNotificacion={onAbrir} />);
    expect(screen.getByText("Cliente esperando")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /^No leída\. Cliente esperando/ }));
    expect(onAbrir).toHaveBeenCalledWith(expect.objectContaining({ id: "n1" }));
  });

  it("sin notificaciones muestra un estado vacío con acción", async () => {
    await render(
      <CentroSheet visible onClose={jest.fn()} n={estado({ items: [], noLeidas: 0 })} onAbrirNotificacion={jest.fn()} />,
    );
    expect(screen.getByText("Aún no hay notificaciones")).toBeTruthy();
  });

  it("marcar todas y archivar llaman al estado", async () => {
    const n = estado();
    await render(<CentroSheet visible onClose={jest.fn()} n={n} onAbrirNotificacion={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("marcar-todas"));
    expect(n.marcarTodas).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId("archivar-n1"));
    expect(n.archivar).toHaveBeenCalledWith("n1");
  });

  it("cambia de pestaña y abre las preferencias", async () => {
    const n = estado();
    await render(<CentroSheet visible onClose={jest.fn()} n={n} onAbrirNotificacion={jest.fn()} />);
    await fireEvent.press(screen.getByTestId("pestana-no_leidas"));
    expect(n.setPestana).toHaveBeenCalledWith("no_leidas");
    await fireEvent.press(screen.getByTestId("abrir-preferencias"));
    expect(n.cargarPreferencias).toHaveBeenCalled();
    expect(screen.getByText("Preferencias")).toBeTruthy();
  });
});
