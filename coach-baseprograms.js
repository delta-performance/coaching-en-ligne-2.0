// ── COACH: BASE PROGRAMS (Programmes génériques) ─────────────────────────
// Gestion des programmes de base utilisables par plusieurs clients

if (typeof allBasePrograms === 'undefined') window.allBasePrograms = [];
if (typeof currentBaseProgram === 'undefined') window.currentBaseProgram = null;
if (typeof _bpProgramData === 'undefined') window._bpProgramData = { cycles: [] };
if (typeof _bpSelectedCycle === 'undefined') window._bpSelectedCycle = null;
if (typeof _bpSelectedSess === 'undefined') window._bpSelectedSess = 'A';
if (typeof _bpEditorExos === 'undefined') window._bpEditorExos = [];
if (typeof _bpSessMode === 'undefined') window._bpSessMode = 'circuit';
if (typeof _bpVisibility === 'undefined') window._bpVisibility = 'private';
if (typeof _bpAllowedCoaches === 'undefined') window._bpAllowedCoaches = [];

// ── Chargement et affichage de la liste ─────────────────────────────────

async function loadBasePrograms() {
  try {
    const snap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'basePrograms'));
    allBasePrograms = [];
    snap.forEach(d => allBasePrograms.push({ id: d.id, ...d.data() }));
    renderBaseProgramsList();
  } catch(e) { 
    console.error('Error loading base programs:', e);
    toast('Erreur chargement programmes de base','e'); 
  }
}

// Vérifier si un coach peut voir un programme de base
function canViewBaseProgram(bp) {
  if (!currentUser) return false;
  // Admin voit tout
  if (typeof isAdminUser === 'function' && isAdminUser()) return true;
  // Le créateur peut toujours voir
  if (bp.createdBy === currentUser.uid) return true;
  // Visibilité "all"
  if (bp.visibility === 'all') return true;
  // Visibilité "specific" et coach autorisé
  if (bp.visibility === 'specific' && bp.allowedCoaches?.includes(currentUser.uid)) return true;
  return false;
}

// Vérifier si un coach peut modifier un programme de base
function canEditBaseProgram(bp) {
  if (!currentUser) return false;
  // Admin peut modifier
  if (typeof isAdminUser === 'function' && isAdminUser()) return true;
  // Le créateur peut modifier
  if (bp.createdBy === currentUser.uid) return true;
  return false;
}

