// ── COACH: PROFILE EDITING ───────────────────────────
if (typeof _clientPRData === 'undefined') window._clientPRData = { records:{} };
if (typeof _manualPRExName === 'undefined') window._manualPRExName = '';
if (typeof _weightHistory === 'undefined') window._weightHistory = [];

function renderWeightTracking() {
  const el = document.getElementById('sub-weight'); if (!el) return;
  const c = currentClient; if (!c) return;
  
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:1.5rem">
    <div class="card" style="padding:2rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
        <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">SUIVI POIDS</h4>
        <button onclick="openAddWeightEntry()" class="btn btn-primary btn-sm">+ AJOUTER UNE MESURE</button>
      </div>
      <div id="weight-chart-area">${_renderWeightChart()}</div>
      <div id="weight-history-list" style="margin-top:1rem">${_renderWeightList()}</div>
    </div>
    
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">📸 PHOTOS DE PROGRESSION</h4>
      <div id="weight-photos-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
        ${_renderWeightPhotos()}
      </div>
    </div>
    
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">📏 MESURES CORPORELLES</h4>
      <div id="weight-measurements">${_renderWeightMeasurements()}</div>
    </div>
  </div>`;
}

function _renderWeightPhotos() {
  const entries = (_weightHistory || []).filter(e => e.photos && e.photos.length > 0);
  if (!entries.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune photo ajoutée.</p>';
  }
  
  return entries.map(entry => {
    const date = new Date(entry.date).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: 'numeric'});
    return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:1rem;padding:1rem">
      <div style="font-size:.7rem;color:var(--muted);margin-bottom:.75rem;font-weight:700">${date} - ${entry.weight} kg</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:.5rem">
        ${entry.photos.map((photo, i) => `
          <img src="${photo}" style="width:100%;height:80px;object-fit:cover;border-radius:.5rem;cursor:pointer" 
               onclick="window.open('${photo}', '_blank')" alt="Photo ${i+1}">
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

function _renderWeightMeasurements() {
  const entries = (_weightHistory || []).filter(e => e.measurements);
  if (!entries.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune mesure ajoutée.</p>';
  }
  
  // Créer un tableau des mesures les plus récentes
  const latestEntries = entries.slice().reverse().slice(0, 10);
  
  return `<div style="overflow-x:auto">
    <table class="tbl" style="width:100%">
      <thead><tr>
        <th>Date</th>
        <th>Poids</th>
        <th>Tour cou</th>
        <th>Tour taille</th>
        <th>Tour cuisse</th>
        <th>Pli cutané</th>
      </tr></thead>
      <tbody>${latestEntries.map(entry => `
        <tr class="db-row">
          <td style="font-size:.7rem;color:var(--muted)">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})}</td>
          <td><span style="font-family:'Barlow Condensed',sans-serif;font-weight:900">${entry.weight} kg</span></td>
          <td>${entry.measurements?.neck || '—'}</td>
          <td>${entry.measurements?.waist || '—'}</td>
          <td>${entry.measurements?.thigh || '—'}</td>
          <td>${entry.measurements?.skinfold || '—'}</td>
        </tr>
      `).join('')}</tbody>
    </table>
  </div>`;
}

