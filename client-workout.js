// ── WORKOUT PERFORMANCE LOGGING ──────────────────────
// Guard: ensure workoutData exists even if state.js loaded before this
if (typeof workoutData === 'undefined') window.workoutData = {};
if (typeof _clientPRData === 'undefined') window._clientPRData = { records:{} };
if (typeof _perfModalExIdx === 'undefined') window._perfModalExIdx = -1;
if (typeof _perfModalSets === 'undefined') window._perfModalSets = 3;
if (typeof _perfMode === 'undefined') window._perfMode = 'same';
if (typeof _perfPlannedReps === 'undefined') window._perfPlannedReps = '';
if (typeof _perfExType === 'undefined') window._perfExType = 'musculaire';

function _getLastWeight(exName) {
  const pr = _clientPRData && _clientPRData.records && _clientPRData.records[exName];
  if (!pr || !pr.history || !pr.history.length) return '';
  const sorted = pr.history.slice().sort((a,b) => new Date(b.date)-new Date(a.date));
  return sorted[0].weight || '';
}

function openPerfModal(exIdx, exName, setsCount, plannedReps, exType) {
  _perfModalExIdx = exIdx;
  _perfModalSets = parseInt(setsCount) || 3;
  _perfPlannedReps = plannedReps || '';
  _perfExType = exType || 'musculaire';
  _perfMode = workoutData[exIdx] ? workoutData[exIdx].type : (_perfExType === 'energetique' ? 'energetique' : 'same');
  document.getElementById('perf-ex-name').innerText = exName;
  document.getElementById('perf-modal-content').innerHTML = buildPerfForm(workoutData[exIdx], exName);
  openModal('modal-perf');
}

function buildPerfForm(existing, exName) {
  if (_perfExType === 'energetique') return _buildEnergeticForm(existing);
  const type = existing ? existing.type : _perfMode;
  const sets = existing ? existing.sets : [];
  const lastW = exName ? _getLastWeight(exName) : '';
  return `<div style="display:flex;gap:.5rem;margin-bottom:1.25rem">
    <button id="perf-mode-same" onclick="setPerfMode('same')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.75rem;text-transform:uppercase;cursor:pointer;border:1px solid ${type==='same'?'rgba(240,165,0,.5)':'var(--border)'};background:${type==='same'?'rgba(240,165,0,.15)':'var(--surface)'};color:${type==='same'?'var(--gold)':'var(--muted)'}">Même charge</button>
    <button id="perf-mode-individual" onclick="setPerfMode('individual')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.75rem;text-transform:uppercase;cursor:pointer;border:1px solid ${type==='individual'?'rgba(59,130,246,.5)':'var(--border)'};background:${type==='individual'?'rgba(59,130,246,.15)':'var(--surface)'};color:${type==='individual'?'#60a5fa':'var(--muted)'}">Par série</button>
  </div>
  <div id="perf-fields">${type==='same' ? _buildSameFields(sets[0], lastW) : _buildIndivFields(sets, _perfModalSets, lastW)}</div>`;
}

function _buildEnergeticForm(existing) {
  const rpe = existing ? (existing.rpe || '') : '';
  const comment = existing ? (existing.comment || '') : '';
  _perfMode = 'energetique';
  return `<div style="text-align:center;padding:.5rem 0 1rem">
    <div style="display:inline-flex;align-items:center;gap:.5rem;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:.75rem;padding:.4rem .875rem;margin-bottom:1.25rem">
      <span style="font-size:.75rem">⚡</span>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#60a5fa">Exercice énergétique</span>
    </div>
    <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">RPE ressenti (1–10)</label>
    <input type="number" min="1" max="10" step="0.5" id="perf-rpe-val" class="inp" value="${rpe}" placeholder="7" style="font-size:2.5rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-align:center;padding:1rem;width:100%;max-width:200px;margin:0 auto;display:block">
    <p style="margin-top:.5rem;font-size:.65rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif">1 = très facile · 10 = effort maximal</p>
  </div>
  <div style="margin-top:1rem">
    <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Commentaire (optionnel)</label>
    <textarea id="perf-energy-comment" class="inp" rows="3" placeholder="Ressenti, difficulté, notes...">${comment}</textarea>
  </div>`;
}

