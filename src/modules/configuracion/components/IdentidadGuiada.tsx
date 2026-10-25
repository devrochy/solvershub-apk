import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AdminApiError } from "@core/api/admin";
import { cargarBajas, guardarBajas, type BajasSettings } from "../api";
import {
  GRUPOS_IDENTIDAD,
  ayudaDeOpcion,
  dependencia,
  etiquetaDeValor,
  opcionesDelGrupo,
  valoresConActual,
  valoresDeEstado,
  type CatalogoConfig,
  type EstadoCampo,
  type EstadoIdentidad,
  type OpcionConfig,
} from "../catalogo";
import { leyendaDias } from "../horarioAtencion";
import { Campo, Chips, InputCampo } from "./campos";

const MUCHAS_OPCIONES = 6;

/** Una opción del catálogo con el control que corresponde a su tipo (SPEC-37, HU-CFG-06). */
function CampoGuiado({
  opcion,
  estado,
  valores,
  onCambio,
  error,
  ayudaExtra,
  etiquetaDe,
}: {
  opcion: OpcionConfig;
  estado: EstadoCampo;
  valores: Record<string, unknown>;
  onCambio: (clave: string, valor: EstadoCampo) => void;
  error?: string;
  ayudaExtra?: string;
  etiquetaDe: (clave: string) => string | undefined;
}) {
  const { colores } = useTheme();
  const id = `ajustes-${opcion.clave}`;
  const dep = dependencia(opcion, valores);
  const bloqueado = opcion.solo_lectura || !dep.activa;
  const ayuda = dep.activa ? (ayudaExtra ?? ayudaDeOpcion(opcion)) : dep.motivo;
  const enlace = !dep.activa && dep.de ? ` Completa primero «${etiquetaDe(dep.de) ?? dep.de}».` : "";

  if (opcion.tipo === "booleano") {
    return (
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: colores.texto, fontSize: 13, fontWeight: "600", flex: 1 }}>{opcion.etiqueta}</Text>
          <Switch
            testID={id}
            value={estado === true}
            disabled={bloqueado}
            onValueChange={(v) => onCambio(opcion.clave, v)}
          />
        </View>
        <Text style={{ color: colores.textoSuave, fontSize: 11, marginTop: 2 }}>{error ?? ayuda}</Text>
      </View>
    );
  }

  if (opcion.tipo === "elegir_varias") {
    const apagadas = Array.isArray(estado) ? estado : [];
    const posibles = opcion.valores ?? [];
    if (posibles.length === 0) return null;
    return (
      <Campo id={id} label={opcion.etiqueta} ayuda={ayuda} error={error}>
        {posibles.map((p) => (
          <View
            key={p.valor}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ color: colores.texto, fontSize: 13 }}>{p.etiqueta}</Text>
              {/* Qué evita esta validación (la declara el pack o el core, SPEC-37). */}
              {p.nota ? <Text style={{ color: colores.textoSuave, fontSize: 11 }}>{p.nota}</Text> : null}
            </View>
            <Switch
              testID={`${id}-${p.valor}`}
              value={!apagadas.includes(p.valor)}
              disabled={bloqueado}
              onValueChange={(activa) =>
                onCambio(opcion.clave, activa ? apagadas.filter((g) => g !== p.valor) : [...apagadas, p.valor])
              }
            />
          </View>
        ))}
      </Campo>
    );
  }

  let control: React.ReactNode;
  if (opcion.tipo === "elegir_una") {
    const actual = typeof estado === "string" ? estado : "";
    const opciones = valoresConActual(opcion, actual).map((v) => ({ value: v.valor, label: etiquetaDeValor(v) }));
    const chips = <Chips id={id} opciones={opciones} valor={actual} onChange={(v) => !bloqueado && onCambio(opcion.clave, v)} />;
    control =
      opciones.length > MUCHAS_OPCIONES ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chips}
        </ScrollView>
      ) : (
        chips
      );
  } else {
    control = (
      <InputCampo
        id={id}
        valor={typeof estado === "string" ? estado : ""}
        onChange={(v) => onCambio(opcion.clave, v)}
        multiline={opcion.tipo === "texto_largo" || opcion.tipo === "franjas"}
        numeric={opcion.tipo === "entero" || opcion.tipo === "decimal"}
        deshabilitado={bloqueado}
      />
    );
  }

  return (
    <Campo id={id} label={opcion.etiqueta} ayuda={`${ayuda}${enlace}`.trim()} error={error}>
      {control}
      {opcion.tipo === "franjas" ? (
        <Text style={{ color: colores.textoSuave, fontSize: 11, marginTop: 2 }}>Días: {leyendaDias()}</Text>
      ) : null}
    </Campo>
  );
}

