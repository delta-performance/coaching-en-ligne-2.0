// ========================================================================
// COACH-CYCLES-HIERARCHY.JS - Gestion hiérarchique des cycles
// Macrocycles → Mésocycles → Microcycles → Séances
// ========================================================================

// Variables globales pour la hiérarchie
window._hierarchy = {
  currentMacro: null,
  currentMeso: null,
  currentMicro: null,
  expandedMacros: new Set(),
  expandedMesos: new Set(),
  selectedMacros: new Set(),
  selectedMesos: new Set(),
  selectedMicros: new Set()
};

// Helper pour détecter le mode clair
function isLightMode() {
  // Si dark-forced est présent, on est forcément en mode sombre
  if (document.documentElement.classList.contains('dark-forced')) {
    return false;
  }
  // Sinon, vérifier light-mode ou la préférence système
  return document.documentElement.classList.contains('light-mode') || 
         (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
}

// Structure de données pour la hiérarchie
// clientProgramHierarchy = {
//   macros: [
//     {
//       id: 1,
//       name: "MacroCycle 1",
//       focus: "Préparation physique",
//       archived: false,
//       mesos: [
//         {
//           id: 1,
//           name: "MesoCycle 1",
//           focus: "Hypertrophie",
//           archived: false,
//           micros: [
//             { id: 1, focus: "Force", sessions: {...}, sessions_active: [...] },
//             { id: 2, focus: "Endurance", sessions: {...}, sessions_active: [...] }
//           ]
//         }
//       ]
//     }
//   ]
// }

// ========================================================================
// INITIALISATION ET MIGRATION
// ========================================================================

function initHierarchy() {
  // Vérifier si la hiérarchie existe déjà
  if (!window.clientProgramHierarchy) {
    // Migrer les données existantes vers la nouvelle structure
    migrateToHierarchy();
  }
}

function migrateToHierarchy() {
  console.log('migrateToHierarchy called with', window.clientProgram?.length, 'cycles');
  
  if (!window.clientProgram || window.clientProgram.length === 0) {
    console.log('Pas de cycles à migrer');
    return;
  }
  
  // Créer un macrocycle par défaut contenant tous les microcycles existants
  const defaultMacro = {
    id: 1,
    name: "MacroCycle 1",
    focus: "Programme principal",
    archived: false,
    mesos: [{
      id: 1,
      name: "MesoCycle 1",
      focus: "Général",
      archived: false,
      micros: window.clientProgram.map(c => {
        console.log('Migration du cycle:', c.id, c.focus);
        return {
          id: c.id,
          focus: c.focus || `Cycle ${c.id}`,
          sessions: c.sessions || {},
          sessions_active: c.sessions_active || [],
          archived: window.clientArchived && window.clientArchived.has ? window.clientArchived.has(c.id) : false
        };
      })
    }]
  };
  
  window.clientProgramHierarchy = {
    macros: [defaultMacro]
  };
  
  console.log('Hiérarchie créée avec', defaultMacro.mesos[0].micros.length, 'microcycles');
}

async function saveHierarchy() {
  if (!window.currentClient) return;
  try {
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', window.APP_ID, 'clients', window.currentClient.id, 'data', 'hierarchy'),
      { macros: window.clientProgramHierarchy.macros }
    );
  } catch (e) {
    console.error('Erreur sauvegarde hiérarchie:', e);
    toast('Erreur sauvegarde hiérarchie', 'e');
  }
}

async function loadHierarchy() {
  if (!window.currentClient) return;
  try {
    const doc = await window.fdb.getDoc(
      window.fdb.doc(window.db, 'apps', window.APP_ID, 'clients', window.currentClient.id, 'data', 'hierarchy')
    );
    if (doc.exists && doc.data().macros && doc.data().macros.length > 0) {
      window.clientProgramHierarchy = { macros: doc.data().macros };
    } else {
      // Migrer depuis l'ancienne structure si pas de hiérarchie
      migrateToHierarchy();
    }
  } catch (e) {
    console.error('Erreur chargement hiérarchie:', e);
    // Ne pas écraser avec vide - garder ce qui existe ou migrer
    if (!window.clientProgramHierarchy || !window.clientProgramHierarchy.macros?.length) {
      migrateToHierarchy();
    }
  }
}

// Créer une hiérarchie par défaut si elle n'existe pas
async function ensureDefaultHierarchy() {
  if (!window.clientProgramHierarchy) {
    window.clientProgramHierarchy = { macros: [] };
  }
  
  // Si pas de macros, créer un macro/meso/micro par défaut
  if (!window.clientProgramHierarchy.macros || window.clientProgramHierarchy.macros.length === 0) {
    const defaultMacro = {
      id: 1,
      name: "MacroCycle 1",
      focus: "",
      archived: false,
      mesos: [{
        id: 1,
        name: "MesoCycle 1",
        focus: "",
        archived: false,
        micros: [{
          id: 1,
          focus: "Cycle 1",
          sessions: {},
          sessions_active: [],
          archived: false
        }]
      }]
    };
    window.clientProgramHierarchy.macros = [defaultMacro];
    await saveHierarchy();
    syncClientProgram();
  }
  renderHierarchy();
  if (typeof renderPlanningView === 'function') renderPlanningView();
}

// Helper pour vue micro-only : crée auto le macro/meso si nécessaire puis ajoute un micro
async function addMicroWithAutoParents() {
  if (!window.clientProgramHierarchy) {
    window.clientProgramHierarchy = { macros: [] };
  }
  
  let macro = getAllMacros()[0];
  
  // Si pas de macro, en créer un
  if (!macro) {
    macro = {
      id: 1,
      name: "MacroCycle 1",
      focus: "",
      archived: false,
      mesos: []
    };
    window.clientProgramHierarchy.macros.push(macro);
  }
  
  // Si pas de meso dans le macro, en créer un
  if (!macro.mesos || macro.mesos.length === 0) {
    const newMeso = {
      id: 1,
      name: "MesoCycle 1", 
      focus: "",
      archived: false,
      micros: []
    };
    macro.mesos = [newMeso];
  }
  
  await saveHierarchy();
  
  // Maintenant ajouter le micro
  await addMicroCycle(macro.id, macro.mesos[0].id);
  
  // Rafraîchir la vue planification si active
  if (typeof renderPlanningView === 'function') renderPlanningView();
}

// Fonction pour migrer après chargement des données client
async function migrateAfterDataLoad() {
  console.log('migrateAfterDataLoad called, clientProgram length:', window.clientProgram?.length);
  
  // Si hiérarchie existe déjà en mémoire (chargée depuis programme de base)
  if (window.clientProgramHierarchy?.macros?.length > 0) {
    console.log('Hierarchy already loaded from base program:', window.clientProgramHierarchy.macros.length, 'macros');
    return; // Ne rien faire, la hiérarchie est déjà là
  }
  
  // Si clientProgram a des données
  if (window.clientProgram && window.clientProgram.length > 0) {
    console.log('Cycles trouvés:', window.clientProgram.length);
    console.log('Cycles IDs:', window.clientProgram.map(c => c.id));
    
    // Vérifier si hiérarchie existe et a des macros
    let hasHierarchy = false;
    try {
      const doc = await window.fdb.getDoc(
        window.fdb.doc(window.db, 'apps', window.APP_ID, 'clients', window.currentClient.id, 'data', 'hierarchy')
      );
      if (doc.exists && doc.data().macros && doc.data().macros.length > 0) {
        // Vérifier si les macros ont des mésocycles avec des microcycles
        const macros = doc.data().macros;
        const totalMicros = macros.reduce((sum, m) => {
          return sum + (m.mesos || []).reduce((s, me) => s + (me.micros || []).length, 0);
        }, 0);
        console.log('Hiérarchie existe avec', totalMicros, 'microcycles');
        if (totalMicros > 0) {
          hasHierarchy = true;
          window.clientProgramHierarchy = { macros: macros };
        }
      }
    } catch (e) {
      console.error('Erreur vérification hiérarchie:', e);
    }
    
    // Si pas de hiérarchie ou hiérarchie vide, migrer
    if (!hasHierarchy) {
      console.log('Migration nécessaire - création de la hiérarchie depuis', window.clientProgram.length, 'cycles');
      migrateToHierarchy();
      
      // Sauvegarder la hiérarchie
      await saveHierarchy();
      
      // Re-rendre l'interface si on est sur l'onglet cycles
      if (typeof renderHierarchy === 'function') {
        renderHierarchy();
      }
      
      toast(`${window.clientProgram.length} cycles migrés vers la hiérarchie !`, 's');
    }
  } else {
    console.log('Pas de cycles dans clientProgram');
  }
}

// ========================================================================
// FONCTIONS UTILITAIRES
// ========================================================================

function getAllMacros() {
  return window.clientProgramHierarchy?.macros || [];
}

function getMacroById(macroId) {
  return getAllMacros().find(m => m.id === macroId);
}

function getMesoById(macroId, mesoId) {
  const macro = getMacroById(macroId);
  return macro?.mesos?.find(m => m.id === mesoId);
}

function getMicroById(macroId, mesoId, microId) {
  const meso = getMesoById(macroId, mesoId);
  return meso?.micros?.find(m => m.id === microId);
}

function getNextMacroId() {
  const macros = getAllMacros();
  return macros.length > 0 ? Math.max(...macros.map(m => m.id)) + 1 : 1;
}

function getNextMesoId(macroId) {
  const macro = getMacroById(macroId);
  const mesos = macro?.mesos || [];
  return mesos.length > 0 ? Math.max(...mesos.map(m => m.id)) + 1 : 1;
}

