// COACH-BASEPROGRAMS-EDITOR.JS - Copie exacte de coach-editor.js adaptée pour les programmes de base

function bpRebuildEditorSelects() {
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  
  // Reconstruire les sélecteurs hiérarchiques (macro/meso/micro)
  if (typeof bpRenderHierarchySelectors === 'function') {
    bpRenderHierarchySelectors();
  }
  
  // Puis le sélecteur de séances
  const currentCycle = _bpSelectedCycle || (allMicros[0]?.id);
  _bpSelectedCycle = currentCycle;
  
  bpRebuildEditorSessSelect(currentCycle);
  bpRebuildCopyGrid();
}

function bpRebuildEditorCycleSelect() {
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const container = document.getElementById('bp-ed-cycle-btns');
  if (!container) return;
  
  if (!allMicros.length) {
    container.innerHTML = '<span style="color:var(--muted);font-size:.75rem">Aucun cycle</span>';
    return;
  }
  
  const currentCycleId = _bpSelectedCycle || allMicros[0]?.id;
  
  container.innerHTML = allMicros.filter(m => !m.archived).map(m => {
    const isSel = m.id === currentCycleId;
    return `<button onclick="bpSetEdCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .75rem;font-size:.75rem;${isSel?'border-color:var(--gold);background:rgba(240,165,0,.15);color:var(--gold)':''}">C${m.id}</button>`;
  }).join('');
}

function bpSetEdCycle(cycleId) {
  _bpSelectedCycle = cycleId;
  
  // Mettre à jour la hiérarchie avec le contexte du cycle sélectionné
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const selectedMicro = allMicros.find(x => x.id === cycleId);
  if (selectedMicro && selectedMicro.macroId && selectedMicro.mesoId) {
    window._bpHierarchy.currentMacro = selectedMicro.macroId;
    window._bpHierarchy.currentMeso = selectedMicro.mesoId;
    window._bpHierarchy.currentMicro = cycleId;
  }
  
  bpRebuildEditorSelects();
  bpSyncEditor();
}

function bpRebuildEditorSessSelect(cycleId) {
  // Utiliser le contexte hiérarchique pour trouver le bon cycle
  let c = null;
  const currentMacroId = window._bpHierarchy?.currentMacro;
  const currentMesoId = window._bpHierarchy?.currentMeso;
  
  if (currentMacroId && currentMesoId && cycleId && typeof bpGetMicroById === 'function') {
    c = bpGetMicroById(currentMacroId, currentMesoId, cycleId);
  }
  
  // Fallback: filtrer allMicros par contexte hiérarchique si disponible
  if (!c) {
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    if (currentMacroId && currentMesoId) {
      // Filtrer par macro/meso pour trouver le bon cycle
      c = allMicros.find(x => x.id === cycleId && x.macroId === currentMacroId && x.mesoId === currentMesoId);
    } else {
      c = allMicros.find(x => x.id === cycleId);
    }
  }
  
  const btns = document.getElementById('bp-ed-sess-btns');
  if (!btns) return;
  
  // Utiliser TOUTES les sessions (actives ET inactives)
  const allSessions = c ? (typeof bpGetAllSessions === 'function' ? bpGetAllSessions(c) : (c.sessions_active || [])) : [];
  const currentSess = _bpSelectedSess || (allSessions[0] || 'A');
  _bpSelectedSess = currentSess;
  
  btns.innerHTML = allSessions.map(s => {
    const isSel = s === currentSess;
    const col = bpGetSessColor(s);
    return `<button onclick="bpSetEdSess('${s}')" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .75rem;font-size:.75rem;${isSel?`border-color:${col};background:${col}20;color:${col}`:''}">${s}</button>`;
  }).join('');
}

function bpSetEdSess(sess) {
  _bpSelectedSess = sess;
  bpRebuildEditorSessSelect(_bpSelectedCycle);
  bpSyncEditor();
}

function bpGetEdCycleId() {
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  return _bpSelectedCycle || (allMicros[0]?.id);
}

function bpGetEdSess() {
  return _bpSelectedSess || 'A';
}

function bpRebuildCopyGrid() {
  const cg = document.getElementById('bp-copy-grid');
  if (!cg) return;
  
  const currentCycleId = bpGetEdCycleId();
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  
  cg.innerHTML = allMicros.filter(c => c.id !== currentCycleId && !c.archived).map(c =>
    `<div class="copy-cycle-item" data-cycle-id="${c.id}" onclick="bpToggleCopyCycle(this)" style="display:flex;align-items:center;justify-content:center;padding:.4rem .75rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s;user-select:none">C${c.id} – ${bpH(c.focus?.substring(0,12) || '')}</div>`
  ).join('');
}

function bpToggleCopyCycle(el) {
  el.classList.toggle('copy-sel');
  const isSelected = el.classList.contains('copy-sel');
  el.style.borderColor = isSelected ? 'rgba(240,165,0,.5)' : 'var(--border)';
  el.style.color = isSelected ? 'var(--gold)' : 'var(--muted)';
  el.style.background = isSelected ? 'rgba(240,165,0,.1)' : 'var(--surface)';
  el.dataset.selected = isSelected ? '1' : '0';
}

function bpSyncEditor() {
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  if (!allMicros.length) return;
  
  const cId = bpGetEdCycleId();
  
  // Initialize hierarchy context if not set
  const selectedMicro = allMicros.find(x => x.id === cId);
  if (selectedMicro && selectedMicro.macroId && selectedMicro.mesoId) {
    if (!window._bpHierarchy.currentMacro || !window._bpHierarchy.currentMeso || window._bpHierarchy.currentMicro !== cId) {
      window._bpHierarchy.currentMacro = selectedMicro.macroId;
      window._bpHierarchy.currentMeso = selectedMicro.mesoId;
      window._bpHierarchy.currentMicro = cId;
    }
  }
  
  bpRebuildEditorSessSelect(cId);
  bpRebuildCopyGrid();
  
  const sess = bpGetEdSess();
  const c = allMicros.find(x => x.id === cId);
  if (!c) return;
  
  const sp = bpGetSessParams(c, sess);
  
  const restEl = document.getElementById('bp-ed-rest');
  const toursEl = document.getElementById('bp-ed-tours');
  const commentEl = document.getElementById('bp-ed-sess-comment');
  
  if (restEl) restEl.value = sp.rest || '45s';
  if (toursEl) toursEl.value = sp.tours || '3';
  if (commentEl) commentEl.value = sp.comment || '';
  
  bpSetSessMode(sp.mode || 'circuit', false);
  
  _bpEditorExos = JSON.parse(JSON.stringify(bpGetSessEx(c, sess)));
  _bpEdDropdownState = {};
  
  bpRenderEditorExos();
}

function bpSetSessMode(mode, save = false) {
  _bpSessMode = mode;
  const isCircuit = mode === 'circuit';
  
  const cbtn = document.getElementById('bp-mode-circuit-btn');
  const kbtn = document.getElementById('bp-mode-classic-btn');
  const gp = document.getElementById('bp-ed-circuit-global');
  
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
  if (gp) gp.style.display = isCircuit ? 'flex' : 'none';
  
  bpRenderEditorExos();
}

