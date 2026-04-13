// ── CLIENT TABS ───────────────────────────────────────
function switchClientTab(tab) {
  ['programme','documents','tracking'].forEach(t => {
    const panel = document.getElementById('client-tab-'+t);
    const btn = document.getElementById('ctab-'+t);
    if (!panel || !btn) return;
    if (t === tab) { 
      panel.classList.remove('hidden'); 
      btn.className = 'sub-tab-pill on'; 
    } else { 
      panel.classList.add('hidden'); 
      btn.className = 'sub-tab-pill off'; 
    }
  });
  if (tab === 'documents' && typeof renderClientDocuments === 'function') renderClientDocuments();
  if (tab === 'tracking' && typeof renderClientTracking === 'function') renderClientTracking();
}

// ── THEME TOGGLE ─────────────────────────────────────

function openDocument(e, url, type) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (!url) return;
  if (url.startsWith('data:')) {
    // base64 dataURL → Blob pour que le navigateur l'ouvre correctement
    const mime = url.split(';')[0].split(':')[1] || 'application/octet-stream';
    const b64 = url.split(',')[1];
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } else {
    window.open(url, '_blank');
  }
}

(function initTheme() {
  // Toujours utiliser la préférence du navigateur au chargement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (prefersDark) {
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark-forced');
  } else {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-forced');
  }
  _updateThemeBtn();
  
  // Écouter les changements de préférence système en temps réel
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (e.matches) {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark-forced');
    } else {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark-forced');
    }
    _updateThemeBtn();
  });
})();

