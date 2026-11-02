import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BALLS_PER_COLUMN,
  Bingo75Game,
  COLUMNS,
  TOTAL_BALLS,
  createBallSet,
  fisherYatesShuffle,
  secureRandomInt,
} from '../src/bingo-engine.js';

function cyclingRandomInt(seed = 0) {
  let value = seed;
  return (maxExclusive) => {
    value = (value + 17) % 0x7fffffff;
    return value % maxExclusive;
  };
}

test('crea exactamente 75 bolitas y respeta las cinco columnas', () => {
  const balls = createBallSet();
  assert.equal(balls.length, TOTAL_BALLS);
  assert.deepEqual(COLUMNS, ['B', 'I', 'N', 'G', 'O']);
  for (const letter of COLUMNS) {
    const column = balls.filter((ball) => ball.letter === letter);
    assert.equal(column.length, BALLS_PER_COLUMN);
  }
  assert.equal(balls[0].id, 'B-01');
  assert.equal(balls[14].id, 'B-15');
  assert.equal(balls[15].id, 'I-16');
  assert.equal(balls[74].id, 'O-75');
  assert.equal(new Set(balls.map((ball) => ball.number)).size, 75);
});

test('Fisher–Yates conserva todos los elementos sin modificar el arreglo original', () => {
  const original = [1, 2, 3, 4, 5, 6];
  const shuffled = fisherYatesShuffle(original, cyclingRandomInt(3));
  assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
  assert.deepEqual(original, [1, 2, 3, 4, 5, 6]);
});

test('el generador criptográfico rechaza valores que producirían sesgo de módulo', () => {
  const values = [0xffffffff, 8];
  const cryptoStub = {
    getRandomValues(array) {
      array[0] = values.shift();
      return array;
    },
  };
  assert.equal(secureRandomInt(3, cryptoStub), 2);
  assert.equal(values.length, 0);
});

test('cada extracción es única y la partida completa contiene 15 bolitas por letra', () => {
  const game = new Bingo75Game({ randomInt: cyclingRandomInt(11) });
  game.start();

  const extracted = [];
  for (let index = 0; index < TOTAL_BALLS; index += 1) {
    const result = game.drawNext();
    extracted.push(result.ball.id);
    assert.equal(result.drawNumber, index + 1);
    assert.equal(result.remainingTotal, TOTAL_BALLS - index - 1);
  }

  assert.equal(new Set(extracted).size, TOTAL_BALLS);
  const history = game.getHistory();
  assert.equal(history.length, TOTAL_BALLS);
  for (const letter of COLUMNS) {
    assert.equal(history.filter((record) => record.ball.letter === letter).length, BALLS_PER_COLUMN);
  }
  assert.equal(game.getState().status, 'completed');
  assert.throws(() => game.drawNext(), /ya terminó/);
});

test('las probabilidades se actualizan con las bolitas que quedan', () => {
  const game = new Bingo75Game({ randomInt: cyclingRandomInt(29) });
  game.start();
  assert.equal(game.getState().nextBallProbability, 1 / 75);

  const first = game.drawNext();
  assert.equal(first.probabilityOfThisBall, 1 / 75);
  assert.equal(first.remainingTotal, 74);
  assert.equal(game.getState().nextBallProbability, 1 / 74);

  const state = game.getState();
  const remainingByColumnTotal = Object.values(state.remainingByColumn).reduce((sum, count) => sum + count, 0);
  assert.equal(remainingByColumnTotal, 74);
  for (const letter of COLUMNS) {
    assert.equal(
      state.nextColumnProbabilities[letter],
      state.remainingByColumn[letter] / 74,
    );
  }
});

test('el historial es cronológico y las copias no alteran el estado interno', () => {
  const game = new Bingo75Game({ randomInt: cyclingRandomInt(7) });
  game.start();
  game.drawNext();
  game.drawNext();
  const history = game.getHistory();
  assert.deepEqual(history.map((record) => record.drawNumber), [1, 2]);
  history[0].ball.id = 'ALTERADA';
  assert.notEqual(game.getHistory()[0].ball.id, 'ALTERADA');
});

test('el reinicio exige confirmación y borra el historial al confirmarse', () => {
  const game = new Bingo75Game({ randomInt: cyclingRandomInt(5) });
  game.start();
  game.drawNext();

  const response = game.reset();
  assert.equal(response.confirmationRequired, true);
  assert.equal(game.getState().drawnTotal, 1);

  const resetState = game.reset({ confirmed: true });
  assert.equal(resetState.status, 'active');
  assert.equal(resetState.drawnTotal, 0);
  assert.equal(resetState.remainingTotal, 75);
  assert.equal(resetState.history.length, 0);
});

test('finalizar antes de completar no extrae bolitas automáticamente', () => {
  const game = new Bingo75Game({ randomInt: cyclingRandomInt(13) });
  game.start();
  game.drawNext();
  const summary = game.finalize();
  assert.equal(summary.completed, false);
  assert.equal(summary.drawnTotal, 1);
  assert.equal(summary.remainingTotal, 74);
  assert.equal(game.getState().status, 'finalized');
  assert.throws(() => game.drawNext(), /No hay una partida activa/);
});


class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.has(key) ? this.#values.get(key) : null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }
}

test('la partida y la secuencia exacta se recuperan después de recrear el motor', () => {
  const storage = new MemoryStorage();
  const seed = 41;

  const uninterrupted = new Bingo75Game({ randomInt: cyclingRandomInt(seed) });
  uninterrupted.start();
  const expectedFirst = uninterrupted.drawNext().ball.id;
  const expectedSecond = uninterrupted.drawNext().ball.id;
  const expectedThird = uninterrupted.drawNext().ball.id;

  const interrupted = new Bingo75Game({ randomInt: cyclingRandomInt(seed), storage });
  interrupted.start();
  assert.equal(interrupted.drawNext().ball.id, expectedFirst);
  assert.equal(interrupted.drawNext().ball.id, expectedSecond);

  // La instancia nueva no debe necesitar generar otra secuencia.
  const restored = new Bingo75Game({
    storage,
    randomInt: () => {
      throw new Error('No debe mezclarse una nueva secuencia al recuperar una partida.');
    },
  });

  assert.equal(restored.getState().drawnTotal, 2);
  assert.equal(restored.getState().remainingTotal, 73);
  assert.deepEqual(
    restored.getHistory().map((record) => record.ball.id),
    [expectedFirst, expectedSecond],
  );
  assert.equal(restored.drawNext().ball.id, expectedThird);
});

test('un reinicio confirmado reemplaza también la partida guardada', () => {
  const storage = new MemoryStorage();
  const game = new Bingo75Game({ randomInt: cyclingRandomInt(19), storage });
  game.start();
  game.drawNext();
  assert.equal(game.getState().drawnTotal, 1);

  const response = game.reset();
  assert.equal(response.confirmationRequired, true);
  assert.equal(game.getState().drawnTotal, 1);

  game.reset({ confirmed: true });
  const restored = new Bingo75Game({ storage });
  assert.equal(restored.getState().drawnTotal, 0);
  assert.equal(restored.getState().remainingTotal, 75);
  assert.equal(restored.getHistory().length, 0);
});

test('un estado guardado dañado no se reemplaza silenciosamente por una partida nueva', () => {
  const storage = new MemoryStorage();
  storage.setItem('bingo-de-gongonia-game-v1', '{json dañado');

  assert.throws(
    () => new Bingo75Game({ storage }),
    /estado guardado de Bingo está dañado/,
  );
});