function bpRenderEditorExos() {
  const el = document.getElementById('bp-ed-exos-list');
  if (!el) return;
  
  const isCircuit = _bpSessMode === 'circuit';
  const sess = bpGetEdSess();
  const col = bpGetSessColor(sess);
  
  if (!_bpEditorExos || !_bpEditorExos.length) {
    el.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--muted);font-style:italic;border:1px dashed var(--border);border-radius:1rem">Aucun exercice. Cliquez "+ Ajouter un exercice".</div>`;
    return;
  }
  
  let html = '';
  if (isCircuit) {
    _bpEditorExos.forEach((e, i) => { html += bpSingleExEditorCard(e, i, col, true); });
  } else {
    const groups = bpGroupExercises(_bpEditorExos);
    groups.forEach(g => {
      if (g.type === 'superset') {
        html += bpSupersetEditorCard(g.items, g.startIdx, col);
      } else {
        html += bpSingleExEditorCard(g.ex, g.idx, col, false);
      }
    });
  }
  el.innerHTML = html;
  
  // Update autocomplete datalist
  let dl = document.getElementById('db-exnames-list');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'db-exnames-list';
    document.body.appendChild(dl);
  }
  if (typeof exerciseDb !== 'undefined') {
    dl.innerHTML = exerciseDb.map(e => `<option value="${bpH(e.name||'')}"></option>`).join('');
  }
}

function bpFillExFromDb(idx, name) {
  if (typeof exerciseDb === 'undefined') return;
  const dbEx = exerciseDb.find(e => e.name && e.name.toLowerCase() === name.toLowerCase());
  if (!dbEx) return;
  const ex = _bpEditorExos[idx];
  if (!ex) return;
  if (!ex.photo && dbEx.photo) ex.photo = dbEx.photo;
  if (!ex.video && dbEx.video) ex.video = dbEx.video;
  if (!ex.desc && dbEx.desc) ex.desc = dbEx.desc;
}