function toggleTheme() {
  const isLight = document.documentElement.classList.contains('light-mode');
  if (isLight) {
    document.documentElement.classList.remove('light-mode');
    document.documentElement.classList.add('dark-forced');
  } else {
    document.documentElement.classList.add('light-mode');
    document.documentElement.classList.remove('dark-forced');
  }
  _updateThemeBtn();
  // Plus de sauvegarde dans localStorage - le toggle est temporaire
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
  
  // Obtenir le microcycle sélectionné depuis la hiérarchie ou l'éditeur
  let selectedMicro = null;
  let selectedMacroId = null;
  let selectedMesoId = null;
  
  if (typeof getMicroById === 'function' && window._hierarchy) {
    const { currentMacro, currentMeso, currentMicro } = window._hierarchy;
    if (currentMacro && currentMeso && currentMicro) {
      selectedMicro = getMicroById(currentMacro, currentMeso, currentMicro);
      selectedMacroId = currentMacro;
      selectedMesoId = currentMeso;
    }
  }
  
  // Fallback sur l'ancienne méthode si pas de hiérarchie
  if (!selectedMicro) {
    const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
    const cycleId = typeof getEdCycleId === 'function' ? getEdCycleId() : (allMicros[0]?.id);
    selectedMicro = allMicros.find(x => x.id === cycleId);
    selectedMacroId = selectedMicro?.macroId;
    selectedMesoId = selectedMicro?.mesoId;
  }
  
  if (!selectedMicro) { toast('Aucun microcycle sélectionné','w'); return; }
  
  const clientName = currentClient ? (currentClient.name||currentClient.code) : 'Client';
  let html = _pdfBase(clientName);

  if (scope === 'session') {
    const sessType = typeof getEdSess === 'function' ? getEdSess() : 'A';
    html += _pdfCycleSection(selectedMicro, [sessType], clientName, selectedMacroId, selectedMesoId);
  } else if (scope === 'cycle') {
    html += _pdfCycleSection(selectedMicro, getActiveSessions(selectedMicro), clientName, selectedMacroId, selectedMesoId);
  } else {
    // Tous les microcycles
    const allMicros = typeof getAllMicros === 'function' ? getAllMicros() : clientProgram;
    if (!allMicros || !allMicros.length) { toast('Aucun programme chargé','w'); return; }
    allMicros.forEach(micro => {
      html += _pdfCycleSection(micro, getActiveSessions(micro), clientName, micro.macroId, micro.mesoId);
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

function _pdfCycleSection(cycle, sessions, clientName, macroId, mesoId) {
  const sp = typeof getSessParams === 'function' ? getSessParams : () => ({mode:'circuit',rest:'45s',tours:'3'});
  const gex = typeof getSessEx === 'function' ? getSessEx : () => [];
  
  // Construire le titre avec la hiérarchie si disponible
  let cycleTitle = `CYCLE ${cycle.id}`;
  let cycleSubtitle = h(cycle.focus || '');
  if (macroId && mesoId) {
    cycleTitle = `M${macroId}-MÉ${mesoId} • CYCLE ${cycle.id}`;
  }
  
  let html = `<div class="cycle-block">
    <div class="cycle-header">
      <h2 style="color:white;margin:0">${cycleTitle}</h2>
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:11pt;color:rgba(255,255,255,.7)">${cycleSubtitle}</span>
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
  let rows = '';
  
  // Utiliser la même logique que groupExercises pour regrouper les supersets
  const groups = [];
  let i = 0;
  while (i < exs.length) {
    if (exs[i].superset === true && i + 1 < exs.length) {
      const items = [];
      while (exs[i].superset === true && i + 1 < exs.length) {
        items.push(exs[i]);
        i++;
      }
      items.push(exs[i]); // Dernier exercice du superset (qui n'a pas superset=true)
      i++;
      groups.push({ type: 'superset', items });
    } else {
      groups.push({ type: 'single', ex: exs[i] });
      i++;
    }
  }
  
  // Générer le HTML pour chaque groupe
  let globalNum = 1;
  groups.forEach((group) => {
    if (group.type === 'superset') {
      // Superset : créer un cadre avec double flèche
      rows += `<tr>
        <td colspan="8" style="padding:0;border:none">
          <div style="border:2pt solid #d08000;border-radius:4pt;margin:4pt 0;background:#fef9e7;page-break-inside:avoid">
            <div style="background:#d08000;color:white;padding:2pt 6pt;font-family:'Barlow Condensed',sans-serif;font-size:7pt;font-weight:900;text-transform:uppercase;letter-spacing:.05em">
              ⇄ SUPERSET
            </div>
            <table style="width:100%;margin:0;border:none;background:transparent">
              <tbody>`;
      
      group.items.forEach((e) => {
        rows += _pdfSingleExRow(e, params, globalNum++, true);
      });
      
      rows += `</tbody></table></div></td></tr>`;
    } else {
      // Exercice simple
      rows += _pdfSingleExRow(group.ex, params, globalNum++, false);
    }
  });
  
  return rows;
}

function _pdfSingleExRow(e, params, num, inSuperset) {
  const dbEx = window.exerciseDb && window.exerciseDb.find(x => x.name === e.name);
  const photo = e.photo || (dbEx ? dbEx.photo : '');
  const video = e.video || (dbEx ? dbEx.video : '');
  const isEnergetic = e.exType === 'energetique';
  
  let photoHtml = '';
  if (photo) {
    photoHtml = `<img src="${h(photo)}" style="width:30px;height:30px;object-fit:contain;border-radius:2pt;margin-right:4pt" onerror="this.style.display='none'">`;
  }
  
  let videoHtml = '';
  if (video) {
    videoHtml = `<div style="margin-top:2pt"><a href="${h(video)}" target="_blank" style="color:#3b82f6;text-decoration:none;font-size:7pt;font-family:'Barlow Condensed',sans-serif;font-weight:700">▶ VIDÉO</a></div>`;
  }
  
  let nameHtml = h(e.name || '');
  if (isEnergetic) {
    nameHtml = `⚡ ${nameHtml}`;
  }
  
  let paramsHtml = '';
  if (isEnergetic) {
    const params = [];
    if (e.sets) params.push(`${e.sets} séries`);
    if (e.reps) params.push(`${e.reps} reps`);
    if (e.workTime && e.restTime) params.push(`(${e.workTime}/${e.restTime})`);
    if (e.restSet) params.push(`- ${e.restSet} r`);
    paramsHtml = `<td colspan="5" style="color:#3b82f6;font-weight:700">${params.join(' ')}</td>`;
  } else if (params.mode === 'classic') {
    paramsHtml = `<td>${e.sets||'—'}</td><td style="color:#d08000;font-weight:bold">${e.reps||'—'}</td><td>${e.tst||'—'}</td><td>${e.restSet||'—'}</td><td>${e.rpeTarget||'—'}</td>`;
  } else {
    paramsHtml = `<td colspan="5">${e.reps||''} ${e.tst?'• '+e.tst:''}</td>`;
  }
  
  return `<tr style="${inSuperset ? 'background:rgba(208,128,0,0.05)' : ''}">
    <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900;color:#94a3b8;vertical-align:middle">${String(num).padStart(2,'0')}</td>
    <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900;vertical-align:middle">
      <div style="display:flex;align-items:center">
        ${photoHtml}
        <span>${nameHtml}</span>
      </div>
      ${videoHtml}
    </td>
    ${paramsHtml}
    <td style="font-size:8pt;color:#64748b;vertical-align:middle">${e.desc||e.comment||'—'}</td>
  </tr>`;
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
              <a href="${h(doc.url)}" target="_blank" class="btn btn-gold btn-sm" onclick="openDocument(event,'${h(doc.url)}','${doc.type||'pdf'}');return false">Ouvrir</a>
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
    if (!docs.length) {
      el.innerHTML = `<div class="card" style="padding:3rem;text-align:center;margin-top:1rem"><p style="color:var(--muted);font-style:italic">Aucun document partagé pour le moment.</p></div>`;
      return;
    }
    el.classList.remove('hidden');
    el.innerHTML = `<div style="margin-top:2rem">
      <h3 style="font-size:1.75rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">MES DOCUMENTS</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
        ${docs.map(d=>`<div onclick="openDocument(event,'${h(d.url)}','${d.type||'pdf'}')" class="card-hover" style="padding:1.25rem;cursor:pointer">
          <div style="font-size:2rem;margin-bottom:.75rem">${d.type==='image'?'🖼':'📄'}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;font-style:italic;color:var(--text)">${h(d.title)}</div>
          ${d.notes?`<p style="font-size:.7rem;color:var(--muted);margin-top:.25rem">${h(d.notes)}</p>`:''}
          <div style="font-size:.6rem;color:var(--muted);margin-top:.5rem;text-transform:uppercase;letter-spacing:.1em">Ouvrir →</div>
        </div>`).join('')}
      </div>
    </div>`;
  } catch(e) { console.error(e); }
}
