import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import { EmptyState, Skeleton, useKit } from "@shared/ui";
import type { EntradaPestanas, SolicitudPestana } from "@shared/pestana-inicial";

import {
  actualizarBloqueo,
  actualizarCita,
  cargarAgendas,
  cargarColaboradores,
  cargarConfigPlugin,
  cargarEventos,
  cargarTipos,
  type CalendarListOut,
  type CollaboratorItem,
  type TypeOut,
} from "../api";
import { BarraAgenda } from "../components/BarraAgenda";
import { HojaAjustes, esSeccionAjustes } from "../components/HojaAjustes";
import { HojaEvento } from "../components/HojaEvento";
import { LineaDelDia } from "../components/LineaDelDia";
import { TiraSemana } from "../components/TiraSemana";
import {
  agendasVisibles as filtrarAgendas,
  codigoPorDefecto,
  type Borrador,
  type EventoAgenda,
  type LeyendaAgenda,
  type TipoLeyenda,
} from "../domain/agenda";
import { describirAviso } from "../domain/notificacion";
import {
  aUtcDesdeZona,
  claveDia,
  diasDeSemana,
  hoyEnZona,
  inicioDeSemana,
  partesEnZona,
  sumarDias,
} from "../domain/zona";

const AGENDA_POR_DEFECTO: LeyendaAgenda = {
  id: "",
  name: "Agenda",
  color: "cat-1",
  is_default: true,
  active: true,
  disponible: true,
};

function avisoDeMover(): Promise<boolean | null> {
  return new Promise((resolver) => {
    Alert.alert(
      "Avisar del nuevo horario",
      "¿Avisar al cliente del nuevo horario por correo y WhatsApp (y a los colaboradores por correo)?",
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolver(null) },
        { text: "No avisar", onPress: () => resolver(false) },
        { text: "Sí, avisar", onPress: () => resolver(true) },
      ],
      { cancelable: true, onDismiss: () => resolver(null) },
    );
  });
}

function idSinPrefijo(evento: EventoAgenda): string {
  if (evento.kind === "block") return evento.id.replace(/^block-/, "");
  return evento.id.replace(/^appt-/, "");
}

function borradorEnDia(dia: string, zona: string): Borrador {
  const [anio, mes, d] = dia.split("-").map(Number);
  const hoy = hoyEnZona(zona);
  let hora = 9;
  if (dia === hoy) {
    const ahora = partesEnZona(new Date(), zona);
    hora = Math.min(20, ahora.hora + 1);
  }
  return {
    start: aUtcDesdeZona(anio, mes, d, hora, 0, zona),
    end: aUtcDesdeZona(anio, mes, d, hora + 1, 0, zona),
  };
}

/**
 * Agenda en una sola vista (HU-CAL-08 sobre HU-UX-08): calendario con las citas de
 * todas las agendas, tira de semana, línea del día, hoja de cita/bloqueo y cajón de
 * ajustes (tipos, horario y agendas). Google Calendar se administra en Conexiones.
 */
