# Bingo de Gongonia — Interfaz (Etapa 2)

Interfaz web responsive del sorteo, conectada con el motor de `../engine/src/bingo-engine.js`.

## Abrir en local

Desde la raíz del repositorio, inicia un servidor HTTP estático:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000/projects/bingo-gongonia/app/`.

No abras `index.html` directamente como archivo: los módulos JavaScript necesitan un servidor HTTP.

## Compilar para publicación

Desde esta carpeta:

```bash
npm run build
```

El proceso crea `dist/` con la interfaz y una copia de publicación del motor. No mantiene una segunda versión manual del motor: siempre copia el archivo de `../engine/src/bingo-engine.js`. También ajusta la ruta de importación para el paquete publicado.

## Funciones de esta etapa

- Extraer una sola bolita por pulsación.
- Mostrar la última bolita, contador y progreso del sorteo.
- Mostrar la probabilidad de una bolita específica y la probabilidad actual de cada columna.
- Registrar el historial cronológico con el número de extracción y las bolitas restantes.
- Finalizar el sorteo sin extraer bolitas adicionales.
- Confirmar antes de iniciar una nueva partida.
- Recuperar la partida guardada en el mismo navegador y dispositivo.

## Persistencia y límites

La persistencia utiliza `localStorage` en el navegador. No sincroniza partidas entre dispositivos. Si el navegador bloquea el almacenamiento, la interfaz informa que la partida solo durará mientras la página permanezca abierta. Si detecta un registro guardado dañado, no lo borra ni genera otra secuencia automáticamente.

Esta etapa no incorpora cartones, jugadores, pagos, premios, validación de ganadores, sonidos ni animaciones.
