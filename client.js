// Guard: workoutData may not be loaded yet
if (typeof workoutData === 'undefined') window.workoutData = {};
if (typeof _weightHistory === 'undefined') window._weightHistory = [];

async function loadClientData(clientId) {
  try {
    console.log('loadClientData started for', clientId);
    
    // Charger le profil client pour vérifier le mode de programme
    let clientProfile = null;
    try {
      const clientDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId));
      if (clientDoc.exists) {
        clientProfile = clientDoc.data();
      }
    } catch(e) {
      console.log('Could not load client profile, using defaults');
    }
    
    // Vérifier si le client utilise un programme de base (générique)
    const useBaseProgram = clientProfile?.programMode === 'generic' && clientProfile?.baseProgramId;
    
    // CHARGEMENT UNIQUEMENT DEPUIS HIERARCHY
    const hierarchyDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId,'data','hierarchy'));
    if (hierarchyDoc.exists && hierarchyDoc.data().macros) {
      window.clientProgramHierarchy = { macros: hierarchyDoc.data().macros };
      console.log('Client hierarchy loaded:', window.clientProgramHierarchy.macros.length, 'macros');
      
      // Synchroniser clientProgram depuis la hiérarchie
      if (typeof syncClientProgram === 'function') {
        syncClientProgram();
      } else {
        // Fallback: construire clientProgram depuis la hiérarchie
        const allMicros = [];
        window.clientProgramHierarchy.macros.forEach(macro => {
          macro.mesos?.forEach(meso => {
            meso.micros?.forEach(micro => {
              allMicros.push({
                ...micro,
                macroId: macro.id,
                mesoId: meso.id,
                macroName: macro.name,
                mesoName: meso.name
              });
            });
          });
        });
        clientProgram = allMicros.filter(m => !m.archived);
        clientArchived = new Set(allMicros.filter(m => m.archived).map(m => m.id));
      }
    } else if (useBaseProgram) {
      // Pas de hiérarchie client: charger depuis le programme de base
      console.log('No client hierarchy, loading from base program:', clientProfile.baseProgramId);
      const bpDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'basePrograms',clientProfile.baseProgramId));
      if (bpDoc.exists && bpDoc.data().hierarchy && bpDoc.data().hierarchy.macros) {
        window.clientProgramHierarchy = { macros: bpDoc.data().hierarchy.macros };
        console.log('Base program hierarchy loaded:', window.clientProgramHierarchy.macros.length, 'macros');
        
        // Synchroniser
        if (typeof syncClientProgram === 'function') {
          syncClientProgram();
        }
      } else {
        // Fallback: créer une hiérarchie par défaut
        console.log('Creating default hierarchy');
        window.clientProgramHierarchy = { macros: [] };
        clientProgram = [];
      }
    } else {
      // Pas de hiérarchie: créer une hiérarchie par défaut pour nouveau client
      console.log('No hierarchy found, creating default');
      window.clientProgramHierarchy = { macros: [] };
      clientProgram = [];
    }
    
    // Migrer vers hiérarchie si nécessaire (legacy migration)
    if (typeof migrateAfterDataLoad === 'function') {
      await migrateAfterDataLoad();
    }
    
    const unlockDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId,'data','unlock'));
    if (unlockDoc.exists) {
      clientUnlocked = new Set(unlockDoc.data().unlocked || []);
      clientArchived = new Set(unlockDoc.data().archived || []);
    } else { clientUnlocked = new Set(); clientArchived = new Set(); await saveClientUnlock(clientId); }
    
    // Charger l'historique poids (toujours individuel)
    try {
      const weightDoc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId,'data','weightHistory'));
      if (weightDoc.exists && weightDoc.data().entries) {
        _weightHistory = weightDoc.data().entries;
        console.log('Weight history loaded:', _weightHistory.length, 'entries');
      } else {
        _weightHistory = [];
        console.log('No weight history found');
      }
    } catch (e) {
      console.warn('Error loading weight history:', e);
      _weightHistory = [];
    }
    
    // Charge la base d'exercices pour les images côté client
    if (!currentUser || !currentUser.isCoach) {
      const dbsnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'exerciseDb'));
      exerciseDb = []; dbsnap.forEach(d => exerciseDb.push({ id: d.id, ...d.data() }));
      if (typeof renderClientDocuments === 'function') renderClientDocuments();
    }
    
    // Afficher l'onglet tracking pour tous les clients
    const trackingTab = document.getElementById('ctab-tracking');
    if (trackingTab) {
      trackingTab.style.display = '';
      if (document.getElementById('client-tab-tracking') && !document.getElementById('client-tab-tracking').classList.contains('hidden')) {
        if (typeof renderClientTracking === 'function') renderClientTracking();
      }
    }
    
    if (unsubLogs) unsubLogs();
    unsubLogs = window.fdb.onSnapshot(
      window.fdb.collection(window.db,'apps',APP_ID,'clients',clientId,'logs'),
      snap => {
        clientLogs = {}; snap.forEach(d => clientLogs[d.id] = d.data());
        renderClientGrid();
        if (currentClient && !document.getElementById('sub-logs').classList.contains('hidden')) renderLogs();
      }
    );
    
    console.log('loadClientData completed successfully');
  } catch(e) { 
    console.error('loadClientData error:', e); 
    toast('Erreur chargement', 'e'); 
  }
}

