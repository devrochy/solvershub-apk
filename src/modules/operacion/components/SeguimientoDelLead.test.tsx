jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import type { CampoEditable } from "../api";
import { SeguimientoDelLead } from "./SeguimientoDelLead";

function editables(nota = "", fecha = ""): CampoEditable[] {
  return [
    { plugin_id: "pack_commerce", key: "seguimiento_nota", label: "Próxima acción", tipo: "texto", max_length: 200, value: nota },
    { plugin_id: "pack_commerce", key: "seguimiento_en", label: "Fecha de seguimiento", tipo: "fecha", max_length: 32, value: fecha },
  ];
}

describe("SeguimientoDelLead (HU-CRM-21)", () => {
  const patch = jest.fn();
  const post = jest.fn();
  const onGuardado = jest.fn();
  const onRecargar = jest.fn();

  function montar(props: Partial<React.ComponentProps<typeof SeguimientoDelLead>> = {}) {
    return render(
      <SeguimientoDelLead
        clienteId="c-1"
        editables={editables()}
        extras={{}}
        tieneLead
        puedeEditar
        onGuardado={onGuardado}
        onRecargar={onRecargar}
        {...props}
      />,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({ get: jest.fn(), post, put: jest.fn(), patch, del: jest.fn() });
  });

  it("sin seguimiento ofrece programar, y lo programa con la hora del negocio", async () => {
    patch.mockResolvedValue({ id: "c-1" });
    const { getByTestId, queryByTestId } = await montar();
    expect(getByTestId("seguimiento-vacio")).toBeTruthy();
    expect(queryByTestId("seguimiento-hecho")).toBeNull();
    await fireEvent.press(getByTestId("seguimiento-editar"));
    await fireEvent.changeText(getByTestId("seguimiento-input-nota"), "Llamar para cerrar");
    await fireEvent.press(getByTestId("seguimiento-guardar"));
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    const [ruta, cuerpo] = patch.mock.calls[0];
    expect(ruta).toBe("/admin/leads/c-1/pack/pack_commerce");
    expect(cuerpo.valores.seguimiento_nota).toBe("Llamar para cerrar");
    expect(cuerpo.valores.seguimiento_en).toMatch(/^\d{4}-\d{2}-\d{2}T09:00$/);
    await waitFor(() => expect(onGuardado).toHaveBeenCalledWith({ id: "c-1" }));
  });

  it("muestra la próxima acción con su insignia de estado y la hora del negocio", async () => {
    const { getByTestId, getByText } = await montar({
      editables: editables("Llamar para confirmar", "2026-11-03T09:00"),
      extras: { seguimiento_en: "2026-11-03T14:00:00+00:00", seguimiento_estado: "vencidos" },
    });
    expect(getByTestId("seguimiento-nota").props.children).toBe("Llamar para confirmar");
    expect(getByText("Vencido")).toBeTruthy();
    expect(getByTestId("seguimiento-fecha").props.children.join("")).toMatch(/9:00.*hora del negocio/);
  });

  it("quitar manda la fecha vacía", async () => {
    patch.mockResolvedValue({ id: "c-1" });
    const { getByTestId } = await montar({ editables: editables("Llamar", "2026-11-03T09:00") });
    await fireEvent.press(getByTestId("seguimiento-quitar"));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/leads/c-1/pack/pack_commerce", { valores: { seguimiento_en: "" } }),
    );
  });

  it("sin conexión conserva lo escrito y avisa, sin perderlo en silencio", async () => {
    patch.mockRejectedValue(new Error("Network request failed"));
    const { getByTestId, findByTestId } = await montar();
    await fireEvent.press(getByTestId("seguimiento-editar"));
    await fireEvent.changeText(getByTestId("seguimiento-input-nota"), "Mandar la propuesta");
    await fireEvent.press(getByTestId("seguimiento-guardar"));
    const aviso = await findByTestId("seguimiento-error");
    expect(aviso.props.children).toMatch(/Revisa tu conexión/);
    expect(getByTestId("seguimiento-input-nota").props.value).toBe("Mandar la propuesta");
    expect(onGuardado).not.toHaveBeenCalled();
  });

  it("un rechazo del servidor muestra su motivo", async () => {
    patch.mockRejectedValue(new AdminApiError(422, "invalid", "La fecha no es válida."));
    const { getByTestId, findByTestId } = await montar();
    await fireEvent.press(getByTestId("seguimiento-editar"));
    await fireEvent.press(getByTestId("seguimiento-guardar"));
    expect((await findByTestId("seguimiento-error")).props.children).toBe("La fecha no es válida.");
  });

  it("marcar como hecho cierra el seguimiento y recarga la ficha", async () => {
    post.mockResolvedValue(undefined);
    const { getByTestId } = await montar({ editables: editables("Llamar", "2026-11-03T09:00") });
    await fireEvent.press(getByTestId("seguimiento-hecho"));
    await fireEvent.press(getByTestId("seguimiento-confirmar-hecho"));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/pack/commerce/leads/c-1/seguimiento/hecho", {}));
    await waitFor(() => expect(onRecargar).toHaveBeenCalled());
  });

  it("hecho con siguiente programa el siguiente en el mismo gesto", async () => {
    post.mockResolvedValue(undefined);
    const { getByTestId } = await montar({ editables: editables("Llamar", "2026-11-03T09:00") });
    await fireEvent.press(getByTestId("seguimiento-hecho"));
    await fireEvent.press(getByTestId("seguimiento-con-siguiente"));
    await fireEvent.changeText(getByTestId("seguimiento-siguiente-nota"), "Enviar contrato");
    await fireEvent.press(getByTestId("seguimiento-confirmar-hecho"));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [ruta, cuerpo] = post.mock.calls[0];
    expect(ruta).toBe("/pack/commerce/leads/c-1/seguimiento/hecho");
    expect(cuerpo.siguiente_nota).toBe("Enviar contrato");
    expect(cuerpo.siguiente_en).toMatch(/^\d{4}-\d{2}-\d{2}T09:00$/);
  });

  it("sin permiso de escritura solo se ve", async () => {
    const { getByTestId, queryByTestId } = await montar({
      puedeEditar: false,
      editables: editables("Llamar", "2026-11-03T09:00"),
    });
    expect(getByTestId("seguimiento-nota")).toBeTruthy();
    expect(queryByTestId("seguimiento-editar")).toBeNull();
    expect(queryByTestId("seguimiento-hecho")).toBeNull();
    expect(queryByTestId("seguimiento-quitar")).toBeNull();
  });

  it("si el backend no trae los campos del seguimiento, no se muestra la tarjeta", async () => {
    const { queryByTestId } = await montar({ editables: [] });
    expect(queryByTestId("seguimiento-lead")).toBeNull();
  });
});