function renderBaseProgramsList() {
  const el = document.getElementById('baseprograms-list');
  if (!el) return;
  
  // Filtrer les programmes visibles pour le coach actuel
  const visiblePrograms = allBasePrograms.filter(bp => canViewBaseProgram(bp));
  
  if (!visiblePrograms.length) {
    el.innerHTML = '<p style="color:var(--muted);font-style:italic;text-align:center;padding:3rem">Aucun programme de base disponible.</p>';
    return;
  }
  
  const isAdmin = typeof isAdminUser === 'function' && isAdminUser();
  
  // Utiliser le même style de grille que les clients mais avec des cartes plus grandes
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:1.5rem">
    ${visiblePrograms.map(bp => {
      const cycleCount = bp.cycles?.length || 0;
      const clientCount = allClients.filter(c => c.baseProgramId === bp.id).length;
      const creator = coachesList?.find(c => c.uid === bp.createdBy);
      const creatorName = creator?.name || 'Inconnu';
      const canEdit = canEditBaseProgram(bp);
      
      // Compter les macros/mesos/micros si hiérarchie existe
      let hierarchyInfo = '';
      if (bp.hierarchy?.macros) {
        const macroCount = bp.hierarchy.macros.length;
        const mesoCount = bp.hierarchy.macros.reduce((sum, m) => sum + (m.mesos?.length || 0), 0);
        const microCount = bp.hierarchy.macros.reduce((sum, m) => sum + (m.mesos?.reduce((s, me) => s + (me.micros?.length || 0), 0) || 0), 0);
        hierarchyInfo = `<span><strong style="color:var(--gold)">${macroCount}</strong>M <strong style="color:var(--gold)">${mesoCount}</strong>Mé <strong style="color:var(--gold)">${microCount}</strong>Mi</span>`;
      } else {
        hierarchyInfo = `<span><strong style="color:var(--gold)">${cycleCount}</strong> cycle(s)</span>`;
      }
      
      return `
      <div class="card-hover" onclick="openBaseProgramEditor('${bp.id}')" style="${bp.archived?'opacity:.6':''};cursor:pointer;padding:2rem">
        <div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1.25rem">
          <div style="width:4rem;height:4rem;border-radius:1.25rem;background:linear-gradient(135deg,var(--brand),var(--brand2));display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:900;font-style:italic;color:white;flex-shrink:0">${((bp.name||'P')[0]).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(bp.name||'—')}</div>
            <div style="font-size:.75rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);margin-top:.25rem">${hierarchyInfo} · ${clientCount} client(s)</div>
          </div>
        </div>
        ${bp.description?`<p style="font-size:.85rem;color:var(--muted);font-style:italic;margin-bottom:1.25rem;line-height:1.5">${h(bp.description.substring(0,100))}${bp.description.length>100?'...':''}</p>`:''}
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;margin-top:auto">
          <div style="font-size:.7rem;color:var(--muted)">
            ${isAdmin ? `Créé par: ${h(creatorName)} · ` : ''}
            ${bp.visibility === 'private' ? '🔒 Privé' : ''}
            ${bp.visibility === 'specific' ? '👥 Spécifique' : ''}
            ${bp.visibility === 'all' ? '🌐 Public' : ''}
          </div>
          ${canEdit ? `<div style="display:flex;gap:.5rem" onclick="event.stopPropagation()">
            <button class="btn btn-ghost btn-sm" onclick="toggleArchiveBaseProgram('${bp.id}')">${bp.archived?'Désarchiver':'Archiver'}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBaseProgram('${bp.id}')">Suppr.</button>
          </div>` : ''}
        </div>
        ${bp.archived?`<span class="badge badge-archived" style="margin-top:1rem;display:inline-block">Archivé</span>`:''}
      </div>`;
    }).join('')}
  </div>`;
}

// ── Création ─────────────────────────────────────────────────────────────

async function createBaseProgram() {
  const name = document.getElementById('nbp-name')?.value.trim();
  const description = document.getElementById('nbp-desc')?.value.trim();
  if (!name) { toast('Nom requis','w'); return; }
  
  const newId = 'bp_' + Date.now();
  
  // Créer la structure hiérarchique : Macro 1 > Meso 1 > Micro 1 avec Séance A
  const hierarchy = {
    macros: [{
      id: 1,
      name: 'Macrocycle 1',
      focus: '',
      archived: false,
      mesos: [{
        id: 1,
        name: 'Mésocycle 1',
        focus: '',
        archived: false,
        micros: [{
          id: 1,
          focus: 'Microcycle 1',
          archived: false,
          sessions_active: ['A'],
          sessions: {
            A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
          }
        }]
      }]
    }]
  };
  
  // Cycles plats pour compatibilité (dérivés de la hiérarchie)
  const initProg = [{
    id: 1, focus: 'Microcycle 1', sessions_active: ['A'],
    sessions: {
      A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
    }
  }];
  
  const payload = { 
    name, 
    description, 
    cycles: initProg,
    hierarchy: hierarchy,
    hierarchyLevel: 'micro',
    createdAt: new Date().toISOString(),
    createdBy: currentUser?.uid || 'unknown'
  };
  
  try {
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'basePrograms',newId), payload);
    closeModal('modal-add-baseprogram');
    document.getElementById('nbp-name').value = '';
    document.getElementById('nbp-desc').value = '';
    toast('Programme de base créé !','s');
    await loadBasePrograms();
    // Ouvrir automatiquement le programme créé
    openBaseProgramEditor(newId);
  } catch(e) { 
    console.error(e);
    toast('Erreur création','e'); 
  }
}

// ── Suppression ─────────────────────────────────────────────────────────

async function deleteBaseProgram(bpId) {
  const bp = allBasePrograms.find(p => p.id === bpId);
  if (!bp) return;
  
  const clientsUsing = allClients.filter(c => c.baseProgramId === bpId);
  if (clientsUsing.length > 0) {
    toast(`Impossible : ${clientsUsing.length} client(s) utilisent ce programme`,'e');
    return;
  }
  
  if (!confirm(`Supprimer le programme "${bp.name}" ?`)) return;
  
  try {
    await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'basePrograms',bpId));
    toast('Programme supprimé','i');
    await loadBasePrograms();
  } catch(e) {
    toast('Erreur suppression','e');
  }
}

async function toggleArchiveBaseProgram(bpId) {
  if (!isAdminUser()) { toast('Action réservée à l\'admin', 'w'); return; }
  
  const bp = allBasePrograms.find(p => p.id === bpId);
  if (!bp) return;
  
  const newArchived = !bp.archived;
  
  try {
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'basePrograms',bpId), {
      ...bp,
      archived: newArchived,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Mettre à jour localement
    bp.archived = newArchived;
    
    toast(newArchived ? 'Programme archivé' : 'Programme désarchivé', newArchived ? 'w' : 's');
    renderBaseProgramsList();
  } catch(e) {
    console.error(e);
    toast('Erreur lors de l\'archivage', 'e');
  }
}

// ── Éditeur de programme de base ───────────────────────────────────────

async function openBaseProgramEditor(bpId) {
  const bp = allBasePrograms.find(p => p.id === bpId);
  if (!bp) return;
  
  currentBaseProgram = bp;
  
  // Charger les cycles et la hiérarchie
  _bpProgramData = { 
    cycles: bp.cycles || [],
    hierarchy: bp.hierarchy || null
  };
  
  // Migrer les cycles vers hiérarchie si nécessaire
  if (!_bpProgramData.hierarchy && _bpProgramData.cycles.length > 0) {
    console.log('Migrating cycles to hierarchy:', _bpProgramData.cycles.length, 'cycles');
    bpMigrateToHierarchy();
    // Sauvegarder la hiérarchie créée
    await bpSaveHierarchy();
  }
  
  // Si toujours pas de hiérarchie, créer une par défaut
  if (!_bpProgramData.hierarchy) {
    _bpProgramData.hierarchy = { macros: [] };
  }
  
  _bpSelectedCycle = _bpProgramData.cycles[0]?.id || null;
  _bpSelectedSess = 'A';
  
  document.getElementById('baseprograms-list').classList.add('hidden');
  document.getElementById('baseprogram-editor').classList.remove('hidden');
  document.getElementById('baseprogram-editor-title').innerText = bp.name;
  
  // Initialiser avec l'onglet cycles
  switchBaseProgramSubTab('cycles');
}

function closeBaseProgramEditor() {
  document.getElementById('baseprogram-editor').classList.add('hidden');
  document.getElementById('baseprograms-list').classList.remove('hidden');
  currentBaseProgram = null;
  _bpProgramData = { cycles: [] };
  loadBasePrograms();
}

function switchBaseProgramSubTab(tab) {
  ['cycles','editor','visu','params'].forEach(t => {
    const el = document.getElementById('bsub-'+t);
    if (el) {
      el.classList.toggle('hidden', t !== tab);
      if (t === 'cycles') el.style.display = t === tab ? 'flex' : 'none';
    }
    const btn = document.getElementById('bstab-'+t);
    if (btn) btn.className = 'sub-tab-pill ' + (t === tab ? 'on' : 'off');
  });
  
  if (tab === 'cycles') renderBaseProgramCycles();
  if (tab === 'editor') initBaseProgramEditor();
  if (tab === 'visu') renderBaseProgramVisu();
  if (tab === 'params') renderBaseProgramParams();
}

// ── Gestion des cycles (utilise EXACTEMENT les fonctions classiques) ─────────────────────────────────────────────────────────

function renderBaseProgramCycles() {
  // Utiliser la fonction copiée exactement de coach-cycles-hierarchy.js
  if (typeof bpRenderHierarchy === 'function') {
    bpRenderHierarchy();
  }
}

function getActiveSessions(cycle) {
  if (cycle.sessions_active && cycle.sessions_active.length) return cycle.sessions_active;
  return Object.keys(cycle.sessions || {}).filter(k => cycle.sessions[k] && (cycle.sessions[k].exercises?.length > 0 || cycle.sessions[k].comment));
}

async function addBaseProgramCycle() {
  // Utiliser la fonction copiée exactement de coach-cycles-hierarchy.js
  if (typeof bpAddMicroWithAutoParents === 'function') {
    await bpAddMicroWithAutoParents();
    return;
  }
  
  // Fallback
  if (!currentBaseProgram) return;
  const name = 'Nouveau cycle';
  const newId = _bpProgramData.cycles.length ? Math.max(..._bpProgramData.cycles.map(c => c.id)) + 1 : 1;
  
  _bpProgramData.cycles.push({
    id: newId, focus: name, sessions_active: [],
    sessions: {
      A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      B: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      C: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      D: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
    }
  });
  
  try {
    await saveBaseProgramData();
    renderBaseProgramCycles();
    toast('Cycle ' + newId + ' créé !','s');
  } catch(e) { toast('Erreur','e'); }
}

async function renameBaseProgramCycle(id) {
  // Utiliser la fonction classique renameMicro si disponible
  if (typeof renameMicro === 'function') {
    const inp = document.getElementById(`bp-rename-${id}`) || document.getElementById(`micro-name-${id}`);
    if (!inp || !inp.value.trim()) return;
    
    enterBaseProgramMode();
    renameMicro(id, inp.value.trim());
    _bpProgramData.cycles = window.clientProgram;
    exitBaseProgramMode();
    
    await saveBaseProgramData();
    toast('Renommé !', 's');
    return;
  }
  
  // Fallback
  const inp = document.getElementById('bp-rename-'+id);
  if (!inp || !inp.value.trim()) return;
  const idx = _bpProgramData.cycles.findIndex(c => c.id === id);
  if (idx === -1) return;
  _bpProgramData.cycles[idx].focus = inp.value.trim();
  try {
    await saveBaseProgramData();
    toast('Renommé !','s');
  } catch(e) { toast('Erreur','e'); }
}

async function deleteBaseProgramCycle(id) {
  // Utiliser la fonction classique deleteMicro si disponible
  if (typeof deleteMicro === 'function') {
    if (!confirm('Supprimer le cycle ' + id + ' ?')) return;
    
    enterBaseProgramMode();
    await deleteMicro(id);
    _bpProgramData.cycles = window.clientProgram;
    exitBaseProgramMode();
    
    renderBaseProgramCycles();
    toast('Cycle supprimé', 'w');
    return;
  }
  
  // Fallback
  const idx = _bpProgramData.cycles.findIndex(c => c.id === id);
  if (idx === -1) return;
  if (!confirm('Supprimer le cycle ' + id + ' ?')) return;
  _bpProgramData.cycles.splice(idx, 1);
  try {
    await saveBaseProgramData();
    renderBaseProgramCycles();
    toast('Cycle supprimé','w');
  } catch(e) { toast('Erreur','e'); }
}

// ── Éditeur de séance (utilise les fonctions dédiées) ───────────────────────────────────────────────────

function initBaseProgramEditor() {
  // Utiliser la fonction copiée exactement de coach-editor.js
  if (typeof bpRebuildEditorSelects === 'function') {
    bpRebuildEditorSelects();
  }
}

async function saveBaseProgramData() {
  if (!currentBaseProgram) return;
  
  // Nettoyer les données
  const cleanCycles = _bpProgramData.cycles.map(c => ({
    id: c.id,
    focus: c.focus || '',
    sessions_active: c.sessions_active || [],
    sessions: c.sessions || {}
  }));
  
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'basePrograms',currentBaseProgram.id), {
    ...currentBaseProgram,
    cycles: cleanCycles,
    updatedAt: new Date().toISOString()
  });
  
  // Mettre à jour la copie locale
  currentBaseProgram.cycles = cleanCycles;
  const bpIdx = allBasePrograms.findIndex(p => p.id === currentBaseProgram.id);
  if (bpIdx !== -1) allBasePrograms[bpIdx] = currentBaseProgram;
}

// ── Paramètres avancés (visibilité et assignation) ───────────────────────

function renderBaseProgramParams() {
  if (!currentBaseProgram) return;
  
  const level = currentBaseProgram?.hierarchyLevel || 'micro';
  const visibility = currentBaseProgram?.visibility || 'private';
  const isAdmin = typeof isAdminUser === 'function' && isAdminUser();
  const canEdit = canEditBaseProgram(currentBaseProgram);
  
  // Mettre à jour les styles des boutons de hiérarchie
  ['micro','meso','macro'].forEach(l => {
    const btn = document.getElementById('bp-hierarchy-'+l);
    if (btn) {
      const isSelected = l === level;
      btn.style.borderColor = isSelected ? 'rgba(240,165,0,.5)' : 'var(--border)';
      btn.style.background = isSelected ? 'rgba(240,165,0,.15)' : 'var(--surface)';
      btn.style.color = isSelected ? 'var(--gold)' : 'var(--muted)';
    }
  });
  
  // Afficher le créateur pour l'admin
  const creatorSection = document.getElementById('bp-creator-section');
  const creatorName = document.getElementById('bp-creator-name');
  if (creatorSection && creatorName && isAdmin) {
    creatorSection.style.display = 'block';
    const creator = coachesList?.find(c => c.uid === currentBaseProgram.createdBy);
    creatorName.textContent = creator?.name || 'Inconnu';
  } else if (creatorSection) {
    creatorSection.style.display = 'none';
  }
  
  // Afficher/masquer le bouton "Privé" uniquement pour les admins
  const privateBtn = document.getElementById('bp-visibility-private');
  if (privateBtn) {
    privateBtn.style.display = isAdmin ? 'inline-block' : 'none';
  }
  
  // Mettre à jour les boutons de visibilité
  ['all','specific','private'].forEach(v => {
    const btn = document.getElementById('bp-visibility-'+v);
    if (btn) {
      const isSelected = v === visibility;
      btn.style.borderColor = isSelected ? 'rgba(240,165,0,.5)' : 'var(--border)';
      btn.style.background = isSelected ? 'rgba(240,165,0,.15)' : 'var(--surface)';
      btn.style.color = isSelected ? 'var(--gold)' : 'var(--muted)';
    }
  });
  
  // Afficher/masquer la sélection des coachs
  const coachSelection = document.getElementById('bp-coach-selection');
  if (coachSelection) {
    coachSelection.style.display = visibility === 'specific' ? 'block' : 'none';
  }
  
  // Remplir la liste des coachs
  renderBPCoachList();
  
  // Remplir la liste des clients assignés
  renderBPAssignedClients();
}

function renderBPCoachList() {
  const list = document.getElementById('bp-coach-list');
  if (!list) return;
  
  const coaches = (typeof coachesList !== 'undefined' ? coachesList : []).filter(c => c.role === 'coach' || c.role === 'admin');
  const allowed = currentBaseProgram?.allowedCoaches || [];
  
  if (!coaches.length) {
    list.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.75rem">Aucun coach disponible.</p>';
    return;
  }
  
  list.innerHTML = coaches.map(c => {
    const isAllowed = allowed.includes(c.uid);
    return `
      <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.25rem 0;font-size:.8rem">
        <input type="checkbox" ${isAllowed ? 'checked' : ''} onchange="toggleBPAllowedCoach('${c.uid}', this.checked)">
        <span>${h(c.name)} ${c.role === 'admin' ? '👑' : ''}</span>
      </label>
    `;
  }).join('');
}

function toggleBPAllowedCoach(coachUid, isAllowed) {
  if (!currentBaseProgram) return;
  if (!currentBaseProgram.allowedCoaches) currentBaseProgram.allowedCoaches = [];
  
  if (isAllowed) {
    if (!currentBaseProgram.allowedCoaches.includes(coachUid)) {
      currentBaseProgram.allowedCoaches.push(coachUid);
    }
  } else {
    currentBaseProgram.allowedCoaches = currentBaseProgram.allowedCoaches.filter(id => id !== coachUid);
  }
}

function setBaseProgramVisibility(visibility) {
  if (!currentBaseProgram) return;
  currentBaseProgram.visibility = visibility;
  renderBaseProgramParams();
}

function setBaseProgramHierarchyLevel(level) {
  if (!currentBaseProgram) return;
  currentBaseProgram.hierarchyLevel = level;
  renderBaseProgramParams();
}

function renderBPAssignedClients() {
  const list = document.getElementById('bp-assigned-clients');
  if (!list) return;
  
  const assigned = allClients.filter(c => c.baseProgramId === currentBaseProgram?.id && c.programMode === 'generic');
  
  if (!assigned.length) {
    list.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem;text-align:center;padding:1rem">Aucun client assigné</p>';
    return;
  }
  
  list.innerHTML = assigned.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .75rem;background:var(--card);border-radius:.5rem;border:1px solid var(--border)">
      <div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.9rem">${h(c.name)}</div>
        <div style="font-size:.65rem;color:var(--muted)">${h(c.code)}</div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="unassignClientFromBP('${c.id}')">Retirer</button>
    </div>
  `).join('');
}

