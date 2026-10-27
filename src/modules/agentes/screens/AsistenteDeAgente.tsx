import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { Button, Checkbox, Field, RadioGroup, Stepper, TextField, useKit, type StepItem } from "@shared/ui";
import {
  cargarDestinos,
  cargarPlantillas,
  crearDesdeGuion,
  publicarAgente,
  type CreacionDeAgente,
  type DestinoDePublicacion,
  type PlantillaAgente,
} from "../api";
import {
  ESTADO_INICIAL,
  NOMBRE_MAX,
  ayudaDeLaPlantilla,
  cuerpoDeCreacion,
  elegirTipo,
  errorDelPaso,
  pasoDelCampo,
  pasosDelAsistente,
  textoDeRespuesta,
  type EstadoDelAsistente,
} from "../asistente";
import { copiaDelRequisito } from "../requisitos";

/**
 * Asistente de creación de agentes en la app (HU-AOS-56, SPEC-39): el mismo guion que el panel,
 * un paso por pantalla. El estado vive aquí: si falla la red a mitad del guion no se pierde lo
 * respondido, y se avisa al reintentar. El borrador se crea al final de «Revisar» y se publica en el
 * último paso, eligiendo la conexión.
 */
export function AsistenteDeAgente({ onTerminar }: { onTerminar: (agenteId?: string) => void }) {
  const api = useAdminApi();
  const { c, tonos } = useKit();
  const [plantillas, setPlantillas] = useState<PlantillaAgente[] | null>(null);
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoDelAsistente>(ESTADO_INICIAL);
  const [indice, setIndice] = useState(0);
  const [mostrarError, setMostrarError] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enCurso, setEnCurso] = useState(false);
  const [creado, setCreado] = useState<CreacionDeAgente | null>(null);
  const [existente, setExistente] = useState<string | null>(null);
  const [destinos, setDestinos] = useState<DestinoDePublicacion[]>([]);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [publicado, setPublicado] = useState(false);
  const reintento = useRef(0);

  useEffect(() => {
    let vivo = true;
    cargarPlantillas(api)
      .then((p) => vivo && setPlantillas(p))
      .catch(() => vivo && setErrorDeCarga("No pudimos cargar los tipos de agente. Revisa tu conexión."));
    return () => {
      vivo = false;
    };
  }, [api]);

  const plantilla = plantillas?.find((p) => p.key === estado.plantilla) ?? null;
  const pasos = useMemo(() => pasosDelAsistente(plantilla), [plantilla]);
  const paso = pasos[Math.min(indice, pasos.length - 1)];
  const errorLocal = mostrarError ? errorDelPaso(paso, estado, plantilla) : undefined;

  const items: StepItem[] = pasos.map((p, i) => ({
    id: p.id,
    title: p.titulo,
    state: i < indice ? "complete" : i === indice ? "current" : "upcoming",
  }));

  function avanzar() {
    if (errorDelPaso(paso, estado, plantilla)) {
      setMostrarError(true);
      return;
    }
    setMostrarError(false);
    setAviso(null);
    setIndice(indice + 1);
  }

  async function crear() {
    if (!plantilla || enCurso) return;
    setEnCurso(true);
    setAviso(null);
    setExistente(null);
    try {
      const res = await crearDesdeGuion(api, cuerpoDeCreacion(estado, plantilla));
      setCreado(res);
      setDestinos(await cargarDestinos(api, res.agent.id).catch(() => []));
      setIndice(indice + 1);
    } catch (e) {
      if (e instanceof AdminApiError) {
        if (e.code === "key_taken" && e.fields?.agent_id) setExistente(e.fields.agent_id);
        const campo = Object.keys(e.fields ?? {}).find((k) => k !== "agent_id");
        if (campo) setIndice(pasoDelCampo(campo, pasos));
        setAviso(e.message);
      } else {
        reintento.current += 1;
        setAviso("Se cortó la conexión. Tus respuestas siguen aquí: vuelve a intentarlo.");
      }
    } finally {
      setEnCurso(false);
    }
  }

  async function publicar() {
    if (!creado || enCurso) return;
    if (elegidas.length === 0) {
      setMostrarError(true);
      return;
    }
    setEnCurso(true);
    setAviso(null);
    try {
      await publicarAgente(api, creado.agent.id, elegidas);
      setPublicado(true);
    } catch (e) {
      setAviso(
        e instanceof AdminApiError
          ? e.message
          : "Se cortó la conexión. Tus respuestas siguen aquí: vuelve a intentarlo.",
      );
    } finally {
      setEnCurso(false);
    }
  }

  if (errorDeCarga) {
    return (
      <View style={styles.centro}>
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {errorDeCarga}
        </Text>
        <Button variant="secondary" onPress={() => onTerminar()}>
          Volver
        </Button>
      </View>
    );
  }
  if (!plantillas) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (publicado && creado) {
    return (
      <View style={styles.centro} testID="asistente-publicado">
        <Text style={[shType.h1, { color: c.text }]} accessibilityRole="header">
          Tu agente quedó publicado
        </Text>
        <Text style={[shType.body, { color: c.textMuted }]}>
          Se preparó una versión nueva en cada conexión elegida. Tus clientes no la ven hasta que la actives desde Conexiones.
        </Text>
        <Button onPress={() => onTerminar(creado.agent.id)}>Listo</Button>
      </View>
    );
  }

  const ultimoDeRevision = paso.id === "revisar";
  return (
    <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
      <Stepper steps={items} label="Crear agente" testID="asistente-stepper" />

      {paso.id === "tipo" && (
        <RadioGroup
          label="Qué quieres que haga tu agente"
          testID="asistente-tipo"
          value={estado.plantilla ?? undefined}
          onValueChange={(key) => {
            const elegida = plantillas.find((p) => p.key === key);
            if (elegida) {
              setEstado(elegirTipo(elegida));
              setMostrarError(false);
            }
          }}
          options={plantillas.map((p) => ({
            value: p.key,
            label: p.available ? p.name : `${p.name} (no disponible)`,
            description: ayudaDeLaPlantilla(p),
            disabled: !p.available,
          }))}
        />
      )}

      {"pregunta" in paso && (
        <View style={styles.bloque}>
          {paso.pregunta.help ? (
            <Text style={[shType.body, { color: c.textMuted }]}>{paso.pregunta.help}</Text>
          ) : null}
          <RadioGroup
            label={paso.pregunta.text}
            testID={`asistente-${paso.pregunta.id}`}
            invalid={Boolean(errorLocal)}
            value={estado.respuestas[paso.pregunta.id]}
            onValueChange={(valor) =>
              setEstado({ ...estado, respuestas: { ...estado.respuestas, [paso.pregunta.id]: valor } })
            }
            options={paso.pregunta.options.map((o) => ({
              value: o.id,
              label: o.text,
              description: o.help || undefined,
            }))}
          />
          {errorLocal ? (
            <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
              {errorLocal}
            </Text>
          ) : null}
        </View>
      )}

      {paso.id === "nombre" && (
        <Field
          label="Nombre del agente (opcional)"
          hint={`Si lo dejas vacío, se llama «${plantilla?.name ?? ""}». Lo puedes cambiar después.`}
          error={errorLocal}
        >
          <TextField
            testID="asistente-nombre"
            value={estado.nombre}
            maxLength={NOMBRE_MAX}
            onChangeText={(nombre) => setEstado({ ...estado, nombre })}
          />
        </Field>
      )}

      {paso.id === "contenido" && <Requisitos requisitos={plantilla?.requirements ?? []} titulo="Para que funcione del todo, configura" />}

      {ultimoDeRevision && (
        <View style={styles.bloque}>
          <Resumen estado={estado} plantilla={plantilla} pasos={pasos} />
          <Text style={[shType.body, { color: c.textMuted }]}>
            Se crea el borrador sin publicar. En el siguiente paso eliges en qué conexión atiende. Las frases y el
            modelo van con valores por defecto; los ajustas desde el panel web si quieres.
          </Text>
          <Requisitos requisitos={plantilla?.requirements ?? []} titulo="Puedes publicar, pero no funcionará del todo hasta que configures:" />
          {existente && (
            <Text style={[shType.body, { color: tonos.warning.fg }]} accessibilityRole="alert">
              Ya tienes un agente de este tipo. Edítalo desde el panel web.
            </Text>
          )}
        </View>
      )}

      {paso.id === "publicar" && creado && (
        <View style={styles.bloque}>
          <Requisitos requisitos={creado.requirements} titulo="Puedes publicar, pero tu agente no funcionará del todo hasta que configures:" />
          {destinos.length === 0 ? (
            <Text style={[shType.body, { color: c.textMuted }]}>
              No tienes conexiones listas para agentes. Conecta un canal en Conexiones y vuelve a publicar desde el panel web.
            </Text>
          ) : (
            <Field
              label="Conexiones donde atiende"
              error={mostrarError && elegidas.length === 0 ? "Elige al menos una conexión." : undefined}
            >
              <View style={styles.bloque}>
                {destinos.map((d) => (
                  <Checkbox
                    key={d.connection_id}
                    testID={`asistente-conexion-${d.connection_id}`}
                    label={d.label || d.channel}
                    description={d.covers_skills ? undefined : "Le faltan habilidades para este agente."}
                    disabled={!d.covers_skills}
                    checked={elegidas.includes(d.connection_id)}
                    onCheckedChange={(on) =>
                      setElegidas(on ? [...elegidas, d.connection_id] : elegidas.filter((x) => x !== d.connection_id))
                    }
                  />
                ))}
              </View>
            </Field>
          )}
        </View>
      )}

      {errorLocal && paso.id === "tipo" && (
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {errorLocal}
        </Text>
      )}
      {aviso && (
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert" testID="asistente-aviso">
          {aviso}
        </Text>
      )}

      <View style={styles.acciones}>
        {indice > 0 && paso.id !== "publicar" && (
          <Button variant="secondary" onPress={() => setIndice(indice - 1)} disabled={enCurso}>
            Atrás
          </Button>
        )}
        {paso.id === "publicar" ? (
          <Button variant="primary" onPress={publicar} loading={enCurso} disabled={enCurso || destinos.length === 0} fullWidth>
            Publicar agente
          </Button>
        ) : ultimoDeRevision ? (
          <Button variant="primary" onPress={crear} loading={enCurso} disabled={enCurso || !plantilla} fullWidth>
            Crear mi agente
          </Button>
        ) : (
          <Button variant="primary" onPress={avanzar} fullWidth>
            Siguiente
          </Button>
        )}
        <Button variant="ghost" onPress={() => onTerminar()} disabled={enCurso}>
          {paso.id === "publicar" ? "Publicar después" : "Cancelar"}
        </Button>
      </View>
    </ScrollView>
  );
}