function getNextMicroId(macroId, mesoId) {
  const meso = getMesoById(macroId, mesoId);
  const micros = meso?.micros || [];
  return micros.length > 0 ? Math.max(...micros.map(m => m.id)) + 1 : 1;
}

// Récupérer tous les microcycles actifs (compatibilité avec l'ancien code)
function getAllMicros() {
  const allMicros = [];
  getAllMacros().forEach(macro => {
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
  return allMicros;
}

// Récupérer les macrocycles visibles pour le client (non masqués)
function getVisibleMacros() {
  return getAllMacros().filter(m => !m.hidden);
}

// Récupérer les microcycles visibles pour le client (dont le macro et méso ne sont pas masqués)
function getVisibleMicros() {
  const visibleMicros = [];
  getAllMacros().forEach(macro => {
    if (macro.hidden) return; // Skip hidden macros
    macro.mesos?.forEach(meso => {
      if (meso.hidden) return; // Skip hidden mesos
      meso.micros?.forEach(micro => {
        visibleMicros.push({
          ...micro,
          macroId: macro.id,
          mesoId: meso.id
        });
      });
    });
  });
  return visibleMicros;
}

// Mettre à jour clientProgram pour compatibilité avec l'ancien code
function syncClientProgram() {
  const visibleMicros = typeof getVisibleMicros === 'function' ? getVisibleMicros() : getAllMicros();
  window.clientProgram = visibleMicros.filter(m => !m.archived);
  window.clientArchived = new Set(getAllMicros().filter(m => m.archived).map(m => m.id));
}

// ========================================================================
// GESTION DES MACROCYCLES
// ========================================================================

async function addMacroCycle(name = '', focus = '') {
  const newMacro = {
    id: getNextMacroId(),
    name: name || `MacroCycle ${getNextMacroId()}`,
    focus: focus || '',
    archived: false,
    mesos: []
  };
  
  if (!window.clientProgramHierarchy) {
    window.clientProgramHierarchy = { macros: [] };
  }
  window.clientProgramHierarchy.macros.push(newMacro);
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  if (typeof renderPlanningView === 'function') renderPlanningView();
  
  toast(`Macrocycle ${newMacro.name} créé !`, 's');
  return newMacro.id;
}

// Fonction pour ajouter un cycle au niveau le plus haut selon la hiérarchie
async function addTopLevelCycle() {
  const hierarchyLevel = getClientHierarchyLevel();
  
  if (hierarchyLevel === 'micro') {
    // Mode micro seul: ajouter un microcycle au premier meso du premier macro
    const macros = getAllMacros();
    if (macros.length === 0) {
      // Créer un macro et meso par défaut si aucun n'existe
      const macroId = await addMacroCycle();
      const macro = getMacroById(macroId);
      const mesoId = await addMesoCycle(macroId);
      await addMicroCycle(macroId, mesoId);
    } else {
      const macro = macros[0];
      if (!macro.mesos || macro.mesos.length === 0) {
        const mesoId = await addMesoCycle(macro.id);
        await addMicroCycle(macro.id, mesoId);
      } else {
        await addMicroCycle(macro.id, macro.mesos[0].id);
      }
    }
  } else if (hierarchyLevel === 'meso') {
    // Mode meso+micro: ajouter un mésocycle au premier macro
    const macros = getAllMacros();
    if (macros.length === 0) {
      const macroId = await addMacroCycle();
      await addMesoCycle(macroId);
    } else {
      await addMesoCycle(macros[0].id);
    }
  } else {
    // Mode macro+meso+micro: ajouter un macrocycle
    await addMacroCycle();
  }
}

// Mettre à jour le bouton d'ajout selon la hiérarchie
function updateAddTopCycleButton() {
  const btn = document.getElementById('btn-add-top-cycle');
  if (!btn) return;
  
  const hierarchyLevel = getClientHierarchyLevel();
  
  if (hierarchyLevel === 'micro') {
    btn.textContent = '+ MICROCYCLE';
  } else if (hierarchyLevel === 'meso') {
    btn.textContent = '+ MÉSOCYCLE';
  } else {
    btn.textContent = '+ MACROCYCLE';
  }
}

async function renameMacroCycle(macroId, newName) {
  const macro = getMacroById(macroId);
  if (!macro) return;
  macro.name = newName;
  await saveHierarchy();
  renderHierarchy();
  toast('Macrocycle renommé', 's');
}

async function setMacroFocus(macroId, focus) {
  const macro = getMacroById(macroId);
  if (!macro) return;
  macro.focus = focus;
  await saveHierarchy();
  renderHierarchy();
}

async function toggleArchiveMacro(macroId) {
  const macro = getMacroById(macroId);
  if (!macro) return;
  macro.archived = !macro.archived;
  
  // Archiver/désarchiver tous les mésocycles et microcycles
  macro.mesos?.forEach(meso => {
    meso.archived = macro.archived;
    meso.micros?.forEach(micro => {
      micro.archived = macro.archived;
    });
  });
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast(macro.archived ? 'Macrocycle archivé' : 'Macrocycle désarchivé', 'w');
}

async function deleteMacroCycle(macroId) {
  const btn = document.getElementById(`del-macro-${macroId}`);
  if (!btn) return;
  
  const confirmCount = parseInt(btn.dataset.c || '0');
  if (confirmCount === 0) {
    btn.dataset.c = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.textContent = 'Suppr.';
      btn.style.background = '';
    }, 3000);
    return;
  }
  
  const macros = window.clientProgramHierarchy?.macros || [];
  const idx = macros.findIndex(m => m.id === macroId);
  if (idx === -1) return;
  
  macros.splice(idx, 1);
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast('Macrocycle supprimé', 's');
}

async function duplicateMacroCycle(macroId) {
  const macro = getMacroById(macroId);
  if (!macro) return;
  
  const newMacroId = getNextMacroId();
  
  // Fonction helper pour nettoyer un microcycle (sans données de validation)
  const cleanMicro = (micro, newMicroId) => ({
    id: newMicroId,
    focus: micro.focus || '',
    sessions: micro.sessions ? JSON.parse(JSON.stringify(micro.sessions)) : {},
    sessions_active: micro.sessions_active ? [...micro.sessions_active] : [],
    archived: false
  });
  
  // Fonction helper pour nettoyer un mésocycle
  const cleanMeso = (meso, newMesoId, macroIdForMicros) => {
    const newMeso = {
      id: newMesoId,
      name: meso.name || '',
      focus: meso.focus || '',
      archived: false,
      micros: []
    };
    
    // Recalculer les IDs des microcycles séquentiellement
    let microIdCounter = 1;
    if (meso.micros) {
      meso.micros.forEach(micro => {
        newMeso.micros.push(cleanMicro(micro, microIdCounter++));
      });
    }
    
    return newMeso;
  };
  
  const newMacro = {
    id: newMacroId,
    name: `${macro.name} (copie)`,
    focus: macro.focus || '',
    archived: false,
    mesos: []
  };
  
  // Recalculer les IDs des mésocycles et microcycles
  let mesoIdCounter = 1;
  if (macro.mesos) {
    macro.mesos.forEach(meso => {
      newMacro.mesos.push(cleanMeso(meso, mesoIdCounter++, newMacroId));
    });
  }
  
  window.clientProgramHierarchy.macros.push(newMacro);
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast(`Macrocycle ${newMacro.name} dupliqué !`, 's');
}

// ========================================================================
// GESTION DES MÉSOCYCLES
// ========================================================================

async function addMesoCycle(macroId, name = '', focus = '') {
  // If no macro exists, create default structure first
  let macro = getMacroById(macroId);
  if (!macro) {
    if (!window.clientProgramHierarchy) {
      window.clientProgramHierarchy = { macros: [] };
    }
    // Create default macro
    macro = {
      id: macroId || 1,
      name: "MacroCycle 1",
      focus: "",
      archived: false,
      mesos: []
    };
    window.clientProgramHierarchy.macros.push(macro);
  }
  
  if (!macro.mesos) macro.mesos = [];
  
  const newMeso = {
    id: getNextMesoId(macro.id),
    name: name || `MesoCycle ${getNextMesoId(macro.id)}`,
    focus: focus || '',
    archived: false,
    micros: []
  };
  
  macro.mesos.push(newMeso);
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  _hierarchy.expandedMacros.add(macro.id);
  if (typeof renderPlanningView === 'function') renderPlanningView();
  
  toast(`Mésocycle ${newMeso.name} créé !`, 's');
  return newMeso.id;
}

async function renameMesoCycle(macroId, mesoId, newName) {
  const meso = getMesoById(macroId, mesoId);
  if (!meso) return;
  meso.name = newName;
  await saveHierarchy();
  renderHierarchy();
  toast('Mésocycle renommé', 's');
}

async function setMesoFocus(macroId, mesoId, focus) {
  const meso = getMesoById(macroId, mesoId);
  if (!meso) return;
  meso.focus = focus;
  await saveHierarchy();
  renderHierarchy();
}

async function toggleArchiveMeso(macroId, mesoId) {
  const meso = getMesoById(macroId, mesoId);
  if (!meso) return;
  meso.archived = !meso.archived;
  
  // Archiver/désarchiver tous les microcycles du méso
  meso.micros?.forEach(micro => {
    micro.archived = meso.archived;
  });
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast(meso.archived ? 'Mésocycle archivé' : 'Mésocycle désarchivé', 'w');
}

