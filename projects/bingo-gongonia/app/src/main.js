import { Bingo75Game, COLUMNS, TOTAL_BALLS } from '../../engine/src/bingo-engine.js';

const byId = (id) => document.getElementById(id);
const elements = {
  status: byId('game-status'),
  indicator: byId('live-indicator'),
  ballStage: byId('ball-stage'),
  drawn: byId('drawn-count'),
  remaining: byId('remaining-count'),
  progress: byId('progress-fill'),
  drawButton: byId('draw-button'),
  drawButtonLabel: byId('draw-button-label'),
  finishButton: byId('finish-button'),
  restartButton: byId('restart-button'),
  note: byId('action-note'),
  notice: byId('notice'),
  probability: byId('ball-probability'),
  probabilityPercent: byId('ball-probability-percent'),
  columns: byId('column-list'),
  historyBody: byId('history-body'),
  historyTotal: byId('history-total'),
  summary: byId('game-summary'),
  errorPanel: byId('error-panel'),
  errorMessage: byId('error-message'),
  drawPanel: document.querySelector('.game-layout'),
  historyPanel: document.querySelector('.history-panel'),
  bottomActions: document.querySelector('.bottom-actions'),
};

const COLUMN_NAMES = { B: 'B', I: 'I', N: 'N', G: 'G', O: 'O' };
const numberFormat = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('es-EC', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

let game = null;
let persistenceWarning = '';

function showFatalError(error) {
  elements.errorMessage.textContent = error && error.message
    ? error.message
    : 'Error desconocido al recuperar la partida.';
  elements.errorPanel.hidden = false;
  elements.drawPanel.hidden = true;
  elements.historyPanel.hidden = true;
  elements.bottomActions.hidden = true;
}

function initializeGame() {
  let storage = null;
  try {
    storage = window.localStorage;
    storage.getItem('bingo-de-gongonia-game-v1');
  } catch {
    storage = null;
    persistenceWarning = 'El navegador no permite guardar datos: esta partida solo estará disponible mientras la página permanezca abierta.';
  }

  game = new Bingo75Game({ storage });
  if (game.getState().status === 'not_started') {
    game.start();
  }
}

function formatPercent(value) {
  return percentFormat.format(value);
}

function renderBall(ball) {
  if (!ball) {
    elements.ballStage.innerHTML =
      '<div class="ball-placeholder"><span class="placeholder-star">✦</span><strong>LISTOS</strong><small>La primera bolita espera tu señal</small></div>';
    return;
  }

  const columnClass = 'ball-' + ball.letter.toLowerCase();
  elements.ballStage.innerHTML =
    '<div class="drawn-ball ' + columnClass + '" role="img" aria-label="Bolita ' + ball.id + '">' +
      '<span class="ball-letter">' + ball.letter + '</span>' +
      '<strong class="ball-number">' + String(ball.number).padStart(2, '0') + '</strong>' +
      '<span class="ball-subtitle">BINGO DE GONGONIA</span>' +
    '</div>';
}

function renderColumns(state) {
  const maxRemaining = 15;
  elements.columns.innerHTML = COLUMNS.map((letter) => {
    const remaining = state.remainingByColumn[letter];
    const probability = state.remainingTotal === 0 ? 0 : remaining / state.remainingTotal;
    const width = (remaining / maxRemaining) * 100;
    const letterClass = 'letter-' + letter.toLowerCase();
    return '<div class="column-row">' +
      '<span class="column-letter ' + letterClass + '">' + COLUMN_NAMES[letter] + '</span>' +
      '<div class="column-info"><strong>' + remaining + ' restantes</strong><small>' + formatPercent(probability) + ' del total restante</small></div>' +
      '<span class="column-bar"><i style="width:' + width + '%"></i></span>' +
    '</div>';
  }).join('');

  const chance = state.remainingTotal === 0 ? 0 : 1 / state.remainingTotal;
  elements.probability.textContent = state.remainingTotal === 0
    ? '—'
    : '1 / ' + state.remainingTotal;
  elements.probabilityPercent.textContent = state.remainingTotal === 0
    ? 'No quedan bolitas por extraer'
    : formatPercent(chance) + ' por bolita específica';
}

function renderHistory(history) {
  if (history.length === 0) {
    elements.historyBody.innerHTML =
      '<tr class="empty-row"><td colspan="5">Todavía no se ha extraído ninguna bolita.</td></tr>';
    return;
  }

  elements.historyBody.innerHTML = history.map((record) =>
    '<tr>' +
      '<td>' + String(record.drawNumber).padStart(2, '0') + '</td>' +
      '<td class="ball-cell">' + record.ball.id + '</td>' +
      '<td>' + record.drawnTotal + '</td>' +
      '<td>' + record.remainingTotal + '</td>' +
      '<td>' + formatPercent(record.probabilityOfThisBall) + '</td>' +
    '</tr>'
  ).join('');
}

function render() {
  const state = game.getState();
  const lastBall = state.lastDraw ? state.lastDraw.ball : null;
  const complete = state.status === 'completed';
  const finalized = state.status === 'finalized';
  const active = state.status === 'active';

  elements.status.textContent = complete
    ? 'Sorteo completado'
    : finalized
      ? 'Sorteo finalizado'
      : 'Sorteo en curso';
  elements.indicator.innerHTML = '<span></span> ' + (active ? 'EN CURSO' : complete ? 'COMPLETO' : 'FINALIZADO');
  elements.indicator.style.color = complete ? 'var(--gold-light)' : finalized ? 'var(--muted)' : 'var(--green)';

  renderBall(lastBall);
  elements.drawn.textContent = state.drawnTotal;
  elements.remaining.textContent = state.remainingTotal;
  elements.progress.style.width = ((state.drawnTotal / TOTAL_BALLS) * 100) + '%';
  elements.historyTotal.textContent = state.drawnTotal + ' / ' + TOTAL_BALLS;
  elements.drawButton.disabled = !active;
  elements.drawButtonLabel.textContent = active ? 'Sacar siguiente bolita' : 'Sorteo cerrado';
  elements.finishButton.disabled = !active && !complete;
  elements.finishButton.textContent = complete ? 'Ver resumen final' : finalized ? 'Sorteo finalizado' : 'Finalizar sorteo';
  elements.note.textContent = active
    ? 'Cada pulsación extrae exactamente una bolita.'
    : complete
      ? 'Se han extraído las 75 bolitas, sin repeticiones.'
      : 'Esta partida está cerrada. Puedes iniciar una nueva partida cuando lo decidas.';

  renderColumns(state);
  renderHistory(state.history);

  if (complete) {
    elements.summary.textContent = 'Partida completa: 75 bolitas extraídas y 0 restantes.';
    showNotice('¡Sorteo completado! Las 75 bolitas ya fueron extraídas.');
  } else if (finalized) {
    elements.summary.textContent = 'Partida finalizada: ' + state.drawnTotal + ' extraídas y ' + state.remainingTotal + ' sin extraer.';
    showNotice('El sorteo terminó sin realizar extracciones adicionales.');
  } else {
    elements.summary.textContent = persistenceWarning || 'La partida se guarda automáticamente mientras juegas.';
  }
}

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = false;
}

elements.drawButton.addEventListener('click', () => {
  try {
    game.drawNext();
    elements.notice.hidden = true;
    render();
  } catch (error) {
    showNotice(error.message);
  }
});

elements.finishButton.addEventListener('click', () => {
  try {
    const result = game.finalize();
    render();
    elements.summary.textContent = result.completed
      ? 'Partida completa: ' + result.drawnTotal + ' bolitas extraídas, 0 restantes.'
      : 'Partida finalizada: ' + result.drawnTotal + ' extraídas y ' + result.remainingTotal + ' sin extraer.';
  } catch (error) {
    showNotice(error.message);
  }
});

elements.restartButton.addEventListener('click', () => {
  const confirmed = window.confirm(
    '¿Iniciar una nueva partida? Se borrará el historial de esta partida y se generará una secuencia aleatoria completamente nueva.'
  );
  if (!confirmed) return;

  try {
    game.reset({ confirmed: true });
    elements.notice.hidden = true;
    render();
    showNotice('Nueva partida iniciada. La secuencia anterior ya no está activa.');
  } catch (error) {
    showNotice('No se pudo iniciar la nueva partida: ' + error.message);
  }
});

try {
  initializeGame();
  render();
} catch (error) {
  showFatalError(error);
}