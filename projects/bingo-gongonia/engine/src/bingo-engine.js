/**
 * Bingo de Gongonia — motor de sorteo de 75 bolitas.
 * Sin dependencias externas y sin acoplamiento a la interfaz gráfica.
 */

export const COLUMNS = Object.freeze(['B', 'I', 'N', 'G', 'O']);
export const BALLS_PER_COLUMN = 15;
export const TOTAL_BALLS = COLUMNS.length * BALLS_PER_COLUMN;

const UINT32_RANGE = 0x1_0000_0000;

/**
 * Devuelve un entero uniforme en [0, maxExclusive), usando Web Crypto
 * y muestreo por rechazo para evitar sesgo de módulo.
 */
export function secureRandomInt(maxExclusive, cryptoProvider = globalThis.crypto) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`maxExclusive debe ser un entero entre 1 y ${UINT32_RANGE}.`);
  }
  if (!cryptoProvider || typeof cryptoProvider.getRandomValues !== 'function') {
    throw new Error('No hay una fuente criptográfica segura disponible en este entorno.');
  }

  const acceptanceLimit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  const word = new Uint32Array(1);
  let value;
  do {
    cryptoProvider.getRandomValues(word);
    value = word[0];
  } while (value >= acceptanceLimit);

  return value % maxExclusive;
}

/** Crea las 75 bolitas con su asociación letra/número correcta. */
export function createBallSet() {
  return COLUMNS.flatMap((letter, columnIndex) =>
    Array.from({ length: BALLS_PER_COLUMN }, (_, index) => {
      const number = columnIndex * BALLS_PER_COLUMN + index + 1;
      return Object.freeze({
        letter,
        number,
        id: `${letter}-${String(number).padStart(2, '0')}`,
      });
    }),
  );
}

/** Mezcla una copia del arreglo mediante Fisher–Yates. */
export function fisherYatesShuffle(items, randomInt = secureRandomInt) {
  if (!Array.isArray(items)) throw new TypeError('items debe ser un arreglo.');
  if (typeof randomInt !== 'function') throw new TypeError('randomInt debe ser una función.');

  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError(`randomInt(${index + 1}) devolvió un índice inválido.`);
    }
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function countByColumn(balls) {
  return Object.fromEntries(
    COLUMNS.map((letter) => [letter, balls.reduce((total, ball) => total + Number(ball.letter === letter), 0)]),
  );
}

function probabilityMap(counts, total) {
  return Object.fromEntries(
    COLUMNS.map((letter) => [letter, total === 0 ? 0 : counts[letter] / total]),
  );
}

/**
 * Controla una partida completa. La secuencia se crea una sola vez al iniciar
 * y las extracciones consumen esa secuencia sin reemplazo.
 */
export class Bingo75Game {
  #randomInt;
  #sequence = [];
  #history = [];
  #drawIndex = 0;
  #status = 'not_started';

  constructor({ randomInt = secureRandomInt } = {}) {
    if (typeof randomInt !== 'function') throw new TypeError('randomInt debe ser una función.');
    this.#randomInt = randomInt;
  }

  start() {
    if (this.#status !== 'not_started') {
      throw new Error('La partida ya fue iniciada. Para comenzar otra, usa reset({ confirmed: true }).');
    }
    this.#beginNewGame();
    return this.getState();
  }

  #beginNewGame() {
    this.#sequence = fisherYatesShuffle(createBallSet(), this.#randomInt);
    this.#history = [];
    this.#drawIndex = 0;
    this.#status = 'active';
  }

  /** Extrae exactamente una bolita. Nunca devuelve una bolita ya extraída. */
  drawNext() {
    if (this.#status !== 'active') {
      throw new Error(this.#status === 'completed'
        ? 'El sorteo ya terminó: se extrajeron las 75 bolitas.'
        : 'No hay una partida activa. Inicia el bingo primero.');
    }

    const remainingBeforeDraw = TOTAL_BALLS - this.#drawIndex;
    const ball = this.#sequence[this.#drawIndex];
    const countsBeforeDraw = countByColumn(this.#sequence.slice(this.#drawIndex));
    this.#drawIndex += 1;

    const record = Object.freeze({
      drawNumber: this.#drawIndex,
      ball,
      drawnTotal: this.#drawIndex,
      remainingTotal: TOTAL_BALLS - this.#drawIndex,
      probabilityOfThisBall: 1 / remainingBeforeDraw,
      probabilityOfThisColumn: countsBeforeDraw[ball.letter] / remainingBeforeDraw,
    });
    this.#history.push(record);

    if (this.#drawIndex === TOTAL_BALLS) this.#status = 'completed';

    return {
      ...record,
      state: this.getState(),
    };
  }

  getHistory() {
    return this.#history.map((record) => ({ ...record, ball: { ...record.ball } }));
  }

  getRemainingBalls() {
    return this.#sequence.slice(this.#drawIndex).map((ball) => ({ ...ball }));
  }

  getState() {
    const remainingBalls = this.#sequence.slice(this.#drawIndex);
    const remainingByColumn = countByColumn(remainingBalls);
    const remainingTotal = remainingBalls.length;

    return {
      status: this.#status,
      drawnTotal: this.#drawIndex,
      remainingTotal,
      lastDraw: this.#history.length ? { ...this.#history[this.#history.length - 1] } : null,
      remainingByColumn,
      nextBallProbability: remainingTotal === 0 ? 0 : 1 / remainingTotal,
      nextColumnProbabilities: probabilityMap(remainingByColumn, remainingTotal),
      history: this.getHistory(),
    };
  }

  /**
   * Reinicia con una secuencia nueva. Requiere confirmación explícita para
   * evitar borrar accidentalmente el historial de una partida.
   */
  reset({ confirmed = false } = {}) {
    if (confirmed !== true) {
      return { confirmationRequired: true, message: 'Confirma el reinicio para borrar el historial y generar una nueva secuencia.' };
    }
    this.#beginNewGame();
    return this.getState();
  }

  /** Termina voluntariamente una partida; no extrae bolitas adicionales. */
  finalize() {
    if (this.#status !== 'active' && this.#status !== 'completed' && this.#status !== 'finalized') {
      throw new Error('No hay una partida iniciada para finalizar.');
    }
    if (this.#status === 'active') this.#status = 'finalized';
    return {
      completed: this.#drawIndex === TOTAL_BALLS,
      status: this.#status,
      drawnTotal: this.#drawIndex,
      remainingTotal: TOTAL_BALLS - this.#drawIndex,
      history: this.getHistory(),
    };
  }
}
