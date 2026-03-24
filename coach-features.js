// ═══════════════════════════════════
// COACH FEATURES - PART 2
// ═══════════════════════════════════

// LOGS
function renderLogs() {
  const body = document.getElementById('logs-body');
  if (!body) return;

  const sorted = Object.values(clientLogs).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!sorted.length) {
    body.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--muted);font-style:italic">Aucun log.</td></tr>';
    return;
  }

  body.innerHTML = sorted.map(l => {
    const d = new Date(l.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    return `<tr class="db-row">
      <td><input type="checkbox" name="log-sel" value="${l.id}" onchange="updateBulk()" style="accent-color:var(--gold)"></td>
      <td style="font-size:.7rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase">${d}</td>
      <td style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;font-style:italic">C${l.cycle}–S${l.type}</td>
      <td style="text-align:center"><span class="badge" style="background:var(--gold);color:#1a0900">${l.rpe}/10</span></td>
      <td style="font-size:.75rem;color:var(--muted);font-style:italic;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.comment || '—'}</td>
      <td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="resetLog('${l.id}')">Reset</button></td>
    </tr>`;
  }).join('');
}

let _resetPending = null;

async function resetLog(id) {
  if (!currentClient) return;

  if (_resetPending !== id) {
    _resetPending = id;
    setTimeout(() => _resetPending = null, 3000);
    toast('Cliquez encore pour confirmer', 'w', 3000);
    return;
  }
  _resetPending = null;

  await window.fdb.deleteDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentClient.id, 'logs', id));
  toast('Séance réinitialisée', 'i');
}

function toggleAllLogs(src) {
  document.getElementsByName('log-sel').forEach(c => c.checked = src.checked);
  updateBulk();
}

function updateBulk() {
  const n = document.querySelectorAll('input[name="log-sel"]:checked').length;
  const btn = document.getElementById('btn-bulk');
  if (n > 0) {
    btn.classList.remove('hidden');
    btn.innerText = 'RESET (' + n + ')';
  } else btn.classList.add('hidden');
}

async function bulkDelete() {
  if (!currentClient) return;

  const sel = Array.from(document.querySelectorAll('input[name="log-sel"]:checked')).map(i => i.value);
  if (!sel.length) return;

  const batch = window.fdb.writeBatch(window.db);
  sel.forEach(id => batch.delete(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentClient.id, 'logs', id)));
  await batch.commit();
  toast(sel.length + ' réinitialisée(s)', 'i');
}

// UNLOCK
function renderUnlockGrid() {
  const g = document.getElementById('unlock-grid');
  if (!g) return;

  g.innerHTML = clientProgram.map(c => {
    const on = clientUnlocked.has(c.id);
    const arc = clientArchived.has(c.id);

    return `<label onclick="toggleUnlock(${c.id})" style="display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:.75rem;border-radius:1rem;border:1px solid ${on ? 'rgba(240,165,0,.5)' : 'var(--border)'};background:${on ? 'rgba(240,165,0,.08)' : 'var(--surface)'};cursor:pointer">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:${on ? 'var(--gold)' : 'var(--muted)'}">C${c.id}</span>
      ${arc ? '<span style="font-size:.5rem;color:var(--muted)">arch.</span>' : ''}
      <div style="width:1.25rem;height:1.25rem;border-radius:.375rem;border:2px solid ${on ? 'var(--gold)' : 'var(--muted)'};background:${on ? 'var(--gold)' : 'transparent'};display:flex;align-items:center;justify-content:center">
        ${on ? '<svg style="width:.7rem;height:.7rem;color:#1a0900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"/></svg>' : ''}
      </div>
    </label>`;
  }).join('');
}

function toggleUnlock(id) {
  if (clientUnlocked.has(id)) clientUnlocked.delete(id);
  else clientUnlocked.add(id);
  renderUnlockGrid();
}

