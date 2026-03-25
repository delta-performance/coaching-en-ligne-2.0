async function loadAllData() {
  try {
    const snap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'clients'));
    allClients = []; snap.forEach(d => allClients.push({ id:d.id, ...d.data() }));
    const gsnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'groups'));
    allGroups = []; gsnap.forEach(d => allGroups.push({ id:d.id, ...d.data() }));
    const dbsnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'exerciseDb'));
    exerciseDb = []; dbsnap.forEach(d => exerciseDb.push({ id:d.id, ...d.data() }));
    renderClientsGrid(); populateGroupSelects(); populateTransferSelects();
    renderGroupes(); renderDatabase(); updateDbFilterDropdowns();
  } catch(e) { console.error(e); toast('Erreur chargement','e'); }
}

// ── CLIENTS GRID ──────────────────────────────────────
function renderClientsGrid() {
  const g = document.getElementById('clients-grid'); if (!g) return;
  const filterGroup = document.getElementById('filter-group').value;
  const showArchived = document.getElementById('show-archived').checked;
  let list = allClients.filter(c => {
    if (!showArchived && c.archived) return false;
    if (filterGroup && c.group !== filterGroup) return false;
    return true;
  });
  if (!list.length) { g.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun client.</p>'; return; }
  g.innerHTML = list.map(c => `
    <div class="card-hover" onclick="openClientFiche('${c.id}')" style="${c.archived?'opacity:.6':''}">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
        <div style="width:3rem;height:3rem;border-radius:1rem;background:linear-gradient(135deg,var(--brand),var(--brand2));display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;font-style:italic;color:white;flex-shrink:0">${((c.name||c.code||'?')[0]).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(c.name||'—')}</div>
          <div style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold)">CODE: ${h(c.code||'—')}</div>
        </div>
      </div>
      ${c.group?`<span class="badge badge-group" style="margin-bottom:.75rem;display:inline-block">${h(allGroups.find(g=>g.id===c.group)?.name||c.group)}</span>`:''}
      ${c.archived?`<span class="badge badge-archived" style="margin-bottom:.75rem;display:inline-block;margin-left:.5rem">Archivé</span>`:''}
      ${c.objectif?`<p style="font-size:.75rem;color:var(--muted);font-style:italic;margin-bottom:.875rem">${h(c.objectif)}</p>`:''}
      <div style="display:flex;justify-content:flex-end;gap:.5rem" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="toggleArchiveClient('${c.id}')">${c.archived?'Désarchiver':'Archiver'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">Suppr.</button>
      </div>
    </div>`).join('');
}

async function openClientFiche(clientId) {
  const c = allClients.find(x => x.id === clientId); if (!c) return;
  currentClient = c;
  document.getElementById('fiche-client-name').innerText = c.name||c.code;
  document.getElementById('fiche-client-code').innerText = 'CODE: '+(c.code||'—');
  document.getElementById('ctab-fiche').style.display = '';
  switchCoachTab('fiche');
  switchSubTab('logs');
  await loadClientData(clientId);
  await loadClientPR();
  await loadClientDocuments();
  rebuildEditorSelects(); populateVisuSelect();
}

async function toggleArchiveClient(clientId) {
  const c = allClients.find(x => x.id === clientId); if (!c) return;
  c.archived = !c.archived;
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId), c);
  toast(c.archived?'Client archivé':'Client désarchivé', c.archived?'w':'s');
  renderClientsGrid();
}

let _delClientPending = null;
async function deleteClient(clientId) {
  if (_delClientPending !== clientId) { _delClientPending = clientId; setTimeout(()=>_delClientPending=null, 3000); toast('Cliquez encore pour confirmer','w',3000); return; }
  _delClientPending = null;
  await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId));
  allClients = allClients.filter(c => c.id !== clientId);
  toast('Client supprimé','i'); renderClientsGrid(); populateTransferSelects();
}

