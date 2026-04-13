// COACH-BASEPROGRAMS-VISU.JS - Copie exacte de coach-visu.js adaptée pour les programmes de base

// Variables globales
window._bpVisuMode = 'same-cycle';
window._bpVisuSess = 'A';
window._bpVisuSelectedCycles = new Set();
window._bpVisuSelectedMacro = null;
window._bpVisuSelectedMeso = null;
window._bpVisuSelectedCycle = null;

let _bpVisuDragSess = null;

function bpPopulateVisuSelect() {
  // Calculate available sessions from filtered micros
  const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  let filteredMicros = allMicros;
  if (_bpVisuSelectedMacro) {
    filteredMicros = filteredMicros.filter(m => m.macroId === _bpVisuSelectedMacro);
  }
  if (_bpVisuSelectedMeso) {
    filteredMicros = filteredMicros.filter(m => m.mesoId === _bpVisuSelectedMeso);
  }
  
  // Get all unique session letters from filtered micros
  const availableSessions = new Set();
  filteredMicros.forEach(m => {
    const sessions = typeof bpGetAllSessions === 'function' ? bpGetAllSessions(m) : (m.sessions_active || []);
    sessions.forEach(s => availableSessions.add(s));
  });
  const sortedSessions = [...availableSessions].sort();
  
  // If current visuSess is not in available sessions, set to first available
  if (sortedSessions.length > 0 && !availableSessions.has(_bpVisuSess)) {
    _bpVisuSess = sortedSessions[0];
  }
  
  // Render session buttons dynamically
  const sessContainer = document.querySelector('#bp-visu-ctrl-sess div');
  if (sessContainer) {
    if (sortedSessions.length === 0) {
      sessContainer.innerHTML = '<span style="font-size:.65rem;color:var(--muted)">Aucune séance</span>';
    } else {
      sessContainer.innerHTML = sortedSessions.map(s => 
        `<button onclick="bpSetVisuSess('${s}')" id="bp-vs-${s}" class="tab-pill ${s===_bpVisuSess?'on':'off'}" style="padding:.3rem .875rem;font-size:.65rem">${s}</button>`
      ).join('');
    }
  }
  
  const hierarchyLevel = typeof bpGetHierarchyLevel === 'function' ? bpGetHierarchyLevel() : 'macro';
  
  const macroBtns = document.getElementById('bp-visu-macro-btns');
  const mesoBtns = document.getElementById('bp-visu-meso-btns');
  const microBtns = document.getElementById('bp-visu-cycle-btns');
  const macroCtrl = document.getElementById('bp-visu-ctrl-macro');
  const mesoCtrl = document.getElementById('bp-visu-ctrl-meso');
  const microCtrl = document.getElementById('bp-visu-ctrl-cycle');
  
  if (!microBtns) return;
  
  const allMacros = typeof bpGetAllMacros === 'function' ? bpGetAllMacros() : [];
  
  // Mode micro seul
  if (hierarchyLevel === 'micro') {
    if (macroCtrl) macroCtrl.style.display = 'none';
    if (mesoCtrl) mesoCtrl.style.display = 'none';
    if (microCtrl) microCtrl.style.display = _bpVisuMode === 'same-cycle' ? 'flex' : 'none';
    
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
    
    if (_bpVisuMode === 'same-cycle') {
      if (!_bpVisuSelectedCycle || !allMicros.find(m => m.id === _bpVisuSelectedCycle)) {
        _bpVisuSelectedCycle = allMicros[0]?.id || null;
      }
      
      microBtns.innerHTML = allMicros.filter(m => !m.archived).map(m => {
        const isSel = m.id === _bpVisuSelectedCycle;
        return `<button onclick="bpSetVisuCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">C${m.id}</button>`;
      }).join('');
    }
    
    const chk = document.getElementById('bp-visu-ctrl-cycles-check');
    if (chk) {
      chk.innerHTML = allMicros.filter(m => !m.archived).map(c => {
        const focusText = c.focus ? bpH(c.focus.substring(0,12)) : 'Sans nom';
        return `<button onclick="bpToggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${focusText}</button>`;
      }).join('');
    }
    return;
  }
  
  // Mode meso+micro
  if (hierarchyLevel === 'meso') {
    if (macroCtrl) macroCtrl.style.display = 'none';
    if (mesoCtrl) mesoCtrl.style.display = 'flex';
    if (microCtrl) microCtrl.style.display = _bpVisuMode === 'same-cycle' ? 'flex' : 'none';
    
    const firstMacro = allMacros[0];
    const mesos = firstMacro?.mesos || [];
    
    if (!_bpVisuSelectedMeso || !mesos.find(m => m.id === _bpVisuSelectedMeso)) {
      _bpVisuSelectedMeso = mesos[0]?.id || null;
    }
    
    if (mesoBtns) {
      mesoBtns.innerHTML = mesos.filter(m => !m.archived).map(m => {
        const isSel = m.id === _bpVisuSelectedMeso;
        return `<button onclick="bpSetVisuMeso(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">ME${m.id}</button>`;
      }).join('');
    }
    
    const selectedMeso = mesos.find(m => m.id === _bpVisuSelectedMeso);
    const micros = selectedMeso?.micros || [];
    
    if (_bpVisuMode === 'same-cycle') {
      if (!_bpVisuSelectedCycle || !micros.find(m => m.id === _bpVisuSelectedCycle)) {
        _bpVisuSelectedCycle = micros[0]?.id || null;
      }
      
      microBtns.innerHTML = micros.filter(m => !m.archived).map(m => {
        const isSel = m.id === _bpVisuSelectedCycle;
        return `<button onclick="bpSetVisuCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">C${m.id}</button>`;
      }).join('');
    }
    
    const chk = document.getElementById('bp-visu-ctrl-cycles-check');
    if (chk) {
      chk.innerHTML = micros.filter(m => !m.archived).map(c =>
        `<button onclick="bpToggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${bpH(c.focus.substring(0,12))}</button>`
      ).join('');
    }
    return;
  }
  
  // Mode macro+meso+micro complet
  if (macroCtrl) macroCtrl.style.display = 'flex';
  if (mesoCtrl) mesoCtrl.style.display = 'flex';
  if (microCtrl) microCtrl.style.display = _bpVisuMode === 'same-cycle' ? 'flex' : 'none';
  
  if (!macroBtns || !mesoBtns) return;
  
  if (!_bpVisuSelectedMacro && allMacros.length > 0) {
    _bpVisuSelectedMacro = allMacros[0].id;
  }
  
  macroBtns.innerHTML = allMacros.filter(m => !m.archived).map(m => {
    const isSel = m.id === _bpVisuSelectedMacro;
    return `<button onclick="bpSetVisuMacro(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">M${m.id}</button>`;
  }).join('');
  
  const selectedMacro = allMacros.find(m => m.id === _bpVisuSelectedMacro);
  const mesos = selectedMacro?.mesos || [];
  
  if ((!_bpVisuSelectedMeso || !mesos.find(m => m.id === _bpVisuSelectedMeso)) && mesos.length > 0) {
    _bpVisuSelectedMeso = mesos[0].id;
  }
  
  mesoBtns.innerHTML = mesos.filter(m => !m.archived).map(m => {
    const isSel = m.id === _bpVisuSelectedMeso;
    return `<button onclick="bpSetVisuMeso(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">ME${m.id}</button>`;
  }).join('');
  
  const selectedMeso = mesos.find(m => m.id === _bpVisuSelectedMeso);
  const micros = selectedMeso?.micros || [];
  
  if (_bpVisuMode === 'same-cycle') {
    if (!_bpVisuSelectedCycle || !micros.find(m => m.id === _bpVisuSelectedCycle)) {
      _bpVisuSelectedCycle = micros[0]?.id || null;
    }
    
    microBtns.innerHTML = micros.filter(m => !m.archived).map(m => {
      const isSel = m.id === _bpVisuSelectedCycle;
      return `<button onclick="bpSetVisuCycle(${m.id})" class="tab-pill ${isSel?'on':'off'}" style="padding:.4rem .875rem;font-size:.7rem">C${m.id}</button>`;
    }).join('');
  }
  
  const chk = document.getElementById('bp-visu-ctrl-cycles-check');
  if (chk) {
    chk.innerHTML = micros.filter(m => !m.archived).map(c =>
      `<button onclick="bpToggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${bpH(c.focus.substring(0,12))}</button>`
    ).join('');
  }
}