function openAssignClientToBP() {
  openModal('modal-assign-client-bp');
  renderBPAssignClientsList();
}

function renderBPAssignClientsList() {
  const list = document.getElementById('bp-assign-clients-list');
  if (!list) return;
  
  // Clients qui ne sont pas déjà assignés à ce programme
  const available = allClients.filter(c => c.baseProgramId !== currentBaseProgram?.id || c.programMode !== 'generic');
  
  if (!available.length) {
    list.innerHTML = '<p style="color:var(--muted);font-style:italic;text-align:center;padding:1rem">Aucun client disponible.</p>';
    return;
  }
  
  list.innerHTML = available.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .75rem;background:var(--card);border-radius:.5rem;border:1px solid var(--border);cursor:pointer" onclick="assignClientToBP('${c.id}')">
      <div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.9rem">${h(c.name)}</div>
        <div style="font-size:.65rem;color:var(--muted)">${h(c.code)} ${c.programMode === 'generic' && c.baseProgramId ? '(déjà en mode générique)' : ''}</div>
      </div>
      <span style="color:var(--gold);font-size:1.2rem">+</span>
    </div>
  `).join('');
}

function filterBPAssignClients() {
  const search = document.getElementById('bp-assign-search')?.value.toLowerCase() || '';
  const list = document.getElementById('bp-assign-clients-list');
  if (!list) return;
  
  const available = allClients.filter(c => {
    const matchesSearch = (c.name?.toLowerCase().includes(search) || c.code?.toLowerCase().includes(search));
    const notAssigned = c.baseProgramId !== currentBaseProgram?.id || c.programMode !== 'generic';
    return matchesSearch && notAssigned;
  });
  
  if (!available.length) {
    list.innerHTML = '<p style="color:var(--muted);font-style:italic;text-align:center;padding:1rem">Aucun client trouvé.</p>';
    return;
  }
  
  list.innerHTML = available.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .75rem;background:var(--card);border-radius:.5rem;border:1px solid var(--border);cursor:pointer" onclick="assignClientToBP('${c.id}')">
      <div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:.9rem">${h(c.name)}</div>
        <div style="font-size:.65rem;color:var(--muted)">${h(c.code)}</div>
      </div>
      <span style="color:var(--gold);font-size:1.2rem">+</span>
    </div>
  `).join('');
}

