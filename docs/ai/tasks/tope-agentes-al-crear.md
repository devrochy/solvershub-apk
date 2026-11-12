---
estado: completado en código (sin OTA ni prueba en dispositivo)
tags: [agentes, planes, limite, spec-39, hu-aos-56]
---

# El tope del plan bloquea «Nuevo agente» también en la APK

- **Origen:** el dueño reportó que se podía crear un agente aunque el plan ya estuviera al tope.
- **Backend:** `GET /admin/agents/overview` trae `cuota_agentes` (`used`, `limit`, `allowed`);
  `from-script` y `agent-templates/{key}/agents` responden `409 plan_limit_agentes` sin crear el borrador.
- **App:** `src/modules/agentes/asistente.ts` expone `avisoDeTopeDeAgentes`; `AgentesScreen` muestra
  un `Alert` con el aviso y no abre el asistente cuando `allowed` es `false`. La lista vacía usa el
  mismo camino.

## Verificación

- `npx jest src/modules/agentes/asistente.test.ts src/modules/agentes/screens/AgentesScreen.test.tsx --runInBand`
- `npx tsc --noEmit`
- `npx eslint src/modules/agentes/...`
- Tipos regenerados desde el `docs/openapi.json` del backend con `cuota_agentes`.