/**
 * Identidad del agente pintada desde el catálogo del backend: etiquetas con segundos, ayuda,
 * rango, dependencias y errores por campo, iguales a los del panel. Sin listas de valores aquí.
 */
export function IdentidadGuiada({
  catalogo,
  estado,
  onCambio,
  errores,
  ayudaFueraDeHorario,
}: {
  catalogo: CatalogoConfig | null;
  estado: EstadoIdentidad;
  onCambio: (clave: string, valor: EstadoCampo) => void;
  errores: Record<string, string>;
  /** Ayuda que depende del estado (mensaje por defecto fuera de horario). */
  ayudaFueraDeHorario: (valores: Record<string, unknown>) => string;
}) {
  const { colores } = useTheme();
  if (!catalogo) {
    return (
      <Text testID="ajustes-sin-catalogo" style={{ color: colores.peligro, marginTop: 12 }}>
        No pudimos cargar las opciones de la identidad. Revisa tu conexión y vuelve a abrir Configuración.
      </Text>
    );
  }
  const valores = valoresDeEstado(catalogo, estado);
  const etiquetaDe = (clave: string) => catalogo.opciones.find((o) => o.clave === clave)?.etiqueta;
  return (
    <View testID="ajustes-identidad">
      {GRUPOS_IDENTIDAD.map((grupo) => {
        const opciones = opcionesDelGrupo(catalogo, grupo.id, estado);
        if (opciones.length === 0) return null;
        return (
          <View key={grupo.id} style={{ marginBottom: 8 }}>
            <Text style={{ color: colores.texto, fontSize: 14, fontWeight: "700", marginBottom: 8 }}>{grupo.titulo}</Text>
            {opciones.map((opcion) => (
              <CampoGuiado
                key={opcion.clave}
                opcion={opcion}
                estado={estado[opcion.clave]}
                valores={valores}
                onCambio={onCambio}
                error={errores[opcion.clave]}
                ayudaExtra={opcion.clave === "out_of_hours_message" ? ayudaFueraDeHorario(valores) : undefined}
                etiquetaDe={etiquetaDe}
              />
            ))}
          </View>
        );
      })}
      <BajasSeccion catalogo={catalogo} />
    </View>
  );
}

/** Palabras con las que un cliente pide dejar de recibir mensajes: se guardan aparte (HU-CFG-05). */
function BajasSeccion({ catalogo }: { catalogo: CatalogoConfig }) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const opcion = catalogo.opciones.find((o) => o.clave === "palabras_de_baja");
  const [bajas, setBajas] = useState<BajasSettings | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!opcion) return;
    cargarBajas(api)
      .then((b) => {
        setBajas(b);
        setTexto(b.palabras.join(", "));
      })
      .catch(() => setBajas(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga inicial
  }, [Boolean(opcion)]);

  if (!opcion || !bajas) return null;

  const guardar = async () => {
    setGuardando(true);
    setError(undefined);
    setMensaje(null);
    try {
      await guardarBajas(
        api,
        texto
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      );
      setMensaje("Palabras de baja guardadas.");
    } catch (e) {
      setError(
        e instanceof AdminApiError ? (e.fields?.palabras ?? e.message) : "No se pudieron guardar las palabras de baja.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const porDefecto = bajas.por_defecto.length > 0 ? ` Por defecto: ${bajas.por_defecto.join(", ")}.` : "";
  return (
    <View testID="ajustes-bajas" style={{ marginTop: 8 }}>
      <Text style={{ color: colores.texto, fontSize: 14, fontWeight: "700", marginBottom: 8 }}>Darse de baja</Text>
      <Campo id="ajustes-palabras_de_baja" label={opcion.etiqueta} ayuda={`${ayudaDeOpcion(opcion)}${porDefecto}`} error={error}>
        <InputCampo id="ajustes-palabras_de_baja" valor={texto} onChange={setTexto} />
      </Campo>
      {mensaje ? <Text style={{ color: colores.acento, fontSize: 12, marginBottom: 6 }}>{mensaje}</Text> : null}
      <Pressable
        testID="ajustes-bajas-guardar"
        disabled={guardando}
        onPress={() => void guardar()}
        style={{ alignSelf: "flex-start", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, backgroundColor: colores.primario }}
      >
        <Text style={{ color: colores.sobrePrimario, fontWeight: "700", fontSize: 12 }}>
          {guardando ? "Guardando…" : "Guardar palabras de baja"}
        </Text>
      </Pressable>
    </View>
  );
}