function renderClientProfile() {
  const c = currentClient; if (!c) return;
  
  // Charger les programmes de base si pas encore chargés
  if (typeof allBasePrograms === 'undefined' || allBasePrograms.length === 0) {
    if (typeof loadBasePrograms === 'function') {
      loadBasePrograms().then(() => {
        renderClientProfile();
      });
      const el = document.getElementById('sub-profile');
      if (el) el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Chargement...</p>';
      return;
    }
  }
  
  const el = document.getElementById('sub-profile'); if (!el) return;
  const age = c.birthday ? _calcAge(c.birthday) : null;
  const isWeightGoal = c.goalType === 'poids';
  
  // Afficher/masquer l'onglet suivi poids
  const weightTabBtn = document.getElementById('weight-tab-btn');
  if (weightTabBtn) {
    weightTabBtn.style.display = isWeightGoal ? '' : 'none';
  }
  
  el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start">
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">PROFIL</h4>
      <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:1.5rem">
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Genre</label>
          <select id="prof-gender" class="inp">
            <option value="">Sélectionner</option>
            <option value="homme" ${c.gender==='homme'?'selected':''}>Homme</option>
            <option value="femme" ${c.gender==='femme'?'selected':''}>Femme</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Date de naissance ${age?`<span style="color:var(--gold)">(${age} ans)</span>`:'(optionnel)'}</label>
          <input type="date" id="prof-birthday" class="inp" value="${c.birthday||''}">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Code d'accès</label>
          <input type="text" id="prof-code" class="inp" value="${h(c.code||'')}" style="text-transform:uppercase;font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;letter-spacing:.1em">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Prénom / Nom</label>
          <input type="text" id="prof-name" class="inp" value="${h(c.name||'')}">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Poids (kg)</label>
            <input type="number" step="0.1" min="0" id="prof-weight" class="inp" value="${c.weight||''}" placeholder="75">
          </div>
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Taille (cm)</label>
            <input type="number" step="1" min="0" id="prof-height" class="inp" value="${c.height||''}" placeholder="175">
          </div>
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Type d'objectif</label>
          <div style="display:flex;gap:.5rem">
            <button id="goal-type-perf" onclick="_setGoalType('performance')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${!isWeightGoal?'rgba(240,165,0,.5)':'var(--border)'};background:${!isWeightGoal?'rgba(240,165,0,.15)':'var(--surface)'};color:${!isWeightGoal?'var(--gold)':'var(--muted)'}">💪 Performance</button>
            <button id="goal-type-poids" onclick="_setGoalType('poids')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${isWeightGoal?'rgba(59,130,246,.5)':'var(--border)'};background:${isWeightGoal?'rgba(59,130,246,.15)':'var(--surface)'};color:${isWeightGoal?'#60a5fa':'var(--muted)'}">⚖️ Poids corporel</button>
          </div>
        </div>
        ${c.programMode !== 'generic' ? `
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Niveau de planification</label>
          <div style="display:flex;gap:.5rem">
            <button id="hierarchy-micro" onclick="_setHierarchyLevel('micro')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${c.hierarchyLevel==='micro'?'rgba(59,130,246,.5)':'var(--border)'};background:${c.hierarchyLevel==='micro'?'rgba(59,130,246,.15)':'var(--surface)'};color:${c.hierarchyLevel==='micro'?'#60a5fa':'var(--muted)'}">Micro only</button>
            <button id="hierarchy-meso" onclick="_setHierarchyLevel('meso')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${c.hierarchyLevel==='meso'?'rgba(139,92,246,.5)':'var(--border)'};background:${c.hierarchyLevel==='meso'?'rgba(139,92,246,.15)':'var(--surface)'};color:${c.hierarchyLevel==='meso'?'#a78bfa':'var(--muted)'}">Méso + Micro</button>
            <button id="hierarchy-macro" onclick="_setHierarchyLevel('macro')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${c.hierarchyLevel==='macro'||!c.hierarchyLevel?'rgba(240,165,0,.5)':'var(--border)'};background:${c.hierarchyLevel==='macro'||!c.hierarchyLevel?'rgba(240,165,0,.15)':'var(--surface)'};color:${c.hierarchyLevel==='macro'||!c.hierarchyLevel?'var(--gold)':'var(--muted)'}">Macro + Méso + Micro</button>
          </div>
          <p style="font-size:.65rem;color:var(--muted);margin-top:.5rem;font-style:italic">Les microcycles sont obligatoires. Sélectionne le niveau de hiérarchie adapté au client.</p>
        </div>
        ` : ''}
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Mode de programme</label>
          <div style="display:flex;gap:.5rem">
            <button id="prog-mode-personalized" onclick="_setProgramMode('personalized')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${c.programMode!=='generic'?'rgba(16,185,129,.5)':'var(--border)'};background:${c.programMode!=='generic'?'rgba(16,185,129,.15)':'var(--surface)'};color:${c.programMode!=='generic'?'#34d399':'var(--muted)'}">🎯 Personnalisé</button>
            <button id="prog-mode-generic" onclick="_setProgramMode('generic')" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid ${c.programMode==='generic'?'rgba(139,92,246,.5)':'var(--border)'};background:${c.programMode==='generic'?'rgba(139,92,246,.15)':'var(--surface)'};color:${c.programMode==='generic'?'#a78bfa':'var(--muted)'}">📋 Générique</button>
          </div>
          <p style="font-size:.65rem;color:var(--muted);margin-top:.5rem;font-style:italic">
            ${c.programMode === 'generic' ? 'Le client utilise un programme de base partagé avec d\'autres clients.' : 'Programme unique et personnalisé pour ce client.'}
          </p>
          ${c.programMode === 'generic' ? `
          <div style="margin-top:.75rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Programme de base assigné</label>
            <select id="prof-baseprogram" class="inp" onchange="_onBaseProgramChange()">
              <option value="">-- Choisir un programme --</option>
              ${(typeof allBasePrograms !== 'undefined' ? allBasePrograms : []).map(bp => 
                `<option value="${bp.id}"${c.baseProgramId===bp.id?' selected':''}>${h(bp.name)}</option>`
              ).join('')}
            </select>
            <button onclick="_validateBaseProgramApply()" class="btn btn-primary" style="width:100%;padding:.75rem;margin-top:.5rem;font-size:.8rem">✓ VALIDER LE PROGRAMME</button>
            <p style="font-size:.65rem;color:var(--muted);margin-top:.5rem;font-style:italic">Cliquez pour appliquer ce programme au client (écrase ou ajoute aux données existantes)</p>
          </div>
          ` : ''}
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Objectif (texte)</label>
          <input type="text" id="prof-objectif" class="inp" value="${h(c.objectif||'')}">
        </div>
        <div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Groupe</label>
          <select id="prof-group" class="inp">
            <option value="">Aucun groupe</option>
            ${allGroups.map(g=>`<option value="${g.id}"${c.group===g.id?' selected':''}>${h(g.name)}</option>`).join('')}
          </select>
        </div>
        ${isAdminUser() ? `<div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Coach assigné</label>
          <select id="prof-coach" class="inp">${_profCoachOptionsHtml(c.coachUid||'')}</select>
          <p style="font-size:.65rem;color:var(--muted);margin-top:.5rem;font-style:italic">Tu peux réassigner ce client à un autre coach à tout moment. L’ancien coach ne le verra plus dans sa liste.</p>
        </div>` : (isCoachUser() && c.coachUid && currentUser && c.coachUid !== currentUser.uid ? `<div>
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);letter-spacing:.1em;margin-bottom:.5rem">Coach référent (fiche partagée)</label>
          <p style="font-size:.85rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;color:var(--gold)">${h((coachesList||[]).find(x=>x.uid===c.coachUid)?.name || c.coachUid)}</p>
        </div>` : '')}
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
    <div style="display:flex;flex-direction:column;gap:1.5rem">
      <div class="card" style="padding:2rem">
        <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">INFOS</h4>
        <div style="display:flex;flex-direction:column;gap:.75rem">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface);border-radius:.875rem;border:1px solid var(--border)">
            <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">Membre depuis</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;font-style:italic">${c.createdAt?new Date(c.createdAt).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'—'}</span>
          </div>
          ${c.weight&&c.height?`<div style="display:flex;justify-content:space-between;align-items:center;padding:.75rem;background:var(--surface);border-radius:.875rem;border:1px solid var(--border)">
            <span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">IMC</span>
            <span style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:700;font-style:italic;color:var(--gold)">${(c.weight/((c.height/100)**2)).toFixed(1)}</span>
          </div>`:''}
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
      ${isWeightGoal ? `<div class="card" style="padding:2rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h4 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">⚖️ SUIVI DU POIDS</h4>
          <button onclick="openAddWeightEntry()" class="btn btn-primary btn-sm">+ Ajouter</button>
        </div>
        <div id="weight-chart-area">${_renderWeightChart()}</div>
        <div id="weight-history-list" style="margin-top:1rem">${_renderWeightList()}</div>
      </div>` : ''}
    </div>
  </div>`;
}

function _profCoachOptionsHtml(selectedUid) {
  const coaches = (typeof coachesList !== 'undefined' ? coachesList : []).filter(x => x.role === 'coach' || x.role === 'admin');
  let html = '<option value="">Aucun coach</option>';
  coaches.forEach(co => {
    const sel = (co.uid === selectedUid) ? ' selected' : '';
    const roleLabel = co.role === 'admin' ? ' 👑' : '';
    html += `<option value="${co.uid}"${sel}>${h(co.name)}${roleLabel}</option>`;
  });
  return html;
}

function _setGoalType(type) {
  if (!currentClient) return;
  currentClient = { ...currentClient, goalType: type };
  renderClientProfile();
}

function _setHierarchyLevel(level) {
  if (!currentClient) return;
  currentClient = { ...currentClient, hierarchyLevel: level };
  renderClientProfile();
}

function _setProgramMode(mode) {
  if (!currentClient) return;
  currentClient = { ...currentClient, programMode: mode };
  renderClientProfile();
}

function _onBaseProgramChange() {
  const select = document.getElementById('prof-baseprogram');
  if (select && currentClient) {
    currentClient.baseProgramId = select.value || null;
  }
}

async function _validateBaseProgramApply() {
  if (!currentClient) return;
  const select = document.getElementById('prof-baseprogram');
  const baseProgramId = select?.value;
  
  if (!baseProgramId) {
    toast('Veuillez sélectionner un programme de base', 'w');
    return;
  }
  
  const baseProgram = allBasePrograms.find(bp => bp.id === baseProgramId);
  if (!baseProgram) {
    toast('Programme non trouvé', 'e');
    return;
  }
  
  // Vérifier si le client a déjà un programme
  const hasExistingProgram = clientProgram && clientProgram.length > 0;
  
  if (hasExistingProgram) {
    // Afficher le modal de choix
    window._pendingBaseProgram = baseProgram;
    showProgramApplyChoiceModal();
  } else {
    // Pas de programme existant, copier directement
    await applyBaseProgramToClient(baseProgram, 'replace');
  }
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
  const birthday = document.getElementById('prof-birthday')?.value || null;
  const gender = document.getElementById('prof-gender')?.value || '';
  const notes = document.getElementById('prof-notes')?.value.trim() || '';
  const group = document.getElementById('prof-group')?.value || '';
  const weight = parseFloat(document.getElementById('prof-weight')?.value) || null;
  const height = parseFloat(document.getElementById('prof-height')?.value) || null;
  const goalType = currentClient.goalType || 'performance';
  const hierarchyLevel = currentClient.hierarchyLevel || 'macro';
  const programMode = currentClient.programMode || 'personalized';
  const baseProgramId = programMode === 'generic' ? (currentClient.baseProgramId || null) : null;
  
  if (!name || !code) { toast('Nom et code requis','w'); return; }
  const conflict = allClients.find(c => c.code === code && c.id !== currentClient.id);
  if (conflict) { toast('Code déjà utilisé par '+conflict.name,'w'); return; }
  
  let coachUid = currentClient.coachUid || '';
  if (typeof isAdminUser === 'function' && isAdminUser()) {
    const sel = document.getElementById('prof-coach');
    if (sel) coachUid = sel.value || '';
  }
  
  const updated = { ...currentClient, name, code, objectif, birthday, gender, notes, group, weight, height, goalType, hierarchyLevel, programMode, baseProgramId, coachUid };
  
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id), updated);
  const idx = allClients.findIndex(c => c.id === currentClient.id);
  if (idx !== -1) allClients[idx] = updated;
  currentClient = updated;
  document.getElementById('fiche-client-name').innerText = name;
  document.getElementById('fiche-client-code').innerText = 'CODE: '+code;
  toast('Profil mis à jour !','s');
  renderClientProfile();
}

async function applyBaseProgramToClient(baseProgram, mode) {
  if (!baseProgram || !currentClient) return;
  
  try {
    let cycles = baseProgram.cycles || [];
    let hierarchy = baseProgram.hierarchy;
    
    if (mode === 'append') {
      // Récupérer les données existantes
      const existingDoc = await window.fdb.getDoc(
        window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentClient.id, 'data', 'program')
      );
      const existingCycles = (existingDoc.exists && existingDoc.data()?.cycles) ? existingDoc.data().cycles : [];
      
      // Renuméroter les cycles du programme de base
      const maxExistingId = Math.max(...existingCycles.map(c => c.id), 0);
      const renumberedCycles = cycles.map((c, idx) => ({
        ...c,
        id: maxExistingId + idx + 1
      }));
      
      // Fusionner les cycles
      cycles = [...existingCycles, ...renumberedCycles];
      
      // Fusionner la hiérarchie si elle existe
      if (hierarchy && hierarchy.macros) {
        const existingHierarchyDoc = await window.fdb.getDoc(
          window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentClient.id, 'data', 'hierarchy')
        );
        const existingHierarchy = (existingHierarchyDoc.exists && existingHierarchyDoc.data()?.macros) ? existingHierarchyDoc.data() : null;
        
        if (existingHierarchy && existingHierarchy.macros) {
          // Ajouter les macros du programme de base à la suite
          const maxExistingMacroId = Math.max(...existingHierarchy.macros.map(m => m.id), 0);
          const renumberedMacros = hierarchy.macros.map((m, idx) => ({
            ...m,
            id: maxExistingMacroId + idx + 1
          }));
          hierarchy = { macros: [...existingHierarchy.macros, ...renumberedMacros] };
        }
      }
    }
    
    // Sauvegarder les cycles
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentClient.id, 'data', 'program'),
      { cycles: cycles }
    );
    
    // Sauvegarder la hiérarchie si elle existe
    if (hierarchy && hierarchy.macros) {
      await window.fdb.setDoc(
        window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentClient.id, 'data', 'hierarchy'),
        { macros: hierarchy.macros }
      );
    }
    
    console.log(`Programme ${mode === 'append' ? 'ajouté à la suite' : 'remplacé'} pour le client:`, currentClient.id);
    toast(`Programme ${mode === 'append' ? 'ajouté' : 'appliqué'} !`, 's');
  } catch (e) {
    console.error('Erreur application programme:', e);
    toast('Erreur application programme', 'e');
  }
}

function showProgramApplyChoiceModal() {
  const modalHtml = `
    <div id="modal-program-choice" class="modal-bg">
      <div class="card" style="padding:2rem;max-width:420px;width:100%">
        <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">⚠️ Programme existant</h3>
        <p style="color:var(--muted);margin-bottom:1.5rem;font-size:.9rem">Ce client a déjà un programme personnalisé (${clientProgram.length} cycles). Que souhaitez-vous faire ?</p>
        
        <div style="display:flex;flex-direction:column;gap:.75rem;margin-bottom:1.5rem">
          <button onclick="_confirmProgramApply('replace')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;border-color:var(--danger)">
            <span style="font-size:1.75rem">🗑️</span>
            <div>
              <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--danger)">Écraser les données</div>
              <div style="font-size:.75rem;color:var(--muted)">Remplacer le programme actuel par le nouveau</div>
            </div>
          </button>
          
          <button onclick="_confirmProgramApply('append')" class="btn btn-ghost" style="padding:1.25rem;display:flex;align-items:center;gap:1rem;text-align:left;border-radius:1rem;background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25)">
            <span style="font-size:1.75rem">➕</span>
            <div>
              <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--green)">Ajouter à la suite</div>
              <div style="font-size:.75rem;color:var(--muted)">Ajouter les nouveaux cycles après les existants</div>
            </div>
          </button>
        </div>
        
        <button onclick="_cancelProgramApply()" class="btn" style="width:100%;padding:1rem">Annuler</button>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-program-choice');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function _confirmProgramApply(mode) {
  const modal = document.getElementById('modal-program-choice');
  if (modal) modal.remove();
  
  const baseProgram = window._pendingBaseProgram;
  
  if (!baseProgram) {
    toast('Erreur: données manquantes', 'e');
    return;
  }
  
  // Appliquer le programme
  await applyBaseProgramToClient(baseProgram, mode);
  
  // Mettre à jour le profil avec le baseProgramId
  if (currentClient) {
    currentClient.baseProgramId = baseProgram.id;
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id), currentClient);
  }
  
  // Nettoyer
  delete window._pendingBaseProgram;
}

