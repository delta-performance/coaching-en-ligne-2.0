// ═══════════════════════════════════
// VISUALISATION
// ═══════════════════════════════════

let visuSelectedCycles = new Set();

function populateVisuSelect() {
  const el = document.getElementById('visu-cycle-sel');
  if (!el) return;

  el.innerHTML = clientProgram.map(c => `<option value="${c.id}">C${c.id} – ${h(c.focus)}</option>`).join('');

  const chk = document.getElementById('visu-ctrl-cycles-check');
  if (!chk) return;

  chk.innerHTML = clientProgram.map(c => `<button onclick="toggleVisuCycle(${c.id},this)" style="padding:.4rem .875rem;border-radius:.75rem;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--muted);transition:all .2s">C${c.id} – ${h(c.focus.substring(0, 12))}</button>`).join('');
}

function toggleVisuCycle(id, btn) {
  if (visuSelectedCycles.has(id)) {
    visuSelectedCycles.delete(id);
    btn.style.borderColor = 'var(--border)';
    btn.style.background = 'var(--surface)';
    btn.style.color = 'var(--muted)';
  } else {
    visuSelectedCycles.add(id);
    btn.style.borderColor = 'rgba(240,165,0,.5)';
    btn.style.background = 'rgba(240,165,0,.1)';
    btn.style.color = 'var(--gold)';
  }

  renderVisu();
}

function setVisuMode(m) {
  visuMode = m;

  ['same-cycle', 'cross-sess', 'all'].forEach(k => {
    const btn = document.getElementById('vm-' + k);
    if (btn) btn.className = 'tab-pill ' + (k === m ? 'on' : 'off');
  });

  const cc = document.getElementById('visu-ctrl-cycle');
  const cs = document.getElementById('visu-ctrl-sess');
  const cck = document.getElementById('visu-ctrl-cycles-check');

  if (m === 'same-cycle') {
    cc.style.display = 'flex';
    cs.style.display = 'none';
    if (cck) cck.style.display = 'none';
  } else if (m === 'cross-sess') {
    cc.style.display = 'none';
    cs.style.display = 'flex';
    if (cck) cck.style.display = 'flex';
  } else {
    cc.style.display = 'none';
    cs.style.display = 'none';
    if (cck) cck.style.display = 'flex';
  }

  renderVisu();
}

function setVisuSess(s) {
  visuSess = s;
  updateVisuSessButtons();
  renderVisu();
}

function updateVisuSessButtons() {
  // Get all available sessions from selected cycles
  let allSessions = new Set();
  
  if (visuMode === 'cross-sess') {
    const selCycles = Array.from(visuSelectedCycles);
    selCycles.forEach(cId => {
      const c = clientProgram.find(x => x.id === cId);
      if (c) {
        getAvailableSessions(c).forEach(s => allSessions.add(s));
      }
    });
  } else {
    const cId = parseInt(document.getElementById('visu-cycle-sel')?.value);
    const c = clientProgram.find(x => x.id === cId);
    if (c) {
      getAvailableSessions(c).forEach(s => allSessions.add(s));
    }
  }

  const sessions = Array.from(allSessions).sort();
  const container = document.getElementById('visu-sess-btns');
  if (!container) return;

  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#f59e0b', G: '#06b6d4', H: '#84cc16' };

  container.innerHTML = sessions.map(s => {
    const col = colors[s] || '#6b7280';
    const isActive = s === visuSess;
    return `<button onclick="setVisuSess('${s}')" id="vs-${s}" class="tab-pill ${isActive ? 'on' : 'off'}" style="padding:.3rem .875rem;font-size:.65rem">${s}</button>`;
  }).join('');
}

