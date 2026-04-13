// coach-planning.js - Onglet Planification avec drag & drop
// Gestion de la planification hiérarchique des cycles

// Initialiser l'onglet planification
function initPlanningTab() {
  renderPlanningView();
}

// Rendu principal de la vue planification
function renderPlanningView() {
  const container = document.getElementById('sub-planning');
  if (!container) return;
  
  const level = getClientHierarchyLevel();
  
  let html = `
    <div style="padding:1.5rem">
      <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem;color:var(--gold)">
        📅 PLANIFICATION
      </h3>
      <p style="font-size:0.8rem;color:var(--muted);margin-bottom:1.5rem">
        Glissez-déposez les cycles pour les réorganiser dans la hiérarchie
      </p>
  `;
  
  if (level === 'macro') {
    // Vue complète avec macros
    html += renderMacroPlanningView();
  } else if (level === 'meso') {
    // Vue méso + micro - affiche les mésos avec leurs micros, sans macros
    html += renderMesoMicroPlanningView();
  } else {
    // Vue simple avec seulement des micros
    html += renderSimpleMicroView();
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

// Obtenir le niveau de hiérarchie du client
function getClientHierarchyLevel() {
  if (!currentClient) return 'micro';
  return currentClient.hierarchyLevel || 'macro'; // Par défaut: vue complète
}

// Rendu de la vue planification avec macros
function renderMacroPlanningView() {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) {
    return `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p>Aucune hiérarchie définie.</p>
        <button onclick="addMacroCycle()" class="btn btn-primary" style="margin-top:1rem">
          + Créer un macrocycle
        </button>
      </div>
    `;
  }
  
  let html = `<div style="display:flex;flex-direction:column;gap:1rem">`;
  
  hierarchy.macros.forEach(macro => {
    html += `
      <div class="planning-macro" data-macro-id="${macro.id}" 
           style="border:2px solid var(--blue);border-radius:0.75rem;padding:1rem;background:rgba(59,130,246,0.05)">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--blue)">
            MACRO ${macro.id}
          </span>
          <span style="flex:1;font-style:italic;color:var(--text)">${macro.name || ''}</span>
          <span class="badge" style="background:rgba(59,130,246,0.2);color:var(--blue)">
            ${macro.mesos?.length || 0} mésos
          </span>
        </div>
        
        <div class="meso-drop-zone" data-target-macro="${macro.id}"
             style="min-height:50px;border:2px dashed rgba(139,92,246,0.3);border-radius:0.5rem;padding:0.5rem;background:rgba(139,92,246,0.02)">
          ${renderMesoPlanningList(macro)}
        </div>
        
        <button onclick="addMesoCycle(${macro.id})" class="btn btn-ghost btn-sm" style="margin-top:0.5rem;width:100%">
          + Ajouter un mésocycle
        </button>
      </div>
    `;
  });
  
  html += `
    <button onclick="addMacroCycle()" class="btn btn-primary" style="margin-top:1rem">
      + Créer un macrocycle
    </button>
  </div>`;
  
  return html;
}

// Rendu de la liste des mésocycles pour la planification
function renderMesoPlanningList(macro) {
  if (!macro.mesos || macro.mesos.length === 0) {
    return `<div style="text-align:center;color:var(--muted);font-size:0.8rem;padding:1rem">
      Déposez des mésocycles ici
    </div>`;
  }
  
  let html = `<div style="display:flex;flex-direction:column;gap:0.5rem">`;
  
  macro.mesos.forEach(meso => {
    html += `
      <div class="planning-meso" draggable="true" data-meso-id="${meso.id}" data-parent-macro="${macro.id}"
           style="border:1px solid rgba(139,92,246,0.5);border-radius:0.5rem;padding:0.75rem;background:rgba(139,92,246,0.08);cursor:grab;display:flex;align-items:center;gap:0.5rem">
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#a78bfa">MÉSO ${meso.id}</span>
        <span style="flex:1;font-size:0.85rem">${meso.name || ''}</span>
        <span class="badge" style="background:rgba(139,92,246,0.2);color:#a78bfa;font-size:0.6rem">
          ${meso.micros?.length || 0} micros
        </span>
      </div>
    `;
  });
  
  html += `</div>`;
  return html;
}

// Rendu de la vue simple avec seulement des microcycles
function renderSimpleMicroView() {
  const hierarchy = window.clientProgramHierarchy;
  let allMicros = [];
  
  // Collecter tous les micros
  if (hierarchy && hierarchy.macros) {
    hierarchy.macros.forEach(macro => {
      if (macro.mesos) {
        macro.mesos.forEach(meso => {
          if (meso.micros) {
            meso.micros.forEach(micro => {
              allMicros.push({...micro, mesoId: meso.id, macroId: macro.id});
            });
          }
        });
      }
    });
  }
  
  if (allMicros.length === 0) {
    return `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p>Aucun microcycle.</p>
        <button onclick="addMicroCycle(1,1)" class="btn btn-primary" style="margin-top:1rem">
          + Créer un microcycle
        </button>
      </div>
    `;
  }
  
  let html = `
    <div style="display:flex;flex-direction:column;gap:0.5rem">
      ${allMicros.map(micro => `
        <div class="planning-micro" draggable="true" data-micro-id="${micro.id}" data-meso-id="${micro.mesoId}" data-macro-id="${micro.macroId}"
             style="border:1px solid rgba(240,165,0,0.5);border-radius:0.5rem;padding:0.75rem;background:rgba(240,165,0,0.08);cursor:grab;display:flex;align-items:center;gap:0.5rem">
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:var(--gold)">μ${micro.id}</span>
          <span style="flex:1;font-size:0.85rem">${micro.focus || ''}</span>
          <span class="badge" style="background:rgba(240,165,0,0.2);color:var(--gold);font-size:0.6rem">
            ${(micro.sessions_active?.length || 0) + (micro.sessions ? Object.keys(micro.sessions).length : 0)} séances
          </span>
        </div>
      `).join('')}
    </div>
    <button onclick="addMicroCycle(1,1)" class="btn btn-ghost btn-sm" style="margin-top:1rem">
      + Ajouter un microcycle
    </button>
  `;
  
  return html;
}

// Vue méso + micro - affiche les mésos avec leurs micros (sans macros)
function renderMesoMicroPlanningView() {
  const macros = getAllMacros();
  const allMesos = [];
  
  macros.forEach(macro => {
    macro.mesos?.forEach(meso => {
      allMesos.push({ ...meso, macroId: macro.id, macroName: macro.name });
    });
  });
  
  if (allMesos.length === 0) {
    return `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p>Aucun mésocycle.</p>
        <button onclick="ensureDefaultHierarchy()" class="btn btn-primary" style="margin-top:1rem">
          + Créer un premier mésocycle
        </button>
      </div>
    `;
  }
  
  return `
    <div style="display:flex;flex-direction:column;gap:1rem">
      ${allMesos.map(meso => `
        <div class="planning-meso" draggable="true" data-meso-id="${meso.id}" data-macro-id="${meso.macroId}"
             style="border:1px solid rgba(139,92,246,0.5);border-radius:0.5rem;padding:1rem;background:rgba(139,92,246,0.08);cursor:grab">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem">
            <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;color:var(--purple)">Σ${meso.id}</span>
            <span style="flex:1;font-weight:700">${meso.name || `MesoCycle ${meso.id}`}</span>
            <span style="font-size:0.75rem;color:var(--muted)">${meso.macroName || ''}</span>
          </div>
          
          <div class="meso-drop-zone" data-target-meso="${meso.id}" data-target-macro="${meso.macroId}"
               style="border:2px dashed rgba(139,92,246,0.3);border-radius:0.5rem;padding:0.75rem;min-height:60px;background:rgba(139,92,246,0.02)">
            ${meso.micros?.length > 0 ? meso.micros.map(micro => `
              <div class="planning-micro" draggable="true" data-micro-id="${micro.id}" data-meso-id="${meso.id}" data-macro-id="${meso.macroId}"
                   style="border:1px solid rgba(240,165,0,0.5);border-radius:0.5rem;padding:0.5rem;margin-bottom:0.5rem;background:rgba(240,165,0,0.08);cursor:grab;display:flex;align-items:center;gap:0.5rem">
                <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:var(--gold)">μ${micro.id}</span>
                <span style="flex:1;font-size:0.85rem">${micro.focus || ''}</span>
              </div>
            `).join('') : '<p style="color:var(--muted);font-size:0.75rem;text-align:center">Glissez un microcycle ici</p>'}
          </div>
          
          <button onclick="addMicroCycle(${meso.macroId}, ${meso.id})" class="btn btn-ghost btn-sm" style="margin-top:0.5rem;font-size:0.7rem">
            + Ajouter un microcycle
          </button>
        </div>
      `).join('')}
    </div>
    <button onclick="addMesoCycle(1)" class="btn btn-primary" style="margin-top:1rem">
      + Ajouter un mésocycle
    </button>
  `;
}

// Déplacer un mésocycle vers un autre macrocycle
function moveMesoToMacro(mesoId, sourceMacroId, targetMacroId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  // Trouver le mésocycle à déplacer
  const sourceMacro = hierarchy.macros.find(m => m.id === sourceMacroId);
  if (!sourceMacro || !sourceMacro.mesos) return;
  
  const mesoIndex = sourceMacro.mesos.findIndex(m => m.id === mesoId);
  if (mesoIndex === -1) return;
  
  const meso = sourceMacro.mesos[mesoIndex];
  
  // Trouver le macro cible
  const targetMacro = hierarchy.macros.find(m => m.id === targetMacroId);
  if (!targetMacro) return;
  
  // Retirer du source
  sourceMacro.mesos.splice(mesoIndex, 1);
  
  // Ajouter au target
  if (!targetMacro.mesos) targetMacro.mesos = [];
  targetMacro.mesos.push(meso);
  
  // Renommer tous les mésocycles dans l'ordre
  targetMacro.mesos.forEach((m, index) => {
    m.id = index + 1;
    m.name = `MesoCycle ${m.id}`;
  });
  
  // Sauvegarder
  saveHierarchy();
  
  // Rafraîchir l'affichage immédiatement
  renderHierarchy();
  
  toast('Mésocycle déplacé et renommé !', 's');
}

// Déplacer un microcycle vers un autre mésocycle
function moveMicroToMeso(microId, sourceMesoId, targetMesoId, targetMacroId) {
  if (sourceMesoId === targetMesoId) return; // Same meso, nothing to do
  
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  // Find source macro and meso
  let sourceMacro, sourceMeso, micro;
  for (const macro of hierarchy.macros) {
    const meso = macro.mesos?.find(m => m.id === sourceMesoId);
    if (meso) {
      const foundMicro = meso.micros?.find(m => m.id === microId);
      if (foundMicro) {
        sourceMacro = macro;
        sourceMeso = meso;
        micro = foundMicro;
        break;
      }
    }
  }
  
  if (!micro) {
    toast('Microcycle introuvable', 'e');
    return;
  }
  
  // Find target meso
  let targetMacro, targetMeso;
  for (const macro of hierarchy.macros) {
    const meso = macro.mesos?.find(m => m.id === targetMesoId);
    if (meso) {
      targetMacro = macro;
      targetMeso = meso;
      break;
    }
  }
  
  if (!targetMeso) {
    toast('Mésocycle cible introuvable', 'e');
    return;
  }
  
  // Remove micro from source
  sourceMeso.micros = sourceMeso.micros.filter(m => m.id !== microId);
  
  // Add to target
  if (!targetMeso.micros) targetMeso.micros = [];
  
  // Generate new micro ID in target meso
  const existingIds = targetMeso.micros.map(m => m.id);
  const newMicroId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
  
  const movedMicro = { ...micro, id: newMicroId };
  targetMeso.micros.push(movedMicro);
  
  // Sauvegarder
  saveHierarchy();
  syncClientProgram();
  
  // Rafraîchir l'affichage immédiatement
  renderHierarchy();
  
  toast(`Microcycle déplacé vers Σ${targetMesoId} !`, 's');
}

// Sauvegarder la hiérarchie
async function saveHierarchy() {
  if (!window.currentClient || !window.clientProgramHierarchy) return;
  
  try {
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', window.APP_ID, 'clients', window.currentClient.id, 'data', 'hierarchy'),
      { macros: window.clientProgramHierarchy.macros }
    );
    console.log('Hiérarchie sauvegardée dans Firebase');
  } catch (e) {
    console.error('Erreur sauvegarde hiérarchie:', e);
    toast('Erreur lors de la sauvegarde', 'e');
  }
}

// Exporter les fonctions
if (typeof window !== 'undefined') {
  window.initPlanningTab = initPlanningTab;
  window.renderPlanningView = renderPlanningView;
  window.getClientHierarchyLevel = getClientHierarchyLevel;
  window.moveMesoToMacro = moveMesoToMacro;
  window.saveHierarchy = saveHierarchy;
}