function bpDbSelectorsHTML(idx, prefix) {
  const state = (_bpEdDropdownState || {})[idx] || {};
  if (typeof exerciseDb === 'undefined') return '';
  
  const zones = [...new Set(exerciseDb.map(e => e.zone).filter(Boolean))].sort();
  const selZone = state.zone || '';
  const selPattern = state.pattern || '';
  const selExId = state.exId || '';
  
  const patterns = [...new Set(exerciseDb.filter(e => !selZone || e.zone === selZone).map(e => e.pattern).filter(Boolean))].sort();
  const filteredEx = exerciseDb.filter(e => (!selZone || e.zone === selZone) && (!selPattern || e.pattern === selPattern));
  
  const zOpts = '<option value="">Zone...</option>' + zones.map(z => `<option value="${z}"${z === selZone ? ' selected' : ''}>${bpH(z)}</option>`).join('');
  const pOpts = '<option value="">Pattern...</option>' + patterns.map(p => `<option value="${p}"${p === selPattern ? ' selected' : ''}>${bpH(p)}</option>`).join('');
  const eOpts = '<option value="">Exercice...</option>' + filteredEx.map(e => `<option value="${e.id}"${e.id === selExId ? ' selected' : ''}>${bpH(e.name)}</option>`).join('');
  
  return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:.5rem">
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="bpEdUpdateZone(${idx},'${prefix}',this.value)">${zOpts}</select>
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="bpEdUpdatePattern(${idx},'${prefix}',this.value)">${pOpts}</select>
    <select class="inp" style="font-size:.75rem;padding:.4rem" onchange="bpEdPickEx(${idx},'${prefix}',this.value)">${eOpts}</select>
  </div>`;
}

function bpSingleExEditorCard(e, i, col, isCircuit) {
  const num = i + 1;
  return `<div style="background:var(--card);border:1px solid var(--border);border-radius:1.25rem;overflow:hidden" id="bp-ex-card-${i}">
    <div style="background:${col}22;border-bottom:1px solid ${col}33;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem">
      <span style="width:2rem;height:2rem;background:${col};color:#fff;border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;flex-shrink:0">${num}</span>
      <span class="ex-title-span" style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;font-style:italic;flex:1;color:${e.name?'var(--text)':'var(--muted)'}">${bpH(e.name||'Nouvel exercice')}</span>
      <div style="display:flex;gap:.4rem;flex-shrink:0">
        <button onclick="bpEdMoveUp(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button>
        <button onclick="bpEdMoveDown(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button>
        ${!isCircuit?`<button onclick="bpEdAddSuperset(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:var(--gold);border-color:rgba(240,165,0,.3)">⇄ SS</button>`:''}
        <button onclick="bpEdShowCopyParams(${i})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;font-size:.6rem">📋</button>
        <button onclick="bpEdRemoveEx(${i})" class="btn btn-danger btn-sm" style="padding:.25rem .5rem">🗑</button>
      </div>
    </div>
    <div style="padding:1rem;display:flex;flex-direction:column;gap:.75rem">
      ${bpDbSelectorsHTML(i,'s')}
      <input type="text" list="db-exnames-list" class="inp" value="${bpH(e.name||'')}" placeholder="Nom exercice" oninput="_bpEditorExos[${i}].name=this.value;this.closest('[id^=bp-ex-card-]').querySelector('.ex-title-span').textContent=this.value||'Nouvel exercice';bpFillExFromDb(${i},this.value)" style="font-size:.85rem">
      <div style="display:flex;gap:.5rem;align-items:center">
        <span style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Type :</span>
        <button onclick="_bpEditorExos[${i}].exType='musculaire';bpRenderEditorExos()" style="padding:.25rem .6rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;border:1px solid ${(e.exType||'musculaire')==='musculaire'?'rgba(240,165,0,.5)':'var(--border)'};background:${(e.exType||'musculaire')==='musculaire'?'rgba(240,165,0,.15)':'var(--surface)'};color:${(e.exType||'musculaire')==='musculaire'?'var(--gold)':'var(--muted)'}">💪 Musculaire</button>
        <button onclick="_bpEditorExos[${i}].exType='energetique';bpRenderEditorExos()" style="padding:.25rem .6rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;border:1px solid ${e.exType==='energetique'?'rgba(59,130,246,.5)':'var(--border)'};background:${e.exType==='energetique'?'rgba(59,130,246,.15)':'var(--surface)'};color:${e.exType==='energetique'?'#60a5fa':'var(--muted)'}">⚡ Énergétique</button>
      </div>
      ${isCircuit ? bpCircuitExFields(e,i) : (e.exType === 'energetique' ? bpEnergeticExFields(e,i) : bpClassicExFields(e,i))}
      <input type="text" class="inp" value="${bpH(e.comment||'')}" placeholder="Commentaire sur cet exercice..." oninput="_bpEditorExos[${i}].comment=this.value" style="font-size:.8rem">
    </div>
  </div>`;
}

function bpSupersetEditorCard(items, startIdx, col) {
  const num = startIdx + 1;
  // Get common sets value from first item (or empty if different)
  const firstEx = items[0]?.ex;
  const commonSets = firstEx?.sets || '';
  // Rest after superset - stored in first exercise
  const restAfterSuperset = firstEx?.restEx || '';
  
  const itemsHTML = items.map((item, j) => {
    const e = item.ex;
    const i = item.idx;
    const letter = String.fromCharCode(65 + j);
    return `<div style="padding:1rem;${j<items.length-1?'border-right:1px solid rgba(240,165,0,.2);':''}display:flex;flex-direction:column;gap:.6rem">
      <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.25rem">
        <span style="width:1.75rem;height:1.75rem;background:${j===0?'var(--gold)':'rgba(240,165,0,.3)'};color:${j===0?'#1a0900':'var(--gold)'};${j===0?'':'border:1px solid rgba(240,165,0,.5);'}border-radius:.5rem;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;flex-shrink:0">${num}${letter}</span>
        <span class="ex-title-span-${i}" style="font-family:'Barlow Condensed',sans-serif;font-size:.85rem;font-weight:900;font-style:italic;color:${e.name?'var(--text)':'var(--muted)'}">${bpH(e.name||'Exercice '+letter)}</span>
      </div>
      ${bpDbSelectorsHTML(i,'ss')}
      <input type="text" class="inp" value="${bpH(e.name||'')}" placeholder="Nom exercice ${letter}" oninput="_bpEditorExos[${i}].name=this.value;document.querySelectorAll('.ex-title-span-${i}').forEach(s=>s.textContent=this.value||'Exercice ${letter}')" style="font-size:.8rem">
      ${bpSupersetExFields(e,i)}
      <input type="text" class="inp" value="${bpH(e.comment||'')}" placeholder="Commentaire ${letter}..." oninput="_bpEditorExos[${i}].comment=this.value" style="font-size:.75rem">
    </div>`;
  }).join('');
  
  return `<div style="border:1px solid rgba(240,165,0,.35);border-radius:1.25rem;overflow:hidden;background:rgba(240,165,0,.03)" id="bp-ex-card-${startIdx}">
    <div style="background:rgba(240,165,0,.12);border-bottom:1px solid rgba(240,165,0,.25);padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
      <span style="background:var(--gold);color:#1a0900;padding:.25rem .75rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;font-style:italic;flex-shrink:0">⇄ SUPERSET ${num}</span>
      
      <!-- Global Sets Field -->
      <div style="display:flex;align-items:center;gap:.5rem;margin-right:auto">
        <span style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Séries:</span>
        <input type="number" class="inp" value="${bpH(commonSets)}" placeholder="4" 
               oninput="bpEdUpdateSupersetSets(${startIdx}, ${items.length}, this.value)" 
               style="width:60px;font-size:.8rem;padding:.3rem .5rem">
      </div>
      
      <!-- Rest After Superset -->
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Récup après:</span>
        <input type="text" class="inp" value="${bpH(restAfterSuperset)}" placeholder="120s" 
               oninput="bpEdUpdateSupersetRest(${startIdx}, ${items.length}, this.value)" 
               style="width:70px;font-size:.8rem;padding:.3rem .5rem">
      </div>
      
      <div style="display:flex;gap:.4rem;flex-shrink:0;flex-wrap:wrap;margin-left:auto">
        <button onclick="bpEdMoveUp(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↑</button>
        <button onclick="bpEdMoveDown(${startIdx+items.length-1})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem">↓</button>
        <button onclick="bpEdAddToSuperset(${startIdx},${items.length})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:var(--green);border-color:rgba(16,185,129,.3)">+ Ajouter</button>
        <button onclick="bpEdBreakSuperset(${startIdx})" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;color:#f87171;border-color:rgba(248,113,113,.3)">Casser SS</button>
        ${items.map((item,j) => `<button onclick="bpEdRemoveEx(${item.idx})" class="btn btn-danger btn-sm" style="padding:.25rem .5rem">🗑 ${String.fromCharCode(65+j)}</button>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:${items.map(()=>'1fr').join(' ')};gap:0">${itemsHTML}</div>
  </div>`;
}

function bpSupersetExFields(e, i) {
  return `<div style="display:flex;flex-direction:column;gap:.5rem">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${bpH(e.reps||'')}" placeholder="10-12" oninput="_bpEditorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${bpH(e.tst||'')}" placeholder="2-0-2" oninput="_bpEditorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries (indiv.)</label><input type="number" class="inp" value="${bpH(e.sets||'')}" placeholder="4" oninput="_bpEditorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
      <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${bpH(e.rpeTarget||'')}" placeholder="7-8" oninput="_bpEditorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>
    </div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup série</label><input type="text" class="inp" value="${bpH(e.restSet||'')}" placeholder="90s" oninput="_bpEditorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
  </div>`;
}

// Update sets for all exercises in superset
function bpEdUpdateSupersetSets(startIdx, groupLength, value) {
  for (let i = 0; i < groupLength; i++) {
    if (_bpEditorExos[startIdx + i]) {
      _bpEditorExos[startIdx + i].sets = value;
    }
  }
}

// Update rest after superset (stored in first exercise)
function bpEdUpdateSupersetRest(startIdx, groupLength, value) {
  if (_bpEditorExos[startIdx]) {
    _bpEditorExos[startIdx].restEx = value;
  }
}

function bpCircuitExFields(e, i) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Répétitions</label><input type="text" class="inp" value="${bpH(e.reps||'')}" placeholder="10-12" oninput="_bpEditorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${bpH(e.tst||'')}" placeholder="20s" oninput="_bpEditorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
  </div>`;
}

function bpClassicExFields(e, i, compact = false) {
  const grid = compact ? 'grid-template-columns:1fr 1fr' : 'grid-template-columns:repeat(5,1fr)';
  return `<div style="display:grid;${grid};gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${bpH(e.reps||'')}" placeholder="10-12" oninput="_bpEditorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Tempo</label><input type="text" class="inp" value="${bpH(e.tst||'')}" placeholder="2-0-2" oninput="_bpEditorExos[${i}].tst=this.value" style="font-size:.8rem"></div>
    ${!compact?`<div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries</label><input type="number" class="inp" value="${bpH(e.sets||'')}" placeholder="4" oninput="_bpEditorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup série</label><input type="text" class="inp" value="${bpH(e.restSet||'')}" placeholder="90s" oninput="_bpEditorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${bpH(e.rpeTarget||'')}" placeholder="7-8" oninput="_bpEditorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>`:''}
  </div>
  ${!compact?`<div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup après cet exercice</label><input type="text" class="inp" value="${bpH(e.restEx||'')}" placeholder="120s" oninput="_bpEditorExos[${i}].restEx=this.value" style="font-size:.8rem"></div>`:''}`;
}

function bpEnergeticExFields(e, i) {
  return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem">
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Temps effort</label><input type="text" class="inp" value="${bpH(e.workTime||'')}" placeholder="20s" oninput="_bpEditorExos[${i}].workTime=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Temps récup</label><input type="text" class="inp" value="${bpH(e.restTime||'')}" placeholder="10s" oninput="_bpEditorExos[${i}].restTime=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Reps</label><input type="text" class="inp" value="${bpH(e.reps||'')}" placeholder="10" oninput="_bpEditorExos[${i}].reps=this.value" style="font-size:.8rem"></div>
    <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Séries</label><input type="number" class="inp" value="${bpH(e.sets||'')}" placeholder="4" oninput="_bpEditorExos[${i}].sets=this.value" style="font-size:.8rem"></div>
  </div>
  <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">Récup entre séries</label><input type="text" class="inp" value="${bpH(e.restSet||'')}" placeholder="60s" oninput="_bpEditorExos[${i}].restSet=this.value" style="font-size:.8rem"></div>
  <div><label style="display:block;font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.3rem">RPE cible</label><input type="text" class="inp" value="${bpH(e.rpeTarget||'')}" placeholder="7-8" oninput="_bpEditorExos[${i}].rpeTarget=this.value" style="font-size:.8rem"></div>`;
}

function bpEdUpdateZone(idx, prefix, zone) {
  if (!_bpEdDropdownState) _bpEdDropdownState = {};
  if (!_bpEdDropdownState[idx]) _bpEdDropdownState[idx] = {};
  _bpEdDropdownState[idx].zone = zone;
  _bpEdDropdownState[idx].pattern = '';
  _bpEdDropdownState[idx].exId = '';
  bpRenderEditorExos();
}

function bpEdUpdatePattern(idx, prefix, pattern) {
  if (!_bpEdDropdownState) _bpEdDropdownState = {};
  if (!_bpEdDropdownState[idx]) _bpEdDropdownState[idx] = {};
  _bpEdDropdownState[idx].pattern = pattern;
  _bpEdDropdownState[idx].exId = '';
  bpRenderEditorExos();
}

function bpEdPickEx(idx, prefix, exId) {
  if (!exId || typeof exerciseDb === 'undefined') return;
  const ex = exerciseDb.find(e => e.id === exId);
  if (!ex || !_bpEditorExos[idx]) return;
  
  if (!_bpEdDropdownState) _bpEdDropdownState = {};
  if (!_bpEdDropdownState[idx]) _bpEdDropdownState[idx] = {};
  _bpEdDropdownState[idx].exId = exId;
  
  _bpEditorExos[idx].name = ex.name;
  _bpEditorExos[idx].desc = ex.desc || '';
  _bpEditorExos[idx].video = ex.video || '';
  _bpEditorExos[idx].photo = ex.photo || '';
  
  bpRenderEditorExos();
  toast(ex.name + ' chargé', 'i');
}

function bpEdMoveUp(i) {
  if (i <= 0) return;
  [_bpEditorExos[i-1], _bpEditorExos[i]] = [_bpEditorExos[i], _bpEditorExos[i-1]];
  _bpEdDropdownState = {};
  bpRenderEditorExos();
}

function bpEdMoveDown(i) {
  if (i >= _bpEditorExos.length - 1) return;
  [_bpEditorExos[i], _bpEditorExos[i+1]] = [_bpEditorExos[i+1], _bpEditorExos[i]];
  _bpEdDropdownState = {};
  bpRenderEditorExos();
}

function bpEdRemoveEx(i) { 
  if(_bpEditorExos.length<=1){toast('Au moins 1 exercice requis','w');return;} 
  
  // Vérifier si l'exercice supprimé avait superset=true (pointait vers un suivant)
  const removedHadSuperset = _bpEditorExos[i].superset === true;
  
  // Si l'exercice précédent pointait vers celui-ci
  const prevHadSuperset = (i > 0 && _bpEditorExos[i-1].superset === true);
  
  // Sauvegarder l'état du suivant avant suppression
  const nextHadSuperset = (i < _bpEditorExos.length - 1) && (_bpEditorExos[i+1].superset === true);
  
  // Supprimer l'exercice
  _bpEditorExos.splice(i,1); 
  
  // Gérer la cohérence du superset après suppression
  if (prevHadSuperset) {
    // L'exercice précédent pointait vers l'exercice supprimé
    if (removedHadSuperset && i < _bpEditorExos.length) {
      // L'exercice supprimé pointait aussi vers un suivant
      // On ne redonne superset=true au suivant que si le suivant était aussi un maillon intermédiaire
      if (nextHadSuperset) {
        _bpEditorExos[i].superset = true;
      }
      // Sinon, le suivant était le dernier du superset (superset=false)
      // On ne change rien, il reste le dernier
    } else {
      // L'exercice supprimé n'avait pas superset=true (c'était le dernier du superset)
      // Donc on a: prev -> removed (dernier)
      // Après suppression: prev devient le dernier, il ne doit plus avoir superset=true
      _bpEditorExos[i-1].superset = false;
    }
  }
  
  _bpEdDropdownState={}; 
  bpRenderEditorExos(); 
}

function bpEdAddSuperset(i) {
  _bpEditorExos[i].superset = true;
  // Insère un exercice vide après i (ne prend pas l'exercice suivant)
  _bpEditorExos.splice(i+1, 0, { name:'', desc:'', video:'', photo:'', reps:'', tst:'', sets:'', restSet:'', restEx:'', rpeTarget:'', comment:'', superset:false, exType:'musculaire' });
  _bpEdDropdownState = {}; bpRenderEditorExos(); toast('Superset créé','i');
}

function bpEdAddToSuperset(startIdx, groupLength) {
  const lastIdx = startIdx + groupLength - 1;
  _bpEditorExos[lastIdx].superset = true;
  _bpEditorExos.splice(lastIdx+1, 0, { name:'', desc:'', video:'', photo:'', reps:'', tst:'', sets:'', restSet:'', restEx:'', rpeTarget:'', comment:'', superset:false, exType:'musculaire' });
  _bpEdDropdownState = {}; bpRenderEditorExos(); toast('Exercice ajouté au superset','i');
}

function bpEdBreakSuperset(startIdx) {
  if (_bpEditorExos[startIdx]) _bpEditorExos[startIdx].superset = false;
  _bpEdDropdownState = {}; bpRenderEditorExos(); toast('Superset cassé','i');
}

function bpEdShowCopyParams(fromIdx) {
  _bpCopyParamsFrom = fromIdx;
  const list = document.getElementById('bp-copy-params-list');
  if (!list) {
    // Create modal if doesn't exist
    const modal = document.createElement('div');
    modal.id = 'modal-bp-copy-params';
    modal.className = 'modal-bg';
    modal.innerHTML = `<div class="card" style="padding:2rem;max-width:380px;width:100%"><h3 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">Copier les paramètres vers :</h3><div id="bp-copy-params-list"></div><button onclick="document.getElementById('modal-bp-copy-params').classList.add('hidden')" style="width:100%;background:none;border:none;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;font-size:.75rem;text-transform:uppercase;cursor:pointer;padding:.75rem;margin-top:1rem">Annuler</button></div>`;
    document.body.appendChild(modal);
  }
  
  const listEl = document.getElementById('bp-copy-params-list');
  listEl.innerHTML = _bpEditorExos.map((e,i) => i !== fromIdx
    ? `<button onclick="bpEdDoCopyParams(${i});document.getElementById('modal-bp-copy-params').classList.add('hidden')" class="btn btn-ghost" style="width:100%;text-align:left;margin-bottom:.5rem;font-size:.8rem">Exo ${i+1}: ${bpH(e.name||'Sans nom')}</button>`
    : '').join('');
  
  document.getElementById('modal-bp-copy-params').classList.remove('hidden');
}

function bpEdDoCopyParams(toIdx) {
  if (_bpCopyParamsFrom === -1) return;
  const from = _bpEditorExos[_bpCopyParamsFrom];
  const to = _bpEditorExos[toIdx];
  to.reps = from.reps;
  to.tst = from.tst;
  to.sets = from.sets;
  to.restSet = from.restSet;
  to.restEx = from.restEx;
  to.rpeTarget = from.rpeTarget;
  bpRenderEditorExos();
  toast('Paramètres copiés', 's');
}

function bpAddExEditor() {
  _bpEditorExos.push({ name:'', desc:'', video:'', photo:'', reps:'', tst:'', sets:'', restSet:'', restEx:'', rpeTarget:'', comment:'', superset:false, exType:'musculaire' });
  bpRenderEditorExos();
  setTimeout(() => {
    const el = document.getElementById('bp-ed-exos-list');
    if (el) el.lastElementChild?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }, 100);
}

async function bpSaveFullSession() {
  const cId = bpGetEdCycleId();
  const sess = bpGetEdSess();
  
  const restEl = document.getElementById('bp-ed-rest');
  const toursEl = document.getElementById('bp-ed-tours');
  const commentEl = document.getElementById('bp-ed-sess-comment');
  
  const rest = restEl?.value.trim() || '45s';
  const tours = toursEl?.value.trim() || '3';
  const comment = commentEl?.value.trim() || '';
  
  const sessionData = { rest, tours, mode: _bpSessMode, comment, exercises: JSON.parse(JSON.stringify(_bpEditorExos)) };
  
  // Use hierarchy if available
  if (typeof bpGetMicroById === 'function' && window._bpHierarchy) {
    const { currentMacro, currentMeso, currentMicro } = window._bpHierarchy;
    if (currentMacro && currentMeso && currentMicro) {
      const micro = bpGetMicroById(currentMacro, currentMeso, currentMicro);
      if (micro) {
        micro.sessions = micro.sessions || {};
        micro.sessions[sess] = sessionData;
        if (!micro.sessions_active) micro.sessions_active = [];
        if (!micro.sessions_active.includes(sess)) {
          micro.sessions_active.push(sess);
          micro.sessions_active.sort();
        }
        await bpSaveHierarchy();
        toast('Séance sauvegardée !', 's');
        return;
      }
    }
  }
  
  // Fallback to cycles array
  const idx = (_bpProgramData.cycles || []).findIndex(c => c.id === cId);
  if (idx === -1) return;
  
  _bpProgramData.cycles[idx].sessions = _bpProgramData.cycles[idx].sessions || {};
  _bpProgramData.cycles[idx].sessions[sess] = sessionData;
  if (!_bpProgramData.cycles[idx].sessions_active) _bpProgramData.cycles[idx].sessions_active = [];
  if (!_bpProgramData.cycles[idx].sessions_active.includes(sess)) {
    _bpProgramData.cycles[idx].sessions_active.push(sess);
  }
  
  try {
    await saveBaseProgramData();
    toast('Séance sauvegardée !', 's');
  } catch(e) {
    toast('Erreur sauvegarde', 'e');
  }
}

async function bpDupCycle() {
  const cId = bpGetEdCycleId();
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const cidx = allMicros.findIndex(c => c.id === cId);
  if (cidx === -1) return;
  
  const newId = Math.max(...allMicros.map(c => c.id)) + 1;
  const original = allMicros[cidx];
  
  const clone = {
    id: newId,
    focus: original.focus + ' (copie)',
    sessions: original.sessions ? JSON.parse(JSON.stringify(original.sessions)) : {},
    sessions_active: original.sessions_active ? [...original.sessions_active] : [],
    archived: false
  };
  
  if (!allMicros[cidx].macroId) {
    // Flat structure
    _bpProgramData.cycles.push(clone);
  } else {
    // Hierarchy structure
    const macro = bpGetMacroById(original.macroId);
    const meso = macro?.mesos?.find(m => m.id === original.mesoId);
    if (meso) {
      meso.micros.push({
        id: newId,
        focus: clone.focus,
        sessions: clone.sessions,
        sessions_active: clone.sessions_active,
        archived: false
      });
    }
  }
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRebuildEditorSelects();
    toast('Cycle dupliqué !', 's');
  } catch(e) {
    toast('Erreur', 'e');
  }
}

