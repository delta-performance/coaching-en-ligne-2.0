// ═══════════════════════════════════
// DELTA PERFORMANCE 2.0 - JAVASCRIPT
// ═══════════════════════════════════

const COACH_CODE = 'DELTA';
const APP_ID = 'delta-perf-v2';

// STATE
let currentUser = null;
let currentClient = null;
let currentSess = { cycle: 1, type: 'A' };
let clientProgram = [];
let clientUnlocked = new Set();
let clientArchived = new Set();
let clientLogs = {};
let allClients = [];
let allGroups = [];
let exerciseDb = [];
let copyMode = 'sess';
let transferMode = 'cycle';
let transferSess = 'A';
let visuMode = 'same-cycle';
let visuSess = 'A';
let currentSessMode = 'circuit';
let unsubLogs = null;
let archOpen = false;
let editorExos = [];
let editorSessComment = '';
let addSessMode = 'blank';
let currentEditExId = null;

// ═══════════════════════════════════
// UTILS
// ═══════════════════════════════════

function toast(msg, t = 's', d = 3000) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + t;
  el.innerHTML = '<span>' + msg + '</span>';
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'tOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, d);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-bg').forEach(m => m.classList.add('hidden'));
});

function h(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════
// LOGIN
// ═══════════════════════════════════

async function doLogin() {
  const code = document.getElementById('login-code').value.trim().toUpperCase();
  if (!code) return;

  if (code === COACH_CODE) {
    currentUser = { isCoach: true, name: 'Coach', code: COACH_CODE };
    enterApp();
    return;
  }

  try {
    const snap = await window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'clients'));
    let found = null;
    snap.forEach(d => {
      const c = d.data();
      if (c.code && c.code.toUpperCase() === code) found = { id: d.id, ...c };
    });

    if (found) {
      currentUser = { ...found, isCoach: false };
      enterApp();
    } else {
      document.getElementById('login-error').classList.remove('hidden');
      document.getElementById('login-code').classList.add('shake');
      setTimeout(() => document.getElementById('login-code').classList.remove('shake'), 300);
    }
  } catch (e) {
    console.error(e);
    toast('Erreur connexion', 'e');
  }
}

document.getElementById('login-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function enterApp() {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');

  if (currentUser.isCoach) {
    document.getElementById('nav-badge').className = 'badge badge-coach';
    document.getElementById('nav-badge').innerText = 'COACH';
    document.getElementById('nav-name').innerText = 'Administration';
    document.getElementById('view-coach').classList.remove('hidden');
    loadAllData();
  } else {
    document.getElementById('nav-badge').className = 'badge badge-client';
    document.getElementById('nav-badge').innerText = 'CLIENT';
    document.getElementById('nav-name').innerText = currentUser.name || currentUser.code;
    document.getElementById('client-greeting').innerText = 'SALUT, ' + (currentUser.name || currentUser.code).split(' ')[0].toUpperCase() + '.';
    document.getElementById('view-client').classList.remove('hidden');
    loadClientData(currentUser.id);
  }
}

function doLogout() {
  currentUser = null;
  currentClient = null;
  clientProgram = [];
  clientUnlocked = new Set();
  clientArchived = new Set();
  clientLogs = {};
  if (unsubLogs) {
    unsubLogs();
    unsubLogs = null;
  }
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('login-code').value = '';
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('view-client').classList.add('hidden');
  document.getElementById('view-coach').classList.add('hidden');
}

async function refreshData() {
  toast('Actualisation...', 'i', 1500);
  if (currentUser.isCoach) {
    await loadAllData();
  } else {
    await loadClientData(currentUser.id);
  }
  toast('Données actualisées !', 's');
}

// ═══════════════════════════════════
// CLIENT DATA
// ═══════════════════════════════════

