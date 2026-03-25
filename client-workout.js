// ── WORKOUT PERFORMANCE LOGGING ──────────────────────

function openPerfModal(exIdx, exName, setsCount) {
  _perfModalExIdx = exIdx;
  _perfModalSets = parseInt(setsCount) || 3;
  _perfMode = workoutData[exIdx] ? workoutData[exIdx].type : 'same';
  document.getElementById('perf-ex-name').innerText = exName;
  document.getElementById('perf-modal-content').innerHTML = buildPerfForm(workoutData[exIdx]);
  openModal('modal-perf');
}

function buildPerfForm(existing) {
  const type = existing ? existing.type : _perfMode;
  const sets = existing ? existing.sets : [];
  return `<div style="display:flex;gap:.5rem;margin-bottom:1.25rem">
    <button id="perf-mode-same" onclick="setPerfMode('same')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.75rem;text-transform:uppercase;cursor:pointer;border:1px solid ${type==='same'?'rgba(240,165,0,.5)':'var(--border)'};background:${type==='same'?'rgba(240,165,0,.15)':'var(--surface)'};color:${type==='same'?'var(--gold)':'var(--muted)'}">Même charge</button>
    <button id="perf-mode-individual" onclick="setPerfMode('individual')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.75rem;text-transform:uppercase;cursor:pointer;border:1px solid ${type==='individual'?'rgba(59,130,246,.5)':'var(--border)'};background:${type==='individual'?'rgba(59,130,246,.15)':'var(--surface)'};color:${type==='individual'?'#60a5fa':'var(--muted)'}">Par série</button>
  </div>
  <div id="perf-fields">${type==='same' ? _buildSameFields(sets[0]) : _buildIndivFields(sets, _perfModalSets)}</div>`;
}

function _buildSameFields(s) {
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
    <div>
      <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids (kg)</label>
      <input type="number" step="0.5" min="0" id="perf-weight-0" class="inp" value="${s&&s.weight?s.weight:''}" placeholder="80" style="font-size:1.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-align:center;padding:1rem">
    </div>
    <div>
      <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Reps</label>
      <input type="number" min="0" id="perf-reps-0" class="inp" value="${s&&s.reps?s.reps:''}" placeholder="10" style="font-size:1.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-align:center;padding:1rem">
    </div>
  </div>
  <div id="perf-rm-preview" style="margin-top:1rem;text-align:center;padding:.75rem;background:rgba(240,165,0,.05);border:1px solid rgba(240,165,0,.15);border-radius:.875rem;display:none">
    <span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase">1RM théorique :</span>
    <span id="perf-rm-val" style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;color:var(--gold);margin-left:.5rem">—</span>
  </div>`;
}

function _buildIndivFields(sets, count) {
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
    html += _indivRow(i, s.weight||'', s.reps||'');
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
  rows.insertAdjacentHTML('beforeend', _indivRow(count, '', ''));
}

function setPerfMode(mode) {
  _perfMode = mode;
  const existing = workoutData[_perfModalExIdx];
  document.getElementById('perf-fields').innerHTML = mode === 'same'
    ? _buildSameFields(existing?.sets?.[0])
    : _buildIndivFields(existing?.sets || [], _perfModalSets);
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
  // Refresh exCard button to show it's filled
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
  } catch(e) { console.error('PR save error', e); }
  return tonnage;
}