function _buildSameFields(s, lastW) {
  const weightVal = (s && s.weight) ? s.weight : (lastW || '');
  const repsVal = (s && s.reps) ? s.reps : _perfPlannedReps;
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
    <div>
      <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids (kg)</label>
      <input type="number" step="0.5" min="0" id="perf-weight-0" class="inp" value="${weightVal}" placeholder="80" style="font-size:1.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-align:center;padding:1rem">
    </div>
    <div>
      <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Reps</label>
      <input type="number" min="0" id="perf-reps-0" class="inp" value="${repsVal}" placeholder="10" style="font-size:1.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-align:center;padding:1rem">
    </div>
  </div>
  <div id="perf-rm-preview" style="margin-top:1rem;text-align:center;padding:.75rem;background:rgba(240,165,0,.05);border:1px solid rgba(240,165,0,.15);border-radius:.875rem;display:none">
    <span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">1RM théorique :</span>
    <span id="perf-rm-val" style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;color:var(--gold);margin-left:.5rem">—</span>
  </div>`;
}

function _buildIndivFields(sets, count, lastW) {
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem">
    <label style="font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Poids kg × Reps</label>
    <div style="display:flex;align-items:center;gap:.5rem">
      <button onclick="_addPerfSet()" style="background:rgba(240,165,0,.15);border:1px solid rgba(240,165,0,.3);color:var(--gold);border-radius:.5rem;padding:.2rem .6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;cursor:pointer">+ Série</button>
    </div>
  </div>
  <div id="perf-indiv-rows">`;
  const n = Math.max(count, sets.length || count);
  for (let i = 0; i < n; i++) {
    const s = sets[i] || {};
    const w = s.weight || (i === 0 ? lastW : '') || '';
    const r = s.reps || _perfPlannedReps || '';
    html += _indivRow(i, w, r);
  }
  html += `</div>`;
  return html;
}

function _indivRow(i, weight, reps) {
  return `<div id="perf-row-${i}" style="display:flex;align-items:center;gap:.75rem;margin-bottom:.5rem">
    <span style="font-family:'Barlow Condensed',sans-serif;font-size:.85rem;font-weight:900;font-style:italic;color:var(--muted);min-width:2rem">S${i+1}</span>
    <input type="number" step="0.5" min="0" id="perf-weight-${i}" class="inp" value="${weight}" placeholder="kg" style="text-align:center;padding:.5rem">
    <span style="font-size:.8rem;color:var(--muted)">×</span>
    <input type="number" min="0" id="perf-reps-${i}" class="inp" value="${reps}" placeholder="reps" style="text-align:center;padding:.5rem">
    <button onclick="document.getElementById('perf-row-${i}').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;padding:.25rem">✕</button>
  </div>`;
}

function _addPerfSet() {
  const rows = document.getElementById('perf-indiv-rows'); if (!rows) return;
  const count = rows.children.length;
  rows.insertAdjacentHTML('beforeend', _indivRow(count, '', _perfPlannedReps || ''));
}

function setPerfMode(mode) {
  _perfMode = mode;
  const existing = workoutData[_perfModalExIdx];
  const exName = document.getElementById('perf-ex-name')?.innerText || '';
  const lastW = _getLastWeight(exName);
  document.getElementById('perf-fields').innerHTML = mode === 'same'
    ? _buildSameFields(existing?.sets?.[0], lastW)
    : _buildIndivFields(existing?.sets || [], _perfModalSets, lastW);
  ['same','individual'].forEach(m => {
    const btn = document.getElementById('perf-mode-'+m); if (!btn) return;
    const on = m === mode;
    if (m === 'same') { btn.style.borderColor = on?'rgba(240,165,0,.5)':'var(--border)'; btn.style.background = on?'rgba(240,165,0,.15)':'var(--surface)'; btn.style.color = on?'var(--gold)':'var(--muted)'; }
    else { btn.style.borderColor = on?'rgba(59,130,246,.5)':'var(--border)'; btn.style.background = on?'rgba(59,130,246,.15)':'var(--surface)'; btn.style.color = on?'#60a5fa':'var(--muted)'; }
  });
  if (mode === 'same') {
    const wi = document.getElementById('perf-weight-0');
    const ri = document.getElementById('perf-reps-0');
    if (wi) wi.addEventListener('input', _updateRMPreview);
    if (ri) ri.addEventListener('input', _updateRMPreview);
  }
}

function _updateRMPreview() {
  const w = parseFloat(document.getElementById('perf-weight-0')?.value) || 0;
  const r = parseInt(document.getElementById('perf-reps-0')?.value) || 0;
  const preview = document.getElementById('perf-rm-preview');
  if (!preview) return;
  if (w > 0 && r > 0) {
    const rm = Math.round(w * (1 + r/30) * 10) / 10;
    document.getElementById('perf-rm-val').innerText = rm + ' kg';
    preview.style.display = 'block';
  } else { preview.style.display = 'none'; }
}