async function bpDupSession() {
  const cId = bpGetEdCycleId();
  const sess = bpGetEdSess();
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const cidx = allMicros.findIndex(c => c.id === cId);
  if (cidx === -1) return;
  
  const currentCycle = allMicros[cidx];
  const otherCycles = allMicros.filter((c, i) => i !== cidx);
  const hasAvailableSlot = ['A', 'B', 'C', 'D'].some(l => !currentCycle.sessions_active?.includes(l));
  
  const modalHtml = `
    <div id="modal-bp-dup-session" class="modal-bg">
      <div class="card" style="padding:2.5rem;max-width:520px;width:100%;max-height:90vh;overflow-y:auto">
        <h3 style="font-size:1.75rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">Dupliquer ${sess}</h3>
        <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
          ${hasAvailableSlot ? `
            <button onclick="bpDupSessionSameCycle()" class="btn btn-gold" style="padding:1.1rem">Dans ce cycle</button>
          ` : ''}
          ${otherCycles.length > 0 ? `
            <button onclick="bpDupSessionOtherCycle()" class="btn btn-ghost" style="padding:1.1rem">Dans un autre cycle</button>
          ` : ''}
          <button onclick="bpDupSessionNewCycle()" class="btn btn-ghost" style="padding:1.1rem;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25);color:var(--green)">Nouveau cycle</button>
        </div>
        <button onclick="document.getElementById('modal-bp-dup-session').remove()" class="btn btn-ghost" style="width:100%">Annuler</button>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-bp-dup-session');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function bpDupSessionSameCycle() {
  document.getElementById('modal-bp-dup-session')?.remove();
  
  const cId = bpGetEdCycleId();
  const sess = bpGetEdSess();
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const c = allMicros.find(x => x.id === cId);
  if (!c) return;
  
  const availableLetters = ['A', 'B', 'C', 'D'].filter(l => !c.sessions_active?.includes(l));
  if (availableLetters.length === 0) {
    toast('Ce cycle a déjà toutes les séances (A-D)', 'w');
    return;
  }
  
  const newSess = availableLetters[0];
  if (!c.sessions_active) c.sessions_active = [];
  c.sessions_active.push(newSess);
  c.sessions_active.sort();
  c.sessions = c.sessions || {};
  c.sessions[newSess] = JSON.parse(JSON.stringify(c.sessions[sess] || {}));
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRebuildEditorSelects();
    _bpSelectedSess = newSess;
    bpSyncEditor();
    toast('Séance dupliquée dans ce cycle (' + newSess + ') !', 's');
  } catch(e) {
    toast('Erreur', 'e');
  }
}

// Helper functions
function bpGetActiveSessions(cycle) {
  if (cycle.sessions_active && cycle.sessions_active.length) return cycle.sessions_active;
  return Object.keys(cycle.sessions || {}).filter(k => cycle.sessions[k] && (cycle.sessions[k].exercises?.length > 0 || cycle.sessions[k].comment));
}

function bpGetSessColor(s) {
  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6' };
  return colors[s] || '#4a6080';
}

function bpGetSessParams(c, sess) {
  const s = c.sessions?.[sess];
  if (!s || Array.isArray(s)) return { rest: '45s', tours: '3', mode: 'circuit', comment: '' };
  return { rest: s.rest || '45s', tours: s.tours || '3', mode: s.mode || 'circuit', comment: s.comment || '' };
}

function bpGetSessEx(c, sess) {
  const s = c.sessions?.[sess];
  if (!s || Array.isArray(s)) return [];
  return s.exercises || [];
}

function bpGroupExercises(exos) {
  const groups = [];
  let i = 0;
  while (i < exos.length) {
    if (exos[i].superset) {
      const supersetItems = [{ex: exos[i], idx: i}];
      let j = i + 1;
      while (j < exos.length && exos[j].superset) {
        supersetItems.push({ex: exos[j], idx: j});
        j++;
      }
      // Also include the last element (which has superset=false)
      if (j < exos.length) {
        supersetItems.push({ex: exos[j], idx: j});
        j++;
      }
      groups.push({type: 'superset', items: supersetItems, startIdx: i});
      i = j;
    } else {
      groups.push({type: 'single', ex: exos[i], idx: i});
      i++;
    }
  }
  return groups;
}

function bpH(str) {
  if (!str) return '';
  return str.replace(/[<>&"']/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
}

// Exports
window.bpRebuildEditorSelects = bpRebuildEditorSelects;
window.bpSyncEditor = bpSyncEditor;
window.bpSetEdSess = bpSetEdSess;
window.bpSetEdCycle = bpSetEdCycle;
window.bpSetSessMode = bpSetSessMode;
window.bpRenderEditorExos = bpRenderEditorExos;
window.bpAddExEditor = bpAddExEditor;
window.bpSaveFullSession = bpSaveFullSession;
window.bpDupCycle = bpDupCycle;
window.bpDupSession = bpDupSession;
window.bpDupSessionSameCycle = bpDupSessionSameCycle;
window.bpEdMoveUp = bpEdMoveUp;
window.bpEdMoveDown = bpEdMoveDown;
window.bpEdRemoveEx = bpEdRemoveEx;
window.bpEdAddSuperset = bpEdAddSuperset;
window.bpEdAddToSuperset = bpEdAddToSuperset;
window.bpEdBreakSuperset = bpEdBreakSuperset;
window.bpEdShowCopyParams = bpEdShowCopyParams;
window.bpEdDoCopyParams = bpEdDoCopyParams;
window.bpEdUpdateZone = bpEdUpdateZone;
window.bpEdUpdatePattern = bpEdUpdatePattern;
window.bpEdPickEx = bpEdPickEx;
window.bpEdUpdateSupersetSets = bpEdUpdateSupersetSets;
window.bpEdUpdateSupersetRest = bpEdUpdateSupersetRest;
window.bpToggleCopyCycle = bpToggleCopyCycle;

// ── COPIER VERS D'AUTRES CYCLES ───────────────────────
let _bpCopyMode = 'sess';

function bpSetCopyMode(m) {
  _bpCopyMode = m;
  const descs = { sess:'Copie la séance sélectionnée vers les cycles cochés', cyc:'Copie les 4 séances du cycle vers les cycles cochés' };
  ['sess','cyc'].forEach(k => {
    const btn = document.getElementById('bp-cm-'+k); if (!btn) return;
    btn.style.borderColor = k===m?'rgba(240,165,0,.5)':'var(--border)';
    btn.style.background = k===m?'rgba(240,165,0,.15)':'var(--surface)';
    btn.style.color = k===m?'var(--gold)':'var(--muted)';
  });
  const desc = document.getElementById('bp-copy-desc'); if (desc) desc.innerText = descs[m]||'';
}

async function bpDoCopy() {
  const cId = bpGetEdCycleId();
  const sess = bpGetEdSess();
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const srcCidx = allMicros.findIndex(c => c.id === cId);
  const sel = Array.from(document.querySelectorAll('#bp-copy-grid .copy-cycle-item[data-selected="1"]')).map(el => parseInt(el.dataset.cycleId));
  if (!sel.length) { toast('Sélectionnez au moins un cycle cible','w'); return; }
  if (srcCidx===-1) return;
  
  if (_bpCopyMode === 'sess') {
    const srcS = JSON.parse(JSON.stringify(allMicros[srcCidx].sessions[sess]));
    sel.forEach(tId => { 
      const ci = allMicros.findIndex(c => c.id===tId); 
      if(ci===-1) return;
      const targetCycle = allMicros[ci];
      if (!targetCycle.sessions) targetCycle.sessions = {};
      const activeList = Array.isArray(targetCycle.sessions_active) ? targetCycle.sessions_active : [];
      const sessionsKeys = Object.keys(targetCycle.sessions || {});
      const existingSessions = [...new Set([...activeList, ...sessionsKeys])];
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let newSess = '';
      for (const l of letters) { if (!existingSessions.includes(l)) { newSess = l; break; }}
      if (!newSess) { toast('Cycle ' + tId + ' plein (A-Z)', 'w'); return; }
      if (!targetCycle.sessions_active) targetCycle.sessions_active = [];
      targetCycle.sessions_active.push(newSess);
      targetCycle.sessions[newSess] = JSON.parse(JSON.stringify(srcS));
    });
  } else {
    const srcCycle = allMicros[srcCidx];
    const srcSessions = JSON.parse(JSON.stringify(srcCycle.sessions));
    const srcSessionsActive = Array.isArray(srcCycle.sessions_active) ? JSON.parse(JSON.stringify(srcCycle.sessions_active)) : Object.keys(srcSessions);
    const srcFocus = srcCycle.focus || '';
    sel.forEach(tId => {
      const ci = allMicros.findIndex(c => c.id===tId);
      if(ci===-1) return;
      allMicros[ci].sessions = JSON.parse(JSON.stringify(srcSessions));
      allMicros[ci].sessions_active = JSON.parse(JSON.stringify(srcSessionsActive));
      allMicros[ci].focus = srcFocus;
    });
  }
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    document.querySelectorAll('#bp-copy-grid .copy-cycle-item.copy-sel').forEach(el => {
      el.classList.remove('copy-sel');
      el.style.borderColor = 'var(--border)'; el.style.color = 'var(--muted)'; el.style.background = 'var(--surface)';
      el.dataset.selected = '0';
    });
    toast('Copie vers '+sel.length+' cycle(s) effectuée !','s');
  } catch(e) { toast('Erreur copie','e'); }
}

// ── AJOUTER UNE SÉANCE ────────────────────────────────
let _bpAddSessCurrentCycleId = 0;
let _bpAddSessCurrentMacroId = null;
let _bpAddSessCurrentMesoId = null;
let _bpAddSessAvailableLetters = [];
let _bpAddSessTargetCycleId = 0;
let _bpAddSessTargetLetter = '';
let _bpAddSessTargetType = 'blank';
let _bpAddSessSourceClientId = '';
let _bpAddSessSourceCycleId = 0;
let _bpAddSessSourceSessType = '';
let _bpAddSessSourceProgram = [];

function bpOpenAddSessModal() {
  const cId = bpGetEdCycleId();
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  
  // Récupérer le contexte hiérarchique du bandeau
  const currentMacroId = window._bpHierarchy?.currentMacro;
  const currentMesoId = window._bpHierarchy?.currentMeso;
  
  // Trouver le cycle avec le contexte hiérarchique
  let c = null;
  if (currentMacroId && currentMesoId) {
    c = allMicros.find(x => x.id === cId && x.macroId === currentMacroId && x.mesoId === currentMesoId);
  }
  // Fallback: premier cycle avec cet ID
  if (!c) {
    c = allMicros.find(x => x.id === cId);
  }
  if (!c) return;
  
  // Utiliser les macro/meso du cycle trouvé (qui a le bon contexte)
  const selectedMacroId = c.macroId;
  const selectedMesoId = c.mesoId;
  
  // Log pour debug
  console.log('[BP AddSess] Opening modal for cycle:', cId, 'macro:', selectedMacroId, 'meso:', selectedMesoId);
  
  const currentCycle = c;
  const otherCycles = allMicros.filter(cp => cp.id !== cId);
  const active = typeof bpGetAllSessions === 'function' ? bpGetAllSessions(c) : (c.sessions_active || []);
  
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let availableLetters = [];
  for (let i = 0; i < alpha.length && availableLetters.length < 8; i++) {
    if (!active.includes(alpha[i])) availableLetters.push(alpha[i]);
  }
  
  _bpAddSessCurrentCycleId = cId;
  _bpAddSessCurrentMacroId = selectedMacroId;
  _bpAddSessCurrentMesoId = selectedMesoId;
  _bpAddSessAvailableLetters = availableLetters;
  _bpAddSessTargetCycleId = cId;
  _bpAddSessTargetLetter = availableLetters[0] || '';
  _bpAddSessTargetType = 'blank';
  _bpAddSessSourceClientId = '';
  _bpAddSessSourceCycleId = 0;
  _bpAddSessSourceSessType = '';
  _bpAddSessSourceProgram = [];
  
  const hierarchyPath = selectedMacroId && selectedMesoId ? 
    `MA${selectedMacroId} / ME${selectedMesoId} / C${currentCycle.id}` : 
    `C${currentCycle.id}`;
  
  const modalHtml = `
    <div id="modal-bp-add-sess" class="modal-bg">
      <div class="card" style="padding:2rem;max-width:420px;width:100%">
        <div id="bp-add-sess-step1">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">+ Ajouter une séance</h3>
          <div style="background:var(--surface);padding:.75rem 1rem;border-radius:.75rem;margin-bottom:1rem;border:1px solid var(--border)">
            <span style="font-size:.65rem;color:var(--muted);text-transform:uppercase">Emplacement</span>
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1rem;color:var(--gold)">${hierarchyPath}</div>
          </div>
          <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Où souhaitez-vous ajouter cette séance ?</p>
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            ${availableLetters.length > 0 ? `
              <button onclick="_bpAddSessGoStep2('same')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">📁</span>
                <div><div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans ce cycle</div><div style="font-size:.75rem;color:var(--muted)">${hierarchyPath}</div></div>
              </button>
            ` : '<div style="padding:1rem;color:var(--muted);text-align:center">Plus de place dans ce cycle</div>'}
            <button onclick="_bpAddSessGoStep2('new')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25)">
              <span style="font-size:1.75rem">✨</span>
              <div><div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--green)">Nouveau cycle</div><div style="font-size:.75rem;color:var(--muted)">Dans ${hierarchyPath.split('/')[0]} / ${hierarchyPath.split('/')[1]}</div></div>
            </button>
          </div>
          <button onclick="document.getElementById('modal-bp-add-sess').remove()" class="btn" style="width:100%;padding:1rem">Annuler</button>
        </div>
        <div id="bp-add-sess-step2" style="display:none">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">Contenu</h3>
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            <button onclick="_bpAddSessSetType('blank')" class="btn btn-ghost" style="padding:1.25rem;text-align:left;border-radius:1rem">📄 Séance vide</button>
            <button onclick="_bpAddSessSetType('copy')" class="btn btn-ghost" style="padding:1.25rem;text-align:left;border-radius:1rem">📋 Copier depuis ce programme</button>
          </div>
          <button onclick="_bpAddSessBackToStep1()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        <div id="bp-add-sess-step3" style="display:none">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">Choisir la séance source</h3>
          <div style="margin-bottom:1rem">
            <label style="display:block;font-size:.6rem;color:var(--muted);margin-bottom:.5rem">Cycle source</label>
            <select id="bp-add-sess-src-cycle" class="inp" style="margin-bottom:1rem" onchange="_bpAddSessLoadSrcSessions(this.value)">
              <option value="">-- Choisir --</option>
              ${allMicros.map(c => `<option value="${c.id}">Cycle ${c.id} – ${bpH(c.focus)}</option>`).join('')}
            </select>
          </div>
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;color:var(--muted);margin-bottom:.5rem">Séance à copier</label>
            <div id="bp-add-sess-src-sessions" style="display:flex;gap:.5rem;flex-wrap:wrap;min-height:50px;padding:.5rem;background:var(--surface);border-radius:.75rem">
              <p style="font-size:.75rem;color:var(--muted);font-style:italic;width:100%;text-align:center">Sélectionnez un cycle</p>
            </div>
          </div>
          <button onclick="_bpAddSessValidate()" id="btn-bp-add-sess-validate" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem;opacity:0.5" disabled>Valider</button>
          <button onclick="_bpAddSessBackToStep2()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        <div id="bp-add-sess-step4" style="display:none">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">Lettre de séance</h3>
          <div id="bp-add-sess-letters" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.5rem"></div>
          <button onclick="_bpAddSessFinalize()" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem">Créer</button>
          <button onclick="_bpAddSessBackToStep2()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-bp-add-sess');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function _bpAddSessGoStep2(dest) {
  if (dest === 'same') _bpAddSessTargetCycleId = _bpAddSessCurrentCycleId;
  else if (dest === 'new') _bpAddSessTargetCycleId = 'new';
  document.getElementById('bp-add-sess-step1').style.display = 'none';
  document.getElementById('bp-add-sess-step2').style.display = 'block';
}

