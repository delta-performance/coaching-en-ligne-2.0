// Variables globales pour la sélection par boutons
window._visuSelectedCycle = null;
window._visuSelectedMacro = null;
window._visuSelectedMeso = null;
window._edSelectedCycle = null;
window._edSelectedSess = null;

function populateVisuSelect() {
  // Calculate available sessions from filtered micros
  const allMicros = typeof getVisibleMicros === 'function' ? getVisibleMicros() : clientProgram;
  let filteredMicros = allMicros;
  if (_visuSelectedMacro) {
    filteredMicros = filteredMicros.filter(m => m.macroId === _visuSelectedMacro);
  }
  if (_visuSelectedMeso) {
    filteredMicros = filteredMicros.filter(m => m.mesoId === _visuSelectedMeso);
  }
  
  // Get all unique session letters from filtered micros
  const availableSessions = new Set();
  filteredMicros.forEach(m => {
    const sessions = getAllSessions(m);
    sessions.forEach(s => availableSessions.add(s));
  });
  const sortedSessions = [...availableSessions].sort();
  
  // If current visuSess is not in available sessions, set to first available
  if (sortedSessions.length > 0 && !availableSessions.has(visuSess)) {
    visuSess = sortedSessions[0];
  }
  
  // Render session buttons dynamically
  const sessContainer = document.querySelector('#visu-ctrl-sess div');
  if (sessContainer) {
    if (sortedSessions.length === 0) {
      sessContainer.innerHTML = '<span style="font-size:.65rem;color:var(--muted)">Aucune séance</span>';
    } else {
      sessContainer.innerHTML = sortedSessions.map(s => 
        `<button onclick="setVisuSess('${s}')" id="vs-${s}" class="tab-pill ${s===visuSess?'on':'off'}" style="padding:.3rem .875rem;font-size:.65rem">${s}</button>`
      ).join('');
    }
  }
  const hierarchyLevel = typeof getClientHierarchyLevel === 'function' ? getClientHierarchyLevel() : 'macro';
  
  const macroBtns = document.getElementById('visu-macro-btns');
  const mesoBtns = document.getElementById('visu-meso-btns');
  const microBtns = document.getElementById('visu-cycle-btns');
  const macroCtrl = document.getElementById('visu-ctrl-macro');
  const mesoCtrl = document.getElementById('visu-ctrl-meso');
  const microCtrl = document.getElementById('visu-ctrl-cycle');
  
  if (!microBtns) return;
  
  const allMacros = typeof getAllMacros === 'function' ? getAllMacros() : [];
  
  // Mode micro seul: afficher tous les micros sans sélection
  if (hierarchyLevel === 'micro') {
    if (macroCtrl) macroCtrl.style.display = 'none';
    if (mesoCtrl) mesoCtrl.style.display = 'none';
    if (microCtrl) microCtrl.style.display = visuMode === 'same-cycle' ? 'flex' : 'none';
    
    const allMicros = typeof getVisibleMicros === 'function' ? getVisibleMicros() : clientProgram;
    
    if (visuMode === 'same-cycle') {
      if (!_visuSelectedCycle || !allMicros.find(m => m.id === _visuSelectedCycle)) {
        _visuSelectedCycle = allMicros[0]?.id || null;
      }
      
      microBtns.innerHTML = allMicros.filter(m => !m.archived).map(m => {
        const isSel = m.id === _visuSelectedCycle;
        return `<button onclick="setVisuCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">C${m.id}</button>`;
      }).join('');
    }
    
    const chk = document.getElementById('visu-ctrl-cycles-check'); 
    if (chk) {
      chk.innerHTML = allMicros.filter(m => !m.archived).map(c => {
        const focusText = c.focus ? h(c.focus.substring(0,12)) : 'Sans nom';
        return `<button onclick="toggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${focusText}</button>`;
      }).join('');
    }
    return;
  }
  
  // Mode meso+micro: sélectionner d'abord le mésocycle
  if (hierarchyLevel === 'meso') {
    if (macroCtrl) macroCtrl.style.display = 'none';
    if (mesoCtrl) mesoCtrl.style.display = 'flex';
    if (microCtrl) microCtrl.style.display = visuMode === 'same-cycle' ? 'flex' : 'none';
    
    // Afficher les mésocycles du premier macro
    const firstMacro = allMacros[0];
    const mesos = firstMacro?.mesos || [];
    
    if (!_visuSelectedMeso || !mesos.find(m => m.id === _visuSelectedMeso)) {
      _visuSelectedMeso = mesos[0]?.id || null;
    }
    
    if (mesoBtns) {
      mesoBtns.innerHTML = mesos.filter(m => !m.archived).map(m => {
        const isSel = m.id === _visuSelectedMeso;
        return `<button onclick="setVisuMeso(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">ME${m.id}</button>`;
      }).join('');
    }
    
    // Afficher les micros du mésocycle sélectionné
    const selectedMeso = mesos.find(m => m.id === _visuSelectedMeso);
    const micros = selectedMeso?.micros || [];
    
    if (visuMode === 'same-cycle') {
      if (!_visuSelectedCycle || !micros.find(m => m.id === _visuSelectedCycle)) {
        _visuSelectedCycle = micros[0]?.id || null;
      }
      
      microBtns.innerHTML = micros.filter(m => !m.archived).map(m => {
        const isSel = m.id === _visuSelectedCycle;
        return `<button onclick="setVisuCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">C${m.id}</button>`;
      }).join('');
    }
    
    const chk = document.getElementById('visu-ctrl-cycles-check'); 
    if (chk) {
      // cross-sess et all: micros du méso sélectionné uniquement
      chk.innerHTML = micros.filter(m => !m.archived).map(c =>
        `<button onclick="toggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${h(c.focus.substring(0,12))}</button>`
      ).join('');
    }
    return;
  }
  
  // Mode macro+meso+micro: sélection hiérarchique complète
  if (macroCtrl) macroCtrl.style.display = 'flex';
  if (mesoCtrl) mesoCtrl.style.display = 'flex';
  if (microCtrl) microCtrl.style.display = visuMode === 'same-cycle' ? 'flex' : 'none';
  
  if (!macroBtns || !mesoBtns) return;
  
  // Set default macro if none selected
  if (!_visuSelectedMacro && allMacros.length > 0) {
    _visuSelectedMacro = allMacros[0].id;
  }
  
  // Render macro buttons
  macroBtns.innerHTML = allMacros.filter(m => !m.archived).map(m => {
    const isSel = m.id === _visuSelectedMacro;
    return `<button onclick="setVisuMacro(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">M${m.id}</button>`;
  }).join('');
  
  // Get selected macro's mesos
  const selectedMacro = allMacros.find(m => m.id === _visuSelectedMacro);
  const mesos = selectedMacro?.mesos || [];
  
  // Set default meso if none selected or if current is not in this macro
  if ((!_visuSelectedMeso || !mesos.find(m => m.id === _visuSelectedMeso)) && mesos.length > 0) {
    _visuSelectedMeso = mesos[0].id;
  }
  
  // Render meso buttons
  mesoBtns.innerHTML = mesos.filter(m => !m.archived).map(m => {
    const isSel = m.id === _visuSelectedMeso;
    return `<button onclick="setVisuMeso(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">ME${m.id}</button>`;
  }).join('');
  
  // Get selected meso's micros
  const selectedMeso = mesos.find(m => m.id === _visuSelectedMeso);
  const micros = selectedMeso?.micros || [];
  
  // For "same-cycle" mode, set default micro if none selected
  if (visuMode === 'same-cycle') {
    if (!_visuSelectedCycle || !micros.find(m => m.id === _visuSelectedCycle)) {
      _visuSelectedCycle = micros[0]?.id || null;
    }
    
    microBtns.innerHTML = micros.filter(m => !m.archived).map(m => {
      const isSel = m.id === _visuSelectedCycle;
      return `<button onclick="setVisuCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">C${m.id}</button>`;
    }).join('');;
  }
  
  const chk = document.getElementById('visu-ctrl-cycles-check'); 
  if (chk) {
    // cross-sess et all: micros du méso sélectionné uniquement
    chk.innerHTML = micros.filter(m => !m.archived).map(c =>
      `<button onclick="toggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${h(c.focus.substring(0,12))}</button>`
    ).join('');
  }
}