async function loadClientData(clientId) {
  try {
    const progDoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId, 'data', 'program'));
    if (progDoc.exists() && progDoc.data().cycles && progDoc.data().cycles.length > 0) {
      clientProgram = progDoc.data().cycles;
    } else {
      clientProgram = [];
      await saveClientProgram(clientId);
    }

    const unlockDoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId, 'data', 'unlock'));
    if (unlockDoc.exists()) {
      clientUnlocked = new Set(unlockDoc.data().unlocked || []);
      clientArchived = new Set(unlockDoc.data().archived || []);
    } else {
      clientUnlocked = new Set();
      clientArchived = new Set();
      await saveClientUnlock(clientId);
    }

    if (unsubLogs) unsubLogs();
    unsubLogs = window.fdb.onSnapshot(
      window.fdb.collection(window.db, 'apps', APP_ID, 'clients', clientId, 'logs'),
      snap => {
        clientLogs = {};
        snap.forEach(d => clientLogs[d.id] = d.data());
        renderClientGrid();
        if (currentClient && !document.getElementById('sub-logs').classList.contains('hidden')) renderLogs();
      }
    );
  } catch (e) {
    console.error('loadClientData', e);
    toast('Erreur chargement', 'e');
  }
}

async function saveClientProgram(clientId) {
  const cid = clientId || (currentClient ? currentClient.id : null) || (currentUser && !currentUser.isCoach ? currentUser.id : null);
  if (!cid) return;

  function sanitize(c, t) {
    const s = c.sessions[t] || {};
    const ex = Array.isArray(s) ? s : (s.exercises || []);
    const sp = Array.isArray(s) ? {} : s;
    return {
      rest: sp.rest || '45s',
      tours: sp.tours || '3',
      mode: sp.mode || 'circuit',
      comment: sp.comment || '',
      exercises: ex.map(e => ({
        name: e.name || '',
        desc: e.desc || '',
        video: e.video || '',
        tst: e.tst || '',
        reps: e.reps || '',
        sets: e.sets || '',
        restSet: e.restSet || '',
        restEx: e.restEx || '',
        rpeTarget: e.rpeTarget || '',
        comment: e.comment || '',
        superset: e.superset || false
      }))
    };
  }

  const safe = clientProgram.map(c => {
    const sessions = {};
    Object.keys(c.sessions || {}).forEach(t => {
      sessions[t] = sanitize(c, t);
    });
    return { id: c.id, focus: c.focus || '', sessions };
  });

  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', cid, 'data', 'program'), { cycles: safe });
}

async function saveClientUnlock(clientId) {
  const cid = clientId || (currentClient ? currentClient.id : null) || (currentUser && !currentUser.isCoach ? currentUser.id : null);
  if (!cid) return;
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', cid, 'data', 'unlock'), {
    unlocked: Array.from(clientUnlocked),
    archived: Array.from(clientArchived)
  });
}

function getSessParams(c, t) {
  const s = c.sessions[t];
  if (!s || Array.isArray(s)) return { rest: '45s', tours: '3', mode: 'circuit', comment: '' };
  return { rest: s.rest || '45s', tours: s.tours || '3', mode: s.mode || 'circuit', comment: s.comment || '' };
}

function getSessEx(c, t) {
  const s = c.sessions[t];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return s.exercises || [];
}

function getAvailableSessions(c) {
  return Object.keys(c.sessions || {}).sort();
}

// ═══════════════════════════════════
// CLIENT GRID
// ═══════════════════════════════════

function renderClientGrid() {
  const grid = document.getElementById('cycles-grid');
  const archGrid = document.getElementById('archive-grid');
  const archSec = document.getElementById('archive-section');
  if (!grid) return;

  grid.innerHTML = '';
  archGrid.innerHTML = '';
  let hasArch = false;

  clientProgram.forEach(c => {
    const isArch = clientArchived.has(c.id);
    const isUnlock = clientUnlocked.has(c.id);
    const sessions = getAvailableSessions(c);
    const done = sessions.every(t => clientLogs[c.id + '-' + t]);

    if (isArch) {
      hasArch = true;
      archGrid.innerHTML += cycleCard(c, done, isUnlock, true, sessions);
    } else if (isUnlock) {
      grid.innerHTML += cycleCard(c, done, isUnlock, false, sessions);
    } else {
      grid.innerHTML += lockedCard(c, sessions);
    }
  });

  archSec.classList.toggle('hidden', !hasArch);
}