function _cancelProgramApply() {
  const modal = document.getElementById('modal-program-choice');
  if (modal) modal.remove();
  delete window._pendingBaseProgram;
  toast('Annulé', 'i');
}

// Exports
window.applyBaseProgramToClient = applyBaseProgramToClient;
window.showProgramApplyChoiceModal = showProgramApplyChoiceModal;
window._confirmProgramApply = _confirmProgramApply;
window._cancelProgramApply = _cancelProgramApply;
window._validateBaseProgramApply = _validateBaseProgramApply;

async function loadWeightHistory() {
  if (!currentClient) { _weightHistory = []; return; }
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','weightHistory'));
    _weightHistory = (doc.exists && doc.data()?.entries) ? doc.data().entries : [];
  } catch(e) { _weightHistory = []; }
}

function _renderWeightChart() {
  const entries = (_weightHistory||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune donnée pondérale.</p>';
  
  const chartData = entries.map(e=>({ 
    label: new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}), 
    value: e.weight, 
    tooltip: `${e.weight} kg · ${new Date(e.date).toLocaleDateString('fr-FR')}`,
    onClick: `showWeightDetail(${entries.indexOf(e)})`
  }));
  
  return svgLineChart(chartData, '#3b82f6', 'Poids (kg)');
}

function _renderCoachWeightChart() {
  const entries = (_weightHistory||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune donnée pondérale.</p>';
  
  const chartData = entries.map(e=>({ 
    label: new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}), 
    value: e.weight, 
    tooltip: `${e.weight} kg · ${new Date(e.date).toLocaleDateString('fr-FR')}`,
    onClick: `showWeightDetail(${entries.indexOf(e)})`
  }));
  
  return svgLineChart(chartData, '#3b82f6', 'Poids (kg)');
}

