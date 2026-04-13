// ── EDITOR ───────────────────────────────────────────

// Retourne TOUTES les sessions (actives ET inactives)
function getAllSessions(cycle) {
  if (!cycle) return [];
  const active = cycle.sessions_active || [];
  const sessionsKeys = cycle.sessions ? Object.keys(cycle.sessions) : [];
  return [...new Set([...active, ...sessionsKeys])].sort();
}

function rebuildEditorSelects() {
  // Utiliser la hiérarchie si disponible
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  const currentCycle = _edSelectedCycle || (allMicros[0]?.id);
  _edSelectedCycle = currentCycle;
  
  // Les sélecteurs de cycle sont maintenant gérés par renderHierarchySelectors()
  // On met juste à jour les boutons de séance
  rebuildEditorSessSelect(currentCycle);
  rebuildCopyGrid();
}

function setEdCycle(cycleId) {
  _edSelectedCycle = cycleId;
  rebuildEditorSelects();
  syncEditor();
}

function rebuildEditorSessSelect(cycleId) {
  // Utiliser le contexte hiérarchique pour trouver le bon cycle
  let c = null;
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  if (currentMacroId && currentMesoId && cycleId && typeof getMicroById === 'function') {
    c = getMicroById(currentMacroId, currentMesoId, cycleId);
  }
  
  // Fallback: filtrer allMicros par contexte hiérarchique si disponible
  if (!c) {
    const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
    if (currentMacroId && currentMesoId) {
      // Filtrer par macro/meso pour trouver le bon cycle
      c = allMicros.find(x => x.id === cycleId && x.macroId === currentMacroId && x.mesoId === currentMesoId);
    } else {
      c = allMicros.find(x => x.id === cycleId);
    }
  }
  
  const btns = document.getElementById('ed-sess-btns'); if (!btns) return;
  // Utiliser TOUTES les sessions (actives ET inactives)
  const allSessions = c ? getAllSessions(c) : [];
  const currentSess = _edSelectedSess || (allSessions[0] || 'A');
  _edSelectedSess = currentSess;
  btns.innerHTML = allSessions.map(s => {
    const isSel = s === currentSess;
    const col = getSessColor(s);
    return `<button onclick="setEdSess('${s}')" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .75rem;font-size:.75rem;${isSel?`border-color:${col};background:${col}20;color:${col}`:''}">${s}</button>`;
  }).join('');
}

function setEdSess(sess) {
  _edSelectedSess = sess;
  rebuildEditorSessSelect(_edSelectedCycle);
  syncEditor();
}

function getEdCycleId() {
  // Utiliser le contexte hiérarchique si disponible
  if (window._hierarchy?.currentMacro && window._hierarchy?.currentMeso && window._hierarchy?.currentMicro) {
    return window._hierarchy.currentMicro;
  }
  // Fallback: utiliser le premier micro disponible
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  return _edSelectedCycle || (allMicros[0]?.id);
}

function getEdSess() {
  return _edSelectedSess || 'A';
}

function rebuildCopyGrid() {
  const cg = document.getElementById('copy-grid'); if (!cg) return;
  const currentCycleId = getEdCycleId();
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  cg.innerHTML = allMicros.filter(c => c.id !== currentCycleId && !c.archived).map(c =>
    `<div class="copy-cycle-item" data-cycle-id="${c.id}" onclick="_toggleCopyCycle(this)" style="display:flex;align-items:center;justify-content:center;padding:.4rem .75rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s;user-select:none">C${c.id} – ${h(c.focus.substring(0,12))}</div>`
  ).join('');
}

function _toggleCopyCycle(el) {
  el.classList.toggle('copy-sel');
  const isSelected = el.classList.contains('copy-sel');
  el.style.borderColor = isSelected ? 'rgba(240,165,0,.5)' : 'var(--border)';
  el.style.color = isSelected ? 'var(--gold)' : 'var(--muted)';
  el.style.background = isSelected ? 'rgba(240,165,0,.1)' : 'var(--surface)';
  el.dataset.selected = isSelected ? '1' : '0';
}

function syncEditor() {
  // Utiliser le contexte hiérarchique pour trouver le bon microcycle
  let c = null;
  const cId = getEdCycleId();
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  if (currentMacroId && currentMesoId && cId && typeof getMicroById === 'function') {
    c = getMicroById(currentMacroId, currentMesoId, cId);
    console.log('[syncEditor] Using getMicroById:', currentMacroId, currentMesoId, cId, 'found:', !!c);
  }
  
  // Fallback: filtrer allMicros par contexte hiérarchique si disponible
  if (!c) {
    const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
    if (currentMacroId && currentMesoId) {
      // Filtrer par macro/meso pour trouver le bon cycle
      c = allMicros.find(x => x.id === cId && x.macroId === currentMacroId && x.mesoId === currentMesoId);
      console.log('[syncEditor] Fallback with hierarchy filter:', cId, 'in MA', currentMacroId, 'ME', currentMesoId, 'found:', !!c);
    } else {
      c = allMicros.find(x => x.id === cId);
      console.log('[syncEditor] Fallback without filter:', cId, 'found:', !!c);
    }
  }
  
  if (!c) {
    console.warn('[syncEditor] Cannot find cycle:', cId, 'hierarchy:', window._hierarchy);
    return;
  }
  
  rebuildEditorSessSelect(cId);
  rebuildCopyGrid();
  
  const sess = getEdSess();
  const sp = getSessParams(c, sess);
  
  document.getElementById('ed-rest').value = sp.rest||'45s';
  document.getElementById('ed-tours').value = sp.tours||'3';
  document.getElementById('ed-sess-comment').value = sp.comment||'';
  setSessMode(sp.mode||'circuit', false);
  editorExos = JSON.parse(JSON.stringify(getSessEx(c, sess)));
  edDropdownState = {};
  if (typeof clearEditorDirty === 'function') clearEditorDirty();
  renderEditorExos();
}

function setSessMode(mode, save=false) {
  currentSessMode = mode;
  const isCircuit = mode === 'circuit';
  const cbtn = document.getElementById('mode-circuit-btn');
  const kbtn = document.getElementById('mode-classic-btn');
  if (cbtn) { cbtn.style.borderColor=isCircuit?'rgba(240,165,0,.5)':'var(--border)'; cbtn.style.background=isCircuit?'rgba(240,165,0,.15)':'var(--surface)'; cbtn.style.color=isCircuit?'var(--gold)':'var(--muted)'; }
  if (kbtn) { kbtn.style.borderColor=!isCircuit?'rgba(59,130,246,.5)':'var(--border)'; kbtn.style.background=!isCircuit?'rgba(59,130,246,.15)':'var(--surface)'; kbtn.style.color=!isCircuit?'#60a5fa':'var(--muted)'; }
  const gp = document.getElementById('ed-circuit-global');
  if (gp) gp.style.display = isCircuit ? 'flex' : 'none';
  if (save) {
    const cId = getEdCycleId();
    const sess = getEdSess();
    
    // Utiliser la hiérarchie si disponible
    if (window._hierarchy?.currentMacro && window._hierarchy?.currentMeso && cId) {
      const micro = typeof getMicroById === 'function' ? 
        getMicroById(window._hierarchy.currentMacro, window._hierarchy.currentMeso, cId) : null;
      if (micro && micro.sessions && micro.sessions[sess] && !Array.isArray(micro.sessions[sess])) {
        micro.sessions[sess].mode = mode;
        saveHierarchy();
        return;
      }
    }
    
    // Fallback sur clientProgram
    const idx = clientProgram.findIndex(c => c.id === cId);
    if (idx !== -1) { const s = clientProgram[idx].sessions[sess]; if (s && !Array.isArray(s)) s.mode = mode; }
  }
  renderEditorExos();
}

function renderEditorExos() {
  const el = document.getElementById('ed-exos-list'); if (!el) return;
  const isCircuit = currentSessMode === 'circuit';
  const sess = getEdSess();
  const col = getSessColor(sess);

  if (!editorExos.length) {
    el.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--muted);font-style:italic;border:1px dashed var(--border);border-radius:1rem">Aucun exercice. Cliquez "+ Ajouter un exercice".</div>`;
    return;
  }

  let html = '';
  if (isCircuit) {
    editorExos.forEach((e, i) => { html += singleExEditorCard(e, i, col, true); });
  } else {
    const groups = groupExercises(editorExos);
    groups.forEach(g => {
      if (g.type === 'superset') {
        html += supersetEditorCard(g.items, g.startIdx, col);
      } else {
        html += singleExEditorCard(g.ex, g.idx, col, false);
      }
    });
  }
  el.innerHTML = html;
  // Update autocomplete datalist with current exerciseDb
  let dl = document.getElementById('db-exnames-list');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'db-exnames-list'; document.body.appendChild(dl); }
  dl.innerHTML = exerciseDb.map(e => `<option value="${h(e.name||'')}"></option>`).join('');
}

function _fillExFromDb(idx, name) {
  const dbEx = exerciseDb.find(e => e.name && e.name.toLowerCase() === name.toLowerCase());
  if (!dbEx) return;
  const ex = editorExos[idx]; if (!ex) return;
  if (!ex.photo && dbEx.photo) ex.photo = dbEx.photo;
  if (!ex.video && dbEx.video) ex.video = dbEx.video;
  if (!ex.desc && dbEx.desc) ex.desc = dbEx.desc;
}