async function toggleHiddenMeso(macroId, mesoId) {
  const meso = getMesoById(macroId, mesoId);
  if (!meso) return;
  meso.hidden = !meso.hidden;
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast(meso.hidden ? 'Mésocycle masqué pour le client' : 'Mésocycle visible pour le client', 'w');
}

async function toggleHiddenMacro(macroId) {
  const macro = getMacroById(macroId);
  if (!macro) return;
  macro.hidden = !macro.hidden;
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast(macro.hidden ? 'Macrocycle masqué pour le client' : 'Macrocycle visible pour le client', 'w');
}

async function deleteMesoCycle(macroId, mesoId) {
  const btn = document.getElementById(`del-meso-${macroId}-${mesoId}`);
  if (!btn) return;
  
  const confirmCount = parseInt(btn.dataset.c || '0');
  if (confirmCount === 0) {
    btn.dataset.c = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.textContent = 'Suppr.';
      btn.style.background = '';
    }, 3000);
    return;
  }
  
  const macro = getMacroById(macroId);
  if (!macro || !macro.mesos) return;
  
  const idx = macro.mesos.findIndex(m => m.id === mesoId);
  if (idx === -1) return;
  
  macro.mesos.splice(idx, 1);
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast('Mésocycle supprimé', 's');
}

async function duplicateMesoCycle(macroId, mesoId) {
  const meso = getMesoById(macroId, mesoId);
  if (!meso) return;
  
  const macro = getMacroById(macroId);
  if (!macro) return;
  
  const newMesoId = getNextMesoId(macroId);
  
  // Fonction helper pour nettoyer un microcycle (sans données de validation)
  const cleanMicro = (micro, newMicroId) => ({
    id: newMicroId,
    focus: micro.focus || '',
    sessions: micro.sessions ? JSON.parse(JSON.stringify(micro.sessions)) : {},
    sessions_active: micro.sessions_active ? [...micro.sessions_active] : [],
    archived: false
  });
  
  const newMeso = {
    id: newMesoId,
    name: `${meso.name} (copie)`,
    focus: meso.focus || '',
    archived: false,
    micros: []
  };
  
  // Recalculer les IDs des microcycles séquentiellement
  let microIdCounter = 1;
  if (meso.micros) {
    meso.micros.forEach(micro => {
      newMeso.micros.push(cleanMicro(micro, microIdCounter++));
    });
  }
  
  if (!macro.mesos) macro.mesos = [];
  macro.mesos.push(newMeso);
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  _hierarchy.expandedMacros.add(macroId);
  
  toast(`Mésocycle ${newMeso.name} dupliqué !`, 's');
}

// ========================================================================
// GESTION DES MICROCYCLES (adaptation des fonctions existantes)
// ========================================================================

async function addMicroCycle(macroId, mesoId, focus = '') {
  // Ensure hierarchy exists
  if (!window.clientProgramHierarchy) {
    window.clientProgramHierarchy = { macros: [] };
  }
  
  // Find or create macro
  let macro = getMacroById(macroId);
  if (!macro) {
    macro = {
      id: macroId || 1,
      name: `MacroCycle ${macroId || 1}`,
      focus: '',
      archived: false,
      mesos: []
    };
    window.clientProgramHierarchy.macros.push(macro);
  }
  
  // Find or create meso
  let meso = getMesoById(macro.id, mesoId);
  if (!meso) {
    meso = {
      id: mesoId || 1,
      name: `MesoCycle ${mesoId || 1}`,
      focus: '',
      archived: false,
      micros: []
    };
    if (!macro.mesos) macro.mesos = [];
    macro.mesos.push(meso);
  }
  
  if (!meso.micros) meso.micros = [];
  
  const newMicro = {
    id: getNextMicroId(macro.id, meso.id),
    focus: focus || 'Nouveau cycle',
    sessions: {},
    sessions_active: [],
    archived: false
  };
  
  meso.micros.push(newMicro);
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  _hierarchy.expandedMesos.add(`${macro.id}-${meso.id}`);
  if (typeof renderPlanningView === 'function') renderPlanningView();
  
  toast(`Microcycle ${newMicro.focus} créé !`, 's');
  return newMicro.id;
}

async function renameMicroCycle(macroId, mesoId, microId, newFocus) {
  const micro = getMicroById(macroId, mesoId, microId);
  if (!micro) return;
  micro.focus = newFocus;
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  toast('Microcycle renommé', 's');
}

async function toggleArchiveMicro(macroId, mesoId, microId) {
  const micro = getMicroById(macroId, mesoId, microId);
  if (!micro) return;
  micro.archived = !micro.archived;
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  toast(micro.archived ? 'Microcycle archivé' : 'Microcycle désarchivé', 'w');
}

async function deleteMicroCycle(macroId, mesoId, microId) {
  const btn = document.getElementById(`del-micro-${macroId}-${mesoId}-${microId}`);
  if (!btn) return;
  
  const confirmCount = parseInt(btn.dataset.c || '0');
  if (confirmCount === 0) {
    btn.dataset.c = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.textContent = 'Suppr.';
      btn.style.background = '';
    }, 3000);
    return;
  }
  
  const meso = getMesoById(macroId, mesoId);
  if (!meso || !meso.micros) return;
  
  const idx = meso.micros.findIndex(m => m.id === microId);
  if (idx === -1) return;
  
  meso.micros.splice(idx, 1);
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  
  toast('Microcycle supprimé', 'e');
}

async function duplicateMicroCycle(macroId, mesoId, microId) {
  const micro = getMicroById(macroId, mesoId, microId);
  if (!micro) return;
  
  const meso = getMesoById(macroId, mesoId);
  if (!meso) return;
  
  // Nettoyer le microcycle - ne copier que les données structurelles
  const newMicro = {
    id: getNextMicroId(macroId, mesoId),
    focus: `${micro.focus} (copie)`,
    sessions: micro.sessions ? JSON.parse(JSON.stringify(micro.sessions)) : {},
    sessions_active: micro.sessions_active ? [...micro.sessions_active] : [],
    archived: false
  };
  
  if (!meso.micros) meso.micros = [];
  meso.micros.push(newMicro);
  
  await saveHierarchy();
  syncClientProgram();
  renderHierarchy();
  _hierarchy.expandedMacros.add(macroId);
  _hierarchy.expandedMesos.add(`${macroId}-${mesoId}`);
  
  toast(`Microcycle ${newMicro.focus} dupliqué !`, 's');
  return { macroId, mesoId, microId: newMicro.id };
}

// Fonction pour toggle unlock/verrouiller un microcycle
function toggleUnlockMicro(macroId, mesoId, microId) {
  if (!window.currentClient) return;
  
  const micro = getMicroById(macroId, mesoId, microId);
  if (!micro) return;
  
  // Utiliser le clientUnlocked global avec une clé composite
  const unlockKey = `${macroId}-${mesoId}-${microId}`;
  if (window.clientUnlocked.has(unlockKey)) {
    window.clientUnlocked.delete(unlockKey);
  } else {
    window.clientUnlocked.add(unlockKey);
  }
  
  // Sauvegarder et rafraîchir
  if (typeof saveClientUnlock === 'function') {
    saveClientUnlock(window.currentClient.id);
  }
  renderHierarchy();
  
  const isUnlocked = window.clientUnlocked.has(unlockKey);
  toast(isUnlocked ? 'Microcycle accessible au client' : 'Microcycle verrouillé', isUnlocked ? 's' : 'i');
}

// Vérifier si un microcycle est unlocked
function isMicroUnlocked(macroId, mesoId, microId) {
  const unlockKey = `${macroId}-${mesoId}-${microId}`;
  return window.clientUnlocked && window.clientUnlocked.has(unlockKey);
}

// ========================================================================
// SÉLECTION HIÉRARCHIQUE
// ========================================================================

function selectMacro(macroId) {
  _hierarchy.currentMacro = macroId;
  _hierarchy.currentMeso = null;
  _hierarchy.currentMicro = null;
  renderHierarchy();
  updateHierarchySelectors();
}

function selectMeso(macroId, mesoId) {
  _hierarchy.currentMacro = macroId;
  _hierarchy.currentMeso = mesoId;
  _hierarchy.currentMicro = null;
  renderHierarchy();
  updateHierarchySelectors();
}

function selectMicro(macroId, mesoId, microId) {
  _hierarchy.currentMacro = macroId;
  _hierarchy.currentMeso = mesoId;
  _hierarchy.currentMicro = microId;
  
  // Mettre à jour l'éditeur pour ce microcycle
  window._edSelectedCycle = microId;
  window._edSelectedSess = getMicroById(macroId, mesoId, microId)?.sessions_active?.[0] || 'A';
  
  renderHierarchy();
  updateHierarchySelectors();
  
  // Synchroniser l'éditeur
  if (typeof syncEditor === 'function') syncEditor();
  if (typeof renderVisu === 'function') renderVisu();
}

function toggleExpandMacro(macroId) {
  if (_hierarchy.expandedMacros.has(macroId)) {
    _hierarchy.expandedMacros.delete(macroId);
    // Collapser aussi tous les mésos de ce macro
    getMacroById(macroId)?.mesos?.forEach(meso => {
      _hierarchy.expandedMesos.delete(`${macroId}-${meso.id}`);
    });
  } else {
    _hierarchy.expandedMacros.add(macroId);
  }
  renderHierarchy();
}

function toggleExpandMeso(macroId, mesoId) {
  const key = `${macroId}-${mesoId}`;
  if (_hierarchy.expandedMesos.has(key)) {
    _hierarchy.expandedMesos.delete(key);
  } else {
    _hierarchy.expandedMesos.add(key);
  }
  renderHierarchy();
}

