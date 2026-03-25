async function loadClientData(clientId) {
  try {
    const progDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId,'data','program'));
    if (progDoc.exists && progDoc.data().cycles && progDoc.data().cycles.length > 0) {
      clientProgram = progDoc.data().cycles;
    } else { clientProgram = []; await saveClientProgram(clientId); }
    const unlockDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId,'data','unlock'));
    if (unlockDoc.exists) {
      clientUnlocked = new Set(unlockDoc.data().unlocked || []);
      clientArchived = new Set(unlockDoc.data().archived || []);
    } else { clientUnlocked = new Set(); clientArchived = new Set(); await saveClientUnlock(clientId); }
    // Charge la base d'exercices pour les images côté client
    if (!currentUser || !currentUser.isCoach) {
      const dbsnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'exerciseDb'));
      exerciseDb = []; dbsnap.forEach(d => exerciseDb.push({ id: d.id, ...d.data() }));
    }
    if (unsubLogs) unsubLogs();
    unsubLogs = window.fdb.onSnapshot(
      window.fdb.collection(window.db,'apps',APP_ID,'clients',clientId,'logs'),
      snap => {
        clientLogs = {}; snap.forEach(d => clientLogs[d.id] = d.data());
        renderClientGrid();
        if (currentClient && !document.getElementById('sub-logs').classList.contains('hidden')) renderLogs();
      }
    );
  } catch(e) { console.error('loadClientData', e); toast('Erreur chargement', 'e'); }
}

async function saveClientProgram(clientId) {
  const cid = clientId || (currentClient ? currentClient.id : null) || (currentUser && !currentUser.isCoach ? currentUser.id : null);
  if (!cid) return;
  function sanitize(c, t) {
    const s = c.sessions[t] || {};
    const ex = Array.isArray(s) ? s : (s.exercises || []);
    const sp = Array.isArray(s) ? {} : s;
    return {
      rest: sp.rest || '45s', tours: sp.tours || '3', mode: sp.mode || 'circuit', comment: sp.comment || '',
      exercises: ex.map(e => ({
        name: e.name||'', desc: e.desc||'', video: e.video||'', photo: e.photo||'',
        tst: e.tst||'', reps: e.reps||'', sets: e.sets||'', restSet: e.restSet||'',
        restEx: e.restEx||'', rpeTarget: e.rpeTarget||'', comment: e.comment||'', superset: e.superset||false
      }))
    };
  }
  const safe = clientProgram.map(c => {
    const active = Array.isArray(c.sessions_active) ? c.sessions_active : [];
    const allKeys = [...new Set([...active, ...Object.keys(c.sessions||{})])];
    const sessObj = {};
    allKeys.forEach(t => { sessObj[t] = sanitize(c, t); });
    return { id: c.id, focus: c.focus||'', sessions_active: active, sessions: sessObj };
  });
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'data','program'), { cycles: safe });
}

async function saveClientUnlock(clientId) {
  const cid = clientId || (currentClient ? currentClient.id : null) || (currentUser && !currentUser.isCoach ? currentUser.id : null);
  if (!cid) return;
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'data','unlock'), { unlocked: Array.from(clientUnlocked), archived: Array.from(clientArchived) });
}

function getSessParams(c, t) { const s = c.sessions[t]; if (!s||Array.isArray(s)) return { rest:'45s',tours:'3',mode:'circuit',comment:'' }; return { rest:s.rest||'45s', tours:s.tours||'3', mode:s.mode||'circuit', comment:s.comment||'' }; }
function getSessEx(c, t) { const s = c.sessions[t]; if (!s) return []; if (Array.isArray(s)) return s; return s.exercises||[]; }

// ── CLIENT GRID ──────────────────────────────────────
function renderClientGrid() {
  const grid = document.getElementById('cycles-grid');
  const archGrid = document.getElementById('archive-grid');
  const archSec = document.getElementById('archive-section');
  if (!grid) return;
  grid.innerHTML = ''; archGrid.innerHTML = ''; let hasArch = false;
  clientProgram.forEach(c => {
    const isArch = clientArchived.has(c.id);
    const isUnlock = clientUnlocked.has(c.id);
    const active = getActiveSessions(c);
    const done = active.length > 0 && active.every(t => clientLogs[c.id+'-'+t]);
    if (isArch) { hasArch = true; archGrid.innerHTML += cycleCard(c, done, isUnlock, true); }
    else if (isUnlock) { grid.innerHTML += cycleCard(c, done, isUnlock, false); }
    else { grid.innerHTML += lockedCard(c); }
  });
  archSec.classList.toggle('hidden', !hasArch);
}

