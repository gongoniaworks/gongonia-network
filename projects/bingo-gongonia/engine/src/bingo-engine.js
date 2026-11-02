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

  #storage;
  #storageKey;

  constructor({
    randomInt = secureRandomInt,
    storage = null,
    storageKey = 'bingo-de-gongonia-game-v1',
  } = {}) {
    if (typeof randomInt !== 'function') throw new TypeError('randomInt debe ser una función.');
    if (storage !== null && (
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    )) {
      throw new TypeError('storage debe implementar getItem() y setItem().');
    }
    if (typeof storageKey !== 'string' || storageKey.length === 0) {
      throw new TypeError('storageKey debe ser una cadena no vacía.');
    }

    this.#randomInt = randomInt;
    this.#storage = storage;
    this.#storageKey = storageKey;
    this.#restoreFromStorage();
  }

  #persistSnapshot(sequence, drawIndex, status) {
    if (!this.#storage) return;
    const snapshot = {
      version: 1,
      sequence: sequence.map((ball) => ball.id),
      drawIndex,
      status,
    };
    // Escribe antes de cambiar el estado en memoria: si falla el guardado,
    // la extracción no se considera completada.
    this.#storage.setItem(this.#storageKey, JSON.stringify(snapshot));
  }

  #restoreFromStorage() {
    if (!this.#storage) return;

    const raw = this.#storage.getItem(this.#storageKey);
    if (raw === null) return;

    let snapshot;
    try {
      snapshot = JSON.parse(raw);
    } catch {
      throw new Error('El estado guardado de Bingo está dañado y no se pudo recuperar.');
    }

    const canonicalBalls = new Map(createBallSet().map((ball) => [ball.id, ball]));
    const validStatuses = ['active', 'completed', 'finalized'];
    const validSequence = snapshot?.version === 1 &&
      Array.isArray(snapshot.sequence) &&
      snapshot.sequence.length === TOTAL_BALLS &&
      snapshot.sequence.every((id) => typeof id === 'string' && canonicalBalls.has(id)) &&
      new Set(snapshot.sequence).size === TOTAL_BALLS;
    const validIndex = Number.isInteger(snapshot?.drawIndex) &&
      snapshot.drawIndex >= 0 && snapshot.drawIndex <= TOTAL_BALLS;
    const validStatus = validStatuses.includes(snapshot?.status);
    const statusMatchesIndex = snapshot?.status === 'active'
      ? snapshot.drawIndex < TOTAL_BALLS
      : snapshot?.status === 'completed'
        ? snapshot.drawIndex === TOTAL_BALLS
        : snapshot?.status === 'finalized' && snapshot.drawIndex < TOTAL_BALLS;

    if (!validSequence || !validIndex || !validStatus || !statusMatchesIndex) {
      throw new Error('El estado guardado de Bingo no es válido. No se inició una partida nueva para evitar perder datos.');
    }

    this.#sequence = snapshot.sequence.map((id) => canonicalBalls.get(id));
    this.#drawIndex = snapshot.drawIndex;
    this.#status = snapshot.status;
    this.#history = Array.from(
      { length: this.#drawIndex },
      (_, index) => this.#createRecordAt(this.#sequence, index),
    );
  }

  #createRecordAt(sequence, index) {
    const remainingBeforeDraw = TOTAL_BALLS - index;
    const ball = sequence[index];
    const countsBeforeDraw = countByColumn(sequence.slice(index));

    return Object.freeze({
      drawNumber: index + 1,
      ball,
      drawnTotal: index + 1,
      remainingTotal: TOTAL_BALLS - index - 1,
      probabilityOfThisBall: 1 / remainingBeforeDraw,
      probabilityOfThisColumn: countsBeforeDraw[ball.letter] / remainingBeforeDraw,
    });
  }

  start() {
    if (this.#status !== 'not_started') {
      throw new Error('La partida ya fue iniciada. Para comenzar otra, usa reset({ confirmed: true }).');
    }
    this.#beginNewGame();
    return this.getState();
  }

  #beginNewGame() {
    const sequence = fisherYatesShuffle(createBallSet(), this.#randomInt);
    this.#persistSnapshot(sequence, 0, 'active');
    this.#sequence = sequence;
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

    const record = this.#createRecordAt(this.#sequence, this.#drawIndex);
    const nextIndex = this.#drawIndex + 1;
    const nextStatus = nextIndex === TOTAL_BALLS ? 'completed' : 'active';

    this.#persistSnapshot(this.#sequence, nextIndex, nextStatus);
    this.#drawIndex = nextIndex;
    this.#status = nextStatus;
    this.#history.push(record);

    return {
      ...record,
      state: this.getState(),
    };
  }

  getHistory() {
    return this.#history.map((record) => ({ ...record, ball: { ...record.ball } }));
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
    if (this.#status === 'active') {
      this.#persistSnapshot(this.#sequence, this.#drawIndex, 'finalized');
      this.#status = 'finalized';
    }
    return {
      completed: this.#drawIndex === TOTAL_BALLS,
      status: this.#status,
      drawnTotal: this.#drawIndex,
      remainingTotal: TOTAL_BALLS - this.#drawIndex,
      history: this.getHistory(),
    };
  }
}
