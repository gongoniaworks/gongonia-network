# Bingo de Gongonia

Proyecto de videojuego de bingo de 75 bolitas, perteneciente a Gongonia.

## Objetivo
Construir una aplicación web responsive, preparada para PWA y futura publicación en Google Play y Apple App Store.

## Alcance — Etapa 1
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
- Motor de sorteo JavaScript independiente, con Fisher–Yates y Web Crypto.
- Pruebas automatizadas con Node.js.
- Despliegue web previsto en Cloudflare Pages.

## Etapas
1. Motor estadístico y control de extracción.
2. Interfaz gráfica temática de Gongonia.
3. Animaciones, sonidos y experiencia móvil.
4. Funciones adicionales y preparación para las tiendas.

## Estado
- **Etapa 1 — implementación inicial:** motor y pruebas automatizadas añadidos en `engine/`.
- **Pruebas automatizadas en GitHub Actions:** 11 de 11 aprobadas.
- **Prueba de estrés:** 1.000 partidas completas (75.000 extracciones) verificadas con Web Crypto; cero repeticiones y 15 bolitas por columna en cada partida.
- **Cloudflare Pages:** proyecto `bingo-gongonia` creado, aún sin despliegue ni conexión Git.
- **Repositorio GitHub dedicado:** pendiente. Por ahora el código está alojado en este repositorio central, dentro de `projects/bingo-gongonia/`, sin modificar los otros juegos.
- **Persistencia local:** guardado y recuperación automáticos con `localStorage`, en el mismo navegador y dispositivo.
- La sincronización entre dispositivos y la interfaz gráfica aún no están implementadas.
