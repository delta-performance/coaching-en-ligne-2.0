// ── THEME TOGGLE ─────────────────────────────────────

(function initTheme() {
  const saved = localStorage.getItem('delta-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = saved ? saved === 'dark' : prefersDark;
  if (useDark) {
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark-forced');
  } else {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-forced');
  }
  _updateThemeBtn();
})();

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light-mode');
  if (isLight) {
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark-forced');
    localStorage.setItem('delta-theme','dark');
  } else {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-forced');
    localStorage.setItem('delta-theme','light');
  }
  _updateThemeBtn();
}

function _updateThemeBtn() {
  const btn = document.getElementById('btn-theme'); if (!btn) return;
  const isLight = document.documentElement.classList.contains('light-mode');
  btn.innerText = isLight ? '🌙' : '☀️';
  btn.title = isLight ? 'Passer en mode nuit' : 'Passer en mode jour';
}

// ── PDF GENERATION ───────────────────────────────────

function openPDFModal() { openModal('modal-pdf'); }

function generatePDF(scope) {
  closeModal('modal-pdf');
  const c = clientProgram; if (!c || !c.length) { toast('Aucun programme chargé','w'); return; }
  const clientName = currentClient ? (currentClient.name||currentClient.code) : 'Client';
  let html = _pdfBase(clientName);

  if (scope === 'session') {
    const cycleId = parseInt(document.getElementById('ed-cycle')?.value);
    const sessType = document.getElementById('ed-sess')?.value || 'A';
    const cycle = c.find(x => x.id === cycleId);
    if (!cycle) { toast('Sélectionnez un cycle dans l\'éditeur','w'); return; }
    html += _pdfCycleSection(cycle, [sessType], clientName);
  } else if (scope === 'cycle') {
    const cycleId = parseInt(document.getElementById('ed-cycle')?.value);
    const cycle = c.find(x => x.id === cycleId);
    if (!cycle) { toast('Sélectionnez un cycle dans l\'éditeur','w'); return; }
    html += _pdfCycleSection(cycle, getActiveSessions(cycle), clientName);
  } else {
    c.forEach(cycle => {
      html += _pdfCycleSection(cycle, getActiveSessions(cycle), clientName);
    });
  }

  html += `</body></html>`;
  const win = window.open('','_blank','width=900,height=700');
  if (!win) { toast('Autorisez les popups pour générer le PDF','w'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function _pdfBase(clientName) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>DELTA Performance – ${clientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Barlow:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Barlow',sans-serif;color:#0f172a;background:white;font-size:10pt}
  h1{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:28pt;text-transform:uppercase;color:#c8102e;letter-spacing:-.02em}
  h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:18pt;text-transform:uppercase;color:#0f172a;margin-bottom:4pt}
  h3{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:14pt;text-transform:uppercase;color:#3b82f6;margin-bottom:4pt}
  .header{border-bottom:3pt solid #c8102e;padding-bottom:8pt;margin-bottom:16pt;display:flex;justify-content:space-between;align-items:flex-end}
  .gold{color:#d08000}
  .cycle-block{margin-bottom:24pt;page-break-inside:avoid}
  .cycle-header{background:#0f172a;color:white;padding:6pt 10pt;border-radius:4pt;margin-bottom:8pt;display:flex;align-items:center;gap:10pt}
  .sess-block{margin-bottom:14pt;border:1pt solid #e2e8f0;border-radius:4pt;overflow:hidden;page-break-inside:avoid}
  .sess-header{padding:5pt 10pt;color:white;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:12pt;display:flex;justify-content:space-between;align-items:center}
  .sess-A{background:#1e3a8a} .sess-B{background:#064e3b} .sess-C{background:#7c2d12} .sess-D{background:#4c1d95}
  .sess-default{background:#334155}
  table{width:100%;border-collapse:collapse;font-size:9pt}
  th{background:#f8fafc;padding:4pt 6pt;text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#64748b;border-bottom:1pt solid #e2e8f0}
  td{padding:5pt 6pt;border-bottom:1pt solid #f1f5f9;vertical-align:top}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:1pt 4pt;border-radius:2pt;font-family:'Barlow Condensed',sans-serif;font-size:7pt;font-weight:900}
  .badge-gold{background:#fef3c7;color:#92400e}
  .superset-label{font-family:'Barlow Condensed',sans-serif;font-size:7pt;font-weight:900;color:#d08000;padding:2pt 6pt;background:#fef9e7}
  @media print{@page{margin:1.2cm;size:A4} body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="header">
  <div>
    <h1>DELTA <span class="gold">Performance</span></h1>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:9pt;color:#64748b;text-transform:uppercase;letter-spacing:.2em">Programme d'entraînement</div>
  </div>
  <div style="text-align:right;font-family:'Barlow Condensed',sans-serif">
    <div style="font-size:14pt;font-weight:900;font-style:italic">${h(currentClient?.name||'')}</div>
    <div style="font-size:8pt;color:#64748b">${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div>
  </div>
</div>`;
}

function _pdfCycleSection(cycle, sessions, clientName) {
  const sp = typeof getSessParams === 'function' ? getSessParams : () => ({mode:'circuit',rest:'45s',tours:'3'});
  const gex = typeof getSessEx === 'function' ? getSessEx : () => [];
  let html = `<div class="cycle-block">
    <div class="cycle-header">
      <h2 style="color:white;margin:0">CYCLE ${cycle.id}</h2>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:11pt;color:rgba(255,255,255,.7)">${h(cycle.focus||'')}</span>
    </div>`;
  sessions.forEach(t => {
    const params = sp(cycle, t);
    const exs = gex(cycle, t);
    const sessColors = {A:'sess-A',B:'sess-B',C:'sess-C',D:'sess-D'};
    const cls = sessColors[t] || 'sess-default';
    html += `<div class="sess-block">
      <div class="sess-header ${cls}">
        <span>SÉANCE ${t}</span>
        <span style="font-size:9pt;opacity:.8">${params.mode==='classic'?'Mode classique':'Circuit • '+params.tours+' tours • Récup '+params.rest}</span>
      </div>
      ${exs.length ? `<table>
        <thead><tr>
          <th>#</th><th>Exercice</th>
          ${params.mode==='classic'?'<th>Séries</th><th>Reps</th><th>Tempo</th><th>Récup série</th><th>RPE cible</th>':'<th>Volume/Tempo</th>'}
          <th>Notes</th>
        </tr></thead>
        <tbody>` + _pdfExRows(exs, params) + `</tbody></table>` : `<div style="padding:8pt;color:#94a3b8;font-style:italic;font-size:9pt">Séance vide</div>`}
    </div>`;
  });
  html += `</div>`;
  return html;
}

function _pdfExRows(exs, params) {
  let rows = ''; let supersetOpen = false;
  exs.forEach((e, i) => {
    const isSS = e.superset;
    const nextIsSS = exs[i+1] && exs[i+1].superset;
    if (isSS && !supersetOpen) {
      rows += `<tr><td colspan="8" class="superset-label">⇄ SUPERSET</td></tr>`;
      supersetOpen = true;
    }
    rows += `<tr>
      <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900;color:#94a3b8">${String(i+1).padStart(2,'0')}</td>
      <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900">${h(e.name||'')}</td>
      ${params.mode==='classic'
        ? `<td>${e.sets||'—'}</td><td style="color:#d08000;font-weight:bold">${e.reps||'—'}</td><td>${e.tst||'—'}</td><td>${e.restSet||'—'}</td><td>${e.rpeTarget||'—'}</td>`
        : `<td>${e.reps||''} ${e.tst?'• '+e.tst:''}</td>`}
      <td style="font-size:8pt;color:#64748b">${e.desc||e.comment||'—'}</td>
    </tr>`;
    if (supersetOpen && !nextIsSS) supersetOpen = false;
  });
  return rows;
}

// PDF depuis progression (stats)
function generateProgressPDF() {
  if (!currentClient) { toast('Ouvrez une fiche client','w'); return; }
  const records = _clientPRData?.records || {};
  let html = _pdfBase(currentClient.name||currentClient.code);
  html += `<h2>RECORDS PERSONNELS</h2>
  <p style="margin-bottom:12pt;color:#64748b;font-size:9pt">Formule Epley : 1RM théo = poids × (1 + reps/30)</p>
  <table>
    <thead><tr><th>Exercice</th><th>Meilleur 1RM</th><th>Dernière entrée</th><th>Nb entrées</th></tr></thead>
    <tbody>${Object.keys(records).sort().map(name => {
      const ex = records[name];
      const last = (ex.history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      return `<tr><td style="font-weight:bold">${h(name)}</td><td><span class="badge badge-gold">${ex.best1RM||0} kg</span></td><td>${last?new Date(last.date).toLocaleDateString('fr-FR'):'—'}</td><td>${(ex.history||[]).length}</td></tr>`;
    }).join('')}</tbody>
  </table></body></html>`;
  const win = window.open('','_blank','width=900,height=700');
  if (!win) { toast('Autorisez les popups','w'); return; }
  win.document.write(html); win.document.close(); win.focus();
  setTimeout(() => win.print(), 600);
}

// ── DOCUMENTS COACH → CLIENT ─────────────────────────

let _clientDocuments = [];

async function loadClientDocuments() {
  if (!currentClient) return;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','documents'));
    _clientDocuments = (doc.exists && doc.data()?.docs) ? doc.data().docs : [];
  } catch(e) { console.error(e); _clientDocuments = []; }
}

function renderDocumentsTab() {
  const el = document.getElementById('sub-documents'); if (!el) return;
  el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
    <div>
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">DOCUMENTS CLIENT</h4>
      <p style="font-size:.65rem;color:var(--muted);margin-top:.25rem">Fichiers visibles par le client dans son espace.</p>
    </div>
    <button onclick="openModal('modal-add-doc')" class="btn btn-primary btn-sm">+ AJOUTER</button>
  </div>
  ${!_clientDocuments.length
    ? `<div class="card" style="padding:3rem;text-align:center"><p style="color:var(--muted);font-style:italic">Aucun document. Ajoutez des PDFs, images ou liens.</p></div>`
    : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
        ${_clientDocuments.map((doc,i) => `<div class="card" style="padding:1.25rem">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem">
            <div style="flex:1">
              <div style="font-size:1.5rem;margin-bottom:.5rem">${doc.type==='image'?'🖼':'📄'}</div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;font-style:italic;margin-bottom:.25rem">${h(doc.title)}</div>
              <div style="font-size:.65rem;color:var(--muted)">${new Date(doc.addedAt).toLocaleDateString('fr-FR')}</div>
              ${doc.notes?`<p style="font-size:.7rem;color:var(--muted);margin-top:.4rem;font-style:italic">${h(doc.notes)}</p>`:''}
            </div>
            <div style="display:flex;flex-direction:column;gap:.4rem">
              <a href="${h(doc.url)}" target="_blank" class="btn btn-gold btn-sm">Ouvrir</a>
              <button onclick="deleteDocument(${i})" class="btn btn-danger btn-sm">Suppr.</button>
            </div>
          </div>
        </div>`).join('')}
      </div>`}`;
}

async function saveDocument() {
  if (!currentClient) return;
  const title = document.getElementById('doc-title')?.value.trim();
  const type = document.getElementById('doc-type')?.value || 'pdf';
  const urlVal = document.getElementById('doc-url')?.value.trim();
  const notes = document.getElementById('doc-notes')?.value.trim() || '';
  const file = document.getElementById('doc-file')?.files[0];
  if (!title) { toast('Titre requis','w'); return; }
  let finalUrl = urlVal;
  if (file) {
    if (file.size > 2097152) { toast('Fichier trop lourd (max 2 Mo)','w'); return; }
    finalUrl = await new Promise((res,rej) => { const r = new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
  }
  if (!finalUrl) { toast('URL ou fichier requis','w'); return; }
  const newDoc = { id:'doc_'+Date.now(), title, type, url:finalUrl, notes, addedAt:new Date().toISOString() };
  _clientDocuments.push(newDoc);
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','documents'), { docs: _clientDocuments });
  closeModal('modal-add-doc');
  renderDocumentsTab();
  toast('Document ajouté !','s');
}

async function deleteDocument(idx) {
  if (!currentClient) return;
  _clientDocuments.splice(idx, 1);
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','documents'), { docs: _clientDocuments });
  renderDocumentsTab();
  toast('Document supprimé','i');
}

// ── CLIENT VIEW: DOCUMENTS SECTION ───────────────────

async function renderClientDocuments() {
  const el = document.getElementById('client-docs-section'); if (!el) return;
  const cid = currentUser?.isCoach ? currentClient?.id : currentUser?.id;
  if (!cid) return;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'data','documents'));
    const docs = (doc.exists && doc.data()?.docs) ? doc.data().docs : [];
    if (!docs.length) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.innerHTML = `<div style="margin-top:2rem">
      <h3 style="font-size:1.75rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">MES DOCUMENTS</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
        ${docs.map(d=>`<a href="${h(d.url)}" target="_blank" class="card-hover" style="padding:1.25rem;display:block;text-decoration:none">
          <div style="font-size:2rem;margin-bottom:.75rem">${d.type==='image'?'🖼':'📄'}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;font-style:italic;color:var(--text)">${h(d.title)}</div>
          ${d.notes?`<p style="font-size:.7rem;color:var(--muted);margin-top:.25rem">${h(d.notes)}</p>`:''}
          <div style="font-size:.6rem;color:var(--muted);margin-top:.5rem;text-transform:uppercase;letter-spacing:.1em">Ouvrir →</div>
        </a>`).join('')}
      </div>
    </div>`;
  } catch(e) { console.error(e); }
}