function cycleCard(c, done, isUnlock, isArch) {
  const opac = isArch ? 'opacity:.6;' : '';
  const bdr = isArch ? 'border:1px dashed var(--border)' : 'border:1px solid var(--border)';
  const active = getActiveSessions(c);
  const sessHTML = active.length === 0
    ? '<p style="font-size:.7rem;color:var(--muted);font-style:italic;grid-column:1/-1">Aucune séance configurée.</p>'
    : active.map(t => {
        const d = clientLogs[c.id+'-'+t];
        return `<button onclick="handleSess(${c.id},'${t}')" class="sess-btn${d?' sess-'+t:''}">${d?'✓':t}</button>`;
      }).join('');
  return `<div style="background:var(--card);${bdr};border-radius:1.5rem;padding:1.75rem;${opac};transition:all .2s" ${!isArch?'onmouseover="this.style.borderColor=\'rgba(240,165,0,.3)\'" onmouseout="this.style.borderColor=\'var(--border)\'"':''}>
    ${done?`<span class="badge" style="background:var(--gold);color:#1a0900;margin-bottom:.75rem;display:inline-block">COMPLET</span>`:''}
    ${isArch?`<span class="badge badge-archived" style="margin-bottom:.75rem;display:inline-block">ARCHIVE</span>`:''}
    <h4 style="font-size:2rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:-.02em;margin-bottom:.25rem">CYCLE ${c.id}</h4>
    <p style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.08em;color:rgba(240,165,0,.6);margin-bottom:1.5rem">${h(c.focus)}</p>
    <div style="display:grid;grid-template-columns:repeat(${Math.max(active.length,1)},1fr);gap:.75rem">${sessHTML}</div>
  </div>`;
}