function _renderWeightList() {
  const entries = (_weightHistory||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (!entries.length) return '';
  const hasAnyBodyFat = entries.some(e => e.bodyFat);
  return `<table class="tbl" style="width:100%">
    <thead><tr><th>Date</th><th>Poids</th>${hasAnyBodyFat ? '<th>%MG</th>' : ''}<th style="text-align:right">Action</th></tr></thead>
    <tbody>${entries.slice(0,8).map((e,i)=>`<tr class="db-row" style="cursor:pointer" onclick="showWeightDetail(${i})">
      <td style="font-size:.7rem;color:var(--muted)">${new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})}</td>
      <td><span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;color:#60a5fa">${e.weight} kg</span></td>
      ${hasAnyBodyFat ? `<td>${e.bodyFat ? `<span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--gold)">${e.bodyFat}%</span>` : '-'}</td>` : ''}
      <td style="text-align:right"><button onclick="event.stopPropagation(); deleteWeightEntry(${i})" class="btn btn-danger btn-sm">Suppr.</button></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function openAddWeightEntry() {
  // Créer un modal simple et direct
  const modalHtml = `
    <div id="modal-add-weight" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:600px;width:90%;max-height:90vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">⚖️ NOUVELLE MESURE</h3>
          <button onclick="document.getElementById('modal-add-weight').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids (kg) *</label>
            <input type="number" step="0.1" min="0" id="add-weight-val" class="inp" style="font-size:2rem;text-align:center;padding:1rem" placeholder="75.5" oninput="calculateBodyFat()">
          </div>
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Date et heure</label>
            <input type="datetime-local" id="add-weight-date" class="inp">
          </div>
          
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Type de mesures</label>
            <div style="display:flex;gap:.5rem">
              <button onclick="setMeasurementType('body')" id="meas-type-body" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid rgba(240,165,0,.5);background:rgba(240,165,0,.15);color:var(--gold)">Mensurations</button>
              <button onclick="setMeasurementType('skinfold')" id="meas-type-skinfold" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--muted)">Plis cutanés</button>
            </div>
          </div>
          
          <div id="meas-body-fields" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem">
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Tour cou (cm)</label>
              <input type="number" step="0.1" min="0" id="meas-neck" class="inp" placeholder="35.5" oninput="calculateBodyFat()">
            </div>
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Tour taille (cm)</label>
              <input type="number" step="0.1" min="0" id="meas-waist" class="inp" placeholder="75.0" oninput="calculateBodyFat()">
            </div>
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Tour hanche (cm)</label>
              <input type="number" step="0.1" min="0" id="meas-hip" class="inp" placeholder="95.0" oninput="calculateBodyFat()">
            </div>
          </div>
          
          <div id="meas-skinfold-fields" style="display:none;grid-template-columns:repeat(2,1fr);gap:.5rem">
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli bicipital (mm)</label>
              <input type="number" step="0.1" min="0" id="meas-biceps" class="inp" placeholder="5.0" oninput="calculateBodyFat()">
            </div>
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli tricipital (mm)</label>
              <input type="number" step="0.1" min="0" id="meas-triceps" class="inp" placeholder="8.0" oninput="calculateBodyFat()">
            </div>
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli sous-scapulaire (mm)</label>
              <input type="number" step="0.1" min="0" id="meas-subscapular" class="inp" placeholder="12.0" oninput="calculateBodyFat()">
            </div>
            <div>
              <label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli supra-iliaque (mm)</label>
              <input type="number" step="0.1" min="0" id="meas-suprailiac" class="inp" placeholder="10.0" oninput="calculateBodyFat()">
            </div>
          </div>
          
          <div id="bodyfat-result" style="display:none;padding:1rem;background:var(--surface);border-radius:.75rem;border:1px solid var(--border)">
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.2rem;color:var(--gold)">Pourcentage de masse grasse estimé</div>
            <div id="bodyfat-value" style="font-size:2rem;font-weight:900;font-style:italic;margin:.5rem 0">—</div>
            <div id="bodyfat-category" style="font-size:.8rem;color:var(--muted)"></div>
          </div>
          
          <button class="btn btn-primary" style="width:100%;padding:1rem" onclick="saveWeightEntry()">ENREGISTRER</button>
        </div>
      </div>
    </div>
  `;
  
  // Supprimer l'ancien modal s'il existe
  const oldModal = document.getElementById('modal-add-weight');
  if (oldModal) oldModal.remove();
  
  // Ajouter le nouveau modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Initialiser les valeurs
  document.getElementById('add-weight-val').value = '';
  const now = new Date();
  document.getElementById('add-weight-date').value = now.toISOString().slice(0,16);
  
  // Reset photos
  [1,2,3].forEach(i => {
    const preview = document.getElementById(`add-weight-photo-preview-${i}`);
    if (preview) {
      preview.innerHTML = '<span style="font-size:.6rem;color:var(--muted);text-align:center">📷 Photo ' + i + '</span>';
      preview.style.background = 'var(--surface)';
    }
    const input = document.getElementById(`add-weight-photo-${i}`);
    if (input) input.value = '';
  });
  
  // Reset measurements
  ['meas-neck','meas-waist','meas-hip','meas-biceps','meas-triceps','meas-subscapular','meas-suprailiac'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  // Reset bodyfat display
  document.getElementById('bodyfat-result').style.display = 'none';
  document.getElementById('bodyfat-value').innerText = '—';
  document.getElementById('bodyfat-category').innerText = '';
  
  setMeasurementType('body');
}

function setMeasurementType(type) {
  const bodyBtn = document.getElementById('meas-type-body');
  const skinfoldBtn = document.getElementById('meas-type-skinfold');
  const bodyFields = document.getElementById('meas-body-fields');
  const skinfoldFields = document.getElementById('meas-skinfold-fields');
  
  if (type === 'body') {
    bodyBtn.style.borderColor = 'rgba(240,165,0,.5)';
    bodyBtn.style.background = 'rgba(240,165,0,.15)';
    bodyBtn.style.color = 'var(--gold)';
    skinfoldBtn.style.borderColor = 'var(--border)';
    skinfoldBtn.style.background = 'var(--surface)';
    skinfoldBtn.style.color = 'var(--muted)';
    bodyFields.style.display = 'grid';
    skinfoldFields.style.display = 'none';
  } else {
    skinfoldBtn.style.borderColor = 'rgba(59,130,246,.5)';
    skinfoldBtn.style.background = 'rgba(59,130,246,.15)';
    skinfoldBtn.style.color = '#60a5fa';
    bodyBtn.style.borderColor = 'var(--border)';
    bodyBtn.style.background = 'var(--surface)';
    bodyBtn.style.color = 'var(--muted)';
    skinfoldFields.style.display = 'grid';
    bodyFields.style.display = 'none';
  }
  calculateBodyFat();
}

function calculateBodyFat() {
  const weight = parseFloat(document.getElementById('add-weight-val')?.value);
  const height = currentClient?.height || 0;
  const age = currentClient?.birthday ? _calcAge(currentClient.birthday) : 0;
  const gender = currentClient?.gender || '';
  
  console.log('Calcul %MG - Poids:', weight, 'Taille:', height, 'Age:', age, 'Genre:', gender);
  
  if (!weight || !height || !age || !gender) {
    console.log('Données manquantes pour le calcul');
    document.getElementById('bodyfat-result').style.display = 'none';
    return;
  }
  
  let bodyFat = null;
  const bodyFieldsVisible = document.getElementById('meas-body-fields').style.display !== 'none';
  console.log('Champs mensurations visibles:', bodyFieldsVisible);
  
  if (bodyFieldsVisible) {
    // Formule US Navy
    const neck = parseFloat(document.getElementById('meas-neck')?.value) || 0;
    const waist = parseFloat(document.getElementById('meas-waist')?.value) || 0;
    const hip = parseFloat(document.getElementById('meas-hip')?.value) || 0;
    
    console.log('Mensurations - Cou:', neck, 'Taille:', waist, 'Hanche:', hip);
    
    if (neck && waist && (gender === 'homme' || hip)) {
      if (gender === 'homme') {
        const log10 = Math.log10(waist - neck);
        bodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
      } else {
        const log10 = Math.log10(waist + hip - neck);
        bodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
      }
    }
  } else {
    // Formule des plis cutanés (4 plis)
    const biceps = parseFloat(document.getElementById('meas-biceps')?.value) || 0;
    const triceps = parseFloat(document.getElementById('meas-triceps')?.value) || 0;
    const subscapular = parseFloat(document.getElementById('meas-subscapular')?.value) || 0;
    const suprailiac = parseFloat(document.getElementById('meas-suprailiac')?.value) || 0;
    
    console.log('Plis cutanés - Biceps:', biceps, 'Triceps:', triceps, 'Sous-scap:', subscapular, 'Supra-iliaque:', suprailiac);
    
    if (biceps && triceps && subscapular && suprailiac) {
      const sum = biceps + triceps + subscapular + suprailiac;
      const log10Sum = Math.log10(sum);
      
      // Coefficients selon âge et genre (formule Jackson & Pollock)
      let a, c;
      if (gender === 'homme') {
        if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
        else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0678; }
        else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
        else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
        else { a = 1.1715; c = 0.0779; } // 50+
      } else {
        if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
        else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
        else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
        else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
        else { a = 1.1339; c = 0.0645; } // 50+
      }
      
      const density = a - (c * log10Sum);
      // Formule correcte : MG = (495 / density) - 450
      bodyFat = (495 / density) - 450;
    }
  }
  
  console.log('Résultat calcul %MG:', bodyFat);
  
  if (bodyFat !== null && !isNaN(bodyFat) && bodyFat > 0 && bodyFat < 100) {
    document.getElementById('bodyfat-result').style.display = 'block';
    document.getElementById('bodyfat-value').innerText = bodyFat.toFixed(1) + '%';
    
    // Catégorie
    let category = '';
    if (gender === 'homme') {
      if (bodyFat < 6) category = 'Essentiel (danger)';
      else if (bodyFat < 14) category = 'Athlétique';
      else if (bodyFat < 18) category = 'Fit';
      else if (bodyFat < 25) category = 'Moyen';
      else category = 'Élevé';
    } else {
      if (bodyFat < 14) category = 'Essentiel (danger)';
      else if (bodyFat < 21) category = 'Athlétique';
      else if (bodyFat < 25) category = 'Fit';
      else if (bodyFat < 32) category = 'Moyen';
      else category = 'Élevé';
    }
    
    document.getElementById('bodyfat-category').innerText = category;
    console.log('Affichage %MG:', bodyFat.toFixed(1) + '% -', category);
  } else {
    document.getElementById('bodyfat-result').style.display = 'none';
    console.log('%MG non affiché (données invalides)');
  }
}

