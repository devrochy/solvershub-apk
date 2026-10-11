import { fireEvent, render, screen } from "@testing-library/react-native";
import { SyncStatus, textoSyncStatus } from "./SyncStatus";
import { areaTactil } from "./test-utils";

describe("textoSyncStatus", () => {
  it.each([
    ["online", 0, "Sincronizado"],
    ["online", 2, "En línea · 2 cambios por enviar"],
    ["offline", 0, "Sin conexión"],
    ["offline", 3, "Sin conexión · 3 cambios por enviar"],
    ["offline", 1, "Sin conexión · 1 cambio por enviar"],
    ["syncing", 0, "Sincronizando…"],
    ["syncing", 4, "Enviando 4 cambios…"],
    ["error", 0, "No se pudo sincronizar"],
    ["error", 3, "No se pudo sincronizar · 3 cambios por enviar"],
  ] as const)("%s con %i pendientes → %p", (estado, pendientes, esperado) => {
    expect(textoSyncStatus(estado, pendientes)).toBe(esperado);
  });
});

describe("SyncStatus (kit)", () => {
  it("offline: texto + ícono (el color no va solo) en una región viva", async () => {
    await render(<SyncStatus state="offline" pending={3} testID="sync" />);
    expect(screen.getByText("Sin conexión · 3 cambios por enviar")).toBeTruthy();
    expect(screen.getByTestId("icono-cloud-off")).toBeTruthy();
    expect(screen.getByTestId("sync").props.accessibilityLiveRegion).toBe("polite");
  });

  it("error con onRetry: es un botón de 48 dp que reintenta", async () => {
    const onRetry = jest.fn();
    await render(<SyncStatus state="error" pending={2} onRetry={onRetry} />);
    const boton = screen.getByRole("button", {
      name: "No se pudo sincronizar · 2 cambios por enviar. Reintentar",
    });
    expect(screen.getByText("Reintentar")).toBeTruthy();
    expect(areaTactil(boton).alto).toBeGreaterThanOrEqual(48);
    await fireEvent.press(boton);
    expect(onRetry).toHaveBeenCalled();
  });

  it("syncing: ocupado", async () => {
    await render(<SyncStatus state="syncing" testID="sync" />);
    expect(screen.getByTestId("sync")).toBeBusy();
  });
});
