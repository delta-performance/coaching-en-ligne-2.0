// ── EDITOR ────────────────────────────────────────────
function rebuildEditorSelects() {
  const ec = document.getElementById('ed-cycle'); if (!ec) return;
  ec.innerHTML = clientProgram.map(c => `<option value="${c.id}">C${c.id} – ${h(c.focus.substring(0,18))}</option>`).join('');
  const cId = parseInt(ec.value) || (clientProgram[0]?.id);
  rebuildEditorSessSelect(cId);
  rebuildCopyGrid();
}

function rebuildEditorSessSelect(cycleId) {
  const c = clientProgram.find(x => x.id === cycleId);
  const sel = document.getElementById('ed-sess'); if (!sel) return;
  const active = c ? getActiveSessions(c) : [];
  const currentVal = sel.value;
  sel.innerHTML = active.map(s => `<option value="${s}">Séance ${s}</option>`).join('');
  if (active.includes(currentVal)) sel.value = currentVal;
  else if (active.length) sel.value = active[0];
}

function rebuildCopyGrid() {
  const cg = document.getElementById('copy-grid'); if (!cg) return;
  const currentCycleId = parseInt(document.getElementById('ed-cycle')?.value);
  cg.innerHTML = clientProgram.filter(c => c.id !== currentCycleId).map(c =>
    `<label style="display:flex;align-items:center;justify-content:center;padding:.4rem .75rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s" onclick="this.classList.toggle('copy-sel');this.style.borderColor=this.classList.contains('copy-sel')?'rgba(240,165,0,.5)':'var(--border)';this.style.color=this.classList.contains('copy-sel')?'var(--gold)':'var(--muted)';this.style.background=this.classList.contains('copy-sel')?'rgba(240,165,0,.1)':'var(--surface)'"><input type="checkbox" value="${c.id}" class="copy-check" style="display:none">C${c.id} – ${h(c.focus.substring(0,12))}</label>`
  ).join('');
}

function syncEditor() {
  if (!clientProgram.length) return;
  const cId = parseInt(document.getElementById('ed-cycle').value);
  rebuildEditorSessSelect(cId);
  rebuildCopyGrid();
  const sess = document.getElementById('ed-sess').value;
  const c = clientProgram.find(x => x.id === cId); if (!c) return;
  const sp = getSessParams(c, sess);
  document.getElementById('ed-rest').value = sp.rest||'45s';
  document.getElementById('ed-tours').value = sp.tours||'3';
  document.getElementById('ed-sess-comment').value = sp.comment||'';
  setSessMode(sp.mode||'circuit', false);
  editorExos = JSON.parse(JSON.stringify(getSessEx(c, sess)));
  edDropdownState = {};
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
    const cId = parseInt(document.getElementById('ed-cycle').value);
    const sess = document.getElementById('ed-sess').value;
    const idx = clientProgram.findIndex(c => c.id === cId);
    if (idx !== -1) { const s = clientProgram[idx].sessions[sess]; if (s && !Array.isArray(s)) s.mode = mode; }
  }
  renderEditorExos();
}

function renderEditorExos() {
  const el = document.getElementById('ed-exos-list'); if (!el) return;
  const isCircuit = currentSessMode === 'circuit';
  const sess = document.getElementById('ed-sess')?.value || 'A';
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
      <input type="text" class="inp" value="${h(e.name||'')}" placeholder="Nom exercice" oninput="editorExos[${i}].name=this.value;this.closest('[id^=ex-card-]').querySelector('.ex-title-span').textContent=this.value||'Nouvel exercice'" style="font-size:.85rem">
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
      ${classicExFields(e,i,true)}
      <input type="text" class="inp" value="${h(e.comment||'')}" placeholder="Commentaire ${letter}..." oninput="editorExos[${i}].comment=this.value" style="font-size:.75rem">
    </div>`;
  }).join('');
  return `<div style="border:1px solid rgba(240,165,0,.35);border-radius:1.25rem;overflow:hidden;background:rgba(240,165,0,.03)" id="ex-card-${startIdx}">
    <div style="background:rgba(240,165,0,.12);border-bottom:1px solid rgba(240,165,0,.25);padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem">
      <span style="background:var(--gold);color:#1a0900;padding:.25rem .75rem;border-radius:.5rem;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:900;font-style:italic;flex-shrink:0">⇄ SUPERSET ${num}</span>
      <div style="display:flex;gap:.4rem;flex-shrink:0;margin-left:auto;flex-wrap:wrap">
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
function edRemoveEx(i) { if(editorExos.length<=1){toast('Au moins 1 exercice requis','w');return;} editorExos.splice(i,1); edDropdownState={}; renderEditorExos(); }

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
  renderEditorExos();
  setTimeout(() => { const el = document.getElementById('ed-exos-list'); if(el) el.lastElementChild?.scrollIntoView({ behavior:'smooth', block:'nearest' }); }, 100);
}

