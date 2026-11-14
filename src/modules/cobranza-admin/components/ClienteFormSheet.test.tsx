jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ClienteFormSheet } from "./ClienteFormSheet";
import type { ClientRow, PortfolioRow } from "../api";

const CARTERAS: PortfolioRow[] = [
  {
    id: "car-1",
    nombre: "Cartera Norte",
    descripcion: null,
    gestor: null,
    gestor_id: null,
    tipo_interes: 0,
    num_cuotas: 0,
    moneda: "COP",
    estatus: "activo",
    costo_cobro: 0,
  },
];

const CLIENTE: ClientRow = {
  id: "c-1",
  nombre: "Juana",
  apellido: "Pérez",
  telefono: "3001112233",
  tipo_documento: "cc",
  numero_documento: "123",
  negocio: "Tienda",
  cartera: "Cartera Norte",
  cartera_id: "car-1",
  tope_maximo_deuda: "100000",
  color_riesgo: "blanco",
};

function montar(extra: Partial<React.ComponentProps<typeof ClienteFormSheet>> = {}) {
  return render(
    <ClienteFormSheet
      visible
      onClose={jest.fn()}
      carteras={CARTERAS}
      onGuardado={jest.fn()}
      {...extra}
    />,
  );
}

describe("ClienteFormSheet", () => {
  const mockPost = jest.fn();
  const mockPut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({
      get: jest.fn(),
      post: mockPost,
      put: mockPut,
      patch: jest.fn(),
      del: jest.fn(),
    });
  });

  it("crea un cliente con la cartera elegida", async () => {
    const onGuardado = jest.fn();
    mockPost.mockResolvedValue({ ...CLIENTE, id: "c-2" });
    const { getByTestId } = await montar({ onGuardado });
    await fireEvent.changeText(getByTestId("cliente-form-nombre"), "Ana");
    await fireEvent.changeText(getByTestId("cliente-form-apellido"), "Gómez");
    await fireEvent.changeText(getByTestId("cliente-form-telefono"), "3100000000");
    await fireEvent.press(getByTestId("cliente-form-cartera-car-1"));
    await fireEvent.press(getByTestId("cliente-form-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/pack/cobranza/clients",
        expect.objectContaining({
          nombre: "Ana",
          apellido: "Gómez",
          telefono: "3100000000",
          cartera_id: "car-1",
          color_riesgo: "blanco",
        }),
      ),
    );
    expect(onGuardado).toHaveBeenCalledWith(expect.objectContaining({ id: "c-2" }));
  });

  it("edita un cliente con PUT y conserva sus datos", async () => {
    mockPut.mockResolvedValue(CLIENTE);
    const { getByTestId } = await montar({ cliente: CLIENTE });
    expect(getByTestId("cliente-form-nombre").props.value).toBe("Juana");
    await fireEvent.changeText(getByTestId("cliente-form-negocio"), "Tienda nueva");
    await fireEvent.press(getByTestId("cliente-form-guardar"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/pack/cobranza/clients/c-1",
        expect.objectContaining({ nombre: "Juana", negocio: "Tienda nueva" }),
      ),
    );
  });
});
