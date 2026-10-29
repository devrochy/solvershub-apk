import { fireEvent, render } from "@testing-library/react-native";
import { ClienteCard } from "./ClienteCard";
import type { LeadRow } from "../api";

const ITEM: LeadRow = {
  id: "l-1",
  cliente: "Juana Pérez",
  canal: "whatsapp",
  telefono: "+57 300 111 2233",
  bot_paused: false,
  alta: "2026-10-01",
  extras: {},
  agentes: ["general", "ventas"],
  perfil: {
    nombre_visible: "Juana Pérez",
    alias: "Juanita",
    phone_indicativo: "+57",
    phone_local: "300 111 2233",
    municipio: "Bogotá",
    departamento: "Cundinamarca",
    clasificacion: "vip",
    clasificacion_label: "VIP",
    mapa_url: "https://maps.example.com/1",
  },
} as LeadRow;

const AGENTES = [
  { key: "general", name: "General", columns: [] },
  { key: "ventas", name: "Ventas", columns: [] },
  { key: "agenda", name: "Agenda", columns: [] },
];

function tarjeta(extra: Partial<React.ComponentProps<typeof ClienteCard>> = {}) {
  return render(
    <ClienteCard
      item={ITEM}
      agentes={AGENTES}
      puedeEscribir
      puedeEnviarPlantilla
      onAbrir={jest.fn()}
      onEditar={jest.fn()}
      onAlternarBot={jest.fn()}
      onEnviarPlantilla={jest.fn()}
      {...extra}
    />,
  );
}

describe("ClienteCard (CRM)", () => {
  it("muestra nombre, alias, clasificación, teléfono y agentes", async () => {
    const { getByText, getByTestId } = await tarjeta();
    expect(getByText("Juana Pérez")).toBeTruthy();
    expect(getByText("Alias: Juanita")).toBeTruthy();
    expect(getByText("VIP")).toBeTruthy();
    expect(getByText("+57 300 111 2233")).toBeTruthy();
    expect(getByText("Bogotá, Cundinamarca")).toBeTruthy();
    expect(getByTestId("lead-l-1").props.accessibilityLabel).toContain("Agentes: General, Ventas");
  });

  it("muestra la clasificación Nuevo", async () => {
    const { getByText } = await tarjeta({
      item: {
        ...ITEM,
        perfil: { ...ITEM.perfil!, clasificacion: "nuevo", clasificacion_label: "Nuevo" },
      },
    });
    expect(getByText("Nuevo")).toBeTruthy();
  });

  it("abre la ficha al tocar la tarjeta", async () => {
    const onAbrir = jest.fn();
    const { getByTestId } = await tarjeta({ onAbrir });
    await fireEvent.press(getByTestId("lead-l-1"));
    expect(onAbrir).toHaveBeenCalledTimes(1);
  });

  it("pausa el bot desde la tarjeta sin abrir la ficha", async () => {
    const onAbrir = jest.fn();
    const onAlternarBot = jest.fn();
    const { getByTestId } = await tarjeta({ onAbrir, onAlternarBot });
    await fireEvent.press(getByTestId("lead-bot-l-1"));
    expect(onAlternarBot).toHaveBeenCalledTimes(1);
    expect(onAbrir).not.toHaveBeenCalled();
  });

  it("edita y envía plantilla solo si hay permiso", async () => {
    const onEditar = jest.fn();
    const onEnviarPlantilla = jest.fn();
    const { getByTestId } = await tarjeta({ onEditar, onEnviarPlantilla });
    await fireEvent.press(getByTestId("lead-editar-l-1"));
    await fireEvent.press(getByTestId("lead-plantilla-l-1"));
    expect(onEditar).toHaveBeenCalled();
    expect(onEnviarPlantilla).toHaveBeenCalled();

    const { queryByTestId: sinPermiso } = await tarjeta({ puedeEscribir: false, puedeEnviarPlantilla: false });
    expect(sinPermiso("lead-editar-l-1")).toBeNull();
    expect(sinPermiso("lead-plantilla-l-1")).toBeNull();
  });
});
