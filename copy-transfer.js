// ═══════════════════════════════════
// ADD SESSION & COPY FEATURES
// ═══════════════════════════════════

function openAddSessionModal() {
  document.getElementById('new-sess-letter').value = '';
  setAddSessMode('blank');
  openModal('modal-add-session');
  
  // Populate client selector
  const clientSel = document.getElementById('copy-sess-client');
  if (clientSel) {
    clientSel.innerHTML = '<option value="">Sélectionner client...</option>' + 
      allClients.filter(c => !c.archived).map(c => `<option value="${c.id}">${h(c.name || c.code)}</option>`).join('');
  }
}

function setAddSessMode(mode) {
  addSessMode = mode;

  const blankBtn = document.getElementById('add-sess-blank');
  const copyBtn = document.getElementById('add-sess-copy');
  const copyControls = document.getElementById('add-sess-copy-controls');

  if (blankBtn) {
    blankBtn.style.borderColor = mode === 'blank' ? 'rgba(240,165,0,.5)' : 'var(--border)';
    blankBtn.style.background = mode === 'blank' ? 'rgba(240,165,0,.15)' : 'var(--surface)';
    blankBtn.style.color = mode === 'blank' ? 'var(--gold)' : 'var(--muted)';
  }

  if (copyBtn) {
    copyBtn.style.borderColor = mode === 'copy' ? 'rgba(240,165,0,.5)' : 'var(--border)';
    copyBtn.style.background = mode === 'copy' ? 'rgba(240,165,0,.15)' : 'var(--surface)';
    copyBtn.style.color = mode === 'copy' ? 'var(--gold)' : 'var(--muted)';
  }

  if (copyControls) {
    copyControls.classList.toggle('hidden', mode !== 'copy');
  }
}

async function loadCopySessClientCycles() {
  const clientId = document.getElementById('copy-sess-client').value;
  if (!clientId) return;

  try {
    const progDoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId, 'data', 'program'));
    const cycles = (progDoc.exists() && progDoc.data().cycles) ? progDoc.data().cycles : [];

    const cycleSel = document.getElementById('copy-sess-cycle');
    if (cycleSel) {
      cycleSel.innerHTML = '<option value="">Sélectionner cycle...</option>' + 
        cycles.map(c => `<option value="${c.id}">C${c.id} – ${h(c.focus)}</option>`).join('');
    }

    window._copySessClientCycles = cycles;
  } catch (e) {
    console.error(e);
    toast('Erreur chargement cycles', 'e');
  }
}

function loadCopySessSessions() {
  const cycleId = parseInt(document.getElementById('copy-sess-cycle').value);
  if (!cycleId || !window._copySessClientCycles) return;

  const cycle = window._copySessClientCycles.find(c => c.id === cycleId);
  if (!cycle) return;

  const sessions = getAvailableSessions(cycle);
  const sessSel = document.getElementById('copy-sess-session');
  if (sessSel) {
    sessSel.innerHTML = '<option value="">Sélectionner séance...</option>' + 
      sessions.map(s => `<option value="${s}">Séance ${s}</option>`).join('');
  }
}

async function confirmAddSession() {
  const letter = document.getElementById('new-sess-letter').value.trim().toUpperCase();
  if (!letter || letter.length !== 1) {
    toast('Entrez une lettre valide', 'w');
    return;
  }

  const cId = parseInt(document.getElementById('ed-cycle').value);
  const cidx = clientProgram.findIndex(c => c.id === cId);
  if (cidx === -1) return;

  const cycle = clientProgram[cidx];
  const sessions = getAvailableSessions(cycle);

  if (sessions.includes(letter)) {
    toast('Cette séance existe déjà', 'w');
    return;
  }

  if (addSessMode === 'blank') {
    // Create blank session
    cycle.sessions[letter] = {
      rest: '45s',
      tours: '3',
      mode: 'circuit',
      comment: '',
      exercises: []
    };
  } else {
    // Copy from existing session
    const srcClientId = document.getElementById('copy-sess-client').value;
    const srcCycleId = parseInt(document.getElementById('copy-sess-cycle').value);
    const srcSess = document.getElementById('copy-sess-session').value;

    if (!srcClientId || !srcCycleId || !srcSess) {
      toast('Sélectionnez client, cycle et séance source', 'w');
      return;
    }

    try {
      const progDoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', srcClientId, 'data', 'program'));
      const cycles = (progDoc.exists() && progDoc.data().cycles) ? progDoc.data().cycles : [];
      const srcCycle = cycles.find(c => c.id === srcCycleId);

      if (!srcCycle || !srcCycle.sessions[srcSess]) {
        toast('Séance source introuvable', 'e');
        return;
      }

      cycle.sessions[letter] = JSON.parse(JSON.stringify(srcCycle.sessions[srcSess]));
    } catch (e) {
      console.error(e);
      toast('Erreur copie séance', 'e');
      return;
    }
  }

  try {
    await saveClientProgram();
    closeModal('modal-add-session');
    rebuildEditorSelects();
    syncEditor();
    toast('Séance ' + letter + ' ajoutée !', 's');
  } catch (e) {
    toast('Erreur sauvegarde', 'e');
  }
}