function savePerfModal() {
  if (_perfExType === 'energetique') {
    const rpe = parseFloat(document.getElementById('perf-rpe-val')?.value) || 0;
    if (rpe === 0) { toast('Entrez un RPE','w'); return; }
    const comment = document.getElementById('perf-energy-comment')?.value.trim() || '';
    workoutData[_perfModalExIdx] = { type: 'energetique', rpe, comment };
    closeModal('modal-perf');
    const btn = document.getElementById('perf-btn-'+_perfModalExIdx);
    if (btn) { btn.style.background='rgba(59,130,246,.2)'; btn.style.borderColor='rgba(59,130,246,.4)'; btn.style.color='#60a5fa'; btn.innerText='⚡ RPE MODIF.'; }
    toast('RPE enregistré','s');
    return;
  }
  let sets = [];
  if (_perfMode === 'same') {
    const w = parseFloat(document.getElementById('perf-weight-0')?.value) || 0;
    const r = parseInt(document.getElementById('perf-reps-0')?.value) || 0;
    if (w === 0 && r === 0) { toast('Entrez au moins le poids ou les reps','w'); return; }
    sets.push({ weight: w, reps: r });
  } else {
    const rows = document.getElementById('perf-indiv-rows');
    if (!rows) return;
    rows.querySelectorAll('[id^="perf-row-"]').forEach(row => {
      const idx = row.id.replace('perf-row-','');
      const w = parseFloat(document.getElementById('perf-weight-'+idx)?.value) || 0;
      const r = parseInt(document.getElementById('perf-reps-'+idx)?.value) || 0;
      if (w > 0 || r > 0) sets.push({ weight: w, reps: r });
    });
    if (!sets.length) { toast('Entrez au moins une série','w'); return; }
  }
  workoutData[_perfModalExIdx] = { type: _perfMode, sets };
  closeModal('modal-perf');
  updateTonnageDisplay();
  const btn = document.getElementById('perf-btn-'+_perfModalExIdx);
  if (btn) { btn.style.background='rgba(240,165,0,.25)'; btn.style.borderColor='rgba(240,165,0,.5)'; btn.style.color='var(--gold)'; btn.innerText='📊 MODIF.'; }
  toast('Performance enregistrée','s');
}

function updateTonnageDisplay() {
  const el = document.getElementById('tonnage-display'); if (!el) return;
  const t = calcTonnage();
  if (t > 0) {
    el.classList.remove('hidden');
    document.getElementById('tonnage-value').innerText = t.toLocaleString('fr-FR', {maximumFractionDigits:1})+' kg';
  } else el.classList.add('hidden');
}

function calcTonnage() {
  let total = 0;
  const { cycle, type } = currentSess;
  const c = clientProgram.find(x => x.id === cycle); if (!c) return 0;
  const exs = getSessEx(c, type);
  Object.entries(workoutData).forEach(([idx, data]) => {
    if (data.type === 'energetique') return;
    const ex = exs[parseInt(idx)];
    if (data.type === 'same') {
      const s = data.sets[0] || {};
      const setsCount = parseInt(ex?.sets) || 3;
      total += (s.weight||0) * (s.reps||0) * setsCount;
    } else {
      data.sets.forEach(s => { total += (s.weight||0) * (s.reps||0); });
    }
  });
  return total;
}

async function saveWorkoutAndPR(cid, key) {
  if (!Object.keys(workoutData).length) return 0;
  const { cycle, type } = currentSess;
  const c = clientProgram.find(x => x.id === cycle);
  const exs = c ? getSessEx(c, type) : [];
  const tonnage = calcTonnage();
  try {
    const prDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'data','personalRecords'));
    const prData = (prDoc.exists && prDoc.data()) ? prDoc.data() : { records: {} };
    const records = prData.records || {};
    Object.entries(workoutData).forEach(([idx, data]) => {
      const ex = exs[parseInt(idx)]; if (!ex || !ex.name) return;
      if (data.type === 'energetique') return;
      const allSets = data.type === 'same'
        ? Array(parseInt(ex.sets)||3).fill(null).map(()=>({...data.sets[0]}))
        : data.sets;
      allSets.forEach(s => {
        if (!s || (!s.weight && !s.reps)) return;
        const w = s.weight||0; const r = s.reps||0;
        const rm1 = r > 0 && w > 0 ? Math.round(w*(1+r/30)*10)/10 : w;
        if (!records[ex.name]) records[ex.name] = { history:[], best1RM:0 };
        records[ex.name].history.push({ date:new Date().toISOString(), weight:w, reps:r, theoreticalMax:rm1, sessionKey:key });
        if (rm1 > (records[ex.name].best1RM||0)) records[ex.name].best1RM = rm1;
      });
    });
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'data','personalRecords'), { records });
    window._clientPRData = { records };
  } catch(e) { console.error('PR save error', e); }
  return tonnage;
}

