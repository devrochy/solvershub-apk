import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { BarraRecomendado, Button, Elegible, Icono, Switch, useKit, type IconName } from "@shared/ui";
import {
  agruparPorModulo,
  cambiosFrenteAPorDefecto,
  CUANTO_PREGUNTA,
  CUANTO_PREGUNTA_RECOMENDADO,
  cuantoPreguntaActual,
  esUltimoMetodo,
  estaAjustada,
  METODOS_ENTREGA,
  NIVELES,
  opcionesDeCuantoPregunta,
  pistaDePiso,
  pistaDePorDefecto,
  resumenDeAccion,
  resumenDeCuantoPregunta,
  tieneVentas,
  type AccionPolitica,
  type AgenteDatos,
  type CampoPolitica,
  type CuantoPregunta,
  type EstadoDatos,
  type MetodoEntrega,
  type NivelDato,
} from "./datos-cliente";

const ICONO_DE_CUANTO: Record<CuantoPregunta, IconName> = {
  minimo: "person-outline",
  justo: "assignment",
  completo: "forum",
};

/**
 * Ícono de cada nivel de un dato (mismos que el panel: alerta, mano y prohibido). Lo marcado lleva palomita, así
 * que el estado se ve por ícono y palabra, no solo por color.
 */
const ICONO_DE_NIVEL: Record<NivelDato, IconName> = {
  requerido: "error-outline",
  recomendado: "back-hand",
  no_pedir: "block",
};

const ICONO_DE_MODULO: Record<string, IconName> = {
  ventas: "storefront",
  agenda: "event",
  cobranza: "payments",
  suscripciones: "autorenew",
};

export interface DatosDelClienteDelAgenteProps {
  politica: AgenteDatos;
  estado: EstadoDatos;
  herramientas: boolean;
  metodos: MetodoEntrega[];
  /** Mientras guarda (o sin permiso) no se puede tocar nada. */
  deshabilitado?: boolean;
  onNivel: (accionId: string, clave: string, nivel: NivelDato) => void;
  onRestablecer: (accionId: string) => void;
  onHerramientas: (activo: boolean) => void;
  onMetodo: (metodo: MetodoEntrega, activo: boolean) => void;
  /** Elige «Lo mínimo», «Lo justo» o «Completo» para todas las operaciones. */
  onCuantoPregunta: (nivel: CuantoPregunta) => void;
  /** «Usar lo recomendado»: todos los datos a su valor por defecto. */
  onUsarRecomendado: () => void;
  /** Error de «Tipos de pedido» (por ejemplo, ninguno encendido). */
  errorDeMetodos?: string | null;
}

/**
 * «Datos del cliente» de un agente (HU-APP-24, `DatosDelAgente` del panel con `comoPaso`): qué datos pide ESE
 * agente en cada operación, «Cuánto pregunta», «Consultar historial» y los «Tipos de pedido» de Ventas. Solo
 * presenta: el estado y el guardado viven en quien lo usa (la estación 3 de las dos rutas hoy; la ficha editable
 * cuando llegue Personalizar a la APK).
 */