function dbSelectorsHTML(idx, prefix) {
  const state = (edDropdownState || {})[idx] || {};
  const zones = [...new Set(exerciseDb.map(e => e.zone).filter(Boolean))].sort();
  const selZone = state.zone || '';
  const selPattern = state.pattern || '';
  const selExId = state.exId || '';
  const patterns = [...new Set(exerciseDb.filter(e => !selZone||e.zone===selZone).map(e => e.pattern).filter(Boolean))].sort();
  const filteredEx = exerciseDb.filter(e => (!selZone||e.zone===selZone) && (!selPattern||e.pattern===selPattern));
  const zOpts = '<option value="">Zone...</option>'+zones.map(z=>`<option value="${z}"${z===selZone?' selected':''}>${h(z)}</option>`).join('');
  const pOpts = '<option value="">Pattern...</option>'+patterns.map(p=>`<option value="${p}"${p===selPattern?' selected':''}>${h(p)}</option>`).join('');
  const eOpts = '<option value="">Exercice...</option>'+filteredEx.map(e=>`<option value="${e.id}"${e.id===selExId?' selected':''}>${h(e.name)}</option>`).join('');
  return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:.5rem">
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="edUpdateZone(${idx},'${prefix}',this.value)">${zOpts}</select>
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="edUpdatePattern(${idx},'${prefix}',this.value)">${pOpts}</select>
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="edPickEx(${idx},'${prefix}',this.value)">${eOpts}</select>
  </div>`;
}

function singleExEditorCard(e, i, col, isCircuit) {
  const num = i+1;
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:1.25rem;overflow:hidden" id="ex-card-${i}">
    <div style="background:${col}22;border-bottom:1px solid ${col}33;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem">
      <span style="width:2rem;height:2rem;background:${col};color:#fff;border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;flex-shrink:0">${num}</span>
      <span class="ex-title-span" style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;font-style:italic;flex:1;color:${e.name?'var(--text)':'var(--muted)'}">${h(e.name||'Nouvel exercice')}</span>
      <div style="display:flex;gap:.4rem;flex-shrink:0">
        <button onclick="edMoveUp(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button>
        <button onclick="edMoveDown(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button>
        ${!isCircuit?`<button onclick="edAddSuperset(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:var(--gold);border-color:rgba(240,165,0,.3)">⇄ SS</button>`:''}
        <button onclick="edShowCopyParams(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;font-size:.6rem">📋</button>
        <button onclick="edRemoveEx(${i})" class="btn btn-danger btn-sm" style="padding:.25rem .5rem">🗑</button>
      </div>
    </div>
    <div style="padding:1rem;display:flex;flex-direction:column;gap:.75rem">
      ${dbSelectorsHTML(i,'s')}
      <input type="text" list="db-exnames-list" class="inp" value="${h(e.name||'')}" placeholder="Nom exercice" oninput="editorExos[${i}].name=this.value;this.closest('[id^=ex-card-]').querySelector('.ex-title-span').textContent=this.value||'Nouvel exercice';_fillExFromDb(${i},this.value)" style="font-size:.85rem">
      <div style="display:flex;gap:.5rem;align-items:center">
        <span style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Type :</span>
        <button onclick="editorExos[${i}].exType='musculaire';renderEditorExos()" style="padding:.25rem .6rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;border:1px solid ${(e.exType||'musculaire')==='musculaire'?'rgba(240,165,0,.5)':'var(--border)'};background:${(e.exType||'musculaire')==='musculaire'?'rgba(240,165,0,.15)':'var(--surface)'};color:${(e.exType||'musculaire')==='musculaire'?'var(--gold)':'var(--muted)'}">💪 Musculaire</button>
        <button onclick="editorExos[${i}].exType='energetique';renderEditorExos()" style="padding:.25rem .6rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;border:1px solid ${e.exType==='energetique'?'rgba(59,130,246,.5)':'var(--border)'};background:${e.exType==='energetique'?'rgba(59,130,246,.15)':'var(--surface)'};color:${e.exType==='energetique'?'#60a5fa':'var(--muted)'}">⚡ Énergétique</button>
      </div>
      ${isCircuit ? circuitExFields(e,i) : (e.exType === 'energetique' ? energeticExFields(e,i) : classicExFields(e,i))}
      <input type="text" class="inp" value="${h(e.comment||'')}" placeholder="Commentaire sur cet exercice..." oninput="editorExos[${i}].comment=this.value" style="font-size:.8rem">
    </div>
  </div>`;
}

function supersetEditorCard(items, startIdx, col) {
  const num = startIdx+1;
  // Get common sets value from first item (or empty if different)
  const firstEx = items[0]?.ex;
  const commonSets = firstEx?.sets || '';
  // Rest after superset - stored in first exercise
  const restAfterSuperset = firstEx?.restEx || '';
  
  const itemsHTML = items.map((item, j) => {
    const e = item.ex; const i = item.idx;
    const letter = String.fromCharCode(65+j);
    return `<div style="padding:1rem;${j<items.length-1?'border-right:1px solid rgba(240,165,0,.2);':''}display:flex;flex-direction:column;gap:.6rem">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem">
        <span style="width:1.75rem;height:1.75rem;background:${j===0?'var(--gold)':'rgba(240,165,0,.3)'};color:${j===0?'#1a0900':'var(--gold)'};${j===0?'':'border:1px solid rgba(240,165,0,.5);'}border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;flex-shrink:0">${num}${letter}</span>
        <span class="ex-title-span-${i}" style="font-family:'Barlow Condensed',sans-serif;font-size:.85rem;font-weight:900;font-style:italic;color:${e.name?'var(--text)':'var(--muted)'}">${h(e.name||'Exercice '+letter)}</span>
      </div>
      ${dbSelectorsHTML(i,'ss')}
      <input type="text" class="inp" value="${h(e.name||'')}" placeholder="Nom exercice ${letter}" oninput="editorExos[${i}].name=this.value;document.querySelectorAll('.ex-title-span-${i}').forEach(s=>s.textContent=this.value||'Exercice ${letter}')" style="font-size:.8rem">
      ${supersetExFields(e,i)}
      <input type="text" class="inp" value="${h(e.comment||'')}" placeholder="Commentaire ${letter}..." oninput="editorExos[${i}].comment=this.value" style="font-size:.75rem">
    </div>`;
  }).join('');
  
  return `<div style="border:1px solid rgba(240,165,0,.35);border-radius:1.25rem;overflow:hidden;background:rgba(240,165,0,.03)" id="ex-card-${startIdx}">
    <div style="background:rgba(240,165,0,.12);border-bottom:1px solid rgba(240,165,0,.25);padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
      <span style="background:var(--gold);color:#1a0900;padding:.25rem .75rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;font-style:italic;flex-shrink:0">⇄ SUPERSET ${num}</span>
      
      <!-- Global Sets Field -->
      <div style="display:flex;align-items:center;gap:.5rem;margin-right:auto">
        <span style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Séries:</span>
        <input type="number" class="inp" value="${h(commonSets)}" placeholder="4" 
               oninput="edUpdateSupersetSets(${startIdx}, ${items.length}, this.value)" 
               style="width:60px;font-size:.8rem;padding:.3rem .5rem">
      </div>
      
      <!-- Rest After Superset -->
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Récup après:</span>
        <input type="text" class="inp" value="${h(restAfterSuperset)}" placeholder="120s" 
               oninput="edUpdateSupersetRest(${startIdx}, ${items.length}, this.value)" 
               style="width:70px;font-size:.8rem;padding:.3rem .5rem">
      </div>
      
      <div style="display:flex;gap:.4rem;flex-shrink:0;flex-wrap:wrap;margin-left:auto">
        <button onclick="edMoveUp(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button>
        <button onclick="edMoveDown(${startIdx+items.length-1})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button>
        <button onclick="edAddToSuperset(${startIdx},${items.length})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:var(--green);border-color:rgba(16,185,129,.3)">+ Ajouter</button>
        <button onclick="edBreakSuperset(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:#f87171;border-color:rgba(248,113,113,.3)">Casser SS</button>
        ${items.map((item,j)=>`<button onclick="edRemoveEx(${item.idx})" class="btn btn-danger btn-sm" style="padding:.25rem .5rem">🗑 ${String.fromCharCode(65+j)}</button>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:${items.map(()=>'1fr').join(' ')};gap:0">${itemsHTML}</div>
  </div>`;
}

function supersetExFields(e, i) {
  return `<div style="display:flex;flex-direction:column;gap:.5rem">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${h(e.reps||'')}" placeholder="10-12" oninput="editorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${h(e.tst||'')}" placeholder="2-0-2" oninput="editorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries (indiv.)</label><input type="number" class="inp" value="${h(e.sets||'')}" placeholder="4" oninput="editorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${h(e.rpeTarget||'')}" placeholder="7-8" oninput="editorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>
    </div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup série</label><input type="text" class="inp" value="${h(e.restSet||'')}" placeholder="90s" oninput="editorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
  </div>`;
}

// Update sets for all exercises in superset
function edUpdateSupersetSets(startIdx, groupLength, value) {
  for (let i = 0; i < groupLength; i++) {
    if (editorExos[startIdx + i]) {
      editorExos[startIdx + i].sets = value;
    }
  }
  if(typeof markEditorDirty==='function')markEditorDirty();
}

// Update rest after superset (stored in first exercise)
function edUpdateSupersetRest(startIdx, groupLength, value) {
  if (editorExos[startIdx]) {
    editorExos[startIdx].restEx = value;
  }
  if(typeof markEditorDirty==='function')markEditorDirty();
}

function circuitExFields(e, i) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Répétitions</label><input type="text" class="inp" value="${h(e.reps||'')}" placeholder="10-12" oninput="editorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${h(e.tst||'')}" placeholder="20s" oninput="editorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
  </div>`;
}

function classicExFields(e, i, compact=false) {
  const grid = compact ? 'grid-template-columns:1fr 1fr' : 'grid-template-columns:repeat(5,1fr)';
  return `<div style="display:grid;${grid};gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${h(e.reps||'')}" placeholder="10-12" oninput="editorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${h(e.tst||'')}" placeholder="2-0-2" oninput="editorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
    ${!compact?`<div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries</label><input type="number" class="inp" value="${h(e.sets||'')}" placeholder="4" oninput="editorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup série</label><input type="text" class="inp" value="${h(e.restSet||'')}" placeholder="90s" oninput="editorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${h(e.rpeTarget||'')}" placeholder="7-8" oninput="editorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>`:''}
  </div>
  ${!compact?`<div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup après cet exercice</label><input type="text" class="inp" value="${h(e.restEx||'')}" placeholder="120s" oninput="editorExos[${i}].restEx=this.value" style="font-size:.8rem"></div>`:''}`;
}