async function assignClientToBP(clientId) {
  if (!currentBaseProgram) return;
  
  const client = allClients.find(c => c.id === clientId);
  if (!client) return;
  
  try {
    // Mettre à jour le client
    const updated = {
      ...client,
      programMode: 'generic',
      baseProgramId: currentBaseProgram.id
    };
    
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId),
      updated
    );
    
    // Mettre à jour localement
    const idx = allClients.findIndex(c => c.id === clientId);
    if (idx !== -1) allClients[idx] = updated;
    
    closeModal('modal-assign-client-bp');
    renderBPAssignedClients();
    renderBaseProgramsList(); // Mettre à jour le compteur
    toast(`${client.name} assigné au programme !`, 's');
  } catch (e) {
    console.error(e);
    toast('Erreur assignation', 'e');
  }
}

async function unassignClientFromBP(clientId) {
  if (!currentBaseProgram) return;
  
  const client = allClients.find(c => c.id === clientId);
  if (!client) return;
  
  if (!confirm(`Retirer ${client.name} de ce programme ?`)) return;
  
  try {
    // Mettre à jour le client - repasse en mode personnalisé sans programme de base
    const updated = {
      ...client,
      programMode: 'personalized',
      baseProgramId: null
    };
    
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId),
      updated
    );
    
    // Mettre à jour localement
    const idx = allClients.findIndex(c => c.id === clientId);
    if (idx !== -1) allClients[idx] = updated;
    
    renderBPAssignedClients();
    renderBaseProgramsList(); // Mettre à jour le compteur
    toast(`${client.name} retiré du programme`, 'i');
  } catch (e) {
    console.error(e);
    toast('Erreur', 'e');
  }
}

