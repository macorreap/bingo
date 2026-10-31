/* Bingo Oratorio. Sin dependencias, sin servicios externos. */
(() => {
  'use strict';
  const STORAGE_KEY = 'oratorio-bingo-v1';
  const CHANNEL_NAME = 'oratorio-bingo-sync-v1';
  const MESSAGE_TYPE = 'oratorio-bingo';
  const LETTERS = ['B', 'I', 'N', 'G', 'O'];
  const THEMES = [
    { id: 'rojo', name: 'Rojo', color: '#bc3f43', ink: '#ffffff', dark: '#591f2b', soft: '#f8e9e9' },
    { id: 'verde-claro', name: 'Verde claro', color: '#b5d697', ink: '#263e22', dark: '#304a2e', soft: '#eef5e7' },
    { id: 'gris', name: 'Gris', color: '#727b85', ink: '#ffffff', dark: '#303b46', soft: '#edf0f2' },
    { id: 'verde-oscuro', name: 'Verde oscuro', color: '#235b43', ink: '#ffffff', dark: '#153d30', soft: '#e7eee7' },
    { id: 'amarillo', name: 'Amarillo', color: '#f0d35e', ink: '#4b3b10', dark: '#49401f', soft: '#fbf6df' },
    { id: 'naranjo', name: 'Naranjo', color: '#e9a05c', ink: '#4b2b10', dark: '#573520', soft: '#faf0e5' },
    { id: 'lila', name: 'Lila', color: '#b6a0cd', ink: '#332443', dark: '#423152', soft: '#f2edf7' },
    { id: 'azul', name: 'Azul', color: '#3676b2', ink: '#ffffff', dark: '#193c5b', soft: '#e9f0f8' },
    { id: 'cafe', name: 'Café', color: '#906647', ink: '#ffffff', dark: '#493428', soft: '#f2ece7' }
  ];
  const $ = id => document.getElementById(id);
  const isAudience = new URLSearchParams(location.search).get('vista') === 'publico';
  const defaultState = () => ({ version: 1, marked: [], theme: 'verde-oscuro', sound: false, undo: [] });
  const validNumbers = list => Array.isArray(list) && list.length <= 75 && list.every(n => Number.isInteger(n) && n >= 1 && n <= 75) && new Set(list).size === list.length;
  function validateState(candidate) {
    if (!candidate || candidate.version !== 1 || !validNumbers(candidate.marked)) return null;
    return {
      version: 1,
      marked: [...candidate.marked],
      theme: THEMES.some(theme => theme.id === candidate.theme) ? candidate.theme : 'verde-oscuro',
      sound: candidate.sound === true,
      undo: Array.isArray(candidate.undo) ? candidate.undo.filter(validNumbers).slice(-100).map(list => [...list]) : []
    };
  }
  let state = defaultState();
  let storageAvailable = true;
  try { state = validateState(JSON.parse(localStorage.getItem(STORAGE_KEY))) || state; }
  catch { storageAvailable = false; }
  let channel = null;
  try { if ('BroadcastChannel' in window) channel = new BroadcastChannel(CHANNEL_NAME); } catch { /* postMessage remains available. */ }
  let projectionWindow = null;
  let audioContext = null;
  let toastTimer;
  let lastRendered = null;
  let lastContact = 0;
  const cells = new Map();
  document.body.classList.toggle('is-audience', isAudience);
  if (isAudience) document.title = 'Bingo en vivo · Oratorio';

  function letterFor(number) { return LETTERS[Math.floor((number - 1) / 15)]; }
  function labelFor(number) { return `${letterFor(number)} · ${number}`; }
  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('is-visible'), 4500);
  }
  function buildBoard() {
    LETTERS.forEach((letter, row) => {
      const rowElement = document.createElement('div');
      rowElement.className = 'bingo-row';
      rowElement.setAttribute('role', 'group');
      rowElement.setAttribute('aria-label', `Letra ${letter}, números ${row * 15 + 1} al ${row * 15 + 15}`);
      const heading = document.createElement('div');
      heading.className = 'row-letter';
      heading.textContent = letter;
      rowElement.append(heading);
      for (let column = 1; column <= 15; column++) {
        const number = row * 15 + column;
        const cell = document.createElement(isAudience ? 'div' : 'button');
        cell.className = 'number-cell';
        cell.dataset.number = number;
        cell.textContent = number;
        if (!isAudience) {
          cell.type = 'button';
          cell.addEventListener('click', () => toggleNumber(number));
        }
        cells.set(number, cell);
        rowElement.append(cell);
      }
      $('bingo-board').append(rowElement);
    });
  }
  function buildThemes() {
    THEMES.forEach(theme => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'theme-swatch';
      swatch.style.setProperty('--swatch', theme.color);
      swatch.style.setProperty('--swatch-ink', theme.ink);
      swatch.dataset.theme = theme.id;
      swatch.title = theme.name;
      swatch.setAttribute('aria-label', theme.name);
      swatch.innerHTML = '<svg aria-hidden="true"><use href="#icon-check"/></svg>';
      swatch.addEventListener('click', () => {
        if (isAudience) return;
        state.theme = theme.id;
        commit();
      });
      $('theme-swatches').append(swatch);
    });
  }
  function render() {
    const theme = THEMES.find(item => item.id === state.theme);
    const root = document.documentElement.style;
    root.setProperty('--accent', theme.color);
    root.setProperty('--accent-ink', theme.ink);
    root.setProperty('--accent-dark', theme.dark);
    root.setProperty('--accent-soft', theme.soft);
    document.querySelector('meta[name="theme-color"]').content = theme.dark;
    $('theme-name').textContent = theme.name;
    for (const swatch of $('theme-swatches').children) swatch.setAttribute('aria-pressed', String(swatch.dataset.theme === state.theme));
    const marked = new Set(state.marked);
    const latest = state.marked.at(-1);
    cells.forEach((cell, number) => {
      const isMarked = marked.has(number);
      cell.classList.toggle('is-marked', isMarked);
      cell.classList.toggle('is-latest', number === latest);
      cell.setAttribute('aria-label', `${labelFor(number)}, ${isMarked ? 'marcado' : 'por salir'}`);
      if (!isAudience) cell.setAttribute('aria-pressed', String(isMarked));
    });
    if (latest !== lastRendered && latest) {
      const cell = cells.get(latest);
      cell.classList.remove('pulse');
      void cell.offsetWidth;
      cell.classList.add('pulse');
      $('announcement').textContent = `Último número: ${labelFor(latest)}. ${state.marked.length} números marcados.`;
    }
    lastRendered = latest;
    $('last-letter').textContent = latest ? letterFor(latest) : '—';
    $('last-number').textContent = latest || '?';
    $('last-ball').setAttribute('aria-label', latest ? `Último número: ${labelFor(latest)}` : 'Todavía no hay números marcados');
    $('last-description').textContent = latest ? `¡${letterFor(latest)}, ${latest}!` : 'Todo listo para jugar';
    $('last-hint').textContent = state.marked.length === 75 ? '¡Los 75 números están en el tablero!' : latest ? '¿Lo tienes en tu cartón?' : 'La suerte está por comenzar.';
    $('marked-count').textContent = String(state.marked.length).padStart(2, '0');
    $('remaining-count').textContent = 75 - state.marked.length;
    $('progress').setAttribute('aria-valuenow', state.marked.length);
    $('progress-fill').style.width = `${state.marked.length / 75 * 100}%`;
    $('recent-numbers').replaceChildren();
    state.marked.slice(-6).reverse().forEach(number => {
      const item = document.createElement('li');
      const letter = document.createElement('span');
      letter.textContent = letterFor(number);
      item.append(letter, document.createTextNode(String(number)));
      item.setAttribute('aria-label', labelFor(number));
      $('recent-numbers').append(item);
    });
    $('recent-empty').hidden = state.marked.length > 0;
    $('undo-button').disabled = state.undo.length === 0;
    $('reset-button').disabled = state.marked.length === 0;
    $('sound-button').setAttribute('aria-pressed', String(state.sound));
    $('sound-button').title = state.sound ? 'Apagar sonido al marcar' : 'Activar sonido al marcar';
    $('sound-label').textContent = state.sound ? 'encendido' : 'apagado';
  }
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
    } catch { storageAvailable = false; }
    $('saved-status').innerHTML = `<span class="status-dot"></span> ${storageAvailable ? 'Partida guardada' : 'Guardado no disponible'}`;
    if (!storageAvailable) $('saved-status').title = 'El navegador no permite guardar. Mantén esta ventana abierta para conservar la partida.';
  }
  function send(target, kind, payload) {
    const message = { type: MESSAGE_TYPE, kind, payload };
    if (target && !target.closed) {
      try { target.postMessage(message, location.protocol === 'file:' ? '*' : location.origin); } catch { /* The window may have just closed. */ }
    }
  }
  function broadcastState() {
    const message = { type: MESSAGE_TYPE, kind: 'state', payload: state };
    if (channel) channel.postMessage(message);
    send(projectionWindow, 'state', state);
  }
  function commit() { render(); save(); broadcastState(); }
  function remember() {
    state.undo.push([...state.marked]);
    if (state.undo.length > 100) state.undo.shift();
  }
  function playTone() {
    if (!state.sound || isAudience) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().catch(() => {});
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, now);
      oscillator.frequency.setValueAtTime(880, now + .08);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(.1, now + .015);
      gain.gain.exponentialRampToValueAtTime(.001, now + .3);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + .31);
    } catch { /* Sound is optional; marking always works. */ }
  }
  function toggleNumber(number) {
    if (isAudience) return;
    remember();
    const index = state.marked.indexOf(number);
    if (index === -1) { state.marked.push(number); playTone(); }
    else { state.marked.splice(index, 1); toast(`${labelFor(number)} vuelve a estar apagado.`); }
    commit();
  }
  function undo() {
    if (isAudience || state.undo.length === 0) return;
    state.marked = state.undo.pop();
    commit();
    toast('Último cambio deshecho.');
  }
  function openProjection() {
    if (projectionWindow && !projectionWindow.closed) { projectionWindow.focus(); broadcastState(); return; }
    const url = new URL(location.href);
    url.search = '?vista=publico';
    url.hash = '';
    projectionWindow = window.open(url.href, 'oratorio-bingo-publico', 'popup=yes,width=1440,height=900,resizable=yes,scrollbars=yes');
    if (!projectionWindow) { toast('Permite las ventanas emergentes de esta página y vuelve a presionar «Proyectar tablero».'); return; }
    $('window-status').textContent = 'Ventana abierta · muévela a tu segunda pantalla';
    $('project-button').querySelector('span').textContent = 'Ver proyección';
  }
  function receive(message) {
    if (!message || message.type !== MESSAGE_TYPE) return;
    if (isAudience && message.kind === 'state') {
      const incoming = validateState(message.payload);
      if (!incoming) return;
      state = incoming;
      lastContact = Date.now();
      $('projection-status').textContent = '● Sincronizado con el moderador';
      render();
    } else if (!isAudience && message.kind === 'hello') broadcastState();
  }
  if (channel) channel.addEventListener('message', event => receive(event.data));
  window.addEventListener('message', event => {
    const allowedSource = isAudience ? event.source === window.opener : event.source === projectionWindow;
    if (!allowedSource || !event.source) return;
    if (location.protocol !== 'file:' && event.origin !== location.origin) return;
    receive(event.data);
  });
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      const incoming = validateState(JSON.parse(event.newValue));
      if (incoming) {
        state = incoming;
        render();
        if (!isAudience) broadcastState();
      }
    } catch { /* Ignore unrelated or damaged browser storage. */ }
  });

  buildBoard();
  buildThemes();
  render();

  if (!isAudience) {
    save();
    $('project-button').addEventListener('click', openProjection);
    $('undo-button').addEventListener('click', undo);
    $('reset-button').addEventListener('click', () => $('reset-dialog').showModal());
    $('cancel-reset').addEventListener('click', () => $('reset-dialog').close());
    $('confirm-reset').addEventListener('click', () => {
      remember();
      state.marked = [];
      commit();
      $('reset-dialog').close();
      $('announcement').textContent = 'Nueva partida. Todos los números están apagados.';
      toast('¡Nueva partida! Que comience la suerte.');
    });
    $('sound-button').addEventListener('click', () => { state.sound = !state.sound; if (state.sound) playTone(); commit(); });
    $('help-button').addEventListener('click', () => $('help-dialog').showModal());
    $('close-help').addEventListener('click', () => $('help-dialog').close());
    $('number-form').addEventListener('submit', event => {
      event.preventDefault();
      const value = $('number-input').value.trim();
      const number = Number(value);
      if (!value || !Number.isInteger(number) || number < 1 || number > 75) { toast('Ingresa un número entero del 1 al 75.'); return; }
      if (state.marked.includes(number)) toast(`${labelFor(number)} ya está marcado.`);
      else toggleNumber(number);
      $('number-input').value = '';
      $('number-input').focus();
    });
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey && !event.altKey && !event.target.matches('input,textarea,[contenteditable]') && !document.querySelector('dialog[open]')) { event.preventDefault(); undo(); }
    });
    setInterval(() => {
      if (projectionWindow && projectionWindow.closed) {
        projectionWindow = null;
        $('window-status').textContent = 'Se abre en una ventana independiente';
        $('project-button').querySelector('span').textContent = 'Proyectar tablero';
      }
    }, 1500);
  } else {
    $('fullscreen-button').addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        else toast('Usa la opción de pantalla completa del navegador.');
      } catch { toast('Activa pantalla completa desde el menú del navegador.'); }
    });
    document.addEventListener('fullscreenchange', () => { $('fullscreen-button').querySelector('span').textContent = document.fullscreenElement ? 'Salir de pantalla completa' : 'Pantalla completa'; });
    function requestState() {
      const hello = { type: MESSAGE_TYPE, kind: 'hello' };
      if (channel) channel.postMessage(hello);
      send(window.opener, 'hello');
      if (!lastContact || Date.now() - lastContact > 8000) $('projection-status').textContent = lastContact ? 'Moderador sin conexión · se conserva el tablero' : 'Abre esta vista desde el panel del moderador';
    }
    requestState();
    setInterval(requestState, 3000);
  }
})();