function previewWeightPhoto(photoNum, input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById(`add-weight-photo-preview-${photoNum}`);
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:.5rem">`;
      preview.style.background = 'transparent';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveWeightEntry() {
  if (!currentClient) return;
  const weight = parseFloat(document.getElementById('add-weight-val')?.value);
  const date = document.getElementById('add-weight-date')?.value;
  if (!weight || weight <= 0) { toast('Poids invalide', 'w'); return; }
  
  // Calculer le pourcentage de masse grasse
  let bodyFat = null;
  const height = currentClient?.height || 0;
  const age = currentClient?.birthday ? _calcAge(currentClient.birthday) : 0;
  const gender = currentClient?.gender || '';
  
  if (height && age && gender) {
    const bodyFieldsVisible = document.getElementById('meas-body-fields').style.display !== 'none';
    
    if (bodyFieldsVisible) {
      const neck = parseFloat(document.getElementById('meas-neck')?.value) || 0;
      const waist = parseFloat(document.getElementById('meas-waist')?.value) || 0;
      const hip = parseFloat(document.getElementById('meas-hip')?.value) || 0;
      
      if (neck && waist && (gender === 'homme' || hip)) {
        if (gender === 'homme') {
          const log10 = Math.log10(waist - neck);
          bodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
        } else {
          const log10 = Math.log10(waist + hip - neck);
          bodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
        }
      }
    } else {
      const biceps = parseFloat(document.getElementById('meas-biceps')?.value) || 0;
      const triceps = parseFloat(document.getElementById('meas-triceps')?.value) || 0;
      const subscapular = parseFloat(document.getElementById('meas-subscapular')?.value) || 0;
      const suprailiac = parseFloat(document.getElementById('meas-suprailiac')?.value) || 0;
      
      if (biceps && triceps && subscapular && suprailiac) {
        const sum = biceps + triceps + subscapular + suprailiac;
        const log10Sum = Math.log10(sum);
        
        // Coefficients selon âge et genre
        let a, c;
        
        if (gender === 'homme') {
          if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
          else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0678; }
          else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
          else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
          else { a = 1.1715; c = 0.0779; }
        } else {
          if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
          else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
          else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
          else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
          else { a = 1.1339; c = 0.0645; }
        }
        
        // Calcul de la densité
        const density = a - (c * log10Sum);
        
        // Formule correcte : MG = (495 / density) - 450
        bodyFat = (495 / density) - 450;
      }
    }
  }
  
  // Récupérer les mensurations
  let measurements = null;
  const bodyFieldsVisible = document.getElementById('meas-body-fields').style.display !== 'none';
  if (bodyFieldsVisible) {
    const neck = parseFloat(document.getElementById('meas-neck')?.value) || 0;
    const waist = parseFloat(document.getElementById('meas-waist')?.value) || 0;
    const hip = parseFloat(document.getElementById('meas-hip')?.value) || 0;
    if (neck || waist || hip) {
      measurements = {};
      if (neck) measurements.neck = neck;
      if (waist) measurements.waist = waist;
      if (hip) measurements.hip = hip;
    }
  } else {
    const biceps = parseFloat(document.getElementById('meas-biceps')?.value) || 0;
    const triceps = parseFloat(document.getElementById('meas-triceps')?.value) || 0;
    const subscapular = parseFloat(document.getElementById('meas-subscapular')?.value) || 0;
    const suprailiac = parseFloat(document.getElementById('meas-suprailiac')?.value) || 0;
    if (biceps || triceps || subscapular || suprailiac) {
      measurements = {};
      if (biceps) measurements.biceps = biceps;
      if (triceps) measurements.triceps = triceps;
      if (subscapular) measurements.subscapular = subscapular;
      if (suprailiac) measurements.suprailiac = suprailiac;
    }
  }
  
  if (!_weightHistory) _weightHistory = [];
  
  // Créer une entrée propre sans valeurs undefined
  const entry = {
    date: date ? new Date(date).toISOString() : new Date().toISOString(),
    weight: weight
  };
  
  // Ajouter bodyFat seulement si calculé
  if (bodyFat !== null && !isNaN(bodyFat)) {
    entry.bodyFat = Math.round(bodyFat * 10) / 10;
  }
  
  // Ajouter measurements seulement si présentes
  if (measurements) {
    entry.measurements = measurements;
  }
  
  console.log('📝 Entrée à sauvegarder:', entry);
  
  _weightHistory.push(entry);
  
  try {
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','weightHistory'), { entries: _weightHistory });
    console.log('✅ Données sauvegardées avec succès!');
  } catch(e) {
    console.error('❌ Erreur Firebase:', e);
    alert('Erreur de sauvegarde: ' + e.message);
    return;
  }
  
  // Fermer le modal
  const modal = document.getElementById('modal-add-weight');
  if (modal) modal.remove();
  
  // Rafraîchir les vues qui affichent les données de poids
  renderWeightTracking();
  if (document.getElementById('sub-progression') && !document.getElementById('sub-progression').classList.contains('hidden')) {
    renderClientProgression();
  }
  
  toast('Mesure enregistrée !', 's');
}