function cycleCard(c, done, isUnlock, isArch, sessions) {
  const opac = isArch ? 'opacity:.6;' : '';
  const bdr = isArch ? 'border:1px dashed var(--border)' : 'border:1px solid var(--border)';
  
  return `<div style="background:var(--card);${bdr};border-radius:1.5rem;padding:1.75rem;${opac};transition:all .2s" ${!isArch ? 'onmouseover="this.style.borderColor=\'rgba(240,165,0,.3)\'" onmouseout="this.style.borderColor=\'var(--border)\'"' : ''}>
    ${done ? `<span class="badge" style="background:var(--gold);color:#1a0900;margin-bottom:.75rem;display:inline-block">COMPLET</span>` : ''}
    ${isArch ? `<span class="badge badge-archived" style="margin-bottom:.75rem;display:inline-block">ARCHIVE</span>` : ''}
    <h4 style="font-size:2rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:.25rem">CYCLE ${c.id}</h4>
    <p style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.08em;color:rgba(240,165,0,.6);margin-bottom:1.5rem">${h(c.focus)}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:.75rem">
      ${sessions.map(t => {
        const d = clientLogs[c.id + '-' + t];
        if (!isUnlock) return `<div style="height:3.25rem;border-radius:1rem;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.875rem">—</div>`;
        const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#f59e0b', G: '#06b6d4', H: '#84cc16' };
        const col = colors[t] || '#6b7280';
        return `<button onclick="handleSess(${c.id},'${t}')" class="sess-btn" style="${d ? `background:linear-gradient(135deg,${col},${col}cc);border-color:transparent;color:white` : ''}">${d ? '✓' : t}</button>`;
      }).join('')}
    </div>
  </div>`;
}

function lockedCard(c, sessions) {
  return `<div style="background:#0a0f18;border:1px solid #111a28;border-radius:1.5rem;padding:1.75rem;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,.012) 12px,rgba(255,255,255,.012) 24px);pointer-events:none"></div>
    <div style="position:absolute;top:1.25rem;right:1.25rem;display:flex;align-items:center;gap:.4rem;background:rgba(8,12,18,.7);padding:.3rem .75rem;border-radius:.5rem;border:1px solid var(--border)">
      <span style="font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted)">Verrouillé</span>
    </div>
    <h4 style="font-size:2rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem">CYCLE ${c.id}</h4>
    <p style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.08em;color:var(--border);margin-bottom:1.5rem">${h(c.focus)}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:.75rem;margin-bottom:1rem">
      ${sessions.map(() => `<div style="height:3.25rem;border-radius:1rem;background:rgba(8,12,18,.5);border:1px solid var(--border)"></div>`).join('')}
    </div>
    <p style="font-size:.7rem;color:var(--muted);font-style:italic">Contacte ton coach.</p>
  </div>`;
}

function toggleArchive() {
  archOpen = !archOpen;
  const ag = document.getElementById('archive-grid');
  ag.style.display = archOpen ? 'grid' : 'none';
  ag.classList.toggle('hidden', !archOpen);
  document.getElementById('archive-label').innerText = archOpen ? 'Masquer archives' : 'Afficher archives';
}

// ═══════════════════════════════════
// SESSION DETAIL (CLIENT VIEW)
// ═══════════════════════════════════

function handleSess(cId, type) {
  currentSess = { cycle: cId, type };
  if (clientLogs[cId + '-' + type]) openModal('modal-done');
  else openDetail();
}

