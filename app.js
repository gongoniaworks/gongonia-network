
'use strict';

(() => {
  const LEGACY_STORAGE_KEY = 'gng_demo_state_v1';
  const AUTH_STORAGE_KEY = 'gng_supabase_session_v1';
  const LEGACY_MIGRATION_KEY = 'gng_v03_legacy_migrated_to_user';
  const RATE_PER_HOUR = 0.6;
  const RATE_PER_MS = RATE_PER_HOUR / 3_600_000;
  const MAX_SESSION_MS = 24 * 60 * 60 * 1000;
  const TICK_MS = 1000;
  const MAX_HISTORY = 30;
  const CONFIG = window.GNG_SUPABASE_CONFIG || { url: '', publicKey: '' };
  const SUPABASE_URL = String(CONFIG.url || '').trim().replace(/\/$/, '');
  const SUPABASE_PUBLIC_KEY = String(CONFIG.publicKey || '').trim();
  const CONFIG_OK = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
    SUPABASE_PUBLIC_KEY.length > 20 && !/PEGA_AQUI|YOUR_|service_role|secret/i.test(SUPABASE_PUBLIC_KEY);

  const el = {
    balance: document.getElementById('balance'),
    statusText: document.getElementById('statusText'),
    statusPill: document.getElementById('statusPill'),
    musicToggle: document.getElementById('musicToggle'),
    backgroundMusic: document.getElementById('gngBackgroundMusic'),
    sessionTime: document.getElementById('sessionTime'),
    sessionEarned: document.getElementById('sessionEarned'),
    miningMessage: document.getElementById('miningMessage'),
    startButton: document.getElementById('startButton'),
    stopButton: document.getElementById('stopButton'),
    progressBar: document.getElementById('progressBar'),
    progressTrack: document.querySelector('.progress-track'),
    progressLabel: document.getElementById('progressLabel'),
    activeBadge: document.getElementById('activeBadge'),
    activeText: document.getElementById('activeText'),
    coinStage: document.getElementById('coinStage'),
    lastSaved: document.getElementById('lastSaved'),
    footerSaved: document.getElementById('footerSaved'),
    historyList: document.getElementById('historyList'),
    historyCount: document.getElementById('historyCount'),
    historyEarned: document.getElementById('historyEarned'),
    pages: Array.from(document.querySelectorAll('.page')),
    navItems: Array.from(document.querySelectorAll('.nav-item')),
    authGate: document.getElementById('authGate'),
    appContent: document.getElementById('appContent'),
    statusDot: document.getElementById('statusDot'),
    tabSignup: document.getElementById('tabSignup'),
    tabLogin: document.getElementById('tabLogin'),
    signupPanel: document.getElementById('signupPanel'),
    loginPanel: document.getElementById('loginPanel'),
    signupForm: document.getElementById('signupForm'),
    loginForm: document.getElementById('loginForm'),
    signupSubmit: document.getElementById('signupSubmit'),
    loginSubmit: document.getElementById('loginSubmit'),
    authMessage: document.getElementById('authMessage'),
    configNotice: document.getElementById('configNotice'),
    logoutButton: document.getElementById('logoutButton'),
    profileUsername: document.getElementById('profileUsername'),
    profileEmail: document.getElementById('profileEmail'),
    profileCountry: document.getElementById('profileCountry'),
    profileCreatedAt: document.getElementById('profileCreatedAt'),
    profileWarning: document.getElementById('profileWarning')
  };

  let activeUser = null;
  let activeSession = null;
  let storageKey = null;
  let state = defaultState();

  function defaultState() {
    return {
      balance: 0,
      mining: false,
      miningStartedAt: null,
      lastAccrualAt: null,
      sessionBaseBalance: 0,
      lastSessionEndedByLimit: false,
      lastSavedAt: Date.now(),
      sessions: []
    };
  }

  function loadState(key) {
    try {
      const raw = key ? localStorage.getItem(key) : null;
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Number.isFinite(parsed.balance) || parsed.balance < 0) return defaultState();
      return {
        balance: parsed.balance,
        mining: parsed.mining === true,
        miningStartedAt: Number.isFinite(parsed.miningStartedAt) ? parsed.miningStartedAt : null,
        lastAccrualAt: Number.isFinite(parsed.lastAccrualAt) ? parsed.lastAccrualAt : null,
        sessionBaseBalance: Number.isFinite(parsed.sessionBaseBalance) ? parsed.sessionBaseBalance : parsed.balance,
        lastSessionEndedByLimit: parsed.lastSessionEndedByLimit === true,
        lastSavedAt: Number.isFinite(parsed.lastSavedAt) ? parsed.lastSavedAt : Date.now(),
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions.filter(s => s && Number.isFinite(s.startedAt) && Number.isFinite(s.endedAt) && Number.isFinite(s.earned) && Number.isFinite(s.durationMs)).slice(0, MAX_HISTORY) : []
      };
    } catch (error) {
      console.error('No se pudieron leer los datos guardados de GNG:', error);
      return defaultState();
    }
  }

  function saveState() {
    if (!activeUser || !storageKey) return;
    state.lastSavedAt = Date.now();
    const saveLabel = 'Guardado · ' + new Date(state.lastSavedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      if (el.lastSaved) el.lastSaved.textContent = saveLabel;
      if (el.footerSaved) el.footerSaved.textContent = saveLabel;
    } catch (error) {
      console.error('No se pudieron guardar los datos de GNG:', error);
      if (el.lastSaved) el.lastSaved.textContent = 'Error al guardar';
      if (el.footerSaved) el.footerSaved.textContent = 'Error al guardar';
    }
  }

  function settleMining(now = Date.now(), autoStopAtLimit = true) {
    if (!state.mining) return false;

    // Every mining session has a hard 24-hour limit. Clamp accrual to the exact
    // end of that window, even if the app was closed/backgrounded for longer.
    const startedAt = Number.isFinite(state.miningStartedAt) ? state.miningStartedAt : now;
    if (!Number.isFinite(state.miningStartedAt)) state.miningStartedAt = startedAt;
    const limitAt = startedAt + MAX_SESSION_MS;
    const accrualUntil = Math.min(now, limitAt);
    const lastAccrualAt = Number.isFinite(state.lastAccrualAt) ? state.lastAccrualAt : startedAt;
    const accrualFrom = Math.min(Math.max(lastAccrualAt, startedAt), accrualUntil);
    const elapsed = Math.max(0, accrualUntil - accrualFrom);

    if (elapsed > 0) state.balance += elapsed * RATE_PER_MS;
    state.lastAccrualAt = accrualUntil;

    if (autoStopAtLimit && now >= limitAt) {
      finishMiningSession(limitAt, true);
      return true;
    }

    saveState();
    return false;
  }

  function formatGng(value) {
    return value.toLocaleString('es-EC', { minimumFractionDigits: 3, maximumFractionDigits: 3, useGrouping: false });
  }

  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(':');
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('es-EC', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function setAuthMessage(message, kind = '') {
    el.authMessage.textContent = message || '';
    el.authMessage.className = 'auth-message' + (kind ? ` ${kind}` : '');
    el.authMessage.hidden = !message;
  }

  function setBusy(button, busy, busyLabel, originalLabel) {
    button.disabled = busy;
    button.textContent = busy ? busyLabel : originalLabel;
  }

  function switchAuthMode(mode) {
    const signup = mode === 'signup';
    el.signupPanel.hidden = !signup;
    el.loginPanel.hidden = signup;
    el.tabSignup.classList.toggle('is-current', signup);
    el.tabLogin.classList.toggle('is-current', !signup);
    el.tabSignup.setAttribute('aria-selected', String(signup));
    el.tabLogin.setAttribute('aria-selected', String(!signup));
  }

  function setConnectionStatus(connected, label) {
    el.statusText.textContent = label;
    el.statusPill.classList.toggle('active', connected);
  }

  function showAuthGate(message = '', kind = '') {
    activeUser = null;
    activeSession = null;
    storageKey = null;
    el.appContent.hidden = true;
    el.authGate.hidden = false;
    setConnectionStatus(false, 'Sin sesión');
    setAuthMessage(message, kind);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function friendlyError(raw) {
    const message = String(raw || 'No se pudo completar la solicitud.');
    const lower = message.toLowerCase();
    if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) return 'Tu correo todavía no está confirmado. Abre el mensaje de Supabase en tu correo y pulsa el enlace de confirmación.';
    if (lower.includes('invalid login credentials')) return 'Correo o contraseña incorrectos. Comprueba los datos e inténtalo de nuevo.';
    if (lower.includes('user already registered') || lower.includes('user_already_exists')) return 'Ese correo ya está registrado. Cambia a “Iniciar sesión”.';
    if (lower.includes('password should be at least') || lower.includes('weak_password')) return 'La contraseña debe cumplir los requisitos de seguridad. Usa al menos 8 caracteres.';
    if (lower.includes('profiles_username_key') || lower.includes('duplicate key') || lower.includes('username')) {
      if (lower.includes('duplicate') || lower.includes('profiles_username_key') || lower.includes('unique')) return 'Ese nombre de usuario ya está ocupado. Elige otro y vuelve a registrarte.';
    }
    if (lower.includes('database error saving new user') || lower.includes('gng requires username and country')) return 'Supabase no pudo crear el perfil automático. No repitas el registro todavía; revisaremos el trigger y los metadatos.';
    if (lower.includes('redirect') && (lower.includes('not allowed') || lower.includes('allow list') || lower.includes('url'))) return 'Supabase rechazó la dirección de retorno. En Authentication → URL Configuration, configura como Site URL la dirección pública de GNG y añade esa misma dirección en Redirect URLs.';
    if (lower.includes('failed to fetch') || lower.includes('networkerror')) return 'No se pudo conectar con Supabase. Comprueba internet y revisa la URL y la clave pública configuradas.';
    return message;
  }

  function configIsReady() {
    if (CONFIG_OK) return true;
    setAuthMessage('La conexión todavía no está configurada. Primero hay que añadir la URL de GNG-Database y su clave pública de cliente en supabase-config.js.', 'error');
    return false;
  }

  async function supabaseRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('apikey', SUPABASE_PUBLIC_KEY);
    if (!headers.has('Content-Type') && options.body) headers.set('Content-Type', 'application/json');
    if (activeSession && activeSession.access_token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${activeSession.access_token}`);
    }
    const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
    const text = await response.text();
    let data = {};
    if (text) {
      try { data = JSON.parse(text); }
      catch { data = { message: text }; }
    }
    if (!response.ok) {
      const msg = data.msg || data.message || data.error_description || data.error || `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function normaliseSession(data) {
    const expiresAt = Number.isFinite(data.expires_at) ? data.expires_at : Math.floor(Date.now() / 1000) + (Number(data.expires_in) || 3600);
    return { ...data, expires_at: expiresAt };
  }

  async function refreshSession(session) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok || !data.access_token) throw new Error(data.msg || data.message || 'La sesión expiró. Vuelve a iniciar sesión.');
    const newSession = normaliseSession(data);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
    activeSession = newSession;
    return newSession;
  }

  async function getAuthUser(session) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { 'apikey': SUPABASE_PUBLIC_KEY, 'Authorization': `Bearer ${session.access_token}` }
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok) throw new Error(data.msg || data.message || 'No se pudo comprobar la sesión.');
    return data;
  }

  async function getProfile(user, session) {
    const url = `${SUPABASE_URL}/rest/v1/Profiles?select=id,username,country,created_at&id=eq.${encodeURIComponent(user.id)}&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_PUBLIC_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Accept': 'application/json'
      }
    });
    const text = await response.text();
    let data = [];
    try { data = text ? JSON.parse(text) : []; } catch { data = []; }
    if (!response.ok) throw new Error(data.message || data.details || `No se pudo consultar el perfil (HTTP ${response.status}).`);
    return Array.isArray(data) ? data[0] || null : null;
  }

  function activateUserState(user) {
    activeUser = user;
    storageKey = `gng_demo_state_v3_${user.id}`;
    try {
      if (!localStorage.getItem(storageKey) && !localStorage.getItem(LEGACY_MIGRATION_KEY)) {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
          localStorage.setItem(storageKey, legacy);
          localStorage.setItem(LEGACY_MIGRATION_KEY, user.id);
        }
      }
    } catch (error) {
      console.warn('No se pudo migrar el saldo local antiguo:', error);
    }
    state = loadState(storageKey);
    if (state.mining) settleMining(Date.now());
  }

  async function enterApp(user, session, profile = null) {
    activeSession = normaliseSession(session);
    activeUser = user;
    try { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(activeSession)); } catch (error) { console.warn('No se pudo guardar la sesión en este dispositivo:', error); }
    activateUserState(user);
    if (profile) {
      el.profileUsername.textContent = profile.username || user.user_metadata?.username || '—';
      el.profileCountry.textContent = profile.country || user.user_metadata?.country || '—';
      el.profileCreatedAt.textContent = profile.created_at ? new Date(profile.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      el.profileWarning.hidden = true;
      el.profileWarning.textContent = '';
    } else {
      el.profileUsername.textContent = user.user_metadata?.username || '—';
      el.profileCountry.textContent = user.user_metadata?.country || '—';
      el.profileCreatedAt.textContent = '—';
      el.profileWarning.textContent = 'La sesión se abrió, pero no encontramos un perfil en public."Profiles". La función automática puede necesitar revisión antes de dar por terminado el registro.';
      el.profileWarning.hidden = false;
    }
    el.profileEmail.textContent = user.email || '—';
    el.authGate.hidden = true;
    el.appContent.hidden = false;
    setConnectionStatus(true, 'Cuenta activa');
    render();
    renderHistory();
    switchPage('home');
    if (!profile) setAuthMessage('Iniciaste sesión, pero falta confirmar la creación del perfil remoto en Supabase.', 'error');
  }

  async function signup(email, password, username, country) {
    const redirect = `${window.location.origin}${window.location.pathname}`;
    const path = `/auth/v1/signup?redirect_to=${encodeURIComponent(redirect)}`;
    const response = await fetch(`${SUPABASE_URL}${path}`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, data: { username, country } })
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || `HTTP ${response.status}`);
    return data;
  }

  async function signin(email, password) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || data.error || `HTTP ${response.status}`);
    return data;
  }

  async function loadProfileOrNull(user, session) {
    try { return await getProfile(user, session); }
    catch (error) {
      console.error('No se pudo comprobar el perfil remoto:', error);
      return null;
    }
  }

  async function logout() {
    if (state.mining) stopMiningAt(Date.now());
    const session = activeSession;
    try {
      if (session?.access_token && CONFIG_OK) {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST', headers: { 'apikey': SUPABASE_PUBLIC_KEY, 'Authorization': `Bearer ${session.access_token}` }
        });
      }
    } catch (error) { console.warn('El cierre de sesión remoto no respondió; se cerrará localmente.', error); }
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
    state = defaultState();
    switchAuthMode('login');
    showAuthGate('Sesión cerrada. Los datos locales de minería de esta cuenta se han conservado en este dispositivo.', 'success');
  }

  function switchPage(name) {
    el.pages.forEach(page => {
      const active = page.id === `page-${name}`;
      page.classList.toggle('is-active', active);
      page.hidden = !active;
    });
    el.navItems.forEach(item => {
      const active = item.dataset.page === name;
      item.classList.toggle('is-current', active);
      if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
    if (name === 'history') renderHistory();
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function renderHistory() {
    if (!activeUser) return;
    const sessions = [...state.sessions];
    if (state.mining && Number.isFinite(state.miningStartedAt)) {
      sessions.unshift({ startedAt: state.miningStartedAt, endedAt: null, durationMs: Math.min(MAX_SESSION_MS, Math.max(0, Date.now() - state.miningStartedAt)), earned: Math.max(0, state.balance - state.sessionBaseBalance), active: true });
    }
    const completed = state.sessions;
    const totalEarned = completed.reduce((sum, s) => sum + s.earned, 0);
    el.historyCount.textContent = String(completed.length);
    el.historyEarned.textContent = formatGng(totalEarned);
    if (!sessions.length) {
      el.historyList.innerHTML = '<div class="empty-state"><span>✧</span><strong>Tu historia comienza aquí</strong><p>Cuando completes tu primera sesión, aparecerá registrada en esta sección.</p></div>';
      return;
    }
    el.historyList.innerHTML = sessions.slice(0, MAX_HISTORY).map(session => {
      const active = session.active === true;
      const status = active ? 'En curso' : 'Completada';
      const date = formatDate(session.startedAt);
      return `<article class="history-item ${active ? 'running' : ''}"><span class="history-symbol" aria-hidden="true">${active ? '▶' : '✦'}</span><div class="history-main"><strong>${date}</strong><p>${status} · ${formatDuration(session.durationMs)}</p></div><div class="history-earned">${formatGng(session.earned)}<small>GNG</small></div></article>`;
    }).join('');
  }

  function render() {
    if (!activeUser) return;
    const now = Date.now();
    const sessionDuration = Number.isFinite(state.miningStartedAt) ? Math.min(MAX_SESSION_MS, Math.max(0, now - state.miningStartedAt)) : 0;
    const sessionEarned = Math.max(0, state.balance - state.sessionBaseBalance);
    const visualProgress = (now % 60_000) / 60_000 * 100;
    el.balance.textContent = formatGng(state.balance);
    el.statusText.textContent = 'Cuenta activa';
    el.statusPill.classList.toggle('active', state.mining || Boolean(activeUser));
    el.startButton.disabled = state.mining;
    el.stopButton.disabled = !state.mining;
    el.startButton.classList.toggle('is-mining', state.mining);
    el.coinStage.classList.toggle('is-mining', state.mining);
    el.sessionTime.textContent = formatDuration(sessionDuration);
    el.sessionEarned.textContent = formatGng(sessionEarned);
    el.progressBar.style.width = `${state.mining ? visualProgress : 0}%`;
    el.progressTrack.setAttribute('aria-valuenow', String(Math.round(state.mining ? visualProgress : 0)));
    el.progressLabel.textContent = state.mining ? 'Minando GNG' : 'Lista para comenzar';
    el.activeBadge.classList.toggle('active', state.mining);
    el.activeText.textContent = state.mining ? 'Activa' : 'En pausa';
    el.miningMessage.textContent = state.mining
      ? 'La minería de prueba está activa; el saldo se guarda solo en este dispositivo.'
      : state.lastSessionEndedByLimit
        ? 'La minería se detuvo automáticamente al completar 24 horas. Pulsa el emblema para iniciar una nueva sesión.'
        : 'La minería está en pausa. Pulsa el emblema para comenzar.';
  }

  function startMining() {
    if (!activeUser || state.mining) return;
    const now = Date.now();
    state.mining = true;
    state.miningStartedAt = now;
    state.lastAccrualAt = now;
    state.sessionBaseBalance = state.balance;
    state.lastSessionEndedByLimit = false;
    saveState();
    render();
  }

  function finishMiningSession(endedAt, endedByLimit = false) {
    if (!state.mining) return;
    const startedAt = Number.isFinite(state.miningStartedAt) ? state.miningStartedAt : endedAt;
    const session = {
      startedAt,
      endedAt,
      durationMs: Math.max(0, endedAt - startedAt),
      earned: Math.max(0, state.balance - state.sessionBaseBalance)
    };
    if (session.durationMs > 0) state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, MAX_HISTORY);
    state.mining = false;
    state.miningStartedAt = null;
    state.lastAccrualAt = null;
    state.lastSessionEndedByLimit = endedByLimit;
    saveState();
    render();
    renderHistory();
  }

  function stopMiningAt(now) {
    if (!state.mining) return;
    const startedAt = Number.isFinite(state.miningStartedAt) ? state.miningStartedAt : now;
    const limitAt = startedAt + MAX_SESSION_MS;
    const hitLimit = now >= limitAt;
    const endedAt = Math.min(now, limitAt);
    // Settle first, but let this function finalise the session only once.
    settleMining(endedAt, false);
    finishMiningSession(endedAt, hitLimit);
  }

  // Background music: playback begins only after a deliberate user tap,
  // which is required by Safari/iOS autoplay restrictions. The audio is an
  // original synthesized ambient loop shipped with the app.
  async function toggleBackgroundMusic() {
    if (!el.backgroundMusic || !el.musicToggle) return;
    if (!el.backgroundMusic.paused) {
      el.backgroundMusic.pause();
      el.musicToggle.setAttribute('aria-pressed', 'false');
      el.musicToggle.setAttribute('aria-label', 'Activar música de fondo');
      el.musicToggle.title = 'Activar música de fondo';
      return;
    }
    try {
      el.backgroundMusic.volume = 0.24;
      await el.backgroundMusic.play();
      el.musicToggle.setAttribute('aria-pressed', 'true');
      el.musicToggle.setAttribute('aria-label', 'Desactivar música de fondo');
      el.musicToggle.title = 'Desactivar música de fondo';
    } catch (error) {
      console.warn('No se pudo iniciar la música de fondo:', error);
      el.musicToggle.setAttribute('aria-pressed', 'false');
      el.musicToggle.setAttribute('aria-label', 'No se pudo reproducir la música; toca para reintentar');
      el.musicToggle.title = 'Toca para intentar reproducir la música';
    }
  }

  // UI initialisation
  el.musicToggle.addEventListener('click', toggleBackgroundMusic);
  el.tabSignup.addEventListener('click', () => { switchAuthMode('signup'); setAuthMessage(''); });
  el.tabLogin.addEventListener('click', () => { switchAuthMode('login'); setAuthMessage(''); });
  el.startButton.addEventListener('click', startMining);
  el.stopButton.addEventListener('click', () => stopMiningAt(Date.now()));
  el.navItems.forEach(item => item.addEventListener('click', () => switchPage(item.dataset.page)));
  el.logoutButton.addEventListener('click', logout);

  el.signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configIsReady()) return;
    const username = document.getElementById('signupUsername').value.trim();
    const signupEmailField = document.getElementById('signupEmail');
    const email = signupEmailField.value.trim();
    const country = document.getElementById('signupCountry').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
    if (username.length < 2 || username.length > 30) return setAuthMessage('El nombre de usuario debe tener entre 2 y 30 caracteres.', 'error');
    if (!signupEmailField.checkValidity()) return setAuthMessage('Escribe un correo electrónico válido.', 'error');
    if (!country) return setAuthMessage('Selecciona tu país para continuar.', 'error');
    if (password.length < 8) return setAuthMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
    if (password !== passwordConfirm) return setAuthMessage('Las contraseñas no coinciden.', 'error');
    setBusy(el.signupSubmit, true, 'Creando cuenta…', 'Crear cuenta GNG');
    setAuthMessage('Estamos creando tu cuenta y tu perfil. No cierres esta pantalla todavía.');
    try {
      const data = await signup(email, password, username, country);
      if (data.session?.access_token) {
        const session = normaliseSession(data.session);
        const user = data.user || session.user;
        const profile = user ? await loadProfileOrNull(user, session) : null;
        if (!user) throw new Error('La cuenta se creó, pero Supabase no devolvió los datos del usuario. Intenta iniciar sesión.');
        await enterApp(user, session, profile);
        setAuthMessage(profile ? 'Cuenta creada y perfil encontrado.' : 'Cuenta creada. La sesión está abierta, pero el perfil remoto no apareció; revisaremos el trigger.', profile ? 'success' : 'error');
      } else {
        document.getElementById('loginEmail').value = email;
        document.getElementById('signupPassword').value = '';
        document.getElementById('signupPasswordConfirm').value = '';
        switchAuthMode('login');
        setAuthMessage('Solicitud de registro recibida. Como la confirmación por correo está activada, abre el mensaje de Supabase, confirma tu dirección y luego inicia sesión aquí. Revisa también Spam/Correo no deseado.', 'success');
      }
    } catch (error) {
      console.error('Error de registro GNG:', error);
      setAuthMessage(friendlyError(error.message), 'error');
    } finally {
      setBusy(el.signupSubmit, false, 'Creando cuenta…', 'Crear cuenta GNG');
    }
  });

  el.loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!configIsReady()) return;
    const loginEmailField = document.getElementById('loginEmail');
    const email = loginEmailField.value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!loginEmailField.checkValidity() || !email) return setAuthMessage('Escribe un correo electrónico válido.', 'error');
    if (!password) return setAuthMessage('Escribe tu contraseña.', 'error');
    setBusy(el.loginSubmit, true, 'Iniciando sesión…', 'Iniciar sesión');
    setAuthMessage('Comprobando tus datos…');
    try {
      const data = normaliseSession(await signin(email, password));
      if (!data.access_token || !data.user) throw new Error('Supabase no devolvió una sesión válida.');
      const user = data.user;
      const profile = await loadProfileOrNull(user, data);
      await enterApp(user, data, profile);
      setAuthMessage(profile ? '' : 'Iniciaste sesión, pero no encontramos el perfil remoto. Revisa la función automática y las políticas de Supabase.', profile ? '' : 'error');
    } catch (error) {
      console.error('Error de inicio de sesión GNG:', error);
      setAuthMessage(friendlyError(error.message), 'error');
    } finally {
      setBusy(el.loginSubmit, false, 'Iniciando sesión…', 'Iniciar sesión');
    }
  });

  async function bootstrapAuth() {
    if (!CONFIG_OK) {
      el.configNotice.hidden = false;
      setConnectionStatus(false, 'Config. pendiente');
      setAuthMessage('La interfaz está preparada, pero todavía falta configurar la URL de GNG-Database y su clave pública de cliente. No se ha enviado ningún dato a Supabase.', 'error');
      return;
    }
    el.configNotice.hidden = true;
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null'); } catch { stored = null; }
    if (!stored?.access_token || !stored?.refresh_token) {
      setConnectionStatus(false, 'Sin sesión');
      return;
    }
    try {
      let session = normaliseSession(stored);
      if (session.expires_at < Math.floor(Date.now() / 1000) + 60) session = await refreshSession(session);
      let user;
      try { user = await getAuthUser(session); }
      catch {
        session = await refreshSession(session);
        user = await getAuthUser(session);
      }
      const profile = await loadProfileOrNull(user, session);
      await enterApp(user, session, profile);
    } catch (error) {
      console.warn('La sesión guardada ya no es válida:', error);
      try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
      switchAuthMode('login');
      setConnectionStatus(false, 'Sin sesión');
      setAuthMessage('Tu sesión anterior caducó. Inicia sesión de nuevo.', 'error');
    }
  }

  // Keep the profile authenticated in each browser context; refresh tokens on resume.
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (activeUser && activeSession && activeSession.expires_at < Math.floor(Date.now() / 1000) + 90 && CONFIG_OK) {
      try { await refreshSession(activeSession); }
      catch (error) { console.warn('No se pudo renovar la sesión automáticamente:', error); }
    }
    if (activeUser && state.mining) settleMining(Date.now());
    render();
  });

  window.setInterval(() => {
    if (!activeUser) return;
    if (state.mining) settleMining(Date.now());
    render();
    if (document.getElementById('page-history').classList.contains('is-active')) renderHistory();
  }, TICK_MS);

  window.addEventListener('pagehide', () => {
    if (activeUser && state.mining) settleMining(Date.now());
    else saveState();
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(error => {
        console.warn('No se pudo activar el modo instalable/offline:', error);
      });
    });
  }

  // Startup: authentication remains visible until Supabase is configured and a user signs in.
  showAuthGate();
  if (CONFIG_OK) el.configNotice.hidden = true;
  bootstrapAuth().catch(error => {
    console.error('No se pudo inicializar la autenticación GNG:', error);
    showAuthGate('No se pudo iniciar la conexión con Supabase. Comprueba la configuración y vuelve a cargar la aplicación.', 'error');
  });
})();
