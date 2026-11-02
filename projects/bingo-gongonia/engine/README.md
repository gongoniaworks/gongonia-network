# Bingo de Gongonia — Motor de sorteo (Etapa 1)

Motor independiente de la interfaz para un bingo tradicional de 75 bolitas.

## Requisitos
- JavaScript ES modules.
- Node.js 20 o superior para ejecutar las pruebas.
- Web Crypto (`crypto.getRandomValues`) en el entorno de ejecución.

## Ejecutar las pruebas

```bash
npm test
```

## Uso básico

```js
import { Bingo75Game } from './src/bingo-engine.js';

const game = new Bingo75Game();
game.start();

const extraction = game.drawNext(); // Extrae una sola bolita.
console.log(extraction.ball.id);
console.log(game.getState());

// Reinicio: primero se solicita confirmación al usuario.
game.reset({ confirmed: true });
```

## Reglas implementadas
- B: 01–15; I: 16–30; N: 31–45; G: 46–60; O: 61–75.
- Mezcla Fisher–Yates con enteros aleatorios criptográficos y muestreo por rechazo para evitar sesgo de módulo.
- Extracción sin reemplazo: una llamada a `drawNext()` devuelve exactamente una bolita.
- Historial cronológico y estado de bolitas restantes.
- Probabilidad de una bolita específica: `1 / bolitas restantes`.
- Probabilidad de una columna: `bolitas restantes de esa columna / bolitas restantes totales`.
- Reinicio protegido por confirmación explícita.
- Finalización sin extracciones automáticas.

La secuencia permanece en memoria durante la vida de la instancia `Bingo75Game`. La persistencia entre recargas o dispositivos se abordará en una etapa posterior, si se requiere.
