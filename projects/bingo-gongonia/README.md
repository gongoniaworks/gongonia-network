# Bingo de Gongonia

Proyecto de videojuego de bingo de 75 bolitas, perteneciente a Gongonia.

## Objetivo
Construir una aplicación web responsive, preparada para PWA y futura publicación en Google Play y Apple App Store.

## Alcance — Etapa 1: motor de sorteo
- 75 bolitas: B (1–15), I (16–30), N (31–45), G (46–60), O (61–75).
- Secuencia aleatoria uniforme sin reemplazo.
- Una sola bolita por solicitud.
- Contadores de extraídas y restantes e historial cronológico.
- Reinicio con confirmación.
- Sin cartones, jugadores, apuestas, pagos, premios ni verificación de ganadores.

## Principio estadístico
Cada bolita aún disponible tiene la misma probabilidad de salir. En el turno n, la probabilidad de una bolita específica disponible es 1/(76-n). La secuencia completa se genera al iniciar y no cambia durante la partida.

La probabilidad de obtener una letra es el número de bolitas restantes de esa letra dividido entre el total de bolitas restantes.

## Arquitectura
- Interfaz responsive separada del motor de sorteo.
- Motor JavaScript independiente, con Fisher–Yates y Web Crypto.
- Pruebas automatizadas con Node.js y GitHub Actions.
- Despliegue web previsto en Cloudflare Pages.

## Etapas
1. Motor estadístico y control de extracción.
2. Interfaz gráfica temática de Gongonia.
3. Animaciones, sonidos y experiencia móvil.
4. Funciones adicionales y preparación para las tiendas.

## Estado del proyecto
- **Etapa 1 — implementada:** motor de sorteo, historial, estado, probabilidades, reinicio confirmado y persistencia local.
- **Etapa 1 — pruebas:** 11 de 11 pruebas automatizadas aprobadas en GitHub Actions.
- **Etapa 2 — interfaz funcional implementada y publicada:** aplicación web responsive en `app/`, conectada al motor de `engine/` y disponible en Cloudflare Pages.
- La interfaz muestra la bolita extraída, contadores, progreso, probabilidad de una bolita específica, probabilidades por columna e historial cronológico.
- Cada pulsación extrae una sola bolita. No hay extracciones automáticas.
- **Persistencia local:** la partida se recupera en el mismo navegador y dispositivo. No hay sincronización entre dispositivos.
- **Cloudflare Pages:** app publicada en https://bingo-gongonia.pages.dev, conectada a GitHub con despliegue automático desde `main` para los archivos configurados de Bingo.
- **Repositorio GitHub dedicado:** pendiente. El código se aloja en este repositorio central, dentro de `projects/bingo-gongonia/`, sin modificar los otros juegos.

## Ubicación del código
- Motor: `engine/src/bingo-engine.js`
- Pruebas del motor: `engine/test/bingo-engine.test.js`
- Interfaz: `app/index.html`, `app/styles.css` y `app/src/main.js`
- Instrucciones de ejecución local: `app/README.md`

## Fuera del alcance actual
Cartones, participantes, apuestas, dinero, premios, validación de ganadores y sincronización entre dispositivos. Las animaciones y los sonidos corresponden a la etapa 3.