function energeticExFields(e, i) {
  return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Temps effort</label><input type="text" class="inp" value="${h(e.workTime||'')}" placeholder="20s" oninput="editorExos[${i}].workTime=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Temps récup</label><input type="text" class="inp" value="${h(e.restTime||'')}" placeholder="10s" oninput="editorExos[${i}].restTime=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${h(e.reps||'')}" placeholder="10" oninput="editorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries</label><input type="number" class="inp" value="${h(e.sets||'')}" placeholder="4" oninput="editorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
  </div>
  <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup entre séries</label><input type="text" class="inp" value="${h(e.restSet||'')}" placeholder="60s" oninput="editorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
  <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${h(e.rpeTarget||'')}" placeholder="7-8" oninput="editorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>`;
}

// DB search
function edUpdateZone(idx, prefix, zone) {
  if (!edDropdownState[idx]) edDropdownState[idx] = {};
  edDropdownState[idx].zone = zone;
  edDropdownState[idx].pattern = '';
  edDropdownState[idx].exId = '';
  renderEditorExos();
}
function edUpdatePattern(idx, prefix, pattern) {
  if (!edDropdownState[idx]) edDropdownState[idx] = {};
  edDropdownState[idx].pattern = pattern;
  edDropdownState[idx].exId = '';
  renderEditorExos();
}
function edPickEx(idx, prefix, exId) {
  if (!exId) return;
  const ex = exerciseDb.find(e => e.id === exId); if (!ex||!editorExos[idx]) return;
  if (!edDropdownState[idx]) edDropdownState[idx] = {};
  edDropdownState[idx].exId = exId;
  editorExos[idx].name = ex.name;
  editorExos[idx].desc = ex.desc||'';
  editorExos[idx].video = ex.video||'';
  editorExos[idx].photo = ex.photo||'';
  renderEditorExos();
  toast(ex.name+' chargé','i');
}

function edMoveUp(i) { if(i<=0)return; [editorExos[i-1],editorExos[i]]=[editorExos[i],editorExos[i-1]]; edDropdownState={}; renderEditorExos(); }
function edMoveDown(i) { if(i>=editorExos.length-1)return; [editorExos[i],editorExos[i+1]]=[editorExos[i+1],editorExos[i]]; edDropdownState={}; renderEditorExos(); }
function edRemoveEx(i) { 
  if(editorExos.length<=1){toast('Au moins 1 exercice requis','w');return;} 
  
  // Vérifier si l'exercice supprimé avait superset=true (pointait vers un suivant)
  const removedHadSuperset = editorExos[i].superset === true;
  
  // Si l'exercice précédent pointait vers celui-ci
  const prevHadSuperset = (i > 0 && editorExos[i-1].superset === true);
  
  // Sauvegarder l'état du suivant avant suppression
  const nextHadSuperset = (i < editorExos.length - 1) && (editorExos[i+1].superset === true);
  
  // Supprimer l'exercice
  editorExos.splice(i,1); 
  
  // Gérer la cohérence du superset après suppression
  if (prevHadSuperset) {
    // L'exercice précédent pointait vers l'exercice supprimé
    if (removedHadSuperset && i < editorExos.length) {
      // L'exercice supprimé pointait aussi vers un suivant
      // On ne redonne superset=true au suivant que si le suivant était aussi un maillon intermédiaire
      if (nextHadSuperset) {
        editorExos[i].superset = true;
      }
      // Sinon, le suivant était le dernier du superset (superset=false)
      // On ne change rien, il reste le dernier
    } else {
      // L'exercice supprimé n'avait pas superset=true (c'était le dernier du superset)
      // Donc on a: prev -> removed (dernier)
      // Après suppression: prev devient le dernier, il ne doit plus avoir superset=true
      editorExos[i-1].superset = false;
    }
  }
  
  edDropdownState={}; 
  if(typeof markEditorDirty==='function')markEditorDirty(); 
  renderEditorExos(); 
}

function edAddSuperset(i) {
  editorExos[i].superset = true;
  // Insère un exercice vide après i (ne prend pas l'exercice suivant)
  editorExos.splice(i+1, 0, { name:'', desc:'', video:'', photo:'', reps:'', tst:'', sets:'', restSet:'', restEx:'', rpeTarget:'', comment:'', superset:false, exType:'musculaire' });
  edDropdownState = {}; renderEditorExos(); toast('Superset créé','i');
}

function edAddToSuperset(startIdx, groupLength) {
  const lastIdx = startIdx + groupLength - 1;
  editorExos[lastIdx].superset = true;
  editorExos.splice(lastIdx+1, 0, { name:'', desc:'', video:'', photo:'', reps:'', tst:'', sets:'', restSet:'', restEx:'', rpeTarget:'', comment:'', superset:false, exType:'musculaire' });
  edDropdownState = {}; renderEditorExos(); toast('Exercice ajouté au superset','i');
}

function edBreakSuperset(startIdx) {
  if (editorExos[startIdx]) editorExos[startIdx].superset = false;
  edDropdownState = {}; renderEditorExos(); toast('Superset cassé','i');
}

// Copie des paramètres d'un exercice à l'autre
function edShowCopyParams(fromIdx) {
  _copyParamsFrom = fromIdx;
  const list = document.getElementById('copy-params-list'); if (!list) return;
  list.innerHTML = editorExos.map((e,i) => i !== fromIdx
    ? `<button onclick="edDoCopyParams(${i})" class="btn btn-ghost" style="width:100%;text-align:left;margin-bottom:.5rem;font-size:.8rem">Exo ${i+1}: ${h(e.name||'Sans nom')}</button>`
    : '').join('');
  openModal('modal-copy-params');
}
function edDoCopyParams(toIdx) {
  if (_copyParamsFrom === -1) return;
  const from = editorExos[_copyParamsFrom]; const to = editorExos[toIdx];
  to.reps = from.reps; to.tst = from.tst; to.sets = from.sets;
  to.restSet = from.restSet; to.restEx = from.restEx; to.rpeTarget = from.rpeTarget;
  closeModal('modal-copy-params'); renderEditorExos(); toast('Paramètres copiés','s');
}

function addExEditor() {
  editorExos.push({ name:'', desc:'', video:'', photo:'', reps:'', tst:'', sets:'', restSet:'', restEx:'', rpeTarget:'', comment:'', superset:false, exType:'musculaire' });
  if (typeof markEditorDirty === 'function') markEditorDirty();
  renderEditorExos();
  setTimeout(() => { const el = document.getElementById('ed-exos-list'); if(el) el.lastElementChild?.scrollIntoView({ behavior:'smooth', block:'nearest' }); }, 100);
}

async function saveFullSession() {
  const cId = getEdCycleId();
  const sess = getEdSess();
  const rest = document.getElementById('ed-rest').value.trim()||'45s';
  const tours = document.getElementById('ed-tours').value.trim()||'3';
  const comment = document.getElementById('ed-sess-comment').value.trim();
  const sessionData = { rest, tours, mode:currentSessMode, comment, exercises:JSON.parse(JSON.stringify(editorExos)) };
  
  // Utiliser la hiérarchie si disponible
  if (typeof getMicroById === 'function' && window._hierarchy) {
    const { currentMacro, currentMeso, currentMicro } = window._hierarchy;
    if (currentMacro && currentMeso && currentMicro) {
      const micro = getMicroById(currentMacro, currentMeso, currentMicro);
      if (micro) {
        micro.sessions = micro.sessions || {};
        micro.sessions[sess] = sessionData;
        if (!micro.sessions_active) micro.sessions_active = [];
        if (!micro.sessions_active.includes(sess)) {
          micro.sessions_active.push(sess);
          micro.sessions_active.sort();
        }
        await saveHierarchy();
        if (typeof clearEditorDirty === 'function') clearEditorDirty();
        toast('Séance sauvegardée !','s');
        return;
      }
    }
  }
  
  // Fallback sur l'ancienne structure
  const idx = clientProgram.findIndex(c => c.id === cId); if (idx===-1) return;
  clientProgram[idx].sessions[sess] = sessionData;
  try { await saveClientProgram(); if (typeof clearEditorDirty === 'function') clearEditorDirty(); toast('Séance sauvegardée !','s'); } catch(e) { toast('Erreur sauvegarde','e'); }
}

async function dupCycle() {
  const cId = getEdCycleId();
  
  // Utiliser la hiérarchie si disponible
  let original = null;
  let currentMacroId = window._hierarchy?.currentMacro;
  let currentMesoId = window._hierarchy?.currentMeso;
  
  if (currentMacroId && currentMesoId && cId && typeof getMicroById === 'function') {
    original = getMicroById(currentMacroId, currentMesoId, cId);
  }
  
  // Fallback sur clientProgram
  if (!original) {
    const cidx = clientProgram.findIndex(c => c.id === cId);
    if (cidx === -1) return;
    original = clientProgram[cidx];
  }
  
  // Utiliser addMicroCycle pour créer dans la hiérarchie si disponible
  if (currentMacroId && currentMesoId && typeof addMicroCycle === 'function') {
    const newMicroId = await addMicroCycle(currentMacroId, currentMesoId, original.focus + ' (copie)');
    const newMicro = getMicroById(currentMacroId, currentMesoId, newMicroId);
    if (newMicro) {
      newMicro.sessions = original.sessions ? JSON.parse(JSON.stringify(original.sessions)) : {};
      newMicro.sessions_active = original.sessions_active ? [...original.sessions_active] : [];
      await saveHierarchy();
      syncClientProgram();
      rebuildEditorSelects();
      renderClientGrid();
      if (typeof renderCycleStatus === 'function') renderCycleStatus();
      toast('Cycle dupliqué !', 's');
      return;
    }
  }
  
  // Fallback: créer dans clientProgram plat
  const newId = Math.max(...clientProgram.map(c => c.id)) + 1;
  const clone = {
    id: newId,
    focus: original.focus + ' (copie)',
    sessions: original.sessions ? JSON.parse(JSON.stringify(original.sessions)) : {},
    sessions_active: original.sessions_active ? [...original.sessions_active] : [],
    archived: false
  };
  
  clientProgram.push(clone);
  try { 
    await saveClientProgram(); 
    rebuildEditorSelects(); 
    renderClientGrid(); 
    if (typeof renderCycleStatus === 'function') renderCycleStatus();
    toast('Cycle dupliqué !', 's'); 
  } catch(e) { 
    toast('Erreur', 'e'); 
  }
}

async function dupSession() {
  const cId = getEdCycleId();
  const sess = getEdSess();
  const cidx = clientProgram.findIndex(c => c.id === cId); 
  if (cidx === -1) return;
  
  const currentCycle = clientProgram[cidx];
  const otherCycles = clientProgram.filter((c, i) => i !== cidx);
  const hasAvailableSlot = ['A', 'B', 'C', 'D'].some(l => !currentCycle.sessions_active.includes(l));
  
  const modalHtml = `
    <div id="modal-dup-session" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:420px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border)">
        <!-- Vue principale -->
        <div id="dup-main-view">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">⧉ Dupliquer ${sess}</h3>
            <button onclick="document.getElementById('modal-dup-session').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Où souhaitez-vous dupliquer cette séance ?</p>
          
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            ${hasAvailableSlot ? `
              <button onclick="_dupSessionSameCycle(${cId}, '${sess}')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">📁</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans ce cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">Cycle ${currentCycle.id}: ${h(currentCycle.focus)}</div>
                </div>
              </button>
            ` : ''}
            
            ${otherCycles.length > 0 ? `
              <button onclick="_showCycleSelectionView(${cId}, '${sess}')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">🔄</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans un autre cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">${otherCycles.length} cycle(s) existant(s)</div>
                </div>
              </button>
            ` : ''}
            
            <button onclick="_dupSessionNewCycle(${cId}, '${sess}')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25)">
              <span style="font-size:1.75rem">✨</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--green)">Nouveau cycle</div>
                <div style="font-size:.75rem;color:var(--muted)">Créer un cycle avec cette séance</div>
              </div>
            </button>
          </div>
          
          <button onclick="document.getElementById('modal-dup-session').remove()" class="btn" style="width:100%;padding:1rem">Annuler</button>
        </div>
        
        <!-- Vue sélection de cycle -->
        <div id="dup-cycles-view" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_showMainDupView()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Choisir un cycle</h3>
          </div>
          
          <div id="dup-cycles-list" style="display:flex;flex-direction:column;gap:.5rem;max-height:300px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:1rem;margin-bottom:1.5rem">
            ${otherCycles.map(c => {
              const sessionsList = Array.isArray(c.sessions_active) ? c.sessions_active : Object.keys(c.sessions || {});
              return `
                <div onclick="_dupSessionToCycle(${cId}, '${sess}', ${c.id})" 
                     class="btn btn-ghost btn-sm dup-cycle-btn"
                     style="cursor:pointer;padding:1rem;border-radius:.75rem;display:flex;align-items:center;gap:1rem;text-align:left;width:100%;">
                  <div style="width:40px;height:40px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:900;color:#1a0900;flex-shrink:0">
                    ${c.id}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(c.focus)}</div>
                    <div style="font-size:.7rem;color:var(--muted)">${sessionsList.length} séance(s)</div>
                  </div>
                  <span style="font-size:1.2rem">→</span>
                </div>
              `;
            }).join('')}
          </div>
          
          <button onclick="_showMainDupView()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-dup-session');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function _showCycleSelectionView(cId, sess) {
  document.getElementById('dup-main-view').style.display = 'none';
  document.getElementById('dup-cycles-view').style.display = 'block';
}