function _bpAddSessBackToStep1() {
  document.getElementById('bp-add-sess-step2').style.display = 'none';
  document.getElementById('bp-add-sess-step1').style.display = 'block';
}

function _openAddSessModalAtStep3() {
  // Ouvrir directement à l'étape 3 (copie depuis programme existant)
  bpOpenAddSessModal();
  // Passer directement à l'étape 3
  document.getElementById('bp-add-sess-step1').style.display = 'none';
  document.getElementById('bp-add-sess-step2').style.display = 'none';
  document.getElementById('bp-add-sess-step3').style.display = 'block';
  document.getElementById('bp-add-sess-step4').style.display = 'none';
  // Pré-sélectionner le type copie
  _bpAddSessTargetType = 'copy';
  // Charger automatiquement les sessions du cycle courant
  if (_bpAddSessCurrentCycleId) {
    _bpAddSessLoadSrcSessions(_bpAddSessCurrentCycleId);
  }
}

function _bpAddSessSetType(type) {
  _bpAddSessTargetType = type;
  if (type === 'blank') _bpAddSessShowStep4();
  else {
    document.getElementById('bp-add-sess-step2').style.display = 'none';
    document.getElementById('bp-add-sess-step3').style.display = 'block';
  }
}

function _bpAddSessBackToStep2() {
  document.getElementById('bp-add-sess-step3').style.display = 'none';
  document.getElementById('bp-add-sess-step4').style.display = 'none';
  document.getElementById('bp-add-sess-step2').style.display = 'block';
}