async function saveBaseProgramParams() {
  if (!currentBaseProgram) return;
  
  try {
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'basePrograms',currentBaseProgram.id), {
      ...currentBaseProgram,
      hierarchyLevel: currentBaseProgram.hierarchyLevel || 'micro',
      visibility: currentBaseProgram.visibility || 'private',
      allowedCoaches: currentBaseProgram.allowedCoaches || [],
      updatedAt: new Date().toISOString()
    });
    
    const bpIdx = allBasePrograms.findIndex(p => p.id === currentBaseProgram.id);
    if (bpIdx !== -1) allBasePrograms[bpIdx] = currentBaseProgram;
    toast('Paramètres sauvegardés !','s');
  } catch(e) {
    console.error(e);
    toast('Erreur sauvegarde','e');
  }
}

// ── Duplication ──────────────────────────────────────────────────────────

function dupBaseProgramCycle() {
  if (!currentBaseProgram || !_bpSelectedCycle) return;
  
  const src = _bpProgramData.cycles.find(c => c.id === _bpSelectedCycle);
  if (!src) return;
  
  const newId = _bpProgramData.cycles.length ? Math.max(..._bpProgramData.cycles.map(c => c.id)) + 1 : 1;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = newId;
  copy.focus = copy.focus + ' (copie)';
  
  _bpProgramData.cycles.push(copy);
  _bpSelectedCycle = newId;
  
  saveBaseProgramData().then(() => {
    renderBaseProgramCycles();
    toast('Cycle dupliqué !','s');
  }).catch(() => toast('Erreur','e'));
}