function renderVisu() {
  const el = document.getElementById('visu-content');
  if (!el) return;

  const colors = { A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6', E: '#ec4899', F: '#f59e0b', G: '#06b6d4', H: '#84cc16' };

  if (visuMode === 'same-cycle') {
    const cId = parseInt(document.getElementById('visu-cycle-sel')?.value);
    const c = clientProgram.find(x => x.id === cId);

    if (!c) {
      el.innerHTML = '<p style="color:var(--muted);font-style:italic">Sélectionnez un cycle.</p>';
      return;
    }

    const sessions = getAvailableSessions(c);
    updateVisuSessButtons();

    el.innerHTML = `<h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">CYCLE ${c.id} — ${h(c.focus)}</h5>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem">
      ${sessions.map(t => {
        const sp = getSessParams(c, t);
        const exs = getSessEx(c, t);
        const col = colors[t] || '#6b7280';
        const isCircuit = sp.mode === 'circuit';

        return `<div class="card" style="overflow:hidden;cursor:pointer;transition:box-shadow .2s" onmouseover="this.style.boxShadow='0 0 0 2px ${col}'" onmouseout="this.style.boxShadow='none'" onclick="visuOpenEditor(${c.id},'${t}')">
          <div style="background:${col};padding:1rem;display:flex;align-items:center;gap:.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;color:white">SÉANCE ${t}</span>
            <span class="badge" style="background:rgba(255,255,255,.2);color:white">${isCircuit ? 'Circuit' : 'Classique'}</span>
            <span style="margin-left:auto;font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:700;font-style:italic;color:rgba(255,255,255,.6)">✏️ Modifier</span>
          </div>
          <div style="padding:1rem">
            ${isCircuit ? `<div style="display:flex;gap:.5rem;margin-bottom:.75rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>` : ''}
            <div style="display:flex;flex-direction:column;gap:.4rem">
              ${renderVisuExercises(exs, isCircuit, col)}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } else if (visuMode === 'cross-sess') {
    const selCycles = Array.from(visuSelectedCycles);

    if (!selCycles.length) {
      el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>';
      return;
    }

    updateVisuSessButtons();
    const col = colors[visuSess] || '#6b7280';

    el.innerHTML = `<h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">SÉANCE ${visuSess} — ${selCycles.length} cycle(s)</h5>
    <div style="display:flex;flex-direction:column;gap:1.25rem">
      ${selCycles.map(cId => {
        const c = clientProgram.find(x => x.id === cId);
        if (!c || !c.sessions[visuSess]) return '';

        const sp = getSessParams(c, visuSess);
        const exs = getSessEx(c, visuSess);
        const isCircuit = sp.mode === 'circuit';

        return `<div class="card" style="overflow:hidden;cursor:pointer" onclick="visuOpenEditor(${c.id},'${visuSess}')">
          <div style="background:${col}33;padding:.875rem 1rem;border-bottom:1px solid ${col}44;display:flex;align-items:center;gap:.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;color:${col}">C${c.id}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;font-style:italic;color:var(--muted)">${h(c.focus)}</span>
            <span class="badge" style="margin-left:auto;background:var(--surface);color:var(--muted);border:1px solid var(--border)">${isCircuit ? 'Circuit' : 'Classique'}</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.6rem;font-weight:700;font-style:italic;color:var(--muted)">✏️ Modifier</span>
          </div>
          <div style="padding:1rem">
            ${isCircuit ? `<div style="display:flex;gap:.5rem;margin-bottom:.75rem"><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${sp.rest}</span><span class="badge" style="background:var(--surface);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${sp.tours} tours</span></div>` : ''}
            <div style="display:flex;flex-direction:column;gap:.4rem">
              ${renderVisuExercises(exs, isCircuit, col)}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  } else {
    // all
    const selCycles = Array.from(visuSelectedCycles);

    if (!selCycles.length) {
      el.innerHTML = '<p style="color:var(--muted);font-style:italic">Cliquez sur des cycles ci-dessus pour les sélectionner.</p>';
      return;
    }

    el.innerHTML = selCycles.map(cId => {
      const c = clientProgram.find(x => x.id === cId);
      if (!c) return '';

      const sessions = getAvailableSessions(c);

      return `<div style="margin-bottom:2rem">
        <h5 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">CYCLE ${c.id} — ${h(c.focus)}</h5>
        <div style="overflow-x:auto">
          <table class="tbl" style="width:100%;background:var(--card);border-radius:1rem;overflow:hidden">
            <thead><tr>
              <th>Exercice</th>
              ${sessions.map(t => `<th style="color:${colors[t] || '#6b7280'}">Séance ${t}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${(() => {
                const maxEx = Math.max(...sessions.map(t => getSessEx(c, t).length));
                return Array.from({ length: maxEx }, (_, i) => `<tr class="db-row">
                  <td style="font-size:.75rem;color:var(--muted)">Ex ${i + 1}</td>
                  ${sessions.map(t => {
                    const e = getSessEx(c, t)[i];
                    const sp = getSessParams(c, t);
                    const isCircuit = sp.mode === 'circuit';
                    
                    if (!e) return `<td style="color:var(--border)">—</td>`;
                    
                    return `<td onclick="visuOpenEditor(${c.id},'${t}')" style="cursor:pointer">
                      <div style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700">${h(e.name)}</div>
                      ${e.reps ? `<div style="font-size:.65rem;color:${colors[t] || '#6b7280'}">${h(e.reps)}</div>` : ''}
                      ${!isCircuit && e.sets ? `<div style="font-size:.6rem;color:var(--muted)">${e.sets} séries</div>` : ''}
                      ${!isCircuit && e.rpeTarget ? `<div style="font-size:.6rem;color:var(--gold)">RPE ${e.rpeTarget}</div>` : ''}
                      ${!isCircuit && e.restSet ? `<div style="font-size:.6rem;color:var(--muted)">Récup: ${e.restSet}</div>` : ''}
                    </td>`;
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

function renderVisuExercises(exs, isCircuit, col) {
  let html = '';
  let i = 0;

  while (i < exs.length) {
    const e = exs[i];

    // Check if this is part of a superset
    if (!isCircuit && e.superset) {
      // Collect all exercises in this superset
      let supersetGroup = [e];
      let j = i + 1;
      while (j < exs.length && exs[j - 1].superset) {
        supersetGroup.push(exs[j]);
        j++;
      }

      html += renderVisuSuperset(supersetGroup, i, col);
      i = j;
    } else {
      html += renderVisuExercise(e, i, isCircuit, col);
      i++;
    }
  }

  return html;
}

function renderVisuExercise(e, i, isCircuit, col) {
  return `<div style="display:flex;align-items:center;gap:.5rem;padding:.5rem .75rem;background:var(--surface);border-radius:.75rem">
    ${e.superset ? `<span style="font-size:.7rem;color:var(--gold)">⇄</span>` : ''}
    <span style="font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;flex:1">${h(e.name)}</span>
    ${e.reps ? `<span style="font-size:.65rem;color:${col};font-family:'Barlow Condensed',sans-serif;font-weight:700">${h(e.reps)}</span>` : ''}
    ${!isCircuit && e.sets ? `<span style="font-size:.65rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">${e.sets}x</span>` : ''}
    ${!isCircuit && e.rpeTarget ? `<span style="font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:700">RPE ${e.rpeTarget}</span>` : ''}
    ${!isCircuit && e.restSet ? `<span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">Récup: ${e.restSet}</span>` : ''}
  </div>`;
}

function renderVisuSuperset(exercises, startIdx, col) {
  return `<div style="position:relative;border:1px dashed rgba(240,165,0,.3);border-radius:.75rem;padding:.75rem;background:rgba(240,165,0,.03)">
    <div style="font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--gold);margin-bottom:.5rem;text-align:center">⇄ SUPERSET</div>
    <div style="display:flex;flex-direction:column;gap:.4rem">
      ${exercises.map((e, localIdx) => `<div style="display:flex;align-items:center;gap:.5rem;padding:.4rem .6rem;background:var(--surface);border-radius:.5rem">
        <span style="font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900">${String.fromCharCode(65 + localIdx)}</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:.75rem;font-weight:700;flex:1">${h(e.name)}</span>
        ${e.reps ? `<span style="font-size:.6rem;color:${col};font-family:'Barlow Condensed',sans-serif;font-weight:700">${h(e.reps)}</span>` : ''}
        ${e.sets ? `<span style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">${e.sets}x</span>` : ''}
        ${e.rpeTarget ? `<span style="font-size:.55rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:700">RPE ${e.rpeTarget}</span>` : ''}
        ${e.restSet ? `<span style="font-size:.55rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700">Récup: ${e.restSet}</span>` : ''}
      </div>`).join('')}
    </div>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:1.5rem;color:var(--gold);opacity:.3;pointer-events:none">↕</div>
  </div>`;
}

function visuOpenEditor(cycleId, sessType) {
  if (confirm('Modifier la séance ' + sessType + ' du cycle ' + cycleId + ' ?')) {
    switchSubTab('editor');

    setTimeout(() => {
      const ec = document.getElementById('ed-cycle');
      const es = document.getElementById('ed-sess');

      if (ec && es) {
        ec.value = cycleId;
        es.value = sessType;
        syncEditor();
        document.getElementById('sub-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  }
}

// Export to window
Object.assign(window, {
  populateVisuSelect,
  toggleVisuCycle,
  setVisuMode,
  setVisuSess,
  updateVisuSessButtons,
  renderVisu,
  renderVisuExercises,
  renderVisuExercise,
  renderVisuSuperset,
  visuOpenEditor
});
