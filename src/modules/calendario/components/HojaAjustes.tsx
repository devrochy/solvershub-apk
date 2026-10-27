import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, Sheet, useKit, type IconName } from "@shared/ui";

import type { CalendarListOut, CollaboratorItem, TypeOut } from "../api";
import { SeccionAgendas } from "./secciones/SeccionAgendas";
import { SeccionHorario } from "./secciones/SeccionHorario";
import { SeccionTipos } from "./secciones/SeccionTipos";

export type SeccionAjustes = "tipos" | "horario" | "agendas";
const SECCIONES: SeccionAjustes[] = ["tipos", "horario", "agendas"];

export function esSeccionAjustes(valor: string | null | undefined): valor is SeccionAjustes {
  return SECCIONES.includes(valor as SeccionAjustes);
}

/** Cajón de Ajustes de Agenda (HU-CAL-08): tipos, horario y agendas sin salir del calendario. */
export function HojaAjustes({
  visible,
  seccionInicial,
  nonce,
  tipos,
  agendaList,
  horario,
  config,
  colaboradores,
  zonaNegocio,
  tenantId,
  puedeEscribir,
  onCerrar,
  onRefrescar,
}: {
  visible: boolean;
  seccionInicial: string | null;
  /** Cambia cuando el shell pide abrir una sección otra vez (aunque sea la misma). */
  nonce?: number;
  tipos: TypeOut[] | null;
  agendaList: CalendarListOut | null;
  horario: string | null;
  config: Record<string, unknown> | null;
  colaboradores: CollaboratorItem[];
  zonaNegocio: string;
  tenantId: string | null;
  puedeEscribir: boolean;
  onCerrar: () => void;
  onRefrescar: () => void;
}) {
  const { c } = useKit();
  const [seccion, setSeccion] = useState<SeccionAjustes | null>(esSeccionAjustes(seccionInicial) ? seccionInicial : null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el cajón se sincroniza con la sección pedida al abrirse
    if (visible) setSeccion(esSeccionAjustes(seccionInicial) ? seccionInicial : null);
  }, [visible, seccionInicial, nonce]);

  const disponibles: { id: SeccionAjustes; titulo: string; resumen: string; icono: IconName }[] = [];
  if (tipos) {
    disponibles.push({
      id: "tipos",
      titulo: "Tipos de cita",
      resumen: `${tipos.filter((tipo) => tipo.active !== false).length} servicios que el asistente puede agendar`,
      icono: "category",
    });
  }
  if (horario !== null) {
    disponibles.push({
      id: "horario",
      titulo: "Horario de atención",
      resumen: "Días y horas en que se puede agendar",
      icono: "schedule",
    });
  }
  if (agendaList) {
    disponibles.push({
      id: "agendas",
      titulo: "Agendas",
      resumen: `${agendaList.calendars.length} ${agendaList.calendars.length === 1 ? "agenda" : "agendas"} · Google y elección del cliente`,
      icono: "event",
    });
  }

  const actual = disponibles.find((item) => item.id === seccion) ?? null;
  const titulo = actual ? actual.titulo : "Ajustes de Agenda";
  const descripcion = actual ? undefined : "Todo lo que configura la agenda, sin salir del calendario.";

  return (
    <Sheet visible={visible} onClose={onCerrar} title={titulo} description={descripcion} testID="hoja-ajustes">
      {actual ? (
        <View style={styles.contenedor}>
          <Button variant="ghost" size="sm" onPress={() => setSeccion(null)} testID="ajustes-volver">
            ← Todos los ajustes
          </Button>
          {actual.id === "tipos" && tipos ? (
            <SeccionTipos
              tipos={tipos}
              colaboradores={colaboradores}
              puedeEscribir={puedeEscribir}
              onRefrescar={onRefrescar}
            />
          ) : null}
          {actual.id === "horario" && horario !== null ? (
            <SeccionHorario
              horario={horario}
              config={config}
              puedeEscribir={puedeEscribir}
              onGuardado={onRefrescar}
            />
          ) : null}
          {actual.id === "agendas" && agendaList ? (
            <SeccionAgendas
              datos={agendaList}
              colaboradores={colaboradores}
              zonaNegocio={zonaNegocio}
              tenantId={tenantId}
              puedeEscribir={puedeEscribir}
              config={config}
              onRefrescar={onRefrescar}
            />
          ) : null}
        </View>
      ) : disponibles.length === 0 ? (
        <View style={styles.vacio}>
          <Icono name="lock-outline" size={28} color={c.textMuted} />
          <Text style={[shType.block, { color: c.text }]}>No tienes permisos para cambiar la agenda</Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Pídele a un propietario del negocio acceso a Tipos de cita, Horario o Agendas.
          </Text>
        </View>
      ) : (
        <View style={styles.contenedor}>
          {disponibles.map((item) => (
            <Pressable
              key={item.id}
              testID={`ajustes-${item.id}`}
              accessibilityRole="button"
              onPress={() => setSeccion(item.id)}
              style={[styles.fila, { borderColor: c.border }]}
            >
              <Icono name={item.icono} size={22} color={c.link} />
              <View style={styles.texto}>
                <Text style={[shType.label, { color: c.text }]}>{item.titulo}</Text>
                <Text style={[shType.caption, { color: c.textMuted }]}>{item.resumen}</Text>
              </View>
              <Icono name="chevron-right" size={22} color={c.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[3] },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[3],
    minHeight: 64,
  },
  texto: { flex: 1, gap: 2 },
  vacio: { alignItems: "center", gap: shSpace[2], paddingVertical: shSpace[8], paddingHorizontal: shSpace[4] },
});
