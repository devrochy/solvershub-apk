import { Alert, Linking } from "react-native";
import { ofrecerAbrirAjustes } from "./permisos";

jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);

describe("ofrecerAbrirAjustes (REQ-APK-016)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("no hace nada si el permiso está concedido", () => {
    ofrecerAbrirAjustes({ granted: true }, "x");
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("no ofrece Ajustes si todavía se puede volver a preguntar", () => {
    ofrecerAbrirAjustes({ granted: false, canAskAgain: true }, "x");
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("ofrece Ajustes si el permiso quedó bloqueado", () => {
    ofrecerAbrirAjustes({ granted: false, canAskAgain: false }, "Necesito la cámara.");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Permiso bloqueado",
      "Necesito la cámara.",
      expect.any(Array),
    );
  });
});
