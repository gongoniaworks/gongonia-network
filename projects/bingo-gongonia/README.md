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
- Motor de sorteo puro e independiente, con pruebas automatizadas.
- Despliegue web en Cloudflare Pages.
- Repositorio y control de versiones en GitHub.

## Etapas
1. Motor estadístico y control de extracción.
2. Interfaz gráfica temática de Gongonia.
3. Animaciones, sonidos y experiencia móvil.
4. Funciones adicionales y preparación para las tiendas.

## Estado
Infraestructura Cloudflare Pages creada. Repositorio GitHub dedicado pendiente de creación por limitación de permisos de la conexión actual. No hay todavía lógica de juego ni interfaz implementadas.