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

## Uso básico con persistencia en el navegador

```js
import { Bingo75Game } from './src/bingo-engine.js';

const game = new Bingo75Game({ storage: window.localStorage });
// Al crear el motor, recupera automáticamente la partida guardada si existe.
if (game.getState().status === 'not_started') {
  game.start();
}

const extraction = game.drawNext(); // Extrae una sola bolita.
console.log(extraction.ball.id);
console.log(game.getState());

// El reinicio exige confirmación explícita.
game.reset({ confirmed: true });
```

Para pruebas o usos sin navegador, se puede omitir `storage`; la partida funcionará en memoria, pero no sobrevivirá a una recarga.

## Reglas implementadas
- B: 01–15; I: 16–30; N: 31–45; G: 46–60; O: 61–75.
- Mezcla Fisher–Yates con enteros aleatorios criptográficos y muestreo por rechazo para evitar sesgo de módulo.
- Extracción sin reemplazo: una llamada a `drawNext()` devuelve exactamente una bolita.
- Historial cronológico y estado de bolitas restantes.
- Probabilidad de una bolita específica: `1 / bolitas restantes`.
- Probabilidad de una columna: `bolitas restantes de esa columna / bolitas restantes totales`.
- Reinicio protegido por confirmación explícita.
- Finalización sin extracciones automáticas.
- Guardado automático del orden completo, el contador y el estado en el almacenamiento suministrado.
- Recuperación automática de la misma secuencia e historial al crear una nueva instancia del motor.
- Validación del estado recuperado; un archivo local dañado no se sustituye silenciosamente por una partida nueva.

## Alcance de la persistencia
Con `window.localStorage`, la partida se conserva en el mismo navegador y dispositivo. No se sincroniza entre equipos ni protege la secuencia frente a alguien que inspeccione los datos locales. La sincronización entre dispositivos requeriría un servicio compartido y queda fuera de esta etapa.
