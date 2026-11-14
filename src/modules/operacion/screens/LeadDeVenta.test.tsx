jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import type { CampoEditable } from "../api";
import { LeadDeVenta } from "./LeadDeVenta";

// HU-CRM-23: en la ficha, perder un lead pide motivo (con nota opcional) y el valor estimado es un número simple.

const ETAPAS = ["nuevo", "calificado", "perdido"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
const MOTIVOS = [
  { value: "precio", label: "Precio" },
  { value: "otro", label: "Otro" },
];

function campos({ etapa = "calificado", motivo = "", nota = "", valor = "" } = {}): CampoEditable[] {
  const base = { plugin_id: "pack_commerce" };
  return [
    { ...base, key: "estado_lead", label: "Estado del lead", tipo: "opciones", options: ETAPAS, max_length: 32, value: etapa },
    { ...base, key: "motivo_perdida", label: "Motivo de pérdida", tipo: "opciones", options: MOTIVOS, max_length: 32, value: motivo },
    { ...base, key: "nota_perdida", label: "Nota de la pérdida", tipo: "texto", max_length: 300, value: nota },
    { ...base, key: "valor_estimado", label: "Valor estimado", tipo: "numero", max_length: 14, value: valor },
  ] as CampoEditable[];
}

const patch = jest.fn();
const onGuardado = jest.fn();

async function montar(props: Parameters<typeof campos>[0] = {}) {
  return render(<LeadDeVenta clienteId="c-1" pluginId="pack_commerce" campos={campos(props)} onGuardado={onGuardado} />);
}

describe("LeadDeVenta · motivo de pérdida y valor estimado", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch, del: jest.fn() });
  });

  it("oculta el motivo y la nota mientras la etapa no es perdido", async () => {
    const { queryByTestId, getByTestId } = await montar();
    expect(queryByTestId("pack-motivo_perdida-precio")).toBeNull();
    expect(queryByTestId("pack-nota_perdida")).toBeNull();
    expect(getByTestId("pack-valor_estimado")).toBeTruthy();
  });

  it("al elegir perdido pide el motivo antes de enviar", async () => {
    const { getByTestId, getByText } = await montar();
    await fireEvent.press(getByTestId("pack-estado_lead-perdido"));
    expect(getByTestId("pack-motivo_perdida-precio")).toBeTruthy();
    expect(getByTestId("pack-nota_perdida")).toBeTruthy();

    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    expect(getByText("Elige el motivo de la pérdida para marcar el lead como perdido.")).toBeTruthy();
    expect(patch).not.toHaveBeenCalled();
  });

  it("guarda etapa, motivo y nota juntos", async () => {
    patch.mockResolvedValue({ id: "c-1" });
    const { getByTestId } = await montar();
    await fireEvent.press(getByTestId("pack-estado_lead-perdido"));
    await fireEvent.press(getByTestId("pack-motivo_perdida-precio"));
    await fireEvent.changeText(getByTestId("pack-nota_perdida"), "Muy caro");
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/leads/c-1/pack/pack_commerce", {
        valores: { estado_lead: "perdido", motivo_perdida: "precio", nota_perdida: "Muy caro" },
      }),
    );
    expect(onGuardado).toHaveBeenCalled();
  });

  it("si se arrepiente de perder el lead, el motivo elegido no se envía", async () => {
    patch.mockResolvedValue({ id: "c-1" });
    const { getByTestId } = await montar();
    await fireEvent.press(getByTestId("pack-estado_lead-perdido"));
    await fireEvent.press(getByTestId("pack-motivo_perdida-precio"));
    await fireEvent.press(getByTestId("pack-estado_lead-nuevo"));
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch).toHaveBeenCalledWith("/admin/leads/c-1/pack/pack_commerce", { valores: { estado_lead: "nuevo" } });
  });

  it("un perdido de antes sin motivo deja anotarlo sin exigirlo", async () => {
    patch.mockResolvedValue({ id: "c-1" });
    const { getByTestId } = await montar({ etapa: "perdido" });
    await fireEvent.press(getByTestId("pack-motivo_perdida-otro"));
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/leads/c-1/pack/pack_commerce", { valores: { motivo_perdida: "otro" } }),
    );
  });

  it("el valor estimado usa teclado numérico y se guarda como número simple", async () => {
    patch.mockResolvedValue({ id: "c-1" });
    const { getByTestId } = await montar();
    expect(getByTestId("pack-valor_estimado").props.keyboardType).toBe("decimal-pad");
    await fireEvent.changeText(getByTestId("pack-valor_estimado"), "250000");
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/leads/c-1/pack/pack_commerce", { valores: { valor_estimado: "250000" } }),
    );
  });

  it("rechaza un valor con puntos de miles o símbolos antes de ir al servidor", async () => {
    const { getByTestId } = await montar();
    await fireEvent.changeText(getByTestId("pack-valor_estimado"), "$150.000");
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    expect(getByTestId("pack-valor_estimado-error")).toBeTruthy();
    expect(patch).not.toHaveBeenCalled();
  });

  it("muestra el motivo del servidor cuando rechaza el cambio, y un aviso genérico sin conexión", async () => {
    patch.mockRejectedValueOnce(new AdminApiError(400, "datos_invalidos", "El valor estimado admite hasta 9.999.999.999."));
    const { getByTestId, getByText } = await montar();
    await fireEvent.changeText(getByTestId("pack-valor_estimado"), "99999999999");
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    await waitFor(() => expect(getByText("El valor estimado admite hasta 9.999.999.999.")).toBeTruthy());

    patch.mockRejectedValueOnce(new TypeError("Network request failed"));
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    await waitFor(() => expect(getByText("No se pudieron guardar los cambios.")).toBeTruthy());
  });
});