function setVisuMacro(macroId) {
  _visuSelectedMacro = macroId;
  _visuSelectedMeso = null; // Reset meso when macro changes
  _visuSelectedCycle = null; // Reset micro when macro changes
  populateVisuSelect();
  renderVisu();
}

function setVisuMeso(mesoId) {
  _visuSelectedMeso = mesoId;
  _visuSelectedCycle = null; // Reset micro when meso changes
  populateVisuSelect();
  renderVisu();
}

function setVisuCycle(cycleId) {
  _visuSelectedCycle = cycleId;
  populateVisuSelect();
  renderVisu();
}

function toggleVisuCycle(id, btn) {
  if (visuSelectedCycles.has(id)) {
    visuSelectedCycles.delete(id);
    btn.style.borderColor = 'var(--border)'; btn.style.background = 'var(--surface)'; btn.style.color = 'var(--muted)';
  } else {
    visuSelectedCycles.add(id);
    btn.style.borderColor = 'rgba(240,165,0,.5)'; btn.style.background = 'rgba(240,165,0,.1)'; btn.style.color = 'var(--gold)';
  }
  renderVisu();
}

function setVisuMode(m) {
  visuMode = m;
  ['same-cycle','cross-sess','all'].forEach(k => {
    const btn = document.getElementById('vm-'+k); if (btn) btn.className = 'tab-pill '+(k===m?'on':'off');
  });
  
  const hierarchyLevel = typeof getClientHierarchyLevel === 'function' ? getClientHierarchyLevel() : 'macro';
  
  const mc = document.getElementById('visu-ctrl-macro');
  const me = document.getElementById('visu-ctrl-meso');
  const cc = document.getElementById('visu-ctrl-cycle');
  const cs = document.getElementById('visu-ctrl-sess');
  const cck = document.getElementById('visu-ctrl-cycles-check');
  
  // Show/hide controls based on hierarchy level and mode
  if (hierarchyLevel === 'micro') {
    // Micro seul: seulement les micros
    if (mc) mc.style.display = 'none';
    if (me) me.style.display = 'none';
    if (cc) cc.style.display = m === 'same-cycle' ? 'flex' : 'none';
    if (cs) cs.style.display = m === 'cross-sess' ? 'flex' : 'none';
    if (cck) cck.style.display = (m === 'all' || m === 'cross-sess') ? 'flex' : 'none';
  } else if (hierarchyLevel === 'meso') {
    // Meso+micro: mésocycles et micros
    if (mc) mc.style.display = 'none';
    if (me) me.style.display = 'flex';
    if (cc) cc.style.display = m === 'same-cycle' ? 'flex' : 'none';
    if (cs) cs.style.display = m === 'cross-sess' ? 'flex' : 'none';
    if (cck) cck.style.display = (m === 'all' || m === 'cross-sess') ? 'flex' : 'none';
  } else {
    // Macro+meso+micro: tous les niveaux
    if (m==='same-cycle') {
      if (mc) mc.style.display = 'flex';
      if (me) me.style.display = 'flex';
      if (cc) cc.style.display = 'flex';
      if (cs) cs.style.display = 'none';
      if (cck) cck.style.display = 'none';
    } else if (m==='cross-sess') {
      if (mc) mc.style.display = 'flex';
      if (me) me.style.display = 'flex';
      if (cc) cc.style.display = 'none';
      if (cs) cs.style.display = 'flex';
      if (cck) cck.style.display = 'flex';
    } else {
      if (mc) mc.style.display = 'flex';
      if (me) me.style.display = 'flex';
      if (cc) cc.style.display = 'none';
      if (cs) cs.style.display = 'none';
      if (cck) cck.style.display = 'flex';
    }
  }
  populateVisuSelect();
  renderVisu();
}

function setVisuSess(s) {
  visuSess = s;
  // Update all vs-* buttons dynamically
  document.querySelectorAll('[id^="vs-"]').forEach(btn => {
    const letter = btn.id.replace('vs-', '');
    btn.className = 'tab-pill ' + (letter === s ? 'on' : 'off');
  });
  renderVisu();
}

// Construit la liste HTML d'exercices pour la visu (avec supersets groupés)
function visuExListHTML(exs, sp, col, cycleId, sessType) {
  const isClassic = sp.mode === 'classic';
  if (!exs.length) return '<p style="font-size:.7rem;color:var(--muted);font-style:italic">Aucun exercice.</p>';
  const groups = groupExercises(exs);

  return groups.map(g => {
    if (g.type === 'superset') {
      const inner = g.items.map(item => visuExRowHTML(item.ex, col, isClassic)).join('');
      return `<div style="border:1px solid rgba(240,165,0,.3);border-radius:.75rem;padding:.5rem;background:rgba(240,165,0,.03);margin-bottom:.3rem">
        <div style="font-size:.55rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.35rem">⇄ SUPERSET</div>
        ${inner}
      </div>`;
    } else {
      return visuExRowHTML(g.ex, col, isClassic);
    }
  }).join('');
}