function _bpAddSessLoadSrcSessions(cycleId) {
  if (!cycleId) return;
  _bpAddSessSourceCycleId = parseInt(cycleId);
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  const cycle = allMicros.find(c => c.id === _bpAddSessSourceCycleId);
  const container = document.getElementById('bp-add-sess-src-sessions');
  if (!container || !cycle) return;
  
  const activeSessions = cycle.sessions_active || [];
  const sessionsKeys = cycle.sessions ? Object.keys(cycle.sessions) : [];
  const allSessions = [...new Set([...activeSessions, ...sessionsKeys])].sort();
  
  if (allSessions.length === 0) {
    container.innerHTML = '<p style="font-size:.75rem;color:var(--muted);text-align:center">Aucune séance</p>';
    return;
  }
  
  container.innerHTML = allSessions.map(s => `
    <button onclick="_bpAddSessSelectSrcSess(this, '${s}')" class="src-sess-btn btn btn-ghost" style="padding:.75rem 1.25rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:1.1rem">${s}</button>
  `).join('');
}

function _bpAddSessSelectSrcSess(btn, sessType) {
  document.querySelectorAll('.src-sess-btn').forEach(b => { b.style.borderColor='var(--border)'; b.style.background='var(--surface)'; b.style.color='var(--muted)'; });
  btn.style.borderColor='var(--gold)'; btn.style.background='rgba(240,165,0,.15)'; btn.style.color='var(--gold)';
  _bpAddSessSourceSessType = sessType;
  const validateBtn = document.getElementById('btn-bp-add-sess-validate');
  if (validateBtn) { validateBtn.disabled = false; validateBtn.style.opacity = '1'; }
}

