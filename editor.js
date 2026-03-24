// ═══════════════════════════════════
// EDITOR - SESSION EDITOR
// ═══════════════════════════════════

function rebuildEditorSelects() {
  const ec = document.getElementById('ed-cycle');
  if (!ec) return;

  ec.innerHTML = clientProgram.map(c => `<option value="${c.id}">C${c.id} – ${h(c.focus.substring(0, 16))}</option>`).join('');

  // Rebuild copy grid (exclude current cycle)
  updateCopyGrid();
}

function updateCopyGrid() {
  const cg = document.getElementById('copy-grid');
  if (!cg) return;

  const currentCycleId = parseInt(document.getElementById('ed-cycle')?.value);
  
  cg.innerHTML = clientProgram
    .filter(c => c.id !== currentCycleId) // Exclude current cycle
    .map(c => `<label style="display:flex;align-items:center;justify-content:center;padding:.4rem .75rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s" onclick="this.classList.toggle('copy-sel');this.style.borderColor=this.classList.contains('copy-sel')?'rgba(240,165,0,.5)':'var(--border)';this.style.color=this.classList.contains('copy-sel')?'var(--gold)':'var(--muted)';this.style.background=this.classList.contains('copy-sel')?'rgba(240,165,0,.1)':'var(--surface)'"><input type="checkbox" value="${c.id}" class="copy-check" style="display:none">C${c.id}</label>`)
    .join('');
}

function syncEditor() {
  if (!clientProgram.length) return;

  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;

  const c = clientProgram.find(x => x.id === cId);
  if (!c) return;

  // Update copy grid to exclude current cycle
  updateCopyGrid();

  // Rebuild session selector based on available sessions
  const sessions = getAvailableSessions(c);
  const es = document.getElementById('ed-sess');
  if (es) {
    const currentVal = es.value;
    es.innerHTML = sessions.map(s => `<option value="${s}">Séance ${s}</option>`).join('');
    if (sessions.includes(currentVal)) {
      es.value = currentVal;
    } else if (sessions.length > 0) {
      es.value = sessions[0];
    }
  }

  const finalSess = es?.value || sess;
  if (!c.sessions[finalSess]) {
    // Session doesn't exist
    editorExos = [];
    document.getElementById('ed-rest').value = '45s';
    document.getElementById('ed-tours').value = '3';
    document.getElementById('ed-sess-comment').value = '';
    setSessMode('circuit', false);
    renderEditorExos();
    return;
  }

  const sp = getSessParams(c, finalSess);

  document.getElementById('ed-rest').value = sp.rest || '45s';
  document.getElementById('ed-tours').value = sp.tours || '3';
  document.getElementById('ed-sess-comment').value = sp.comment || '';

  setSessMode(sp.mode || 'circuit', false);

  editorExos = JSON.parse(JSON.stringify(getSessEx(c, finalSess)));
  renderEditorExos();
}

function setSessMode(mode, save = false) {
  currentSessMode = mode;

  const isCircuit = mode === 'circuit';

  const cbtn = document.getElementById('mode-circuit-btn');
  const kbtn = document.getElementById('mode-classic-btn');

  if (cbtn) {
    cbtn.style.borderColor = isCircuit ? 'rgba(240,165,0,.5)' : 'var(--border)';
    cbtn.style.background = isCircuit ? 'rgba(240,165,0,.15)' : 'var(--surface)';
    cbtn.style.color = isCircuit ? 'var(--gold)' : 'var(--muted)';
  }

  if (kbtn) {
    kbtn.style.borderColor = !isCircuit ? 'rgba(59,130,246,.5)' : 'var(--border)';
    kbtn.style.background = !isCircuit ? 'rgba(59,130,246,.15)' : 'var(--surface)';
    kbtn.style.color = !isCircuit ? '#60a5fa' : 'var(--muted)';
  }

  const gp = document.getElementById('ed-circuit-global');
  if (gp) gp.style.display = isCircuit ? 'flex' : 'none';

  if (save) {
    const cId = parseInt(document.getElementById('ed-cycle').value);
    const sess = document.getElementById('ed-sess').value;

    const idx = clientProgram.findIndex(c => c.id === cId);
    if (idx !== -1) {
      const s = clientProgram[idx].sessions[sess];
      if (s && !Array.isArray(s)) s.mode = mode;
    }
  }

  renderEditorExos();
}