function bpSetVisuMacro(macroId) {
  _bpVisuSelectedMacro = macroId;
  _bpVisuSelectedMeso = null;
  _bpVisuSelectedCycle = null;
  bpPopulateVisuSelect();
  bpRenderVisu();
}

function bpSetVisuMeso(mesoId) {
  _bpVisuSelectedMeso = mesoId;
  _bpVisuSelectedCycle = null;
  bpPopulateVisuSelect();
  bpRenderVisu();
}

function bpSetVisuCycle(cycleId) {
  _bpVisuSelectedCycle = cycleId;
  _bpSelectedCycle = cycleId;
  bpPopulateVisuSelect();
  bpRenderVisu();
}

function bpToggleVisuCycle(id, btn) {
  if (_bpVisuSelectedCycles.has(id)) {
    _bpVisuSelectedCycles.delete(id);
    if (btn) {
      btn.style.borderColor = 'var(--border)';
      btn.style.background = 'var(--surface)';
      btn.style.color = 'var(--muted)';
    }
  } else {
    _bpVisuSelectedCycles.add(id);
    if (btn) {
      btn.style.borderColor = 'rgba(240,165,0,.5)';
      btn.style.background = 'rgba(240,165,0,.1)';
      btn.style.color = 'var(--gold)';
    }
  }
  bpRenderVisu();
}