function _bpAddSessValidate() {
  if (!_bpAddSessSourceSessType) { toast('Veuillez sélectionner une séance', 'w'); return; }
  _bpAddSessShowStep4();
}

function _bpAddSessShowStep4() {
  document.getElementById('bp-add-sess-step2').style.display = 'none';
  document.getElementById('bp-add-sess-step3').style.display = 'none';
  document.getElementById('bp-add-sess-step4').style.display = 'block';
  
  let availableLetters;
  if (_bpAddSessTargetCycleId === 'new') {
    availableLetters = ['A','B','C','D','E','F','G','H'];
  } else {
    // Utiliser bpGetMicroById avec le contexte stocké pour trouver le bon cycle
    let targetCycle = null;
    if (typeof bpGetMicroById === 'function' && _bpAddSessCurrentMacroId && _bpAddSessCurrentMesoId) {
      targetCycle = bpGetMicroById(_bpAddSessCurrentMacroId, _bpAddSessCurrentMesoId, _bpAddSessTargetCycleId);
    }
    if (!targetCycle) {
      const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
      targetCycle = allMicros.find(c => c.id === _bpAddSessTargetCycleId);
    }
    const active = targetCycle ? (typeof bpGetAllSessions === 'function' ? bpGetAllSessions(targetCycle) : (targetCycle.sessions_active || [])) : [];
    availableLetters = [];
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alpha.length && availableLetters.length < 8; i++) { if (!active.includes(alpha[i])) availableLetters.push(alpha[i]); }
  }
  
  _bpAddSessAvailableLetters = availableLetters;
  if (!availableLetters.includes(_bpAddSessTargetLetter)) _bpAddSessTargetLetter = availableLetters[0];
  
  const lettersContainer = document.getElementById('bp-add-sess-letters');
  if (lettersContainer) {
    lettersContainer.innerHTML = availableLetters.map(l => `
      <button onclick="_bpAddSessSelectLetter(this, '${l}')" class="btn btn-ghost" style="padding:1rem 1.5rem;font-size:1.2rem;border-radius:.75rem;${l === _bpAddSessTargetLetter ? 'border-color:var(--gold);background:rgba(240,165,0,.15);color:var(--gold)' : ''}">${l}</button>
    `).join('');
  }
}

