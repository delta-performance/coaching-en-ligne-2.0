// COACH-BASEPROGRAMS-HIERARCHY.JS - Copie exacte de coach-cycles-hierarchy.js adaptée pour les programmes de base
// Toutes les fonctions sont identiques, seules les variables globales sont adaptées

// Variables globales pour la hiérarchie des programmes de base
window._bpHierarchy = {
  currentMacro: null,
  currentMeso: null,
  currentMicro: null,
  expandedMacros: new Set(),
  expandedMesos: new Set(),
  selectedMacros: new Set(),
  selectedMesos: new Set(),
  selectedMicros: new Set()
};

window._bpUnlockedMicros = new Set();

// Helper pour détecter le mode clair
function bpIsLightMode() {
  if (document.documentElement.classList.contains('dark-forced')) {
    return false;
  }
  return document.documentElement.classList.contains('light-mode') || 
         (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
}

function bpInitHierarchy() {
  if (!_bpProgramData?.hierarchy) {
    bpMigrateToHierarchy();
  }
}

function bpMigrateToHierarchy() {
  console.log('bpMigrateToHierarchy called with', _bpProgramData?.cycles?.length, 'cycles');
  
  if (!_bpProgramData?.cycles || _bpProgramData.cycles.length === 0) {
    console.log('Pas de cycles à migrer');
    return;
  }
  
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
      micros: _bpProgramData.cycles.map(c => {
        console.log('Migration du cycle:', c.id, c.focus);
        return {
          id: c.id,
          focus: c.focus || `Cycle ${c.id}`,
          sessions: c.sessions || {},
          sessions_active: c.sessions_active || [],
          archived: false
        };
      })
    }]
  };
  
  _bpProgramData.hierarchy = { macros: [defaultMacro] };
  console.log('Hiérarchie créée avec', defaultMacro.mesos[0].micros.length, 'microcycles');
}

async function bpMigrateAfterDataLoad() {
  console.log('bpMigrateAfterDataLoad called, cycles length:', _bpProgramData?.cycles?.length);
  
  if (_bpProgramData?.cycles && _bpProgramData.cycles.length > 0) {
    console.log('Cycles trouvés:', _bpProgramData.cycles.length);
    
    if (!_bpProgramData.hierarchy?.macros?.length) {
      console.log('Migration nécessaire - création de la hiérarchie depuis', _bpProgramData.cycles.length, 'cycles');
      bpMigrateToHierarchy();
      await bpSaveHierarchy();
      bpRenderHierarchy();
      toast(`${_bpProgramData.cycles.length} cycles migrés vers la hiérarchie !`, 's');
    }
  }
}

function bpGetAllMacros() {
  return _bpProgramData?.hierarchy?.macros || [];
}

function bpGetMacroById(macroId) {
  return bpGetAllMacros().find(m => m.id === macroId);
}

function bpGetMesoById(macroId, mesoId) {
  const macro = bpGetMacroById(macroId);
  return macro?.mesos?.find(m => m.id === mesoId);
}

function bpGetMicroById(macroId, mesoId, microId) {
  const meso = bpGetMesoById(macroId, mesoId);
  return meso?.micros?.find(m => m.id === microId);
}

function bpGetNextMacroId() {
  const macros = bpGetAllMacros();
  return macros.length > 0 ? Math.max(...macros.map(m => m.id)) + 1 : 1;
}

function bpGetNextMesoId(macroId) {
  const macro = bpGetMacroById(macroId);
  const mesos = macro?.mesos || [];
  return mesos.length > 0 ? Math.max(...mesos.map(m => m.id)) + 1 : 1;
}

function bpGetNextMicroId(macroId, mesoId) {
  const meso = bpGetMesoById(macroId, mesoId);
  const micros = meso?.micros || [];
  return micros.length > 0 ? Math.max(...micros.map(m => m.id)) + 1 : 1;
}

function bpGetAllMicros() {
  const allMicros = [];
  bpGetAllMacros().forEach(macro => {
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

function bpGetVisibleMacros() {
  return bpGetAllMacros().filter(m => !m.hidden);
}

function bpGetVisibleMicros() {
  const visibleMicros = [];
  bpGetAllMacros().forEach(macro => {
    if (macro.hidden) return;
    macro.mesos?.forEach(meso => {
      if (meso.hidden) return;
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

async function bpAddMacroCycle(name = '', focus = '') {
  if (!_bpProgramData.hierarchy) {
    _bpProgramData.hierarchy = { macros: [] };
  }
  
  const newMacro = {
    id: bpGetNextMacroId(),
    name: name || `MacroCycle ${bpGetNextMacroId()}`,
    focus: focus || '',
    archived: false,
    mesos: []
  };
  
  _bpProgramData.hierarchy.macros.push(newMacro);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  _bpHierarchy.expandedMacros.add(newMacro.id);
  
  toast(`Macrocycle ${newMacro.name} créé !`, 's');
  return newMacro.id;
}

async function bpToggleArchiveMacro(macroId) {
  const macro = bpGetMacroById(macroId);
  if (!macro) return;
  macro.archived = !macro.archived;
  
  macro.mesos?.forEach(meso => {
    meso.archived = macro.archived;
    meso.micros?.forEach(micro => {
      micro.archived = macro.archived;
    });
  });
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast(macro.archived ? 'Macrocycle archivé' : 'Macrocycle désarchivé', 'w');
}

async function bpDeleteMacroCycle(macroId) {
  const btn = document.getElementById(`bp-del-macro-${macroId}`);
  if (!btn) return;
  
  const confirmCount = parseInt(btn.dataset.c || '0');
  if (confirmCount === 0) {
    btn.dataset.c = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.textContent = '🗑️';
      btn.style.background = '';
    }, 3000);
    return;
  }
  
  const macros = _bpProgramData.hierarchy?.macros || [];
  const idx = macros.findIndex(m => m.id === macroId);
  if (idx === -1) return;
  
  macros.splice(idx, 1);
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast('Macrocycle supprimé', 's');
}

async function bpDuplicateMacroCycle(macroId) {
  const macro = bpGetMacroById(macroId);
  if (!macro) return;
  
  const newMacroId = bpGetNextMacroId();
  
  const cleanMicro = (micro, newMicroId) => ({
    id: newMicroId,
    focus: micro.focus || '',
    sessions: micro.sessions ? JSON.parse(JSON.stringify(micro.sessions)) : {},
    sessions_active: micro.sessions_active ? [...micro.sessions_active] : [],
    archived: false
  });
  
  const cleanMeso = (meso, newMesoId, macroIdForMicros) => {
    const newMeso = {
      id: newMesoId,
      name: meso.name || '',
      focus: meso.focus || '',
      archived: false,
      micros: []
    };
    
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
  
  let mesoIdCounter = 1;
  if (macro.mesos) {
    macro.mesos.forEach(meso => {
      newMacro.mesos.push(cleanMeso(meso, mesoIdCounter++, newMacroId));
    });
  }
  
  _bpProgramData.hierarchy.macros.push(newMacro);
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast(`Macrocycle ${newMacro.name} dupliqué !`, 's');
}

async function bpAddMesoCycle(macroId, name = '', focus = '') {
  let macro = bpGetMacroById(macroId);
  if (!macro) {
    if (!_bpProgramData.hierarchy) {
      _bpProgramData.hierarchy = { macros: [] };
    }
    macro = {
      id: macroId || 1,
      name: "MacroCycle 1",
      focus: "",
      archived: false,
      mesos: []
    };
    _bpProgramData.hierarchy.macros.push(macro);
  }
  
  if (!macro.mesos) macro.mesos = [];
  
  const newMeso = {
    id: bpGetNextMesoId(macro.id),
    name: name || `MesoCycle ${bpGetNextMesoId(macro.id)}`,
    focus: focus || '',
    archived: false,
    micros: []
  };
  
  macro.mesos.push(newMeso);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  _bpHierarchy.expandedMacros.add(macro.id);
  
  toast(`Mésocycle ${newMeso.name} créé !`, 's');
  return newMeso.id;
}

async function bpRenameMesoCycle(macroId, mesoId, newName) {
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso) return;
  meso.name = newName;
  await bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Mésocycle renommé', 's');
}

async function bpSetMesoFocus(macroId, mesoId, focus) {
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso) return;
  meso.focus = focus;
  await bpSaveHierarchy();
  bpRenderHierarchy();
}

async function bpSetMacroFocus(macroId, focus) {
  const macro = bpGetMacroById(macroId);
  if (!macro) return;
  macro.focus = focus;
  await bpSaveHierarchy();
  bpRenderHierarchy();
}

async function bpToggleArchiveMeso(macroId, mesoId) {
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso) return;
  meso.archived = !meso.archived;
  
  meso.micros?.forEach(micro => {
    micro.archived = meso.archived;
  });
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast(meso.archived ? 'Mésocycle archivé' : 'Mésocycle désarchivé', 'w');
}

async function bpToggleHiddenMeso(macroId, mesoId) {
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso) return;
  meso.hidden = !meso.hidden;
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast(meso.hidden ? 'Mésocycle masqué' : 'Mésocycle visible', 'w');
}

async function bpToggleHiddenMacro(macroId) {
  const macro = bpGetMacroById(macroId);
  if (!macro) return;
  macro.hidden = !macro.hidden;
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast(macro.hidden ? 'Macrocycle masqué' : 'Macrocycle visible', 'w');
}

async function bpDeleteMesoCycle(macroId, mesoId) {
  const btn = document.getElementById(`bp-del-meso-${macroId}-${mesoId}`);
  if (!btn) return;
  
  const confirmCount = parseInt(btn.dataset.c || '0');
  if (confirmCount === 0) {
    btn.dataset.c = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.textContent = '🗑️';
      btn.style.background = '';
    }, 3000);
    return;
  }
  
  const macro = bpGetMacroById(macroId);
  if (!macro || !macro.mesos) return;
  
  const idx = macro.mesos.findIndex(m => m.id === mesoId);
  if (idx === -1) return;
  
  macro.mesos.splice(idx, 1);
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast('Mésocycle supprimé', 's');
}

async function bpDuplicateMesoCycle(macroId, mesoId) {
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso) return;
  
  const macro = bpGetMacroById(macroId);
  if (!macro) return;
  
  const newMesoId = bpGetNextMesoId(macroId);
  
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
  
  let microIdCounter = 1;
  if (meso.micros) {
    meso.micros.forEach(micro => {
      newMeso.micros.push(cleanMicro(micro, microIdCounter++));
    });
  }
  
  if (!macro.mesos) macro.mesos = [];
  macro.mesos.push(newMeso);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  _bpHierarchy.expandedMacros.add(macroId);
  
  toast(`Mésocycle ${newMeso.name} dupliqué !`, 's');
}