function lockedCard(c) {
  return `<div style="background:#0a0f18;border:1px solid #111a28;border-radius:1.5rem;padding:1.75rem;position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,.012) 12px,rgba(255,255,255,.012) 24px);pointer-events:none"></div>
    <div style="position:absolute;top:1.25rem;right:1.25rem;background:rgba(8,12,18,.7);padding:.3rem .75rem;border-radius:.5rem;border:1px solid var(--border)">
      <span style="font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted)">Verrouillé</span>
    </div>
    <h4 style="font-size:2rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);margin-bottom:.25rem">CYCLE ${c.id}</h4>
    <p style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.08em;color:var(--border);margin-bottom:1.5rem">${h(c.focus)}</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1rem">
      ${['A','B','C','D'].map(()=>`<div style="height:3.25rem;border-radius:1rem;background:rgba(8,12,18,.5);border:1px solid var(--border)"></div>`).join('')}
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

// ── SESSION DETAIL ────────────────────────────────────
function handleSess(cId, type) {
  currentSess = { cycle: cId, type };
  if (clientLogs[cId+'-'+type]) openModal('modal-done');
  else openDetail();
}

function openDetail() {
  const { cycle, type } = currentSess;
  const c = clientProgram.find(x => x.id === cycle); if (!c) return;
  const log = clientLogs[cycle+'-'+type];
  const sp = getSessParams(c, type);
  const exs = getSessEx(c, type);
  const col = getSessColor(type);
  const isCircuit = sp.mode !== 'classic';

  document.getElementById('detail-bar').style.background = `linear-gradient(90deg,${col},${col}44)`;
  document.getElementById('detail-tag').innerText = 'CYCLE '+cycle+' • S-'+type;
  document.getElementById('detail-title').innerText = 'SÉANCE ' + type;
  document.getElementById('detail-focus').innerText = c.focus;
  document.getElementById('detail-mode-badge').innerHTML = isCircuit
    ? `<span class="badge" style="background:rgba(240,165,0,.15);color:var(--gold);border:1px solid rgba(240,165,0,.3)">⟳ CIRCUIT</span>`
    : `<span class="badge" style="background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)">≡ CLASSIQUE</span>`;

  let statsHTML = '';
  if (isCircuit) {
    statsHTML = `<div class="card" style="padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Repos</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900">${sp.rest||'-'}</div></div>
    <div style="background:var(--card);border:1px solid rgba(240,165,0,.25);border-radius:1.5rem;padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Tours</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;color:var(--gold)">${sp.tours||'3'}</div></div>`;
  } else {
    statsHTML = `<div class="card" style="padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Exercices</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900">${exs.length}</div></div>`;
  }
  document.getElementById('detail-stats').innerHTML = statsHTML;

  let exHTML = '';
  if (isCircuit) {
    exHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem">`;
    exs.forEach((e, i) => { exHTML += exCard(e, i, type, col, true); });
    exHTML += `</div>`;
  } else {
    const groups = groupExercises(exs);
    groups.forEach((g, gi) => {
      if (g.type === 'superset') {
        exHTML += `<div class="superset-wrap"><div class="superset-label">⇄ SUPERSET</div><div style="display:grid;grid-template-columns:repeat(${g.items.length},1fr);gap:1rem">`;
        g.items.forEach(item => { exHTML += exCard(item.ex, item.idx, type, col, false); });
        exHTML += `</div></div>`;
      } else {
        exHTML += exCard(g.ex, g.idx, type, col, false);
      }
      // Récup entre exercices
      if (gi < groups.length - 1) {
        const lastEx = g.type === 'superset' ? g.items[g.items.length-1].ex : g.ex;
        if (lastEx.restEx) {
          exHTML += `<div style="display:flex;align-items:center;gap:1rem;padding:.5rem 0">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            <span style="font-size:.65rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;flex-shrink:0">↓ ${h(lastEx.restEx)} de récup</span>
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>`;
        }
      }
    });
  }
  document.getElementById('exercise-list').innerHTML = exHTML;

  if (log) { document.getElementById('rapport-form').classList.add('hidden'); document.getElementById('rapport-done').classList.remove('hidden'); }
  else {
    document.getElementById('rapport-form').classList.remove('hidden');
    document.getElementById('rapport-done').classList.add('hidden');
    document.getElementById('rpe-input').value = 5; document.getElementById('rpe-display').innerText = '5';
    document.getElementById('comment-input').value = '';
  }
  // Init workout data
  workoutData = {};
  document.getElementById('client-grid-view').classList.add('hidden');
  document.getElementById('client-detail-view').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exCard(e, i, type, col, isCircuit) {
  const dbEx = exerciseDb.find(x => x.name === e.name);
  const photo = e.photo || (dbEx ? dbEx.photo : '');
  const video = e.video || (dbEx ? dbEx.video : '');
  const setsCount = parseInt(e.sets) || 3;
  const hasPerfData = workoutData[i];
  const perfBtnStyle = hasPerfData
    ? 'background:rgba(240,165,0,.25);border-color:rgba(240,165,0,.5);color:var(--gold)'
    : 'background:var(--surface);border-color:var(--border);color:var(--muted)';
  const perfBtnLabel = hasPerfData ? '📊 MODIF.' : '📊 PERF';
  const perfBtn = `<button id="perf-btn-${i}" onclick="openPerfModal(${i},'${h(e.name).replace(/'/g,"\\'")}',${setsCount})" style="display:flex;align-items:center;justify-content:center;gap:.4rem;${perfBtnStyle};border:1px solid;border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;transition:all .2s;width:100%">${perfBtnLabel}</button>`;

  // Header gradient couleur dynamique
  const gradStyle = `background:linear-gradient(135deg,${col}cc,${col}88)`;

  const headerInner = photo
    ? `<img src="${h(photo)}" style="height:80px;width:auto;max-width:120px;object-fit:contain;flex-shrink:0;border-radius:.5rem;margin-left:1.5rem" onerror="this.style.display='none'">
       <div style="flex:1;padding-left:.75rem">
         ${e.superset?`<span style="position:absolute;top:.75rem;right:.75rem;font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900">⇄</span>`:''}
         <h5 style="font-size:1rem;font-weight:900;font-style:italic;text-transform:uppercase;color:white;line-height:1.2">${h(e.name)}</h5>
       </div>`
    : `<span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white">${String(i+1).padStart(2,'0')}</span>
       ${e.superset?`<span style="position:absolute;top:.75rem;right:.75rem;font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900">⇄</span>`:''}
       <h5 style="font-size:1.1rem;font-weight:900;font-style:italic;text-transform:uppercase;color:white;line-height:1.2">${h(e.name)}</h5>`;

  if (!isCircuit) {
    return `<div class="ex-card">
      <div style="${gradStyle};padding:1.25rem;display:flex;align-items:center;position:relative;min-height:90px">
        ${!photo?'':`<span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white">${String(i+1).padStart(2,'0')}</span>`}
        ${headerInner}
      </div>
      <div style="padding:.875rem 1rem">
        ${(e.sets||e.reps)?`<div style="display:flex;gap:1.5rem;margin-bottom:.6rem;align-items:flex-end">
          ${e.sets?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Séries</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:900;line-height:1">${h(e.sets)}</div></div>`:''}
          ${e.reps?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Répétitions</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:900;color:var(--gold);line-height:1">${h(e.reps)}</div></div>`:''}
        </div>`:''}
        ${(e.restSet||e.rpeTarget)?`<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem">
          ${e.restSet?`<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--muted);background:var(--surface);padding:.2rem .6rem;border-radius:.4rem;border:1px solid var(--border)">Récup: ${h(e.restSet)}</span>`:''}
          ${e.rpeTarget?`<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--gold);background:rgba(240,165,0,.1);padding:.2rem .6rem;border-radius:.4rem;border:1px solid rgba(240,165,0,.2)">RPE cible: ${h(e.rpeTarget)}</span>`:''}
        </div>`:''}
        ${e.tst?`<div style="font-size:.7rem;color:var(--muted);margin-bottom:.4rem">Tempo: ${h(e.tst)}</div>`:''}
        ${e.desc?`<p style="font-size:.75rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">${h(e.desc)}</p>`:''}
        <div style="display:flex;gap:.5rem;flex-direction:column">
          ${video?`<a href="${h(video)}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);text-decoration:none">▶ VOIR DÉMO</a>`:''}
          ${perfBtn}
        </div>
      </div>
    </div>`;
  }

  // Circuit mode
  return `<div class="ex-card">
    <div style="${gradStyle};padding:1.25rem;display:flex;align-items:center;position:relative;min-height:90px">
      ${!photo?'':`<span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white">${String(i+1).padStart(2,'0')}</span>`}
      ${headerInner}
    </div>
    <div style="display:flex;gap:.5rem;padding:.875rem 1rem 0">
      ${e.tst?`<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.75rem;padding:.4rem;text-align:center"><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.2rem">Tempo</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900">${h(e.tst)}</div></div>`:''}
      ${e.reps?`<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.75rem;padding:.4rem;text-align:center"><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.2rem">Volume</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;color:var(--gold)">${h(e.reps)}</div></div>`:''}
    </div>
    <div style="padding:.875rem 1rem">
      ${e.desc?`<p style="font-size:.75rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">${h(e.desc)}</p>`:''}
      <div style="display:flex;gap:.5rem;flex-direction:column">
        ${video?`<a href="${h(video)}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);text-decoration:none">▶ VOIR DÉMO</a>`:''}
        ${perfBtn}
      </div>
    </div>
  </div>`;
}

function closeDetail() {
  document.getElementById('client-detail-view').classList.add('hidden');
  document.getElementById('client-grid-view').classList.remove('hidden');
}
document.getElementById('rpe-input').addEventListener('input', e => { document.getElementById('rpe-display').innerText = e.target.value; });

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
  const key = currentSess.cycle+'-'+currentSess.type;
  const btn = document.getElementById('btn-validate');
  btn.disabled = true; btn.innerText = 'ENVOI...';
  try {
    const tonnage = await saveWorkoutAndPR(cid, key);
    const logData = { id:key, cycle:currentSess.cycle, type:currentSess.type, rpe:_rpe, comment:_comment, timestamp:new Date().toISOString() };
    if (tonnage > 0) logData.tonnage = Math.round(tonnage);
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'logs',key), logData);
    btn.disabled = false; btn.innerText = "VALIDER L'EFFORT";
    openDetail();
  } catch(e) { console.error(e); btn.disabled = false; btn.innerText = 'ERREUR'; toast('Erreur réseau','e'); }
}
