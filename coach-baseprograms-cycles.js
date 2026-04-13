// COACH-BASEPROGRAMS-CYCLES.JS - Copie exacte de coach-cycles.js adaptée pour les programmes de base
// Gestion des cycles en mode "plat" (sans hiérarchie macro/meso/micro)

function bpRenderCycleStatus() {
  const el = document.getElementById('bp-cycle-status');
  if (!el) return;
  
  const cycles = _bpProgramData?.cycles || [];
  if (!cycles.length) {
    el.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun cycle.</p>';
    return;
  }
  
  el.innerHTML = cycles.map(c => {
    const isArch = _bpArchivedCycles?.has(c.id) || false;
    const isUnlock = _bpUnlockedMicros?.has(`${c.macroId || 1}-${c.mesoId || 1}-${c.id}`) || false;
    const active = bpGetActiveSessions(c);
    
    return `<div style="display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem;border-radius:1rem;background:${isArch?'rgba(8,12,18,.5)':'var(--surface)'};border:1px solid ${isArch?'var(--border)':'rgba(30,45,64,.8)'};flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.875rem;color:${isArch?'var(--muted)':'var(--text)'};flex-shrink:0">C${c.id}</span>
      <input type="text" value="${bpH(c.focus)}" id="bp-rename-${c.id}" style="flex:1;min-width:120px;background:transparent;border:none;color:${isArch?'var(--muted)':'var(--text)'};font-size:.8rem;font-style:italic;outline:none">
      <span style="font-size:.65rem;color:var(--muted)">${active.length} séance(s)</span>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;padding:.25rem .5rem;border-radius:.5rem;background:${isUnlock?'rgba(16,185,129,.1)':'transparent'};border:1px solid ${isUnlock?'rgba(16,185,129,.3)':'var(--border)'}">
        <input type="checkbox" ${isUnlock?'checked':''} onchange="bpToggleCycleUnlock(${c.id})" style="accent-color:var(--green)">
        <span style="font-size:.65rem;color:${isUnlock?'var(--green)':'var(--muted)'};font-family:'Barlow Condensed',sans-serif;font-weight:700">${isUnlock?'Accès ouvert':'Accès fermé'}</span>
      </label>
      ${isArch?`<span class="badge badge-archived">Archive</span>`:''}
      <button class="btn btn-ghost btn-sm" onclick="bpRenameCycle(${c.id})">✓</button>
      <button class="btn btn-ghost btn-sm" onclick="bpToggleArchiveCycle(${c.id})">${isArch?'↑ Désarchiver':'↓ Archiver'}</button>
      <button class="btn btn-danger btn-sm" id="bp-del-c-${c.id}" data-c="0" onclick="bpDeleteCycleBtn(${c.id})">Suppr.</button>
    </div>`;
  }).join('');
}

async function bpAddCycle() {
  if (!currentBaseProgram) return;
  
  const cycles = _bpProgramData?.cycles || [];
  const newId = cycles.length ? Math.max(...cycles.map(c => c.id)) + 1 : 1;
  
  const newCycle = {
    id: newId,
    focus: 'Nouveau cycle',
    sessions_active: [],
    sessions: {
      A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      B: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      C: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      D: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
    }
  };
  
  cycles.push(newCycle);
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRebuildEditorSelects();
    bpRenderCycleStatus();
    toast('Cycle ' + newId + ' créé !', 's');
  } catch(e) {
    toast('Erreur', 'e');
  }
}

async function bpRenameCycle(id) {
  const inp = document.getElementById('bp-rename-' + id);
  if (!inp || !inp.value.trim()) return;
  
  const cycles = _bpProgramData?.cycles || [];
  const idx = cycles.findIndex(c => c.id === id);
  if (idx === -1) return;
  
  cycles[idx].focus = inp.value.trim();
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRebuildEditorSelects();
    toast('Renommé !', 's');
  } catch(e) {
    toast('Erreur', 'e');
  }
}

async function bpToggleArchiveCycle(id) {
  if (!currentBaseProgram) return;
  
  if (!_bpArchivedCycles) _bpArchivedCycles = new Set();
  
  if (_bpArchivedCycles.has(id)) {
    _bpArchivedCycles.delete(id);
  } else {
    _bpArchivedCycles.add(id);
  }
  
  bpRenderCycleStatus();
  toast('Archivage modifié', 'i');
}

async function bpToggleCycleUnlock(id) {
  if (!currentBaseProgram) return;
  
  // Use the hierarchy unlock system
  const unlockKey = `1-1-${id}`; // Default macro/meso IDs for flat structure
  
  if (!_bpUnlockedMicros) _bpUnlockedMicros = new Set();
  
  if (_bpUnlockedMicros.has(unlockKey)) {
    _bpUnlockedMicros.delete(unlockKey);
    toast('Cycle verrouillé', 'i');
  } else {
    _bpUnlockedMicros.add(unlockKey);
    toast('Cycle accessible au client', 's');
  }
  
  bpRenderCycleStatus();
}

async function bpDeleteCycleBtn(id) {
  const btn = document.getElementById('bp-del-c-' + id);
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
  
  const cycles = _bpProgramData?.cycles || [];
  const idx = cycles.findIndex(c => c.id === id);
  if (idx === -1) return;
  
  cycles.splice(idx, 1);
  
  // Clean up unlock and archive sets
  const unlockKey = `1-1-${id}`;
  if (_bpUnlockedMicros) _bpUnlockedMicros.delete(unlockKey);
  if (_bpArchivedCycles) _bpArchivedCycles.delete(id);
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRebuildEditorSelects();
    bpRenderCycleStatus();
    toast('Cycle supprimé', 'w');
  } catch(e) {
    toast('Erreur', 'e');
  }
}

// Helper function for getting active sessions
function bpGetActiveSessions(cycle) {
  if (cycle.sessions_active && cycle.sessions_active.length) return cycle.sessions_active;
  return Object.keys(cycle.sessions || {}).filter(k => {
    const s = cycle.sessions[k];
    return s && (s.exercises?.length > 0 || s.comment);
  });
}

// Helper function for getting ALL sessions (active AND inactive)
function bpGetAllSessions(cycle) {
  if (!cycle) return [];
  const active = cycle.sessions_active || [];
  const sessionsKeys = cycle.sessions ? Object.keys(cycle.sessions) : [];
  return [...new Set([...active, ...sessionsKeys])].sort();
}

// Exports
window.bpRenderCycleStatus = bpRenderCycleStatus;
window.bpAddCycle = bpAddCycle;
window.bpRenameCycle = bpRenameCycle;
window.bpToggleArchiveCycle = bpToggleArchiveCycle;
window.bpToggleCycleUnlock = bpToggleCycleUnlock;
window.bpDeleteCycleBtn = bpDeleteCycleBtn;
window.bpGetActiveSessions = bpGetActiveSessions;
window.bpGetAllSessions = bpGetAllSessions;