async function deleteWeightEntry(sortedIdx) {
  if (!currentClient) return;
  const sorted = (_weightHistory||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entry = sorted[sortedIdx]; if (!entry) return;
  _weightHistory = (_weightHistory||[]).filter(e => e !== entry);
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','weightHistory'), { entries: _weightHistory });
  document.getElementById('weight-chart-area').innerHTML = _renderWeightChart();
  document.getElementById('weight-history-list').innerHTML = _renderWeightList();
  toast('Mesure supprimée','i');
}

function showWeightDetail(sortedIdx) {
  const sorted = (_weightHistory||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entry = sorted[sortedIdx]; if (!entry) return;
  
  // Calculer le %MG à partir des mensurations si présentes
  let calculatedBodyFat = null;
  if (entry.measurements && currentClient) {
    const height = currentClient.height || 0;
    const age = currentClient.birthday ? _calcAge(currentClient.birthday) : 0;
    const gender = currentClient.gender || '';
    
    if (height && age && gender) {
      if (entry.measurements.neck || entry.measurements.waist) {
        // Formule US Navy avec mensurations
        const neck = entry.measurements.neck || 0;
        const waist = entry.measurements.waist || 0;
        const hip = entry.measurements.hip || 0;
        
        if (neck && waist && (gender === 'homme' || hip)) {
          if (gender === 'homme') {
            const log10 = Math.log10(waist - neck);
            calculatedBodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
          } else {
            const log10 = Math.log10(waist + hip - neck);
            calculatedBodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
          }
        }
      } else if (entry.measurements.biceps || entry.measurements.triceps) {
        // Formule des 4 plis cutanés
        const biceps = entry.measurements.biceps || 0;
        const triceps = entry.measurements.triceps || 0;
        const subscapular = entry.measurements.subscapular || 0;
        const suprailiac = entry.measurements.suprailiac || 0;
        
        if (biceps && triceps && subscapular && suprailiac) {
          const sum = biceps + triceps + subscapular + suprailiac;
          const log10Sum = Math.log10(sum);
          
          let a, c;
          if (gender === 'homme') {
            if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
            else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0678; }
            else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
            else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
            else { a = 1.1715; c = 0.0779; }
          } else {
            if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
            else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
            else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
            else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
            else { a = 1.1339; c = 0.0645; }
          }
          
          const density = a - (c * log10Sum);
          calculatedBodyFat = (495 / density) - 450;
        }
      }
    }
  }
  
  const displayBodyFat = entry.bodyFat || (calculatedBodyFat && !isNaN(calculatedBodyFat) ? calculatedBodyFat.toFixed(1) : null);
  
  const modalHtml = `
    <div id="modal-weight-detail" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;max-height:90vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">📊 DÉTAILS DE LA MESURE</h3>
          <button onclick="document.getElementById('modal-weight-detail').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:1.5rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Date</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:#60a5fa">${entry.weight} kg</div>
            </div>
          </div>
          
          ${displayBodyFat ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">% Masse Grasse</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:var(--gold)">${displayBodyFat}%</div>
            </div>
          ` : ''}
          
          ${entry.measurements ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Mensurations</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem">
                ${entry.measurements.neck ? `<div><strong>Cou:</strong> ${entry.measurements.neck} cm</div>` : ''}
                ${entry.measurements.waist ? `<div><strong>Taille:</strong> ${entry.measurements.waist} cm</div>` : ''}
                ${entry.measurements.hip ? `<div><strong>Hanche:</strong> ${entry.measurements.hip} cm</div>` : ''}
                ${entry.measurements.biceps ? `<div><strong>Biceps:</strong> ${entry.measurements.biceps} mm</div>` : ''}
                ${entry.measurements.triceps ? `<div><strong>Triceps:</strong> ${entry.measurements.triceps} mm</div>` : ''}
                ${entry.measurements.subscapular ? `<div><strong>Sous-scap:</strong> ${entry.measurements.subscapular} mm</div>` : ''}
                ${entry.measurements.suprailiac ? `<div><strong>Supra-iliaque:</strong> ${entry.measurements.suprailiac} mm</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${entry.photos && entry.photos.length > 0 ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Photos</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:.5rem">
                ${entry.photos.map((photo, i) => `
                  <img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:.5rem;cursor:pointer" 
                       onclick="window.open('${photo}', '_blank')" alt="Photo ${i+1}">
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="display:flex;gap:.5rem;margin-top:1rem">
            <button onclick="deleteWeightEntry(${sortedIdx}); document.getElementById('modal-weight-detail').remove();" class="btn btn-danger" style="flex:1">SUPPRIMER</button>
            <button onclick="document.getElementById('modal-weight-detail').remove()" class="btn" style="flex:1">FERMER</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-weight-detail');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ── PROGRESSION ───────────────────────────────────────

function renderClientProgression() {
  const el = document.getElementById('sub-progression'); if (!el) return;
  const c = currentClient; if (!c) return;
  
  const isWeightGoal = c.goalType === 'poids';
  const hasWeight = (_weightHistory || []).length > 0;
  const hasBodyFat = (_weightHistory || []).some(e => e.bodyFat);
  const exNames = Object.keys(_clientPRData.records || {}).sort();

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:1.5rem">
    ${isWeightGoal ? `
      ${hasWeight ? `
        <div class="card" style="padding:2rem">
          <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">⚖️ PROGRESSION POIDS</h4>
          <div>${_renderCoachWeightChart()}</div>
        </div>
      ` : ''}
      
      ${hasBodyFat ? `
        <div class="card" style="padding:2rem">
          <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">📈 PROGRESSION MASSE GRASSE</h4>
          <div>${_renderCoachBodyFatChart()}</div>
        </div>
      ` : ''}
    ` : ''}
    
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">💪 PROGRESSION 1RM</h4>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1.5rem">
        <select id="prog-ex-select" class="inp" style="width:auto" onchange="renderExProgressChart()">
          <option value="">-- Choisir un exercice --</option>
          ${exNames.map(n=>`<option value="${h(n)}">${h(n)}</option>`).join('')}
        </select>
      </div>
      <div id="prog-ex-chart"><p style="color:var(--muted);font-style:italic;font-size:.8rem">Sélectionnez un exercice ci-dessus.</p></div>
    </div>

    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:.5rem">📦 TONNAGE PAR SÉANCE</h4>
      <p style="font-size:.75rem;color:var(--muted);margin-bottom:1.5rem">Tonnage total (kg) de chaque séance validée avec saisie de charges.</p>
      <div id="prog-tonnage-chart">${_renderTonnageChart()}</div>
    </div>

    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:.5rem">🏆 MEILLEURS 1RM PAR EXERCICE</h4>
      <div id="prog-pr-table">${_renderPRSummaryTable()}</div>
    </div>

  </div>`;
}

function _renderCoachWeightChart() {
  const entries = (_weightHistory || []).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune mesure de poids enregistrée.</p>';
  }
  
  const maxWeight = Math.max(...entries.map(e => e.weight));
  const minWeight = Math.min(...entries.map(e => e.weight));
  const range = maxWeight - minWeight || 1;
  
  return `<div style="position:relative;height:280px;background:var(--surface);border-radius:1rem;padding:1rem 1rem 1rem 2.5rem;margin-bottom:1rem">
    <div style="position:absolute;left:.5rem;top:1rem;bottom:45px;display:flex;flex-direction:column;justify-content:space-between;font-size:.65rem;color:var(--muted);text-align:right;width:1.5rem">
      <span>${maxWeight.toFixed(1)}kg</span>
      <span>${((maxWeight + minWeight)/2).toFixed(1)}kg</span>
      <span>${minWeight.toFixed(1)}kg</span>
    </div>
    <div style="position:absolute;left:2.5rem;right:1rem;top:0;bottom:45px;display:flex;align-items:center;justify-content:center;border-left:1px solid var(--border);border-bottom:1px solid var(--border)">
      <svg width="100%" height="100%" style="overflow:visible">
        ${entries.map((entry, i) => {
          const x = (i / (entries.length - 1 || 1)) * 100;
          const y = 100 - ((entry.weight - minWeight) / range) * 80;
          const date = new Date(entry.date).toLocaleDateString('fr-FR');
          return `<circle cx="${x}%" cy="${y}%" r="10" fill="var(--brand)" stroke="white" stroke-width="3" style="cursor:pointer" 
                   onclick="showCoachWeightDetail('${entry.date}')" 
                   title="${date}: ${entry.weight}kg${entry.bodyFat ? ' - ' + entry.bodyFat + '% MG' : ''}">
            <title>${date}: ${entry.weight}kg${entry.bodyFat ? ' - ' + entry.bodyFat + '% MG' : ''}</title>
          </circle>`;
        }).join('')}
        ${entries.map((entry, i) => {
          if (i === 0) return '';
          const prevEntry = entries[i-1];
          const x1 = ((i-1) / (entries.length - 1 || 1)) * 100;
          const y1 = 100 - ((prevEntry.weight - minWeight) / range) * 80;
          const x2 = (i / (entries.length - 1 || 1)) * 100;
          const y2 = 100 - ((entry.weight - minWeight) / range) * 80;
          return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="var(--brand)" stroke-width="3"/>`;
        }).join('')}
      </svg>
    </div>
    <div style="position:absolute;bottom:25px;left:2.5rem;right:1rem;display:flex;justify-content:space-between;font-size:.65rem;color:var(--muted);">
      ${entries.filter((_,i) => i % Math.ceil(entries.length/6) === 0 || i === entries.length-1).map((entry, i, arr) => {
        const x = (entries.indexOf(entry) / (entries.length - 1 || 1)) * 100;
        return `<span style="position:absolute;left:${x}%;transform:translateX(-50%);white-space:nowrap">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span>`;
      }).join('')}
    </div>
    <div style="position:absolute;bottom:5px;left:2.5rem;right:1rem;text-align:center;font-size:.7rem;color:var(--muted)">Date</div>
  </div>
  <div style="text-align:center;color:var(--muted);font-size:.7rem;font-style:italic">
    Cliquez sur un point pour voir les détails
  </div>`;
}

function _renderCoachBodyFatChart() {
  const entries = (_weightHistory || []).filter(e => e.bodyFat).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune mesure de masse grasse enregistrée.</p>';
  }
  
  const maxBF = Math.max(...entries.map(e => e.bodyFat));
  const minBF = Math.min(...entries.map(e => e.bodyFat));
  const range = maxBF - minBF || 1;
  
  return `<div style="position:relative;height:280px;background:var(--surface);border-radius:1rem;padding:1rem 1rem 1rem 2.5rem;margin-bottom:1rem">
    <div style="position:absolute;left:.5rem;top:1rem;bottom:45px;display:flex;flex-direction:column;justify-content:space-between;font-size:.65rem;color:var(--muted);text-align:right;width:1.5rem">
      <span>${maxBF.toFixed(1)}%</span>
      <span>${((maxBF + minBF)/2).toFixed(1)}%</span>
      <span>${minBF.toFixed(1)}%</span>
    </div>
    <div style="position:absolute;left:2.5rem;right:1rem;top:0;bottom:45px;display:flex;align-items:center;justify-content:center;border-left:1px solid var(--border);border-bottom:1px solid var(--border)">
      <svg width="100%" height="100%" style="overflow:visible">
        ${entries.map((entry, i) => {
          const x = (i / (entries.length - 1 || 1)) * 100;
          const y = 100 - ((entry.bodyFat - minBF) / range) * 80;
          const date = new Date(entry.date).toLocaleDateString('fr-FR');
          return `<circle cx="${x}%" cy="${y}%" r="10" fill="var(--gold)" stroke="white" stroke-width="3" style="cursor:pointer" 
                   onclick="showCoachWeightDetail('${entry.date}')" 
                   title="${date}: ${entry.bodyFat}% MG">
            <title>${date}: ${entry.bodyFat}% MG</title>
          </circle>`;
        }).join('')}
        ${entries.map((entry, i) => {
          if (i === 0) return '';
          const prevEntry = entries[i-1];
          const x1 = ((i-1) / (entries.length - 1 || 1)) * 100;
          const y1 = 100 - ((prevEntry.bodyFat - minBF) / range) * 80;
          const x2 = (i / (entries.length - 1 || 1)) * 100;
          const y2 = 100 - ((entry.bodyFat - minBF) / range) * 80;
          return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="var(--gold)" stroke-width="3"/>`;
        }).join('')}
      </svg>
    </div>
    <div style="position:absolute;bottom:25px;left:2.5rem;right:1rem;display:flex;justify-content:space-between;font-size:.65rem;color:var(--muted);">
      ${entries.filter((_,i) => i % Math.ceil(entries.length/6) === 0 || i === entries.length-1).map((entry, i, arr) => {
        const x = (entries.indexOf(entry) / (entries.length - 1 || 1)) * 100;
        return `<span style="position:absolute;left:${x}%;transform:translateX(-50%);white-space:nowrap">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span>`;
      }).join('')}
    </div>
    <div style="position:absolute;bottom:5px;left:2.5rem;right:1rem;text-align:center;font-size:.7rem;color:var(--muted)">Date</div>
  </div>
  <div style="text-align:center;color:var(--muted);font-size:.7rem;font-style:italic">
    Cliquez sur un point pour voir les détails
  </div>`;
}

function _renderCoachStrengthChart() {
  const records = _clientPRData?.records || {};
  const exNames = Object.keys(records).filter(name => records[name].best1RM && records[name].best1RM > 0);
  
  if (!exNames.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucun record de charge enregistré.</p>';
  }
  
  // Prendre les 10 meilleurs records
  const topRecords = exNames
    .map(name => ({ name, best1RM: records[name].best1RM }))
    .sort((a, b) => b.best1RM - a.best1RM)
    .slice(0, 10);
  
  const maxRM = Math.max(...topRecords.map(r => r.best1RM));
  
  return `<div style="display:flex;flex-direction:column;gap:1rem">
    ${topRecords.map((record, i) => {
      const width = (record.best1RM / maxRM) * 100;
      return `<div style="display:flex;align-items:center;gap:1rem">
        <div style="width:200px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.9rem">${h(record.name)}</div>
        <div style="flex:1;background:var(--surface);border-radius:.5rem;height:2rem;position:relative;overflow:hidden">
          <div style="position:absolute;left:0;top:0;height:100%;background:linear-gradient(90deg,var(--brand),var(--brand2));width:${width}%;transition:width 0.5s ease"></div>
        </div>
        <div style="width:80px;text-align:right;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1rem;color:var(--gold)">${record.best1RM} kg</div>
      </div>`;
    }).join('')}
  </div>`;
}

function showCoachWeightDetail(dateStr) {
  const entry = _weightHistory?.find(e => e.date === dateStr);
  if (!entry) return;
  
  const date = new Date(entry.date);
  const photos = entry.photos || [];
  
  // Calculer le %MG à partir des mensurations si présentes (comme côté client)
  let calculatedBodyFat = null;
  if (entry.measurements && currentClient) {
    const height = currentClient.height || 0;
    const age = currentClient.birthday ? _calcAge(currentClient.birthday) : 0;
    const gender = currentClient.gender || '';
    
    if (height && age && gender) {
      if (entry.measurements.neck || entry.measurements.waist) {
        // Formule US Navy avec mensurations
        const neck = entry.measurements.neck || 0;
        const waist = entry.measurements.waist || 0;
        const hip = entry.measurements.hip || 0;
        
        if (neck && waist && (gender === 'homme' || hip)) {
          if (gender === 'homme') {
            const log10 = Math.log10(waist - neck);
            calculatedBodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
          } else {
            const log10 = Math.log10(waist + hip - neck);
            calculatedBodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
          }
        }
      } else if (entry.measurements.biceps || entry.measurements.triceps) {
        // Formule des 4 plis cutanés
        const biceps = entry.measurements.biceps || 0;
        const triceps = entry.measurements.triceps || 0;
        const subscapular = entry.measurements.subscapular || 0;
        const suprailiac = entry.measurements.suprailiac || 0;
        
        if (biceps && triceps && subscapular && suprailiac) {
          const sum = biceps + triceps + subscapular + suprailiac;
          const log10Sum = Math.log10(sum);
          
          let a, c;
          if (gender === 'homme') {
            if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
            else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0678; }
            else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
            else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
            else { a = 1.1715; c = 0.0779; }
          } else {
            if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
            else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
            else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
            else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
            else { a = 1.1339; c = 0.0645; }
          }
          
          const density = a - (c * log10Sum);
          calculatedBodyFat = (495 / density) - 450;
        }
      }
    }
  }
  
  const displayBodyFat = entry.bodyFat || (calculatedBodyFat && !isNaN(calculatedBodyFat) ? calculatedBodyFat.toFixed(1) : null);
  
  const modalHtml = `
    <div id="modal-weight-detail" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;max-height:90vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">📊 DÉTAIL DE LA MESURE</h3>
          <button onclick="document.getElementById('modal-weight-detail').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:1.5rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Date</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem">${date.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:#60a5fa">${entry.weight} kg</div>
            </div>
          </div>
          
          ${displayBodyFat ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">% Masse Grasse</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:var(--gold)">${displayBodyFat}%</div>
            </div>
          ` : ''}
          
          ${entry.measurements ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Mensurations</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem">
                ${entry.measurements.neck ? `<div><strong>Cou:</strong> ${entry.measurements.neck} cm</div>` : ''}
                ${entry.measurements.waist ? `<div><strong>Taille:</strong> ${entry.measurements.waist} cm</div>` : ''}
                ${entry.measurements.hip ? `<div><strong>Hanche:</strong> ${entry.measurements.hip} cm</div>` : ''}
                ${entry.measurements.biceps ? `<div><strong>Biceps:</strong> ${entry.measurements.biceps} mm</div>` : ''}
                ${entry.measurements.triceps ? `<div><strong>Triceps:</strong> ${entry.measurements.triceps} mm</div>` : ''}
                ${entry.measurements.subscapular ? `<div><strong>Sous-scap:</strong> ${entry.measurements.subscapular} mm</div>` : ''}
                ${entry.measurements.suprailiac ? `<div><strong>Supra-iliaque:</strong> ${entry.measurements.suprailiac} mm</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${photos.length > 0 ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Photos</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:.5rem">
                ${photos.map((photo, i) => `
                  <img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:.5rem;cursor:pointer" 
                       onclick="window.open('${photo}', '_blank')" alt="Photo ${i+1}">
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="display:flex;gap:.5rem;margin-top:1rem">
            <button onclick="document.getElementById('modal-weight-detail').remove()" class="btn" style="flex:1">FERMER</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-weight-detail');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
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
              <td style="text-align:right">
                <button onclick="editPREntry('${h(name)}',${di})" class="btn btn-ghost btn-sm" style="margin-right:.5rem">✏️</button>
                <button onclick="deletePREntry('${h(name)}',${di})" class="btn btn-danger btn-sm">Suppr.</button>
              </td>
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

function editPREntry(exName, sortedIdx) {
  if (!currentClient || !_clientPRData.records[exName]) return;
  const sorted = (_clientPRData.records[exName].history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entry = sorted[sortedIdx]; if (!entry) return;
  
  // Remplir le modal avec les données de l'entrée
  document.getElementById('edit-pr-exname').textContent = exName;
  document.getElementById('edit-pr-weight').value = entry.weight;
  document.getElementById('edit-pr-reps').value = entry.reps || '';
  document.getElementById('edit-pr-date').value = new Date(entry.date).toISOString().split('T')[0];
  document.getElementById('edit-pr-original-exname').value = exName;
  document.getElementById('edit-pr-original-index').value = sortedIdx;
  
  openModal('modal-edit-pr');
}

async function saveEditedPR() {
  if (!currentClient) return;
  const originalExName = document.getElementById('edit-pr-original-exname').value;
  const originalIndex = parseInt(document.getElementById('edit-pr-original-index').value);
  const newExName = document.getElementById('edit-pr-new-exname')?.value?.trim() || originalExName;
  const weight = parseFloat(document.getElementById('edit-pr-weight')?.value);
  const reps = parseInt(document.getElementById('edit-pr-reps')?.value) || 0;
  const date = document.getElementById('edit-pr-date')?.value;
  
  if (!weight) { toast('Poids requis','w'); return; }
  
  try {
    // Si le nom de l'exercice a changé, gérer le transfert
    if (newExName !== originalExName) {
      // Supprimer l'entrée de l'ancien exercice
      const originalSorted = (_clientPRData.records[originalExName].history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
      const originalEntry = originalSorted[originalIndex];
      _clientPRData.records[originalExName].history = (_clientPRData.records[originalExName].history||[]).filter(e => e !== originalEntry);
      
      // Si l'historique de l'ancien exercice est vide, le supprimer
      if (_clientPRData.records[originalExName].history.length === 0) {
        delete _clientPRData.records[originalExName];
      } else {
        // Recalculer le meilleur 1RM
        _clientPRData.records[originalExName].best1RM = (_clientPRData.records[originalExName].history||[]).reduce((mx,e)=>Math.max(mx,e.theoreticalMax||0),0);
      }
      
      // Ajouter l'entrée au nouvel exercice
      if (!_clientPRData.records[newExName]) {
        _clientPRData.records[newExName] = { history: [], best1RM: 0 };
      }
      
      const rm1 = reps > 0 ? Math.round(weight*(1+reps/30)*10)/10 : weight;
      const newEntry = {
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        weight, reps, theoreticalMax: rm1, sessionKey: originalEntry.sessionKey || 'manuel'
      };
      
      _clientPRData.records[newExName].history.push(newEntry);
      _clientPRData.records[newExName].best1RM = Math.max(_clientPRData.records[newExName].best1RM||0, rm1);
      
      toast('Entrée déplacée vers ' + newExName,'s');
    } else {
      // Mise à jour simple de l'entrée existante
      const sorted = (_clientPRData.records[originalExName].history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
      const entry = sorted[originalIndex];
      
      // Mettre à jour les valeurs
      entry.weight = weight;
      entry.reps = reps;
      entry.date = date ? new Date(date).toISOString() : new Date().toISOString();
      entry.theoreticalMax = reps > 0 ? Math.round(weight*(1+reps/30)*10)/10 : weight;
      
      // Recalculer le meilleur 1RM pour cet exercice
      _clientPRData.records[originalExName].best1RM = (_clientPRData.records[originalExName].history||[]).reduce((mx,e)=>Math.max(mx,e.theoreticalMax||0),0);
      
      toast('Entrée modifiée','s');
    }
    
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','personalRecords'), _clientPRData);
    closeModal('modal-edit-pr');
    renderClientPR();
  } catch (e) {
    console.error('Erreur modification PR:', e);
    toast('Erreur lors de la modification','e');
  }
}

async function deletePREntry(exName, sortedIdx) {
  if (!currentClient || !_clientPRData.records[exName]) return;
  const sorted = (_clientPRData.records[exName].history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entry = sorted[sortedIdx]; if (!entry) return;
  _clientPRData.records[exName].history = (_clientPRData.records[exName].history||[]).filter(e => e !== entry);
  _clientPRData.records[exName].best1RM = (_clientPRData.records[exName].history||[]).reduce((mx,e)=>Math.max(mx,e.theoreticalMax||0),0);
  
  // Si l'historique est vide, supprimer l'exercice complètement
  if (_clientPRData.records[exName].history.length === 0) {
    delete _clientPRData.records[exName];
    toast('Exercice et toutes ses entrées supprimés','i');
  } else {
    toast('Entrée supprimée','i');
  }
  
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','personalRecords'), _clientPRData);
  renderClientPR();
}

function openAddManualPR(exNameDisplay) {
  const inp = document.getElementById('manual-pr-exname-input');
  if (inp) inp.value = exNameDisplay;
  document.getElementById('manual-pr-weight').value = '';
  document.getElementById('manual-pr-reps').value = '';
  document.getElementById('manual-pr-date').value = new Date().toISOString().split('T')[0];
  _manualPRExName = exNameDisplay;
  
  // Mettre à jour la datalist avec les exercices de la base de données
  const dl = document.getElementById('manual-pr-exnames-list');
  if (dl && exerciseDb) {
    dl.innerHTML = exerciseDb.map(e => `<option value="${h(e.name||'')}"></option>`).join('');
  }
  
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
  let history = record.history.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  // N'afficher qu'un 1RM par date (le meilleur de chaque date)
  const dateMap = new Map();
  history.forEach(e => {
    const dateKey = e.date;
    if (!dateMap.has(dateKey) || dateMap.get(dateKey).theoreticalMax < e.theoreticalMax) {
      dateMap.set(dateKey, e);
    }
  });
  history = Array.from(dateMap.values()).sort((a,b)=>new Date(a.date)-new Date(b.date));
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
    <thead><tr><th>Exercice</th><th>Meilleur 1RM</th><th>Dernière séance</th><th>Reps</th></tr></thead>
    <tbody>${exNames.map(name => {
      const ex = records[name];
      const bestEntry = (ex.history||[]).slice().sort((a,b)=>b.theoreticalMax - a.theoreticalMax)[0];
      const last = (ex.history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      return `<tr class="db-row">
        <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic">${h(name)}</td>
        <td><span class="badge" style="background:var(--gold);color:#1a0900">${ex.best1RM||0} kg</span></td>
        <td style="font-size:.7rem;color:var(--muted)">${last?new Date(last.date).toLocaleDateString('fr-FR'):'—'}</td>
        <td style="font-size:.8rem;color:var(--muted)">${bestEntry?bestEntry.reps:'—'}</td>
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