async function saveFullSession() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;
  const idx = clientProgram.findIndex(c => c.id === cId); if (idx===-1) return;
  const rest = document.getElementById('ed-rest').value.trim()||'45s';
  const tours = document.getElementById('ed-tours').value.trim()||'3';
  const comment = document.getElementById('ed-sess-comment').value.trim();
  clientProgram[idx].sessions[sess] = { rest, tours, mode:currentSessMode, comment, exercises:JSON.parse(JSON.stringify(editorExos)) };
  try { await saveClientProgram(); toast('Séance sauvegardée !','s'); } catch(e) { toast('Erreur sauvegarde','e'); }
}

async function dupCycle() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const cidx = clientProgram.findIndex(c => c.id === cId); if (cidx===-1) return;
  const newId = Math.max(...clientProgram.map(c => c.id))+1;
  const clone = JSON.parse(JSON.stringify(clientProgram[cidx]));
  clone.id = newId; clone.focus = clientProgram[cidx].focus+' (copie)';
  clientProgram.push(clone);
  try { await saveClientProgram(); rebuildEditorSelects(); renderClientGrid(); renderCycleStatus(); toast('Cycle dupliqué !','s'); } catch(e) { toast('Erreur','e'); }
}

async function dupSession() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;
  const cidx = clientProgram.findIndex(c => c.id === cId); if (cidx===-1) return;
  const newId = Math.max(...clientProgram.map(c => c.id))+1;
  const clone = JSON.parse(JSON.stringify(clientProgram[cidx]));
  clone.id = newId;
  clone.focus = clientProgram[cidx].focus+' (copie séance '+sess+')';
  clone.sessions_active = [sess];
  clone.sessions = { [sess]: JSON.parse(JSON.stringify(clientProgram[cidx].sessions[sess] || {})) };
  clientProgram.push(clone);
  try { await saveClientProgram(); rebuildEditorSelects(); renderClientGrid(); renderCycleStatus(); toast('Séance dupliquée dans un nouveau cycle !','s'); } catch(e) { toast('Erreur','e'); }
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
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const sess = document.getElementById('ed-sess').value;
  const srcCidx = clientProgram.findIndex(c => c.id === cId);
  const sel = Array.from(document.querySelectorAll('#copy-grid label.copy-sel .copy-check')).map(i => parseInt(i.value));
  if (!sel.length) { toast('Sélectionnez au moins un cycle cible','w'); return; }
  if (copyMode === 'sess') {
    if (srcCidx===-1) return;
    const srcS = JSON.parse(JSON.stringify(clientProgram[srcCidx].sessions[sess]));
    sel.forEach(tId => { const ci = clientProgram.findIndex(c => c.id===tId); if(ci===-1)return; clientProgram[ci].sessions[sess]=JSON.parse(JSON.stringify(srcS)); });
  } else {
    if (srcCidx===-1) return;
    const srcSess = JSON.parse(JSON.stringify(clientProgram[srcCidx].sessions));
    sel.forEach(tId => { const ci = clientProgram.findIndex(c => c.id===tId); if(ci===-1)return; clientProgram[ci].sessions=JSON.parse(JSON.stringify(srcSess)); });
  }
  try {
    await saveClientProgram();
    // Déselectionner après copie
    document.querySelectorAll('#copy-grid label.copy-sel').forEach(l => {
      l.classList.remove('copy-sel');
      l.style.borderColor = 'var(--border)'; l.style.color = 'var(--muted)'; l.style.background = 'var(--surface)';
      const chk = l.querySelector('.copy-check'); if (chk) chk.checked = false;
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
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const c = clientProgram.find(x => x.id === cId); if (!c) return;
  const active = getActiveSessions(c);
  const suggestions = [];
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0, found = 0; i < alpha.length && found < 4; i++) {
    if (!active.includes(alpha[i])) { suggestions.push(alpha[i]); found++; }
  }
  const picker = document.getElementById('sess-letter-picker');
  if (picker) picker.innerHTML = suggestions.map(s =>
    `<button onclick="document.querySelectorAll('.sess-letter-btn').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='var(--surface)';b.style.color='var(--muted)'});this.style.borderColor='var(--gold)';this.style.background='rgba(240,165,0,.15)';this.style.color='var(--gold)';_addSessTargetLetter='${s}'" class="sess-letter-btn btn btn-ghost" style="padding:.75rem 1.5rem;font-size:1.2rem">${s}</button>`
  ).join('') + `<div style="display:flex;align-items:center;gap:.5rem;margin-top:.75rem"><span style="font-size:.65rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">Autre :</span><input id="custom-sess-letter" type="text" maxlength="3" class="inp" style="width:70px;font-size:1rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-align:center;text-transform:uppercase" placeholder="E..." oninput="_addSessTargetLetter=this.value.toUpperCase()"></div>`;
  _addSessTargetLetter = suggestions[0] || _nextSessLetter(active);
  // Init copy source selects
  const srcClient = document.getElementById('copy-src-client');
  if (srcClient) {
    srcClient.innerHTML = allClients.filter(c=>!c.archived).map(c=>`<option value="${c.id}">${h(c.name||c.code)}</option>`).join('');
    loadCopySrcCycles();
  }
  document.getElementById('modal-add-sess-step1').classList.remove('hidden');
  document.getElementById('modal-add-sess-blank').classList.add('hidden');
  document.getElementById('modal-add-sess-copy').classList.add('hidden');
  openModal('modal-add-session');
}

function startAddSess(mode) {
  _addSessMode = mode;
  document.getElementById('modal-add-sess-step1').classList.add('hidden');
  if (mode === 'blank') {
    document.getElementById('modal-add-sess-blank').classList.remove('hidden');
    document.getElementById('modal-add-sess-copy').classList.add('hidden');
  } else {
    document.getElementById('modal-add-sess-blank').classList.add('hidden');
    document.getElementById('modal-add-sess-copy').classList.remove('hidden');
  }
}

async function loadCopySrcCycles() {
  const srcId = document.getElementById('copy-src-client')?.value; if (!srcId) return;
  _copySrcClientId = srcId;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',srcId,'data','program'));
    _copySrcProgram = (doc.exists && doc.data().cycles) ? doc.data().cycles : [];
    const sel = document.getElementById('copy-src-cycle'); if (!sel) return;
    sel.innerHTML = _copySrcProgram.map(c=>`<option value="${c.id}">C${c.id} – ${h(c.focus)}</option>`).join('');
    _copySrcCycleId = _copySrcProgram[0]?.id || 0;
    loadCopySrcSessions();
  } catch(e) { console.error(e); }
}

