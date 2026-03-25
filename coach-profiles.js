// ── COACH: PROFILE EDITING ───────────────────────────
if (typeof _clientPRData === 'undefined') window._clientPRData = { records:{} };
if (typeof _manualPRExName === 'undefined') window._manualPRExName = '';

function renderClientProfile() {
  const c = currentClient; if (!c) return;
  const el = document.getElementById('sub-profile'); if (!el) return;
  const age = c.birthday ? _calcAge(c.birthday) : null;
  el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">PROFIL</h4>
      <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem">
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Prénom / Nom</label>
          <input type="text" id="prof-name" class="inp" value="${h(c.name||'')}">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Code d'accès</label>
          <input type="text" id="prof-code" class="inp" value="${h(c.code||'')}" style="text-transform:uppercase;font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;letter-spacing:.1em">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Objectif</label>
          <input type="text" id="prof-objectif" class="inp" value="${h(c.objectif||'')}">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Date de naissance ${age?`<span style="color:var(--gold)">(${age} ans)</span>`:'(optionnel)'}</label>
          <input type="date" id="prof-birthday" class="inp" value="${c.birthday||''}">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Groupe</label>
          <select id="prof-group" class="inp">
            <option value="">Aucun groupe</option>
            ${allGroups.map(g=>`<option value="${g.id}"${c.group===g.id?' selected':''}>${h(g.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Notes coach (privées)</label>
          <textarea id="prof-notes" class="inp" rows="4" placeholder="Blessures, contraintes, observations...">${h(c.notes||'')}</textarea>
        </div>
      </div>
      <button class="btn btn-gold" style="width:100%;padding:1rem;font-size:.9rem" onclick="saveClientProfile()">ENREGISTRER LE PROFIL</button>
      <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border)">
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
          <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Archiver ce client</span>
          <button onclick="toggleArchiveClient('${c.id}')" class="btn btn-ghost btn-sm" style="${c.archived?'color:#34d399;border-color:rgba(52,211,153,.3)':''}">${c.archived?'Désarchiver':'Archiver'}</button>
        </label>
      </div>
    </div>
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">INFOS</h4>
      <div style="display:flex;flex-direction:column;gap:.75rem">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface);border-radius:.875rem;border:1px solid var(--border)">
          <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Membre depuis</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;font-style:italic">${c.createdAt?new Date(c.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'—'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface);border-radius:.875rem;border:1px solid var(--border)">
          <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Cycles</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;font-style:italic">${clientProgram.length}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface);border-radius:.875rem;border:1px solid var(--border)">
          <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Séances validées</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;font-style:italic;color:var(--gold)">${Object.keys(clientLogs).length}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface);border-radius:.875rem;border:1px solid var(--border)">
          <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Records enregistrés</span>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;font-style:italic;color:var(--gold)">${Object.keys(_clientPRData.records||{}).length}</span>
        </div>
      </div>
    </div>
  </div>`;
}

function _calcAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday); const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

async function saveClientProfile() {
  if (!currentClient) return;
  const name = document.getElementById('prof-name')?.value.trim();
  const code = document.getElementById('prof-code')?.value.trim().toUpperCase();
  const objectif = document.getElementById('prof-objectif')?.value.trim();
  const birthday = document.getElementById('prof-birthday')?.value || '';
  const notes = document.getElementById('prof-notes')?.value.trim() || '';
  const group = document.getElementById('prof-group')?.value || '';
  if (!name || !code) { toast('Nom et code requis','w'); return; }
  const conflict = allClients.find(c => c.code === code && c.id !== currentClient.id);
  if (conflict) { toast('Code déjà utilisé par '+conflict.name,'w'); return; }
  const updated = { ...currentClient, name, code, objectif, birthday, notes, group };
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id), updated);
  const idx = allClients.findIndex(c => c.id === currentClient.id);
  if (idx !== -1) allClients[idx] = updated;
  currentClient = updated;
  document.getElementById('fiche-client-name').innerText = name;
  document.getElementById('fiche-client-code').innerText = 'CODE: '+code;
  toast('Profil mis à jour !','s');
  renderClientProfile();
}

// ── PERSONAL RECORDS ─────────────────────────────────

