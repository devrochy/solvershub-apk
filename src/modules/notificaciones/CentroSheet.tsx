import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, EmptyState, IconButton, Icono, Sheet, Skeleton, useKit } from "@shared/ui";
import { FilaNotificacion } from "./FilaNotificacion";
import {
  CATEGORIA,
  CATEGORIAS,
  OPCIONES_SILENCIO,
  agruparPorDia,
  minutosHastaManana,
  type NotificacionItem,
} from "./tipos";
import type { EstadoCentro } from "./use-centro";

/**
 * Centro de notificaciones de la app: hoja inferior animada (el `Sheet` del kit) con
 * pestañas Todas / No leídas, filtro por categoría, lista por día, marcar leídas, archivar y
 * las preferencias del push (categorías y silencio). El feed muestra todo lo visible para el
 * usuario; las preferencias gobiernan solo el aviso push (ADR-0167).
 */
export function CentroSheet({
  visible,
  onClose,
  n,
  onAbrirNotificacion,
}: {
  visible: boolean;
  onClose: () => void;
  n: EstadoCentro;
  onAbrirNotificacion: (item: NotificacionItem) => void;
}) {
  const [verPreferencias, setVerPreferencias] = useState(false);

  function cerrar() {
    setVerPreferencias(false);
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={cerrar}
      title={verPreferencias ? "Preferencias" : "Notificaciones"}
      testID="centro-notificaciones"
    >
      {verPreferencias ? (
        <Preferencias n={n} onVolver={() => setVerPreferencias(false)} />
      ) : (
        <Lista
          n={n}
          onAbrirNotificacion={onAbrirNotificacion}
          onPreferencias={() => {
            setVerPreferencias(true);
            void n.cargarPreferencias();
          }}
        />
      )}
    </Sheet>
  );
}