function visuExRowHTML(e, col, isClassic) {
  const isEnergetic = e.exType === 'energetique';
  const lightning = isEnergetic ? '⚡' : '';
  const nameColor = isEnergetic ? '#60a5fa' : 'var(--text)';
  
  if (isEnergetic) {
    // Format énergétique: séries x reps x (effort/recup) - récup entre séries
    const params = [];
    if (e.sets) params.push(`${e.sets} séries`);
    if (e.reps) params.push(`${e.reps} reps`);
    if (e.workTime && e.restTime) params.push(`(${e.workTime}/${e.restTime})`);
    if (e.restSet) params.push(`- ${e.restSet} r`);
    
    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .65rem;background:var(--surface);border-radius:.65rem;margin-bottom:.25rem;flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;flex:1;min-width:80px;color:${nameColor}">${lightning} ${h(e.name)}</span>
      <span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">${params.join(' ')}</span>
      ${e.rpeTarget?`<span style="font-size:.55rem;color:var(--gold);background:rgba(240,165,0,.1);padding:.1rem .4rem;border-radius:.3rem">RPE${h(e.rpeTarget)}</span>`:''}
    </div>`;
  } else {
    // Format musculaire classique
    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .65rem;background:var(--surface);border-radius:.65rem;margin-bottom:.25rem;flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;flex:1;min-width:80px">${h(e.name)}</span>
      ${isClassic ? `
        ${e.sets?`<span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">${e.sets}×</span>`:''}
        ${e.reps?`<span style="font-size:.6rem;color:${col};font-family:'Barlow Condensed',sans-serif;font-weight:700">${h(e.reps)}</span>`:''}
        ${e.restSet?`<span style="font-size:.55rem;color:var(--muted);background:var(--card);padding:.1rem .4rem;border-radius:.3rem">R:${h(e.restSet)}</span>`:''}
        ${e.rpeTarget?`<span style="font-size:.55rem;color:var(--gold);background:rgba(240,165,0,.1);padding:.1rem .4rem;border-radius:.3rem">RPE${h(e.rpeTarget)}</span>`:''}
      ` : `
        ${e.reps?`<span style="font-size:.65rem;color:${col};font-family:'Barlow Condensed',sans-serif;font-weight:700">${h(e.reps)}</span>`:''}
      `}
    </div>`;
  }
}