async function bpAddMicroCycle(macroId, mesoId, focus = '') {
  if (!_bpProgramData.hierarchy) {
    _bpProgramData.hierarchy = { macros: [] };
  }
  
  let macro = bpGetMacroById(macroId);
  if (!macro) {
    macro = {
      id: macroId || 1,
      name: `MacroCycle ${macroId || 1}`,
      focus: '',
      archived: false,
      mesos: []
    };
    _bpProgramData.hierarchy.macros.push(macro);
  }
  
  let meso = bpGetMesoById(macro.id, mesoId);
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
    id: bpGetNextMicroId(macro.id, meso.id),
    focus: focus || 'Nouveau cycle',
    sessions: {},
    sessions_active: [],
    archived: false
  };
  
  meso.micros.push(newMicro);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  _bpHierarchy.expandedMesos.add(`${macro.id}-${meso.id}`);
  
  toast(`Microcycle ${newMicro.focus} créé !`, 's');
  return newMicro.id;
}

async function bpRenameMicroCycle(macroId, mesoId, microId, newFocus) {
  const micro = bpGetMicroById(macroId, mesoId, microId);
  if (!micro) return;
  micro.focus = newFocus;
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  toast('Microcycle renommé', 's');
}

async function bpToggleArchiveMicro(macroId, mesoId, microId) {
  const micro = bpGetMicroById(macroId, mesoId, microId);
  if (!micro) return;
  micro.archived = !micro.archived;
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  toast(micro.archived ? 'Microcycle archivé' : 'Microcycle désarchivé', 'w');
}

async function bpDeleteMicroCycle(macroId, mesoId, microId) {
  const btn = document.getElementById(`bp-del-micro-${macroId}-${mesoId}-${microId}`);
  if (!btn) return;
  
  const confirmCount = parseInt(btn.dataset.c || '0');
  if (confirmCount === 0) {
    btn.dataset.c = '1';
    btn.textContent = 'Confirmer ?';
    btn.style.background = 'var(--danger)';
    setTimeout(() => {
      btn.dataset.c = '0';
      btn.textContent = '🗑️';
      btn.style.background = '';
    }, 3000);
    return;
  }
  
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso || !meso.micros) return;
  
  const idx = meso.micros.findIndex(m => m.id === microId);
  if (idx === -1) return;
  
  meso.micros.splice(idx, 1);
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast('Microcycle supprimé', 'e');
}

async function bpDuplicateMicroCycle(macroId, mesoId, microId) {
  const micro = bpGetMicroById(macroId, mesoId, microId);
  if (!micro) return;
  
  const meso = bpGetMesoById(macroId, mesoId);
  if (!meso) return;
  
  const newMicro = {
    id: bpGetNextMicroId(macroId, mesoId),
    focus: `${micro.focus} (copie)`,
    sessions: micro.sessions ? JSON.parse(JSON.stringify(micro.sessions)) : {},
    sessions_active: micro.sessions_active ? [...micro.sessions_active] : [],
    archived: false
  };
  
  if (!meso.micros) meso.micros = [];
  meso.micros.push(newMicro);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  _bpHierarchy.expandedMacros.add(macroId);
  _bpHierarchy.expandedMesos.add(`${macroId}-${mesoId}`);
  
  toast(`Microcycle ${newMicro.focus} dupliqué !`, 's');
  return { macroId, mesoId, microId: newMicro.id };
}

function bpToggleUnlockMicro(macroId, mesoId, microId) {
  const micro = bpGetMicroById(macroId, mesoId, microId);
  if (!micro) return;
  
  const unlockKey = `${macroId}-${mesoId}-${microId}`;
  if (!_bpUnlockedMicros) _bpUnlockedMicros = new Set();
  
  if (_bpUnlockedMicros.has(unlockKey)) {
    _bpUnlockedMicros.delete(unlockKey);
  } else {
    _bpUnlockedMicros.add(unlockKey);
  }
  
  bpRenderHierarchy();
  
  const isUnlocked = _bpUnlockedMicros.has(unlockKey);
  toast(isUnlocked ? 'Microcycle accessible au client' : 'Microcycle verrouillé', isUnlocked ? 's' : 'i');
}

