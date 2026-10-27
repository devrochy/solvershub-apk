import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@core/theme/theme-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Drawer,
  EmptyState,
  Field,
  IconButton,
  Icono,
  KpiTile,
  ListItem,
  NavGroup,
  PageHeader,
  RadioGroup,
  RecordRow,
  Sheet,
  Skeleton,
  Stepper,
  Switch,
  SyncStatus,
  TextField,
  ToastProvider,
  useKit,
  useToast,
} from "../index";

/**
 * Catálogo del kit (HU-DS-09): cada componente con sus variantes y estados en
 * el tema activo. SOLO para builds de desarrollo: el shell lo registra detrás
 * de `__DEV__`. Sirve para las capturas en claro y oscuro desde el OPPO y para
 * revisar la fuente del sistema al 200 % (nada debe cortarse ni superponerse).
 */
export function CatalogoScreen() {
  return (
    <ToastProvider>
      <Catalogo />
    </ToastProvider>
  );
}

const noop = () => undefined;

function Catalogo() {
  const { c } = useKit();
  const { tema, alternarTema } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [cajonAbierto, setCajonAbierto] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState(true);
  const [nombre, setNombre] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [avisos, setAvisos] = useState(true);
  const [tipo, setTipo] = useState<string | undefined>("soporte");
  const [cargando, setCargando] = useState(false);

  return (
    <ScrollView
      testID="catalogo-ui"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + shSpace[16] }]}
    >
      <PageHeader
        title="Catálogo del kit"
        description={`Tema ${tema} · solo en desarrollo`}
        actions={
          <IconButton
            icon={tema === "claro" ? "dark-mode" : "light-mode"}
            label={tema === "claro" ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
            onPress={alternarTema}
            testID="catalogo-tema"
          />
        }
      />

      <Seccion titulo="Button">
        <Fila>
          <Button onPress={noop}>Primario</Button>
          <Button variant="secondary" onPress={noop}>
            Secundario
          </Button>
          <Button variant="ghost" onPress={noop}>
            Fantasma
          </Button>
        </Fila>
        <Fila>
          <Button variant="danger" iconLeft="delete-outline" onPress={noop}>
            Eliminar
          </Button>
          <Button variant="link" onPress={noop}>
            Enlace
          </Button>
        </Fila>
        <Fila>
          <Button size="sm" onPress={noop}>
            Pequeño
          </Button>
          <Button size="md" onPress={noop}>
            Mediano
          </Button>
          <Button size="lg" iconRight="arrow-forward" onPress={noop}>
            Grande
          </Button>
        </Fila>
        <Fila>
          <Button
            loading={cargando}
            onPress={() => {
              setCargando(true);
              setTimeout(() => setCargando(false), 1500);
            }}
          >
            Guardar
          </Button>
          <Button disabled>Deshabilitado</Button>
          <Button variant="secondary" disabled>
            Deshabilitado
          </Button>
        </Fila>
        <Button fullWidth size="lg" iconLeft="receipt-long" onPress={noop}>
          Generar liquidación
        </Button>
      </Seccion>

      <Seccion titulo="IconButton">
        <Fila>
          <IconButton icon="search" label="Buscar" onPress={noop} />
          <IconButton icon="edit" label="Editar" tone="accent" onPress={noop} />
          <IconButton icon="delete-outline" label="Eliminar" tone="danger" onPress={noop} />
          <IconButton icon="star" label="Favorito" selected onPress={noop} />
          <IconButton icon="share" label="Compartir" disabled />
        </Fila>
      </Seccion>

      <Seccion titulo="Field + TextField">
        <Field label="Nombre del cliente" hint="Como aparece en el documento" required>
          <TextField value={nombre} onChangeText={setNombre} placeholder="Laura Martínez" />
        </Field>
        <Field label="Monto" error="Escribe un monto mayor a cero">
          <TextField value="0" keyboardType="numeric" />
        </Field>
        <Field label="Cartera">
          <TextField value="Norte" disabled />
        </Field>
      </Seccion>

      <Seccion titulo="Badge">
        <Fila>
          <Badge label="Borrador" />
          <Badge tone="accent" icon="auto-awesome" label="Nuevo" />
          <Badge tone="info" icon="info-outline" label="Programado" />
        </Fila>
        <Fila>
          <Badge tone="success" icon="check-circle" label="Al día" />
          <Badge tone="warning" icon="schedule" label="Pendiente" />
          <Badge tone="danger" icon="error-outline" label="En mora" size="md" />
        </Fila>
      </Seccion>

      <Seccion titulo="Stepper y controles">
        <Stepper
          label="Crear agente"
          steps={[
            { id: "negocio", title: "Tu negocio", state: "complete" },
            { id: "canal", title: "Canal", state: "error" },
            { id: "horario", title: "Horario", state: "current" },
            { id: "tono", title: "Tono", state: "upcoming" },
          ]}
        />
        <Checkbox label="Acepto los términos" checked={acepta} onCheckedChange={setAcepta} />
        <Switch label="Avisos por WhatsApp" description="Te escribimos un día antes" value={avisos} onValueChange={setAvisos} />
        <RadioGroup
          label="¿Para qué lo usarás?"
          value={tipo}
          onValueChange={setTipo}
          options={[
            { value: "ventas", label: "Ventas" },
            { value: "soporte", label: "Soporte", description: "Atiende dudas de clientes" },
            { value: "cobranza", label: "Cobranza", disabled: true },
          ]}
        />
      </Seccion>

      <Seccion titulo="Avatar">
        <Fila>
          <Avatar name="Laura Martínez" size="xs" />
          <Avatar name="Laura Martínez" size="sm" />
          <Avatar name="Laura Martínez" size="md" status={{ tone: "success", label: "En ruta" }} />
          <Avatar name="Pedro Gómez" size="lg" status={{ tone: "danger", label: "Sin señal" }} />
        </Fila>
      </Seccion>

      <Seccion titulo="Skeleton">
        <Fila>
          <Skeleton shape="circle" height={40} />
          <View style={styles.flex}>
            <Skeleton shape="text" lines={3} />
          </View>
        </Fila>
        <Skeleton shape="rect" height={64} />
      </Seccion>

      <Seccion titulo="KpiTile">
        <View style={styles.grilla}>
          <View style={styles.celda}>
            <KpiTile label="Recaudo" value="$ 1.250.000" delta={12} period="frente a los 7 días anteriores" />
          </View>
          <View style={styles.celda}>
            <KpiTile label="En mora" value="14" delta={8} polarity="up-bad" period="frente a ayer" onPress={noop} />
          </View>
          <View style={styles.celda}>
            <KpiTile label="Clientes" value="128" delta={0} period="frente a ayer" />
          </View>
          <View style={styles.celda}>
            <KpiTile label="Cobrado hoy" value="" loading />
          </View>
        </View>
        <KpiTile label="Visitas" value="" error="No se pudo cargar. Desliza para reintentar." />
      </Seccion>

      <Seccion titulo="ListItem / RecordRow">
        <View style={[styles.lista, { borderColor: c.border }]}>
          <ListItem
            leading={<Avatar name="Laura Martínez" />}
            title="Laura Martínez"
            subtitle="Calle 10 # 4-21"
            meta="Visita 9:30"
            badge={<Badge tone="danger" icon="error-outline" label="En mora" />}
            onPress={noop}
          />
          <ListItem title="Cartera Norte" subtitle="42 clientes" selected onPress={noop} />
          <RecordRow
            title="Pago cuota 3"
            subtitle="Laura Martínez"
            value="$ 120.000"
            valueTone="success"
            badge={<Badge tone="warning" icon="cloud-upload" label="Pendiente" />}
            onPress={noop}
          />
          <ListItem title="Solo lectura" subtitle="Sin acción" />
        </View>
      </Seccion>

      <Seccion titulo="SyncStatus">
        <SyncStatus state="online" />
        <SyncStatus state="offline" pending={3} />
        <SyncStatus state="syncing" pending={3} />
        <SyncStatus state="error" pending={3} onRetry={noop} />
      </Seccion>

      <Seccion titulo="EmptyState">
        <View style={[styles.lista, { borderColor: c.border }]}>
          <EmptyState
            icon="people-outline"
            title="Aún no hay clientes"
            description="Registra el primero para empezar a cobrar."
            action={{ label: "Nuevo cliente", onPress: noop }}
            secondaryAction={{ label: "Importar", onPress: noop }}
          />
        </View>
      </Seccion>

      <Seccion titulo="Drawer / NavGroup">
        <NavGroup label="Cobranza" icon="payments" abierto={grupoAbierto} onToggle={() => setGrupoAbierto((v) => !v)}>
          <ListItem title="Gestores" leading={<Icono name="manage-accounts" size={20} color={c.textMuted} />} selected showChevron={false} onPress={() => undefined} />
          <ListItem title="Carteras" leading={<Icono name="account-balance-wallet" size={20} color={c.textMuted} />} showChevron={false} onPress={() => undefined} />
        </NavGroup>
        <NavGroup label="Comercio (pack apagado)" icon="storefront" abierto bloqueado onToggle={() => undefined} />
        <Button variant="secondary" onPress={() => setCajonAbierto(true)}>
          Abrir Drawer
        </Button>
        <Drawer abierto={cajonAbierto} onCerrar={() => setCajonAbierto(false)} testID="catalogo-drawer" cerrarConBack>
          <Text accessibilityRole="header" style={[shType.h1, { color: c.text }]}>
            Cajón de ejemplo
          </Text>
          <ListItem title="Cerrar" showChevron={false} onPress={() => setCajonAbierto(false)} />
        </Drawer>
      </Seccion>
      <Seccion titulo="Toast y Sheet">
        <Fila>
          <Button variant="secondary" onPress={() => toast.success("Pago registrado")}>
            Toast de éxito
          </Button>
          <Button variant="secondary" onPress={() => toast.error("No se pudo guardar. Revisa la conexión.")}>
            Toast de error
          </Button>
        </Fila>
        <Button variant="secondary" iconLeft="vertical-align-top" onPress={() => setHojaAbierta(true)}>
          Abrir Sheet
        </Button>
      </Seccion>

      <Sheet
        visible={hojaAbierta}
        onClose={() => setHojaAbierta(false)}
        title="Registrar pago"
        description="Cuota 3 de 12 · Laura Martínez"
        footer={
          <>
            <View style={styles.flex}>
              <Button variant="secondary" fullWidth onPress={() => setHojaAbierta(false)}>
                Cancelar
              </Button>
            </View>
            <View style={styles.flex}>
              <Button
                fullWidth
                onPress={() => {
                  setHojaAbierta(false);
                  toast.success("Pago registrado");
                }}
              >
                Registrar
              </Button>
            </View>
          </>
        }
      >
        <Field label="Monto" required>
          <TextField keyboardType="numeric" placeholder="$ 0" />
        </Field>
        <Field label="Nota" hint="Opcional">
          <TextField multiline />
        </Field>
      </Sheet>
    </ScrollView>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  const { c } = useKit();
  return (
    <View style={styles.seccion}>
      <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

function Fila({ children }: { children: ReactNode }) {
  return <View style={styles.fila}>{children}</View>;
}

const styles = StyleSheet.create({
  contenido: { gap: shSpace[6], paddingBottom: shSpace[16] },
  seccion: { gap: shSpace[3], paddingHorizontal: shSpace[4] },
  fila: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: shSpace[2] },
  flex: { flex: 1 },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[3] },
  celda: { flexGrow: 1, flexBasis: 150 },
  lista: { borderWidth: 1, borderRadius: shRadius.md, overflow: "hidden" },
});