function openDetail() {
  const { cycle, type } = currentSess;
  const c = clientProgram.find(x => x.id === cycle);
  if (!c) return;

  const log = clientLogs[cycle + '-' + type];
  const sp = getSessParams(c, type);
  const exs = getSessEx(c, type);

  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#f59e0b', G: '#06b6d4', H: '#84cc16' };
  const col = colors[type] || '#f0a500';
  const isCircuit = sp.mode !== 'classic';

  document.getElementById('detail-bar').style.background = `linear-gradient(90deg,${col},${col}44)`;
  document.getElementById('detail-tag').innerText = 'CYCLE ' + cycle + ' • S-' + type;
  document.getElementById('detail-title').innerText = 'SÉANCE ' + type;
  document.getElementById('detail-focus').innerText = c.focus;
  document.getElementById('detail-mode-badge').innerHTML = isCircuit
    ? `<span class="badge" style="background:rgba(240,165,0,.15);color:var(--gold);border:1px solid rgba(240,165,0,.3)">⟳ CIRCUIT</span>`
    : `<span class="badge" style="background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)">≡ CLASSIQUE</span>`;

  // Stats
  let statsHTML = '';
  if (isCircuit) {
    statsHTML = `<div class="card" style="padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Repos</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900">${sp.rest || '-'}</div></div>
    <div style="background:var(--card);border:1px solid rgba(240,165,0,.25);border-radius:1.5rem;padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Tours</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;color:var(--gold)">${sp.tours || '3'}</div></div>`;
  } else {
    statsHTML = `<div class="card" style="padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Exercices</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900">${exs.length}</div></div>`;
  }
  document.getElementById('detail-stats').innerHTML = statsHTML;

  // Build exercise list with superset grouping
  let exHTML = '';
  if (isCircuit) {
    exHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem">`;
    exs.forEach((e, i) => {
      exHTML += exCard(e, i, type, col, isCircuit);
    });
    exHTML += `</div>`;
  } else {
    // Classic: group supersets
    let i = 0;
    while (i < exs.length) {
      const e = exs[i];
      // Check if this is a superset
      let supersetGroup = [e];
      let j = i + 1;
      while (j < exs.length && exs[j - 1].superset) {
        supersetGroup.push(exs[j]);
        j++;
      }

      if (supersetGroup.length > 1) {
        exHTML += supersetCard(supersetGroup, i, type, col);
        i = j;
      } else {
        exHTML += exCard(e, i, type, col, isCircuit);
        i++;
      }
    }
  }

  document.getElementById('exercise-list').innerHTML = exHTML;

  if (log) {
    document.getElementById('rapport-form').classList.add('hidden');
    document.getElementById('rapport-done').classList.remove('hidden');
  } else {
    document.getElementById('rapport-form').classList.remove('hidden');
    document.getElementById('rapport-done').classList.add('hidden');
    document.getElementById('rpe-input').value = 5;
    document.getElementById('rpe-display').innerText = '5';
    document.getElementById('comment-input').value = '';
  }

  document.getElementById('client-grid-view').classList.add('hidden');
  document.getElementById('client-detail-view').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exCard(e, i, type, col, isCircuit) {
  const num = i + 1;
  
  // Get exercise photo from DB
  const dbEx = exerciseDb.find(ex => ex.name === e.name);
  const photoUrl = dbEx?.photo || '';
  
  const photoHTML = photoUrl ? `<div style="position:absolute;inset:0;background-image:url('${h(photoUrl)}');background-size:cover;background-position:center;opacity:.3"></div>` : '';

  const classicInfo = !isCircuit && (e.sets || e.restSet || e.rpeTarget) ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;padding:.75rem 1rem 0">
    ${e.sets ? `<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--muted);background:var(--surface);padding:.2rem .5rem;border-radius:.4rem">${e.sets} séries</span>` : ''}
    ${e.restSet ? `<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--muted);background:var(--surface);padding:.2rem .5rem;border-radius:.4rem">Récup: ${e.restSet}</span>` : ''}
    ${e.rpeTarget ? `<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--gold);background:rgba(240,165,0,.1);padding:.2rem .5rem;border-radius:.4rem">RPE ${e.rpeTarget}</span>` : ''}
  </div>` : '';

  const restExHTML = !isCircuit && e.restEx ? `<div style="padding:.75rem 1rem;background:rgba(240,165,0,.05);border-top:1px solid rgba(240,165,0,.1);text-align:center">
    <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--gold)">Récup après cet exercice: ${h(e.restEx)}</span>
  </div>` : '';

  return `<div class="ex-card">
    <div style="background:${col}22;border-bottom:1px solid ${col}33;padding:1.25rem;text-align:center;position:relative;min-height:90px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      ${photoHTML}
      <span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white;z-index:1">0${num}</span>
      ${e.superset ? `<span style="position:absolute;top:.75rem;right:.75rem;font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900;z-index:1">⇄</span>` : ''}
      <h5 style="font-size:1.1rem;font-weight:900;font-style:italic;text-transform:uppercase;color:white;line-height:1.2;position:relative;z-index:1">${h(e.name)}</h5>
    </div>
    <div style="display:flex;gap:.5rem;padding:.875rem 1rem 0">
      ${e.tst ? `<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.75rem;padding:.4rem;text-align:center"><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.2rem">Tempo</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900">${h(e.tst)}</div></div>` : ''}
      ${e.reps ? `<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.75rem;padding:.4rem;text-align:center"><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.2rem">Volume</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;color:var(--gold)">${h(e.reps)}</div></div>` : ''}
    </div>
    ${classicInfo}
    <div style="padding:.875rem 1rem">
      <p style="font-size:.75rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">${h(e.desc)}</p>
      ${e.video ? `<a href="${h(e.video)}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);text-decoration:none">VOIR DÉMO</a>` : ''}
    </div>
    ${restExHTML}
  </div>`;
}

function supersetCard(exercises, startIdx, type, col) {
  const num = startIdx + 1;
  
  return `<div class="superset-wrap">
    <div class="superset-label">⇄ SUPERSET ${num}</div>
    <div style="display:grid;grid-template-columns:repeat(${exercises.length},1fr);gap:1rem;position:relative">
      ${exercises.map((e, localIdx) => {
        const globalIdx = startIdx + localIdx;
        const dbEx = exerciseDb.find(ex => ex.name === e.name);
        const photoUrl = dbEx?.photo || '';
        const photoHTML = photoUrl ? `<div style="position:absolute;inset:0;background-image:url('${h(photoUrl)}');background-size:cover;background-position:center;opacity:.3"></div>` : '';
        
        return `<div class="ex-card">
          <div style="background:${col}22;border-bottom:1px solid ${col}33;padding:1rem;text-align:center;position:relative;min-height:80px;display:flex;align-items:center;justify-content:center;overflow:hidden">
            ${photoHTML}
            <span style="position:absolute;top:.5rem;left:.5rem;width:1.5rem;height:1.5rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;color:white;z-index:1">${String.fromCharCode(65 + localIdx)}</span>
            <h5 style="font-size:.95rem;font-weight:900;font-style:italic;text-transform:uppercase;color:white;line-height:1.2;position:relative;z-index:1">${h(e.name)}</h5>
          </div>
          <div style="padding:.75rem">
            <div style="display:flex;gap:.4rem;margin-bottom:.5rem">
              ${e.reps ? `<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.5rem;padding:.3rem;text-align:center"><div style="font-size:.45rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">Reps</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;color:var(--gold)">${h(e.reps)}</div></div>` : ''}
              ${e.tst ? `<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.5rem;padding:.3rem;text-align:center"><div style="font-size:.45rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">Tempo</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900">${h(e.tst)}</div></div>` : ''}
            </div>
            <div style="display:flex;gap:.4rem;margin-bottom:.5rem">
              ${e.sets ? `<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.5rem;padding:.3rem;text-align:center"><div style="font-size:.45rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">Séries</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900">${h(e.sets)}</div></div>` : ''}
              ${e.rpeTarget ? `<div style="flex:1;background:rgba(240,165,0,.1);border:1px solid rgba(240,165,0,.2);border-radius:.5rem;padding:.3rem;text-align:center"><div style="font-size:.45rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">RPE</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;color:var(--gold)">${h(e.rpeTarget)}</div></div>` : ''}
            </div>
            ${e.restSet ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:.5rem;padding:.3rem;text-align:center;margin-bottom:.5rem"><div style="font-size:.45rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">Récup série</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.75rem;font-weight:900">${h(e.restSet)}</div></div>` : ''}
            <p style="font-size:.65rem;color:var(--muted);line-height:1.4;margin-bottom:.5rem">${h(e.desc)}</p>
            ${e.video ? `<a href="${h(e.video)}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:.5rem;padding:.4rem;font-family:'Barlow Condensed',sans-serif;font-size:.55rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--gold);text-decoration:none">DÉMO</a>` : ''}
          </div>
        </div>`;
      }).join('')}
      <div class="superset-arrow" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;color:var(--gold);font-size:1.5rem;line-height:1;opacity:.6;pointer-events:none">
        <div>↕</div>
      </div>
    </div>
  </div>`;
}

function closeDetail() {
  document.getElementById('client-detail-view').classList.add('hidden');
  document.getElementById('client-grid-view').classList.remove('hidden');
}

document.getElementById('rpe-input').addEventListener('input', e => {
  document.getElementById('rpe-display').innerText = e.target.value;
});

// ═══════════════════════════════════
// VALIDATION
// ═══════════════════════════════════

let _rpe = 5, _comment = '';

function openConfirmModal() {
  _rpe = parseInt(document.getElementById('rpe-input').value) || 5;
  _comment = document.getElementById('comment-input').value || '';
  document.getElementById('confirm-rpe').innerText = _rpe;
  openModal('modal-confirm');
}

async function submitValidation() {
  closeModal('modal-confirm');
  const cid = currentUser.isCoach ? currentClient.id : currentUser.id;
  const key = currentSess.cycle + '-' + currentSess.type;
  const btn = document.getElementById('btn-validate');
  btn.disabled = true;
  btn.innerText = 'ENVOI...';

  try {
    await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', cid, 'logs', key), {
      id: key,
      cycle: currentSess.cycle,
      type: currentSess.type,
      rpe: _rpe,
      comment: _comment,
      timestamp: new Date().toISOString()
    });
    btn.disabled = false;
    btn.innerText = "VALIDER L'EFFORT";
    openDetail();
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    btn.innerText = 'ERREUR';
    toast('Erreur reseau', 'e');
  }
}

// ═══════════════════════════════════
// COACH: LOAD ALL DATA
// ═══════════════════════════════════

async function loadAllData() {
  try {
    // clients
    const snap = await window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'clients'));
    allClients = [];
    snap.forEach(d => allClients.push({ id: d.id, ...d.data() }));

    // groups
    const gsnap = await window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'groups'));
    allGroups = [];
    gsnap.forEach(d => allGroups.push({ id: d.id, ...d.data() }));

    // exercise db
    const dbsnap = await window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'exerciseDb'));
    exerciseDb = [];
    dbsnap.forEach(d => exerciseDb.push({ id: d.id, ...d.data() }));

    renderClientsGrid();
    populateGroupSelects();
    populateTransferSelects();
    renderGroupes();
    renderDatabase();
    updateDbFilterDropdowns();
  } catch (e) {
    console.error(e);
    toast('Erreur chargement', 'e');
  }
}

// ═══════════════════════════════════
// COACH: CLIENTS GRID
// ═══════════════════════════════════

function renderClientsGrid() {
  const g = document.getElementById('clients-grid');
  if (!g) return;

  const filterGroup = document.getElementById('filter-group').value;
  const showArchived = document.getElementById('show-archived').checked;

  let list = allClients.filter(c => {
    if (!showArchived && c.archived) return false;
    if (filterGroup && c.group !== filterGroup) return false;
    return true;
  });

  if (!list.length) {
    g.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun client.</p>';
    return;
  }

  g.innerHTML = list.map(c => `
    <div class="card-hover" onclick="openClientFiche('${c.id}')" style="${c.archived ? 'opacity:.6' : ''}">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
        <div style="width:3rem;height:3rem;border-radius:1rem;background:linear-gradient(135deg,var(--brand),var(--brand2));display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;font-style:italic;color:white;flex-shrink:0">${((c.name || c.code || '?')[0]).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(c.name || '—')}</div>
          <div style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold)">CODE: ${h(c.code || '—')}</div>
        </div>
      </div>
      ${c.group ? `<span class="badge badge-group" style="margin-bottom:.75rem;display:inline-block">${h(allGroups.find(g => g.id === c.group)?.name || c.group)}</span>` : ''}
      ${c.archived ? `<span class="badge badge-archived" style="margin-bottom:.75rem;display:inline-block;margin-left:.5rem">Archivé</span>` : ''}
      ${c.objectif ? `<p style="font-size:.75rem;color:var(--muted);font-style:italic;margin-bottom:.875rem">${h(c.objectif)}</p>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:.5rem" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="toggleArchiveClient('${c.id}')">${c.archived ? 'Désarchiver' : 'Archiver'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">Suppr.</button>
      </div>
    </div>`).join('');
}