function _showMainDupView() {
  document.getElementById('dup-cycles-view').style.display = 'none';
  document.getElementById('dup-main-view').style.display = 'block';
}

async function _dupSessionSameCycle(cId, sess) {
  document.getElementById('modal-dup-session').remove();
  
  // Utiliser le contexte hiérarchique
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  let currentCycle = null;
  if (currentMacroId && currentMesoId && typeof getMicroById === 'function') {
    currentCycle = getMicroById(currentMacroId, currentMesoId, cId);
  }
  
  // Fallback sur clientProgram
  if (!currentCycle) {
    const cidx = clientProgram.findIndex(c => c.id === cId);
    if (cidx === -1) return;
    currentCycle = clientProgram[cidx];
  }
  
  // Trouver la première lettre de séance disponible
  const allSessions = getAllSessions(currentCycle);
  const availableLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].filter(l => !allSessions.includes(l));
  if (availableLetters.length === 0) {
    toast('Ce cycle a déjà toutes les séances (A-H)', 'w');
    return;
  }
  
  const newSess = availableLetters[0];
  currentCycle.sessions_active = currentCycle.sessions_active || [];
  currentCycle.sessions_active.push(newSess);
  currentCycle.sessions_active.sort();
  currentCycle.sessions = currentCycle.sessions || {};
  currentCycle.sessions[newSess] = JSON.parse(JSON.stringify(currentCycle.sessions[sess] || {}));
  
  try { 
    if (currentMacroId && currentMesoId) {
      await saveHierarchy();
      syncClientProgram();
    } else {
      await saveClientProgram();
    }
    rebuildEditorSelects(); 
    _edSelectedSess = newSess;
    syncEditor();
    toast('Séance dupliquée dans ce cycle (' + newSess + ') !','s'); 
  } catch(e) { 
    toast('Erreur','e'); 
  }
}

async function _dupSessionToCycle(srcCId, sess, dstCId) {
  document.getElementById('modal-dup-session').remove();
  
  // Utiliser le contexte hiérarchique
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  // Trouver le cycle source
  let srcCycle = null;
  if (currentMacroId && currentMesoId && typeof getMicroById === 'function') {
    srcCycle = getMicroById(currentMacroId, currentMesoId, srcCId);
  }
  if (!srcCycle) {
    const srcIdx = clientProgram.findIndex(c => c.id === srcCId);
    if (srcIdx === -1) return;
    srcCycle = clientProgram[srcIdx];
  }
  
  // Trouver le cycle destination
  let dstCycle = null;
  let dstMacroId = currentMacroId;
  let dstMesoId = currentMesoId;
  
  // Chercher dans tous les micros pour trouver le contexte du destination
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  const dstMicro = allMicros.find(c => c.id === dstCId);
  
  if (dstMicro) {
    dstMacroId = dstMicro.macroId || currentMacroId;
    dstMesoId = dstMicro.mesoId || currentMesoId;
    
    if (dstMacroId && dstMesoId && typeof getMicroById === 'function') {
      dstCycle = getMicroById(dstMacroId, dstMesoId, dstCId);
    }
  }
  
  // Fallback sur clientProgram
  if (!dstCycle) {
    const dstIdx = clientProgram.findIndex(c => c.id === dstCId);
    if (dstIdx === -1) return;
    dstCycle = clientProgram[dstIdx];
  }
  
  // Récupérer les séances existantes du cycle destination
  const existingSessions = getAllSessions(dstCycle);
  
  // Trouver la prochaine lettre disponible (A-Z)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let newSess = '';
  for (const l of letters) {
    if (!existingSessions.includes(l)) {
      newSess = l;
      break;
    }
  }
  
  if (!newSess) {
    toast('Le cycle destination est plein (A-Z utilisées)', 'w');
    return;
  }
  
  // S'assurer que sessions existe
  if (!dstCycle.sessions) dstCycle.sessions = {};
  
  // Ajouter la séance à la fin (pas besoin de trier, on ajoute à la fin)
  if (!dstCycle.sessions_active) dstCycle.sessions_active = [];
  dstCycle.sessions_active.push(newSess);
  dstCycle.sessions[newSess] = JSON.parse(JSON.stringify(srcCycle.sessions?.[sess] || {}));
  
  try { 
    if (dstMacroId && dstMesoId) {
      await saveHierarchy();
      syncClientProgram();
    } else {
      await saveClientProgram();
    }
    rebuildEditorSelects(); 
    renderClientGrid(); 
    if (typeof renderCycleStatus === 'function') renderCycleStatus();
    toast('Séance dupliquée dans le cycle ' + dstCId + ' (' + newSess + ') !','s'); 
  } catch(e) { 
    toast('Erreur','e'); 
  }
}

async function _dupSessionNewCycle(cId, sess) {
  document.getElementById('modal-dup-session').remove();
  
  // Utiliser le contexte hiérarchique
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  let original = null;
  if (currentMacroId && currentMesoId && typeof getMicroById === 'function') {
    original = getMicroById(currentMacroId, currentMesoId, cId);
  }
  
  // Fallback sur clientProgram
  if (!original) {
    const cidx = clientProgram.findIndex(c => c.id === cId);
    if (cidx === -1) return;
    original = clientProgram[cidx];
  }
  
  // Utiliser addMicroCycle pour créer dans la hiérarchie si disponible
  if (currentMacroId && currentMesoId && typeof addMicroCycle === 'function') {
    const newMicroId = await addMicroCycle(currentMacroId, currentMesoId, original.focus + ' (copie séance ' + sess + ')');
    const newMicro = getMicroById(currentMacroId, currentMesoId, newMicroId);
    if (newMicro) {
      newMicro.sessions = {
        [sess]: original.sessions?.[sess] ? JSON.parse(JSON.stringify(original.sessions[sess])) : {}
      };
      newMicro.sessions_active = [sess];
      await saveHierarchy();
      syncClientProgram();
      rebuildEditorSelects();
      renderClientGrid();
      if (typeof renderCycleStatus === 'function') renderCycleStatus();
      _edSelectedCycle = newMicroId;
      _edSelectedSess = sess;
      syncEditor();
      toast('Séance dupliquée dans un nouveau cycle !','s');
      return;
    }
  }
  
  // Fallback: créer dans clientProgram plat
  const newId = Math.max(...clientProgram.map(c => c.id)) + 1;
  
  // Créer une copie propre avec seulement la séance sélectionnée
  const clone = {
    id: newId,
    focus: original.focus + ' (copie séance ' + sess + ')',
    sessions: {
      [sess]: original.sessions?.[sess] ? JSON.parse(JSON.stringify(original.sessions[sess])) : {}
    },
    sessions_active: [sess],
    archived: false
  };
  
  clientProgram.push(clone);
  
  try { 
    await saveClientProgram(); 
    rebuildEditorSelects(); 
    renderClientGrid(); 
    if (typeof renderCycleStatus === 'function') renderCycleStatus();
    _edSelectedCycle = newId;
    _edSelectedSess = sess;
    syncEditor();
    toast('Séance dupliquée dans un nouveau cycle !','s'); 
  } catch(e) { 
    toast('Erreur','e'); 
  }
}

// ── COPIER VERS D'AUTRES CYCLES ───────────────────────
function setCopyMode(m) {
  copyMode = m;
  const descs = { sess:'Copie la séance sélectionnée vers les cycles cochés', cyc:'Copie les 4 séances du cycle vers les cycles cochés' };
  ['sess','cyc'].forEach(k => {
    const btn = document.getElementById('cm-'+k); if (!btn) return;
    btn.style.borderColor = k===m?'rgba(240,165,0,.5)':'var(--border)';
    btn.style.background = k===m?'rgba(240,165,0,.15)':'var(--surface)';
    btn.style.color = k===m?'var(--gold)':'var(--muted)';
  });
  const desc = document.getElementById('copy-desc'); if (desc) desc.innerText = descs[m]||'';
}