function bpIsMicroUnlocked(macroId, mesoId, microId) {
  const unlockKey = `${macroId}-${mesoId}-${microId}`;
  return _bpUnlockedMicros && _bpUnlockedMicros.has(unlockKey);
}

function bpSelectMacro(macroId) {
  _bpHierarchy.currentMacro = macroId;
  _bpHierarchy.currentMeso = null;
  _bpHierarchy.currentMicro = null;
  bpRenderHierarchy();
  bpUpdateHierarchySelectors();
}

function bpSelectMeso(macroId, mesoId) {
  _bpHierarchy.currentMacro = macroId;
  _bpHierarchy.currentMeso = mesoId;
  _bpHierarchy.currentMicro = null;
  bpRenderHierarchy();
  bpUpdateHierarchySelectors();
}

function bpSelectMicro(macroId, mesoId, microId) {
  _bpHierarchy.currentMacro = macroId;
  _bpHierarchy.currentMeso = mesoId;
  _bpHierarchy.currentMicro = microId;
  
  _bpSelectedCycle = microId;
  const micro = bpGetMicroById(macroId, mesoId, microId);
  _bpSelectedSess = micro?.sessions_active?.[0] || 'A';
  
  bpRenderHierarchy();
  bpUpdateHierarchySelectors();
  
  if (typeof bpSyncEditor === 'function') bpSyncEditor();
  if (typeof bpRenderVisu === 'function') bpRenderVisu();
}

function bpToggleExpandMacro(macroId) {
  if (_bpHierarchy.expandedMacros.has(macroId)) {
    _bpHierarchy.expandedMacros.delete(macroId);
    bpGetMacroById(macroId)?.mesos?.forEach(meso => {
      _bpHierarchy.expandedMesos.delete(`${macroId}-${meso.id}`);
    });
  } else {
    _bpHierarchy.expandedMacros.add(macroId);
  }
  bpRenderHierarchy();
}

function bpToggleExpandMeso(macroId, mesoId) {
  const key = `${macroId}-${mesoId}`;
  if (_bpHierarchy.expandedMesos.has(key)) {
    _bpHierarchy.expandedMesos.delete(key);
  } else {
    _bpHierarchy.expandedMesos.add(key);
  }
  bpRenderHierarchy();
}

function bpUpdateHierarchySelectors() {
  // Met à jour les sélecteurs si présents
}

function bpGetHierarchyLevel() {
  return currentBaseProgram?.hierarchyLevel || 'macro';
}