// ═══════════════════════════════════
// COPY FUNCTIONS
// ═══════════════════════════════════

let copyMode = 'sess';

function setCopyMode(m) {
  copyMode = m;

  const descs = {
    sess: "Copie la séance sélectionnée vers les cycles cochés",
    cyc: "Copie les 4 séances du cycle vers les cycles cochés"
  };

  ['sess', 'cyc'].forEach(k => {
    const btn = document.getElementById('cm-' + k);
    if (!btn) return;
    btn.style.borderColor = k === m ? 'rgba(240,165,0,.5)' : 'var(--border)';
    btn.style.background = k === m ? 'rgba(240,165,0,.15)' : 'var(--surface)';
    btn.style.color = k === m ? 'var(--gold)' : 'var(--muted)';
  });

  const desc = document.getElementById('copy-desc');
  if (desc) desc.innerText = descs[m] || '';
}

async function doCopy() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;

  const srcCidx = clientProgram.findIndex(c => c.id === cId);
  const sel = Array.from(document.querySelectorAll('#copy-grid label.copy-sel .copy-check')).map(i => parseInt(i.value));

  if (!sel.length) {
    toast('Sélectionnez au moins un cycle cible', 'w');
    return;
  }

  if (copyMode === 'sess') {
    if (srcCidx === -1) return;

    const srcS = JSON.parse(JSON.stringify(clientProgram[srcCidx].sessions[sess]));

    sel.forEach(tId => {
      const ci = clientProgram.findIndex(c => c.id === tId);
      if (ci === -1) return;
      clientProgram[ci].sessions[sess] = JSON.parse(JSON.stringify(srcS));
    });
  } else {
    if (srcCidx === -1) return;

    const srcSess = JSON.parse(JSON.stringify(clientProgram[srcCidx].sessions));

    sel.forEach(tId => {
      const ci = clientProgram.findIndex(c => c.id === tId);
      if (ci === -1) return;
      clientProgram[ci].sessions = JSON.parse(JSON.stringify(srcSess));
    });
  }

  try {
    await saveClientProgram();
    
    // Deselect all
    document.querySelectorAll('#copy-grid label.copy-sel').forEach(label => {
      label.classList.remove('copy-sel');
      label.style.borderColor = 'var(--border)';
      label.style.color = 'var(--muted)';
      label.style.background = 'var(--surface)';
    });
    
    toast('Copie vers ' + sel.length + ' cycle(s) effectuée !', 's');
  } catch (e) {
    toast('Erreur copie', 'e');
  }
}

// ═══════════════════════════════════
// TRANSFER
// ═══════════════════════════════════

function populateTransferSelects() {
  ['tr-src', 'tr-dst'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = allClients.filter(c => !c.archived).map(c => `<option value="${c.id}">${h(c.name || c.code)}</option>`).join('');
  });

  loadTransferCycles();
}

async function loadTransferCycles() {
  const srcId = document.getElementById('tr-src')?.value;
  if (!srcId) return;

  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', srcId, 'data', 'program'));
    const cycles = (doc.exists() && doc.data().cycles) ? doc.data().cycles : [];

    const el = document.getElementById('tr-cycle');
    if (!el) return;
    el.innerHTML = cycles.map(c => `<option value="${c.id}">C${c.id} – ${h(c.focus)}</option>`).join('');

    window._transferSrcCycles = cycles;

    // Update session buttons
    updateTransferSessButtons(cycles);
  } catch (e) {
    console.error(e);
  }
}