async function doCopy() {
  const cId = getEdCycleId();
  const sess = getEdSess();
  const sel = Array.from(document.querySelectorAll('#copy-grid .copy-cycle-item[data-selected="1"]')).map(el => parseInt(el.dataset.cycleId));
  if (!sel.length) { toast('Sélectionnez au moins un cycle cible','w'); return; }
  
  // Utiliser le contexte hiérarchique pour trouver le cycle source
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  let srcCycle = null;
  if (currentMacroId && currentMesoId && typeof getMicroById === 'function') {
    srcCycle = getMicroById(currentMacroId, currentMesoId, cId);
  }
  
  // Fallback sur clientProgram
  if (!srcCycle) {
    const srcCidx = clientProgram.findIndex(c => c.id === cId);
    if (srcCidx === -1) return;
    srcCycle = clientProgram[srcCidx];
  }
  
  // Récupérer tous les micros pour trouver le contexte des cibles
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  
  if (copyMode === 'sess') {
    // Copier seulement la séance sélectionnée
    const srcS = JSON.parse(JSON.stringify(srcCycle.sessions?.[sess] || {}));
    
    sel.forEach(tId => { 
      // Trouver le cycle cible avec son contexte hiérarchique
      const targetMicro = allMicros.find(c => c.id === tId);
      if (!targetMicro) return;
      
      const tMacroId = targetMicro.macroId || currentMacroId;
      const tMesoId = targetMicro.mesoId || currentMesoId;
      
      let targetCycle = null;
      if (tMacroId && tMesoId && typeof getMicroById === 'function') {
        targetCycle = getMicroById(tMacroId, tMesoId, tId);
      }
      if (!targetCycle) {
        const ci = clientProgram.findIndex(c => c.id === tId);
        if (ci === -1) return;
        targetCycle = clientProgram[ci];
      }
      
      if (!targetCycle.sessions) targetCycle.sessions = {};
      
      // Trouver la prochaine lettre disponible
      const existingSessions = getAllSessions(targetCycle);
      
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let newSess = '';
      for (const l of letters) {
        if (!existingSessions.includes(l)) {
          newSess = l;
          break;
        }
      }
      
      if (!newSess) {
        toast('Cycle ' + tId + ' plein (A-Z)', 'w');
        return;
      }
      
      // Ajouter à la fin sans écraser
      if (!targetCycle.sessions_active) targetCycle.sessions_active = [];
      targetCycle.sessions_active.push(newSess);
      targetCycle.sessions[newSess] = JSON.parse(JSON.stringify(srcS));
    });
  } else {
    // Copier tout le cycle - écraser complètement le cycle cible
    const srcSessions = JSON.parse(JSON.stringify(srcCycle.sessions || {}));
    const srcSessionsActive = Array.isArray(srcCycle.sessions_active) 
      ? JSON.parse(JSON.stringify(srcCycle.sessions_active))
      : Object.keys(srcSessions);
    const srcFocus = srcCycle.focus || '';
    
    sel.forEach(tId => {
      // Trouver le cycle cible avec son contexte hiérarchique
      const targetMicro = allMicros.find(c => c.id === tId);
      if (!targetMicro) return;
      
      const tMacroId = targetMicro.macroId || currentMacroId;
      const tMesoId = targetMicro.mesoId || currentMesoId;
      
      let targetCycle = null;
      if (tMacroId && tMesoId && typeof getMicroById === 'function') {
        targetCycle = getMicroById(tMacroId, tMesoId, tId);
      }
      if (!targetCycle) {
        const ci = clientProgram.findIndex(c => c.id === tId);
        if (ci === -1) return;
        targetCycle = clientProgram[ci];
      }
      
      // Écraser complètement le cycle cible avec les données du cycle source
      targetCycle.sessions = JSON.parse(JSON.stringify(srcSessions));
      targetCycle.sessions_active = JSON.parse(JSON.stringify(srcSessionsActive));
      targetCycle.focus = srcFocus;
    });
  }
  
  try {
    if (currentMacroId && currentMesoId) {
      await saveHierarchy();
      syncClientProgram();
    } else {
      await saveClientProgram();
    }
    // Déselectionner après copie
    document.querySelectorAll('#copy-grid .copy-cycle-item.copy-sel').forEach(el => {
      el.classList.remove('copy-sel');
      el.style.borderColor = 'var(--border)';
      el.style.color = 'var(--muted)';
      el.style.background = 'var(--surface)';
      el.dataset.selected = '0';
    });
    toast('Copie vers '+sel.length+' cycle(s) effectuée !','s');
  } catch(e) { toast('Erreur copie','e'); }
}

// ── AJOUTER UNE SÉANCE ────────────────────────────────
function _nextSessLetter(active) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < alpha.length; i++) { if (!active.includes(alpha[i])) return alpha[i]; }
  return 'S'+(active.length+1);
}

function openAddSessModal() {
  const cId = getEdCycleId();
  
  console.log('[AddSess] Opening modal for cycle ID:', cId);
  
  // Utiliser le contexte hiérarchique depuis window._hierarchy
  const currentMacroId = window._hierarchy?.currentMacro;
  const currentMesoId = window._hierarchy?.currentMeso;
  
  // Chercher le cycle avec le contexte hiérarchique
  let c = null;
  if (currentMacroId && currentMesoId && typeof getMicroById === 'function') {
    c = getMicroById(currentMacroId, currentMesoId, cId);
  }
  
  // Fallback: utiliser getAllMicros avec filtre hiérarchique
  if (!c) {
    const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
    if (currentMacroId && currentMesoId) {
      c = allMicros.find(x => x.id === cId && x.macroId === currentMacroId && x.mesoId === currentMesoId);
    } else {
      c = allMicros.find(x => x.id === cId);
    }
  }
  
  console.log('[AddSess] Found cycle:', c, 'with macro:', currentMacroId, 'meso:', currentMesoId);
  
  if (!c) {
    console.error('[AddSess] Could not find cycle!', cId, 'hierarchy:', window._hierarchy);
    return;
  }
  
  // Stocker le contexte hiérarchique (depuis le cycle trouvé ou window._hierarchy)
  _addSessCurrentMacroId = c.macroId || currentMacroId;
  _addSessCurrentMesoId = c.mesoId || currentMesoId;
  
  console.log('[AddSess] Stored context - Macro:', _addSessCurrentMacroId, 'Meso:', _addSessCurrentMesoId);
  
  const currentCycle = c;
  // Utiliser le contexte stocké pour l'affichage si le cycle n'a pas macroId/mesoId
  const displayMacroId = currentCycle.macroId || _addSessCurrentMacroId;
  const displayMesoId = currentCycle.mesoId || _addSessCurrentMesoId;
  const hierarchyDisplay = displayMacroId && displayMesoId ? 
    `MA${displayMacroId} / ME${displayMesoId} / C${currentCycle.id}` : 
    `C${currentCycle.id}`;
  
  const otherCycles = clientProgram.filter(cp => {
    // Filtrer les autres cycles qui ne sont pas le cycle actuel
    // ET qui ont de la place pour une nouvelle séance
    if (cp.id === cId) {
      // Même ID mais vérifier si c'est le même macro/meso
      return cp.macroId !== _addSessCurrentMacroId || cp.mesoId !== _addSessCurrentMesoId;
    }
    return true;
  });
  const active = getActiveSessions(c);
  
  // Générer les lettres disponibles
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let availableLetters = [];
  for (let i = 0; i < alpha.length && availableLetters.length < 8; i++) {
    if (!active.includes(alpha[i])) availableLetters.push(alpha[i]);
  }
  if (availableLetters.length < 4) {
    for (let i = 0; i < alpha.length && availableLetters.length < 8; i++) {
      const doubleLetter = alpha[i] + alpha[i];
      if (!active.includes(doubleLetter)) availableLetters.push(doubleLetter);
    }
  }
  
  // Stocker les données globales pour ce modal
  _addSessCurrentCycleId = cId;
  _addSessAvailableLetters = availableLetters;
  _addSessTargetCycleId = cId; // Par défaut: même cycle
  _addSessTargetLetter = availableLetters[0] || '';
  _addSessTargetType = 'blank'; // 'blank' ou 'copy'
  _addSessSourceClientId = '';
  _addSessSourceCycleId = 0;
  _addSessSourceSessType = '';
  _addSessSourceProgram = [];
  
  const modalHtml = `
    <div id="modal-add-sess" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:420px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border)">
        
        <!-- Vue 1: Choisir la destination -->
        <div id="add-sess-step1-dest">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">+ Ajouter une séance</h3>
            <button onclick="document.getElementById('modal-add-sess').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Où souhaitez-vous ajouter cette séance ?</p>
          
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            ${availableLetters.length > 0 ? `
              <button onclick="_addSessSelectDestination('same')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">📁</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans ce cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">${hierarchyDisplay} — ${h(currentCycle.focus)}</div>
                </div>
              </button>
            ` : `
              <div class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;opacity:0.5;cursor:not-allowed">
                <span style="font-size:1.75rem">📁</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans ce cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">Plus de place (A-Z utilisées)</div>
                </div>
              </div>
            `}
            
            ${otherCycles.length > 0 ? `
              <button onclick="_addSessShowOtherCycles()" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">🔄</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans un autre cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">${otherCycles.length} cycle(s) existant(s)</div>
                </div>
              </button>
            ` : ''}
            
            <button onclick="_addSessSelectDestination('new')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25)">
              <span style="font-size:1.75rem">✨</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--green)">Nouveau cycle</div>
                <div style="font-size:.75rem;color:var(--muted)">Créer un cycle avec cette séance</div>
              </div>
            </button>
          </div>
          
          <button onclick="document.getElementById('modal-add-sess').remove()" class="btn" style="width:100%;padding:1rem">Annuler</button>
        </div>
        
        <!-- Vue 1b: Liste des autres cycles -->
        <div id="add-sess-step1b-cycles" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_addSessBackToStep1()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Choisir un cycle</h3>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:.5rem;max-height:300px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:1rem;margin-bottom:1.5rem">
            ${otherCycles.map(cycle => {
              const cycleAllSessions = getAllSessions(cycle);
              const cycleAvailable = ['A','B','C','D','E','F','G','H'].filter(l => !cycleAllSessions.includes(l));
              const hasSpace = cycleAvailable.length > 0;
              const hierarchyPath = cycle.macroId && cycle.mesoId ? `MA${cycle.macroId} / ME${cycle.mesoId} / C${cycle.id}` : `C${cycle.id}`;
              return `
                <button onclick="${hasSpace ? `_addSessSelectOtherCycle(${cycle.id}, ${cycle.macroId || 'null'}, ${cycle.mesoId || 'null'})` : ''}" 
                        class="btn btn-ghost btn-sm" 
                        style="justify-content:flex-start;text-align:left;padding:1rem;border-radius:.75rem;${!hasSpace ? 'opacity:0.5;cursor:not-allowed' : ''}">
                  <div style="display:flex;align-items:center;gap:1rem;width:100%">
                    <div style="width:40px;height:40px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;color:#1a0900;flex-shrink:0;text-align:center;line-height:1.1">
                      ${cycle.id}
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(cycle.focus)}</div>
                      <div style="font-size:.7rem;color:var(--muted)">${hierarchyPath} • ${cycleAllSessions.length} séance(s) ${!hasSpace ? '• Complet' : `• ${cycleAvailable[0]} dispo`}</div>
                    </div>
                    ${hasSpace ? '<span style="font-size:1.2rem">→</span>' : '<span style="font-size:1.2rem;color:var(--muted)">✕</span>'}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
          
          <button onclick="_addSessBackToStep1()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
        <!-- Vue 2: Choisir le contenu -->
        <div id="add-sess-step2-content" style="display:none">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Contenu de la séance</h3>
            <button onclick="document.getElementById('modal-add-sess').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem" id="add-sess-dest-summary">Destination: ...</p>
          
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            <button onclick="_addSessSelectContent('blank')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
              <span style="font-size:1.75rem">📄</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Nouvelle séance vide</div>
                <div style="font-size:.75rem;color:var(--muted)">Créer à partir de zéro</div>
              </div>
            </button>
            
            <button onclick="_addSessSelectContent('copy')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
              <span style="font-size:1.75rem">📋</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Copier depuis une séance</div>
                <div style="font-size:.75rem;color:var(--muted)">Dupliquer une séance existante</div>
              </div>
            </button>
          </div>
          
          <button onclick="_addSessBackToStep1()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
        <!-- Vue 3: Copier - Sélection du client -->
        <div id="add-sess-step3-client" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_addSessBackToStep2()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Choisir un client</h3>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1rem;font-size:.85rem">Sélectionnez le client qui contient la séance à copier :</p>
          
          <div id="add-sess-clients-list" style="display:flex;flex-direction:column;gap:.5rem;max-height:300px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:1rem;margin-bottom:1.5rem">
            <!-- Rempli dynamiquement -->
          </div>
          
          <button onclick="_addSessBackToStep2()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
        <!-- Vue 4: Copier - Sélection du cycle et séance -->
        <div id="add-sess-step4-session" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_addSessBackToStep3()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Choisir la séance</h3>
          </div>
          
          <div style="margin-bottom:1rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Cycle</label>
            <select id="add-sess-src-cycle" class="inp" style="margin-bottom:1rem" onchange="_addSessLoadSessions(this.value)">
              <option value="">-- Choisir un cycle --</option>
            </select>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Séance à copier</label>
            <div id="add-sess-src-sessions" style="display:flex;gap:.5rem;flex-wrap:wrap;min-height:50px;padding:.5rem;background:var(--surface);border-radius:.75rem;margin-bottom:1rem">
              <p style="font-size:.75rem;color:var(--muted);font-style:italic;width:100%;text-align:center">Sélectionnez un cycle</p>
            </div>
          </div>
          
          <button id="btn-validate-sess-selection" onclick="_addSessValidateSessionSelection()" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem;opacity:0.5" disabled>Valider la séance</button>
          <button onclick="_addSessBackToStep3()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
        <!-- Vue 5: Lettre et confirmation -->
        <div id="add-sess-step5-confirm" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_addSessBackFromConfirm()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Confirmer</h3>
          </div>
          
          <div style="background:var(--surface);padding:1rem;border-radius:1rem;margin-bottom:1.5rem">
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:.25rem">Récapitulatif</div>
            <div id="add-sess-summary" style="font-size:.9rem"></div>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Lettre de la séance</label>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap" id="add-sess-letters-container">
              <!-- Rempli dynamiquement -->
            </div>
          </div>
          
          <button onclick="_addSessFinalize()" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem" id="btn-finalize-add-sess">Créer la séance</button>
          <button onclick="_addSessBackFromConfirm()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-add-sess');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Charger la liste des clients pour l'étape 3
  _addSessLoadClientsList();
}