function Resumen({
  estado,
  plantilla,
  pasos,
}: {
  estado: EstadoDelAsistente;
  plantilla: PlantillaAgente | null;
  pasos: ReturnType<typeof pasosDelAsistente>;
}) {
  const { c } = useKit();
  const filas: [string, string][] = [
    ["Tipo", plantilla?.name ?? "—"],
    ...pasos.flatMap((p): [string, string][] =>
      "pregunta" in p ? [[p.pregunta.text, textoDeRespuesta(p.pregunta, estado)]] : [],
    ),
    ["Nombre", estado.nombre.trim() || plantilla?.name || "—"],
  ];
  return (
    <View style={styles.bloque} testID="asistente-resumen">
      {filas.map(([k, v]) => (
        <View key={k} accessible accessibilityLabel={`${k}: ${v}`}>
          <Text style={[shType.caption, { color: c.textMuted }]}>{k}</Text>
          <Text style={[shType.body, { color: c.text }]}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function Requisitos({ requisitos, titulo }: { requisitos: PlantillaAgente["requirements"]; titulo: string }) {
  const { c, tonos } = useKit();
  if (requisitos.length === 0) {
    return (
      <Text style={[shType.body, { color: c.textMuted }]}>
        Ya tienes cargado lo que este agente necesita. No hace falta nada más.
      </Text>
    );
  }
  return (
    <View
      accessibilityRole="summary"
      style={[styles.aviso, { backgroundColor: tonos.warning.bg, borderColor: tonos.warning.border }]}
      testID="asistente-requisitos"
    >
      <Text style={[shType.block, { color: tonos.warning.fg }]}>{titulo}</Text>
      {requisitos.map((r) => {
        const copia = copiaDelRequisito(r);
        return (
          <View key={`${r.skill}-${r.kind}`} style={styles.bloque}>
            <Text style={[shType.body, { color: c.text }]}>{copia.titulo}</Text>
            <Text style={[shType.caption, { color: c.textMuted }]}>{copia.descripcion}</Text>
            {copia.destino && copia.accion ? (
              <Button variant="secondary" size="sm" onPress={() => emitirNavegacion(copia.destino!)}>
                {copia.accion}
              </Button>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: shSpace["4"], gap: shSpace["4"] },
  centro: { flex: 1, padding: shSpace["6"], gap: shSpace["4"], justifyContent: "center" },
  bloque: { gap: shSpace["2"] },
  acciones: { gap: shSpace["2"], marginTop: shSpace["2"] },
  aviso: { borderWidth: 1, borderRadius: 8, padding: shSpace["3"], gap: shSpace["3"] },
});
