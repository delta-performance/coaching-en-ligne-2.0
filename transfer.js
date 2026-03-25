function populateTransferSelects() {
  ['tr-src','tr-dst'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = allClients.filter(c=>!c.archived).map(c=>`<option value="${c.id}">${h(c.name||c.code)}</option>`).join('');
  });
  loadTransferCycles();
}

async function loadTransferCycles() {
  const srcId = document.getElementById('tr-src')?.value; if (!srcId) return;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',srcId,'data','program'));
    const cycles = (doc.exists&&doc.data().cycles) ? doc.data().cycles : [];
    const el = document.getElementById('tr-cycle'); if (!el) return;
    el.innerHTML = cycles.map(c=>`<option value="${c.id}">C${c.id} – ${h(c.focus)}</option>`).join('');
    window._transferSrcCycles = cycles;
  } catch(e) { console.error(e); }
}

function setTransferMode(m) {
  transferMode = m;
  ['cycle','sess'].forEach(k => {
    const btn = document.getElementById('tr-mode-'+k); if (!btn) return;
    btn.style.borderColor = k===m?'rgba(240,165,0,.5)':'var(--border)';
    btn.style.background = k===m?'rgba(240,165,0,.15)':'var(--surface)';
    btn.style.color = k===m?'var(--gold)':'var(--muted)';
  });
  document.getElementById('tr-sess-row').classList.toggle('hidden', m!=='sess');
}

function setTransferSess(s) {
  transferSess = s;
  const cols = { A:['rgba(59,130,246,.5)','rgba(59,130,246,.15)','#60a5fa'], B:['rgba(16,185,129,.5)','rgba(16,185,129,.15)','#34d399'], C:['rgba(249,115,22,.5)','rgba(249,115,22,.15)','#fb923c'], D:['rgba(139,92,246,.5)','rgba(139,92,246,.15)','#a78bfa'] };
  ['A','B','C','D'].forEach(k => {
    const btn = document.getElementById('trs-'+k); if (!btn) return;
    const on = k===s;
    btn.style.borderColor = on?cols[k][0]:'var(--border)'; btn.style.background = on?cols[k][1]:'var(--surface)'; btn.style.color = on?cols[k][2]:'var(--muted)';
  });
}

async function doTransfer() {
  const srcId = document.getElementById('tr-src').value;
  const dstId = document.getElementById('tr-dst').value;
  const cycleId = parseInt(document.getElementById('tr-cycle').value);
  if (srcId===dstId) { toast('Source et cible identiques','w'); return; }
  try {
    const srcDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',srcId,'data','program'));
    const srcCycles = (srcDoc.exists&&srcDoc.data().cycles) ? srcDoc.data().cycles : [];
    const srcCycle = srcCycles.find(c => c.id===cycleId); if (!srcCycle) { toast('Cycle source introuvable','e'); return; }
    const dstDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',dstId,'data','program'));
    let dstCycles = (dstDoc.exists&&dstDoc.data().cycles) ? dstDoc.data().cycles : [];
    const dstIdx = dstCycles.findIndex(c => c.id===cycleId);
    if (transferMode==='cycle') {
      if (dstIdx!==-1) { dstCycles[dstIdx].sessions = JSON.parse(JSON.stringify(srcCycle.sessions)); dstCycles[dstIdx].sessions_active = srcCycle.sessions_active || ['A','B','C','D']; }
      else dstCycles.push(JSON.parse(JSON.stringify(srcCycle)));
    } else {
      if (dstIdx===-1) { toast('Cycle cible inexistant chez le client destination','w'); return; }
      dstCycles[dstIdx].sessions[transferSess] = JSON.parse(JSON.stringify(srcCycle.sessions[transferSess]));
      if (!dstCycles[dstIdx].sessions_active) dstCycles[dstIdx].sessions_active = [];
      if (!dstCycles[dstIdx].sessions_active.includes(transferSess)) { dstCycles[dstIdx].sessions_active.push(transferSess); dstCycles[dstIdx].sessions_active.sort(); }
    }
    function sanitize(c, t) {
      const s = c.sessions[t]||{}; const ex = Array.isArray(s)?s:(s.exercises||[]); const sp = Array.isArray(s)?{}:s;
      return { rest:sp.rest||'45s', tours:sp.tours||'3', mode:sp.mode||'circuit', comment:sp.comment||'', exercises:ex.map(e=>({ name:e.name||'',desc:e.desc||'',video:e.video||'',photo:e.photo||'',tst:e.tst||'',reps:e.reps||'',sets:e.sets||'',restSet:e.restSet||'',restEx:e.restEx||'',rpeTarget:e.rpeTarget||'',comment:e.comment||'',superset:e.superset||false })) };
    }
    const safe = dstCycles.map(c => ({ id:c.id, focus:c.focus||'', sessions_active:c.sessions_active||['A','B','C','D'], sessions:{ A:sanitize(c,'A'), B:sanitize(c,'B'), C:sanitize(c,'C'), D:sanitize(c,'D') } }));
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',dstId,'data','program'), { cycles:safe });
    const srcName = allClients.find(c=>c.id===srcId)?.name||srcId;
    const dstName = allClients.find(c=>c.id===dstId)?.name||dstId;
    toast('Transfert '+srcName+' → '+dstName+' effectué !','s',4000);
  } catch(e) { console.error(e); toast('Erreur transfert','e'); }
}