function _bpAddSessSelectLetter(btn, letter) {
  btn.parentElement.querySelectorAll('button').forEach(b => { b.style.borderColor='var(--border)'; b.style.background='var(--surface)'; b.style.color='var(--muted)'; });
  btn.style.borderColor='var(--gold)'; btn.style.background='rgba(240,165,0,.15)'; btn.style.color='var(--gold)';
  _bpAddSessTargetLetter = letter;
}

async function _bpAddSessFinalize() {
  const letter = _bpAddSessTargetLetter;
  if (!letter) { toast('Choisissez une lettre', 'w'); return; }
  
  try {
    if (_bpAddSessTargetCycleId === 'new') await _bpAddSessCreateNewCycle(letter);
    else await _bpAddSessAddToExistingCycle(_bpAddSessTargetCycleId, letter);
    document.getElementById('modal-bp-add-sess').remove();
    bpRebuildEditorSelects();
    _bpSelectedSess = letter;
    bpSyncEditor();
  } catch(e) { toast('Erreur création', 'e'); }
}

async function _bpAddSessCreateNewCycle(letter) {
  const currentMacroId = _bpAddSessCurrentMacroId;
  const currentMesoId = _bpAddSessCurrentMesoId;
  const currentCId = _bpAddSessCurrentCycleId;
  
  // Utiliser bpGetMicroById avec le chemin complet pour trouver le bon cycle
  let currentCycle;
  if (typeof bpGetMicroById === 'function' && currentMacroId && currentMesoId) {
    currentCycle = bpGetMicroById(currentMacroId, currentMesoId, currentCId);
  } else {
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    currentCycle = allMicros.find(c => c.id === currentCId);
  }
  
  if (!currentCycle) {
    console.error('[BP AddSess] Cannot find current cycle:', currentCId, 'macro:', currentMacroId, 'meso:', currentMesoId);
    return;
  }
  
  let sessionData;
  if (_bpAddSessTargetType === 'blank') {
    sessionData = { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  } else {
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    const srcCycle = allMicros.find(c => c.id === _bpAddSessSourceCycleId);
    sessionData = srcCycle ? JSON.parse(JSON.stringify(srcCycle.sessions[_bpAddSessSourceSessType] || {})) : { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  }
  
  // Utiliser bpAddMicroCycle pour créer le nouveau cycle dans la hiérarchie
  let newId;
  if (typeof bpAddMicroCycle === 'function' && currentMacroId && currentMesoId) {
    newId = await bpAddMicroCycle(currentMacroId, currentMesoId, currentCycle.focus + ' (avec ' + letter + ')');
    // Ajouter la séance au nouveau cycle
    const newCycle = bpGetMicroById(currentMacroId, currentMesoId, newId);
    if (newCycle) {
      newCycle.sessions_active = [letter];
      newCycle.sessions = { [letter]: sessionData };
      await bpSaveHierarchy();
      bpSyncBaseProgramFromHierarchy();
    }
  } else {
    // Fallback: créer dans cycles plat
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    newId = Math.max(...allMicros.map(c => c.id), 0) + 1;
    const newCycle = { id: newId, focus: currentCycle.focus + ' (avec ' + letter + ')', sessions_active: [letter], sessions: { [letter]: sessionData } };
    allMicros.push(newCycle);
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
  }
  
  bpRebuildEditorSelects();
  _bpSelectedCycle = newId;
  _bpSelectedSess = letter;
  bpSyncEditor();
  
  toast(`Cycle ${newId} créé avec séance ${letter} !`, 's');
}

async function _bpAddSessAddToExistingCycle(cycleId, letter) {
  const currentMacroId = _bpAddSessCurrentMacroId;
  const currentMesoId = _bpAddSessCurrentMesoId;
  
  // Utiliser bpGetMicroById avec le chemin complet macro/meso/micro pour trouver le bon cycle
  let cycle;
  if (typeof bpGetMicroById === 'function' && currentMacroId && currentMesoId) {
    cycle = bpGetMicroById(currentMacroId, currentMesoId, cycleId);
  } else {
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    cycle = allMicros.find(c => c.id === cycleId);
  }
  
  if (!cycle) {
    console.error('[BP AddSess] Cannot find cycle to add session:', cycleId, 'macro:', currentMacroId, 'meso:', currentMesoId);
    return;
  }
  
  let sessionData;
  if (_bpAddSessTargetType === 'blank') {
    sessionData = { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  } else {
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    const srcCycle = allMicros.find(c => c.id === _bpAddSessSourceCycleId);
    sessionData = srcCycle ? JSON.parse(JSON.stringify(srcCycle.sessions[_bpAddSessSourceSessType] || {})) : { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  }
  
  if (!cycle.sessions_active) cycle.sessions_active = [];
  if (!cycle.sessions_active.includes(letter)) { cycle.sessions_active.push(letter); cycle.sessions_active.sort(); }
  cycle.sessions = cycle.sessions || {};
  cycle.sessions[letter] = sessionData;
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  
  if (cycleId === _bpAddSessCurrentCycleId) {
    bpRebuildEditorSelects();
    _bpSelectedSess = letter;
    bpSyncEditor();
  }
  
  toast(`Séance ${letter} ajoutée au cycle ${cycleId} !`, 's');
}

// Exports for new functions
window.bpSetCopyMode = bpSetCopyMode;
window.bpDoCopy = bpDoCopy;
window.bpOpenAddSessModal = bpOpenAddSessModal;
window._bpAddSessGoStep2 = _bpAddSessGoStep2;
window._bpAddSessBackToStep1 = _bpAddSessBackToStep1;
window._bpAddSessSetType = _bpAddSessSetType;
window._bpAddSessBackToStep2 = _bpAddSessBackToStep2;
window._bpAddSessLoadSrcSessions = _bpAddSessLoadSrcSessions;
window._bpAddSessSelectSrcSess = _bpAddSessSelectSrcSess;
window._bpAddSessValidate = _bpAddSessValidate;
window._bpAddSessShowStep4 = _bpAddSessShowStep4;
window._bpAddSessSelectLetter = _bpAddSessSelectLetter;
window._bpAddSessFinalize = _bpAddSessFinalize;
window._bpAddSessCreateNewCycle = _bpAddSessCreateNewCycle;
window._bpAddSessAddToExistingCycle = _bpAddSessAddToExistingCycle;