function dupBaseProgramSession() {
  if (!currentBaseProgram || !_bpSelectedCycle || !_bpSelectedSess) return;
  
  const c = _bpProgramData.cycles.find(x => x.id === _bpSelectedCycle);
  if (!c || !c.sessions) return;
  
  const src = c.sessions[_bpSelectedSess];
  if (!src) return;
  
  // Trouver la prochaine lettre disponible
  const used = Object.keys(c.sessions);
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const next = allLetters.find(l => !used.includes(l));
  if (!next) { toast('Plus de lettres disponibles','w'); return; }
  
  c.sessions[next] = JSON.parse(JSON.stringify(src));
  if (!c.sessions_active.includes(next)) c.sessions_active.push(next);
  
  saveBaseProgramData().then(() => {
    rebuildBaseProgramSessSelect(_bpSelectedCycle);
    toast('Séance dupliquée en ' + next,'s');
  }).catch(() => toast('Erreur','e'));
}

// ── Visualisation (utilise EXACTEMENT les fonctions classiques) ─────────────────────────────────────────────────────────

function renderBaseProgramVisu() {
  // Utiliser la fonction copiée exactement de coach-visu.js
  if (typeof bpRenderVisu === 'function') {
    bpPopulateVisuSelect();
    bpRenderVisu();
  }
}