function renderVisu() {
  const el = document.getElementById('visu-content'); if (!el) return;
  
  // Utiliser la hiérarchie si disponible - filtrer par macro/meso sélectionnés
  let allMicros = typeof getVisibleMicros === 'function' ? getVisibleMicros() : clientProgram;
  
  // Filtrer par macro et meso sélectionnés pour ne pas mélanger les cycles
  if (_visuSelectedMacro) {
    allMicros = allMicros.filter(m => m.macroId === _visuSelectedMacro);
  }
  if (_visuSelectedMeso) {
    allMicros = allMicros.filter(m => m.mesoId === _visuSelectedMeso);
  }

  if (visuMode === 'same-cycle') {
    const cId = _visuSelectedCycle || (allMicros[0]?.id);
    const c = allMicros.find(x => x.id === cId);
    if (!c) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Sélectionnez un cycle.</p>'; return; }
    const active = getAllSessions(c);
    const macroId = c.macroId || '';
    const mesoId = c.mesoId || '';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
      <h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin:0">CYCLE ${c.id} — ${h(c.focus)}</h5>
      <button onclick="openDupCycleModal(${c.id})" class="btn btn-gold btn-sm" style="font-size:.7rem">⧉ Dupliquer cycle</button>
    </div>
    <div id="visu-sessions-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;position:relative">
      ${active.map((t,ti) => {
        const sp = getSessParams(c,t); const exs = getSessEx(c,t); const col = getSessColor(t,ti);
        return `
        <div class="card visu-sess-card" data-sess="${t}" data-index="${ti}" draggable="true" ondragstart="_visuDragStart(event, '${t}')" ondragover="_visuDragOverCard(event, '${t}')" ondrop="_visuDrop(event, ${c.id}, '${t}', ${macroId}, ${mesoId})" ondragenter="_visuDragEnter(event)" ondragleave="_visuDragLeave(event)" style="overflow:hidden;transition:transform .2s,box-shadow .2s,border .2s;cursor:grab;position:relative;border:2px solid transparent">
          <div style="background:${col};padding:1rem;display:flex;align-items:center;gap:.5rem">
            <span style="cursor:grab;padding:.25rem;color:rgba(255,255,255,.5);font-size:1.2rem">⋮⋮</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;color:white">SÉANCE ${t}</span>
            <span style="font-size:1.5rem;color:white;padding:0 .3rem">${sp.mode==='classic'?'≡':'⟳'}</span>
            <div style="margin-left:auto;display:flex;gap:.5rem">
              <button onclick="visuOpenEditor(${c.id},'${t}')" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.4);color:white;border-radius:.5rem;padding:.4rem .5rem;font-size:1rem;cursor:pointer;backdrop-filter:blur(4px)" title="Modifier">✏️</button>
              <button onclick="visuDupSession(${c.id},'${t}')" style="background:#3b82f6;border:1px solid rgba(255,255,255,0.3);color:white;border-radius:.5rem;padding:.4rem .5rem;font-size:1rem;cursor:pointer" title="Dupliquer">⧉</button>
              <button onclick="deleteSession(${c.id},'${t}',${macroId},${mesoId})" style="background:#ef4444;border:1px solid rgba(255,255,255,0.3);color:white;border-radius:.5rem;padding:.4rem .5rem;font-size:1rem;cursor:pointer" title="Supprimer">🗑️</button>
            </div>
          </div>
          <div style="padding:1rem">
            ${sp.mode==='circuit'?`<div style="display:flex;gap:.5rem;margin-bottom:.75rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>`:''}
            ${visuExListHTML(exs, sp, col, c.id, t)}
          </div>
        </div>`;
      }).join('')}
      <div class="visu-drop-indicator" data-pos="end" ondragover="_visuDragOverIndicator(event, 'end')" ondragleave="_visuDragLeaveIndicator(event)" ondrop="_visuDropAtEnd(event, ${c.id}, ${macroId}, ${mesoId})" style="grid-column:1 / -1;height:6px;margin:-4px 0;background:transparent;border-radius:3px;transition:all .2s;pointer-events:auto"></div>
      <div onclick="visuAddSession(${c.id})" style="cursor:pointer;border:2px dashed var(--border);border-radius:1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:2rem;min-height:160px;transition:all .2s;background:transparent" onmouseover="this.style.borderColor='rgba(240,165,0,.5)';this.style.background='rgba(240,165,0,.03)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
        <span style="font-size:2rem;color:var(--muted)">+</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Ajouter une séance</span>
      </div>
    </div>`;

  } else if (visuMode === 'cross-sess') {
    const selCycles = Array.from(visuSelectedCycles);
    if (!selCycles.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>'; return; }
    const col = getSessColor(visuSess);
    el.innerHTML = `<h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">SÉANCE ${visuSess} — ${selCycles.length} cycle(s)</h5>
    <div style="display:flex;flex-direction:column;gap:1.25rem">
      ${selCycles.map(cId => {
        const c = allMicros.find(x => x.id === cId); if (!c) return '';
        const sp = getSessParams(c, visuSess); const exs = getSessEx(c, visuSess);
        const active = getAllSessions(c);
        if (!active.includes(visuSess)) return `<div class="card" style="overflow:hidden;opacity:.5">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-size:.7rem;color:var(--muted);font-style:italic">Séance ${visuSess} non configurée</span>
          </div></div>`;
        return `<div class="card" style="overflow:hidden">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;font-style:italic;color:var(--muted)">${h(c.focus)}</span>
            <span style="font-size:1.5rem;color:white;padding:0 .3rem">${sp.mode==='classic'?'≡':'⟳'}</span>
            <button onclick="visuOpenEditor(${c.id},'${visuSess}')" style="margin-left:auto;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);border-radius:.5rem;padding:.25rem .6rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;cursor:pointer">✏️ Modifier</button>
          </div>
          <div style="padding:1rem">
            ${sp.mode==='circuit'?`<div style="display:flex;gap:.5rem;margin-bottom:.5rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>`:''}
            ${visuExListHTML(exs, sp, col, c.id, visuSess)}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  } else { // all
    const selCycles = Array.from(visuSelectedCycles);
    if (!selCycles.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>'; return; }
    el.innerHTML = selCycles.map(cId => {
      const c = allMicros.find(x => x.id === cId); if (!c) return '';
      const active = getAllSessions(c);
      return `<div style="margin-bottom:2.5rem">
        <h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">CYCLE ${c.id} — ${h(c.focus)}</h5>
        <div style="overflow-x:auto">
          <table class="tbl" style="width:100%;background:var(--card);border-radius:1rem;overflow:hidden">
            <thead><tr>
              <th>Exercice</th>
              ${active.map((t,ti)=>{const col=getSessColor(t,ti);return `<th style="color:${col}">Séance ${t} <button onclick="visuOpenEditor(${c.id},'${t}')" style="background:none;border:none;color:${col};cursor:pointer;font-size:.65rem">✏️</button></th>`;}).join('')}
            </tr></thead>
            <tbody>
              ${(()=>{
                const maxEx = Math.max(1, ...active.map(t => getSessEx(c,t).length));
                return Array.from({length:maxEx},(_,i)=>`<tr class="db-row">
                  <td style="font-size:.75rem;color:var(--muted)">Ex ${i+1}</td>
                  ${active.map((t,ti) => {
                    const e = getSessEx(c,t)[i];
                    const sp = getSessParams(c,t);
                    const col = getSessColor(t,ti);
                    return e ? `<td>
                      ${e.superset?`<span style="font-size:.6rem;color:var(--gold)">⇄ </span>`:''}
                      <div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700">${h(e.name)}</div>
                      ${sp.mode==='classic'&&(e.sets||e.reps)?`<div style="font-size:.6rem;color:${col};margin-top:.15rem">${e.sets?e.sets+'× ':''} ${e.reps||''} ${e.rpeTarget?'RPE'+e.rpeTarget:''}</div>`:''}
                      ${sp.mode!=='classic'&&e.reps?`<div style="font-size:.65rem;color:${col}">${h(e.reps)}</div>`:''}
                    </td>` : `<td style="color:var(--border)">—</td>`;
                  }).join('')}
                </tr>`).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>`;
    }).join('');
  }
}

async function visuDupSession(cycleId, sessType) {
  // Configurer les variables globales pour la duplication
  const c = clientProgram.find(x => x.id === cycleId);
  if (!c) return;
  
  // Pré-remplir les données source
  _addSessCurrentCycleId = cycleId;
  _addSessSourceClientId = currentClient?.id || '';
  _addSessSourceCycleId = cycleId;
  _addSessSourceSessType = sessType;
  _addSessSourceProgram = clientProgram;
  _addSessTargetType = 'copy'; // On sait déjà qu'on veut copier
  
  // Ouvrir directement le modal à l'étape 1 (choix destination)
  _openDupSessModal(cycleId, c, sessType);
}

function _openDupSessModal(cycleId, currentCycle, sessType) {
  const otherCycles = clientProgram.filter(cp => cp.id !== cycleId);
  const active = getActiveSessions(currentCycle);
  
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
  
  _addSessAvailableLetters = availableLetters;
  _addSessTargetLetter = availableLetters[0] || '';
  
  const modalHtml = `
    <div id="modal-dup-sess" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:420px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border)">
        
        <!-- Vue 1: Choisir la destination -->
        <div id="dup-sess-step1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">⧉ Dupliquer ${sessType}</h3>
            <button onclick="document.getElementById('modal-dup-sess').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Source: Cycle ${cycleId} ${currentCycle.focus} • Séance ${sessType}<br>Où souhaitez-vous la dupliquer ?</p>
          
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            ${availableLetters.length > 0 ? `
              <button onclick="_dupSessSelectDest('same')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">📁</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans ce cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">Cycle ${currentCycle.id}: ${currentCycle.focus}</div>
                </div>
              </button>
            ` : `
              <div class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;opacity:0.5;cursor:not-allowed">
                <span style="font-size:1.75rem">📁</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans ce cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">Plus de place</div>
                </div>
              </div>
            `}
            
            ${otherCycles.length > 0 ? `
              <button onclick="_dupSessShowOtherCycles()" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
                <span style="font-size:1.75rem">🔄</span>
                <div>
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Dans un autre cycle</div>
                  <div style="font-size:.75rem;color:var(--muted)">${otherCycles.length} cycle(s) existant(s)</div>
                </div>
              </button>
            ` : ''}
            
            <button onclick="_dupSessSelectDest('new')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25)">
              <span style="font-size:1.75rem">✨</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--green)">Nouveau cycle</div>
                <div style="font-size:.75rem;color:var(--muted)">Créer un cycle avec cette séance</div>
              </div>
            </button>
          </div>
          
          <button onclick="document.getElementById('modal-dup-sess').remove()" class="btn" style="width:100%;padding:1rem">Annuler</button>
        </div>
        
        <!-- Vue 1b: Liste des autres cycles -->
        <div id="dup-sess-cycles" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_dupSessBackToStep1()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Choisir un cycle</h3>
          </div>
          
          <div style="display:flex;flex-direction:column;gap:.5rem;max-height:300px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:1rem;margin-bottom:1.5rem">
            ${otherCycles.map(cycle => {
              const cycleActive = getActiveSessions(cycle);
              const cycleAvailable = ['A','B','C','D','E','F','G','H'].filter(l => !cycleActive.includes(l));
              const hasSpace = cycleAvailable.length > 0;
              return `
                <button onclick="${hasSpace ? `_dupSessSelectOtherCycle(${cycle.id})` : ''}" 
                        class="btn btn-ghost btn-sm" 
                        style="justify-content:flex-start;text-align:left;padding:1rem;border-radius:.75rem;${!hasSpace ? 'opacity:0.5;cursor:not-allowed' : ''}">
                  <div style="display:flex;align-items:center;gap:1rem;width:100%">
                    <div style="width:40px;height:40px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:900;color:#1a0900;flex-shrink:0">
                      ${cycle.id}
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${cycle.focus}</div>
                      <div style="font-size:.7rem;color:var(--muted)">${cycleActive.length} séance(s) ${!hasSpace ? '• Complet' : `• ${cycleAvailable[0]} disponible`}</div>
                    </div>
                    ${hasSpace ? '<span style="font-size:1.2rem">→</span>' : '<span style="font-size:1.2rem;color:var(--muted)">✕</span>'}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
          
          <button onclick="_dupSessBackToStep1()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
        <!-- Vue 2: Confirmation avec choix de la lettre -->
        <div id="dup-sess-confirm" style="display:none">
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
            <button onclick="_dupSessBackFromConfirm()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem;padding:.5rem">←</button>
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">Confirmer</h3>
          </div>
          
          <div style="background:var(--surface);padding:1rem;border-radius:1rem;margin-bottom:1.5rem">
            <div style="font-size:.75rem;color:var(--muted);margin-bottom:.25rem">Récapitulatif</div>
            <div id="dup-sess-summary" style="font-size:.9rem"></div>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Lettre de la séance</label>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap" id="dup-sess-letters">
              <!-- Rempli dynamiquement -->
            </div>
          </div>
          
          <button onclick="_dupSessFinalize()" class="btn btn-primary" style="width:100%;padding:1rem;margin-bottom:.75rem">Dupliquer la séance</button>
          <button onclick="_dupSessBackFromConfirm()" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
        </div>
        
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-dup-sess');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function _dupSessSelectDest(dest) {
  if (dest === 'same') {
    _addSessTargetCycleId = _addSessCurrentCycleId;
  } else if (dest === 'new') {
    _addSessTargetCycleId = 'new';
  }
  _dupSessShowConfirm();
}

function _dupSessShowOtherCycles() {
  document.getElementById('dup-sess-step1').style.display = 'none';
  document.getElementById('dup-sess-cycles').style.display = 'block';
}

function _dupSessSelectOtherCycle(cycleId) {
  _addSessTargetCycleId = cycleId;
  _dupSessShowConfirm();
}

function _dupSessBackToStep1() {
  document.getElementById('dup-sess-cycles').style.display = 'none';
  document.getElementById('dup-sess-confirm').style.display = 'none';
  document.getElementById('dup-sess-step1').style.display = 'block';
}

function _dupSessBackFromConfirm() {
  document.getElementById('dup-sess-confirm').style.display = 'none';
  if (_addSessTargetCycleId === 'new' || _addSessTargetCycleId === _addSessCurrentCycleId) {
    document.getElementById('dup-sess-step1').style.display = 'block';
  } else {
    document.getElementById('dup-sess-cycles').style.display = 'block';
  }
}

function _dupSessShowConfirm() {
  // Calculer les lettres disponibles pour la destination
  let targetCycle, availableLetters, destText;
  
  if (_addSessTargetCycleId === 'new') {
    availableLetters = ['A','B','C','D','E','F','G','H'];
    destText = 'Nouveau cycle';
  } else {
    targetCycle = clientProgram.find(c => c.id === _addSessTargetCycleId);
    const active = targetCycle ? getActiveSessions(targetCycle) : [];
    availableLetters = [];
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < alpha.length && availableLetters.length < 8; i++) {
      if (!active.includes(alpha[i])) availableLetters.push(alpha[i]);
    }
    destText = targetCycle ? `Cycle ${targetCycle.id}: ${targetCycle.focus}` : 'Cycle inconnu';
  }
  
  if (availableLetters.length === 0) {
    toast('Plus de lettres disponibles dans ce cycle', 'w');
    return;
  }
  
  _addSessAvailableLetters = availableLetters;
  if (!availableLetters.includes(_addSessTargetLetter)) {
    _addSessTargetLetter = availableLetters[0];
  }
  
  // Mettre à jour le récapitulatif
  document.getElementById('dup-sess-summary').innerHTML = 
    `Source: Séance ${_addSessSourceSessType} du cycle ${_addSessSourceCycleId}<br>` +
    `Destination: ${destText}`;
  
  // Générer les boutons de lettres
  document.getElementById('dup-sess-letters').innerHTML = availableLetters.map(l => `
    <button onclick="_dupSessSelectLetter(this, '${l}')" class="dup-letter-btn btn btn-ghost" style="padding:1rem 1.5rem;font-size:1.2rem;border-radius:.75rem;${l === _addSessTargetLetter ? 'border-color:var(--gold);background:rgba(240,165,0,.15);color:var(--gold)' : ''}">${l}</button>
  `).join('');
  
  document.getElementById('dup-sess-step1').style.display = 'none';
  document.getElementById('dup-sess-cycles').style.display = 'none';
  document.getElementById('dup-sess-confirm').style.display = 'block';
}

function _dupSessSelectLetter(btn, letter) {
  document.querySelectorAll('.dup-letter-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background = 'var(--surface)';
    b.style.color = 'var(--muted)';
  });
  btn.style.borderColor = 'var(--gold)';
  btn.style.background = 'rgba(240,165,0,.15)';
  btn.style.color = 'var(--gold)';
  _addSessTargetLetter = letter;
}

async function _dupSessFinalize() {
  const letter = _addSessTargetLetter;
  if (!letter) { toast('Choisissez une lettre', 'w'); return; }
  
  try {
    if (_addSessTargetCycleId === 'new') {
      // Créer un nouveau cycle
      await _dupSessCreateNewCycle(letter);
    } else {
      // Ajouter à un cycle existant
      await _dupSessAddToExistingCycle(_addSessTargetCycleId, letter);
    }
    document.getElementById('modal-dup-sess').remove();
  } catch(e) {
    console.error(e);
    toast('Erreur lors de la duplication', 'e');
  }
}

async function _dupSessCreateNewCycle(letter) {
  const srcCycle = clientProgram.find(c => c.id === _addSessSourceCycleId);
  if (!srcCycle) return;
  
  const newId = Math.max(...clientProgram.map(c => c.id), 0) + 1;
  const sessionData = JSON.parse(JSON.stringify(srcCycle.sessions[_addSessSourceSessType] || {}));
  
  const newCycle = {
    id: newId,
    focus: srcCycle.focus + ' (copie)',
    sessions_active: [letter],
    sessions: { [letter]: sessionData }
  };
  
  clientProgram.push(newCycle);
  await saveClientProgram();
  
  rebuildEditorSelects();
  document.getElementById('visu-cycle-sel').innerHTML = clientProgram.map(c => `<option value="${c.id}">C${c.id} – ${c.focus}</option>`).join('');
  
  toast(`Cycle ${newId} créé avec séance ${letter} !`, 's');
  renderVisu();
}

async function _dupSessAddToExistingCycle(cycleId, letter) {
  const srcCycle = clientProgram.find(c => c.id === _addSessSourceCycleId);
  const targetCycle = clientProgram.find(c => c.id === cycleId);
  if (!srcCycle || !targetCycle) return;
  
  const sessionData = JSON.parse(JSON.stringify(srcCycle.sessions[_addSessSourceSessType] || {}));
  
  if (!targetCycle.sessions_active) targetCycle.sessions_active = [];
  if (!targetCycle.sessions_active.includes(letter)) {
    targetCycle.sessions_active.push(letter);
    targetCycle.sessions_active.sort();
  }
  
  targetCycle.sessions = targetCycle.sessions || {};
  targetCycle.sessions[letter] = sessionData;
  
  await saveClientProgram();
  
  rebuildEditorSelects();
  toast(`Séance ${letter} dupliquée dans le cycle ${cycleId} !`, 's');
  renderVisu();
}

function visuOpenEditor(cycleId, sessType) {
  // Utiliser les sélections actuelles de la visualisation
  let macroId = _visuSelectedMacro;
  let mesoId = _visuSelectedMeso;
  
  // Si pas de sélection, essayer de trouver dans la structure
  if (!macroId || !mesoId) {
    const allMacros = typeof getAllMacros === 'function' ? getAllMacros() : [];
    for (const macro of allMacros) {
      for (const meso of (macro.mesos || [])) {
        const foundMicro = meso.micros?.find(m => m.id === cycleId);
        if (foundMicro) {
          macroId = macro.id;
          mesoId = meso.id;
          break;
        }
      }
      if (macroId && mesoId) break;
    }
  }
  
  // Construire le message de confirmation selon le niveau de hiérarchie
  const hierarchyLevel = typeof getClientHierarchyLevel === 'function' ? getClientHierarchyLevel() : 'macro';
  let confirmMsg = `Modifier la séance ${sessType}`;
  if (hierarchyLevel === 'micro') {
    confirmMsg += ` du microcycle ${cycleId} ?`;
  } else if (hierarchyLevel === 'meso') {
    confirmMsg += ` du microcycle ${cycleId} (méso ${mesoId}) ?`;
  } else { // macro
    confirmMsg += ` du microcycle ${cycleId} (méso ${mesoId}, macro ${macroId}) ?`;
  }
  
  if (confirm(confirmMsg)) {
    // Mettre à jour la hiérarchie de l'éditeur
    if (macroId) _hierarchy.currentMacro = macroId;
    if (mesoId) _hierarchy.currentMeso = mesoId;
    _hierarchy.currentMicro = cycleId;
    
    // Mettre à jour les variables de l'éditeur
    _edSelectedCycle = cycleId;
    _edSelectedSess = sessType;
    
    switchSubTab('editor');
    
    // Rafraîchir les sélecteurs hiérarchiques APRÈS le changement de tab
    setTimeout(() => {
      if (typeof renderHierarchySelectors === 'function') {
        renderHierarchySelectors();
      }
      syncEditor();
      document.getElementById('sub-editor')?.scrollIntoView({ behavior:'smooth', block:'start' });
    }, 200);
  }
}

// Ajouter une séance depuis la visualisation (modal vierge ou copie)
function visuAddSession(cycleId) {
  const c = clientProgram.find(x => x.id === cycleId);
  if (!c) return;
  
  const modalHtml = `
    <div id="modal-visu-add-sess" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:420px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border)">
        
        <!-- Vue: Choisir le contenu -->
        <div id="visu-add-step1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">+ Ajouter une séance</h3>
            <button onclick="document.getElementById('modal-visu-add-sess').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
          </div>
          
          <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Cycle ${c.id}: ${h(c.focus)}<br>Quel type de séance souhaitez-vous ajouter ?</p>
          
          <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
            <button onclick="_visuAddBlank(${cycleId})" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
              <span style="font-size:1.75rem">📄</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Séance vierge</div>
                <div style="font-size:.75rem;color:var(--muted)">Créer une séance vide</div>
              </div>
            </button>
            
            <button onclick="_visuAddFromCopy(${cycleId})" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem">
              <span style="font-size:1.75rem">📋</span>
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem">Copier depuis une séance</div>
                <div style="font-size:.75rem;color:var(--muted)">Dupliquer une séance existante</div>
              </div>
            </button>
          </div>
          
          <button onclick="document.getElementById('modal-visu-add-sess').remove()" class="btn" style="width:100%;padding:1rem">Annuler</button>
        </div>
        
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-visu-add-sess');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Ajouter une séance vierge depuis la visualisation
async function _visuAddBlank(cycleId) {
  const idx = clientProgram.findIndex(c => c.id === cycleId);
  if (idx === -1) return;
  
  const c = clientProgram[idx];
  if (!c.sessions) c.sessions = {};
  
  // Trouver la prochaine lettre disponible
  const used = new Set(Object.keys(c.sessions));
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let letter = '';
  for (const l of letters) { 
    if (!used.has(l)) { letter = l; break; } 
  }
  if (!letter) { 
    toast('Toutes les lettres sont utilisées !', 'w'); 
    return; 
  }
  
  // Créer la nouvelle séance directement dans sessions
  c.sessions[letter] = { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  
  try {
    await saveClientProgram();
    document.getElementById('modal-visu-add-sess')?.remove();
    toast('Séance ' + letter + ' créée !', 's');
    renderVisu();
  } catch(e) {
    toast('Erreur', 'e');
  }
}

// Afficher le choix de la lettre
function _visuShowLetterChooser(availableLetters, title) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-visu-add-sess');
    if (!modal) return resolve(null);
    
    modal.querySelector('#visu-add-step1').style.display = 'none';
    
    const letterHtml = `
      <div id="visu-letter-step" style="text-align:center">
        <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">${title}</h3>
        <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Choisissez une lettre pour la séance :</p>
        
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin-bottom:1.5rem">
          ${availableLetters.map(l => `
            <button onclick="window._visuLetterSelected('${l}')" class="btn btn-ghost" style="padding:1rem 1.5rem;font-size:1.5rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:700">${l}</button>
          `).join('')}
        </div>
        
        <button onclick="window._visuLetterSelected(null)" class="btn btn-ghost" style="width:100%;padding:1rem">← Retour</button>
      </div>
    `;
    
    modal.querySelector('.modal').insertAdjacentHTML('beforeend', letterHtml);
    
    window._visuLetterSelected = (letter) => {
      delete window._visuLetterSelected;
      resolve(letter);
    };
  });
}

// Ouvrir le modal +Séance complet depuis la visualisation (pour copie)
function _visuAddFromCopy(cycleId) {
  const c = clientProgram.find(x => x.id === cycleId);
  if (!c) return;
  
  // Trouver la prochaine lettre disponible
  const active = getActiveSessions(c);
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
  
  // Fermer le modal visu-add-sess
  document.getElementById('modal-visu-add-sess')?.remove();
  
  // Configurer les variables globales pour la copie
  _addSessCurrentCycleId = cycleId;
  _addSessTargetCycleId = cycleId;
  _addSessAvailableLetters = availableLetters;
  _addSessTargetLetter = availableLetters[0] || '';
  _addSessTargetType = 'copy';
  _addSessSourceClientId = '';
  _addSessSourceCycleId = 0;
  _addSessSourceSessType = '';
  _addSessSourceProgram = [];
  
  // Ouvrir le modal add-sess directement à l'étape 3 (sélection du client)
  _openAddSessModalAtStep3(c);
}

// ===== DRAG & DROP pour réorganiser les séances =====
let _visuDraggedSess = null;
let _visuDropPosition = null; // 'before', 'after', or 'end'

function _visuDragStart(e, sessType) {
  _visuDraggedSess = sessType;
  _visuDropPosition = null;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.5';
  e.target.style.transform = 'scale(1.02)';
}

function _visuDragOverCard(e, targetSess) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (!_visuDraggedSess || _visuDraggedSess === targetSess) return;
  
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height;
  
  // Determine if dropping before or after based on mouse position
  if (y < height / 2) {
    _visuDropPosition = 'before';
    card.style.borderTop = '4px solid var(--gold)';
    card.style.borderBottom = '2px solid transparent';
  } else {
    _visuDropPosition = 'after';
    card.style.borderBottom = '4px solid var(--gold)';
    card.style.borderTop = '2px solid transparent';
  }
  card.style.transform = 'scale(1.01)';
}

function _visuDragOverIndicator(e, pos) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  
  const indicator = e.currentTarget;
  indicator.style.background = 'var(--gold)';
  indicator.style.height = '8px';
  _visuDropPosition = pos;
}

function _visuDragLeaveIndicator(e) {
  const indicator = e.currentTarget;
  indicator.style.background = 'transparent';
  indicator.style.height = '6px';
}

function _visuDragEnter(e) {
  e.preventDefault();
}

function _visuDragLeave(e) {
  const card = e.currentTarget;
  card.style.boxShadow = '';
  card.style.transform = '';
  card.style.borderTop = '2px solid transparent';
  card.style.borderBottom = '2px solid transparent';
}

// Helper pour obtenir la bonne source de données (hiérarchie si disponible, sinon clientProgram)
function _getVisuDataSource() {
  return typeof getVisibleMicros === 'function' ? getVisibleMicros() : clientProgram;
}

// Helper pour obtenir le micro depuis la bonne source
function _getCycleFromVisuSource(cycleId) {
  const source = _getVisuDataSource();
  return source.find(x => x.id === cycleId);
}

async function _visuDrop(e, cycleId, targetSess, macroId, mesoId) {
  e.preventDefault();
  const card = e.currentTarget;
  card.style.boxShadow = '';
  card.style.transform = '';
  card.style.borderTop = '2px solid transparent';
  card.style.borderBottom = '2px solid transparent';
  
  // Reset end indicator
  const endIndicator = document.querySelector('.visu-drop-indicator[data-pos="end"]');
  if (endIndicator) {
    endIndicator.style.background = 'transparent';
    endIndicator.style.height = '6px';
  }
  
  // Reset opacity on all cards
  document.querySelectorAll('.visu-sess-card').forEach(c => {
    c.style.opacity = '1';
    c.style.transform = '';
    c.style.borderTop = '2px solid transparent';
    c.style.borderBottom = '2px solid transparent';
  });
  
  if (!_visuDraggedSess || _visuDraggedSess === targetSess) {
    _visuDraggedSess = null;
    _visuDropPosition = null;
    return;
  }
  
  // Utiliser macroId et mesoId si disponibles pour trouver le bon micro
  let c;
  if (macroId && mesoId && typeof getMicroById === 'function') {
    c = getMicroById(macroId, mesoId, cycleId);
  } else {
    c = _getCycleFromVisuSource(cycleId);
  }
  
  if (!c || !c.sessions) {
    _visuDraggedSess = null;
    _visuDropPosition = null;
    return;
  }
  
  // Get current order
  let allSessions = Object.keys(c.sessions).sort();
  const fromIndex = allSessions.indexOf(_visuDraggedSess);
  let toIndex = allSessions.indexOf(targetSess);
  
  if (fromIndex === -1 || toIndex === -1) {
    _visuDraggedSess = null;
    _visuDropPosition = null;
    return;
  }
  
  // Adjust target index based on drop position
  if (_visuDropPosition === 'after' && fromIndex > toIndex) {
    toIndex++;
  } else if (_visuDropPosition === 'before' && fromIndex < toIndex) {
    toIndex--;
  }
  
  // Ensure valid index
  if (toIndex < 0) toIndex = 0;
  if (toIndex > allSessions.length - 1) toIndex = allSessions.length - 1;
  
  // Reorder array
  const [moved] = allSessions.splice(fromIndex, 1);
  allSessions.splice(toIndex, 0, moved);
  
  // Reassign letters A, B, C... based on new order
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const newSessions = {};
  const newSessionsActive = [];
  
  allSessions.forEach((oldKey, i) => {
    const newKey = letters[i];
    newSessions[newKey] = c.sessions[oldKey];
    if (c.sessions_active && c.sessions_active.includes(oldKey)) {
      newSessionsActive.push(newKey);
    }
  });
  
  c.sessions = newSessions;
  c.sessions_active = newSessionsActive;
  
  // Synchroniser si on utilise la hiérarchie
  if (macroId && mesoId && typeof syncClientProgram === 'function') {
    syncClientProgram();
  }
  
  _visuDraggedSess = null;
  _visuDropPosition = null;
  
  try {
    await saveClientProgram();
    renderVisu();
    toast('Ordre des séances mis à jour !', 's');
  } catch (err) {
    toast('Erreur lors de la mise à jour', 'e');
  }
}

async function _visuDropAtEnd(e, cycleId, macroId, mesoId) {
  e.preventDefault();
  e.stopPropagation();
  
  // Reset indicator
  const indicator = e.currentTarget;
  indicator.style.background = 'transparent';
  indicator.style.height = '6px';
  
  // Reset all cards
  document.querySelectorAll('.visu-sess-card').forEach(c => {
    c.style.opacity = '1';
    c.style.transform = '';
    c.style.borderTop = '2px solid transparent';
    c.style.borderBottom = '2px solid transparent';
  });
  
  if (!_visuDraggedSess) return;
  
  // Utiliser macroId et mesoId si disponibles pour trouver le bon micro
  let c;
  if (macroId && mesoId && typeof getMicroById === 'function') {
    c = getMicroById(macroId, mesoId, cycleId);
  } else {
    c = _getCycleFromVisuSource(cycleId);
  }
  
  if (!c || !c.sessions) return;
  
  // Get current order
  let allSessions = Object.keys(c.sessions).sort();
  const fromIndex = allSessions.indexOf(_visuDraggedSess);
  
  if (fromIndex === -1) {
    _visuDraggedSess = null;
    return;
  }
  
  // Move to end
  const [moved] = allSessions.splice(fromIndex, 1);
  allSessions.push(moved);
  
  // Reassign letters A, B, C...
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const newSessions = {};
  const newSessionsActive = [];
  
  allSessions.forEach((oldKey, i) => {
    const newKey = letters[i];
    newSessions[newKey] = c.sessions[oldKey];
    if (c.sessions_active && c.sessions_active.includes(oldKey)) {
      newSessionsActive.push(newKey);
    }
  });
  
  c.sessions = newSessions;
  c.sessions_active = newSessionsActive;
  
  // Synchroniser si on utilise la hiérarchie
  if (macroId && mesoId && typeof syncClientProgram === 'function') {
    syncClientProgram();
  }
  
  _visuDraggedSess = null;
  _visuDropPosition = null;
  
  try {
    await saveClientProgram();
    renderVisu();
    toast('Séance déplacée à la fin !', 's');
  } catch (err) {
    toast('Erreur lors de la mise à jour', 'e');
  }
}

// ═══════════════════════════════════════════════════════════
// DUPLICATION DE CYCLE
// ═══════════════════════════════════════════════════════════
let _dupCycleSourceId = null;

function openDupCycleModal(cycleId) {
  const c = clientProgram.find(x => x.id === cycleId);
  if (!c) return;
  
  _dupCycleSourceId = cycleId;
  document.getElementById('dup-cycle-source').innerHTML = `C${c.id} — ${h(c.focus)}`;
  document.getElementById('dup-new-name').value = c.focus + ' (copie)';
  
  // Remplir la liste des cycles existants (tous sauf le source)
  const list = document.getElementById('dup-existing-list');
  const otherCycles = clientProgram.filter(x => x.id !== cycleId);
  
  if (otherCycles.length === 0) {
    list.innerHTML = '<p style="font-size:.7rem;color:var(--muted);font-style:italic">Aucun autre cycle disponible</p>';
  } else {
    list.innerHTML = otherCycles.map(cycle => `
      <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.25rem">
        <input type="checkbox" value="${cycle.id}" class="dup-target-checkbox">
        <span style="font-size:.8rem;font-family:'Barlow Condensed',sans-serif">C${cycle.id} — ${h(cycle.focus)}</span>
      </label>
    `).join('');
  }
  
  // Reset à "nouveau cycle" par défaut
  document.querySelector('input[name="dup-dest"][value="new"]').checked = true;
  toggleDupDest();
  
  openModal('modal-dup-cycle');
}

function toggleDupDest() {
  const isNew = document.querySelector('input[name="dup-dest"][value="new"]').checked;
  document.getElementById('dup-new-section').classList.toggle('hidden', !isNew);
  document.getElementById('dup-existing-section').classList.toggle('hidden', isNew);
  
  const btn = document.getElementById('dup-cycle-btn');
  btn.innerText = isNew ? 'DUPLIQUER' : 'DUPLIQUER (ÉCRASER)';
  btn.className = isNew ? 'btn btn-primary' : 'btn btn-danger';
}

async function executeDupCycle() {
  const sourceCycle = clientProgram.find(x => x.id === _dupCycleSourceId);
  if (!sourceCycle) return;
  
  const isNew = document.querySelector('input[name="dup-dest"][value="new"]').checked;
  
  if (isNew) {
    // Créer un nouveau cycle
    const newName = document.getElementById('dup-new-name').value.trim();
    if (!newName) {
      toast('Veuillez entrer un nom pour le nouveau cycle', 'w');
      return;
    }
    
    const newId = Math.max(0, ...clientProgram.map(c => c.id)) + 1;
    const newCycle = {
      id: newId,
      focus: newName,
      sessions: JSON.parse(JSON.stringify(sourceCycle.sessions)),
      sessions_active: JSON.parse(JSON.stringify(sourceCycle.sessions_active)),
      unlock: false
    };
    
    clientProgram.push(newCycle);
    
    try {
      await saveClientProgram();
      populateVisuSelect();
      _visuSelectedCycle = newId;
      setVisuCycle(newId);
      closeModal('modal-dup-cycle');
      toast(`Cycle C${newId} créé avec succès !`, 's');
    } catch (err) {
      toast('Erreur lors de la création du cycle', 'e');
    }
  } else {
    // Dupliquer vers cycles existants
    const checkboxes = document.querySelectorAll('.dup-target-checkbox:checked');
    if (checkboxes.length === 0) {
      toast('Veuillez sélectionner au moins un cycle cible', 'w');
      return;
    }
    
    const targetIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    // Avertissement supplémentaire
    if (!confirm(`Êtes-vous sûr de vouloir écraser ${targetIds.length} cycle(s) avec les données du cycle C${sourceCycle.id} ? Cette action est irréversible.`)) {
      return;
    }
    
    let updatedCount = 0;
    targetIds.forEach(targetId => {
      const targetCycle = clientProgram.find(x => x.id === targetId);
      if (targetCycle) {
        targetCycle.sessions = JSON.parse(JSON.stringify(sourceCycle.sessions));
        targetCycle.sessions_active = JSON.parse(JSON.stringify(sourceCycle.sessions_active));
        updatedCount++;
      }
    });
    
    try {
      await saveClientProgram();
      renderVisu();
      closeModal('modal-dup-cycle');
      toast(`${updatedCount} cycle(s) mis à jour`, 's');
    } catch (err) {
      toast('Erreur lors de la duplication', 'e');
    }
  }
}

// Exports
window.deleteSession = deleteSession;
window._visuDragStart = _visuDragStart;
window._visuDragOverCard = _visuDragOverCard;
window._visuDragOverIndicator = _visuDragOverIndicator;
window._visuDragLeaveIndicator = _visuDragLeaveIndicator;
window._visuDragEnter = _visuDragEnter;
window._visuDragLeave = _visuDragLeave;
window._visuDrop = _visuDrop;
window._visuDropAtEnd = _visuDropAtEnd;