// Nouvelles fonctions pour le flux +Séance en 5 étapes
function _addSessSelectDestination(dest) {
  if (dest === 'same') {
    _addSessTargetCycleId = _addSessCurrentCycleId;
    // Préserver le contexte macro/meso du cycle actuel
    _addSessTargetMacroId = _addSessCurrentMacroId;
    _addSessTargetMesoId = _addSessCurrentMesoId;
    _addSessShowStep2();
  } else if (dest === 'new') {
    _addSessTargetCycleId = 'new';
    _addSessShowStep2();
  }
}

function _addSessShowOtherCycles() {
  document.getElementById('add-sess-step1-dest').style.display = 'none';
  document.getElementById('add-sess-step1b-cycles').style.display = 'block';
}

function _addSessSelectOtherCycle(cycleId, macroId, mesoId) {
  _addSessTargetCycleId = cycleId;
  // Stocker aussi le contexte macro/meso du cycle sélectionné
  if (macroId && mesoId) {
    _addSessTargetMacroId = macroId;
    _addSessTargetMesoId = mesoId;
  } else {
    // Fallback: trouver le cycle dans clientProgram pour récupérer macro/meso
    const cycle = clientProgram.find(c => c.id === cycleId);
    _addSessTargetMacroId = cycle?.macroId;
    _addSessTargetMesoId = cycle?.mesoId;
  }
  _addSessShowStep2();
}

function _addSessBackToStep1() {
  document.getElementById('add-sess-step1b-cycles').style.display = 'none';
  document.getElementById('add-sess-step2-content').style.display = 'none';
  document.getElementById('add-sess-step1-dest').style.display = 'block';
}

function _addSessShowStep2() {
  let targetCycle;
  
  // Toujours utiliser getAllMicros pour avoir le contexte complet
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  
  if (_addSessTargetCycleId === 'new') {
    targetCycle = null;
  } else if (_addSessTargetCycleId === _addSessCurrentCycleId) {
    // Cycle actuel - filtrer par contexte hiérarchique stocké
    targetCycle = allMicros.find(c => 
      c.id === _addSessCurrentCycleId && 
      c.macroId === _addSessCurrentMacroId && 
      c.mesoId === _addSessCurrentMesoId
    );
    // Fallback si pas trouvé avec le filtre
    if (!targetCycle) {
      targetCycle = allMicros.find(c => c.id === _addSessCurrentCycleId);
    }
  } else {
    // Autre cycle - filtrer par contexte target stocké
    targetCycle = allMicros.find(c => 
      c.id === _addSessTargetCycleId && 
      c.macroId === _addSessTargetMacroId && 
      c.mesoId === _addSessTargetMesoId
    );
    // Fallback si pas trouvé avec le filtre
    if (!targetCycle) {
      targetCycle = allMicros.find(c => c.id === _addSessTargetCycleId);
    }
  }
  
  let destText = '';
  if (_addSessTargetCycleId === 'new') {
    destText = 'Nouveau cycle';
  } else if (targetCycle) {
    // Utiliser le contexte stocké si le targetCycle n'a pas macroId/mesoId
    const displayMacroId = targetCycle.macroId || _addSessTargetMacroId || _addSessCurrentMacroId;
    const displayMesoId = targetCycle.mesoId || _addSessTargetMesoId || _addSessCurrentMesoId;
    const hierarchyPath = displayMacroId && displayMesoId ? 
      `MA${displayMacroId} / ME${displayMesoId} / C${targetCycle.id}` : 
      `C${targetCycle.id}`;
    destText = `${hierarchyPath} — ${targetCycle.focus}`;
  }
  
  document.getElementById('add-sess-dest-summary').innerText = `Destination: ${destText}`;
  
  document.getElementById('add-sess-step1-dest').style.display = 'none';
  document.getElementById('add-sess-step1b-cycles').style.display = 'none';
  document.getElementById('add-sess-step2-content').style.display = 'block';
}

function _addSessBackToStep2() {
  document.getElementById('add-sess-step3-client').style.display = 'none';
  document.getElementById('add-sess-step4-session').style.display = 'none';
  document.getElementById('add-sess-step5-confirm').style.display = 'none';
  document.getElementById('add-sess-step2-content').style.display = 'block';
}

function _addSessSelectContent(type) {
  _addSessTargetType = type;
  if (type === 'blank') {
    _addSessShowStep5('blank');
  } else {
    _addSessShowStep3();
  }
}

function _addSessShowStep3() {
  document.getElementById('add-sess-step2-content').style.display = 'none';
  document.getElementById('add-sess-step3-client').style.display = 'block';
}

function _addSessBackToStep3() {
  document.getElementById('add-sess-step4-session').style.display = 'none';
  document.getElementById('add-sess-step3-client').style.display = 'block';
}

function _addSessShowStep4(clientId, clientName) {
  _addSessSourceClientId = clientId;
  document.getElementById('add-sess-step3-client').style.display = 'none';
  document.getElementById('add-sess-step4-session').style.display = 'block';
  
  // Charger les cycles du client sélectionné
  _addSessLoadSourceCycles(clientId);
}

function _addSessBackFromConfirm() {
  if (_addSessTargetType === 'blank') {
    document.getElementById('add-sess-step5-confirm').style.display = 'none';
    document.getElementById('add-sess-step2-content').style.display = 'block';
  } else {
    document.getElementById('add-sess-step5-confirm').style.display = 'none';
    document.getElementById('add-sess-step4-session').style.display = 'block';
  }
}

function _addSessShowStep5(fromStep) {
  // Calculer les lettres disponibles pour la destination
  let targetCycle, availableLetters;
  
  // Toujours utiliser getAllMicros pour avoir le contexte complet
  const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
  
  if (_addSessTargetCycleId === 'new') {
    // Nouveau cycle: toutes les lettres A-H disponibles
    availableLetters = ['A','B','C','D','E','F','G','H'];
  } else {
    // Trouver le cycle avec contexte hiérarchique stocké
    if (_addSessTargetCycleId === _addSessCurrentCycleId) {
      // Cycle actuel
      targetCycle = allMicros.find(c => 
        c.id === _addSessTargetCycleId && 
        c.macroId === _addSessCurrentMacroId && 
        c.mesoId === _addSessCurrentMesoId
      );
    } else {
      // Autre cycle
      targetCycle = allMicros.find(c => 
        c.id === _addSessTargetCycleId && 
        c.macroId === _addSessTargetMacroId && 
        c.mesoId === _addSessTargetMesoId
      );
    }
    // Fallback sans filtre hiérarchique
    if (!targetCycle) {
      targetCycle = allMicros.find(c => c.id === _addSessTargetCycleId);
    }
    
    // Utiliser TOUTES les sessions (actives ET inactives), pas seulement sessions_active
    const allSessions = targetCycle ? getAllSessions(targetCycle) : [];
    availableLetters = [];
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alpha.length && availableLetters.length < 8; i++) {
      if (!allSessions.includes(alpha[i])) availableLetters.push(alpha[i]);
    }
  }
  
  if (availableLetters.length === 0) {
    toast('Plus de lettres disponibles dans ce cycle', 'w');
    return;
  }
  
  _addSessAvailableLetters = availableLetters;
  if (!_addSessAvailableLetters.includes(_addSessTargetLetter)) {
    _addSessTargetLetter = availableLetters[0];
  }
  
  // Mettre à jour le récapitulatif
  let summary = '';
  if (_addSessTargetType === 'blank') {
    summary = 'Nouvelle séance vide';
  } else {
    const srcClient = (allClients || []).find(c => c.id === _addSessSourceClientId);
    summary = `Copie depuis ${srcClient ? (srcClient.name || srcClient.code) : 'client'} • Cycle ${_addSessSourceCycleId} • Séance ${_addSessSourceSessType}`;
  }
  
  if (_addSessTargetCycleId === 'new') {
    summary += ' → Nouveau cycle';
  } else if (targetCycle) {
    // Utiliser le contexte stocké si le targetCycle n'a pas macroId/mesoId
    const displayMacroId = targetCycle.macroId || _addSessTargetMacroId || _addSessCurrentMacroId;
    const displayMesoId = targetCycle.mesoId || _addSessTargetMesoId || _addSessCurrentMesoId;
    const hierarchyPath = displayMacroId && displayMesoId ? 
      `MA${displayMacroId} / ME${displayMesoId} / C${targetCycle.id}` : 
      `C${targetCycle.id}`;
    summary += ` → ${hierarchyPath}`;
  }
  
  const summaryEl = document.getElementById('add-sess-summary');
  if (summaryEl) summaryEl.innerText = summary;
  
  // Générer les boutons de lettres
  const lettersContainer = document.getElementById('add-sess-letters-container');
  if (lettersContainer) {
    lettersContainer.innerHTML = availableLetters.map(l => `
      <button onclick="_addSessSelectFinalLetter(this, '${l}')" class="final-letter-btn btn btn-ghost" style="padding:1rem 1.5rem;font-size:1.2rem;border-radius:.75rem;${l === _addSessTargetLetter ? 'border-color:var(--gold);background:rgba(240,165,0,.15);color:var(--gold)' : ''}">${l}</button>
    `).join('');
  }
  
  // Navigation entre les étapes - gérer les éléments qui peuvent ne pas exister
  const step2 = document.getElementById('add-sess-step2-content');
  const step3 = document.getElementById('add-sess-step3-client');
  const step4 = document.getElementById('add-sess-step4-session');
  const step5 = document.getElementById('add-sess-step5-confirm');
  
  if (step2) step2.style.display = 'none';
  if (step3) step3.style.display = 'none';
  if (step4) step4.style.display = 'none';
  if (step5) step5.style.display = 'block';
}