function loadCopySrcSessions() {
  _copySrcCycleId = parseInt(document.getElementById('copy-src-cycle')?.value);
  const c = _copySrcProgram.find(x => x.id === _copySrcCycleId); if (!c) return;
  const active = getActiveSessions(c);
  const container = document.getElementById('copy-src-sessions'); if (!container) return;
  container.innerHTML = '<p style="font-size:.7rem;color:var(--muted);margin-bottom:.5rem">Séance source :</p>' +
    active.map(s => `<button onclick="document.querySelectorAll('.copy-src-sess-btn').forEach(b=>b.style.borderColor='var(--border)');this.style.borderColor='var(--gold)';_copySrcSessType='${s}'" class="copy-src-sess-btn btn btn-ghost" style="margin-right:.5rem">${s}</button>`).join('');
  if (active.length) { _copySrcSessType = active[0]; }
}

async function addBlankSession() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const letter = _addSessTargetLetter; if (!letter) { toast('Choisissez une lettre','w'); return; }
  const idx = clientProgram.findIndex(c => c.id === cId); if (idx===-1) return;
  const c = clientProgram[idx];
  if (!c.sessions_active) c.sessions_active = [];
  if (c.sessions_active.includes(letter)) { toast('Séance déjà existante','w'); return; }
  c.sessions_active.push(letter);
  c.sessions_active.sort();
  c.sessions[letter] = { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] };
  try {
    await saveClientProgram(); rebuildEditorSelects();
    document.getElementById('ed-sess').value = letter; syncEditor();
    closeModal('modal-add-session'); toast('Séance '+letter+' ajoutée','s');
  } catch(e) { toast('Erreur','e'); }
}

async function addCopySession() {
  const cId = parseInt(document.getElementById('ed-cycle').value);
  const letter = _addSessTargetLetter; if (!letter) { toast('Choisissez une lettre cible','w'); return; }
  const srcCycle = _copySrcProgram.find(x => x.id === _copySrcCycleId);
  if (!srcCycle) { toast('Cycle source introuvable','w'); return; }
  const srcSess = srcCycle.sessions[_copySrcSessType];
  if (!srcSess) { toast('Séance source introuvable','w'); return; }
  const idx = clientProgram.findIndex(c => c.id === cId); if (idx===-1) return;
  const c = clientProgram[idx];
  if (!c.sessions_active) c.sessions_active = [];
  if (!c.sessions_active.includes(letter)) { c.sessions_active.push(letter); c.sessions_active.sort(); }
  c.sessions[letter] = JSON.parse(JSON.stringify(srcSess));
  try {
    await saveClientProgram(); rebuildEditorSelects();
    document.getElementById('ed-sess').value = letter; syncEditor();
    closeModal('modal-add-session'); toast('Séance '+letter+' copiée depuis '+_copySrcSessType,'s');
  } catch(e) { toast('Erreur','e'); }
}

// Supprime une séance (appelé depuis visualisation uniquement)
async function deleteSession(cycleId, sessType) {
  if (!confirm('Supprimer la séance '+sessType+' du cycle '+cycleId+' ? Cette action est irréversible.')) return;
  const idx = clientProgram.findIndex(c => c.id === cycleId); if (idx===-1) return;
  const c = clientProgram[idx];
  if (!c.sessions_active) c.sessions_active = ['A','B','C','D'];
  c.sessions_active = c.sessions_active.filter(s => s !== sessType);
  c.sessions[sessType] = { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] };
  try { await saveClientProgram(); rebuildEditorSelects(); renderVisu(); renderClientGrid(); toast('Séance '+sessType+' supprimée','w'); }
  catch(e) { toast('Erreur','e'); }
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