async function saveClientProgram(clientId) {
  // DEPRECATED: Le document 'program' n'est plus utilisé
  // Tout est maintenant sauvegardé dans 'hierarchy'
  // Cette fonction redirige vers saveHierarchy pour compatibilité
  console.log('[DEPRECATED] saveClientProgram called - redirecting to saveHierarchy');
  
  if (typeof saveHierarchy === 'function') {
    await saveHierarchy();
  } else {
    console.error('saveHierarchy not available - cannot save');
  }
}

async function saveClientUnlock(clientId) {
  const cid = clientId || (currentClient ? currentClient.id : null) || (currentUser && !currentUser.isCoach ? currentUser.id : null);
  if (!cid) return;
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'data','unlock'), { unlocked: Array.from(clientUnlocked), archived: Array.from(clientArchived) });
}

function getSessParams(c, t) { const s = c.sessions[t]; if (!s||Array.isArray(s)) return { rest:'45s',tours:'3',mode:'circuit',comment:'' }; return { rest:s.rest||'45s', tours:s.tours||'3', mode:s.mode||'circuit', comment:s.comment||'' }; }
function getSessEx(c, t) { const s = c.sessions[t]; if (!s) return []; if (Array.isArray(s)) return s; return s.exercises||[]; }

// ── CLIENT GRID ──────────────────────────────────────
function renderClientGrid() {
  const grid = document.getElementById('cycles-grid');
  const archGrid = document.getElementById('archive-grid');
  const archSec = document.getElementById('archive-section');
  if (!grid) return;
  
  grid.innerHTML = ''; 
  if (archGrid) archGrid.innerHTML = ''; 
  let hasArch = false;
  
  // Déterminer le niveau de hiérarchie du client
  const hierarchyLevel = typeof getClientHierarchyLevel === 'function' ? getClientHierarchyLevel() : 'micro';
  
  // Fonction helper pour créer un header d'accordion
  function createAccordionHeader(title, subtitle, level, id) {
    const div = document.createElement('div');
    const isMacro = level === 'macro';
    div.className = isMacro ? 'accordion-header-macro' : 'accordion-header-meso';
    div.innerHTML = `
      <div>
        <div class="accordion-title">${title}</div>
        ${subtitle ? `<div class="accordion-subtitle">${subtitle}</div>` : ''}
      </div>
      <span class="${isMacro ? 'accordion-icon-macro' : 'accordion-icon-meso'}">▼</span>
    `;
    div.onclick = () => {
      const content = div.nextElementSibling;
      const icon = div.querySelector('span:last-child');
      if (content.style.display === 'none') {
        content.style.display = 'flex';
        icon.style.transform = 'rotate(0deg)';
      } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
      }
    };
    return div;
  }
  
  // Fonction helper pour créer un conteneur d'accordion
  function createAccordionContainer() {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:.5rem;margin-left:1rem;margin-bottom:1rem;';
    return div;
  }
  
  // Utiliser la hiérarchie si disponible
  if (hierarchyLevel === 'macro' && typeof getVisibleMacros === 'function') {
    // Mode macro complet: afficher macrocycles → mésocycles → microcycles
    const macros = getVisibleMacros().sort((a, b) => a.id - b.id); // Tri croissant
    
    macros.forEach((macro, macroIndex) => {
      const macroHeader = createAccordionHeader(macro.name || `MACRO ${macro.id}`, `Macrocycle ${macro.id}`, 'macro', macro.id);
      const mesosContainer = createAccordionContainer();
      mesosContainer.id = `macro-${macro.id}-content`;
      
      // Par défaut, ouvrir le premier macro, fermer les autres
      if (macroIndex !== 0) {
        mesosContainer.style.display = 'none';
        macroHeader.querySelector('span:last-child').style.transform = 'rotate(-90deg)';
      }
      
      const sortedMesos = (macro.mesos || []).filter(m => !m.hidden).sort((a, b) => a.id - b.id); // Tri croissant, filtre masqués
      
      sortedMesos.forEach((meso, mesoIndex) => {
        const mesoHeader = createAccordionHeader(meso.name || `MÉSO ${meso.id}`, `Mésocycle ${meso.id}`, 'meso', meso.id);
        mesoHeader.style.marginLeft = '0.5rem';
        const microsContainer = createAccordionContainer();
        microsContainer.id = `meso-${macro.id}-${meso.id}-content`;
        
        // Par défaut, ouvrir le premier meso de chaque macro
        if (mesoIndex !== 0) {
          microsContainer.style.display = 'none';
          mesoHeader.querySelector('span:last-child').style.transform = 'rotate(-90deg)';
        }
        
        const microsGrid = document.createElement('div');
        microsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;';
        
        const sortedMicros = (meso.micros || []).slice().sort((a, b) => a.id - b.id); // Tri croissant
        
        sortedMicros.forEach(micro => {
          const isArch = clientArchived.has(micro.id);
          // Clé unlock complète: macro-meso-micro
          const unlockKey = `${macro.id}-${meso.id}-${micro.id}`;
          const isUnlock = clientUnlocked.has(unlockKey);
          const active = getActiveSessions(micro);
          // Clé de log complète: macro-meso-micro-séance
          const logKeyPrefix = `${macro.id}-${meso.id}-${micro.id}`;
          const done = active.length > 0 && active.every(t => clientLogs[logKeyPrefix+'-'+t]);
          
          if (isArch) {
            hasArch = true;
            if (archGrid) archGrid.innerHTML += cycleCard(micro, done, isUnlock, true, macro.id, meso.id);
          } else if (isUnlock) {
            microsGrid.innerHTML += cycleCard(micro, done, isUnlock, false, macro.id, meso.id);
          } else {
            microsGrid.innerHTML += lockedCard(micro);
          }
        });
        
        microsContainer.appendChild(microsGrid);
        mesosContainer.appendChild(mesoHeader);
        mesosContainer.appendChild(microsContainer);
      });
      
      grid.appendChild(macroHeader);
      grid.appendChild(mesosContainer);
    });
  } else if (hierarchyLevel === 'meso' && typeof getVisibleMacros === 'function') {
    // Mode meso: afficher mésocycles → microcycles
    const macros = getVisibleMacros().sort((a, b) => a.id - b.id);
    
    macros.forEach(macro => {
      const sortedMesos = (macro.mesos || []).filter(m => !m.hidden).sort((a, b) => a.id - b.id);
      
      sortedMesos.forEach((meso, mesoIndex) => {
        const mesoHeader = createAccordionHeader(meso.name || `MÉSO ${meso.id}`, `Mésocycle ${meso.id}`, 'meso', meso.id);
        const microsContainer = createAccordionContainer();
        microsContainer.id = `meso-${macro.id}-${meso.id}-content`;
        
        if (mesoIndex !== 0) {
          microsContainer.style.display = 'none';
          mesoHeader.querySelector('.accordion-icon').style.transform = 'rotate(-90deg)';
        }
        
        const microsGrid = document.createElement('div');
        microsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;width:100%;';
        
        const sortedMicros = (meso.micros || []).slice().sort((a, b) => a.id - b.id);
        
        sortedMicros.forEach(micro => {
          const isArch = clientArchived.has(micro.id);
          // Clé unlock complète: macro-meso-micro
          const unlockKey = `${macro.id}-${meso.id}-${micro.id}`;
          const isUnlock = clientUnlocked.has(unlockKey);
          const active = getActiveSessions(micro);
          // Clé de log complète: macro-meso-micro-séance
          const logKeyPrefix = `${macro.id}-${meso.id}-${micro.id}`;
          const done = active.length > 0 && active.every(t => clientLogs[logKeyPrefix+'-'+t]);
          
          if (isArch) {
            hasArch = true;
            if (archGrid) archGrid.innerHTML += cycleCard(micro, done, isUnlock, true, macro.id, meso.id);
          } else if (isUnlock) {
            microsGrid.innerHTML += cycleCard(micro, done, isUnlock, false, macro.id, meso.id);
          } else {
            microsGrid.innerHTML += lockedCard(micro);
          }
        });
        
        microsContainer.appendChild(microsGrid);
        grid.appendChild(mesoHeader);
        grid.appendChild(microsContainer);
      });
    });
  } else {
    // Mode micro seul: affichage en grille avec tous les microcycles depuis la hiérarchie
    const microsGrid = document.createElement('div');
    microsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem;width:100%;';
    
    // Collecter tous les microcycles depuis la hiérarchie si disponible
    let allMicros = [];
    if (typeof getVisibleMacros === 'function') {
      const macros = getVisibleMacros();
      macros.forEach(macro => {
        (macro.mesos || []).filter(m => !m.hidden).forEach(meso => {
          allMicros = allMicros.concat(meso.micros || []);
        });
      });
    }
    // Fallback sur clientProgram si pas de hiérarchie ou vide
    if (allMicros.length === 0) {
      allMicros = clientProgram || [];
    }
    
    const sorted = allMicros.slice().sort((a,b) => a.id - b.id);
    sorted.forEach(c => {
      const isArch = clientArchived.has(c.id);
      // Clé unlock complète si macro/meso disponibles
      const unlockKey = c.macroId && c.mesoId ? `${c.macroId}-${c.mesoId}-${c.id}` : `${c.id}`;
      const isUnlock = clientUnlocked.has(unlockKey);
      const active = getActiveSessions(c);
      // Utiliser macroId et mesoId si disponibles, sinon juste micro.id
      const logKeyPrefix = c.macroId && c.mesoId ? `${c.macroId}-${c.mesoId}-${c.id}` : `${c.id}`;
      const done = active.length > 0 && active.every(t => clientLogs[logKeyPrefix+'-'+t]);
      if (isArch) { hasArch = true; if (archGrid) archGrid.innerHTML += cycleCard(c, done, isUnlock, true, c.macroId, c.mesoId); }
      else if (isUnlock) { microsGrid.innerHTML += cycleCard(c, done, isUnlock, false, c.macroId, c.mesoId); }
      else { microsGrid.innerHTML += lockedCard(c); }
    });
    
    grid.appendChild(microsGrid);
  }
  
  if (archSec) archSec.classList.toggle('hidden', !hasArch);
}