async function openClientFiche(clientId) {
  const c = allClients.find(x => x.id === clientId);
  if (!c) return;

  currentClient = c;
  document.getElementById('fiche-client-name').innerText = c.name || c.code;
  document.getElementById('fiche-client-code').innerText = 'CODE: ' + (c.code || '—');
  document.getElementById('ctab-fiche').style.display = '';

  switchCoachTab('fiche');
  switchSubTab('logs');

  await loadClientData(clientId);
  rebuildEditorSelects();
  populateVisuSelect();
}

async function toggleArchiveClient(clientId) {
  const c = allClients.find(x => x.id === clientId);
  if (!c) return;

  c.archived = !c.archived;
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId), c);
  toast(c.archived ? 'Client archivé' : 'Client désarchivé', c.archived ? 'w' : 's');
  renderClientsGrid();
}

let _delClientPending = null;

async function deleteClient(clientId) {
  if (_delClientPending !== clientId) {
    _delClientPending = clientId;
    setTimeout(() => _delClientPending = null, 3000);
    toast('Cliquez encore pour confirmer', 'w', 3000);
    return;
  }
  _delClientPending = null;

  await window.fdb.deleteDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId));
  allClients = allClients.filter(c => c.id !== clientId);
  toast('Client supprimé', 'i');
  renderClientsGrid();
  populateTransferSelects();
}