function renderEditorExos() {
  const el = document.getElementById('ed-exos-list');
  if (!el) return;

  const isCircuit = currentSessMode === 'circuit';
  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#f59e0b', G: '#06b6d4', H: '#84cc16' };
  const sess = document.getElementById('ed-sess')?.value || 'A';
  const col = colors[sess] || '#f0a500';

  if (!editorExos.length) {
    el.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--muted);font-style:italic;border:1px dashed var(--border);border-radius:1rem">Aucun exercice. Cliquez "+ Ajouter un exercice".</div>`;
    return;
  }

  // Build HTML - handle supersets
  let html = '';
  let i = 0;

  while (i < editorExos.length) {
    const e = editorExos[i];

    // Check if this is part of a superset (only in classic mode)
    if (!isCircuit && e.superset) {
      // Collect all exercises in this superset
      let supersetGroup = [e];
      let j = i + 1;
      while (j < editorExos.length && editorExos[j - 1].superset) {
        supersetGroup.push(editorExos[j]);
        j++;
      }

      html += supersetEditorCard(supersetGroup, i, col);
      i = j;
    } else {
      html += singleExEditorCard(e, i, col, isCircuit);
      i++;
    }
  }

  el.innerHTML = html;
}

function dbSelectorsHTML(idx, prefix) {
  const zones = [...new Set(exerciseDb.map(e => e.zone).filter(Boolean))].sort();
  const zoneOpts = '<option value="">Zone...</option>' + zones.map(z => `<option value="${z}">${h(z)}</option>`).join('');

  return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:.5rem">
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="edUpdateZone(${idx},'${prefix}',this.value)" id="ed-zone-${prefix}-${idx}"><optgroup label="Zone">${zoneOpts}</optgroup></select>
    <select id="ed-pat-${prefix}-${idx}" class="inp" style="font-size:.75rem;padding:.4rem" onchange="edUpdatePattern(${idx},'${prefix}',this.value)"><option value="">Pattern...</option></select>
    <select id="ed-exdb-${prefix}-${idx}" class="inp" style="font-size:.75rem;padding:.4rem" onchange="edPickEx(${idx},'${prefix}',this.value)"><option value="">Exercice...</option></select>
  </div>`;
}

function singleExEditorCard(e, i, col, isCircuit) {
  const num = i + 1;

  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:1.25rem;overflow:hidden" id="ex-card-${i}">
    <div style="background:${col}22;border-bottom:1px solid ${col}33;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem">
      <span style="width:2rem;height:2rem;background:${col};color:#fff;border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;flex-shrink:0">${num}</span>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;font-style:italic;flex:1;color:${e.name ? 'var(--text)' : 'var(--muted)'}">${h(e.name || 'Nouvel exercice')}</span>
      <div style="display:flex;gap:.4rem;flex-shrink:0">
        ${!isCircuit ? `<button onclick="edMoveUp(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button><button onclick="edMoveDown(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button><button onclick="edAddSuperset(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:var(--gold);border-color:rgba(240,165,0,.3)">⇄ SS</button><button onclick="edDupParams(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem" title="Dupliquer paramètres">⧉</button>` : `<button onclick="edMoveUp(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button><button onclick="edMoveDown(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button>`}
        <button onclick="edRemoveEx(${i})" class="btn btn-danger btn-sm" style="padding:.25rem .5rem">🗑</button>
      </div>
    </div>
    <div style="padding:1rem;display:flex;flex-direction:column;gap:.75rem">
      ${dbSelectorsHTML(i, 's')}
      <input type="text" class="inp" value="${h(e.name || '')}" placeholder="Nom exercice" oninput="editorExos[${i}].name=this.value">
      <textarea class="inp" rows="2" placeholder="Description..." oninput="editorExos[${i}].desc=this.value">${h(e.desc || '')}</textarea>
      <input type="text" class="inp" value="${h(e.video || '')}" placeholder="URL vidéo..." oninput="editorExos[${i}].video=this.value">
      ${isCircuit ? circuitExFields(e, i) : classicExFields(e, i)}
      <input type="text" class="inp" value="${h(e.comment || '')}" placeholder="Commentaire sur cet exercice..." oninput="editorExos[${i}].comment=this.value" style="font-size:.8rem">
    </div>
  </div>`;
}

function supersetEditorCard(exercises, startIdx, col) {
  const num = startIdx + 1;

  return `<div style="border:1px solid rgba(240,165,0,.35);border-radius:1.25rem;overflow:hidden;background:rgba(240,165,0,.03)" id="ex-card-${startIdx}">
    <div style="background:rgba(240,165,0,.12);border-bottom:1px solid rgba(240,165,0,.25);padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem">
      <span style="background:var(--gold);color:#1a0900;padding:.25rem .75rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;font-style:italic;flex-shrink:0">⇄ SUPERSET ${num}</span>
      <div style="display:flex;gap:.4rem;flex-shrink:0;margin-left:auto">
        <button onclick="edMoveUp(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button>
        <button onclick="edMoveDown(${startIdx + exercises.length - 1})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button>
        <button onclick="edAddToSuperset(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:var(--gold);border-color:rgba(240,165,0,.3)">+ Exo</button>
        <button onclick="edBreakSuperset(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:#f87171;border-color:rgba(248,113,113,.3)">Casser SS</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${exercises.length},1fr);gap:0">
      ${exercises.map((e, localIdx) => {
        const globalIdx = startIdx + localIdx;
        const letter = String.fromCharCode(65 + localIdx);
        
        return `<div style="padding:1rem;${localIdx < exercises.length - 1 ? 'border-right:1px solid rgba(240,165,0,.2);' : ''}display:flex;flex-direction:column;gap:.6rem">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem">
            <span style="width:1.75rem;height:1.75rem;background:${localIdx === 0 ? 'var(--gold)' : 'rgba(240,165,0,.3)'};color:${localIdx === 0 ? '#1a0900' : 'var(--gold)'};${localIdx > 0 ? 'border:1px solid rgba(240,165,0,.5);' : ''}border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;flex-shrink:0">${num}${letter}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.85rem;font-weight:900;font-style:italic;color:${e.name ? 'var(--text)' : 'var(--muted)'}">${h(e.name || 'Exercice ' + letter)}</span>
            <button onclick="edRemoveEx(${globalIdx})" class="btn btn-danger btn-sm" style="padding:.15rem .4rem;font-size:.55rem;margin-left:auto">🗑</button>
          </div>
          ${dbSelectorsHTML(globalIdx, 'ss')}
          <input type="text" class="inp" value="${h(e.name || '')}" placeholder="Nom exercice ${letter}" oninput="editorExos[${globalIdx}].name=this.value" style="font-size:.8rem">
          <textarea class="inp" rows="2" placeholder="Description..." oninput="editorExos[${globalIdx}].desc=this.value" style="font-size:.75rem">${h(e.desc || '')}</textarea>
          <input type="text" class="inp" value="${h(e.video || '')}" placeholder="URL vidéo..." oninput="editorExos[${globalIdx}].video=this.value" style="font-size:.75rem">
          ${classicExFields(e, globalIdx, true)}
          <input type="text" class="inp" value="${h(e.comment || '')}" placeholder="Commentaire ${letter}..." oninput="editorExos[${globalIdx}].comment=this.value" style="font-size:.7rem">
          <button onclick="edDupParams(${globalIdx})" class="btn btn-ghost btn-sm" style="padding:.3rem .5rem;font-size:.6rem" title="Dupliquer paramètres vers suivant">⧉ Dupliquer params</button>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function circuitExFields(e, i) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Répétitions</label><input type="text" class="inp" value="${h(e.reps || '')}" placeholder="10-12" oninput="editorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${h(e.tst || '')}" placeholder="20s" oninput="editorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
  </div>`;
}

function classicExFields(e, i, compact = false) {
  const grid = compact ? 'grid-template-columns:1fr 1fr' : 'grid-template-columns:1fr 1fr 1fr 1fr 1fr';

  return `<div style="display:grid;${grid};gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${h(e.reps || '')}" placeholder="10-12" oninput="editorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${h(e.tst || '')}" placeholder="2-0-2" oninput="editorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
    ${!compact ? `<div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries</label><input type="number" class="inp" value="${h(e.sets || '')}" placeholder="4" oninput="editorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup série</label><input type="text" class="inp" value="${h(e.restSet || '')}" placeholder="90s" oninput="editorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${h(e.rpeTarget || '')}" placeholder="7-8" oninput="editorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>` : ''}
  </div>
  ${!compact ? `<div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup après cet exercice</label><input type="text" class="inp" value="${h(e.restEx || '')}" placeholder="120s" oninput="editorExos[${i}].restEx=this.value" style="font-size:.8rem"></div>` : ''}`;
}

// DB search per exercise
function edUpdateZone(idx, prefix, zone) {
  const patterns = [...new Set(exerciseDb.filter(e => !zone || e.zone === zone).map(e => e.pattern).filter(Boolean))].sort();
  const pEl = document.getElementById('ed-pat-' + prefix + '-' + idx);
  if (pEl) pEl.innerHTML = '<option value="">Pattern...</option>' + patterns.map(p => `<option value="${p}">${h(p)}</option>`).join('');

  const eEl = document.getElementById('ed-exdb-' + prefix + '-' + idx);
  const exs = exerciseDb.filter(e => !zone || e.zone === zone);
  if (eEl) eEl.innerHTML = '<option value="">Exercice...</option>' + exs.map(e => `<option value="${e.id}">${h(e.name)}</option>`).join('');
}

function edUpdatePattern(idx, prefix, pattern) {
  const zEl = document.getElementById('ed-zone-' + prefix + '-' + idx);
  const zone = zEl ? zEl.value : '';

  const exs = exerciseDb.filter(e => (!zone || e.zone === zone) && (!pattern || e.pattern === pattern));
  const eEl = document.getElementById('ed-exdb-' + prefix + '-' + idx);
  if (eEl) eEl.innerHTML = '<option value="">Exercice...</option>' + exs.map(e => `<option value="${e.id}">${h(e.name)}</option>`).join('');
}

function edPickEx(idx, prefix, exId) {
  if (!exId) return;

  const ex = exerciseDb.find(e => e.id === exId);
  if (!ex || !editorExos[idx]) return;

  editorExos[idx].name = ex.name;
  editorExos[idx].desc = ex.desc || '';
  editorExos[idx].video = ex.video || '';

  renderEditorExos();
  toast(ex.name + ' chargé', 'i');

  // Keep selections in dropdowns
  setTimeout(() => {
    const zEl = document.getElementById('ed-zone-' + prefix + '-' + idx);
    const pEl = document.getElementById('ed-pat-' + prefix + '-' + idx);
    const eEl = document.getElementById('ed-exdb-' + prefix + '-' + idx);
    
    if (zEl) zEl.value = ex.zone || '';
    if (pEl) pEl.value = ex.pattern || '';
    if (eEl) eEl.value = exId;
  }, 100);
}

function edMoveUp(i) {
  if (i <= 0) return;
  [editorExos[i - 1], editorExos[i]] = [editorExos[i], editorExos[i - 1]];
  renderEditorExos();
}

function edMoveDown(i) {
  if (i >= editorExos.length - 1) return;
  [editorExos[i], editorExos[i + 1]] = [editorExos[i + 1], editorExos[i]];
  renderEditorExos();
}

function edRemoveEx(i) {
  if (editorExos.length <= 1) {
    toast('Au moins 1 exercice requis', 'w');
    return;
  }
  editorExos.splice(i, 1);
  renderEditorExos();
}

function edAddSuperset(i) {
  // Mark exercise i as superset start, insert blank after
  if (!editorExos[i]) return;

  editorExos[i].superset = true;

  // Insert blank exercise after
  editorExos.splice(i + 1, 0, {
    name: '',
    desc: '',
    video: '',
    reps: '',
    tst: '',
    sets: '',
    restSet: '',
    restEx: '',
    rpeTarget: '',
    comment: '',
    superset: false
  });

  renderEditorExos();
  toast('Superset activé', 'i');
}

function edAddToSuperset(startIdx) {
  // Add another exercise to existing superset
  // Find the end of the superset
  let endIdx = startIdx;
  while (endIdx < editorExos.length - 1 && editorExos[endIdx].superset) {
    endIdx++;
  }

  // Insert new blank exercise after the last one in superset
  editorExos.splice(endIdx + 1, 0, {
    name: '',
    desc: '',
    video: '',
    reps: '',
    tst: '',
    sets: '',
    restSet: '',
    restEx: '',
    rpeTarget: '',
    comment: '',
    superset: false
  });

  // Mark the previous exercise as superset
  if (editorExos[endIdx]) {
    editorExos[endIdx].superset = true;
  }

  renderEditorExos();
  toast('Exercice ajouté au superset', 'i');
}

function edBreakSuperset(i) {
  // Remove superset flag from all exercises in this superset
  let j = i;
  while (j < editorExos.length && (j === i || editorExos[j - 1].superset)) {
    if (editorExos[j]) editorExos[j].superset = false;
    j++;
  }

  renderEditorExos();
  toast('Superset cassé', 'i');
}

function edDupParams(i) {
  // Duplicate parameters to next exercise
  if (i >= editorExos.length - 1) {
    toast('Pas d\'exercice suivant', 'w');
    return;
  }

  const source = editorExos[i];
  const target = editorExos[i + 1];

  target.reps = source.reps;
  target.tst = source.tst;
  target.sets = source.sets;
  target.restSet = source.restSet;
  target.restEx = source.restEx;
  target.rpeTarget = source.rpeTarget;

  renderEditorExos();
  toast('Paramètres dupliqués vers exercice suivant', 's');
}

function addExEditor() {
  editorExos.push({
    name: '',
    desc: '',
    video: '',
    reps: '',
    tst: '',
    sets: '',
    restSet: '',
    restEx: '',
    rpeTarget: '',
    comment: '',
    superset: false
  });

  renderEditorExos();

  // Scroll to new exercise
  setTimeout(() => {
    const el = document.getElementById('ed-exos-list');
    if (el) el.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

async function saveFullSession() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;

  const idx = clientProgram.findIndex(c => c.id === cId);
  if (idx === -1) return;

  const rest = document.getElementById('ed-rest').value.trim() || '45s';
  const tours = document.getElementById('ed-tours').value.trim() || '3';
  const comment = document.getElementById('ed-sess-comment').value.trim();

  clientProgram[idx].sessions[sess] = {
    rest,
    tours,
    mode: currentSessMode,
    comment,
    exercises: JSON.parse(JSON.stringify(editorExos))
  };

  try {
    await saveClientProgram();
    toast('Séance sauvegardée !', 's');
  } catch (e) {
    toast('Erreur sauvegarde', 'e');
  }
}

async function dupCycle() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const cidx = clientProgram.findIndex(c => c.id === cId);
  if (cidx === -1) return;

  const newId = Math.max(...clientProgram.map(c => c.id)) + 1;
  const clone = JSON.parse(JSON.stringify(clientProgram[cidx]));
  clone.id = newId;
  clone.focus = clientProgram[cidx].focus + ' (copie)';

  clientProgram.push(clone);

  try {
    await saveClientProgram();
    rebuildEditorSelects();
    renderClientGrid();
    renderCycleStatus();
    toast('Cycle dupliqué !', 's');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

async function dupSession() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;

  const cidx = clientProgram.findIndex(c => c.id === cId);
  if (cidx === -1) return;

  const cycle = clientProgram[cidx];
  const sessions = getAvailableSessions(cycle);

  // Find next available letter
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let newLetter = null;
  for (let i = 0; i < letters.length; i++) {
    if (!sessions.includes(letters[i])) {
      newLetter = letters[i];
      break;
    }
  }

  if (!newLetter) {
    toast('Limite de séances atteinte', 'w');
    return;
  }

  // Clone current session
  const clone = JSON.parse(JSON.stringify(cycle.sessions[sess]));
  cycle.sessions[newLetter] = clone;

  try {
    await saveClientProgram();
    rebuildEditorSelects();
    syncEditor();
    toast('Séance ' + newLetter + ' créée !', 's');
  } catch (e) {
    toast('Erreur', 'e');
  }
}

// Export to window
Object.assign(window, {
  rebuildEditorSelects,
  updateCopyGrid,
  syncEditor,
  setSessMode,
  renderEditorExos,
  dbSelectorsHTML,
  singleExEditorCard,
  supersetEditorCard,
  circuitExFields,
  classicExFields,
  edUpdateZone,
  edUpdatePattern,
  edPickEx,
  edMoveUp,
  edMoveDown,
  edRemoveEx,
  edAddSuperset,
  edAddToSuperset,
  edBreakSuperset,
  edDupParams,
  addExEditor,
  saveFullSession,
  dupCycle,
  dupSession
});