function cycleCard(c, done, isUnlock, isArch, macroId, mesoId) {
  const active = getActiveSessions(c);
  // Construire la clé de log complète si macro/meso sont fournis
  const logKeyPrefix = macroId && mesoId ? `${macroId}-${mesoId}-${c.id}` : `${c.id}`;
  const sessHTML = active.length === 0
    ? '<p style="font-size:.7rem;color:var(--muted);font-style:italic;grid-column:1/-1">Aucune séance configurée.</p>'
    : active.map(t => {
        const d = clientLogs[logKeyPrefix+'-'+t];
        // Passer macro/meso à handleSess pour validation complète
        const handleFn = macroId && mesoId ? `handleSess(${c.id},'${t}',${macroId},${mesoId})` : `handleSess(${c.id},'${t}')`;
        return `<button onclick="${handleFn}" class="cycle-sess-btn ${d?'done':'type-'+t.toLowerCase()}">${d?'✓':t}</button>`;
      }).join('');
  const badges = [];
  if (done) badges.push('<span class="cycle-badge-complete">COMPLET</span>');
  if (isArch) badges.push('<span class="cycle-badge-complete" style="background:var(--muted);color:#fff;">ARCHIVÉ</span>');
  return `<div class="cycle-card-client${isArch?'" style="opacity:.6;border-style:dashed':'"'}>
    ${badges.join('')}
    <div class="cycle-title-client">CYCLE ${c.id}</div>
    <div class="cycle-focus-client">${h(c.focus)}</div>
    <div class="cycle-sess-grid">${sessHTML}</div>
  </div>`;
}