async function saveUnlock() {
  if (!currentClient) return;

  try {
    await saveClientUnlock(currentClient.id);
    renderClientGrid();
    toast('Accès enregistré', 's');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

// CYCLES MANAGEMENT
function renderCycleStatus() {
  const el = document.getElementById('cycle-status');
  if (!el) return;

  if (!clientProgram.length) {
    el.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun cycle.</p>';
    return;
  }

  el.innerHTML = clientProgram.map(c => {
    const isArch = clientArchived.has(c.id);
    const isUnlock = clientUnlocked.has(c.id);

    return `<div style="display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem;border-radius:1rem;background:${isArch ? 'rgba(8,12,18,.5)' : 'var(--surface)'};border:1px solid ${isArch ? 'var(--border)' : 'rgba(30,45,64,.8)'};flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.875rem;color:${isArch ? 'var(--muted)' : 'var(--text)'};flex-shrink:0">C${c.id}</span>
      <input type="text" value="${h(c.focus)}" id="rename-${c.id}" style="flex:1;min-width:120px;background:transparent;border:none;color:${isArch ? 'var(--muted)' : 'var(--text)'};font-size:.8rem;font-style:italic;outline:none">
      ${isUnlock ? `<span class="badge" style="background:rgba(240,165,0,.15);color:var(--gold);border:1px solid rgba(240,165,0,.2)">Actif</span>` : `<span class="badge badge-archived">Verrouillé</span>`}
      ${isArch ? `<span class="badge badge-archived">Archive</span>` : ''}
      <button class="btn btn-ghost btn-sm" onclick="renameCycle(${c.id})">✓</button>
      <button class="btn btn-ghost btn-sm" onclick="toggleArchiveCycle(${c.id})">${isArch ? '↑ Désarchiver' : '↓ Archiver'}</button>
      <button class="btn btn-danger btn-sm" id="del-c-${c.id}" data-c="0" onclick="deleteCycleBtn(${c.id})">Suppr.</button>
    </div>`;
  }).join('');
}

async function addCycle() {
  if (!currentClient) return;

  const name = document.getElementById('nc-name').value.trim() || 'Nouveau cycle';
  const rest = document.getElementById('nc-rest').value.trim() || '45s';
  const tours = document.getElementById('nc-tours').value.trim() || '3';

  const newId = clientProgram.length ? Math.max(...clientProgram.map(c => c.id)) + 1 : 1;

  clientProgram.push({
    id: newId,
    focus: name,
    sessions: {}
  });

  try {
    await saveClientProgram();
    rebuildEditorSelects();
    renderClientGrid();
    renderCycleStatus();
    toast('Cycle ' + newId + ' créé !', 's');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

async function renameCycle(id) {
  const inp = document.getElementById('rename-' + id);
  if (!inp || !inp.value.trim()) return;

  const idx = clientProgram.findIndex(c => c.id === id);
  if (idx === -1) return;

  clientProgram[idx].focus = inp.value.trim();

  try {
    await saveClientProgram();
    rebuildEditorSelects();
    renderClientGrid();
    toast('Renommé !', 's');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

async function toggleArchiveCycle(id) {
  if (!currentClient) return;

  if (clientArchived.has(id)) clientArchived.delete(id);
  else clientArchived.add(id);

  try {
    await saveClientUnlock(currentClient.id);
    renderCycleStatus();
    renderClientGrid();
    toast('Archivage modifié', 'i');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

async function deleteCycleBtn(id) {
  const btn = document.getElementById('del-c-' + id);
  if (!btn) return;

  if (btn.dataset.c !== '1') {
    btn.dataset.c = '1';
    btn.innerText = 'CONFIRMER ?';
    btn.style.color = '#f87171';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.innerText = 'Suppr.';
      btn.style.color = '';
    }, 3000);
    return;
  }

  const idx = clientProgram.findIndex(c => c.id === id);
  if (idx === -1) return;

  clientProgram.splice(idx, 1);
  clientUnlocked.delete(id);
  clientArchived.delete(id);

  try {
    await saveClientProgram();
    await saveClientUnlock(currentClient.id);
    rebuildEditorSelects();
    renderClientGrid();
    renderCycleStatus();
    toast('Cycle supprimé', 'w');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

// Export to window
Object.assign(window, {
  renderLogs,
  resetLog,
  toggleAllLogs,
  updateBulk,
  bulkDelete,
  renderUnlockGrid,
  toggleUnlock,
  saveUnlock,
  renderCycleStatus,
  addCycle,
  renameCycle,
  toggleArchiveCycle,
  deleteCycleBtn
});