function bpSetVisuMode(m) {
  _bpVisuMode = m;
  ['same-cycle','cross-sess','all'].forEach(k => {
    const btn = document.getElementById('bp-vm-'+k);
    if (btn) btn.className = 'tab-pill '+(k===m?'on':'off');
  });
  
  const hierarchyLevel = typeof bpGetHierarchyLevel === 'function' ? bpGetHierarchyLevel() : 'macro';
  
  const mc = document.getElementById('bp-visu-ctrl-macro');
  const me = document.getElementById('bp-visu-ctrl-meso');
  const cc = document.getElementById('bp-visu-ctrl-cycle');
  const cs = document.getElementById('bp-visu-ctrl-sess');
  const cck = document.getElementById('bp-visu-ctrl-cycles-check');
  
  if (hierarchyLevel === 'micro') {
    if (mc) mc.style.display = 'none';
    if (me) me.style.display = 'none';
    if (cc) cc.style.display = m === 'same-cycle' ? 'flex' : 'none';
    if (cs) cs.style.display = m === 'cross-sess' ? 'flex' : 'none';
    if (cck) cck.style.display = (m === 'all' || m === 'cross-sess') ? 'flex' : 'none';
  } else if (hierarchyLevel === 'meso') {
    if (mc) mc.style.display = 'none';
    if (me) me.style.display = 'flex';
    if (cc) cc.style.display = m === 'same-cycle' ? 'flex' : 'none';
    if (cs) cs.style.display = m === 'cross-sess' ? 'flex' : 'none';
    if (cck) cck.style.display = (m === 'all' || m === 'cross-sess') ? 'flex' : 'none';
  } else {
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
  bpPopulateVisuSelect();
  bpRenderVisu();
}

function bpSetVisuSess(s) {
  _bpVisuSess = s;
  // Update all bp-vs-* buttons dynamically
  document.querySelectorAll('[id^="bp-vs-"]').forEach(btn => {
    const letter = btn.id.replace('bp-vs-', '');
    btn.className = 'tab-pill ' + (letter === s ? 'on' : 'off');
  });
  bpRenderVisu();
}

// Groupement des exercices (supersets)
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

function bpVisuExRowHTML(e, col, isClassic) {
  const isEnergetic = e.exType === 'energetique';
  const lightning = isEnergetic ? '⚡' : '';
  const nameColor = isEnergetic ? '#60a5fa' : 'var(--text)';
  
  if (isEnergetic) {
    const params = [];
    if (e.sets) params.push(`${e.sets} séries`);
    if (e.reps) params.push(`${e.reps} reps`);
    if (e.workTime && e.restTime) params.push(`(${e.workTime}/${e.restTime})`);
    if (e.restSet) params.push(`- ${e.restSet} r`);
    
    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .65rem;background:var(--surface);border-radius:.65rem;margin-bottom:.25rem;flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;flex:1;min-width:80px;color:${nameColor}">${lightning} ${bpH(e.name)}</span>
      <span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">${params.join(' ')}</span>
      ${e.rpeTarget?`<span style="font-size:.55rem;color:var(--gold);background:rgba(240,165,0,.1);padding:.1rem .4rem;border-radius:.3rem">RPE${bpH(e.rpeTarget)}</span>`:''}
    </div>`;
  } else {
    return `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .65rem;background:var(--surface);border-radius:.65rem;margin-bottom:.25rem;flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;flex:1;min-width:80px">${bpH(e.name)}</span>
      ${isClassic ? `
        ${e.sets?`<span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">${e.sets}×</span>`:''}
        ${e.reps?`<span style="font-size:.6rem;color:${col};font-family:'Barlow Condensed',sans-serif;font-weight:700">${bpH(e.reps)}</span>`:''}
        ${e.restSet?`<span style="font-size:.55rem;color:var(--muted);background:var(--card);padding:.1rem .4rem;border-radius:.3rem">R:${bpH(e.restSet)}</span>`:''}
        ${e.rpeTarget?`<span style="font-size:.55rem;color:var(--gold);background:rgba(240,165,0,.1);padding:.1rem .4rem;border-radius:.3rem">RPE${bpH(e.rpeTarget)}</span>`:''}
      ` : `
        ${e.reps?`<span style="font-size:.65rem;color:${col};font-family:'Barlow Condensed',sans-serif;font-weight:700">${bpH(e.reps)}</span>`:''}
      `}
    </div>`;
  }
}

function bpVisuExListHTML(exs, sp, col, cycleId, sessType) {
  const isClassic = sp.mode === 'classic';
  if (!exs.length) return '<p style="font-size:.7rem;color:var(--muted);font-style:italic">Aucun exercice.</p>';
  const groups = bpGroupExercises(exs);

  return groups.map(g => {
    if (g.type === 'superset') {
      const inner = g.items.map(item => bpVisuExRowHTML(item.ex, col, isClassic)).join('');
      return `<div style="border:1px solid rgba(240,165,0,.3);border-radius:.75rem;padding:.5rem;background:rgba(240,165,0,.03);margin-bottom:.3rem">
        <div style="font-size:.55rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.35rem">⇄ SUPERSET</div>
        ${inner}
      </div>`;
    } else {
      return bpVisuExRowHTML(g.ex, col, isClassic);
    }
  }).join('');
}

function bpRenderVisu() {
  const el = document.getElementById('bp-visu-content'); if (!el) return;
  
  // Utiliser la hiérarchie si disponible - filtrer par macro/meso sélectionnés
  let allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : (_bpProgramData?.cycles || []);
  
  // Filtrer par macro et meso sélectionnés pour ne pas mélanger les cycles
  if (_bpVisuSelectedMacro) {
    allMicros = allMicros.filter(m => m.macroId === _bpVisuSelectedMacro);
  }
  if (_bpVisuSelectedMeso) {
    allMicros = allMicros.filter(m => m.mesoId === _bpVisuSelectedMeso);
  }

  if (_bpVisuMode === 'same-cycle') {
    const cId = _bpVisuSelectedCycle || _bpSelectedCycle || (allMicros[0]?.id);
    const c = allMicros.find(x => x.id === cId);
    if (!c) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Sélectionnez un cycle.</p>'; return; }
    const active = typeof bpGetAllSessions === 'function' ? bpGetAllSessions(c) : (c.sessions_active || []);
    const macroId = c.macroId || '';
    const mesoId = c.mesoId || '';
    el.innerHTML = `<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;flex-wrap:wrap">
      <h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin:0">CYCLE ${c.id} — ${bpH(c.focus)}</h5>
      <button onclick="bpVisuDupCycle(${c.id})" class="btn btn-gold btn-sm" style="font-size:.7rem">⧉ Dupliquer cycle</button>
    </div>
    <div id="bp-visu-sessions-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;position:relative">
      ${active.map((t,ti) => {
        const sp = bpGetSessParams(c,t); const exs = bpGetSessEx(c,t); const col = bpGetSessColor(t,ti);
        return `
        <div class="card visu-sess-card" data-sess="${t}" data-index="${ti}" draggable="true" ondragstart="_bpVisuDragStart(event, '${t}')" ondragover="_bpVisuDragOverCard(event, '${t}')" ondrop="_bpVisuDrop(event, ${c.id}, '${t}', ${macroId}, ${mesoId})" ondragenter="_bpVisuDragEnter(event)" ondragleave="_bpVisuDragLeave(event)" style="overflow:hidden;transition:transform .2s,box-shadow .2s,border .2s;cursor:grab;position:relative;border:2px solid transparent">
          <div style="background:${col};padding:1rem;display:flex;align-items:center;gap:.5rem">
            <span style="cursor:grab;padding:.25rem;color:rgba(255,255,255,.5);font-size:1.2rem">⋮⋮</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;color:white">SÉANCE ${t}</span>
            <span style="font-size:1.5rem;color:white;padding:0 .3rem">${sp.mode==='classic'?'≡':'⟳'}</span>
            <div style="margin-left:auto;display:flex;gap:.5rem">
              <button onclick="bpVisuOpenEditor(${c.id},'${t}',${macroId},${mesoId})" style="background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.4);color:white;border-radius:.5rem;padding:.4rem .5rem;font-size:1rem;cursor:pointer;backdrop-filter:blur(4px)" title="Modifier">✏️</button>
              <button onclick="bpVisuDupSession(${c.id},'${t}',${macroId},${mesoId})" style="background:#3b82f6;border:1px solid rgba(255,255,255,0.3);color:white;border-radius:.5rem;padding:.4rem .5rem;font-size:1rem;cursor:pointer" title="Dupliquer">⧉</button>
              <button onclick="bpDeleteSession(${c.id},'${t}',${macroId},${mesoId})" style="background:#ef4444;border:1px solid rgba(255,255,255,0.3);color:white;border-radius:.5rem;padding:.4rem .5rem;font-size:1rem;cursor:pointer" title="Supprimer">🗑️</button>
            </div>
          </div>
          <div style="padding:1rem">
            ${sp.mode==='circuit'?`<div style="display:flex;gap:.5rem;margin-bottom:.75rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>`:''}
            ${bpVisuExListHTML(exs, sp, col, c.id, t)}
          </div>
        </div>`;
      }).join('')}
      <div class="bp-visu-drop-indicator" data-pos="end" ondragover="_bpVisuDragOverIndicator(event, 'end')" ondragleave="_bpVisuDragLeaveIndicator(event)" ondrop="_bpVisuDropAtEnd(event, ${c.id}, ${macroId}, ${mesoId})" style="grid-column:1 / -1;height:6px;margin:-4px 0;background:transparent;border-radius:3px;transition:all .2s;pointer-events:auto"></div>
      <div onclick="bpVisuAddSession(${c.id}, ${macroId}, ${mesoId})" style="cursor:pointer;border:2px dashed var(--border);border-radius:1rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem;padding:2rem;min-height:160px;transition:all .2s;background:transparent" onmouseover="this.style.borderColor='rgba(240,165,0,.5)';this.style.background='rgba(240,165,0,.03)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='transparent'">
        <span style="font-size:2rem;color:var(--muted)">+</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Ajouter une séance</span>
      </div>
    </div>`;

  } else if (_bpVisuMode === 'cross-sess') {
    const selCycles = Array.from(_bpVisuSelectedCycles);
    if (!selCycles.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>'; return; }
    const col = bpGetSessColor(_bpVisuSess);
    el.innerHTML = `<h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">SÉANCE ${_bpVisuSess} — ${selCycles.length} cycle(s)</h5>
    <div style="display:flex;flex-direction:column;gap:1.25rem">
      ${selCycles.map(cId => {
        const c = allMicros.find(x => x.id === cId); if (!c) return '';
        const sp = bpGetSessParams(c, _bpVisuSess); const exs = bpGetSessEx(c, _bpVisuSess);
        const active = typeof bpGetAllSessions === 'function' ? bpGetAllSessions(c) : (c.sessions_active || []);
        if (!active.includes(_bpVisuSess)) return `<div class="card" style="overflow:hidden;opacity:.5">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-size:.7rem;color:var(--muted);font-style:italic">Séance ${_bpVisuSess} non configurée</span>
          </div></div>`;
        const macroId3 = c.macroId || '';
        const mesoId3 = c.mesoId || '';
        return `<div class="card" style="overflow:hidden">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;font-style:italic;color:var(--muted)">${bpH(c.focus)}</span>
            <span style="font-size:1.5rem;color:white;padding:0 .3rem">${sp.mode==='classic'?'≡':'⟳'}</span>
            <button onclick="bpVisuOpenEditor(${c.id},'${_bpVisuSess}',${macroId3},${mesoId3})" style="margin-left:auto;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted);border-radius:.5rem;padding:.25rem .6rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;cursor:pointer">✏️ Modifier</button>
          </div>
          <div style="padding:1rem">
            ${sp.mode==='circuit'?`<div style="display:flex;gap:.5rem;margin-bottom:.5rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>`:''}
            ${bpVisuExListHTML(exs, sp, col, c.id, _bpVisuSess)}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  } else {
    const selCycles = Array.from(_bpVisuSelectedCycles);
    if (!selCycles.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>'; return; }
    el.innerHTML = selCycles.map(cId => {
      const c = allMicros.find(x => x.id === cId); if (!c) return '';
      const active = typeof bpGetAllSessions === 'function' ? bpGetAllSessions(c) : (c.sessions_active || []);
      const macroId4 = c.macroId || '';
      const mesoId4 = c.mesoId || '';
      return `<div style="margin-bottom:2.5rem">
        <h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">CYCLE ${c.id} — ${bpH(c.focus)}</h5>
        <div style="overflow-x:auto">
          <table class="tbl" style="width:100%;background:var(--card);border-radius:1rem;overflow:hidden">
            <thead><tr>
              <th>Exercice</th>
              ${active.map((t,ti)=>{const col=bpGetSessColor(t,ti);return `<th style="color:${col}">Séance ${t} <button onclick="bpVisuOpenEditor(${c.id},'${t}',${macroId4},${mesoId4})" style="background:none;border:none;color:${col};cursor:pointer;font-size:.65rem">✏️</button></th>`;}).join('')}
            </tr></thead>
            <tbody>
              ${(()=>{
                const maxEx = Math.max(1, ...active.map(t => bpGetSessEx(c,t).length));
                return Array.from({length:maxEx},(_,i)=>`<tr class="db-row">
                  <td style="font-size:.75rem;color:var(--muted)">Ex ${i+1}</td>
                  ${active.map((t,ti) => {
                    const e = bpGetSessEx(c,t)[i];
                    const sp = bpGetSessParams(c,t);
                    const col = bpGetSessColor(t,ti);
                    return e ? `<td>
                      ${e.superset?`<span style="font-size:.6rem;color:var(--gold)">⇄ </span>`:''}
                      <div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700">${bpH(e.name)}</div>
                      ${sp.mode==='classic'&&(e.sets||e.reps)?`<div style="font-size:.6rem;color:${col};margin-top:.15rem">${e.sets?e.sets+'× ':''} ${e.reps||''} ${e.rpeTarget?'RPE'+e.rpeTarget:''}</div>`:''}
                      ${sp.mode!=='classic'&&e.reps?`<div style="font-size:.65rem;color:${col}">${bpH(e.reps)}</div>`:''}
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

// Actions sur les séances
function bpVisuOpenEditor(cycleId, sessType, macroId, mesoId) {
  _bpSelectedCycle = cycleId;
  _bpSelectedSess = sessType;
  
  // Si macroId et mesoId sont passés explicitement, les utiliser
  if (macroId && mesoId) {
    window._bpHierarchy.currentMacro = macroId;
    window._bpHierarchy.currentMeso = mesoId;
    window._bpHierarchy.currentMicro = cycleId;
    bpRenderHierarchy();
  } else {
    // Fallback: chercher le micro pour récupérer ses IDs
    const allMicros = typeof bpGetAllMicros === 'function' ? bpGetAllMicros() : [];
    const micro = allMicros.find(m => m.id === cycleId);
    if (micro && micro.macroId && micro.mesoId) {
      window._bpHierarchy.currentMacro = micro.macroId;
      window._bpHierarchy.currentMeso = micro.mesoId;
      window._bpHierarchy.currentMicro = cycleId;
      bpRenderHierarchy();
    }
  }
  
  bpSyncEditor();
  switchBaseProgramSubTab('editor');
}

async function bpVisuAddSession(cycleId, macroId, mesoId) {
  // Obtenir le micro ORIGINAL dans la hiérarchie
  const micro = bpGetMicroFromHierarchy(cycleId, macroId, mesoId);
  if (!micro) {
    toast('Cycle non trouvé dans la hiérarchie', 'e');
    return;
  }
  
  const active = bpGetActiveSessions(micro);
  const availableLetters = ['A','B','C','D','E','F','G','H'].filter(l => !active.includes(l));
  
  if (availableLetters.length === 0) {
    toast('Ce cycle a déjà toutes les séances (A-H)', 'w');
    return;
  }
  
  const letter = availableLetters[0];
  const sessionData = { rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: [] };
  
  if (!micro.sessions) micro.sessions = {};
  if (!micro.sessions_active) micro.sessions_active = [];
  micro.sessions_active.push(letter);
  micro.sessions_active.sort();
  micro.sessions[letter] = sessionData;
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRenderVisu();
    toast(`Séance ${letter} créée !`, 's');
  } catch(e) {
    toast('Erreur création séance', 'e');
  }
}

async function bpVisuDupSession(cycleId, sessType, macroId, mesoId) {
  // Obtenir le micro ORIGINAL dans la hiérarchie
  const micro = bpGetMicroFromHierarchy(cycleId, macroId, mesoId);
  if (!micro) {
    toast('Cycle non trouvé dans la hiérarchie', 'e');
    return;
  }
  
  const active = typeof bpGetAllSessions === 'function' ? bpGetAllSessions(micro) : (micro.sessions_active || []);
  const availableLetters = ['A','B','C','D','E','F','G','H'].filter(l => !active.includes(l));
  
  if (availableLetters.length === 0) {
    toast('Plus de place dans ce cycle', 'w');
    return;
  }
  
  const newLetter = availableLetters[0];
  
  if (!micro.sessions) micro.sessions = {};
  micro.sessions[newLetter] = JSON.parse(JSON.stringify(micro.sessions[sessType] || {}));
  if (!micro.sessions_active) micro.sessions_active = [];
  micro.sessions_active.push(newLetter);
  micro.sessions_active.sort();
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRenderVisu();
    toast(`Séance ${sessType} dupliquée en ${newLetter} !`, 's');
  } catch(e) {
    toast('Erreur duplication', 'e');
  }
}

// Helper pour obtenir le micro original dans la hiérarchie avec macroId et mesoId
function bpGetMicroFromHierarchy(cycleId, macroId, mesoId) {
  if (!_bpProgramData?.hierarchy?.macros) return null;
  
  // Si macroId et mesoId sont fournis, chercher précisément
  if (macroId && mesoId) {
    const macro = _bpProgramData.hierarchy.macros.find(m => m.id === macroId);
    if (!macro) return null;
    const meso = (macro.mesos || []).find(m => m.id === mesoId);
    if (!meso) return null;
    return (meso.micros || []).find(m => m.id === cycleId) || null;
  }
  
  // Sinon, fallback sur la recherche globale (ancien comportement)
  for (const macro of _bpProgramData.hierarchy.macros) {
    for (const meso of (macro.mesos || [])) {
      for (const micro of (meso.micros || [])) {
        if (micro.id === cycleId) {
          return micro;
        }
      }
    }
  }
  return null;
}

async function bpDeleteSession(cycleId, sessType, macroId, mesoId) {
  if (!confirm(`Supprimer la séance ${sessType} ?`)) return;
  
  // Obtenir le micro ORIGINAL dans la hiérarchie avec macroId et mesoId
  const micro = bpGetMicroFromHierarchy(cycleId, macroId, mesoId);
  if (!micro) {
    // Fallback sur cycles plats si pas de hiérarchie
    const c = (_bpProgramData?.cycles || []).find(x => x.id === cycleId);
    if (!c) return;
    
    if (c.sessions_active) {
      c.sessions_active = c.sessions_active.filter(s => s !== sessType);
    }
    if (c.sessions && c.sessions[sessType]) {
      delete c.sessions[sessType];
    }
  } else {
    // Modifier directement dans la hiérarchie
    if (micro.sessions_active) {
      micro.sessions_active = micro.sessions_active.filter(s => s !== sessType);
    }
    if (micro.sessions && micro.sessions[sessType]) {
      delete micro.sessions[sessType];
    }
  }
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRenderVisu();
    toast(`Séance ${sessType} supprimée`, 's');
  } catch(e) {
    console.error(e);
    toast('Erreur suppression', 'e');
  }
}

async function bpVisuDupCycle(cycleId) {
  await bpDupCycle();
}

// Drag & Drop
let _bpVisuDraggedSess = null;
let _bpVisuDropPosition = null;

function _bpVisuDragStart(e, sessType) {
  _bpVisuDraggedSess = sessType;
  _bpVisuDropPosition = null;
  e.dataTransfer.effectAllowed = 'move';
  e.target.style.opacity = '0.5';
  e.target.style.transform = 'scale(1.02)';
}

function _bpVisuDragOverCard(e, targetSess) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (!_bpVisuDraggedSess || _bpVisuDraggedSess === targetSess) return;
  
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height;
  
  // Determine if dropping before or after based on mouse position
  if (y < height / 2) {
    _bpVisuDropPosition = 'before';
    card.style.borderTop = '4px solid var(--gold)';
    card.style.borderBottom = '2px solid transparent';
  } else {
    _bpVisuDropPosition = 'after';
    card.style.borderBottom = '4px solid var(--gold)';
    card.style.borderTop = '2px solid transparent';
  }
  card.style.transform = 'scale(1.01)';
}

function _bpVisuDragOverIndicator(e, pos) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = 'move';
  
  const indicator = e.currentTarget;
  indicator.style.background = 'var(--gold)';
  indicator.style.height = '8px';
  _bpVisuDropPosition = pos;
}

function _bpVisuDragLeaveIndicator(e) {
  const indicator = e.currentTarget;
  indicator.style.background = 'transparent';
  indicator.style.height = '6px';
}

function _bpVisuDragEnter(e) {
  e.preventDefault();
}

function _bpVisuDragLeave(e) {
  const card = e.currentTarget;
  card.style.boxShadow = '';
  card.style.transform = '';
  card.style.borderTop = '2px solid transparent';
  card.style.borderBottom = '2px solid transparent';
}

async function _bpVisuDrop(e, cycleId, targetSess, macroId, mesoId) {
  e.preventDefault();
  const card = e.currentTarget;
  card.style.boxShadow = '';
  card.style.transform = '';
  card.style.borderTop = '2px solid transparent';
  card.style.borderBottom = '2px solid transparent';
  
  // Reset end indicator
  const endIndicator = document.querySelector('.bp-visu-drop-indicator[data-pos="end"]');
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
  
  if (!_bpVisuDraggedSess || _bpVisuDraggedSess === targetSess) {
    _bpVisuDraggedSess = null;
    _bpVisuDropPosition = null;
    return;
  }
  
  // Obtenir le micro ORIGINAL dans la hiérarchie avec macroId et mesoId
  const micro = bpGetMicroFromHierarchy(cycleId, macroId, mesoId);
  if (!micro || !micro.sessions) {
    _bpVisuDraggedSess = null;
    _bpVisuDropPosition = null;
    return;
  }
  
  // Get current order from sessions object keys
  let allSessions = Object.keys(micro.sessions).sort();
  const fromIndex = allSessions.indexOf(_bpVisuDraggedSess);
  let toIndex = allSessions.indexOf(targetSess);
  
  if (fromIndex === -1 || toIndex === -1) {
    _bpVisuDraggedSess = null;
    _bpVisuDropPosition = null;
    return;
  }
  
  // Adjust target index based on drop position
  if (_bpVisuDropPosition === 'after' && fromIndex > toIndex) {
    toIndex++;
  } else if (_bpVisuDropPosition === 'before' && fromIndex < toIndex) {
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
    newSessions[newKey] = micro.sessions[oldKey];
    if (micro.sessions_active && micro.sessions_active.includes(oldKey)) {
      newSessionsActive.push(newKey);
    }
  });
  
  // Modifier directement dans la hiérarchie
  micro.sessions = newSessions;
  micro.sessions_active = newSessionsActive;
  
  _bpVisuDraggedSess = null;
  _bpVisuDropPosition = null;
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRenderVisu();
    toast('Ordre des séances mis à jour !', 's');
  } catch (err) {
    console.error(err);
    toast('Erreur lors de la mise à jour', 'e');
  }
}

async function _bpVisuDropAtEnd(e, cycleId, macroId, mesoId) {
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
  
  if (!_bpVisuDraggedSess) return;
  
  // Obtenir le micro ORIGINAL dans la hiérarchie avec macroId et mesoId
  const micro = bpGetMicroFromHierarchy(cycleId, macroId, mesoId);
  if (!micro || !micro.sessions) return;
  
  // Get current order
  let allSessions = Object.keys(micro.sessions).sort();
  const fromIndex = allSessions.indexOf(_bpVisuDraggedSess);
  
  if (fromIndex === -1) {
    _bpVisuDraggedSess = null;
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
    newSessions[newKey] = micro.sessions[oldKey];
    if (micro.sessions_active && micro.sessions_active.includes(oldKey)) {
      newSessionsActive.push(newKey);
    }
  });
  
  // Modifier directement dans la hiérarchie
  micro.sessions = newSessions;
  micro.sessions_active = newSessionsActive;
  
  _bpVisuDraggedSess = null;
  _bpVisuDropPosition = null;
  
  try {
    await bpSaveHierarchy();
    bpSyncBaseProgramFromHierarchy();
    bpRenderVisu();
    toast('Séance déplacée à la fin !', 's');
  } catch (err) {
    console.error(err);
    toast('Erreur lors de la mise à jour', 'e');
  }
}

// Fonction legacy - gardée pour compatibilité mais non utilisée
function _bpVisuReorderSessions(cycleId, sessions, sessionsActive) {
  console.log('_bpVisuReorderSessions called but not implemented - use drag & drop instead');
}

// Fonctions utilitaires
function bpGetActiveSessions(cycle) {
  if (cycle.sessions_active && cycle.sessions_active.length) return cycle.sessions_active;
  return Object.keys(cycle.sessions || {}).filter(k => cycle.sessions[k] && (cycle.sessions[k].exercises?.length > 0 || cycle.sessions[k].comment));
}

// Helper function for getting ALL sessions (active AND inactive)
function bpGetAllSessions(cycle) {
  if (!cycle) return [];
  const active = cycle.sessions_active || [];
  const sessionsKeys = cycle.sessions ? Object.keys(cycle.sessions) : [];
  return [...new Set([...active, ...sessionsKeys])].sort();
}

function bpGetSessColor(s, ti) {
  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#06b6d4', G: '#84cc16', H: '#f59e0b' };
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

function bpH(str) {
  if (!str) return '';
  return str.replace(/[<>&"']/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
}

// Exports
window.bpRenderVisu = bpRenderVisu;
window.bpPopulateVisuSelect = bpPopulateVisuSelect;
window.bpSetVisuMode = bpSetVisuMode;
window.bpSetVisuSess = bpSetVisuSess;
window.bpSetVisuMacro = bpSetVisuMacro;
window.bpSetVisuMeso = bpSetVisuMeso;
window.bpSetVisuCycle = bpSetVisuCycle;
window.bpToggleVisuCycle = bpToggleVisuCycle;
window.bpVisuOpenEditor = bpVisuOpenEditor;
window.bpVisuAddSession = bpVisuAddSession;
window.bpVisuDupSession = bpVisuDupSession;
window.bpDeleteSession = bpDeleteSession;
window.bpVisuDupCycle = bpVisuDupCycle;
window._bpVisuDragStart = _bpVisuDragStart;
window._bpVisuDragOverCard = _bpVisuDragOverCard;
window._bpVisuDragOverIndicator = _bpVisuDragOverIndicator;
window._bpVisuDragLeaveIndicator = _bpVisuDragLeaveIndicator;
window._bpVisuDragEnter = _bpVisuDragEnter;
window._bpVisuDragLeave = _bpVisuDragLeave;
window._bpVisuDrop = _bpVisuDrop;
window._bpVisuDropAtEnd = _bpVisuDropAtEnd;
window._bpVisuReorderSessions = _bpVisuReorderSessions;
window.bpGetActiveSessions = bpGetActiveSessions;
window.bpGetAllSessions = bpGetAllSessions;
window.bpGetSessColor = bpGetSessColor;
window.bpGetSessParams = bpGetSessParams;
window.bpGetSessEx = bpGetSessEx;
window.bpGetMicroFromHierarchy = bpGetMicroFromHierarchy;