function lockedCard(c) {
  return `<div class="cycle-card-client" style="background:#0a0f18;border-color:#111a28">
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(255,255,255,.012) 12px,rgba(255,255,255,.012) 24px);pointer-events:none;border-radius:1.25rem;"></div>
    <div class="cycle-badge-locked"><span>VERROUILLÉ</span></div>
    <div class="cycle-title-client" style="color:var(--muted)">CYCLE ${c.id}</div>
    <div class="cycle-focus-client" style="color:var(--border)">${h(c.focus)}</div>
    <div class="cycle-sess-grid" style="opacity:.5">
      ${['A','B','C','D'].map(()=>`<div style="height:2.75rem;border-radius:.75rem;background:var(--surface);border:1px solid var(--border)"></div>`).join('')}
    </div>
    <p style="font-size:.7rem;color:var(--muted);font-style:italic;margin-top:1rem">Contacte ton coach.</p>
  </div>`;
}

function toggleArchive() {
  archOpen = !archOpen;
  const ag = document.getElementById('archive-grid');
  ag.style.display = archOpen ? 'grid' : 'none';
  ag.classList.toggle('hidden', !archOpen);
  document.getElementById('archive-label').innerText = archOpen ? 'Masquer archives' : 'Afficher archives';
}

// ── SESSION DETAIL ────────────────────────────────────
function handleSess(cId, type, macroId, mesoId) {
  // Stocker le chemin complet pour validation
  currentSess = { cycle: cId, type, macroId, mesoId };
  // Clé de log avec chemin complet si disponible
  const logKey = macroId && mesoId ? `${macroId}-${mesoId}-${cId}-${type}` : `${cId}-${type}`;
  if (clientLogs[logKey]) openModal('modal-done');
  else openDetail();
}