function updateHierarchySelectors() {
  // Mettre à jour les sélecteurs d'édition si présents
  const macroSelect = document.getElementById('ed-macro-select');
  const mesoSelect = document.getElementById('ed-meso-select');
  const microSelect = document.getElementById('ed-micro-select');
  
  if (macroSelect) macroSelect.value = _hierarchy.currentMacro || '';
  if (mesoSelect) mesoSelect.value = _hierarchy.currentMeso || '';
  if (microSelect) microSelect.value = _hierarchy.currentMicro || '';
}

// ========================================================================
// RENDU DE L'INTERFACE HIÉRARCHIQUE
// ========================================================================

// Obtenir le niveau de hiérarchie du client
function getClientHierarchyLevel() {
  if (!window.currentClient) return 'macro';
  
  // Si le client est en mode générique avec un programme de base assigné
  if (window.currentClient.programMode === 'generic' && window.currentClient.baseProgramId) {
    // Chercher le programme de base dans allBasePrograms
    const baseProgram = typeof allBasePrograms !== 'undefined' ? 
      allBasePrograms.find(bp => bp.id === window.currentClient.baseProgramId) : null;
    
    if (baseProgram && baseProgram.hierarchyLevel) {
      return baseProgram.hierarchyLevel;
    }
  }
  
  // Sinon utiliser la hiérarchie du profil client (mode personnalisé)
  return window.currentClient.hierarchyLevel || 'macro';
}

function renderHierarchy() {
  const container = document.getElementById('hierarchy-container');
  if (!container) return;
  
  // Mettre à jour le bouton d'ajout selon la hiérarchie
  updateAddTopCycleButton();
  
  const hierarchyLevel = getClientHierarchyLevel();
  const macros = getAllMacros();
  
  // S'assurer que la hiérarchie existe
  if (!macros || macros.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p style="margin-bottom:1rem">Aucun cycle créé.</p>
        <button onclick="ensureDefaultHierarchy()" class="btn btn-primary">+ Créer un premier cycle</button>
      </div>
    `;
    return;
  }
  
  // Mode micro only - afficher uniquement les microcycles en flat list
  if (hierarchyLevel === 'micro') {
    renderMicroOnlyView(container);
    return;
  }
  
  // Mode meso + micro - afficher uniquement les mésocycles
  if (hierarchyLevel === 'meso') {
    renderMesoOnlyView(container);
    return;
  }
  
  // Mode macro + meso + micro - affichage complet
  container.innerHTML = macros.map(macro => renderMacroItem(macro)).join('');
}

// Vue micro only - affiche uniquement les microcycles en liste plate
function renderMicroOnlyView(container) {
  const allMicros = getAllMicros();
  
  if (allMicros.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p style="margin-bottom:1rem">Aucun microcycle créé.</p>
        <button onclick="addMicroWithAutoParents()" class="btn btn-primary">+ Créer un microcycle</button>
      </div>
    `;
    return;
  }
  
  // Afficher tous les micros sans structure macro/meso
  container.innerHTML = allMicros.map(micro => renderMicroOnlyItem(micro)).join('');
}

// Rendu d'un microcycle en mode micro-only
function renderMicroOnlyItem(micro) {
  const lightMode = isLightMode();
  const isArchived = micro.archived;
  const isUnlocked = isMicroUnlocked(micro.macroId, micro.mesoId, micro.id);
  
  // Compter TOUTES les séances (sessions_active + sessions)
  const activeSessions = micro.sessions_active || [];
  const allSessionKeys = micro.sessions ? Object.keys(micro.sessions) : [];
  const allSessions = [...new Set([...activeSessions, ...allSessionKeys])];
  const sessionCount = allSessions.length;
  
  const bgColor = isArchived 
    ? (lightMode ? '#e5e7eb' : 'rgba(0,0,0,0)')
    : (lightMode ? '#fef3c7' : 'rgba(0,0,0,0)');
  const borderColor = isArchived 
    ? (lightMode ? '#d1d5db' : 'var(--border)')
    : (lightMode ? '#d08000' : '#f0a500');
  const textColor = isArchived 
    ? (lightMode ? '#6b7280' : 'var(--muted)')
    : (lightMode ? '#92400e' : 'var(--gold)');
  
  const archivedPattern = isArchived 
    ? 'background-image: repeating-linear-gradient(45deg, rgba(128,128,128,0.05) 0px, rgba(128,128,128,0.05) 10px, rgba(128,128,128,0.15) 10px, rgba(128,128,128,0.15) 20px);'
    : '';
  
  return `
    <div class="hierarchy-item ${isArchived ? 'archived' : ''}" style="margin-bottom:0.5rem">
      <div class="micro-header" 
           style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1rem;
                  background:${bgColor};
                  ${archivedPattern}
                  border:2px solid ${borderColor};
                  border-radius:0.75rem">
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;color:${textColor}">
          CYCLE ${micro.id}
        </span>
        
        <input type="text" value="${h(micro.focus || '')}" 
               placeholder="Focus..."
               onchange="renameMicroCycle(${micro.macroId}, ${micro.mesoId}, ${micro.id}, this.value)"
               style="flex:1;min-width:100px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.85rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        ${isUnlocked ? `<span class="badge" style="font-size:0.55rem;background:${lightMode ? '#d1fae5' : 'rgba(16,185,129,0.2)'};color:${lightMode ? '#065f46' : 'var(--green)'};border:1px solid ${lightMode ? '#10b981' : 'transparent'};padding:0.15rem 0.4rem">OUVERT</span>` : ''}
        
        <span class="badge" style="font-size:0.6rem;background:${lightMode ? '#e5e7eb' : 'var(--surface)'};color:${lightMode ? '#374151' : 'var(--muted)'};padding:0.2rem 0.5rem">
          ${sessionCount} séances
        </span>
        
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem;color:${isUnlocked ? (lightMode ? '#059669' : 'var(--green)') : (lightMode ? '#6b7280' : 'var(--muted)')};border-color:${isUnlocked ? (lightMode ? '#10b981' : 'rgba(16,185,129,0.3)') : (lightMode ? '#d1d5db' : 'var(--border)')}"
                onclick="event.stopPropagation();toggleUnlockMicro(${micro.macroId}, ${micro.mesoId}, ${micro.id})" 
                title="${isUnlocked ? 'Verrouiller' : 'Ouvrir'}">
          ${isUnlocked ? '🔓' : '🔒'}
        </button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();moveMicroUp(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Monter">⬆️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();moveMicroDown(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Descendre">⬇️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();duplicateMicroCycle(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();toggleArchiveMicro(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="del-micro-${micro.macroId}-${micro.mesoId}-${micro.id}" data-c="0" 
                style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();deleteMicroCycle(${micro.macroId}, ${micro.mesoId}, ${micro.id})">🗑️</button>
      </div>
    </div>
  `;
}