// ── Utilitaires ──────────────────────────────────────────────────────────

function getSessColor(type) {
  const colors = {
    A: '#3b82f6', B: '#10b981', C: '#f97316', D: '#8b5cf6',
    E: '#ec4899', F: '#14b8a6', G: '#f59e0b', H: '#6366f1'
  };
  return colors[type] || '#4a6080';
}

// ── Intégration avec onglet coach ───────────────────────────────────────

// Hook pour switchCoachTab dans coach-main.js
const originalSwitchCoachTab = window.switchCoachTab;
window.switchCoachTab = function(tab) {
  if (tab === 'baseprograms') {
    // Masquer tous les onglets
    ['clients','fiche','groupes','transfer','database','coachs','baseprograms'].forEach(t => {
      const el = document.getElementById('coach-'+t);
      if (el) el.classList.add('hidden');
      const btn = document.getElementById('ctab-'+t);
      if (btn) btn.className = 'tab-pill off';
    });
    // Afficher l'onglet baseprograms
    document.getElementById('coach-baseprograms')?.classList.remove('hidden');
    document.getElementById('ctab-baseprograms')?.classList.remove('hidden');
    document.getElementById('ctab-baseprograms')?.classList.add('on');
    document.getElementById('ctab-baseprograms').className = 'tab-pill on';
    
    // Charger les données
    loadBasePrograms();
    return;
  }
  
  // Appeler la fonction originale pour les autres onglets
  if (originalSwitchCoachTab) originalSwitchCoachTab(tab);
};

