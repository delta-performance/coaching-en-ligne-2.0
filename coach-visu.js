function populateVisuSelect() {
  const el = document.getElementById('visu-cycle-sel'); if (!el) return;
  el.innerHTML = clientProgram.map(c => `<option value="${c.id}">C${c.id} – ${h(c.focus)}</option>`).join('');
  const chk = document.getElementById('visu-ctrl-cycles-check'); if (!chk) return;
  chk.innerHTML = clientProgram.map(c =>
    `<button onclick="toggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${h(c.focus.substring(0,12))}</button>`
  ).join('');
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
  const cc = document.getElementById('visu-ctrl-cycle');
  const cs = document.getElementById('visu-ctrl-sess');
  const cck = document.getElementById('visu-ctrl-cycles-check');
  if (m==='same-cycle') { cc.style.display='flex'; cs.style.display='none'; if(cck)cck.style.display='none'; }
  else if (m==='cross-sess') { cc.style.display='none'; cs.style.display='flex'; if(cck)cck.style.display='flex'; }
  else { cc.style.display='none'; cs.style.display='none'; if(cck)cck.style.display='flex'; }
  renderVisu();
}

function setVisuSess(s) {
  visuSess = s;
  ['A','B','C','D'].forEach(k => { const btn = document.getElementById('vs-'+k); if (btn) btn.className = 'tab-pill '+(k===s?'on':'off'); });
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

function renderVisu() {
  const el = document.getElementById('visu-content'); if (!el) return;
  const colors = { A:'#3b82f6', B:'#10b981', C:'#f97316', D:'#8b5cf6' };

  if (visuMode === 'same-cycle') {
    const cId = parseInt(document.getElementById('visu-cycle-sel')?.value);
    const c = clientProgram.find(x => x.id === cId);
    if (!c) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Sélectionnez un cycle.</p>'; return; }
    const active = getActiveSessions(c);
    el.innerHTML = `<h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">CYCLE ${c.id} — ${h(c.focus)}</h5>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">
      ${active.map(t => {
        const sp = getSessParams(c,t); const exs = getSessEx(c,t); const col = colors[t];
        return `<div class="card" style="overflow:hidden">
          <div style="background:${col};padding:1rem;display:flex;align-items:center;gap:.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;color:white">SÉANCE ${t}</span>
            <span class="badge" style="background:rgba(255,255,255,.2);color:white">${sp.mode==='classic'?'Classique':'Circuit'}</span>
            <button onclick="visuOpenEditor(${c.id},'${t}')" style="margin-left:auto;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:white;border-radius:.5rem;padding:.25rem .6rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer">✏️ Modifier</button>
            <button onclick="deleteSession(${c.id},'${t}')" style="background:rgba(248,113,113,.2);border:1px solid rgba(248,113,113,.3);color:#f87171;border-radius:.5rem;padding:.25rem .6rem;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:900;cursor:pointer" title="Supprimer cette séance">🗑</button>
          </div>
          <div style="padding:1rem">
            ${sp.mode==='circuit'?`<div style="display:flex;gap:.5rem;margin-bottom:.75rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>`:''}
            ${visuExListHTML(exs, sp, col, c.id, t)}
          </div>
        </div>`;
      }).join('')}
    </div>`;

  } else if (visuMode === 'cross-sess') {
    const selCycles = Array.from(visuSelectedCycles);
    if (!selCycles.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>'; return; }
    const col = colors[visuSess];
    el.innerHTML = `<h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">SÉANCE ${visuSess} — ${selCycles.length} cycle(s)</h5>
    <div style="display:flex;flex-direction:column;gap:1.25rem">
      ${selCycles.map(cId => {
        const c = clientProgram.find(x => x.id === cId); if (!c) return '';
        const sp = getSessParams(c, visuSess); const exs = getSessEx(c, visuSess);
        const active = getActiveSessions(c);
        if (!active.includes(visuSess)) return `<div class="card" style="overflow:hidden;opacity:.5">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-size:.7rem;color:var(--muted);font-style:italic">Séance ${visuSess} non configurée</span>
          </div></div>`;
        return `<div class="card" style="overflow:hidden">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;font-style:italic;color:var(--muted)">${h(c.focus)}</span>
            <span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.mode==='classic'?'Classique':'Circuit'}</span>
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
      const c = clientProgram.find(x => x.id === cId); if (!c) return '';
      const active = getActiveSessions(c);
      return `<div style="margin-bottom:2.5rem">
        <h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">CYCLE ${c.id} — ${h(c.focus)}</h5>
        <div style="overflow-x:auto">
          <table class="tbl" style="width:100%;background:var(--card);border-radius:1rem;overflow:hidden">
            <thead><tr>
              <th>Exercice</th>
              ${active.map(t=>`<th style="color:${colors[t]}">Séance ${t} <button onclick="visuOpenEditor(${c.id},'${t}')" style="background:none;border:none;color:${colors[t]};cursor:pointer;font-size:.65rem">✏️</button></th>`).join('')}
            </tr></thead>
            <tbody>
              ${(()=>{
                const maxEx = Math.max(1, ...active.map(t => getSessEx(c,t).length));
                return Array.from({length:maxEx},(_,i)=>`<tr class="db-row">
                  <td style="font-size:.75rem;color:var(--muted)">Ex ${i+1}</td>
                  ${active.map(t => {
                    const e = getSessEx(c,t)[i];
                    const sp = getSessParams(c,t);
                    return e ? `<td>
                      ${e.superset?`<span style="font-size:.6rem;color:var(--gold)">⇄ </span>`:''}
                      <div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700">${h(e.name)}</div>
                      ${sp.mode==='classic'&&(e.sets||e.reps)?`<div style="font-size:.6rem;color:${colors[t]};margin-top:.15rem">${e.sets?e.sets+'× ':''} ${e.reps||''} ${e.rpeTarget?'RPE'+e.rpeTarget:''}</div>`:''}
                      ${sp.mode!=='classic'&&e.reps?`<div style="font-size:.65rem;color:${colors[t]}">${h(e.reps)}</div>`:''}
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

function visuOpenEditor(cycleId, sessType) {
  if (confirm('Modifier la séance '+sessType+' du cycle '+cycleId+' ?')) {
    switchSubTab('editor');
    setTimeout(() => {
      const ec = document.getElementById('ed-cycle');
      const es = document.getElementById('ed-sess');
      if (ec && es) {
        ec.value = cycleId;
        rebuildEditorSessSelect(cycleId);
        if (document.getElementById('ed-sess').querySelector(`option[value="${sessType}"]`)) {
          es.value = sessType;
        }
        syncEditor();
        document.getElementById('sub-editor')?.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    }, 200);
  }
}