function openDetail() {
  const { cycle, type, macroId, mesoId } = currentSess;
  const c = clientProgram.find(x => x.id === cycle); if (!c) return;
  // Clé de log avec chemin complet si disponible
  const logKey = macroId && mesoId ? `${macroId}-${mesoId}-${cycle}-${type}` : `${cycle}-${type}`;
  const log = clientLogs[logKey];
  const sp = getSessParams(c, type);
  const exs = getSessEx(c, type);
  const col = getSessColor(type);
  const isCircuit = sp.mode !== 'classic';

  document.getElementById('detail-bar').style.background = `linear-gradient(90deg,${col},${col}44)`;
  document.getElementById('detail-tag').innerText = 'CYCLE '+cycle+' • S-'+type;
  document.getElementById('detail-title').innerText = 'SÉANCE ' + type;
  document.getElementById('detail-focus').innerText = c.focus;
  document.getElementById('detail-mode-badge').innerHTML = isCircuit
    ? `<span class="badge" style="background:rgba(240,165,0,.15);color:var(--gold);border:1px solid rgba(240,165,0,.3)">⟳ CIRCUIT</span>`
    : `<span class="badge" style="background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.3)">≡ CLASSIQUE</span>`;

  let statsHTML = '';
  if (isCircuit) {
    statsHTML = `<div class="card" style="padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Repos</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900">${sp.rest||'-'}</div></div>
    <div style="background:var(--card);border:1px solid rgba(240,165,0,.25);border-radius:1.5rem;padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Tours</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;color:var(--gold)">${sp.tours||'3'}</div></div>`;
  } else {
    statsHTML = `<div class="card" style="padding:1.25rem;text-align:center;min-width:80px"><div style="font-size:.6rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.4rem">Exercices</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900">${exs.length}</div></div>`;
  }
  document.getElementById('detail-stats').innerHTML = statsHTML;

  let exHTML = '';
  if (isCircuit) {
    exHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1.25rem">`;
    exs.forEach((e, i) => { exHTML += exCard(e, i, type, col, true); });
    exHTML += `</div>`;
  } else {
    const groups = groupExercises(exs);
    groups.forEach((g, gi) => {
      if (g.type === 'superset') {
        exHTML += `<div class="superset-wrap"><div class="superset-label">⇄ SUPERSET</div><div style="display:grid;grid-template-columns:repeat(${g.items.length},1fr);gap:1rem">`;
        g.items.forEach(item => { exHTML += exCard(item.ex, item.idx, type, col, false); });
        exHTML += `</div></div>`;
      } else {
        exHTML += exCard(g.ex, g.idx, type, col, false);
      }
      // Récup entre exercices
      if (gi < groups.length - 1) {
        const lastEx = g.type === 'superset' ? g.items[g.items.length-1].ex : g.ex;
        if (lastEx.restEx) {
          exHTML += `<div style="display:flex;align-items:center;gap:1rem;padding:.5rem 0">
            <div style="flex:1;height:1px;background:var(--border)"></div>
            <span style="font-size:.65rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;text-transform:uppercase;flex-shrink:0">↓ ${h(lastEx.restEx)} de récup</span>
            <div style="flex:1;height:1px;background:var(--border)"></div>
          </div>`;
        }
      }
    });
  }
  document.getElementById('exercise-list').innerHTML = exHTML;

  if (log) { document.getElementById('rapport-form').classList.add('hidden'); document.getElementById('rapport-done').classList.remove('hidden'); }
  else {
    document.getElementById('rapport-form').classList.remove('hidden');
    document.getElementById('rapport-done').classList.add('hidden');
    document.getElementById('rpe-input').value = 5; document.getElementById('rpe-display').innerText = '5';
    document.getElementById('comment-input').value = '';
  }
  // Init workout data
  workoutData = {};
  document.getElementById('client-grid-view').classList.add('hidden');
  document.getElementById('client-detail-view').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exCard(e, i, type, col, isCircuit) {
  const dbEx = exerciseDb.find(x => x.name === e.name);
  const photo = e.photo || (dbEx ? dbEx.photo : '');
  const video = e.video || (dbEx ? dbEx.video : '');
  const setsCount = parseInt(e.sets) || 3;
  const exType = e.exType || 'musculaire';
  const isEnergetic = exType === 'energetique';
  const hasPerfData = workoutData[i];
  const perfBtnStyle = isEnergetic
    ? (hasPerfData ? 'background:rgba(59,130,246,.2);border-color:rgba(59,130,246,.4);color:#60a5fa' : 'background:var(--surface);border-color:var(--border);color:var(--muted)')
    : (hasPerfData ? 'background:rgba(240,165,0,.25);border-color:rgba(240,165,0,.5);color:var(--gold)' : 'background:var(--surface);border-color:var(--border);color:var(--muted)');
  const perfBtnLabel = isEnergetic ? (hasPerfData ? '⚡ RPE MODIF.' : '⚡ RPE') : (hasPerfData ? '📊 MODIF.' : '📊 PERF');
  const safeName = h(e.name).replace(/'/g,"\\'");
  const plannedReps = (e.reps || '').replace(/'/g,"\\'");
  const perfBtn = `<button id="perf-btn-${i}" onclick="openPerfModal(${i},'${safeName}',${setsCount},'${plannedReps}','${exType}')" style="display:flex;align-items:center;justify-content:center;gap:.4rem;${perfBtnStyle};border:1px solid;border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;cursor:pointer;transition:all .2s;width:100%">${perfBtnLabel}</button>`;

  const energeticBadge = isEnergetic ? `<span style="position:absolute;top:.75rem;right:.75rem;background:rgba(59,130,246,.25);border:1px solid rgba(59,130,246,.4);border-radius:.5rem;padding:.15rem .4rem;font-size:.55rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:#60a5fa;letter-spacing:.05em">⚡ ÉNERGIE</span>` : '';

  // Header gradient couleur dynamique
  const gradStyle = `background:linear-gradient(135deg,${col}cc,${col}88)`;

  const headerInner = photo
    ? `<img src="${h(photo)}" style="height:80px;width:auto;max-width:120px;object-fit:contain;flex-shrink:0;border-radius:.5rem;margin-left:1.5rem" onerror="this.style.display='none'">
       <div style="flex:1;padding-left:.75rem">
         ${e.superset?`<span style="position:absolute;top:.75rem;right:.75rem;font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900">⇄</span>`:energeticBadge}
         <h5 style="font-size:1rem;font-weight:900;font-style:italic;text-transform:uppercase;color:white;line-height:1.2">${h(e.name)}</h5>
       </div>`
    : `<span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white">${String(i+1).padStart(2,'0')}</span>
       ${e.superset?`<span style="position:absolute;top:.75rem;right:.75rem;font-size:.6rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:900">⇄</span>`:energeticBadge}
       <h5 style="font-size:1.1rem;font-weight:900;font-style:italic;text-transform:uppercase;color:white;line-height:1.2">${h(e.name)}</h5>`;

  if (!isCircuit) {
    return `<div class="ex-card">
      <div style="${gradStyle};padding:1.25rem;display:flex;align-items:center;position:relative;min-height:90px">
        ${!photo?'':`<span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white">${String(i+1).padStart(2,'0')}</span>`}
        ${headerInner}
      </div>
      <div style="padding:.875rem 1rem">
        ${isEnergetic
          ? `<div style="display:flex;gap:1rem;margin-bottom:.6rem;align-items:flex-end;flex-wrap:wrap">
              ${e.workTime?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Effort</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;color:#60a5fa;line-height:1">${h(e.workTime)}</div></div>`:''}
              ${e.restTime?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Récup</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;line-height:1">${h(e.restTime)}</div></div>`:''}
              ${e.sets?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Séries</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;line-height:1">${h(e.sets)}</div></div>`:''}
              ${e.reps?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Reps</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.5rem;font-weight:900;color:var(--gold);line-height:1">${h(e.reps)}</div></div>`:''}
            </div>`
          : `${(e.sets||e.reps)?`<div style="display:flex;gap:1.5rem;margin-bottom:.6rem;align-items:flex-end">
          ${e.sets?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Séries</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:900;line-height:1">${h(e.sets)}</div></div>`:''}
          ${e.reps?`<div><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.15rem">Répétitions</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.75rem;font-weight:900;color:var(--gold);line-height:1">${h(e.reps)}</div></div>`:''}
        </div>`:''}`}
        ${(e.restSet||e.rpeTarget)?`<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.6rem">
          ${e.restSet?`<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--muted);background:var(--surface);padding:.2rem .6rem;border-radius:.4rem;border:1px solid var(--border)">Récup: ${h(e.restSet)}</span>`:''}
          ${e.rpeTarget?`<span style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--gold);background:rgba(240,165,0,.1);padding:.2rem .6rem;border-radius:.4rem;border:1px solid rgba(240,165,0,.2)">RPE cible: ${h(e.rpeTarget)}</span>`:''}
        </div>`:''}
        ${e.tst?`<div style="font-size:.7rem;color:var(--muted);margin-bottom:.4rem">Tempo: ${h(e.tst)}</div>`:''}
        ${e.desc?`<p style="font-size:.75rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">${h(e.desc)}</p>`:''}
        <div style="display:flex;gap:.5rem;flex-direction:column">
          ${video?`<a href="${h(video)}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);text-decoration:none">▶ VOIR DÉMO</a>`:''}
          ${perfBtn}
        </div>
      </div>
    </div>`;
  }

  // Circuit mode
  return `<div class="ex-card">
    <div style="${gradStyle};padding:1.25rem;display:flex;align-items:center;position:relative;min-height:90px">
      ${!photo?'':`<span style="position:absolute;top:.75rem;left:.75rem;width:1.75rem;height:1.75rem;background:rgba(255,255,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;color:white">${String(i+1).padStart(2,'0')}</span>`}
      ${headerInner}
    </div>
    <div style="display:flex;gap:.5rem;padding:.875rem 1rem 0">
      ${e.tst?`<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.75rem;padding:.4rem;text-align:center"><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.2rem">Tempo</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900">${h(e.tst)}</div></div>`:''}
      ${e.reps?`<div style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:.75rem;padding:.4rem;text-align:center"><div style="font-size:.5rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;margin-bottom:.2rem">Volume</div><div style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;color:var(--gold)">${h(e.reps)}</div></div>`:''}
    </div>
    <div style="padding:.875rem 1rem">
      ${e.desc?`<p style="font-size:.75rem;color:var(--muted);line-height:1.6;margin-bottom:.75rem">${h(e.desc)}</p>`:''}
      <div style="display:flex;gap:.5rem;flex-direction:column">
        ${video?`<a href="${h(video)}" target="_blank" style="display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);border-radius:.875rem;padding:.6rem;font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold);text-decoration:none">▶ VOIR DÉMO</a>`:''}
        ${perfBtn}
      </div>
    </div>
  </div>`;
}

function closeDetail() {
  document.getElementById('client-detail-view').classList.add('hidden');
  document.getElementById('client-grid-view').classList.remove('hidden');
}
document.getElementById('rpe-input').addEventListener('input', e => { document.getElementById('rpe-display').innerText = e.target.value; });

let _rpe = 5, _comment = '';
function openConfirmModal() {
  _rpe = parseInt(document.getElementById('rpe-input').value) || 5;
  _comment = document.getElementById('comment-input').value || '';
  document.getElementById('confirm-rpe').innerText = _rpe;
  openModal('modal-confirm');
}
async function submitValidation() {
  closeModal('modal-confirm');
  const cid = currentUser.isCoach ? currentClient.id : currentUser.id;
  // Clé de log avec chemin complet: macro-meso-micro-séance
  const key = currentSess.macroId && currentSess.mesoId 
    ? `${currentSess.macroId}-${currentSess.mesoId}-${currentSess.cycle}-${currentSess.type}`
    : `${currentSess.cycle}-${currentSess.type}`;
  const btn = document.getElementById('btn-validate');
  btn.disabled = true; btn.innerText = 'ENVOI...';
  try {
    const tonnage = await saveWorkoutAndPR(cid, key);
    const logData = { id:key, cycle:currentSess.cycle, type:currentSess.type, rpe:_rpe, comment:_comment, timestamp:new Date().toISOString() };
    if (tonnage > 0) logData.tonnage = Math.round(tonnage);
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',cid,'logs',key), logData);
    btn.disabled = false; btn.innerText = "VALIDER L'EFFORT";
    openDetail();
  } catch(e) { console.error(e); btn.disabled = false; btn.innerText = 'ERREUR'; toast('Erreur réseau','e'); }
}

// Exports
window.saveClientProgram = saveClientProgram;