export function DatosDelClienteDelAgente({
  politica,
  estado,
  herramientas,
  metodos,
  deshabilitado = false,
  onNivel,
  onRestablecer,
  onHerramientas,
  onMetodo,
  onCuantoPregunta,
  onUsarRecomendado,
  errorDeMetodos,
}: DatosDelClienteDelAgenteProps) {
  const { c, tonos } = useKit();
  const grupos = agruparPorModulo(politica.acciones);
  const procedimientos = politica.procedimientos ?? [];
  const opciones = opcionesDeCuantoPregunta(politica);
  const cuanto = cuantoPreguntaActual(politica, estado);

  return (
    <View style={styles.raiz} testID="datos-cliente">
      {grupos.length > 0 ? (
        <BarraRecomendado
          testID="datos-cliente-recomendado"
          cambios={cambiosFrenteAPorDefecto(politica, estado)}
          onUsar={onUsarRecomendado}
        />
      ) : null}

      {opciones.length > 1 ? (
        <View style={styles.bloque} accessibilityRole="radiogroup" accessibilityLabel="Cuánto pregunta">
          <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
            Cuánto pregunta
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            «Lo justo» es lo que trae cada operación por defecto. Puedes ajustar dato por dato más abajo.
          </Text>
          {CUANTO_PREGUNTA.filter((n) => opciones.includes(n.id)).map((nivel) => (
            <Elegible
              key={nivel.id}
              testID={`datos-cliente-cuanto-${nivel.id}`}
              icono={ICONO_DE_CUANTO[nivel.id]}
              titulo={nivel.titulo}
              ayuda={resumenDeCuantoPregunta(politica, nivel.id)}
              etiqueta={nivel.id === CUANTO_PREGUNTA_RECOMENDADO ? "Recomendado" : undefined}
              elegido={cuanto === nivel.id}
              deshabilitado={deshabilitado}
              onPress={() => onCuantoPregunta(nivel.id)}
            />
          ))}
        </View>
      ) : null}

      {grupos.length === 0 ? (
        <View style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[shType.label, { color: c.text }]}>Este agente no pide datos en sus operaciones</Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Cuando enciendas una acción que necesite datos del cliente (un pedido, una cita o una inscripción), aquí
            podrás elegir qué le pide.
          </Text>
        </View>
      ) : (
        grupos.map((grupo) => (
          <View key={grupo.modulo} style={styles.bloque} testID={`datos-cliente-modulo-${grupo.modulo}`}>
            <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
              {grupo.nombre}
            </Text>
            {grupo.acciones.map((accion) => (
              <TarjetaDeAccion
                key={accion.id}
                accion={accion}
                icono={ICONO_DE_MODULO[accion.modulo] ?? "assignment"}
                estado={estado}
                ajustada={estaAjustada(politica, estado, accion.id)}
                deshabilitado={deshabilitado}
                onNivel={(clave, nivel) => onNivel(accion.id, clave, nivel)}
                onRestablecer={() => onRestablecer(accion.id)}
              />
            ))}
          </View>
        ))
      )}

      {tieneVentas(politica) ? (
        <View
          style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}
          testID="datos-cliente-tipos-de-pedido"
        >
          <Text accessibilityRole="header" style={[shType.block, { color: c.text }]}>
            Tipos de pedido
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            El agente solo ofrecerá los métodos encendidos. Deja al menos uno para que pueda cerrar pedidos.
          </Text>
          {METODOS_ENTREGA.map((metodo) => {
            const activo = metodos.includes(metodo.id);
            const ultimo = esUltimoMetodo(metodos, metodo.id);
            return (
              <Switch
                key={metodo.id}
                testID={`datos-cliente-metodo-${metodo.id}`}
                label={metodo.etiqueta}
                description={`${metodo.ayuda}${ultimo ? " Debe quedar al menos uno." : ""}`}
                value={activo}
                disabled={deshabilitado || ultimo}
                onValueChange={(valor) => onMetodo(metodo.id, valor)}
              />
            );
          })}
          {errorDeMetodos ? (
            <Text accessibilityRole="alert" style={[shType.dense, { color: tonos.danger.fg }]}>
              {errorDeMetodos}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}>
        <Switch
          testID="datos-cliente-historial"
          label="Consultar historial"
          description="El agente verá qué datos faltan antes de pedirlos y un resumen de lo que el cliente tiene en sus módulos. Está apagado hasta que lo enciendas."
          value={herramientas}
          disabled={deshabilitado}
          onValueChange={onHerramientas}
        />
      </View>

      {procedimientos.length > 0 ? (
        <View style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text accessibilityRole="header" style={[shType.label, { color: c.text }]}>
            Datos que exige cada superpoder
          </Text>
          <Text style={[shType.dense, { color: c.textMuted }]}>
            Estos datos los define el recorrido del superpoder. No se cambian desde esta pantalla: si un superpoder los
            necesita, el agente los pide aunque aquí no aparezcan.
          </Text>
          {procedimientos.map((p) => (
            <View key={p.id} style={styles.bloquePequeno}>
              <Text style={[shType.label, { color: c.text }]}>{p.titulo}</Text>
              <View style={styles.chips}>
                {p.datos.map((dato) => (
                  <Text
                    key={dato.clave}
                    style={[shType.caption, styles.chip, { color: c.textMuted, borderColor: c.borderSoft }]}
                  >
                    {dato.etiqueta}
                    {dato.condicion ? ` · ${dato.condicion}` : ""}
                    {dato.obligatorio ? "" : " · condicional"}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Una operación plegable (tablero `rn3`): «Agendar una cita · 3 requeridos»; abierta muestra sus datos. */
function TarjetaDeAccion({
  accion,
  icono,
  estado,
  ajustada,
  deshabilitado,
  onNivel,
  onRestablecer,
}: {
  accion: AccionPolitica;
  icono: IconName;
  estado: EstadoDatos;
  ajustada: boolean;
  deshabilitado: boolean;
  onNivel: (clave: string, nivel: NivelDato) => void;
  onRestablecer: () => void;
}) {
  const { c, ripple, tonos } = useKit();
  const [abierta, setAbierta] = useState(false);
  const resumen = resumenDeAccion(accion, estado);
  return (
    <View
      style={[styles.tarjeta, { borderColor: c.border, backgroundColor: c.surface }]}
      testID={`datos-cliente-accion-${accion.id}`}
    >
      <Pressable
        testID={`datos-cliente-accion-${accion.id}-abrir`}
        accessibilityRole="button"
        accessibilityLabel={`${accion.etiqueta}, ${resumen}`}
        accessibilityState={{ expanded: abierta }}
        onPress={() => setAbierta((v) => !v)}
        android_ripple={{ color: ripple.superficie }}
        style={({ pressed }) => [styles.cabecera, pressed && Platform.OS === "ios" && styles.presionada]}
      >
        <View style={[styles.iconoAccion, { backgroundColor: tonos.accent.bg }]}>
          <Icono name={icono} size={20} color={c.link} />
        </View>
        <View style={styles.flex}>
          <Text style={[shType.label, { color: c.text }]}>{accion.etiqueta}</Text>
          <Text style={[shType.caption, { color: c.textMuted }]}>{resumen}</Text>
        </View>
        <Icono name={abierta ? "expand-less" : "expand-more"} size={24} color={c.textMuted} />
      </Pressable>
      {abierta ? (
        <View style={styles.campos}>
          {accion.campos.map((campo) => (
            <FilaDeDato
              key={campo.clave}
              accion={accion}
              campo={campo}
              nivel={estado[accion.id]?.[campo.clave] ?? campo.nivel}
              bloqueado={deshabilitado || !campo.ajustable}
              onNivel={(nivel) => onNivel(campo.clave, nivel)}
            />
          ))}
          <Button
            variant="secondary"
            size="sm"
            iconLeft="restart-alt"
            disabled={deshabilitado || !ajustada}
            onPress={onRestablecer}
            accessibilityHint={`Restablecer ${accion.etiqueta}`}
            testID={`datos-cliente-accion-${accion.id}-restablecer`}
          >
            Restablecer
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function FilaDeDato({
  accion,
  campo,
  nivel,
  bloqueado,
  onNivel,
}: {
  accion: AccionPolitica;
  campo: CampoPolitica;
  nivel: NivelDato;
  bloqueado: boolean;
  onNivel: (nivel: NivelDato) => void;
}) {
  const { c, relleno, ripple, tonos } = useKit();
  const pista = campo.ajustable ? pistaDePorDefecto(campo, nivel) : null;
  const nota = campo.ajustable ? pista : pistaDePiso(accion);
  const id = `datos-cliente-${accion.id}-${campo.clave}`;
  return (
    <View style={[styles.fila, { borderTopColor: c.borderSoft }]} testID={id}>
      <Text style={[shType.body, { color: c.text }]}>{campo.etiqueta}</Text>
      {!campo.ajustable ? (
        <View style={styles.piso}>
          <Icono name="lock" size={14} color={c.textMuted} />
          <Text style={[shType.caption, styles.flex, { color: c.textMuted }]} testID={`${id}-piso`}>
            {pistaDePiso(accion)}
          </Text>
        </View>
      ) : null}
      {pista ? (
        <Text style={[shType.caption, { color: c.textMuted }]} testID={`${id}-pista`}>
          {pista}
        </Text>
      ) : null}
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={`${campo.etiqueta} (${accion.etiqueta})`}
        accessibilityHint={nota ?? undefined}
        style={[styles.segmentos, { borderColor: c.controlBorder }]}
      >
        {NIVELES.map((opcion, i) => {
          const marcado = nivel === opcion.id;
          return (
            <Pressable
              key={opcion.id}
              testID={`${id}-${opcion.id}`}
              accessibilityRole="radio"
              accessibilityLabel={opcion.etiqueta}
              accessibilityHint={opcion.ayuda}
              accessibilityState={{
                checked: marcado,
                selected: marcado,
                disabled: bloqueado,
              }}
              disabled={bloqueado}
              onPress={() => onNivel(opcion.id)}
              android_ripple={{ color: ripple.superficie }}
              style={[
                styles.segmento,
                i > 0 && {
                  borderLeftWidth: 1,
                  borderLeftColor: c.controlBorder,
                },
                marcado && { backgroundColor: tonos.accent.bg },
                bloqueado && styles.bloqueado,
              ]}
            >
              <Icono
                name={marcado ? "check" : ICONO_DE_NIVEL[opcion.id]}
                size={16}
                color={marcado ? relleno.primario : c.textMuted}
              />
              <Text
                style={[
                  marcado ? shType.label : shType.dense,
                  styles.textoSegmento,
                  { color: marcado ? c.text : c.textMuted },
                ]}
              >
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { gap: shSpace[6] },
  bloque: { gap: shSpace[3] },
  bloquePequeno: { gap: shSpace[1] },
  tarjeta: {
    gap: shSpace[3],
    padding: shSpace[4],
    borderWidth: 1,
    borderRadius: shRadius.md,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
  },
  presionada: { opacity: 0.85 },
  iconoAccion: {
    width: 40,
    height: 40,
    borderRadius: shRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, flexShrink: 1 },
  campos: { gap: shSpace[3] },
  fila: { gap: shSpace[2], paddingTop: shSpace[3], borderTopWidth: 1 },
  piso: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  segmentos: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: shRadius.md,
    overflow: "hidden",
  },
  // Ícono arriba y palabra abajo: «Recomendado» cabe entero en un tercio de un celular de 360 dp.
  segmento: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: shSpace[1],
    paddingVertical: shSpace[1],
  },
  textoSegmento: { textAlign: "center" },
  bloqueado: { opacity: 0.6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[1] },
  chip: {
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[2],
    paddingVertical: 2,
  },
});