function bpRenderHierarchy() {
  const container = document.getElementById('bp-hierarchy-container');
  if (!container) return;
  
  bpUpdateAddTopCycleButton();
  
  const hierarchyLevel = bpGetHierarchyLevel();
  const macros = bpGetAllMacros();
  
  if (!macros || macros.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p style="margin-bottom:1rem">Aucun cycle créé.</p>
        <button onclick="bpEnsureDefaultHierarchy()" class="btn btn-primary">+ Créer un premier cycle</button>
      </div>
    `;
    return;
  }
  
  if (hierarchyLevel === 'micro') {
    bpRenderMicroOnlyView(container);
    return;
  }
  
  if (hierarchyLevel === 'meso') {
    bpRenderMesoOnlyView(container);
    return;
  }
  
  container.innerHTML = macros.map(macro => bpRenderMacroItem(macro)).join('');
}

function bpRenderMicroOnlyView(container) {
  const allMicros = bpGetAllMicros();
  
  if (allMicros.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p style="margin-bottom:1rem">Aucun microcycle créé.</p>
        <button onclick="bpAddMicroWithAutoParents()" class="btn btn-primary">+ Créer un microcycle</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = allMicros.map(micro => bpRenderMicroOnlyItem(micro)).join('');
}

function bpRenderMicroOnlyItem(micro) {
  const lightMode = bpIsLightMode();
  const isArchived = micro.archived;
  const isUnlocked = bpIsMicroUnlocked(micro.macroId, micro.mesoId, micro.id);
  
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
        
        <input type="text" value="${bpH(micro.focus || '')}" 
               placeholder="Focus..."
               onchange="bpRenameMicroCycle(${micro.macroId}, ${micro.mesoId}, ${micro.id}, this.value)"
               style="flex:1;min-width:100px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.85rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        ${isUnlocked ? `<span class="badge" style="font-size:0.55rem;background:${lightMode ? '#d1fae5' : 'rgba(16,185,129,0.2)'};color:${lightMode ? '#065f46' : 'var(--green)'};border:1px solid ${lightMode ? '#10b981' : 'transparent'};padding:0.15rem 0.4rem">OUVERT</span>` : ''}
        
        <span class="badge" style="font-size:0.6rem;background:${lightMode ? '#e5e7eb' : 'var(--surface)'};color:${lightMode ? '#374151' : 'var(--muted)'};padding:0.2rem 0.5rem">
          ${sessionCount} séances
        </span>
        
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem;color:${isUnlocked ? (lightMode ? '#059669' : 'var(--green)') : (lightMode ? '#6b7280' : 'var(--muted)')};border-color:${isUnlocked ? (lightMode ? '#10b981' : 'rgba(16,185,129,0.3)') : (lightMode ? '#d1d5db' : 'var(--border)')}"
                onclick="event.stopPropagation();bpToggleUnlockMicro(${micro.macroId}, ${micro.mesoId}, ${micro.id})" 
                title="${isUnlocked ? 'Verrouiller' : 'Ouvrir'}">
          ${isUnlocked ? '🔓' : '🔒'}
        </button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();bpMoveMicroUp(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Monter">⬆️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();bpMoveMicroDown(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Descendre">⬇️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();bpDuplicateMicroCycle(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();bpToggleArchiveMicro(${micro.macroId}, ${micro.mesoId}, ${micro.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="bp-del-micro-${micro.macroId}-${micro.mesoId}-${micro.id}" data-c="0" 
                style="padding:0.25rem 0.5rem;font-size:0.7rem"
                onclick="event.stopPropagation();bpDeleteMicroCycle(${micro.macroId}, ${micro.mesoId}, ${micro.id})">🗑️</button>
      </div>
    </div>
  `;
}

function bpRenderMesoOnlyView(container) {
  const allMesos = [];
  bpGetAllMacros().forEach(macro => {
    macro.mesos?.forEach(meso => {
      allMesos.push({...meso, macroId: macro.id});
    });
  });
  
  if (allMesos.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:var(--muted)">
        <p style="margin-bottom:1rem">Aucun mésocycle créé.</p>
        <button onclick="bpEnsureDefaultHierarchy()" class="btn btn-primary" style="margin-bottom:0.5rem">+ Créer un mésocycle</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = allMesos.map(meso => bpRenderMesoOnlyItem(meso)).join('');
}

function bpRenderMesoOnlyItem(meso) {
  const isExpanded = _bpHierarchy.expandedMesos?.has(`${meso.macroId}-${meso.id}`) || false;
  const isArchived = meso.archived;
  const lightMode = bpIsLightMode();
  
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
           onclick="bpToggleExpandMeso(${meso.macroId}, ${meso.id})">
        
        <span style="font-size:0.875rem;transition:transform 0.2s;transform:rotate(${isExpanded ? '90deg' : '0deg'})">▶</span>
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;color:${textColor}">
          MÉSO ${meso.id}
        </span>
        
        <input type="text" value="${bpH(meso.name || '')}" 
               onchange="bpRenameMesoCycle(${meso.macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:100px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.85rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        <input type="text" value="${bpH(meso.focus || '')}" 
               placeholder="Focus..."
               onchange="bpSetMesoFocus(${meso.macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:var(--muted);font-size:0.75rem;font-style:italic">
        
        <span class="badge" style="font-size:0.65rem;background:${isArchived ? 'var(--danger)' : (lightMode ? '#8b5cf6' : 'transparent')};color:${isArchived ? 'white' : (lightMode ? 'white' : '#a78bfa')};border:1px solid ${isArchived ? 'var(--danger)' : (lightMode ? '#7c3aed' : '#a78bfa')}">
          ${meso.micros?.length || 0} micros
        </span>
        
        ${isArchived ? '<span class="badge badge-archived" style="font-size:0.6rem">Archivé</span>' : ''}
        
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpMoveMesoUp(${meso.macroId}, ${meso.id})" title="Monter">⬆️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpMoveMesoDown(${meso.macroId}, ${meso.id})" title="Descendre">⬇️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpDuplicateMesoCycle(${meso.macroId}, ${meso.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpToggleArchiveMeso(${meso.macroId}, ${meso.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="bp-del-meso-${meso.macroId}-${meso.id}" data-c="0" 
                style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpDeleteMesoCycle(${meso.macroId}, ${meso.id})">🗑️</button>
      </div>
      
      ${isExpanded ? bpRenderMicroList(meso.macroId, meso) : ''}
    </div>
  `;
}

function bpRenderMacroItem(macro) {
  const isExpanded = _bpHierarchy.expandedMacros.has(macro.id);
  const isSelected = _bpHierarchy.currentMacro === macro.id;
  const isArchived = macro.archived;
  const lightMode = bpIsLightMode();
  
  const bgColor = isArchived 
    ? (lightMode ? '#e5e7eb' : 'rgba(0,0,0,0)')
    : (lightMode ? '#dbeafe' : 'rgba(0,0,0,0)');
  const borderColor = isSelected 
    ? (lightMode ? '#2563eb' : '#60a5fa') 
    : (isArchived ? (lightMode ? '#d1d5db' : 'var(--border)') : (lightMode ? '#93c5fd' : '#3b82f6'));
  const textColor = isArchived 
    ? (lightMode ? '#6b7280' : 'var(--muted)')
    : (lightMode ? '#1e40af' : '#60a5fa');
  
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
           onclick="bpToggleExpandMacro(${macro.id})">
        
        <span style="font-size:1rem;transition:transform 0.2s;transform:rotate(${isExpanded ? '90deg' : '0deg'})">▶</span>
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1rem;color:${textColor}">
          MACRO ${macro.id}
        </span>
        
        <input type="text" value="${bpH(macro.name)}" 
               onchange="bpRenameMacroCycle(${macro.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:100px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.9rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        <input type="text" value="${bpH(macro.focus)}" 
               placeholder="Focus..."
               onchange="bpSetMacroFocus(${macro.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:var(--muted);font-size:0.8rem;font-style:italic">
        
        <span class="badge" style="font-size:0.65rem;background:${isArchived ? 'var(--danger)' : (lightMode ? '#3b82f6' : 'transparent')};color:${isArchived ? 'white' : (lightMode ? 'white' : '#60a5fa')};border:1px solid ${isArchived ? 'var(--danger)' : (lightMode ? '#2563eb' : '#3b82f6')}">
          ${macro.mesos?.length || 0} mésos
        </span>
        
        ${isArchived ? '<span class="badge badge-archived">Archivé</span>' : ''}
        ${macro.hidden ? '<span class="badge" style="background:var(--muted);color:white;font-size:0.6rem">Masqué client</span>' : ''}
        
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();bpToggleHiddenMacro(${macro.id})" title="Masquer/Afficher pour le client">
          ${macro.hidden ? '🙈' : '👁️'}
        </button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();bpMoveMacroDown(${macro.id})" title="Descendre">⬇️</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();bpDuplicateMacroCycle(${macro.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();bpToggleArchiveMacro(${macro.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="bp-del-macro-${macro.id}" data-c="0" 
                onclick="event.stopPropagation();bpDeleteMacroCycle(${macro.id})">🗑️</button>
      </div>
      
      ${isExpanded ? bpRenderMesoList(macro) : ''}
    </div>
  `;
}

function bpRenderMesoList(macro) {
  const mesos = macro.mesos || [];
  
  return `
    <div style="margin-left:1.5rem;margin-top:0.5rem">
      ${mesos.map(meso => bpRenderMesoItem(macro.id, meso)).join('')}
      
      <button onclick="bpAddMesoCycle(${macro.id})" class="btn btn-ghost btn-sm" 
              style="width:100%;margin-top:0.5rem;padding:0.75rem;text-align:left">
        + Ajouter un mésocycle
      </button>
    </div>
  `;
}

function bpRenderMesoItem(macroId, meso) {
  const key = `${macroId}-${meso.id}`;
  const isExpanded = _bpHierarchy.expandedMesos.has(key);
  const isSelected = _bpHierarchy.currentMeso === meso.id && _bpHierarchy.currentMacro === macroId;
  const isArchived = meso.archived;
  const lightMode = bpIsLightMode();
  
  const bgColor = isArchived 
    ? (lightMode ? '#e5e7eb' : 'rgba(0,0,0,0)')
    : (lightMode ? '#ede9fe' : 'rgba(0,0,0,0)');
  const borderColor = isSelected 
    ? (lightMode ? '#7c3aed' : '#c4b5fd')
    : (isArchived ? (lightMode ? '#d1d5db' : 'var(--border)') : (lightMode ? '#c4b5fd' : '#a78bfa'));
  const textColor = isArchived 
    ? (lightMode ? '#6b7280' : 'var(--muted)')
    : (lightMode ? '#5b21b6' : '#a78bfa');
  
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
           onclick="bpToggleExpandMeso(${macroId}, ${meso.id})">
        
        <span style="font-size:0.875rem;transition:transform 0.2s;transform:rotate(${isExpanded ? '90deg' : '0deg'})">▶</span>
        
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.9rem;color:${textColor}">
          MÉSO ${meso.id}
        </span>
        
        <input type="text" value="${bpH(meso.name)}" 
               onchange="bpRenameMesoCycle(${macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:${isArchived ? 'var(--muted)' : 'var(--text)'};font-size:0.85rem;
                      font-family:'Barlow Condensed',sans-serif;font-weight:700">
        
        <input type="text" value="${bpH(meso.focus)}" 
               placeholder="Focus..."
               onchange="bpSetMesoFocus(${macroId}, ${meso.id}, this.value)"
               onclick="event.stopPropagation()"
               style="flex:1;min-width:80px;background:transparent;border:none;
                      color:var(--muted);font-size:0.75rem;font-style:italic">
        
        <span class="badge" style="font-size:0.6rem;background:${isArchived ? 'var(--danger)' : (lightMode ? '#8b5cf6' : 'transparent')};color:${isArchived ? 'white' : (lightMode ? 'white' : '#a78bfa')};border:1px solid ${isArchived ? 'var(--danger)' : (lightMode ? '#7c3aed' : '#a78bfa')}">
          ${meso.micros?.length || 0} micros
        </span>
        
        ${isArchived ? '<span class="badge badge-archived" style="font-size:0.6rem">Archivé</span>' : ''}
        ${meso.hidden ? '<span class="badge" style="background:var(--muted);color:white;font-size:0.6rem">Masqué client</span>' : ''}
        
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpToggleHiddenMeso(${macroId}, ${meso.id})" title="Masquer/Afficher pour le client">
          ${meso.hidden ? '🙈' : '👁️'}
        </button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpMoveMesoUp(${macroId}, ${meso.id})" title="Monter">⬆️</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpMoveMesoDown(${macroId}, ${meso.id})" title="Descendre">⬇️</button>
        ${bpGetHierarchyLevel() === 'macro' ? `<button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpShowMoveMesoModal(${macroId}, ${meso.id})" title="Déplacer vers un autre macrocycle">↗️</button>` : ''}
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpDuplicateMesoCycle(${macroId}, ${meso.id})" title="Dupliquer">📋</button>
        <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpToggleArchiveMeso(${macroId}, ${meso.id})" title="Archiver/Désarchiver">
          ${isArchived ? '📦↑' : '📦'}
        </button>
        <button class="btn btn-danger btn-sm" id="bp-del-meso-${macroId}-${meso.id}" data-c="0" 
                style="padding:0.25rem 0.5rem;font-size:0.75rem"
                onclick="event.stopPropagation();bpDeleteMesoCycle(${macroId}, ${meso.id})">🗑️</button>
      </div>
      
      ${isExpanded ? bpRenderMicroList(macroId, meso) : ''}
    </div>
  `;
}

function bpRenderMicroList(macroId, meso) {
  const micros = meso.micros || [];
  
  return `
    <div style="margin-left:1.5rem;margin-top:0.5rem">
      ${micros.map(micro => bpRenderMicroItem(macroId, meso.id, micro)).join('')}
      
      <button onclick="bpAddMicroCycle(${macroId}, ${meso.id})" class="btn btn-ghost btn-sm" 
              style="width:100%;margin-top:0.5rem;padding:0.625rem;text-align:left;font-size:0.8rem">
        + Ajouter un microcycle
      </button>
    </div>
  `;
}

function bpRenderMicroItem(macroId, mesoId, micro) {
  const isSelected = _bpHierarchy.currentMicro === micro.id && 
                     _bpHierarchy.currentMeso === mesoId && 
                     _bpHierarchy.currentMacro === macroId;
  const isUnlocked = bpIsMicroUnlocked(macroId, mesoId, micro.id);
  const lightMode = bpIsLightMode();
  
  const activeSessions = micro.sessions_active || [];
  const allSessionKeys = micro.sessions ? Object.keys(micro.sessions) : [];
  const allSessions = [...new Set([...activeSessions, ...allSessionKeys])];
  const sessionCount = allSessions.length;
  
  const bgColor = isSelected 
    ? (lightMode ? '#fef3c7' : 'rgba(0,0,0,0)')
    : (lightMode ? '#f3f4f6' : 'rgba(0,0,0,0)');
  const borderColor = isSelected 
    ? (lightMode ? '#d08000' : '#f0a500')
    : (isUnlocked ? (lightMode ? '#10b981' : '#34d399') : (lightMode ? '#d1d5db' : 'rgba(255,255,255,0.6)'));
  const textColor = isSelected 
    ? (lightMode ? '#92400e' : 'var(--gold)')
    : (lightMode ? '#374151' : 'var(--text)');
  
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
         onclick="bpSelectMicro(${macroId}, ${mesoId}, ${micro.id})">
      
      <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.85rem;color:${textColor}">
        MICRO ${micro.id}
      </span>
      
      <input type="text" value="${bpH(micro.focus)}" 
             onchange="bpRenameMicroCycle(${macroId}, ${mesoId}, ${micro.id}, this.value)"
             onclick="event.stopPropagation()"
             style="flex:1;min-width:60px;background:transparent;border:none;
                    color:${textColor};font-size:0.8rem;font-style:italic">
      
      ${isUnlocked ? `<span class="badge" style="font-size:0.55rem;background:${lightMode ? '#d1fae5' : 'rgba(16,185,129,0.2)'};color:${lightMode ? '#065f46' : 'var(--green)'};border:1px solid ${lightMode ? '#10b981' : 'transparent'}">OUVERT</span>` : ''}
      
      <span class="badge" style="font-size:0.6rem;background:${lightMode ? '#e5e7eb' : 'var(--surface)'};color:${lightMode ? '#374151' : 'var(--muted)'}">
        ${sessionCount} séances
      </span>
      
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem;color:${isUnlocked ? (lightMode ? '#059669' : 'var(--green)') : (lightMode ? '#6b7280' : 'var(--muted)')};border-color:${isUnlocked ? (lightMode ? '#10b981' : 'rgba(16,185,129,0.3)') : (lightMode ? '#d1d5db' : 'var(--border)')}"
              onclick="event.stopPropagation();bpToggleUnlockMicro(${macroId}, ${mesoId}, ${micro.id})" 
              title="${isUnlocked ? 'Verrouiller' : 'Ouvrir'}">
        ${isUnlocked ? '🔓' : '🔒'}
      </button>
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();bpMoveMicroUp(${macroId}, ${mesoId}, ${micro.id})" title="Monter">⬆️</button>
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();bpMoveMicroDown(${macroId}, ${mesoId}, ${micro.id})" title="Descendre">⬇️</button>
      ${bpGetHierarchyLevel() !== 'micro' ? `<button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();bpShowMoveMicroModal(${macroId}, ${mesoId}, ${micro.id})" title="Déplacer vers un autre mésocycle">↗️</button>` : ''}
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();bpDuplicateMicroCycle(${macroId}, ${mesoId}, ${micro.id})" title="Dupliquer">📋</button>
      <button class="btn btn-ghost btn-sm" style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();bpToggleArchiveMicro(${macroId}, ${mesoId}, ${micro.id})" title="Archiver/Désarchiver">
        ${micro.archived ? '📦↑' : '📦'}
      </button>
      <button class="btn btn-danger btn-sm" id="bp-del-micro-${macroId}-${mesoId}-${micro.id}" data-c="0" 
              style="padding:0.25rem 0.5rem;font-size:0.7rem"
              onclick="event.stopPropagation();bpDeleteMicroCycle(${macroId}, ${mesoId}, ${micro.id})">🗑️</button>
    </div>
  `;
}

function bpRenderHierarchySelectors() {
  const container = document.getElementById('bp-hierarchy-selectors');
  if (!container) return;
  
  const hierarchyLevel = bpGetHierarchyLevel();
  const macros = bpGetVisibleMacros();
  
  if (hierarchyLevel === 'micro') {
    const allMicros = bpGetVisibleMicros();
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Microcycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${allMicros.map(m => `
              <button onclick="bpOnMicroButtonClick(${m.macroId || 1}, ${m.mesoId || 1}, ${m.id})" 
                      class="tab-pill ${_bpHierarchy.currentMicro === m.id ? 'on' : 'off'}"
                      style="padding:0.5rem 0.875rem;font-size:0.75rem;
                             ${_bpHierarchy.currentMicro === m.id ? 'border-color:var(--gold);background:rgba(240,165,0,0.15);color:var(--gold)' : ''}"
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
  
  if (hierarchyLevel === 'meso') {
    const firstMacro = macros[0];
    const mesos = firstMacro?.mesos?.filter(m => !m.hidden) || [];
    const currentMacro = bpGetMacroById(_bpHierarchy.currentMacro) || firstMacro;
    const currentMeso = currentMacro ? bpGetMesoById(_bpHierarchy.currentMacro, _bpHierarchy.currentMeso) : null;
    
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Mésocycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${mesos.map(m => `
              <button onclick="bpOnMesoButtonClick(${firstMacro.id}, ${m.id})" 
                      class="tab-pill ${_bpHierarchy.currentMeso === m.id ? 'on' : 'off'}"
                      style="padding:0.5rem 0.875rem;font-size:0.75rem;
                             ${_bpHierarchy.currentMeso === m.id ? 'border-color:rgba(139,92,246,0.5);background:rgba(139,92,246,0.15);color:#a78bfa' : ''}"
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
                const isUnlocked = bpIsMicroUnlocked(currentMacro.id, currentMeso.id, m.id);
                return `
                  <button onclick="bpOnMicroButtonClick(${currentMacro.id}, ${currentMeso.id}, ${m.id})" 
                          class="tab-pill ${_bpHierarchy.currentMicro === m.id ? 'on' : 'off'}"
                          style="padding:0.5rem 0.875rem;font-size:0.75rem;
                                 ${_bpHierarchy.currentMicro === m.id ? 'border-color:var(--gold);background:rgba(240,165,0,0.15);color:var(--gold)' : ''}"
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
  
  const currentMacro = bpGetMacroById(_bpHierarchy.currentMacro);
  const currentMeso = currentMacro ? bpGetMesoById(_bpHierarchy.currentMacro, _bpHierarchy.currentMeso) : null;
  const currentMicro = currentMeso ? bpGetMicroById(_bpHierarchy.currentMacro, _bpHierarchy.currentMeso, _bpHierarchy.currentMicro) : null;
  
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem">
      <div>
        <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                      font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
          Macrocycle
        </label>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
          ${macros.map(m => `
            <button onclick="bpOnMacroButtonClick(${m.id})" 
                    class="tab-pill ${_bpHierarchy.currentMacro === m.id ? 'on' : 'off'}"
                    style="padding:0.5rem 0.875rem;font-size:0.75rem;
                       ${_bpHierarchy.currentMacro === m.id ? 'border-color:rgba(59,130,246,0.5);background:rgba(59,130,246,0.15);color:#60a5fa' : ''}"
                    title="${m.focus || ''}">
              ${m.archived ? '🔒 ' : ''}Macro ${m.id}
            </button>
          `).join('')}
        </div>
      </div>
      
      ${currentMacro ? `
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Mésocycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${currentMacro.mesos?.filter(m => !m.hidden).map(m => `
              <button onclick="bpOnMesoButtonClick(${currentMacro.id}, ${m.id})" 
                      class="tab-pill ${_bpHierarchy.currentMeso === m.id ? 'on' : 'off'}"
                      style="padding:0.5rem 0.875rem;font-size:0.75rem;
                             ${_bpHierarchy.currentMeso === m.id ? 'border-color:rgba(139,92,246,0.5);background:rgba(139,92,246,0.15);color:#a78bfa' : ''}"
                      title="${m.focus || ''}">
                ${m.archived ? '🔒 ' : ''}Méso ${m.id}
              </button>
            `).join('') || '<span style="color:var(--muted);font-size:0.8rem">Aucun mésocycle</span>'}
          </div>
        </div>
      ` : ''}
      
      ${currentMeso ? `
        <div>
          <label style="display:block;font-size:0.6rem;font-family:'Barlow Condensed',sans-serif;
                        font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">
            Microcycle
          </label>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap">
            ${currentMeso.micros?.map(m => {
              const isUnlocked = bpIsMicroUnlocked(currentMacro.id, currentMeso.id, m.id);
              return `
                <button onclick="bpOnMicroButtonClick(${currentMacro.id}, ${currentMeso.id}, ${m.id})" 
                        class="tab-pill ${_bpHierarchy.currentMicro === m.id ? 'on' : 'off'}"
                        style="padding:0.5rem 0.875rem;font-size:0.75rem;
                               ${_bpHierarchy.currentMicro === m.id ? 'border-color:var(--gold);background:rgba(240,165,0,0.15);color:var(--gold)' : ''}"
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

function bpOnMacroButtonClick(macroId) {
  bpSelectMacro(macroId);
  bpRenderHierarchySelectors();
}

function bpOnMesoButtonClick(macroId, mesoId) {
  bpSelectMeso(macroId, mesoId);
  bpRenderHierarchySelectors();
}

function bpOnMicroButtonClick(macroId, mesoId, microId) {
  bpSelectMicro(macroId, mesoId, microId);
  bpRenderHierarchySelectors();
}

function bpH(str) {
  if (!str) return '';
  return str.replace(/[<>&"']/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[m]));
}

async function bpSaveHierarchy() {
  if (!currentBaseProgram || !_bpProgramData.hierarchy) return;
  
  try {
    const cleanHierarchy = JSON.parse(JSON.stringify(_bpProgramData.hierarchy));
    
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', window.APP_ID, 'basePrograms', currentBaseProgram.id),
      { 
        hierarchy: cleanHierarchy,
        cycles: _bpProgramData.cycles || [],
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
    
    console.log('Hierarchy saved for base program:', currentBaseProgram.id);
  } catch (e) {
    console.error('Error saving hierarchy:', e);
    throw e;
  }
}

function bpSyncBaseProgramFromHierarchy() {
  if (!_bpProgramData.hierarchy) return;
  
  const cycles = [];
  _bpProgramData.hierarchy.macros.forEach(macro => {
    macro.mesos?.forEach(meso => {
      meso.micros?.forEach(micro => {
        cycles.push({
          id: micro.id,
          focus: micro.focus,
          sessions: micro.sessions || {},
          sessions_active: micro.sessions_active || []
        });
      });
    });
  });
  
  _bpProgramData.cycles = cycles;
}

function bpUpdateAddTopCycleButton() {
  const btn = document.getElementById('bp-btn-add-top-cycle');
  if (!btn) return;
  
  const hierarchyLevel = bpGetHierarchyLevel();
  
  if (hierarchyLevel === 'micro') {
    btn.textContent = '+ MICROCYCLE';
  } else if (hierarchyLevel === 'meso') {
    btn.textContent = '+ MÉSOCYCLE';
  } else {
    btn.textContent = '+ MACROCYCLE';
  }
}

async function bpEnsureDefaultHierarchy() {
  if (!_bpProgramData.hierarchy || !_bpProgramData.hierarchy.macros.length) {
    await bpAddMacroCycle();
  }
}

async function bpAddMicroWithAutoParents() {
  const hierarchyLevel = bpGetHierarchyLevel();
  
  if (hierarchyLevel === 'micro') {
    const macros = bpGetAllMacros();
    if (macros.length === 0) {
      const macroId = await bpAddMacroCycle();
      const macro = bpGetMacroById(macroId);
      const mesoId = await bpAddMesoCycle(macroId);
      await bpAddMicroCycle(macroId, mesoId);
    } else {
      const macro = macros[0];
      if (!macro.mesos || macro.mesos.length === 0) {
        const mesoId = await bpAddMesoCycle(macro.id);
        await bpAddMicroCycle(macro.id, mesoId);
      } else {
        await bpAddMicroCycle(macro.id, macro.mesos[0].id);
      }
    }
  }
}

function bpMoveMacroUp(macroId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const index = hierarchy.macros.findIndex(m => m.id === macroId);
  if (index <= 0) return;
  
  [hierarchy.macros[index], hierarchy.macros[index - 1]] = 
  [hierarchy.macros[index - 1], hierarchy.macros[index]];
  
  hierarchy.macros.forEach((m, i) => {
    m.id = i + 1;
    m.name = m.name.replace(/MacroCycle \d+/, `MacroCycle ${i + 1}`);
  });
  
  bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Macrocycle déplacé vers le haut', 's');
}

function bpMoveMacroDown(macroId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const index = hierarchy.macros.findIndex(m => m.id === macroId);
  if (index === -1 || index >= hierarchy.macros.length - 1) return;
  
  [hierarchy.macros[index], hierarchy.macros[index + 1]] = 
  [hierarchy.macros[index + 1], hierarchy.macros[index]];
  
  hierarchy.macros.forEach((m, i) => {
    m.id = i + 1;
    m.name = m.name.replace(/MacroCycle \d+/, `MacroCycle ${i + 1}`);
  });
  
  bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Macrocycle déplacé vers le bas', 's');
}

function bpMoveMesoUp(macroId, mesoId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const index = macro.mesos.findIndex(m => m.id === mesoId);
  if (index <= 0) return;
  
  [macro.mesos[index], macro.mesos[index - 1]] = 
  [macro.mesos[index - 1], macro.mesos[index]];
  
  macro.mesos.forEach((m, i) => {
    m.id = i + 1;
    m.name = `MesoCycle ${i + 1}`;
  });
  
  bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Mésocycle déplacé vers le haut', 's');
}

function bpMoveMesoDown(macroId, mesoId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const index = macro.mesos.findIndex(m => m.id === mesoId);
  if (index === -1 || index >= macro.mesos.length - 1) return;
  
  [macro.mesos[index], macro.mesos[index + 1]] = 
  [macro.mesos[index + 1], macro.mesos[index]];
  
  macro.mesos.forEach((m, i) => {
    m.id = i + 1;
    m.name = `MesoCycle ${i + 1}`;
  });
  
  bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Mésocycle déplacé vers le bas', 's');
}

function bpMoveMicroUp(macroId, mesoId, microId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const meso = macro.mesos.find(m => m.id === mesoId);
  if (!meso || !meso.micros) return;
  
  const index = meso.micros.findIndex(m => m.id === microId);
  if (index <= 0) return;
  
  [meso.micros[index], meso.micros[index - 1]] = 
  [meso.micros[index - 1], meso.micros[index]];
  
  meso.micros.forEach((m, i) => {
    m.id = i + 1;
  });
  
  bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Microcycle déplacé vers le haut', 's');
}

function bpMoveMicroDown(macroId, mesoId, microId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const macro = hierarchy.macros.find(m => m.id === macroId);
  if (!macro || !macro.mesos) return;
  
  const meso = macro.mesos.find(m => m.id === mesoId);
  if (!meso || !meso.micros) return;
  
  const index = meso.micros.findIndex(m => m.id === microId);
  if (index === -1 || index >= meso.micros.length - 1) return;
  
  [meso.micros[index], meso.micros[index + 1]] = 
  [meso.micros[index + 1], meso.micros[index]];
  
  meso.micros.forEach((m, i) => {
    m.id = i + 1;
  });
  
  bpSaveHierarchy();
  bpRenderHierarchy();
  toast('Microcycle déplacé vers le bas', 's');
}

function bpShowMoveMesoModal(macroId, mesoId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
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
          <button onclick="bpMoveMesoToMacro(${mesoId}, ${macroId}, ${m.id}); closeModal()" 
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

async function bpMoveMesoToMacro(mesoId, sourceMacroId, targetMacroId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy) return;
  
  const sourceMacro = hierarchy.macros.find(m => m.id === sourceMacroId);
  const targetMacro = hierarchy.macros.find(m => m.id === targetMacroId);
  
  if (!sourceMacro || !targetMacro) return;
  
  const mesoIndex = sourceMacro.mesos.findIndex(m => m.id === mesoId);
  if (mesoIndex === -1) return;
  
  const meso = sourceMacro.mesos[mesoIndex];
  sourceMacro.mesos.splice(mesoIndex, 1);
  
  meso.id = bpGetNextMesoId(targetMacroId);
  if (!targetMacro.mesos) targetMacro.mesos = [];
  targetMacro.mesos.push(meso);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast('Mésocycle déplacé', 's');
}

function bpShowMoveMicroModal(macroId, mesoId, microId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy || !hierarchy.macros) return;
  
  const currentMacro = hierarchy.macros.find(m => m.id === macroId);
  const otherMacros = hierarchy.macros.filter(m => m.id !== macroId);
  
  const modalContent = `
    <div style="padding:1.5rem">
      <h3 style="margin-bottom:1rem">Déplacer le microcycle</h3>
      <p style="margin-bottom:1rem;color:var(--muted)">Où voulez-vous déplacer ce microcycle ?</p>
      
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <button onclick="bpShowMoveMicroModal_Step2(${macroId}, ${mesoId}, ${microId}, ${macroId})" 
                class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
          📁 Reste dans le macrocycle actuel (${currentMacro?.name || `MacroCycle ${macroId}`})
        </button>
        
        ${otherMacros.map(m => `
          <button onclick="bpShowMoveMicroModal_Step2(${macroId}, ${mesoId}, ${microId}, ${m.id})" 
                  class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
            📁 Déplacer vers ${m.name || `MacroCycle ${m.id}`}
          </button>
        `).join('')}
      </div>
      <button onclick="closeModal()" class="btn btn-ghost" style="margin-top:1rem;width:100%">Annuler</button>
    </div>
  `;
  
  showModal(modalContent);
}

function bpShowMoveMicroModal_Step2(macroId, mesoId, microId, targetMacroId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy) return;
  
  const targetMacro = hierarchy.macros.find(m => m.id === targetMacroId);
  if (!targetMacro) return;
  
  const modalContent = `
    <div style="padding:1.5rem">
      <h3 style="margin-bottom:1rem">Choisir le mésocycle de destination</h3>
      <p style="margin-bottom:1rem;color:var(--muted)">Dans quel mésocycle voulez-vous déplacer ce microcycle ?</p>
      
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${targetMacro.mesos?.map(m => `
          <button onclick="bpMoveMicroToMeso(${microId}, ${macroId}, ${mesoId}, ${targetMacroId}, ${m.id}); closeModal()" 
                  class="btn btn-secondary" style="text-align:left;padding:0.75rem 1rem">
            📂 ${m.name || `MesoCycle ${m.id}`} (${m.micros?.length || 0} micros)
          </button>
        `).join('') || '<p style="color:var(--muted)">Aucun mésocycle disponible</p>'}
      </div>
      <button onclick="closeModal()" class="btn btn-ghost" style="margin-top:1rem;width:100%">Annuler</button>
    </div>
  `;
  
  showModal(modalContent);
}

async function bpMoveMicroToMeso(microId, sourceMacroId, sourceMesoId, targetMacroId, targetMesoId) {
  const hierarchy = _bpProgramData.hierarchy;
  if (!hierarchy) return;
  
  const sourceMacro = hierarchy.macros.find(m => m.id === sourceMacroId);
  const targetMacro = hierarchy.macros.find(m => m.id === targetMacroId);
  
  if (!sourceMacro || !targetMacro) return;
  
  const sourceMeso = sourceMacro.mesos.find(m => m.id === sourceMesoId);
  const targetMeso = targetMacro.mesos.find(m => m.id === targetMesoId);
  
  if (!sourceMeso || !targetMeso) return;
  
  const microIndex = sourceMeso.micros.findIndex(m => m.id === microId);
  if (microIndex === -1) return;
  
  const micro = sourceMeso.micros[microIndex];
  sourceMeso.micros.splice(microIndex, 1);
  
  micro.id = bpGetNextMicroId(targetMacroId, targetMesoId);
  if (!targetMeso.micros) targetMeso.micros = [];
  targetMeso.micros.push(micro);
  
  await bpSaveHierarchy();
  bpSyncBaseProgramFromHierarchy();
  bpRenderHierarchy();
  
  toast('Microcycle déplacé', 's');
}

async function bpSaveHierarchy() {
  if (!currentBaseProgram) {
    console.warn('bpSaveHierarchy: No currentBaseProgram set');
    return;
  }
  
  try {
    // Nettoyer les données de la hiérarchie
    const cleanHierarchy = JSON.parse(JSON.stringify(_bpProgramData.hierarchy || { macros: [] }));
    
    // Convertir la hiérarchie en cycles plats pour compatibilité
    const cycles = [];
    (cleanHierarchy.macros || []).forEach(macro => {
      (macro.mesos || []).forEach(meso => {
        (meso.micros || []).forEach(micro => {
          cycles.push({
            id: micro.id,
            focus: micro.focus || '',
            sessions: micro.sessions || {},
            sessions_active: micro.sessions_active || []
          });
        });
      });
    });
    
    // Sauvegarder dans Firestore
    await window.fdb.setDoc(
      window.fdb.doc(window.db, 'apps', APP_ID, 'basePrograms', currentBaseProgram.id),
      {
        ...currentBaseProgram,
        hierarchy: cleanHierarchy,
        cycles: cycles,
        updatedAt: new Date().toISOString()
      }
    );
    
    // Mettre à jour la copie locale
    currentBaseProgram.hierarchy = cleanHierarchy;
    currentBaseProgram.cycles = cycles;
    _bpProgramData.hierarchy = cleanHierarchy;
    _bpProgramData.cycles = cycles;
    
    // Mettre à jour allBasePrograms
    const bpIdx = allBasePrograms.findIndex(p => p.id === currentBaseProgram.id);
    if (bpIdx !== -1) {
      allBasePrograms[bpIdx] = currentBaseProgram;
    }
    
    console.log('Hierarchy saved for base program:', currentBaseProgram.id);
  } catch (e) {
    console.error('Error saving hierarchy:', e);
    toast('Erreur sauvegarde hiérarchie', 'e');
    throw e;
  }
}

function bpSyncBaseProgramFromHierarchy() {
  // Synchronise les cycles plats depuis la hiérarchie
  if (!_bpProgramData.hierarchy) return;
  
  const cycles = [];
  (_bpProgramData.hierarchy.macros || []).forEach(macro => {
    (macro.mesos || []).forEach(meso => {
      (meso.micros || []).forEach(micro => {
        cycles.push({
          id: micro.id,
          focus: micro.focus || '',
          sessions: micro.sessions || {},
          sessions_active: micro.sessions_active || []
        });
      });
    });
  });
  
  _bpProgramData.cycles = cycles;
}

// Export des fonctions globales
window.bpSaveHierarchy = bpSaveHierarchy;
window.bpSyncBaseProgramFromHierarchy = bpSyncBaseProgramFromHierarchy;
window.bpRenderHierarchy = bpRenderHierarchy;
window.bpRenderHierarchySelectors = bpRenderHierarchySelectors;
window.bpSelectMicro = bpSelectMicro;
window.bpSelectMeso = bpSelectMeso;
window.bpSelectMacro = bpSelectMacro;
window.bpToggleExpandMacro = bpToggleExpandMacro;
window.bpToggleExpandMeso = bpToggleExpandMeso;
window.bpAddMacroCycle = bpAddMacroCycle;
window.bpAddMesoCycle = bpAddMesoCycle;
window.bpAddMicroCycle = bpAddMicroCycle;
window.bpDeleteMacroCycle = bpDeleteMacroCycle;
window.bpDeleteMesoCycle = bpDeleteMesoCycle;
window.bpDeleteMicroCycle = bpDeleteMicroCycle;
window.bpDuplicateMacroCycle = bpDuplicateMacroCycle;
window.bpDuplicateMesoCycle = bpDuplicateMesoCycle;
window.bpDuplicateMicroCycle = bpDuplicateMicroCycle;
window.bpToggleArchiveMacro = bpToggleArchiveMacro;
window.bpToggleArchiveMeso = bpToggleArchiveMeso;
window.bpToggleArchiveMicro = bpToggleArchiveMicro;
window.bpRenameMacroCycle = async (id, name) => { const m = bpGetMacroById(id); if(m) { m.name = name; await bpSaveHierarchy(); bpRenderHierarchy(); toast('Renommé', 's'); }};
window.bpSetMacroFocus = bpSetMacroFocus;
window.bpRenameMesoCycle = bpRenameMesoCycle;
window.bpSetMesoFocus = bpSetMesoFocus;
window.bpRenameMicroCycle = bpRenameMicroCycle;
window.bpMoveMacroUp = bpMoveMacroUp;
window.bpMoveMacroDown = bpMoveMacroDown;
window.bpMoveMesoUp = bpMoveMesoUp;
window.bpMoveMesoDown = bpMoveMesoDown;
window.bpMoveMicroUp = bpMoveMicroUp;
window.bpMoveMicroDown = bpMoveMicroDown;
window.bpToggleUnlockMicro = bpToggleUnlockMicro;
window.bpEnsureDefaultHierarchy = bpEnsureDefaultHierarchy;
window.bpAddMicroWithAutoParents = bpAddMicroWithAutoParents;
window.bpShowMoveMesoModal = bpShowMoveMesoModal;
window.bpShowMoveMicroModal = bpShowMoveMicroModal;
window.bpMoveMesoToMacro = bpMoveMesoToMacro;
window.bpMoveMicroToMeso = bpMoveMicroToMeso;
window.bpShowMoveMicroModal_Step2 = bpShowMoveMicroModal_Step2;
window.bpOnMacroButtonClick = bpOnMacroButtonClick;
window.bpOnMesoButtonClick = bpOnMesoButtonClick;
window.bpOnMicroButtonClick = bpOnMicroButtonClick;

// Helper exports for editor
window.bpGetAllMicros = bpGetAllMicros;
window.bpGetMicroById = bpGetMicroById;
window.bpGetAllMacros = bpGetAllMacros;
window.bpGetMacroById = bpGetMacroById;
window.bpGetMesoById = bpGetMesoById;