// Hook pour les admins uniquement (même logique que les autres onglets admin)
const originalSwitchCoachTabAdminCheck = window.switchCoachTab;
window.switchCoachTab = function(tab) {
  if (!isAdminUser && typeof isAdminUser === 'function' && !isAdminUser()) {
    // Vérifier si c'est un onglet admin-only
    if (tab === 'coachs') {
      tab = 'clients';
    }
  }
  
  if (tab === 'baseprograms') {
    ['clients','fiche','groupes','transfer','database','coachs','baseprograms'].forEach(t => {
      const el = document.getElementById('coach-'+t);
      if (el) el.classList.toggle('hidden', t !== tab);
      const btn = document.getElementById('ctab-'+t);
      if (btn) btn.className = 'tab-pill ' + (t === tab ? 'on' : 'off');
    });
    loadBasePrograms();
    return;
  }
  
  // Fallback sur la fonction originale ou implémentation de base
  ['clients','fiche','groupes','transfer','database','coachs','baseprograms','messages'].forEach(t => {
    const el = document.getElementById('coach-'+t);
    if (el) el.classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('ctab-'+t);
    if (btn) btn.className = 'tab-pill ' + (t === tab ? 'on' : 'off');
  });
  
  if (tab === 'transfer' && typeof populateTransferSelects === 'function') populateTransferSelects();
  if (tab === 'coachs' && typeof renderCoachsList === 'function') renderCoachsList();
  if (tab === 'database' && typeof renderDatabase === 'function') { 
    if (typeof updateDbFilterDropdowns === 'function') updateDbFilterDropdowns();
    renderDatabase(); 
  }
  if (tab === 'baseprograms') loadBasePrograms();
  if (tab === 'messages' && typeof renderAllMessages === 'function') {
    setTimeout(() => renderAllMessages(), 50);
  }
};