async function createClient() {
  const name = document.getElementById('nc-prenom').value.trim();
  const code = document.getElementById('nc-code').value.trim().toUpperCase();
  const objectif = document.getElementById('nc-objectif').value.trim();
  const group = document.getElementById('nc-group').value;
  if (!name||!code) { toast('Nom et code requis','w'); return; }
  if (allClients.find(c => c.code === code)) { toast('Code déjà utilisé','w'); return; }
  const newId = 'client_'+Date.now();
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',newId), { name, code, objectif, group, archived:false, createdAt:new Date().toISOString() });
  // Crée automatiquement Cycle 1 sans séance
  const initProg = [{
    id: 1, focus: 'Cycle 1', sessions_active: [],
    sessions: {
      A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      B: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      C: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      D: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
    }
  }];
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',newId,'data','program'), { cycles: initProg });
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',newId,'data','unlock'), { unlocked: [1], archived: [] });
  closeModal('modal-add-client');
  ['nc-prenom','nc-code','nc-objectif'].forEach(id => document.getElementById(id).value = '');
  toast(name+' créé !','s'); await loadAllData();
}

// ── GROUPES ───────────────────────────────────────────

async function toggleArchiveClient(clientId) {
  const c = allClients.find(x => x.id === clientId); if (!c) return;
  const updated = { ...c, archived: !c.archived };
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId), updated);
  const idx = allClients.findIndex(x => x.id === clientId);
  if (idx !== -1) allClients[idx] = updated;
  if (currentClient?.id === clientId) currentClient = updated;
  toast(updated.archived ? 'Client archivé' : 'Client désarchivé', 'i');
  renderClientProfile();
  renderClientsGrid();
}
function populateGroupSelects() {
  const opts = allGroups.map(g => `<option value="${g.id}">${h(g.name)}</option>`).join('');
  ['filter-group','nc-group'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const base = id==='filter-group' ? '<option value="">Tous les groupes</option>' : '<option value="">Aucun groupe</option>';
    el.innerHTML = base + opts;
  });
}