// Vue méso + micro - affiche les mésocycles sans les macros containers
function renderMesoOnlyView(container) {
  // Collecter tous les mésocycles de tous les macros
  const allMesos = [];
  getAllMacros().forEach(macro => {
    macro.mesos?.forEach(meso => {
      allMesos.push({...meso, macroId: macro.id});
    });
  });
  
  if (allMesos.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p style="margin-bottom:1rem">Aucun mésocycle créé.</p>
        <button onclick="ensureDefaultHierarchy()" class="btn btn-primary" style="margin-bottom:0.5rem">+ Créer un mésocycle</button>
      </div>
    `;
    return;
  }
  
  // Afficher les mésos directement sans structure macro
  container.innerHTML = allMesos.map(meso => renderMesoOnlyItem(meso)).join('');
}

// Rendu d'un mésocycle en mode meso-only
function renderMesoOnlyItem(meso) {
  const isExpanded = _hierarchy.expandedMesos?.has(`${meso.macroId}-${meso.id}`) || false;
  const isArchived = meso.archived;
  const lightMode = isLightMode();
  
  const bgColor = isArchived 
    ? (lightMode ? '#e5e7eb' : 'rgba(0,0,0,0)')
    : (lightMode ? '#ede9fe' : 'rgba(0,0,0,0)');
  const borderColor = isArchived 
    ? (lightMode ? '#d1d5db' : 'var(--border)')
    : (lightMode ? '#a78bfa' : '#a78bfa');
  const textColor = isArchived 
    ? (lightMode ? '#6b7280' : 'var(--muted)')
    : (lightMode ? '#5b21b6' : '#a78bfa');
  
  const archivedPattern = isArchived 
    ? 'background-image: repeating-linear-gradient(45deg, rgba(128,128,128,0.05) 0px, rgba(128,128,128,0.05) 10px, rgba(128,128,128,0.15) 10px, rgba(128,128,128,0.15) 20px);'
    : '';
  
  return `
    <div class="hierarchy-item ${isArchived ? 'archived' : ''}" style="margin-bottom:0.5rem">
      <div class="meso-header" 
           style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1rem;
                  background:${bgColor};
                  ${archivedPattern}
                  border:2px solid ${borderColor};
                  border-radius:0.75rem;cursor:pointer"
           onclick="toggleExpandMeso(${meso.macroId}, ${meso.id})">
        
        <span style="font-size:0.875rem;transition:transform 0.2s;transform:rotate(${isExpanded ? '90deg' : '0deg'})">▶</span>
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;color:${textColor}">
          MÉSO ${meso.id}
        </span>
        
        <input type="text" value="${h(meso.name || '')}" 
               onchange="renameMesoCycle(${meso.macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:100px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.85rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        <input type="text" value="${h(meso.focus || '')}" 
               placeholder="Focus..."
               onchange="setMesoFocus(${meso.macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:var(--muted);font-size:0.75rem;font-style:italic">
        
        <span class="badge" style="font-size:0.65rem;background:${isArchived ? 'var(--danger)' : (lightMode ? '#8b5cf6' : 'transparent')};color:${isArchived ? 'white' : (lightMode ? 'white' : '#a78bfa')};border:1px solid ${isArchived ? 'var(--danger)' : (lightMode ? '#7c3aed' : '#a78bfa')}">
          ${meso.micros?.length || 0} micros
        </span>
        
        ${isArchived ? '<span class="badge badge-archived" style="font-size:0.6rem">Archivé</span>' : ''}
        
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();moveMesoUp(${meso.macroId}, ${meso.id})" title="Monter">⬆️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();moveMesoDown(${meso.macroId}, ${meso.id})" title="Descendre">⬇️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();duplicateMesoCycle(${meso.macroId}, ${meso.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();toggleArchiveMeso(${meso.macroId}, ${meso.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="del-meso-${meso.macroId}-${meso.id}" data-c="0" 
                style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();deleteMesoCycle(${meso.macroId}, ${meso.id})">🗑️</button>
      </div>
      
      ${isExpanded ? renderMicroList(meso.macroId, meso) : ''}
    </div>
  `;
}

function renderMacroItem(macro) {
  const isExpanded = _hierarchy.expandedMacros.has(macro.id);
  const isSelected = _hierarchy.currentMacro === macro.id;
  const isArchived = macro.archived;
  const lightMode = isLightMode();
  
  // Couleurs adaptées au mode clair/sombre
  // Mode clair: fonds colorés pour contraste | Mode sombre: transparents comme avant
  const bgColor = isArchived 
    ? (lightMode ? '#e5e7eb' : 'rgba(0,0,0,0)')
    : (lightMode ? '#dbeafe' : 'rgba(0,0,0,0)');
  const borderColor = isSelected 
    ? (lightMode ? '#2563eb' : '#60a5fa') 
    : (isArchived ? (lightMode ? '#d1d5db' : 'var(--border)') : (lightMode ? '#93c5fd' : '#3b82f6'));
  const textColor = isArchived 
    ? (lightMode ? '#6b7280' : 'var(--muted)')
    : (lightMode ? '#1e40af' : '#60a5fa');
  
  // Style pour les éléments archivés - rayures grises diagonales
  const archivedPattern = isArchived 
    ? 'background-image: repeating-linear-gradient(45deg, rgba(128,128,128,0.05) 0px, rgba(128,128,128,0.05) 10px, rgba(128,128,128,0.15) 10px, rgba(128,128,128,0.15) 20px);'
    : '';
  
  return `
    <div class="hierarchy-item ${isArchived ? 'archived' : ''}" style="margin-bottom:0.5rem">
      <div class="macro-header ${isSelected ? 'selected' : ''}" 
           style="display:flex;align-items:center;gap:0.5rem;padding:0.75rem 1rem;
                  background:${bgColor};
                  ${archivedPattern}
                  border:2px solid ${borderColor};
                  border-radius:0.75rem;cursor:pointer"
           onclick="toggleExpandMacro(${macro.id})">
        
        <span style="font-size:1rem;transition:transform 0.2s;transform:rotate(${isExpanded ? '90deg' : '0deg'})">▶</span>
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1rem;color:${textColor}">
          MACRO ${macro.id}
        </span>
        
        <input type="text" value="${h(macro.name)}" 
               onchange="renameMacroCycle(${macro.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:100px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.9rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        <input type="text" value="${h(macro.focus)}" 
               placeholder="Focus..."
               onchange="setMacroFocus(${macro.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:var(--muted);font-size:0.8rem;font-style:italic">
        
        <span class="badge" style="font-size:0.65rem;background:${isArchived ? 'var(--danger)' : (lightMode ? '#3b82f6' : 'transparent')};color:${isArchived ? 'white' : (lightMode ? 'white' : '#60a5fa')};border:1px solid ${isArchived ? 'var(--danger)' : (lightMode ? '#2563eb' : '#3b82f6')}">
          ${macro.mesos?.length || 0} mésos
        </span>
        
        ${isArchived ? '<span class="badge badge-archived">Archivé</span>' : ''}
        ${macro.hidden ? '<span class="badge" style="background:var(--muted);color:white;font-size:0.6rem">Masqué client</span>' : ''}
        
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();toggleHiddenMacro(${macro.id})" title="Masquer/Afficher pour le client">
          ${macro.hidden ? '🙈' : '👁️'}
        </button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();moveMacroDown(${macro.id})" title="Descendre">⬇️</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();duplicateMacroCycle(${macro.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();toggleArchiveMacro(${macro.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="del-macro-${macro.id}" data-c="0" 
                onclick="event.stopPropagation();deleteMacroCycle(${macro.id})">🗑️</button>
      </div>
      
      ${isExpanded ? renderMesoList(macro) : ''}
    </div>
  `;
}

function renderMesoList(macro) {
  const mesos = macro.mesos || [];
  
  return `
    <div style="margin-left:1.5rem;margin-top:0.5rem">
      ${mesos.map(meso => renderMesoItem(macro.id, meso)).join('')}
      
      <button onclick="addMesoCycle(${macro.id})" class="btn btn-ghost btn-sm" 
              style="width:100%;margin-top:0.5rem;padding:0.75rem;text-align:left">
        + Ajouter un mésocycle
      </button>
    </div>
  `;
}

function renderMesoItem(macroId, meso) {
  const key = `${macroId}-${meso.id}`;
  const isExpanded = _hierarchy.expandedMesos.has(key);
  const isSelected = _hierarchy.currentMeso === meso.id && _hierarchy.currentMacro === macroId;
  const isArchived = meso.archived;
  const lightMode = isLightMode();
  
  // Couleurs adaptées au mode clair/sombre pour mésocycle (violet)
  // Mode clair: fonds colorés | Mode sombre: transparents comme avant
  const bgColor = isArchived 
    ? (lightMode ? '#e5e7eb' : 'rgba(0,0,0,0)')
    : (lightMode ? '#ede9fe' : 'rgba(0,0,0,0)');
  const borderColor = isSelected 
    ? (lightMode ? '#7c3aed' : '#c4b5fd')
    : (isArchived ? (lightMode ? '#d1d5db' : 'var(--border)') : (lightMode ? '#c4b5fd' : '#a78bfa'));
  const textColor = isArchived 
    ? (lightMode ? '#6b7280' : 'var(--muted)')
    : (lightMode ? '#5b21b6' : '#a78bfa');
  
  // Style pour les éléments archivés - rayures grises diagonales
  const archivedPattern = isArchived 
    ? 'background-image: repeating-linear-gradient(45deg, rgba(128,128,128,0.05) 0px, rgba(128,128,128,0.05) 10px, rgba(128,128,128,0.15) 10px, rgba(128,128,128,0.15) 20px);'
    : '';
  
  return `
    <div class="hierarchy-item ${isArchived ? 'archived' : ''}" style="margin-bottom:0.5rem">
      <div class="meso-header ${isSelected ? 'selected' : ''}" 
           style="display:flex;align-items:center;gap:0.5rem;padding:0.625rem 1rem;
                  background:${bgColor};
                  ${archivedPattern}
                  border:2px solid ${borderColor};
                  border-radius:0.625rem;cursor:pointer"
           onclick="toggleExpandMeso(${macroId}, ${meso.id})">
        
        <span style="font-size:0.875rem;transition:transform 0.2s;transform:rotate(${isExpanded ? '90deg' : '0deg'})">▶</span>
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;color:${textColor}">
          MÉSO ${meso.id}
        </span>
        
        <input type="text" value="${h(meso.name)}" 
               onchange="renameMesoCycle(${macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.85rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        <input type="text" value="${h(meso.focus)}" 
               placeholder="Focus..."
               onchange="setMesoFocus(${macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:var(--muted);font-size:0.75rem;font-style:italic">
        
        <span class="badge" style="font-size:0.6rem;background:${isArchived ? 'var(--danger)' : (lightMode ? '#8b5cf6' : 'transparent')};color:${isArchived ? 'white' : (lightMode ? 'white' : '#a78bfa')};border:1px solid ${isArchived ? 'var(--danger)' : (lightMode ? '#7c3aed' : '#a78bfa')}">
          ${meso.micros?.length || 0} micros
        </span>
        
        ${isArchived ? '<span class="badge badge-archived" style="font-size:0.6rem">Archivé</span>' : ''}
        ${meso.hidden ? '<span class="badge" style="background:var(--muted);color:white;font-size:0.6rem">Masqué client</span>' : ''}
        
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();toggleHiddenMeso(${macroId}, ${meso.id})" title="Masquer/Afficher pour le client">
          ${meso.hidden ? '🙈' : '👁️'}
        </button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();moveMesoUp(${macroId}, ${meso.id})" title="Monter">⬆️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();moveMesoDown(${macroId}, ${meso.id})" title="Descendre">⬇️</button>
        ${getClientHierarchyLevel() === 'macro' ? `<button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();showMoveMesoModal(${macroId}, ${meso.id})" title="Déplacer vers un autre macrocycle">↗️</button>` : ''}
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();duplicateMesoCycle(${macroId}, ${meso.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();toggleArchiveMeso(${macroId}, ${meso.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="del-meso-${macroId}-${meso.id}" data-c="0" 
                style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();deleteMesoCycle(${macroId}, ${meso.id})">🗑️</button>
      </div>
      
      ${isExpanded ? renderMicroList(macroId, meso) : ''}
    </div>
  `;
}

function renderMicroList(macroId, meso) {
  const micros = meso.micros || [];
  
  return `
    <div style="margin-left:1.5rem;margin-top:0.5rem">
      ${micros.map(micro => renderMicroItem(macroId, meso.id, micro)).join('')}
      
      <button onclick="addMicroCycle(${macroId}, ${meso.id})" class="btn btn-ghost btn-sm" 
              style="width:100%;margin-top:0.5rem;padding:0.625rem;text-align:left;font-size:0.8rem">
        + Ajouter un microcycle
      </button>
    </div>
  `;
}

function renderMicroItem(macroId, mesoId, micro) {
  const isSelected = _hierarchy.currentMicro === micro.id && 
                     _hierarchy.currentMeso === mesoId && 
                     _hierarchy.currentMacro === macroId;
  const isUnlocked = isMicroUnlocked(macroId, mesoId, micro.id);
  const lightMode = isLightMode();
  
  // Compter TOUTES les séances (sessions_active + sessions)
  const activeSessions = micro.sessions_active || [];
  const allSessionKeys = micro.sessions ? Object.keys(micro.sessions) : [];
  const allSessions = [...new Set([...activeSessions, ...allSessionKeys])];
  const sessionCount = allSessions.length;
  
  // Couleurs adaptées au mode clair/sombre
  // Mode clair: fonds colorés | Mode sombre: transparents comme avant
  const bgColor = isSelected 
    ? (lightMode ? '#fef3c7' : 'rgba(0,0,0,0)')
    : (lightMode ? '#f3f4f6' : 'rgba(0,0,0,0)');
  const borderColor = isSelected 
    ? (lightMode ? '#d08000' : '#f0a500')
    : (isUnlocked ? (lightMode ? '#10b981' : '#34d399') : (lightMode ? '#d1d5db' : 'rgba(255,255,255,0.6)'));
  const textColor = isSelected 
    ? (lightMode ? '#92400e' : 'var(--gold)')
    : (lightMode ? '#374151' : 'var(--text)');
  
  // Style pour les éléments archivés - rayures grises diagonales
  const archivedPattern = micro.archived 
    ? 'background-image: repeating-linear-gradient(45deg, rgba(128,128,128,0.05) 0px, rgba(128,128,128,0.05) 10px, rgba(128,128,128,0.15) 10px, rgba(128,128,128,0.15) 20px);'
    : '';
  
  return `
    <div class="micro-header ${isSelected ? 'selected' : ''}" 
         style="display:flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;margin-bottom:0.375rem;
                background:${bgColor};
                ${archivedPattern}
                border:1px solid ${borderColor};
                border-radius:0.5rem;cursor:pointer"
         onclick="selectMicro(${macroId}, ${mesoId}, ${micro.id})">
      
      <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.85rem;color:${textColor}">
        MICRO ${micro.id}
      </span>
      
      <input type="text" value="${h(micro.focus)}" 
             onchange="renameMicroCycle(${macroId}, ${mesoId}, ${micro.id}, this.value)"
             onclick="event.stopPropagation()"
             style="flex:1;min-width:60px;background:transparent;border:none;
                    color:${textColor};font-size:0.8rem;font-style:italic">
      
      ${isUnlocked ? `<span class="badge" style="font-size:0.55rem;background:${lightMode ? '#d1fae5' : 'rgba(16,185,129,0.2)'};color:${lightMode ? '#065f46' : 'var(--green)'};border:1px solid ${lightMode ? '#10b981' : 'transparent'}">OUVERT</span>` : ''}
      
      <span class="badge" style="font-size:0.6rem;background:${lightMode ? '#e5e7eb' : 'var(--surface)'};color:${lightMode ? '#374151' : 'var(--muted)'}">
        ${sessionCount} séances
      </span>
      
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem;color:${isUnlocked ? (lightMode ? '#059669' : 'var(--green)') : (lightMode ? '#6b7280' : 'var(--muted)')};border-color:${isUnlocked ? (lightMode ? '#10b981' : 'rgba(16,185,129,0.3)') : (lightMode ? '#d1d5db' : 'var(--border)')}"
              onclick="event.stopPropagation();toggleUnlockMicro(${macroId}, ${mesoId}, ${micro.id})" 
              title="${isUnlocked ? 'Verrouiller' : 'Ouvrir'}">
        ${isUnlocked ? '🔓' : '🔒'}
      </button>
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();moveMicroUp(${macroId}, ${mesoId}, ${micro.id})" title="Monter">⬆️</button>
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();moveMicroDown(${macroId}, ${mesoId}, ${micro.id})" title="Descendre">⬇️</button>
      ${getClientHierarchyLevel() !== 'micro' ? `<button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();showMoveMicroModal(${macroId}, ${mesoId}, ${micro.id})" title="Déplacer vers un autre mésocycle">↗️</button>` : ''}
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();duplicateMicroCycle(${macroId}, ${mesoId}, ${micro.id})" title="Dupliquer">📋</button>
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();toggleArchiveMicro(${macroId}, ${mesoId}, ${micro.id})" title="Archiver/Désarchiver">
        ${micro.archived ? '📦↑' : '📦'}
      </button>
      <button class="btn btn-danger btn-sm" id="del-micro-${macroId}-${mesoId}-${micro.id}" data-c="0" 
              style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();deleteMicroCycle(${macroId}, ${mesoId}, ${micro.id})">🗑️</button>
    </div>
  `;
}

// ========================================================================
// SÉLECTEURS HIÉRARCHIQUES POUR L'ÉDITEUR
// ========================================================================

function renderHierarchySelectors() {
  const container = document.getElementById('hierarchy-selectors');
  if (!container) return;
  
  const hierarchyLevel = typeof getClientHierarchyLevel === 'function' ? getClientHierarchyLevel() : 'macro';
  const macros = getVisibleMacros(); // Use visible macros only (filter hidden)
  
  // Mode micro seul: afficher uniquement les microcycles
  if (hierarchyLevel === 'micro') {
    const allMicros = typeof getVisibleMicros === 'function' ? getVisibleMicros() : [];
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Microcycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${allMicros.map(m => `
              <button onclick="onMicroButtonClick(${m.macroId || 1}, ${m.mesoId || 1}, ${m.id})" 
                      class="tab-pill ${_hierarchy.currentMicro === m.id ? 'on' : 'off'}"
                      style="padding:0.5rem 0.875rem;font-size:0.75rem;
                             ${_hierarchy.currentMicro === m.id ? 'border-color:var(--gold);background:rgba(240,165,0,0.15);color:var(--gold)' : ''}"
                      title="${m.focus || ''}">
                ${m.archived ? '🔒 ' : ''}C${m.id}
              </button>
            `).join('') || '<span style="color:var(--muted);font-size:0.8rem">Aucun microcycle</span>'}
          </div>
        </div>
      </div>
    `;
    return;
  }
  
  // Mode meso+micro: afficher mésocycles puis microcycles
  if (hierarchyLevel === 'meso') {
    const firstMacro = macros[0];
    const mesos = firstMacro?.mesos?.filter(m => !m.hidden) || []; // Filter hidden mesos
    const currentMacro = getMacroById(_hierarchy.currentMacro) || firstMacro;
    const currentMeso = currentMacro ? getMesoById(_hierarchy.currentMacro, _hierarchy.currentMeso) : null;
    
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Mésocycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${mesos.map(m => `
              <button onclick="onMesoButtonClick(${firstMacro.id}, ${m.id})" 
                      class="tab-pill ${_hierarchy.currentMeso === m.id ? 'on' : 'off'}"
                      style="padding:0.5rem 0.875rem;font-size:0.75rem;
                             ${_hierarchy.currentMeso === m.id ? 'border-color:rgba(139,92,246,0.5);background:rgba(139,92,246,0.15);color:#a78bfa' : ''}"
                      title="${m.focus || ''}">
                ${m.archived ? '🔒 ' : ''}Méso ${m.id}
              </button>
            `).join('') || '<span style="color:var(--muted);font-size:0.8rem">Aucun mésocycle</span>'}
          </div>
        </div>
        
        ${currentMeso ? `
          <div>
            <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                          font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
              Microcycle
            </label>
            <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
              ${currentMeso.micros?.map(m => {
                const isUnlocked = isMicroUnlocked(currentMacro.id, currentMeso.id, m.id);
                return `
                  <button onclick="onMicroButtonClick(${currentMacro.id}, ${currentMeso.id}, ${m.id})" 
                          class="tab-pill ${_hierarchy.currentMicro === m.id ? 'on' : 'off'}"
                          style="padding:0.5rem 0.875rem;font-size:0.75rem;
                                 ${_hierarchy.currentMicro === m.id ? 'border-color:var(--gold);background:rgba(240,165,0,0.15);color:var(--gold)' : ''}"
                          title="${m.focus || ''}">
                    ${isUnlocked ? '🔓 ' : '🔒 '}C${m.id}${m.archived ? ' [A]' : ''}
                  </button>
                `;
              }).join('') || '<span style="color:var(--muted);font-size:0.8rem">Aucun microcycle</span>'}
            </div>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }
  
  // Mode macro+meso+micro: afficher tous les niveaux (comportement par défaut)
  const currentMacro = getMacroById(_hierarchy.currentMacro);
  const currentMeso = currentMacro ? getMesoById(_hierarchy.currentMacro, _hierarchy.currentMeso) : null;
  const currentMicro = currentMeso ? getMicroById(_hierarchy.currentMacro, _hierarchy.currentMeso, _hierarchy.currentMicro) : null;
  
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem">
      
      <!-- Macrocycles -->
      <div>
        <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                      font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
          Macrocycle
        </label>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
          ${macros.map(m => `
            <button onclick="onMacroButtonClick(${m.id})" 
                    class="tab-pill ${_hierarchy.currentMacro === m.id ? 'on' : 'off'}"
                    style="padding:0.5rem 0.875rem;font-size:0.75rem;
                           ${_hierarchy.currentMacro === m.id ? 'border-color:rgba(59,130,246,0.5);background:rgba(59,130,246,0.15);color:#60a5fa' : ''}"
                    title="${m.focus || ''}">
              ${m.archived ? '🔒 ' : ''}Macro ${m.id}
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Mésocycles -->
      ${currentMacro ? `
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Mésocycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${currentMacro.mesos?.filter(m => !m.hidden).map(m => `
              <button onclick="onMesoButtonClick(${currentMacro.id}, ${m.id})" 
                      class="tab-pill ${_hierarchy.currentMeso === m.id ? 'on' : 'off'}"
                      style="padding:0.5rem 0.875rem;font-size:0.75rem;
                             ${_hierarchy.currentMeso === m.id ? 'border-color:rgba(139,92,246,0.5);background:rgba(139,92,246,0.15);color:#a78bfa' : ''}"
                      title="${m.focus || ''}">
                ${m.archived ? '🔒 ' : ''}Méso ${m.id}
              </button>
            `).join('') || '<span style="color:var(--muted);font-size:0.8rem">Aucun mésocycle</span>'}
          </div>
        </div>
      ` : ''}
      
      <!-- Microcycles -->
      ${currentMeso ? `
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Microcycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${currentMeso.micros?.map(m => {
              const isUnlocked = isMicroUnlocked(currentMacro.id, currentMeso.id, m.id);
              return `
                <button onclick="onMicroButtonClick(${currentMacro.id}, ${currentMeso.id}, ${m.id})" 
                        class="tab-pill ${_hierarchy.currentMicro === m.id ? 'on' : 'off'}"
                        style="padding:0.5rem 0.875rem;font-size:0.75rem;
                               ${_hierarchy.currentMicro === m.id ? 'border-color:var(--gold);background:rgba(240,165,0,0.15);color:var(--gold)' : ''}"
                        title="${m.focus || ''}">
                  ${isUnlocked ? '🔓 ' : '🔒 '}C${m.id}${m.archived ? ' [A]' : ''}
                </button>
              `;
            }).join('') || '<span style="color:var(--muted);font-size:0.8rem">Aucun microcycle</span>'}
          </div>
        </div>
      ` : ''}
      
    </div>
  `;
}

function onMacroButtonClick(macroId) {
  selectMacro(macroId);
  renderHierarchySelectors();
}

function onMesoButtonClick(macroId, mesoId) {
  selectMeso(macroId, mesoId);
  renderHierarchySelectors();
}

function onMicroButtonClick(macroId, mesoId, microId) {
  selectMicro(macroId, mesoId, microId);
  renderHierarchySelectors();
}

function onMacroSelectChange(macroId) {
  if (!macroId) {
    _hierarchy.currentMacro = null;
    _hierarchy.currentMeso = null;
    _hierarchy.currentMicro = null;
  } else {
    selectMacro(parseInt(macroId));
  }
  renderHierarchySelectors();
}

function onMesoSelectChange(macroId, mesoId) {
  if (!mesoId) {
    _hierarchy.currentMeso = null;
    _hierarchy.currentMicro = null;
  } else {
    selectMeso(macroId, parseInt(mesoId));
  }
  renderHierarchySelectors();
}

function onMicroSelectChange(macroId, mesoId, microId) {
  if (!microId) {
    _hierarchy.currentMicro = null;
  } else {
    selectMicro(macroId, mesoId, parseInt(microId));
  }
}

// Fonction pour forcer la migration depuis le document program de Firestore
async function forceMigrateFromProgram() {
  if (!window.currentClient) {
    console.log('Pas de client sélectionné');
    return;
  }
  
  console.log('Force migration depuis program pour client', window.currentClient.id);
  
  try {
    // Charger directement depuis Firestore
    const progDoc = await window.fdb.getDoc(
      window.fdb.doc(window.db, 'apps', window.APP_ID, 'clients', window.currentClient.id, 'data', 'program')
    );
    
    if (!progDoc.exists) {
      console.log('Document program non trouvé');
      toast('Aucun programme trouvé', 'e');
      return;
    }
    
    const data = progDoc.data();
    console.log('Données program:', data);
    
    if (!data.cycles || data.cycles.length === 0) {
      console.log('Pas de cycles dans program');
      toast('Pas de cycles à migrer', 'w');
      return;
    }
    
    console.log('Cycles trouvés dans program:', data.cycles.length);
    console.log('Cycles:', data.cycles.map(c => ({ id: c.id, focus: c.focus })));
    
    // Créer la hiérarchie depuis les cycles
    const defaultMacro = {
      id: 1,
      name: "MacroCycle 1",
      focus: "Programme principal",
      archived: false,
      mesos: [{
        id: 1,
        name: "MesoCycle 1",
        focus: "Général",
        archived: false,
        micros: data.cycles.map(c => ({
          id: c.id,
          focus: c.focus || `Cycle ${c.id}`,
          sessions: c.sessions || {},
          sessions_active: c.sessions_active || [],
          archived: false
        }))
      }]
    };
    
    window.clientProgramHierarchy = {
      macros: [defaultMacro]
    };
    
    // Sauvegarder
    await saveHierarchy();
    
    // Rendre
    renderHierarchy();
    
    toast(`${data.cycles.length} cycles migrés avec succès !`, 's');
    
  } catch (e) {
    console.error('Erreur force migration:', e);
    toast('Erreur migration: ' + e.message, 'e');
  }
}
// Fonction de diagnostic pour aider au debug
async function diagnoseCycles() {
  console.log('=== DIAGNOSTIC CYCLES ===');
  console.log('currentClient:', window.currentClient?.id, window.currentClient?.name);
  console.log('clientProgram:', window.clientProgram?.length, 'cycles');
  console.log('clientProgramHierarchy:', window.clientProgramHierarchy?.macros?.length, 'macros');
  
  if (window.clientProgram) {
    window.clientProgram.forEach((c, i) => {
      console.log(`Cycle ${i}:`, { id: c.id, focus: c.focus, sessions: Object.keys(c.sessions || {}).length });
    });
  }
  
  if (window.currentClient) {
    try {
      const progDoc = await window.fdb.getDoc(
        window.fdb.doc(window.db, 'apps', window.APP_ID, 'clients', window.currentClient.id, 'data', 'program')
      );
      if (progDoc.exists) {
        const data = progDoc.data();
        console.log('Document program existe:', data.cycles?.length, 'cycles');
      } else {
        console.log('Document program inexistant');
      }
    } catch (e) {
      console.error('Erreur lecture program:', e);
    }
  }
  console.log('========================');
  
  toast('Diagnostic console - voir F12 > Console', 'i');
}

// Fonction helper pour l'échappement HTML
function h(str) {
  if (!str) return '';
  return str.replace(/[<>&"']/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
}

// Observer les changements de thème pour rafraîchir la hiérarchie
let _themeObserver = null;
function initThemeObserver() {
  if (_themeObserver) return;
  
  _themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // La classe a changé, rafraîchir la hiérarchie
        if (typeof renderHierarchy === 'function') {
          renderHierarchy();
        }
        if (typeof renderHierarchySelectors === 'function') {
          renderHierarchySelectors();
        }
      }
    });
  });
  
  _themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
}

// Initialiser l'observer quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeObserver);
} else {
  initThemeObserver();
}

// Exporter les fonctions pour l'utilisation globale
window.diagnoseCycles = diagnoseCycles;
window.forceMigrateFromProgram = forceMigrateFromProgram;
window.initHierarchy = initHierarchy;
window.loadHierarchy = loadHierarchy;
window.saveHierarchy = saveHierarchy;
window.migrateToHierarchy = migrateToHierarchy;
window.migrateAfterDataLoad = migrateAfterDataLoad;
window.renderHierarchy = renderHierarchy;
window.renderHierarchySelectors = renderHierarchySelectors;
window.onMacroButtonClick = onMacroButtonClick;
window.onMesoButtonClick = onMesoButtonClick;
window.onMicroButtonClick = onMicroButtonClick;
window.addMacroCycle = addMacroCycle;
window.addMesoCycle = addMesoCycle;
window.addMicroCycle = addMicroCycle;
window.selectMacro = selectMacro;
window.selectMeso = selectMeso;
window.selectMicro = selectMicro;
window.toggleExpandMacro = toggleExpandMacro;
window.toggleExpandMeso = toggleExpandMeso;
window.getAllMacros = getAllMacros;
window.getAllMicros = getAllMicros;
window.getMicroById = getMicroById;
window.getClientHierarchyLevel = getClientHierarchyLevel;
window.syncClientProgram = syncClientProgram;

// ===================================================================
// FONCTIONS DE DÉPLACEMENT ET RÉORGANISATION DES CYCLES
// ===================================================================

// Déplacer un macrocycle vers le haut
function moveMacroUp(macroId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const index = hierarchy.macros.findIndex(m => m.id === macroId);
  if (index <= 0) return; // Déjà en premier
  
  // Échanger avec le précédent
  [hierarchy.macros[index], hierarchy.macros[index - 1]] = 
  [hierarchy.macros[index - 1], hierarchy.macros[index]];
  
  // Renommer dans l'ordre
  hierarchy.macros.forEach((m, i) => {
    m.id = i + 1;
    m.name = m.name.replace(/MacroCycle \d+/, `MacroCycle ${i + 1}`);
  });
  
  saveHierarchy();
  renderHierarchy();
  toast('Macrocycle déplacé vers le haut', 's');
}

// Déplacer un macrocycle vers le bas
function moveMacroDown(macroId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const index = hierarchy.macros.findIndex(m => m.id === macroId);
  if (index === -1 || index >= hierarchy.macros.length - 1) return; // Déjà en dernier
  
  // Échanger avec le suivant
  [hierarchy.macros[index], hierarchy.macros[index + 1]] = 
  [hierarchy.macros[index + 1], hierarchy.macros[index]];
  
  // Renommer dans l'ordre
  hierarchy.macros.forEach((m, i) => {
    m.id = i + 1;
    m.name = m.name.replace(/MacroCycle \d+/, `MacroCycle ${i + 1}`);
  });
  
  saveHierarchy();
  renderHierarchy();
  toast('Macrocycle déplacé vers le bas', 's');
}

// Déplacer un mésocycle vers le haut
function moveMesoUp(macroId, mesoId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const index = macro.mesos.findIndex(m => m.id === mesoId);
  if (index <= 0) return; // Déjà en premier
  
  // Échanger avec le précédent
  [macro.mesos[index], macro.mesos[index - 1]] = 
  [macro.mesos[index - 1], macro.mesos[index]];
  
  // Renommer dans l'ordre
  macro.mesos.forEach((m, i) => {
    m.id = i + 1;
    m.name = `MesoCycle ${i + 1}`;
  });
  
  saveHierarchy();
  renderHierarchy();
  toast('Mésocycle déplacé vers le haut', 's');
}

// Déplacer un mésocycle vers le bas
function moveMesoDown(macroId, mesoId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const index = macro.mesos.findIndex(m => m.id === mesoId);
  if (index === -1 || index >= macro.mesos.length - 1) return; // Déjà en dernier
  
  // Échanger avec le suivant
  [macro.mesos[index], macro.mesos[index + 1]] = 
  [macro.mesos[index + 1], macro.mesos[index]];
  
  // Renommer dans l'ordre
  macro.mesos.forEach((m, i) => {
    m.id = i + 1;
    m.name = `MesoCycle ${i + 1}`;
  });
  
  saveHierarchy();
  renderHierarchy();
  toast('Mésocycle déplacé vers le bas', 's');
}

// Déplacer un microcycle vers le haut
function moveMicroUp(macroId, mesoId, microId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const meso = macro.mesos.find(m => m.id === mesoId);
  if (!meso || !meso.micros) return;
  
  const index = meso.micros.findIndex(m => m.id === microId);
  if (index <= 0) return; // Déjà en premier
  
  // Échanger avec le précédent
  [meso.micros[index], meso.micros[index - 1]] = 
  [meso.micros[index - 1], meso.micros[index]];
  
  // Renommer dans l'ordre
  meso.micros.forEach((m, i) => {
    m.id = i + 1;
  });
  
  saveHierarchy();
  renderHierarchy();
  toast('Microcycle déplacé vers le haut', 's');
}

// Déplacer un microcycle vers le bas
function moveMicroDown(macroId, mesoId, microId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const meso = macro.mesos.find(m => m.id === mesoId);
  if (!meso || !meso.micros) return;
  
  const index = meso.micros.findIndex(m => m.id === microId);
  if (index === -1 || index >= meso.micros.length - 1) return; // Déjà en dernier
  
  // Échanger avec le suivant
  [meso.micros[index], meso.micros[index + 1]] = 
  [meso.micros[index + 1], meso.micros[index]];
  
  // Renommer dans l'ordre
  meso.micros.forEach((m, i) => {
    m.id = i + 1;
  });
  
  saveHierarchy();
  renderHierarchy();
  toast('Microcycle déplacé vers le bas', 's');
}

// Modal pour déplacer un mésocycle vers un autre macrocycle
function showMoveMesoModal(macroId, mesoId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  // Filtrer les macrocycles cibles (tous sauf le courant)
  const targetMacros = hierarchy.macros.filter(m => m.id !== macroId);
  
  if (targetMacros.length === 0) {
    toast('Aucun autre macrocycle disponible', 'e');
    return;
  }
  
  const modalContent = `
    <div style="padding:1.5rem">
      <h3 style="margin-bottom:1rem">Déplacer le mésocycle</h3>
      <p style="margin-bottom:1rem;color:var(--muted)">Sélectionnez le macrocycle de destination :</p>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${targetMacros.map(m => `
          <button onclick="moveMesoToMacro(${mesoId}, ${macroId}, ${m.id}); closeModal()" 
                  class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
            📁 ${m.name || `MacroCycle ${m.id}`} (${m.mesos?.length || 0} mésos)
          </button>
        `).join('')}
      </div>
      <button onclick="closeModal()" class="btn btn-ghost" style="margin-top:1rem;width:100%">Annuler</button>
    </div>
  `;
  
  showModal(modalContent);
}

// Modal pour déplacer un microcycle vers un autre mésocycle
function showMoveMicroModal(macroId, mesoId, microId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  // Étape 1: Choisir si on reste dans le même macro ou on change
  const currentMacro = hierarchy.macros.find(m => m.id === macroId);
  const otherMacros = hierarchy.macros.filter(m => m.id !== macroId);
  
  const modalContent = `
    <div style="padding:1.5rem">
      <h3 style="margin-bottom:1rem">Déplacer le microcycle</h3>
      <p style="margin-bottom:1rem;color:var(--muted)">Où voulez-vous déplacer ce microcycle ?</p>
      
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <button onclick="showMoveMicroModal_Step2(${macroId}, ${mesoId}, ${microId}, ${macroId})" 
                class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
          📁 Reste dans le macrocycle actuel (${currentMacro?.name || `MacroCycle ${macroId}`})
        </button>
        
        ${otherMacros.map(m => `
          <button onclick="showMoveMicroModal_Step2(${macroId}, ${mesoId}, ${microId}, ${m.id})" 
                  class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
            📁 Vers le macrocycle ${m.name || `MacroCycle ${m.id}`}
          </button>
        `).join('')}
      </div>
      <button onclick="closeModal()" class="btn btn-ghost" style="margin-top:1rem;width:100%">Annuler</button>
    </div>
  `;
  
  showModal(modalContent);
}

// Étape 2: Choisir le mésocycle de destination
function showMoveMicroModal_Step2(sourceMacroId, sourceMesoId, microId, targetMacroId) {
  const hierarchy = window.clientProgramHierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const targetMacro = hierarchy.macros.find(m => m.id === targetMacroId);
  if (!targetMacro || !targetMacro.mesos || targetMacro.mesos.length === 0) {
    toast('Aucun mésocycle disponible dans ce macrocycle', 'e');
    return;
  }
  
  // Filtrer les mésocycles cibles (tous sauf le courant si même macro)
  const targetMesos = targetMacroId === sourceMacroId 
    ? targetMacro.mesos.filter(m => m.id !== sourceMesoId)
    : targetMacro.mesos;
  
  if (targetMesos.length === 0) {
    toast('Aucun autre mésocycle disponible', 'e');
    return;
  }
  
  const modalContent = `
    <div style="padding:1.5rem">
      <h3 style="margin-bottom:1rem">Choisir le mésocycle</h3>
      <p style="margin-bottom:1rem;color:var(--muted)">Sélectionnez le mésocycle de destination :</p>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${targetMesos.map(m => `
          <button onclick="moveMicroToMeso(${microId}, ${sourceMesoId}, ${m.id}, ${targetMacroId}); closeModal()" 
                  class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
            📂 ${m.name || `MesoCycle ${m.id}`} (${m.micros?.length || 0} micros)
          </button>
        `).join('')}
      </div>
      <button onclick="showMoveMicroModal(${sourceMacroId}, ${sourceMesoId}, ${microId})" class="btn btn-ghost" style="margin-top:1rem;width:100%">← Retour</button>
    </div>
  `;
  
  showModal(modalContent);
}

// Helper pour afficher un modal
function showModal(content) {
  // Supprimer un modal existant
  const existingModal = document.getElementById('cycle-modal');
  if (existingModal) existingModal.remove();
  
  // Créer le modal
  const modal = document.createElement('div');
  modal.id = 'cycle-modal';
  modal.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    right:0;
    bottom:0;
    background:rgba(0,0,0,0.5);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:10000;
  `;
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:1rem;min-width:300px;max-width:90vw;max-height:80vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">
      ${content}
    </div>
  `;
  
  // Fermer au clic sur le fond
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCycleModal();
  });
  
  document.body.appendChild(modal);
}

// Fermer le modal
function closeCycleModal() {
  const modal = document.getElementById('cycle-modal');
  if (modal) modal.remove();
}

// Exporter les nouvelles fonctions
window.moveMacroUp = moveMacroUp;
window.moveMacroDown = moveMacroDown;
window.moveMesoUp = moveMesoUp;
window.moveMesoDown = moveMesoDown;
window.moveMicroUp = moveMicroUp;
window.moveMicroDown = moveMicroDown;
window.showMoveMesoModal = showMoveMesoModal;
window.showMoveMicroModal = showMoveMicroModal;
window.showMoveMicroModal_Step2 = showMoveMicroModal_Step2;
window.closeCycleModal = closeCycleModal;