async function createClient() {
  const name = document.getElementById('nc-prenom').value.trim();
  const code = document.getElementById('nc-code').value.trim().toUpperCase();
  const objectif = document.getElementById('nc-objectif').value.trim();
  const group = document.getElementById('nc-group').value;

  if (!name || !code) {
    toast('Nom et code requis', 'w');
    return;
  }
  if (allClients.find(c => c.code === code)) {
    toast('Code déjà utilisé', 'w');
    return;
  }

  const newId = 'client_' + Date.now();
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', newId), {
    name,
    code,
    objectif,
    group,
    archived: false,
    createdAt: new Date().toISOString()
  });

  // Create initial cycle with no sessions
  const initialCycle = {
    id: 1,
    focus: 'Cycle 1',
    sessions: {}
  };
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', newId, 'data', 'program'), {
    cycles: [initialCycle]
  });

  closeModal('modal-add-client');
  ['nc-prenom', 'nc-code', 'nc-objectif'].forEach(id => document.getElementById(id).value = '');
  toast(name + ' créé !', 's');
  await loadAllData();
}

// ═══════════════════════════════════
// GROUPES
// ═══════════════════════════════════

function populateGroupSelects() {
  const opts = allGroups.map(g => `<option value="${g.id}">${h(g.name)}</option>`).join('');
  ['filter-group', 'nc-group'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const base = id === 'filter-group' ? '<option value="">Tous les groupes</option>' : '<option value="">Aucun groupe</option>';
    el.innerHTML = base + opts;
  });
}