export function CalendarioScreen({
  pestanaInicial,
  ajustesInicial,
  // La entrada del cajón ya no tiene pestañas propias; se conserva por compatibilidad del shell.
  entrada: _entrada,
}: {
  pestanaInicial?: SolicitudPestana;
  ajustesInicial?: string;
  entrada?: EntradaPestanas;
} = {}) {
  const { c } = useKit();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const [zona, setZona] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota",
  );
  const [semana, setSemana] = useState(() => inicioDeSemana(hoyEnZona(zona)));
  const [dia, setDia] = useState(() => hoyEnZona(zona));
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [tiposEventos, setTiposEventos] = useState<TipoLeyenda[]>([]);
  const [agendasEventos, setAgendasEventos] = useState<LeyendaAgenda[]>([]);
  const [multiActivo, setMultiActivo] = useState(false);
  const [agendaList, setAgendaList] = useState<CalendarListOut | null>(null);
  const [tipos, setTipos] = useState<TypeOut[] | null>(null);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [colaboradores, setColaboradores] = useState<CollaboratorItem[]>([]);
  const [guardadas, setGuardadas] = useState<string[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [recargar, setRecargar] = useState(0);
  const [hoja, setHoja] = useState<{ evento: EventoAgenda | null; borrador: Borrador | null } | null>(null);
  const [ajustesAbierto, setAjustesAbierto] = useState(false);
  const [seccionAjustes, setSeccionAjustes] = useState<string | null>(null);
  const [nonceAjustes, setNonceAjustes] = useState(0);

  const tenantId = sesion?.tenantId ?? null;
  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};
  const puedeCrear = esMaster || permisos["pack_calendar:citas"] === "write";
  const puedeEscribir = esMaster || permisos["pack_calendar:configuracion"] === "write";
  const claveGuardada = `agenda-visibles:${tenantId ?? "sin-negocio"}`;

  useEffect(() => {
    AsyncStorage.getItem(claveGuardada)
      .then((crudo) => {
        const lista = crudo ? (JSON.parse(crudo) as unknown) : null;
        setGuardadas(Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : null);
      })
      .catch(() => setGuardadas(null));
  }, [claveGuardada]);

  const cargarAjustes = useCallback(async () => {
    const [agendas, listaTipos, plugin, personas] = await Promise.allSettled([
      cargarAgendas(api),
      cargarTipos(api),
      cargarConfigPlugin(api, "pack_calendar"),
      cargarColaboradores(api),
    ]);
    setAgendaList(agendas.status === "fulfilled" ? agendas.value : null);
    setTipos(listaTipos.status === "fulfilled" ? listaTipos.value : null);
    setConfig(plugin.status === "fulfilled" ? plugin.value.values : null);
    setColaboradores(personas.status === "fulfilled" ? personas.value : []);
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de ajustes: los setState ocurren después del await
    void cargarAjustes();
  }, [cargarAjustes, recargar]);

  const todas = useMemo(() => {
    const base = agendasEventos.length
      ? agendasEventos
      : (agendaList?.calendars ?? []).map((agenda) => ({
          id: agenda.id,
          name: agenda.name,
          color: agenda.color,
          is_default: agenda.is_default,
          active: agenda.active,
          disponible: agenda.connected,
        }));
    const activas = base.filter((agenda) => agenda.active !== false && agenda.disponible !== false);
    // Compatibilidad: un negocio con una sola agenda (o un backend sin `/calendars`)
    // sigue viendo su calendario sin selector.
    return activas.length ? activas : [AGENDA_POR_DEFECTO];
  }, [agendasEventos, agendaList]);
  const visibles = useMemo(() => filtrarAgendas(guardadas, todas.map((agenda) => agenda.id)), [guardadas, todas]);
  const claveVisibles = multiActivo ? visibles.join(",") : "";

  useEffect(() => {
    let vigente = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- la grilla entra en carga al cambiar de semana o de filtro
    setCargando(true);
    const [anio, mes, d] = semana.split("-").map(Number);
    const [anioFin, mesFin, diaFin] = sumarDias(semana, 7).split("-").map(Number);
    const start = aUtcDesdeZona(anio, mes, d, 0, 0, zona);
    const end = aUtcDesdeZona(anioFin, mesFin, diaFin, 0, 0, zona);
    cargarEventos(api, {
      start,
      end,
      calendarIds: multiActivo && claveVisibles ? claveVisibles.split(",") : undefined,
    })
      .then((datos) => {
        if (!vigente) return;
        setError(null);
        setEventos(datos.events);
        setTiposEventos(datos.tipos ?? []);
        setAgendasEventos(datos.calendars ?? []);
        setMultiActivo(Boolean(datos.multi_activo));
        if (datos.timezone && datos.timezone !== zona) {
          const hoy = hoyEnZona(datos.timezone);
          setZona(datos.timezone);
          setSemana(inicioDeSemana(hoy));
          setDia(hoy);
        }
      })
      .catch((fallo) => {
        if (vigente) setError(fallo instanceof Error ? fallo.message : "No pudimos cargar la agenda.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
    // `claveVisibles` resume el filtro; `multiActivo` cambia con la respuesta.
  }, [api, semana, zona, multiActivo, claveVisibles, recargar]);

  useEffect(() => {
    if (!pestanaInicial) return;
    const pedida = pestanaInicial.pestana;
    /* eslint-disable react-hooks/set-state-in-effect -- deep link: abre la sección pedida por el cajón o la Búsqueda */
    if (esSeccionAjustes(pedida)) {
      setSeccionAjustes(pedida);
      setAjustesAbierto(true);
      setNonceAjustes((n) => n + 1);
    } else if (pedida === "conexion") {
      setSeccionAjustes("agendas");
      setAjustesAbierto(true);
      setNonceAjustes((n) => n + 1);
    } else {
      setAjustesAbierto(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pestanaInicial]);

  useEffect(() => {
    if (!ajustesInicial) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abre el cajón de ajustes pedido desde Conexiones
    setSeccionAjustes(esSeccionAjustes(ajustesInicial) ? ajustesInicial : null);
    setAjustesAbierto(true);
    setNonceAjustes((n) => n + 1);
  }, [ajustesInicial, pestanaInicial?.n]);

  const leyendaTipos: TipoLeyenda[] = useMemo(
    () =>
      tiposEventos.length
        ? tiposEventos
        : (tipos ?? [])
            .filter((tipo) => tipo.active !== false)
            .map((tipo) => ({
              id: tipo.id,
              name: tipo.name,
              color: tipo.color,
              codigo: tipo.codigo || codigoPorDefecto(tipo.name),
              duration_minutes: tipo.duration_minutes,
            })),
    [tiposEventos, tipos],
  );

  const colorPor = multiActivo && visibles.length > 1 ? "agenda" : "tipo";
  const conteo = useMemo(() => {
    const salida: Record<string, number> = {};
    for (const evento of eventos) {
      const clave = claveDia(evento.start, zona);
      salida[clave] = (salida[clave] ?? 0) + 1;
    }
    return salida;
  }, [eventos, zona]);
  const dias = useMemo(() => diasDeSemana(semana), [semana]);
  const hayAjustes = tipos !== null || config !== null || agendaList !== null;
  const sinAgendas = agendaList !== null && agendaList.calendars.length === 0 && eventos.length === 0;
  const horario = typeof config?.business_hours === "string" ? config.business_hours : null;

  function alternar(id: string) {
    const siguiente = visibles.includes(id) ? visibles.filter((v) => v !== id) : [...visibles, id];
    if (!siguiente.length) return;
    setGuardadas(siguiente);
    AsyncStorage.setItem(claveGuardada, JSON.stringify(siguiente)).catch(() => undefined);
  }

  function solo(id: string) {
    setGuardadas([id]);
    AsyncStorage.setItem(claveGuardada, JSON.stringify([id])).catch(() => undefined);
  }

  async function mover(evento: EventoAgenda, start: string, end: string) {
    if (evento.kind === "block") {
      try {
        await actualizarBloqueo(api, idSinPrefijo(evento), { start_at: start, end_at: end });
        setAviso("Bloqueo movido.");
      } catch (fallo) {
        setError(fallo instanceof Error ? fallo.message : "No se pudo mover el bloqueo.");
      } finally {
        setRecargar((n) => n + 1);
      }
      return;
    }
    const avisar = await avisoDeMover();
    if (avisar === null) return;
    try {
      const cita = await actualizarCita(api, idSinPrefijo(evento), {
        start_at: start,
        end_at: end,
        notify: avisar,
      });
      setAviso(describirAviso("Cita movida.", cita.notification));
      setError(null);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Ese horario ya está ocupado o fuera del horario.");
    } finally {
      setRecargar((n) => n + 1);
    }
  }

  return (
    <View style={[styles.contenedor, { backgroundColor: c.bg }]}>
      <BarraAgenda
        agendas={todas}
        visibles={visibles}
        onAlternar={alternar}
        onSolo={solo}
        tipos={leyendaTipos}
        puedeCrear={puedeCrear}
        onNueva={() => setHoja({ evento: null, borrador: borradorEnDia(dia, zona) })}
        onAjustes={hayAjustes ? () => {
          setSeccionAjustes(null);
          setAjustesAbierto(true);
        } : null}
      />

      <TiraSemana
        dias={dias}
        seleccionado={dia}
        conteo={conteo}
        onSeleccionar={setDia}
        onAnterior={() => {
          setSemana((actual) => sumarDias(actual, -7));
          setDia((actual) => sumarDias(actual, -7));
        }}
        onSiguiente={() => {
          setSemana((actual) => sumarDias(actual, 7));
          setDia((actual) => sumarDias(actual, 7));
        }}
        onHoy={() => {
          const hoy = hoyEnZona(zona);
          setSemana(inicioDeSemana(hoy));
          setDia(hoy);
        }}
      />

      {error ? (
        <Text testID="calendario-error" accessibilityRole="alert" style={{ color: c.statusDangerFg }}>
          {error}
        </Text>
      ) : null}
      {aviso && !error ? (
        <Text testID="calendario-aviso" style={{ color: c.textMuted }}>
          {aviso}
        </Text>
      ) : null}

      {cargando ? (
        <View style={styles.cargando}>
          <Skeleton shape="rect" height={120} />
          <Skeleton shape="rect" height={260} />
        </View>
      ) : sinAgendas ? (
        <EmptyState
          icon="event"
          title="Aún no hay agendas"
          description="Conecta una cuenta de Google Calendar o crea una agenda interna para empezar."
          action={{
            label: "Configurar agendas",
            onPress: () => {
              setSeccionAjustes("agendas");
              setAjustesAbierto(true);
            },
          }}
          secondaryAction={{ label: "Reintentar", onPress: () => setRecargar((n) => n + 1) }}
        />
      ) : (
        <LineaDelDia
          dia={dia}
          eventos={eventos}
          zona={zona}
          colorPor={colorPor}
          agendas={todas}
          onAbrir={(evento) => setHoja({ evento, borrador: null })}
          onHueco={(borrador) => setHoja({ evento: null, borrador })}
          onMover={(evento, start, end) => void mover(evento, start, end)}
          onRedimensionar={(evento, start, end) => void mover(evento, start, end)}
        />
      )}

      <HojaEvento
        visible={hoja !== null}
        evento={hoja?.evento ?? null}
        borrador={hoja?.borrador ?? null}
        zona={zona}
        tipos={leyendaTipos}
        agendas={todas}
        multiActivo={multiActivo}
        agendaInicial={todas.find((agenda) => agenda.is_default)?.id ?? todas[0]?.id}
        onCerrar={() => setHoja(null)}
        onGuardado={(mensaje) => {
          setHoja(null);
          if (mensaje) setAviso(mensaje);
          setError(null);
          setRecargar((n) => n + 1);
        }}
      />

      <HojaAjustes
        visible={ajustesAbierto}
        seccionInicial={seccionAjustes}
        nonce={nonceAjustes}
        tipos={tipos}
        agendaList={agendaList}
        horario={horario}
        config={config}
        colaboradores={colaboradores}
        zonaNegocio={zona}
        tenantId={tenantId}
        puedeEscribir={puedeEscribir}
        onCerrar={() => {
          setAjustesAbierto(false);
          setSeccionAjustes(null);
        }}
        onRefrescar={() => setRecargar((n) => n + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 12, gap: 10 },
  cargando: { gap: 10 },
});