function _addSessSelectFinalLetter(btn, letter) {
  document.querySelectorAll('.final-letter-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background = 'var(--surface)';
    b.style.color = 'var(--muted)';
  });
  btn.style.borderColor = 'var(--gold)';
  btn.style.background = 'rgba(240,165,0,.15)';
  btn.style.color = 'var(--gold)';
  _addSessTargetLetter = letter;
}

// Charger la liste des clients pour la copie
function _addSessLoadClientsList() {
  const container = document.getElementById('add-sess-clients-list');
  if (!container) return;
  
  // Coach: seulement ses clients. Admin: tous les clients visibles.
  let clientsList = [];
  if (isAdminUser()) {
    clientsList = getVisibleClients().filter(c => !c.archived);
  } else if (isCoachUser() && currentUser) {
    // Coach: seulement ses propres clients
    clientsList = (allClients || []).filter(c => !c.archived && c.coachUid === currentUser.uid);
  }
  
  if (clientsList.length === 0) {
    container.innerHTML = '<p style="font-size:.85rem;color:var(--muted);text-align:center;padding:1rem">Aucun client disponible pour la copie</p>';
    return;
  }
  
  container.innerHTML = clientsList.map(c => `
    <button onclick="_addSessShowStep4('${c.id}', '${h(c.name || c.code)}')" 
            class="btn btn-ghost btn-sm" 
            style="justify-content:flex-start;text-align:left;padding:1rem;border-radius:.75rem">
      <div style="display:flex;align-items:center;gap:1rem;width:100%">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:900;color:#1a0900;flex-shrink:0">
          ${(c.name || c.code || 'C').charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(c.name || c.code)}</div>
        </div>
        <span style="font-size:1.2rem">→</span>
      </div>
    </button>
  `).join('');
}

async function _addSessLoadSourceCycles(clientId) {
  const cycleSelect = document.getElementById('add-sess-src-cycle');
  if (!cycleSelect) return;
  
  // Vérification des permissions : coach peut uniquement charger depuis ses clients
  if (!isAdminUser()) {
    const sourceClient = allClients.find(c => c.id === clientId);
    if (!sourceClient || !canManageClient(sourceClient)) {
      toast('Vous ne pouvez pas copier depuis ce client', 'e');
      cycleSelect.innerHTML = '<option value="">Accès refusé</option>';
      return;
    }
  }
  
  cycleSelect.innerHTML = '<option value="">Chargement...</option>';
  cycleSelect.disabled = true;
  
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId,'data','program'));
    _addSessSourceProgram = (doc.exists && doc.data().cycles) ? doc.data().cycles : [];
    
    if (_addSessSourceProgram.length > 0) {
      cycleSelect.innerHTML = '<option value="">-- Choisir un cycle --</option>' + 
        _addSessSourceProgram.map(c => {
          const activeCount = (c.sessions_active || []).length;
          const sessionsCount = c.sessions ? Object.keys(c.sessions).length : 0;
          const totalCount = Math.max(activeCount, sessionsCount);
          const hierarchyPath = c.macroId && c.mesoId ? `MA${c.macroId} / ME${c.mesoId} / C${c.id}` : `C${c.id}`;
          return `<option value="${c.id}">${hierarchyPath} – ${h(c.focus)} (${totalCount} séances)</option>`;
        }).join('');
      cycleSelect.disabled = false;
    } else {
      cycleSelect.innerHTML = '<option value="">Aucun cycle disponible</option>';
    }
    
    document.getElementById('add-sess-src-sessions').innerHTML = '<p style="font-size:.75rem;color:var(--muted);font-style:italic;width:100%;text-align:center">Sélectionnez un cycle</p>';
    _addSessSourceCycleId = 0;
    _addSessSourceSessType = '';
  } catch(e) {
    console.error(e);
    cycleSelect.innerHTML = '<option value="">Erreur de chargement</option>';
  }
}

function _addSessLoadSessions(cycleId) {
  if (!cycleId) return;
  _addSessSourceCycleId = parseInt(cycleId);
  
  const cycle = _addSessSourceProgram.find(c => c.id === _addSessSourceCycleId);
  const container = document.getElementById('add-sess-src-sessions');
  if (!container || !cycle) return;
  
  // Fusionner sessions_active ET sessions pour avoir TOUTES les séances
  const activeSessions = cycle.sessions_active || [];
  const sessionsKeys = cycle.sessions ? Object.keys(cycle.sessions) : [];
  const allSessions = [...new Set([...activeSessions, ...sessionsKeys])].sort();
  
  if (allSessions.length === 0) {
    container.innerHTML = '<p style="font-size:.75rem;color:var(--muted);font-style:italic;width:100%;text-align:center">Aucune séance dans ce cycle</p>';
    return;
  }
  
  // Toutes les séances sont affichées de la même manière (pas de distinction inactive)
  container.innerHTML = allSessions.map(s => {
    const safeS = s.replace(/'/g, "\\'");
    return `
    <button onclick="_addSessSelectSourceSession(this, '${safeS}')" 
            class="src-sess-btn btn btn-ghost" 
            style="padding:.75rem 1.25rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.1rem">
      ${s}
    </button>
  `;}).join('');
  
  // Plus d'auto-sélection, l'utilisateur doit choisir manuellement
  _addSessSourceSessType = '';
}

function _addSessSelectSourceSession(btn, sessType) {
  document.querySelectorAll('.src-sess-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background = 'var(--surface)';
    b.style.color = 'var(--muted)';
  });
  btn.style.borderColor = 'var(--gold)';
  btn.style.background = 'rgba(240,165,0,.15)';
  btn.style.color = 'var(--gold)';
  _addSessSourceSessType = sessType;
  
  // Activer le bouton valider
  const validateBtn = document.getElementById('btn-validate-sess-selection');
  if (validateBtn) {
    validateBtn.disabled = false;
    validateBtn.style.opacity = '1';
  }
}

function _addSessValidateSessionSelection() {
  if (!_addSessSourceSessType) {
    toast('Veuillez sélectionner une séance', 'w');
    return;
  }
  
  // Calculer la lettre automatiquement (après la dernière séance existante)
  const targetCycle = _addSessTargetCycleId === 'new' ? null : 
                      clientProgram.find(c => c.id === _addSessTargetCycleId);
  
  let existingSessions = [];
  if (_addSessTargetCycleId === 'new') {
    // Pour nouveau cycle, commence à A
    existingSessions = [];
  } else if (targetCycle) {
    // Fusionner sessions_active ET sessions pour avoir TOUTES les séances existantes
    const active = targetCycle.sessions_active || [];
    const sessionsKeys = targetCycle.sessions ? Object.keys(targetCycle.sessions) : [];
    existingSessions = [...new Set([...active, ...sessionsKeys])];
  }
  
  // Trouver la prochaine lettre disponible
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let nextLetter = 'A';
  for (const l of letters) {
    if (!existingSessions.includes(l)) {
      nextLetter = l;
      break;
    }
  }
  
  _addSessTargetLetter = nextLetter;
  
  // Créer directement la séance
  _addSessFinalize();
}

async function _addSessFinalize() {
  const letter = _addSessTargetLetter;
  if (!letter) { toast('Choisissez une lettre', 'w'); return; }
  
  // Vérification des permissions si on copie depuis un autre client
  if (_addSessTargetType === 'copy' && _addSessSourceClientId && _addSessSourceClientId !== currentClient?.id) {
    if (!isAdminUser()) {
      const sourceClient = allClients.find(c => c.id === _addSessSourceClientId);
      if (!sourceClient || !canManageClient(sourceClient)) {
        toast('Vous ne pouvez pas copier depuis ce client', 'e');
        return;
      }
    }
  }
  
  try {
    if (_addSessTargetCycleId === 'new') {
      // Créer un nouveau cycle
      await _addSessCreateNewCycle(letter);
    } else {
      // Ajouter à un cycle existant
      await _addSessAddToExistingCycle(_addSessTargetCycleId, letter);
    }
    document.getElementById('modal-add-sess').remove();
    // Rafraîchir la visualisation automatiquement
    if (typeof renderVisu === 'function') renderVisu();
  } catch(e) {
    console.error(e);
    toast('Erreur lors de la création', 'e');
  }
}