function Lista({
  n,
  onAbrirNotificacion,
  onPreferencias,
}: {
  n: EstadoCentro;
  onAbrirNotificacion: (item: NotificacionItem) => void;
  onPreferencias: () => void;
}) {
  const { c } = useKit();
  const grupos = agruparPorDia(n.items, n.ahora);

  return (
    <View style={styles.contenido}>
      <View style={styles.barra}>
        <View style={styles.pestanas} accessibilityRole="tablist">
          {(["todas", "no_leidas"] as const).map((p) => {
            const activa = n.pestana === p;
            return (
              <Pressable
                key={p}
                testID={`pestana-${p}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                onPress={() => n.setPestana(p)}
                style={[styles.pestana, { backgroundColor: activa ? c.surface2 : "transparent", borderColor: activa ? c.controlBorder : "transparent" }]}
              >
                <Text style={[shType.dense, { color: activa ? c.text : c.textMuted, fontWeight: activa ? "700" : "400" }]}>
                  {p === "todas" ? "Todas" : `No leídas${n.noLeidas > 0 ? ` (${n.noLeidas > 99 ? "99+" : n.noLeidas})` : ""}`}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.acciones}>
          <IconButton
            testID="marcar-todas"
            icon="done-all"
            label="Marcar todas como leídas"
            disabled={n.noLeidas === 0}
            onPress={() => void n.marcarTodas()}
          />
          <IconButton testID="abrir-preferencias" icon="tune" label="Preferencias de notificaciones" onPress={onPreferencias} />
        </View>
      </View>

      <View style={styles.chips} accessibilityRole="radiogroup">
        <Chip activo={n.categoria === null} onPress={() => n.setCategoria(null)} label="Todas" />
        {CATEGORIAS.map((cat) => (
          <Chip
            key={cat}
            activo={n.categoria === cat}
            onPress={() => n.setCategoria(n.categoria === cat ? null : cat)}
            label={CATEGORIA[cat].label}
            icon={CATEGORIA[cat].icon}
          />
        ))}
      </View>

      {n.cargando && n.items.length === 0 ? (
        <View style={styles.esqueletos} accessibilityLabel="Cargando notificaciones">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="rect" height={64} />
          ))}
        </View>
      ) : n.fallo && n.items.length === 0 ? (
        <EmptyState
          icon="cloud-off"
          title="No se pudieron cargar las notificaciones"
          description="Revisa tu conexión e inténtalo de nuevo."
          secondaryAction={{ label: "Reintentar", onPress: () => void n.recargar() }}
        />
      ) : n.items.length === 0 ? (
        <EmptyState
          icon="notifications-none"
          secondaryAction={{ label: "Actualizar", onPress: () => void n.recargar() }}
          title={n.pestana === "no_leidas" ? "Estás al día" : "Aún no hay notificaciones"}
          description={
            n.pestana === "no_leidas"
              ? "No tienes notificaciones sin leer."
              : "Aquí aparecerán las escalaciones, los pedidos, los cobros y los avisos de tu negocio."
          }
        />
      ) : (
        <View style={styles.grupos}>
          {grupos.map((g) => (
            <View key={g.dia} style={styles.grupo}>
              <Text accessibilityRole="header" style={[shType.caption, { color: c.textMuted, paddingHorizontal: shSpace[3] }]}>
                {g.dia.toUpperCase()}
              </Text>
              {g.items.map((item) => (
                <FilaNotificacion
                  key={item.id}
                  item={item}
                  ahora={n.ahora}
                  nueva={!n.conocidas.has(item.id)}
                  onAbrir={onAbrirNotificacion}
                  onArchivar={(i) => void n.archivar(i.id)}
                />
              ))}
            </View>
          ))}
          {n.siguiente ? (
            <Button variant="ghost" size="sm" onPress={() => void n.cargarMas()}>
              Ver más antiguas
            </Button>
          ) : null}
        </View>
      )}
    </View>
  );
}

function Chip({ activo, onPress, label, icon }: { activo: boolean; onPress: () => void; label: string; icon?: Parameters<typeof Icono>[0]["name"] }) {
  const { c } = useKit();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, { borderColor: activo ? c.link : c.controlBorder, backgroundColor: activo ? c.surface2 : "transparent" }]}
    >
      {icon ? <Icono name={icon} size={14} color={activo ? c.text : c.textMuted} /> : null}
      <Text style={[shType.caption, { color: activo ? c.text : c.textMuted, fontWeight: activo ? "700" : "400" }]}>{label}</Text>
    </Pressable>
  );
}

function Preferencias({ n, onVolver }: { n: EstadoCentro; onVolver: () => void }) {
  const { c } = useKit();
  const apagadas = n.preferencias?.push_off_categories ?? [];
  const hasta = n.preferencias?.muted_until ? new Date(n.preferencias.muted_until) : null;
  const silenciado = hasta !== null && hasta.getTime() > n.ahora.getTime();

  return (
    <View style={styles.contenido}>
      <Button variant="ghost" size="sm" iconLeft="arrow-back" onPress={onVolver}>
        Volver
      </Button>
      <Text style={[shType.body, { color: c.textMuted }]}>
        Elige qué avisos te llegan al celular (push). La lista de notificaciones siempre muestra todo lo que puedes ver.
      </Text>
      {CATEGORIAS.map((cat) => {
        const encendida = !apagadas.includes(cat);
        return (
          <View key={cat} style={styles.preferencia}>
            <Icono name={CATEGORIA[cat].icon} size={20} color={c.textMuted} />
            <Text style={[shType.body, { color: c.text, flex: 1 }]}>{CATEGORIA[cat].label}</Text>
            <Switch
              testID={`push-${cat}`}
              accessibilityLabel={`Avisos push de ${CATEGORIA[cat].label}`}
              value={encendida}
              disabled={n.preferencias === null}
              onValueChange={(v) => void n.apagarPush(v ? apagadas.filter((x) => x !== cat) : [...new Set([...apagadas, cat])])}
              trackColor={{ true: c.link, false: c.controlBorder }}
            />
          </View>
        );
      })}
      <View style={[styles.silencio, { borderTopColor: c.borderSoft }]}>
        <Text accessibilityRole="header" style={[shType.body, { color: c.text, fontWeight: "700" }]}>
          Silenciar avisos push
        </Text>
        <Text style={[shType.dense, { color: c.textMuted }]}>
          {silenciado && hasta
            ? `Silenciados hasta ${hasta
                .toLocaleString("es-CO", { weekday: "short", hour: "numeric", minute: "2-digit" })
                .replace(/\.$/, "")}.`
            : "Pausa los avisos al celular por un tiempo. Las notificaciones siguen apareciendo aquí."}
        </Text>
        <View style={styles.opciones}>
          {OPCIONES_SILENCIO.map((o) => (
            <Button
              key={o.label}
              variant="secondary"
              size="sm"
              onPress={() => void n.silenciar(o.minutos === "manana" ? minutosHastaManana() : o.minutos)}
            >
              {o.label}
            </Button>
          ))}
          {silenciado ? (
            <Button variant="ghost" size="sm" onPress={() => void n.silenciar(0)}>
              Reactivar
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: shSpace[3] },
  barra: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pestanas: { flexDirection: "row", gap: shSpace[1] },
  pestana: { minHeight: 40, paddingHorizontal: shSpace[3], borderRadius: shRadius.md, borderWidth: 1, justifyContent: "center" },
  acciones: { flexDirection: "row" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: 36,
    paddingHorizontal: shSpace[3],
    borderRadius: shRadius.pill,
    borderWidth: 1,
  },
  esqueletos: { gap: shSpace[3] },
  grupos: { gap: shSpace[3] },
  grupo: { gap: shSpace[1] },
  preferencia: { flexDirection: "row", alignItems: "center", gap: shSpace[3], minHeight: 48 },
  silencio: { gap: shSpace[2], paddingTop: shSpace[3], borderTopWidth: 1 },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
});