async function loadClientPR() {
  if (!currentClient) return;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','personalRecords'));
    _clientPRData = (doc.exists && doc.data()) ? doc.data() : { records: {} };
    if (!_clientPRData.records) _clientPRData.records = {};
  } catch(e) { console.error(e); _clientPRData = { records:{} }; }
}

function renderClientPR() {
  const el = document.getElementById('sub-records'); if (!el) return;
  const records = _clientPRData.records || {};
  const exNames = Object.keys(records).sort();
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
    <div>
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">RECORDS PERSONNELS</h4>
      <p style="font-size:.65rem;color:var(--muted);margin-top:.25rem;font-style:italic">Formule Epley : 1RM théo = poids × (1 + reps/30)</p>
    </div>
    <button onclick="openModal('modal-manual-pr');document.getElementById('manual-pr-exname-input').value=''" class="btn btn-primary btn-sm">+ AJOUTER MANUELLEMENT</button>
  </div>
  ${!exNames.length ? `<div class="card" style="padding:3rem;text-align:center"><p style="color:var(--muted);font-style:italic">Aucun record. Ils apparaîtront quand le client saisit ses charges pendant une séance.</p></div>` :
  `<div class="card" style="overflow:hidden">${exNames.map(name => {
    const ex = records[name];
    const history = (ex.history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
    const best = ex.best1RM||0;
    const safeId = 'pr-'+name.replace(/[^a-zA-Z0-9]/g,'_');
    return `<div style="border-bottom:1px solid var(--border)">
      <div style="padding:1rem 1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem;cursor:pointer" onclick="togglePRHistory('${safeId}')">
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:900;font-style:italic">${h(name)}</span>
          <span class="badge" style="background:var(--gold);color:#1a0900">1RM : ${best} kg</span>
          <span style="font-size:.65rem;color:var(--muted)">${history.length} entrée(s)</span>
        </div>
        <div style="display:flex;align-items:center;gap:.5rem" onclick="event.stopPropagation()">
          <button onclick="openAddManualPR('${h(name)}')" class="btn btn-ghost btn-sm">+ Entrée</button>
          <span style="color:var(--muted);font-size:.8rem">▾</span>
        </div>
      </div>
      <div id="${safeId}" class="hidden" style="padding:0 1.5rem 1.5rem">
        <div style="overflow-x:auto">
          <table class="tbl" style="width:100%">
            <thead><tr><th>Date</th><th>Poids</th><th>Reps</th><th>1RM théo</th><th>Session</th><th style="text-align:right">Action</th></tr></thead>
            <tbody>${history.map((entry,di) => `<tr class="db-row">
              <td style="font-size:.7rem;color:var(--muted)">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})}</td>
              <td><span style="font-family:'Barlow Condensed',sans-serif;font-weight:900">${entry.weight} kg</span></td>
              <td><span style="font-family:'Barlow Condensed',sans-serif;font-weight:900">${entry.reps||'—'}</span></td>
              <td><span class="badge" style="background:rgba(240,165,0,.1);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${entry.theoreticalMax} kg</span></td>
              <td style="font-size:.65rem;color:var(--muted)">${entry.sessionKey||'—'}</td>
              <td style="text-align:right"><button onclick="deletePREntry('${h(name)}',${di})" class="btn btn-danger btn-sm">Suppr.</button></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`}`;
}

function togglePRHistory(id) {
  const el = document.getElementById(id); if (el) el.classList.toggle('hidden');
}

async function deletePREntry(exName, sortedIdx) {
  if (!currentClient || !_clientPRData.records[exName]) return;
  const sorted = (_clientPRData.records[exName].history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entry = sorted[sortedIdx]; if (!entry) return;
  _clientPRData.records[exName].history = (_clientPRData.records[exName].history||[]).filter(e => e !== entry);
  _clientPRData.records[exName].best1RM = (_clientPRData.records[exName].history||[]).reduce((mx,e)=>Math.max(mx,e.theoreticalMax||0),0);
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','personalRecords'), _clientPRData);
  renderClientPR();
  toast('Entrée supprimée','i');
}

function openAddManualPR(exNameDisplay) {
  const inp = document.getElementById('manual-pr-exname-input');
  if (inp) inp.value = exNameDisplay;
  document.getElementById('manual-pr-weight').value = '';
  document.getElementById('manual-pr-reps').value = '';
  document.getElementById('manual-pr-date').value = new Date().toISOString().split('T')[0];
  _manualPRExName = exNameDisplay;
  openModal('modal-manual-pr');
}

async function saveManualPR() {
  if (!currentClient) return;
  const exName = (document.getElementById('manual-pr-exname-input')?.value||_manualPRExName||'').trim();
  const weight = parseFloat(document.getElementById('manual-pr-weight')?.value);
  const reps = parseInt(document.getElementById('manual-pr-reps')?.value) || 0;
  const date = document.getElementById('manual-pr-date')?.value;
  if (!exName) { toast('Nom exercice requis','w'); return; }
  if (!weight) { toast('Poids requis','w'); return; }
  const rm1 = reps > 0 ? Math.round(weight*(1+reps/30)*10)/10 : weight;
  if (!_clientPRData.records) _clientPRData.records = {};
  if (!_clientPRData.records[exName]) _clientPRData.records[exName] = { history:[], best1RM:0 };
  _clientPRData.records[exName].history.push({
    date: date ? new Date(date).toISOString() : new Date().toISOString(),
    weight, reps, theoreticalMax: rm1, sessionKey: 'manuel'
  });
  _clientPRData.records[exName].best1RM = Math.max(_clientPRData.records[exName].best1RM||0, rm1);
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','personalRecords'), _clientPRData);
  closeModal('modal-manual-pr');
  renderClientPR();
  toast('Record ajouté pour '+exName,'s');
}

// ── PROGRESSION CHARTS ───────────────────────────────

async function renderProgressCharts() {
  const el = document.getElementById('sub-progression'); if (!el) return;
  const exNames = Object.keys(_clientPRData.records||{}).sort();
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:1.5rem">
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">PROGRESSION 1RM</h4>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1.5rem">
        <select id="prog-ex-select" class="inp" style="width:auto" onchange="renderExProgressChart()">
          <option value="">-- Choisir un exercice --</option>
          ${exNames.map(n=>`<option value="${h(n)}">${h(n)}</option>`).join('')}
        </select>
      </div>
      <div id="prog-ex-chart"><p style="color:var(--muted);font-style:italic;font-size:.8rem">Sélectionnez un exercice ci-dessus.</p></div>
    </div>
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:.5rem">TONNAGE PAR SÉANCE</h4>
      <p style="font-size:.75rem;color:var(--muted);margin-bottom:1.5rem">Tonnage total (kg) de chaque séance validée avec saisie de charges.</p>
      <div id="prog-tonnage-chart">${_renderTonnageChart()}</div>
    </div>
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:.5rem">MEILLEURS 1RM PAR EXERCICE</h4>
      <div id="prog-pr-table">${_renderPRSummaryTable()}</div>
    </div>
  </div>`;
}

function renderExProgressChart() {
  const exName = document.getElementById('prog-ex-select')?.value;
  const el = document.getElementById('prog-ex-chart'); if (!el) return;
  if (!exName) { el.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Sélectionnez un exercice.</p>'; return; }
  const record = _clientPRData.records?.[exName];
  if (!record || !record.history?.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucune donnée pour cet exercice.</p>'; return; }
  const history = record.history.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  el.innerHTML = svgLineChart(
    history.map(e=>({ label: new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}), value: e.theoreticalMax, tooltip: `${e.weight}kg × ${e.reps} = ${e.theoreticalMax}kg 1RM` })),
    'var(--gold)', '1RM théorique (kg)'
  );
}

function _renderTonnageChart() {
  const logs = Object.values(clientLogs).filter(l=>l.tonnage>0).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  if (!logs.length) return '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucune donnée. Les données apparaissent quand le client saisit ses charges.</p>';
  return svgLineChart(
    logs.map(l=>({ label:`C${l.cycle}S${l.type}`, value: Math.round(l.tonnage), tooltip: `${Math.round(l.tonnage)} kg` })),
    '#3b82f6', 'Tonnage (kg)'
  );
}

function _renderPRSummaryTable() {
  const records = _clientPRData.records||{};
  const exNames = Object.keys(records).sort();
  if (!exNames.length) return '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucun record.</p>';
  return `<div style="overflow-x:auto"><table class="tbl" style="width:100%">
    <thead><tr><th>Exercice</th><th>Meilleur 1RM</th><th>Dernière séance</th><th>Nb entrées</th></tr></thead>
    <tbody>${exNames.map(name => {
      const ex = records[name];
      const last = (ex.history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      return `<tr class="db-row">
        <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic">${h(name)}</td>
        <td><span class="badge" style="background:var(--gold);color:#1a0900">${ex.best1RM||0} kg</span></td>
        <td style="font-size:.7rem;color:var(--muted)">${last?new Date(last.date).toLocaleDateString('fr-FR'):'—'}</td>
        <td style="font-size:.8rem;color:var(--muted)">${(ex.history||[]).length}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ── SVG LINE CHART ────────────────────────────────────

function svgLineChart(data, color, yLabel) {
  if (!data || !data.length) return '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucune donnée.</p>';
  const W=600, H=220, P={t:20,r:20,b:45,l:60};
  const vals = data.map(d=>d.value);
  const minV = Math.max(0, Math.min(...vals)*0.9);
  const maxV = Math.max(...vals)*1.1 + 1;
  const range = maxV - minV || 1;
  const iW = W - P.l - P.r;
  const iH = H - P.t - P.b;
  const xS = i => P.l + (data.length > 1 ? i*(iW/(data.length-1)) : iW/2);
  const yS = v => P.t + iH - ((v-minV)/range)*iH;
  const pathD = data.map((d,i)=>`${i===0?'M':'L'} ${xS(i).toFixed(1)} ${yS(d.value).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${xS(data.length-1).toFixed(1)} ${(P.t+iH).toFixed(1)} L ${P.l} ${(P.t+iH).toFixed(1)} Z`;
  const gradId = 'g'+Math.random().toString(36).slice(2,7);
  const colorHex = color.startsWith('var(') ? '#f0a500' : color;
  let ticks = '';
  for (let i=0;i<=4;i++) {
    const v = minV + range*i/4;
    const y = yS(v);
    ticks += `<line x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}" stroke="#1e2d40" stroke-width="1"/>
    <text x="${(P.l-6).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="end" fill="#4a6080" font-size="10" font-family="Barlow Condensed,sans-serif,monospace">${Math.round(v)}</text>`;
  }
  const step = Math.ceil(data.length/8);
  let xlabels = '';
  data.forEach((d,i) => {
    if (i%step===0 || i===data.length-1) xlabels += `<text x="${xS(i).toFixed(1)}" y="${(P.t+iH+16).toFixed(1)}" text-anchor="middle" fill="#4a6080" font-size="9" font-family="Barlow Condensed,sans-serif">${d.label}</text>`;
  });
  const points = data.map((d,i)=>`<circle cx="${xS(i).toFixed(1)}" cy="${yS(d.value).toFixed(1)}" r="4" fill="${colorHex}" stroke="#141d2b" stroke-width="2"><title>${d.tooltip||d.label+': '+d.value}</title></circle>`).join('');
  const lastVal = data[data.length-1]?.value;
  return `<div style="overflow-x:auto">
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;display:block">
      <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${colorHex}" stop-opacity="0.25"/><stop offset="100%" stop-color="${colorHex}" stop-opacity="0"/></linearGradient></defs>
      <path d="${areaD}" fill="url(#${gradId})"/>
      ${ticks}
      <path d="${pathD}" stroke="${colorHex}" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      ${points}
      ${xlabels}
      <text x="12" y="${(P.t+iH/2).toFixed(1)}" text-anchor="middle" fill="#4a6080" font-size="9" font-family="Barlow Condensed,sans-serif" transform="rotate(-90,12,${(P.t+iH/2).toFixed(1)})">${yLabel}</text>
    </svg>
    ${lastVal!==undefined?`<div style="text-align:right;font-family:'Barlow Condensed',sans-serif;font-size:.8rem;font-weight:700;font-style:italic;color:${colorHex};margin-top:.25rem">Dernier : ${lastVal} kg</div>`:''}
  </div>`;
}