async function _addSessCreateNewCycle(letter) {
  const currentCId = _addSessCurrentCycleId;
  
  // Utiliser getMicroById avec le chemin complet pour trouver le bon cycle
  let currentCycle;
  if (typeof getMicroById === 'function' && _addSessCurrentMacroId && _addSessCurrentMesoId) {
    currentCycle = getMicroById(_addSessCurrentMacroId, _addSessCurrentMesoId, currentCId);
    console.log('[AddSess] CreateNew - Using hierarchy to find cycle:', currentCId, 'in MA', _addSessCurrentMacroId, 'ME', _addSessCurrentMesoId);
  } else {
    currentCycle = clientProgram.find(c => c.id === currentCId);
    console.log('[AddSess] CreateNew - Using fallback, cycle:', currentCId);
  }
  
  if (!currentCycle) {
    console.error('[AddSess] Cannot find current cycle:', currentCId, 'macro:', _addSessCurrentMacroId, 'meso:', _addSessCurrentMesoId);
    return;
  }
  
  let sessionData;
  if (_addSessTargetType === 'blank') {
    sessionData = { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  } else {
    const srcCycle = _addSessSourceProgram.find(c => c.id === _addSessSourceCycleId);
    sessionData = srcCycle ? JSON.parse(JSON.stringify(srcCycle.sessions[_addSessSourceSessType] || {})) : { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  }
  
  // Utiliser addMicroCycle pour créer le nouveau cycle dans la hiérarchie
  let newId;
  if (typeof addMicroCycle === 'function' && _addSessCurrentMacroId && _addSessCurrentMesoId) {
    newId = await addMicroCycle(_addSessCurrentMacroId, _addSessCurrentMesoId, currentCycle.focus + ' (avec ' + letter + ')');
    // Ajouter la séance au nouveau cycle
    const newCycle = getMicroById(_addSessCurrentMacroId, _addSessCurrentMesoId, newId);
    if (newCycle) {
      newCycle.sessions_active = [letter];
      newCycle.sessions = { [letter]: sessionData };
      await saveHierarchy();
      syncClientProgram();
    }
  } else {
    // Fallback: créer dans clientProgram plat
    newId = Math.max(...clientProgram.map(c => c.id), 0) + 1;
    const newCycle = {
      id: newId,
      focus: currentCycle.focus + ' (avec ' + letter + ')',
      sessions_active: [letter],
      sessions: { [letter]: sessionData }
    };
    clientProgram.push(newCycle);
    await saveClientProgram();
  }
  
  rebuildEditorSelects();
  _edSelectedCycle = newId;
  _edSelectedSess = letter;
  syncEditor();
  
  toast(`Cycle ${newId} créé avec séance ${letter} !`, 's');
}

async function _addSessAddToExistingCycle(cycleId, letter) {
  // Utiliser getMicroById avec le chemin complet macro/meso/micro pour trouver le bon cycle
  let cycle;
  if (typeof getMicroById === 'function' && _addSessCurrentMacroId && _addSessCurrentMesoId) {
    cycle = getMicroById(_addSessCurrentMacroId, _addSessCurrentMesoId, cycleId);
    console.log('[AddSess] Using hierarchy to find cycle:', cycleId, 'in MA', _addSessCurrentMacroId, 'ME', _addSessCurrentMesoId);
  } else {
    // Fallback sur getAllMicros
    const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
    cycle = allMicros.find(c => c.id === cycleId);
    console.log('[AddSess] Using allMicros fallback:', cycleId);
  }
  
  if (!cycle) {
    console.error('[AddSess] Cannot find cycle to add session:', cycleId, 'macro:', _addSessCurrentMacroId, 'meso:', _addSessCurrentMesoId);
    return;
  }
  
  console.log('[AddSess] Adding to cycle:', cycle);
  
  let sessionData;
  if (_addSessTargetType === 'blank') {
    sessionData = { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  } else {
    const srcCycle = _addSessSourceProgram.find(c => c.id === _addSessSourceCycleId);
    sessionData = srcCycle ? JSON.parse(JSON.stringify(srcCycle.sessions[_addSessSourceSessType] || {})) : { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  }
  
  if (!cycle.sessions_active) cycle.sessions_active = [];
  if (!cycle.sessions_active.includes(letter)) {
    cycle.sessions_active.push(letter);
    cycle.sessions_active.sort();
  }
  
  cycle.sessions = cycle.sessions || {};
  cycle.sessions[letter] = sessionData;
  
  // Sauvegarder dans la hiérarchie (pas dans clientProgram plat)
  if (typeof saveHierarchy === 'function') {
    await saveHierarchy();
    // Mettre à jour clientProgram à partir de la hiérarchie
    if (typeof syncClientProgram === 'function') {
      syncClientProgram();
    }
  } else {
    // Fallback: sauvegarder normalement
    await saveClientProgram();
  }
  
  rebuildEditorSelects();
  if (cycleId === _addSessCurrentCycleId) {
    _edSelectedSess = letter;
    syncEditor();
  }
  
  toast(`Séance ${letter} ajoutée au cycle ${cycleId} !`, 's');
}

// Legacy functions (stubs for compatibility)
function _showBlankSessView() {}
function _showCopySessView() {}
function _showMainAddSessView() {}
function _selectSessLetter() {}
function _selectTargetLetter() {}
async function _loadCopyCycles() {}
function _loadCopySessions() {}
function _updateCopyButtonState() {}
async function _addBlankSession() {}
async function _addCopySession() {}

// Gestion globale des variables pour le modal +Séance
let _addSessCurrentCycleId = 0;
let _addSessCurrentMacroId = null;
let _addSessCurrentMesoId = null;
let _addSessAvailableLetters = [];
let _addSessTargetCycleId = 0;
let _addSessTargetLetter = '';
let _addSessTargetType = 'blank';
let _addSessSourceClientId = '';
let _addSessSourceCycleId = 0;
let _addSessSourceSessType = '';
let _addSessSourceProgram = [];

let _addSessTargetMacroId = null;
let _addSessTargetMesoId = null;

// Legacy stubs pour compatibilité
function startAddSess(mode) {}
async function loadCopySrcCycles() {}
function loadCopySrcSessions() {}
async function addBlankSession() {}
async function addCopySession() {}
async function _addBlankSession() {}
async function _addCopySession() {}
function _selectSrcSession() {}
function _updateCopyButtonState() {}

// Supprime une séance (appelé depuis visualisation uniquement)
async function deleteSession(cycleId, sessType, macroId, mesoId) {
  if (!confirm('Supprimer la séance '+sessType+' du cycle '+cycleId+' ? Cette action est irréversible.')) return;
  
  // Si macroId et mesoId sont fournis, utiliser la hiérarchie pour trouver le bon micro
  let c;
  if (macroId && mesoId && typeof getMicroById === 'function') {
    c = getMicroById(macroId, mesoId, cycleId);
  } else {
    // Fallback sur l'ancienne méthode
    const dataSource = typeof getVisibleMicros === 'function' ? getVisibleMicros() : clientProgram;
    c = dataSource.find(x => x.id === cycleId);
  }
  
  if (!c) {
    console.error('Cycle non trouvé:', cycleId, 'macro:', macroId, 'meso:', mesoId);
    return;
  }
  
  // Sauvegarder l'ordre des séances avant suppression
  const allSessions = Object.keys(c.sessions || {}).sort();
  
  // Supprimer la séance de sessions et sessions_active
  if (c.sessions && c.sessions[sessType]) {
    delete c.sessions[sessType];
  }
  if (c.sessions_active) {
    c.sessions_active = c.sessions_active.filter(s => s !== sessType);
  }
  
  // Réorganiser les lettres : décaler toutes les séances après celle supprimée
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const newSessions = {};
  const newSessionsActive = [];
  
  // Réassigner les lettres en ordre A, B, C...
  let letterIndex = 0;
  allSessions.forEach((oldKey) => {
    if (oldKey === sessType) return; // Skip la séance supprimée
    const newKey = letters[letterIndex++];
    newSessions[newKey] = c.sessions[oldKey];
    if (c.sessions_active && c.sessions_active.includes(oldKey)) {
      newSessionsActive.push(newKey);
    }
  });
  
  c.sessions = newSessions;
  c.sessions_active = newSessionsActive;
  
  // Synchroniser avec clientProgram si on utilise la hiérarchie
  if (macroId && mesoId && typeof syncClientProgram === 'function') {
    syncClientProgram();
  }
  
  try { 
    await saveClientProgram(); 
    rebuildEditorSelects(); 
    renderVisu(); 
    renderClientGrid(); 
    toast('Séance '+sessType+' supprimée','w'); 
  }
  catch(e) { 
    console.error(e);
    toast('Erreur','e'); 
  }
}

// Legacy stubs
function syncEditorEx() {}
function liveRecap() {}
function saveSessParams() { saveFullSession(); }
async function saveEx() { saveFullSession(); }
async function addEx() { addExEditor(); }
async function dupEx() {
  const i = editorExos.length-1; if(i<0)return;
  const copy = Object.assign({}, editorExos[i], { name:editorExos[i].name+' (copie)' });
  editorExos.push(copy); renderEditorExos();
}
async function delEx() { if(editorExos.length>1){editorExos.pop();renderEditorExos();}else toast('Au moins 1 exercice','w'); }
async function toggleSuperset() { if(editorExos.length>=2){ edAddSuperset(editorExos.length-1); } }

function updateDbFilters() {}
function populateEditorDbFilters() {}
function pickFromDb() {}

// Fonction pour ouvrir le modal +Séance directement à l'étape 3 (sélection client)
function _openAddSessModalAtStep3(currentCycle) {
  const modalHtml = `
    <div id="modal-add-sess" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:420px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border)">
        
        <!-- Vue 3: Copier - Sélection du client -->
        <div id="add-sess-step3-client">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Copier une séance</h3>
            <button onclick="document.getElementById('modal-add-sess').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1rem;font-size:.85rem">Destination: ${_addSessTargetCycleId === 'new' ? 'Nouveau cycle' : (currentCycle.macroId && currentCycle.mesoId ? `MA${currentCycle.macroId} / ME${currentCycle.mesoId} / C${currentCycle.id}` : `C${currentCycle.id}`)} — ${h(currentCycle.focus)}<br>Sélectionnez le client source :</p>
          
          <div id="add-sess-clients-list" style="display:flex;flex-direction:column;gap:.5rem;max-height:300px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:1rem;margin-bottom:1.5rem">
            <!-- Rempli dynamiquement -->
          </div>
          
          <button onclick="document.getElementById('modal-add-sess').remove()" class="btn btn-ghost" style="width:100%;padding:1rem">Annuler</button>
        </div>
        
        <!-- Vue 4: Copier - Sélection du cycle et séance -->
        <div id="add-sess-step4-session" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_addSessBackToStep3()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Choisir la séance</h3>
          </div>
          
          <div style="margin-bottom:1rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Cycle</label>
            <select id="add-sess-src-cycle" class="inp" style="margin-bottom:1rem" onchange="_addSessLoadSessions(this.value)">
              <option value="">-- Choisir un cycle --</option>
            </select>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Séance à copier</label>
            <div id="add-sess-src-sessions" style="display:flex;gap:.5rem;flex-wrap:wrap;min-height:50px;padding:.5rem;background:var(--surface);border-radius:.75rem;margin-bottom:1rem">
              <p style="font-size:.75rem;color:var(--muted);font-style:italic;width:100%;text-align:center">Sélectionnez un cycle</p>
            </div>
          </div>
          
          <button id="btn-validate-sess-selection" onclick="_addSessValidateSessionSelection()" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem;opacity:0.5" disabled>Valider la séance</button>
          <button onclick="_addSessBackToStep3()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
        <!-- Vue 5: Lettre et confirmation -->
        <div id="add-sess-step5-confirm" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_addSessBackFromConfirm()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Confirmer</h3>
          </div>
          
          <div style="background:var(--surface);padding:1rem;border-radius:1rem;margin-bottom:1.5rem">
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:.25rem">Récapitulatif</div>
            <div id="add-sess-summary" style="font-size:.9rem"></div>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Lettre de la séance</label>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap" id="add-sess-letters-container">
              <!-- Rempli dynamiquement -->
            </div>
          </div>
          
          <button onclick="_addSessFinalize()" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem" id="btn-finalize-add-sess">Créer la séance</button>
          <button onclick="_addSessBackFromConfirm()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-add-sess');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Charger la liste des clients
  _addSessLoadClientsList();
}

// Exports
window.deleteSession = deleteSession;
