import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { AdminApiError, type ClienteAdmin } from "@core/api/admin";
import {
  Button,
  Field,
  Icono,
  RadioGroup,
  Sheet,
  TextField,
  useKit,
} from "@shared/ui";
import { buscarNegociosPlataforma, vincularNegocio, type PlatformTenant } from "../api";

const ROLES = [
  { value: "colaborador", label: "Colaborador", description: "Gestiona el negocio según sus permisos" },
  { value: "owner", label: "Propietario", description: "Administra el negocio" },
];

/**
 * Hoja del master para vincular una cuenta a otro negocio (ADR-0136): busca
 * negocios de la plataforma, elige el rol y confirma. Solo se abre para master.
 */
export function HojaVincularNegocio({
  visible,
  api,
  colaboradorId,
  onClose,
  onVinculado,
}: {
  visible: boolean;
  api: ClienteAdmin;
  colaboradorId: string;
  onClose: () => void;
  onVinculado: (negocio: PlatformTenant, role: string) => void;
}) {
  const { c, tonos, ripple } = useKit();
  const [consulta, setConsulta] = useState("");
  const [negocios, setNegocios] = useState<PlatformTenant[]>([]);
  const [cargando, setCargando] = useState(false);
  const [elegido, setElegido] = useState<PlatformTenant | null>(null);
  const [rol, setRol] = useState("colaborador");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      if (!activo) return;
      setCargando(true);
      buscarNegociosPlataforma(api, consulta)
        .then((items) => {
          if (activo) setNegocios(items);
        })
        .catch(() => {
          if (activo) setNegocios([]);
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
    }, 250);
    return () => {
      activo = false;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [visible, consulta, api]);

  function cerrar() {
    setConsulta("");
    setNegocios([]);
    setElegido(null);
    setRol("colaborador");
    setError(null);
    setGuardando(false);
    onClose();
  }

  async function vincular() {
    if (!elegido) return;
    setError(null);
    setGuardando(true);
    try {
      await vincularNegocio(api, colaboradorId, elegido.slug, rol);
      const negocio = elegido;
      cerrar();
      onVinculado(negocio, rol);
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.message
          ? e.message
          : "No pudimos vincular la cuenta. Inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={cerrar}
      title="Vincular a un negocio"
      description="La cuenta verá ese negocio y sus permisos aplicarán solo ahí."
      testID="hoja-vincular"
      footer={
        <View style={styles.pie}>
          <View style={styles.pieBoton}>
            <Button variant="ghost" fullWidth onPress={cerrar}>
              Cancelar
            </Button>
          </View>
          <View style={styles.pieBoton}>
            <Button
              testID="vincular-confirmar"
              fullWidth
              loading={guardando}
              disabled={!elegido || guardando}
              onPress={() => void vincular()}
            >
              Vincular
            </Button>
          </View>
        </View>
      }
    >
      <Field label="Buscar negocio" hint="Por nombre o identificador.">
        <TextField
          testID="vincular-buscar"
          value={consulta}
          onChangeText={setConsulta}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Buscar negocio…"
        />
      </Field>

      <View style={[styles.lista, { borderColor: c.borderSoft }]}>
        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="small" color={c.link} />
            <Text style={[shType.dense, { color: c.textMuted }]}>Buscando…</Text>
          </View>
        ) : negocios.length === 0 ? (
          <Text style={[shType.dense, styles.vacio, { color: c.textMuted }]}>
            Sin resultados.
          </Text>
        ) : (
          negocios.map((negocio) => {
            const activo = elegido?.id === negocio.id;
            return (
              <Pressable
                key={negocio.id}
                testID={`vincular-negocio-${negocio.slug}`}
                accessibilityRole="radio"
                accessibilityLabel={negocio.name}
                accessibilityState={{ selected: activo, checked: activo }}
                onPress={() => setElegido(negocio)}
                android_ripple={{ color: ripple.superficie }}
                style={({ pressed }) => [
                  styles.fila,
                  { borderBottomColor: c.borderSoft },
                  activo && { backgroundColor: c.surface2 },
                  pressed && Platform.OS === "ios" && { opacity: 0.85 },
                ]}
              >
                <View style={styles.filaTextos}>
                  <Text style={[shType.body, { color: c.text }]} numberOfLines={1}>
                    {negocio.name}
                  </Text>
                  <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                    {negocio.slug}
                  </Text>
                </View>
                {activo ? <Icono name="check-circle" size={20} color={c.link} /> : null}
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.roles}>
        <Text style={[shType.label, { color: c.text }]}>Rol en el negocio</Text>
        <RadioGroup label="Rol en el negocio" options={ROLES} value={rol} onValueChange={setRol} testID="vincular-rol" />
      </View>

      {error ? (
        <Text
          testID="vincular-error"
          accessibilityLiveRegion="polite"
          style={[shType.dense, { color: tonos.danger.fg }]}
        >
          {error}
        </Text>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lista: {
    borderWidth: 1,
    borderRadius: shRadius.sm,
    overflow: "hidden",
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shSpace[12],
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[2],
    borderBottomWidth: 1,
  },
  filaTextos: { flex: 1, gap: 2 },
  cargando: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    padding: shSpace[3],
  },
  vacio: { padding: shSpace[4], textAlign: "center" },
  roles: { gap: shSpace[1] },
  pie: { flexDirection: "row", gap: shSpace[2], flex: 1 },
  pieBoton: { flex: 1 },
});