function renderGroupes() {
  const el = document.getElementById('groupes-list'); if (!el) return;
  if (!allGroups.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun groupe créé.</p>'; return; }
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
        ${members.map(c=>`<span class="badge" style="background:var(--surface);color:var(--text);border:1px solid var(--border);cursor:pointer" onclick="openClientFiche('${c.id}')">${h(c.name||c.code)}</span>`).join('')}
        ${members.length===0?`<p style="font-size:.75rem;color:var(--muted);font-style:italic">Aucun membre actif.</p>`:''}
      </div>
    </div>`;
  }).join('');
}

async function createGroup() {
  const name = document.getElementById('new-group-name').value.trim();
  if (!name) { toast('Nom requis','w'); return; }
  const newId = 'group_'+Date.now();
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'groups',newId), { name, createdAt:new Date().toISOString() });
  closeModal('modal-add-group');
  document.getElementById('new-group-name').value = '';
  toast('Groupe "'+name+'" créé !','s'); await loadAllData();
}

async function deleteGroup(groupId) {
  await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'groups',groupId));
  const affected = allClients.filter(c => c.group === groupId);
  for (const c of affected) { c.group = ''; await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',c.id), c); }
  toast('Groupe supprimé (clients conservés)','i'); await loadAllData();
}

// ── TABS ──────────────────────────────────────────────
function switchCoachTab(tab) {
  ['clients','fiche','groupes','transfer','database'].forEach(t => {
    const el = document.getElementById('coach-'+t); if (el) el.classList.toggle('hidden', t!==tab);
    const btn = document.getElementById('ctab-'+t); if (btn) btn.className = 'tab-pill '+(t===tab?'on':'off');
  });
  if (tab==='transfer') populateTransferSelects();
  if (tab==='database') { renderDatabase(); updateDbFilterDropdowns(); }
}

function switchSubTab(tab) {
  ['logs','unlock','cycles','editor','visu','profile','records','progression'].forEach(t => {
    const el = document.getElementById('sub-'+t); if (!el) return;
    if (t==='cycles') { el.style.display=(t===tab)?'flex':'none'; el.classList.toggle('hidden',t!==tab); }
    else { el.classList.toggle('hidden',t!==tab); }
    const btn = document.getElementById('stab-'+t); if (btn) btn.className = 'sub-tab-pill '+(t===tab?'on':'off');
  });
  if (tab==='logs') renderLogs();
  if (tab==='unlock') renderUnlockGrid();
  if (tab==='cycles') renderCycleStatus();
  if (tab==='editor') { rebuildEditorSelects(); syncEditor(); }
  if (tab==='visu') { populateVisuSelect(); renderVisu(); }
  if (tab==='profile') renderClientProfile();
  if (tab==='records') renderClientPR();
  if (tab==='progression') renderProgressCharts();
  if (tab==='documents') renderDocumentsTab();
}

// ── LOGS ──────────────────────────────────────────────
function renderLogs() {
  const body = document.getElementById('logs-body'); if (!body) return;
  const sorted = Object.values(clientLogs).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
  if (!sorted.length) { body.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--muted);font-style:italic">Aucun log.</td></tr>'; return; }
  body.innerHTML = sorted.map(l => {
    const d = new Date(l.timestamp).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return `<tr class="db-row">
      <td><input type="checkbox" name="log-sel" value="${l.id}" onchange="updateBulk()" style="accent-color:var(--gold)"></td>
      <td style="font-size:.7rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase">${d}</td>
      <td style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;font-style:italic">C${l.cycle}–S${l.type}</td>
      <td style="text-align:center"><span class="badge" style="background:var(--gold);color:#1a0900">${l.rpe}/10</span></td>
      <td style="font-size:.75rem;color:var(--muted);font-style:italic;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.comment||'—'}</td>
      <td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="resetLog('${l.id}')">Reset</button></td>
    </tr>`;
  }).join('');
}

let _resetPending = null;
async function resetLog(id) {
  if (!currentClient) return;
  if (_resetPending !== id) { _resetPending = id; setTimeout(()=>_resetPending=null,3000); toast('Cliquez encore pour confirmer','w',3000); return; }
  _resetPending = null;
  await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'logs',id));
  toast('Séance réinitialisée','i');
}
function toggleAllLogs(src) { document.getElementsByName('log-sel').forEach(c => c.checked = src.checked); updateBulk(); }
function updateBulk() {
  const n = document.querySelectorAll('input[name="log-sel"]:checked').length;
  const btn = document.getElementById('btn-bulk');
  if (n > 0) { btn.classList.remove('hidden'); btn.innerText = 'RESET ('+n+')'; } else btn.classList.add('hidden');
}
async function bulkDelete() {
  if (!currentClient) return;
  const sel = Array.from(document.querySelectorAll('input[name="log-sel"]:checked')).map(i => i.value);
  if (!sel.length) return;
  const batch = window.fdb.writeBatch(window.db);
  sel.forEach(id => batch.delete(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'logs',id)));
  await batch.commit(); toast(sel.length+' réinitialisée(s)','i');
}

// ── UNLOCK ────────────────────────────────────────────
function renderUnlockGrid() {
  const g = document.getElementById('unlock-grid'); if (!g) return;
  g.innerHTML = clientProgram.map(c => {
    const on = clientUnlocked.has(c.id); const arc = clientArchived.has(c.id);
    return `<label onclick="toggleUnlock(${c.id})" style="display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:.75rem;border-radius:1rem;border:1px solid ${on?'rgba(240,165,0,.5)':'var(--border)'};background:${on?'rgba(240,165,0,.08)':'var(--surface)'};cursor:pointer">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:${on?'var(--gold)':'var(--muted)'}">C${c.id}</span>
      ${arc?'<span style="font-size:.5rem;color:var(--muted)">arch.</span>':''}
      <div style="width:1.25rem;height:1.25rem;border-radius:.375rem;border:2px solid ${on?'var(--gold)':'var(--muted)'};background:${on?'var(--gold)':'transparent'};display:flex;align-items:center;justify-content:center">
        ${on?'<svg style="width:.7rem;height:.7rem;color:#1a0900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"/></svg>':''}
      </div>
    </label>`;
  }).join('');
}
function toggleUnlock(id) { if (clientUnlocked.has(id)) clientUnlocked.delete(id); else clientUnlocked.add(id); renderUnlockGrid(); }
async function saveUnlock() {
  if (!currentClient) return;
  try { await saveClientUnlock(currentClient.id); renderClientGrid(); toast('Accès enregistré','s'); }
  catch(e) { toast('Erreur','e'); }
}