function renderGroupes() {
  const el = document.getElementById('groupes-list');
  if (!el) return;

  if (!allGroups.length) {
    el.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun groupe créé.</p>';
    return;
  }

  el.innerHTML = allGroups.map(g => {
    const members = allClients.filter(c => c.group === g.id && !c.archived);
    return `<div class="card" style="padding:1.5rem">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
        <div>
          <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">${h(g.name)}</h4>
          <p style="font-size:.75rem;color:var(--muted);margin-top:.25rem">${members.length} client(s)</p>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteGroup('${g.id}')">Supprimer groupe</button>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem">
        ${members.map(c => `<span class="badge" style="background:var(--surface);color:var(--text);border:1px solid var(--border);cursor:pointer" onclick="openClientFiche('${c.id}')">${h(c.name || c.code)}</span>`).join('')}
        ${members.length === 0 ? `<p style="font-size:.75rem;color:var(--muted);font-style:italic">Aucun membre actif.</p>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function createGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  if (!name) {
    toast('Nom requis', 'w');
    return;
  }

  const newId = 'group_' + Date.now();
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'groups', newId), {
    name,
    createdAt: new Date().toISOString()
  });

  closeModal('modal-add-group');
  document.getElementById('new-group-name').value = '';
  toast('Groupe "' + name + '" créé !', 's');
  await loadAllData();
}

