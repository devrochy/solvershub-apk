/**
 * Test de tipos: lo verifica `npm run typecheck` (tsc), no Jest. Si alguna de
 * las líneas marcadas con `@ts-expect-error` deja de ser un error, tsc falla.
 */
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";
import { IconButton } from "./IconButton";

const noop = () => undefined;

export const casosValidos = [
  <Badge key="1" label="Borrador" />,
  <Badge key="2" tone="accent" label="Nuevo" />,
  <Badge key="3" tone="success" icon="check-circle" label="Pagado" />,
  <EmptyState key="4" icon="inbox" title="Sin pagos" action={{ label: "Registrar", onPress: noop }} />,
  <EmptyState key="5" icon="inbox" title="Sin pagos" secondaryAction={{ label: "Ver ayuda", onPress: noop }} />,
];

export const casosInvalidos = [
  // Con tono de estado el ícono es obligatorio: el color nunca va solo.
  // @ts-expect-error falta `icon` en un Badge de estado
  <Badge key="a" tone="success" label="Pagado" />,
  // @ts-expect-error falta `icon` en un Badge de estado
  <Badge key="b" tone="danger" label="En mora" />,
  // @ts-expect-error IconButton sin label (nombre accesible obligatorio)
  <IconButton key="c" icon="close" onPress={noop} />,
  // @ts-expect-error EmptyState siempre ofrece una acción
  <EmptyState key="d" icon="inbox" title="Sin pagos" />,
];

describe("tipos del kit", () => {
  it("los casos de tipos compilan (ver tsc)", () => {
    expect(casosValidos).toHaveLength(5);
    expect(casosInvalidos).toHaveLength(4);
  });
});