function updateTransferSessButtons(cycles) {
  const cycleId = parseInt(document.getElementById('tr-cycle')?.value);
  const cycle = cycles.find(c => c.id === cycleId);
  if (!cycle) return;

  const sessions = getAvailableSessions(cycle);
  const container = document.getElementById('tr-sess-btns');
  if (!container) return;

  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#f59e0b', G: '#06b6d4', H: '#84cc16' };

  container.innerHTML = sessions.map(s => {
    const col = colors[s] || '#6b7280';
    const isActive = s === transferSess;
    return `<button onclick="setTransferSess('${s}')" id="trs-${s}" style="flex:1;padding:.75rem;border-radius:.875rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.9rem;cursor:pointer;border:1px solid ${isActive ? `rgba(${col === '#3b82f6' ? '59,130,246' : col === '#10b981' ? '16,185,129' : col === '#f97316' ? '249,115,22' : col === '#8b5cf6' ? '139,92,246' : '107,114,128'},.5)` : 'var(--border)'};background:${isActive ? `rgba(${col === '#3b82f6' ? '59,130,246' : col === '#10b981' ? '16,185,129' : col === '#f97316' ? '249,115,22' : col === '#8b5cf6' ? '139,92,246' : '107,114,128'},.15)` : 'var(--surface)'};color:${isActive ? col : 'var(--muted)'}">S-${s}</button>`;
  }).join('');
}

function setTransferMode(m) {
  transferMode = m;

  ['cycle', 'sess'].forEach(k => {
    const btn = document.getElementById('tr-mode-' + k);
    if (!btn) return;
    btn.style.borderColor = k === m ? 'rgba(240,165,0,.5)' : 'var(--border)';
    btn.style.background = k === m ? 'rgba(240,165,0,.15)' : 'var(--surface)';
    btn.style.color = k === m ? 'var(--gold)' : 'var(--muted)';
  });

  document.getElementById('tr-sess-row').classList.toggle('hidden', m !== 'sess');
}

function setTransferSess(s) {
  transferSess = s;
  
  if (window._transferSrcCycles) {
    updateTransferSessButtons(window._transferSrcCycles);
  }
}

async function doTransfer() {
  const srcId = document.getElementById('tr-src').value;
  const dstId = document.getElementById('tr-dst').value;
  const cycleId = parseInt(document.getElementById('tr-cycle').value);

  if (srcId === dstId) {
    toast('Source et cible identiques', 'w');
    return;
  }

  try {
    const srcDoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', srcId, 'data', 'program'));
    const srcCycles = (srcDoc.exists() && srcDoc.data().cycles) ? srcDoc.data().cycles : [];
    const srcCycle = srcCycles.find(c => c.id === cycleId);
    if (!srcCycle) {
      toast('Cycle source introuvable', 'e');
      return;
    }

    const dstDoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', dstId, 'data', 'program'));
    let dstCycles = (dstDoc.exists() && dstDoc.data().cycles) ? dstDoc.data().cycles : [];

    const dstIdx = dstCycles.findIndex(c => c.id === cycleId);

    if (transferMode === 'cycle') {
      if (dstIdx !== -1) dstCycles[dstIdx].sessions = JSON.parse(JSON.stringify(srcCycle.sessions));
      else dstCycles.push(JSON.parse(JSON.stringify(srcCycle)));
    } else {
      if (dstIdx === -1) {
        toast('Cycle cible inexistant chez le client destination', 'w');
        return;
      }
      dstCycles[dstIdx].sessions[transferSess] = JSON.parse(JSON.stringify(srcCycle.sessions[transferSess]));
    }

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

    const safe = dstCycles.map(c => {
      const sessions = {};
      Object.keys(c.sessions || {}).forEach(t => {
        sessions[t] = sanitize(c, t);
      });
      return { id: c.id, focus: c.focus || '', sessions };
    });

    await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'clients', dstId, 'data', 'program'), { cycles: safe });

    const srcName = allClients.find(c => c.id === srcId)?.name || srcId;
    const dstName = allClients.find(c => c.id === dstId)?.name || dstId;

    toast('Transfert ' + srcName + ' → ' + dstName + ' effectué !', 's', 4000);
  } catch (e) {
    console.error(e);
    toast('Erreur transfert', 'e');
  }
}

// Export to window
Object.assign(window, {
  openAddSessionModal,
  setAddSessMode,
  loadCopySessClientCycles,
  loadCopySessSessions,
  confirmAddSession,
  setCopyMode,
  doCopy,
  populateTransferSelects,
  loadTransferCycles,
  updateTransferSessButtons,
  setTransferMode,
  setTransferSess,
  doTransfer
});