async function deleteGroup(groupId) {
  await window.fdb.deleteDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'groups', groupId));

  // Remove group ref from clients
  const affected = allClients.filter(c => c.group === groupId);
  for (const c of affected) {
    c.group = '';
    await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', c.id), c);
  }

  toast('Groupe supprimé (clients conservés)', 'i');
  await loadAllData();
}

// ═══════════════════════════════════
// COACH TABS
// ═══════════════════════════════════

function switchCoachTab(tab) {
  ['clients', 'fiche', 'groupes', 'transfer', 'database'].forEach(t => {
    const el = document.getElementById('coach-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('ctab-' + t);
    if (btn) btn.className = 'tab-pill ' + (t === tab ? 'on' : 'off');
  });

  if (tab === 'transfer') populateTransferSelects();
  if (tab === 'database') {
    renderDatabase();
    updateDbFilterDropdowns();
  }
}

function switchSubTab(tab) {
  ['logs', 'unlock', 'cycles', 'editor', 'visu'].forEach(t => {
    const el = document.getElementById('sub-' + t);
    if (!el) return;

    if (t === 'cycles') {
      el.style.display = (t === tab) ? 'flex' : 'none';
      el.classList.toggle('hidden', t !== tab);
    } else {
      el.classList.toggle('hidden', t !== tab);
    }

    const btn = document.getElementById('stab-' + t);
    if (btn) btn.className = 'sub-tab ' + (t === tab ? 'on' : 'off');
  });

  if (tab === 'logs') renderLogs();
  if (tab === 'unlock') renderUnlockGrid();
  if (tab === 'cycles') renderCycleStatus();
  if (tab === 'editor') {
    rebuildEditorSelects();
    syncEditor();
  }
  if (tab === 'visu') {
    populateVisuSelect();
    renderVisu();
  }
}

// Continue in next part due to length...

// Export functions to window
Object.assign(window, {
  doLogin,
  doLogout,
  refreshData,
  openModal,
  closeModal,
  handleSess,
  openDetail,
  closeDetail,
  openConfirmModal,
  submitValidation,
  toggleArchive,
  renderClientsGrid,
  openClientFiche,
  createClient,
  deleteClient,
  toggleArchiveClient,
  switchCoachTab,
  switchSubTab,
  createGroup,
  deleteGroup,
  renderGroupes,
  h
});
