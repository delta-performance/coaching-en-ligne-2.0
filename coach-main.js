async function loadAllData() {
  try {
    ensureCoachSelectInClientModal();
    const snap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'clients'));
    allClients = []; snap.forEach(d => allClients.push({ id:d.id, ...d.data() }));
    if (isCoachUser()) {
      allClients = allClients.filter(c => canManageClient(c));
    }
    const gsnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'groups'));
    allGroups = []; gsnap.forEach(d => allGroups.push({ id:d.id, ...d.data() }));
    const dbsnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'exerciseDb'));
    window.exerciseDb = []; dbsnap.forEach(d => window.exerciseDb.push({ id:d.id, ...d.data() }));
    const usnap = await window.fdb.getDocs(window.fdb.collection(window.db,'apps',APP_ID,'users'));
    coachesList = [];
    usnap.forEach(d => {
      const u = d.data() || {};
      if (u.role === 'coach' || u.role === 'admin') coachesList.push({ uid: d.id, role: u.role, name: u.displayName || d.id });
    });
    renderCoachSelectOptions();
    renderClientsGrid(); populateGroupSelects(); populateTransferSelects();
    renderGroupes();
  } catch(e) { console.error(e); toast('Erreur chargement','e'); }
}

function ensureCoachSelectInClientModal() {
  if (document.getElementById('nc-coach')) return;
  const container = document.querySelector('#modal-add-client .card div[style*="flex-direction:column"]');
  if (!container) return;
  const wrap = document.createElement('div');
  wrap.id = 'nc-coach-wrap';
  wrap.innerHTML = `<label style="display:block;font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-bottom:.5rem">Coach assigné</label>
    <select id="nc-coach" class="inp"><option value="">Aucun coach</option></select>`;
  container.appendChild(wrap);
}

function renderCoachSelectOptions() {
  const sel = document.getElementById('nc-coach');
  const wrap = document.getElementById('nc-coach-wrap');
  if (!sel || !wrap) return;
  
  const admins = coachesList.filter(c => c.role === 'admin');
  const coaches = coachesList.filter(c => c.role === 'coach');
  
  let html = '<option value="">Aucun coach</option>';
  
  if (admins.length > 0) {
    html += '<optgroup label="👑 Administrateurs">';
    html += admins.map(c => `<option value="${c.uid}">${h(c.name)}</option>`).join('');
    html += '</optgroup>';
  }
  
  if (coaches.length > 0) {
    html += '<optgroup label="📋 Coachs">';
    html += coaches.map(c => `<option value="${c.uid}">${h(c.name)}</option>`).join('');
    html += '</optgroup>';
  }
  
  sel.innerHTML = html;
  if (isCoachUser()) {
    wrap.style.display = 'none';
    sel.value = currentUser.uid;
  } else {
    wrap.style.display = '';
  }
}

// ── CLIENTS GRID ──────────────────────────────────────
function renderClientsGrid() {
  const g = document.getElementById('clients-grid'); if (!g) return;
  const filterGroup = document.getElementById('filter-group').value;
  const showArchived = document.getElementById('show-archived').checked;
  const base = getVisibleClients();
  let list = base.filter(c => {
    if (!showArchived && c.archived) return false;
    if (filterGroup && c.group !== filterGroup) return false;
    return true;
  });
  if (!list.length) { g.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun client.</p>'; return; }
  g.innerHTML = list.map(c => `
    <div class="card-hover" onclick="openClientFiche('${c.id}')" style="${c.archived?'opacity:.6':''}">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
        <div style="width:3rem;height:3rem;border-radius:1rem;background:linear-gradient(135deg,var(--brand),var(--brand2));display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.4rem;font-weight:900;font-style:italic;color:white;flex-shrink:0">${((c.name||c.code||'?')[0]).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h(c.name||'—')}</div>
          <div style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase;letter-spacing:.1em;color:var(--gold)">CODE: ${h(c.code||'—')}</div>
        </div>
      </div>
      ${c.group?`<span class="badge badge-group" style="margin-bottom:.75rem;display:inline-block">${h(allGroups.find(g=>g.id===c.group)?.name||c.group)}</span>`:''}
      ${c.archived?`<span class="badge badge-archived" style="margin-bottom:.75rem;display:inline-block;margin-left:.5rem">Archivé</span>`:''}
      ${c.objectif?`<p style="font-size:.75rem;color:var(--muted);font-style:italic;margin-bottom:.875rem">${h(c.objectif)}</p>`:''}
      ${isAdminUser() ? `<div style="display:flex;justify-content:flex-end;gap:.5rem" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="toggleArchiveClient('${c.id}')">${c.archived?'Désarchiver':'Archiver'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteClient('${c.id}')">Suppr.</button>
      </div>` : ''}
    </div>`).join('');
}

async function openClientFiche(clientId) {
  const c = allClients.find(x => x.id === clientId); if (!c || !canManageClient(c)) return;
  currentClient = c;
  document.getElementById('fiche-client-name').innerText = c.name||c.code;
  document.getElementById('fiche-client-code').innerText = 'CODE: '+(c.code||'—');
  document.getElementById('ctab-fiche').style.display = '';
  switchCoachTab('fiche');
  switchSubTab('profile');
  await loadClientData(clientId);
  await loadClientPR();
  await loadClientDocuments();
  await loadWeightHistory();
  
  rebuildEditorSelects(); populateVisuSelect();
  
  // Afficher le bouton de chat flottant pour ce client
  if (typeof showCoachChatButton === 'function') showCoachChatButton(clientId);
}

async function toggleArchiveClient(clientId) {
  if (!isAdminUser()) { toast('Action reservee a l admin', 'w'); return; }
  const c = allClients.find(x => x.id === clientId); if (!c) return;
  c.archived = !c.archived;
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId), c);
  toast(c.archived?'Client archivé':'Client désarchivé', c.archived?'w':'s');
  renderClientsGrid();
}

let _delClientPending = null;
async function deleteClient(clientId) {
  if (!isAdminUser()) { toast('Action reservee a l admin', 'w'); return; }
  if (_delClientPending !== clientId) { _delClientPending = clientId; setTimeout(()=>_delClientPending=null, 3000); toast('Cliquez encore pour confirmer','w',3000); return; }
  _delClientPending = null;
  
  try {
    // Supprimer toutes les collections de données du client
    const clientRef = window.fdb.collection(window.db,'apps',APP_ID,'clients',clientId);
    
    // Supprimer les logs
    const logsSnap = await window.fdb.getDocs(clientRef.collection('logs'));
    const deletePromises = logsSnap.docs.map(doc => window.fdb.deleteDoc(doc.ref));
    
    // Supprimer les sous-collections connues
    const subCollections = ['data', 'documents'];
    for (const subCol of subCollections) {
      const subSnap = await window.fdb.getDocs(clientRef.collection(subCol));
      deletePromises.push(...subSnap.docs.map(doc => window.fdb.deleteDoc(doc.ref)));
    }
    
    // Attendre la suppression de toutes les sous-collections
    await Promise.all(deletePromises);
    
    // Supprimer le document client principal
    await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId));
    
    // Si le client a un compte Firebase Auth, le supprimer aussi
    const client = allClients.find(c => c.id === clientId);
    if (client?.authUid && isAdminUser()) {
      try {
        const sec = window.getSecondaryAuth();
        await sec.deleteUser(client.authUid);
        await sec.signOut();
      } catch (e) {
        console.warn('Impossible de supprimer le compte Firebase Auth:', e);
      }
    }
    
    allClients = allClients.filter(c => c.id !== clientId);
    toast('Client et toutes ses données supprimés','i'); 
    renderClientsGrid(); 
    populateTransferSelects();
  } catch (e) {
    console.error('Erreur suppression client:', e);
    toast('Erreur lors de la suppression','e');
  }
}

async function createClient() {
  if (!currentUser || !currentUser.isCoach) return;
  const name = document.getElementById('nc-prenom').value.trim();
  const code = document.getElementById('nc-code').value.trim().toUpperCase();
  const objectif = document.getElementById('nc-objectif').value.trim();
  const group = document.getElementById('nc-group').value;
  const selectedCoachUid = document.getElementById('nc-coach')?.value || '';
  
  if (!name||!code) { toast('Nom et code requis','w'); return; }
  if (allClients.find(c => c.code === code)) { toast('Code déjà utilisé','w'); return; }
  
  const newId = 'client_'+Date.now();
  const coachUid = isCoachUser() ? currentUser.uid : selectedCoachUid;
  
  const clientPayload = { 
    name, 
    code, 
    objectif, 
    group, 
    coachUid, 
    archived:false, 
    createdAt:new Date().toISOString() 
  };
  
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',newId), clientPayload);
  
  // Crée automatiquement Cycle 1 sans séance
  const initProg = [{
    id: 1, focus: 'Cycle 1', sessions_active: [],
    sessions: {
      A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      B: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      C: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      D: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
    }
  }];
  
  // Créer la hiérarchie pour le nouveau client
  const initHierarchy = {
    macros: [{
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
          sessions: initProg[0].sessions,
          sessions_active: [],
          archived: false
        }]
      }]
    }]
  };
  
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',newId,'data','hierarchy'), initHierarchy);
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',newId,'data','unlock'), { unlocked: [1], archived: [] });
  
  closeModal('modal-add-client');
  ['nc-prenom','nc-code','nc-objectif'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  toast(name + ' créé ! Code: ' + code, 's');
  await loadAllData();
}

// ── GROUPES ───────────────────────────────────────────

async function toggleArchiveClient(clientId) {
  if (!isAdminUser()) { toast('Action reservee a l admin', 'w'); return; }
  const c = allClients.find(x => x.id === clientId); if (!c) return;
  const updated = { ...c, archived: !c.archived };
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',clientId), updated);
  const idx = allClients.findIndex(x => x.id === clientId);
  if (idx !== -1) allClients[idx] = updated;
  if (currentClient?.id === clientId) currentClient = updated;
  toast(updated.archived ? 'Client archivé' : 'Client désarchivé', 'i');
  renderClientProfile();
  renderClientsGrid();
}
function populateGroupSelects() {
  const opts = allGroups.map(g => `<option value="${g.id}">${h(g.name)}</option>`).join('');
  ['filter-group','nc-group'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    const base = id==='filter-group' ? '<option value="">Tous les groupes</option>' : '<option value="">Aucun groupe</option>';
    el.innerHTML = base + opts;
  });
}

function renderGroupes() {
  const el = document.getElementById('groupes-list'); if (!el) return;
  if (!allGroups.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun groupe créé.</p>'; return; }
  const groupClients = getVisibleClients();
  const activeCoaches = coachesList.filter(c => !c.archived);
  
  el.innerHTML = allGroups.map(g => {
    const members = groupClients.filter(c => c.group === g.id && !c.archived);
    const membersWithoutCoach = members.filter(c => !c.coachUid);
    
    return `<div class="card" style="padding:1.5rem">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">${h(g.name)}</h4>
          <p style="font-size:.75rem;color:var(--muted);margin-top:.25rem">${members.length} client(s)${membersWithoutCoach > 0 ? ` · <span style="color:var(--danger)">${membersWithoutCoach} sans coach</span>` : ''}</p>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          ${members.length > 0 && isAdminUser() ? `
            <button class="btn btn-primary btn-sm" onclick="openAssignGroupCoachModal('${g.id}', '${h(g.name)}')">➕ Assigner coach</button>
          ` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteGroup('${g.id}')">Supprimer</button>
        </div>
      </div>
      
      ${members.length > 0 ? `
        <div style="display:flex;flex-direction:column;gap:.5rem">
          ${members.map(c => {
            const coach = activeCoaches.find(co => co.uid === c.coachUid);
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem .75rem;background:var(--surface);border-radius:.375rem">
              <div style="display:flex;align-items:center;gap:.5rem;cursor:pointer;flex:1;min-width:0" onclick="openClientFiche('${c.id}')">
                <span class="badge" style="background:var(--card);color:var(--text);border:1px solid var(--border);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">${h(c.name||c.code)}</span>
              </div>
              <div style="display:flex;align-items:center;gap:.5rem">
                ${coach ? `
                  <span style="font-size:.7rem;color:var(--gold);white-space:nowrap">👤 ${h(coach.name)}</span>
                ` : `<span style="font-size:.7rem;color:var(--danger);white-space:nowrap">👤 Sans coach</span>`}
                ${isAdminUser() ? `
                  <button onclick="event.stopPropagation();openAssignSingleClientModal('${c.id}', '${h(c.name || c.code)}')" class="btn btn-ghost btn-sm" style="padding:.2rem .4rem;font-size:.65rem">➕</button>
                ` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      ` : '<p style="font-size:.75rem;color:var(--muted);font-style:italic">Aucun membre actif.</p>'}
    </div>`;
  }).join('');
}

// ── ASSIGNATION COACH AUX GROUPES ─────────────────────────

function openAssignGroupCoachModal(groupId, groupName) {
  const groupClients = allClients.filter(c => c.group === groupId && !c.archived);
  const clientsWithoutCoach = groupClients.filter(c => !c.coachUid);
  const activeCoaches = coachesList.filter(c => !c.archived);
  
  if (groupClients.length === 0) { toast('Aucun client dans ce groupe', 'w'); return; }
  if (activeCoaches.length === 0) { toast('Aucun coach disponible', 'w'); return; }
  
  const modalHtml = `
    <div id="modal-assign-group-coach" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;max-height:85vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">➕ Assigner coach à ${h(groupName)}</h3>
          <button onclick="document.getElementById('modal-assign-group-coach').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="background:var(--surface);padding:1rem;border-radius:.75rem;margin-bottom:1.5rem">
          <p style="font-size:.8rem;color:var(--muted);margin-bottom:.5rem"><strong>${groupClients.length}</strong> client(s) dans ce groupe</p>
          ${clientsWithoutCoach.length > 0 ? `<p style="font-size:.8rem;color:var(--danger)"><strong>${clientsWithoutCoach.length}</strong> sans coach</p>` : ''}
        </div>
        
        <div style="margin-bottom:1.5rem">
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Coach à assigner</label>
          <div style="display:flex;flex-direction:column;gap:.5rem">
            ${activeCoaches.map(c => `
              <button onclick="confirmAssignGroupCoach('${groupId}', '${c.uid}', '${h(c.name || c.uid)}')" 
                      class="btn btn-ghost" style="justify-content:flex-start;text-align:left;padding:1rem">
                <div style="display:flex;align-items:center;gap:.75rem">
                  <div style="width:32px;height:32px;border-radius:50%;background:${c.role === 'admin' ? 'var(--danger)' : 'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:900;color:#1a0900">
                    ${(c.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif">${h(c.name || c.uid)}${c.role === 'admin' ? ' <span style="color:var(--danger)">(Admin)</span>' : ''}</div>
                    <div style="font-size:.65rem;color:var(--muted)">${allClients.filter(cl => cl.coachUid === c.uid && !cl.archived).length} clients assignés</div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
        
        <div style="background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);padding:1rem;border-radius:.75rem;margin-bottom:1.5rem">
          <p style="font-size:.75rem;color:var(--muted)">⚠️ Cela assignera le coach à <strong>tous les clients</strong> de ce groupe, y compris ceux qui ont déjà un coach.</p>
        </div>
        
        <button onclick="document.getElementById('modal-assign-group-coach').remove()" class="btn" style="width:100%">Annuler</button>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-assign-group-coach');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function confirmAssignGroupCoach(groupId, coachUid, coachName) {
  const groupClients = allClients.filter(c => c.group === groupId && !c.archived);
  
  try {
    let assigned = 0;
    for (const client of groupClients) {
      client.coachUid = coachUid;
      await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
      assigned++;
    }
    
    toast(`${assigned} client(s) du groupe assigné(s) à ${coachName}`, 's');
    document.getElementById('modal-assign-group-coach').remove();
    renderGroupes();
    renderClientsGrid();
    renderCoachsList();
  } catch(e) {
    console.error('Erreur assignation groupe:', e);
    toast('Erreur lors de l\'assignation', 'e');
  }
}

async function createGroup() {
  if (!isAdminUser()) { toast('Action reservee a l admin', 'w'); return; }
  const name = document.getElementById('new-group-name').value.trim();
  if (!name) { toast('Nom requis','w'); return; }
  const newId = 'group_'+Date.now();
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'groups',newId), { name, createdAt:new Date().toISOString() });
  closeModal('modal-add-group');
  document.getElementById('new-group-name').value = '';
  toast('Groupe "'+name+'" créé !','s'); await loadAllData();
}

async function deleteGroup(groupId) {
  if (!isAdminUser()) { toast('Action reservee a l admin', 'w'); return; }
  await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'groups',groupId));
  const affected = allClients.filter(c => c.group === groupId);
  for (const c of affected) { c.group = ''; await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',c.id), c); }
  toast('Groupe supprimé (clients conservés)','i'); await loadAllData();
}

// ── TABS ──────────────────────────────────────────────
// Fonction manquante isAdminUser
function isAdminUser() {
  return currentUser && (currentUser.role === 'admin' || currentUser.role === 'administrateur');
}

// Version simple de renderAllMessages au cas où chat.js ne se charge pas
async function renderAllMessages() {
  console.log('>>> renderAllMessages (backup) CALLED');
  
  // Ne forcer l'affichage que si le bouton Messages est actif
  const messagesBtn = document.getElementById('ctab-messages');
  const isMessagesActive = messagesBtn && messagesBtn.classList.contains('on');
  
  if (!isMessagesActive) {
    console.log('>>> Messages tab not active, skipping render');
    return;
  }
  
  // Forcer l'affichage du tab messages seulement si on est sur l'onglet Messages
  const messagesTab = document.getElementById('coach-messages');
  if (messagesTab && messagesTab.classList.contains('hidden')) {
    messagesTab.classList.remove('hidden');
    console.log('>>> Forced coach-messages visible');
  }
  
  const container = document.getElementById('messages-list');
  if (!container) {
    console.error('messages-list introuvable');
    return;
  }
  
  try {
    // Charger les clients depuis Firestore
    const clientsRef = window.fdb.collection(window.db, 'apps', APP_ID, 'clients');
    const clientsSnap = await window.fdb.getDocs(clientsRef);
    
    const clients = [];
    clientsSnap.forEach(doc => {
      const c = { id: doc.id, ...doc.data() };
      if (!c.archived) clients.push(c);
    });
    
    if (clients.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Aucun client trouvé.</p>';
      return;
    }
    
    // Afficher les clients
    const html = clients.map(client => `
      <div onclick="openClientChatFromMessages('${client.id}')" 
           style="display:flex;align-items:center;gap:1rem;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:1rem;cursor:pointer;margin-bottom:.5rem;">
        <div style="width:3rem;height:3rem;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:900;color:white;">
          ${(client.name || client.code || '?')[0].toUpperCase()}
        </div>
        <div style="flex:1">
          <div style="font-weight:900;font-size:1rem;text-transform:uppercase">${client.name || client.code}</div>
          <p style="font-size:.85rem;color:var(--muted);margin:0;">Cliquez pour ouvrir le chat</p>
        </div>
      </div>
    `).join('');
    
    container.innerHTML = html;
    console.log('>>> Messages rendered -', clients.length, 'clients');
    
  } catch (e) {
    console.error('>>> ERROR:', e);
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem">Erreur: ${e.message}</p>`;
  }
}

function switchCoachTab(tab) {
  console.log('>>> switchCoachTab called with:', tab);
  
  console.log('>>> Step 1: Checking admin');
  if (!isAdminUser() && ['groupes','transfer','database','coachs','baseprograms'].includes(tab)) {
    console.log('>>> Redirecting to clients (not admin)');
    tab = 'clients';
  }
  
  console.log('>>> Step 2: Toggling tabs');
  ['clients','fiche','groupes','transfer','database','coachs','baseprograms','messages'].forEach(t => {
    const el = document.getElementById('coach-'+t); 
    if (el) {
      el.classList.toggle('hidden', t!==tab);
      console.log('>>> Toggled', t, 'hidden:', t!==tab);
    }
    const btn = document.getElementById('ctab-'+t); 
    if (btn) {
      btn.className = 'tab-pill '+(t===tab?'on':'off');
      console.log('>>> Set button', t, 'class:', btn.className);
    }
  });
  
  console.log('>>> Step 3: Running tab-specific functions');
  if (tab==='transfer') {
    console.log('>>> Calling populateTransferSelects');
    populateTransferSelects();
  }
  if (tab==='coachs') {
    console.log('>>> Calling renderCoachsList');
    renderCoachsList();
  }
  if (tab==='database') {
    console.log('>>> Calling database functions');
    updateDbFilterDropdowns(); 
    renderDatabase(); 
  }
  if (tab==='baseprograms' && typeof loadBasePrograms === 'function') {
    console.log('>>> Calling loadBasePrograms');
    loadBasePrograms();
  }
  
  // Cacher la bulle de chat quand on quitte la fiche client
  if (tab==='clients' && typeof hideCoachChatButton === 'function') {
    console.log('>>> Hiding coach chat button');
    hideCoachChatButton();
  }
  
  if (tab==='messages') {
    console.log('>>> Messages tab selected, renderAllMessages exists:', typeof renderAllMessages);
    if (typeof renderAllMessages === 'function') {
      console.log('>>> Scheduling renderAllMessages with delay');
      setTimeout(() => renderAllMessages(), 50);
    } else {
      console.error('>>> renderAllMessages does not exist!');
    }
  }
  
  console.log('>>> switchCoachTab completed');
}

let _editorDirty = false;
let _pendingCallback = null;

function markEditorDirty() { _editorDirty = true; }
function clearEditorDirty() { _editorDirty = false; }

function _confirmLeaveEditor(callback) {
  if (!_editorDirty) { callback(); return; }
  _pendingCallback = callback;
  
  const modalHtml = `
    <div id="modal-confirm-leave" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:450px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border)">
        <div style="display:flex;align-items:center;justify-content:center;margin-bottom:1.5rem">
          <div style="width:60px;height:60px;border-radius:50%;background:rgba(240,165,0,0.1);display:flex;align-items:center;justify-content:center;font-size:2rem">⚠️</div>
        </div>
        
        <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;text-align:center;margin-bottom:1rem">Modifications non enregistrées</h3>
        <p style="color:var(--muted);text-align:center;margin-bottom:1.5rem;font-size:.9rem">Vous avez des modifications dans l'éditeur de séance. Que souhaitez-vous faire ?</p>
        
        <div style="display:flex;flex-direction:column;gap:.75rem">
          <button onclick="_saveAndLeaveEditor()" class="btn btn-primary" style="padding:1rem;display:flex;align-items:center;justify-content:center;gap:.5rem">
            💾 Enregistrer et quitter
          </button>
          <button onclick="_leaveWithoutSaving()" class="btn btn-warning" style="padding:1rem;display:flex;align-items:center;justify-content:center;gap:.5rem;background:rgba(239,68,68,0.1);color:var(--danger);border-color:rgba(239,68,68,0.3)">
            ⚠️ Quitter sans enregistrer
          </button>
          <button onclick="_cancelLeaveEditor()" class="btn btn-ghost" style="padding:1rem">
            ❌ Rester dans l'éditeur
          </button>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-confirm-leave');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function _saveAndLeaveEditor() {
  // Sauvegarder puis quitter
  document.getElementById('modal-confirm-leave').remove();
  try {
    await saveFullSession();
    _editorDirty = false;
    if (_pendingCallback) {
      _pendingCallback();
      _pendingCallback = null;
    }
  } catch(e) {
    console.error('Erreur sauvegarde:', e);
    toast('Erreur lors de la sauvegarde', 'e');
  }
}

function _leaveWithoutSaving() {
  document.getElementById('modal-confirm-leave').remove();
  _editorDirty = false;
  if (_pendingCallback) {
    _pendingCallback();
    _pendingCallback = null;
  }
}

function _cancelLeaveEditor() {
  document.getElementById('modal-confirm-leave').remove();
  _pendingCallback = null;
}

function switchSubTab(tab) {
  if (tab !== 'editor' && _editorDirty) { _confirmLeaveEditor(() => _doSwitchSubTab(tab)); return; }
  _doSwitchSubTab(tab);
}

function _doSwitchSubTab(tab) {
  ['logs','cycles','editor','visu','profile','records','progression','documents','chat'].forEach(t => {
    const el = document.getElementById('sub-'+t); if (!el) return;
    if (t==='cycles') { el.style.display=(t===tab)?'flex':'none'; el.classList.toggle('hidden',t!==tab); }
    else { el.classList.toggle('hidden',t!==tab); }
    const btn = document.getElementById('stab-'+t); if (btn) btn.className = 'sub-tab-pill '+(t===tab?'on':'off');
  });
  if (tab==='logs') renderLogs();
  if (tab==='cycles') { loadHierarchy().then(() => renderHierarchy()); }
  if (tab==='editor') { loadHierarchy().then(() => { renderHierarchySelectors(); rebuildEditorSelects(); syncEditor(); }); }
  if (tab==='visu') { loadHierarchy().then(() => { populateVisuSelect(); renderVisu(); }); }
  if (tab==='profile') renderClientProfile();
  if (tab==='records') renderClientPR();
  if (tab==='progression') renderClientProgression();
  if (tab==='documents') renderDocumentsTab();
  if (tab==='chat') { /* Chat panel is handled separately via openCoachChat() */ }
}

// ── LOGS ──────────────────────────────────────────────
function renderLogs() {
  const body = document.getElementById('logs-body'); if (!body) return;
  const sorted = Object.values(clientLogs).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
  if (!sorted.length) { body.innerHTML = '<tr><td colspan="6" style="padding:3rem;text-align:center;color:var(--muted);font-style:italic">Aucun log.</td></tr>'; return; }
  body.innerHTML = sorted.map(l => {
    const d = new Date(l.timestamp).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    // Détecter si c'est une clé ancienne ou nouvelle (nouvelle: macro-meso-micro-séance)
    const idParts = l.id.split('-');
    let locationLabel = '';
    if (idParts.length === 4) {
      // Format: macro-meso-micro-séance
      locationLabel = `Ma${idParts[0]}–Mé${idParts[1]}–C${idParts[2]}–S${idParts[3]}`;
    } else if (idParts.length === 2) {
      // Format ancien: micro-séance
      locationLabel = `C${l.cycle}–S${l.type}`;
    } else {
      locationLabel = `C${l.cycle}–S${l.type}`;
    }
    return `<tr class="db-row">
      <td><input type="checkbox" name="log-sel" value="${l.id}" onchange="updateBulk()" style="accent-color:var(--gold)"></td>
      <td style="font-size:.7rem;color:var(--muted);font-family:'Barlow Condensed',sans-serif;font-weight:700;font-style:italic;text-transform:uppercase">${d}</td>
      <td style="font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:900;font-style:italic">${locationLabel}</td>
      <td style="text-align:center"><span class="badge" style="background:var(--gold);color:#1a0900">${l.rpe}/10</span></td>
      <td style="font-size:.75rem;color:var(--muted);font-style:italic;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.comment||'—'}</td>
      <td style="text-align:right"><button class="btn btn-danger btn-sm" onclick="resetLog('${l.id}')">Reset</button></td>
    </tr>`;
  }).join('');
}

let _resetPending = null;
async function resetLog(id) {
  if (!currentClient) return;
  if (_resetPending !== id) { _resetPending = id; setTimeout(()=>_resetPending=null,3000); toast('Cliquez encore pour confirmer','w',3000); return; }
  _resetPending = null;
  await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'logs',id));
  toast('Séance réinitialisée','i');
}
function toggleAllLogs(src) { document.getElementsByName('log-sel').forEach(c => c.checked = src.checked); updateBulk(); }
function updateBulk() {
  const n = document.querySelectorAll('input[name="log-sel"]:checked').length;
  const btn = document.getElementById('btn-bulk');
  if (n > 0) { btn.classList.remove('hidden'); btn.innerText = 'RESET ('+n+')'; } else btn.classList.add('hidden');
}
async function bulkDelete() {
  if (!currentClient) return;
  const sel = Array.from(document.querySelectorAll('input[name="log-sel"]:checked')).map(i => i.value);
  if (!sel.length) return;
  const batch = window.fdb.writeBatch(window.db);
  sel.forEach(id => batch.delete(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'logs',id)));
  await batch.commit(); toast(sel.length+' réinitialisée(s)','i');
}

// ── UNLOCK ────────────────────────────────────────────
function renderUnlockGrid() {
  const g = document.getElementById('unlock-grid'); if (!g) return;
  g.innerHTML = clientProgram.map(c => {
    const on = clientUnlocked.has(c.id); const arc = clientArchived.has(c.id);
    return `<label onclick="toggleUnlock(${c.id})" style="display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:.75rem;border-radius:1rem;border:1px solid ${on?'rgba(240,165,0,.5)':'var(--border)'};background:${on?'rgba(240,165,0,.08)':'var(--surface)'};cursor:pointer">
      <span style="font-family:'Barlow Condensed',sans-serif;font-size:.65rem;font-weight:900;font-style:italic;text-transform:uppercase;color:${on?'var(--gold)':'var(--muted)'}">C${c.id}</span>
      ${arc?'<span style="font-size:.5rem;color:var(--muted)">arch.</span>':''}
      <div style="width:1.25rem;height:1.25rem;border-radius:.375rem;border:2px solid ${on?'var(--gold)':'var(--muted)'};background:${on?'var(--gold)':'transparent'};display:flex;align-items:center;justify-content:center">
        ${on?'<svg style="width:.7rem;height:.7rem;color:#1a0900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"/></svg>':''}
      </div>
    </label>`;
  }).join('');
}
function toggleUnlock(id) { if (clientUnlocked.has(id)) clientUnlocked.delete(id); else clientUnlocked.add(id); renderUnlockGrid(); }
async function saveUnlock() {
  if (!currentClient) return;
  try { await saveClientUnlock(currentClient.id); renderClientGrid(); toast('Accès enregistré','s'); }
  catch(e) { toast('Erreur','e'); }
}

// ── COACHS MANAGEMENT (Admin uniquement) ────────────────

let _selectedClientsForTransfer = new Set();

function switchCoachSubTab(tab) {
  ['gestion', 'transfert'].forEach(t => {
    const el = document.getElementById('coachs-' + t);
    if (el) el.classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('coach-sub-' + t);
    if (btn) btn.className = 'sub-tab-pill ' + (t === tab ? 'on' : 'off');
  });
  if (tab === 'transfert') populateTransferCoachSelects();
}

function renderCoachsList() {
  const container = document.getElementById('coachs-list');
  if (!container) return;
  
  // Séparer par catégorie
  const admins = coachesList.filter(c => !c.archived && c.role === 'admin');
  const activeCoaches = coachesList.filter(c => !c.archived && c.role !== 'admin');
  const archivedCoaches = coachesList.filter(c => c.archived);
  
  // Clients sans coach
  const clientsWithoutCoach = allClients.filter(c => !c.archived && (!c.coachUid || c.coachUid === ''));
  
  let html = '';
  
  // Section Admins
  if (admins.length > 0) {
    html += '<div style="margin-bottom:2rem"><h4 style="font-size:1rem;font-weight:900;text-transform:uppercase;color:var(--danger);margin-bottom:1rem">👑 Administrateurs</h4>';
    html += admins.map(coach => renderCoachCard(coach, false)).join('');
    html += '</div>';
  }
  
  // Section Coachs Actifs
  if (activeCoaches.length === 0) {
    html += '<div style="margin-bottom:2rem"><h4 style="font-size:1rem;font-weight:900;text-transform:uppercase;color:var(--gold);margin-bottom:1rem">📋 Coachs Actifs</h4>';
    html += '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucun coach actif.</p>';
    html += '</div>';
  } else {
    html += '<div style="margin-bottom:2rem"><h4 style="font-size:1rem;font-weight:900;text-transform:uppercase;color:var(--gold);margin-bottom:1rem">📋 Coachs Actifs</h4>';
    html += activeCoaches.map(coach => renderCoachCard(coach, false)).join('');
    html += '</div>';
  }
  
  // Section Coachs Archivés
  if (archivedCoaches.length > 0) {
    html += '<div style="opacity:0.7;margin-bottom:2rem"><h4 style="font-size:1rem;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:1rem">📦 Coachs Archivés</h4>';
    html += archivedCoaches.map(coach => renderCoachCard(coach, true)).join('');
    html += '</div>';
  }
  
  // Section Clients Sans Coach
  html += renderClientsWithoutCoachSection(clientsWithoutCoach);
  
  container.innerHTML = html;
}

function renderClientsWithoutCoachSection(clients) {
  const clientCount = clients.length;
  
  return `
    <div class="card" style="padding:1.5rem;background:linear-gradient(135deg, var(--surface) 0%, rgba(239,68,68,0.05) 100%);border:1px solid rgba(239,68,68,0.2)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
        <div>
          <h4 style="font-size:1rem;font-weight:900;text-transform:uppercase;color:var(--danger);margin-bottom:.25rem">👤 Clients Sans Coach</h4>
          <div style="font-size:.8rem;color:var(--muted)">${clientCount} client${clientCount > 1 ? 's' : ''} non assigné${clientCount > 1 ? 's' : ''}</div>
        </div>
        ${clientCount > 0 ? `
          <button onclick="openAssignClientsModal()" class="btn btn-primary btn-sm">
            ➕ Assigner à un coach
          </button>
        ` : ''}
      </div>
      
      ${clientCount > 0 ? `
        <div style="display:flex;flex-direction:column;gap:.5rem;max-height:200px;overflow-y:auto;padding:.5rem;background:var(--card);border-radius:.5rem">
          ${clients.slice(0, 10).map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem .75rem;background:var(--surface);border-radius:.375rem">
              <div>
                <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif;font-size:.9rem">${h(c.name || c.code)}</div>
                <div style="font-size:.65rem;color:var(--muted)">${c.email || 'Pas d\'email'}</div>
              </div>
              <button onclick="openAssignSingleClientModal('${c.id}', '${h(c.name || c.code)}')" class="btn btn-ghost btn-sm" style="padding:.25rem .5rem;font-size:.7rem">
                ➕ Assigner
              </button>
            </div>
          `).join('')}
          ${clientCount > 10 ? `<div style="text-align:center;padding:.5rem;color:var(--muted);font-size:.7rem">... et ${clientCount - 10} autres</div>` : ''}
        </div>
      ` : '<p style="color:var(--muted);font-style:italic;text-align:center;padding:1rem">Tous les clients ont un coach assigné ✅</p>'}
    </div>
  `;
}

// ── ASSIGNATION CLIENTS ──────────────────────────────────

function openAssignClientsModal() {
  const clientsWithoutCoach = allClients.filter(c => !c.archived && (!c.coachUid || c.coachUid === ''));
  const admins = coachesList.filter(c => !c.archived && c.role === 'admin');
  const coaches = coachesList.filter(c => !c.archived && c.role === 'coach');
  
  if (clientsWithoutCoach.length === 0) { toast('Aucun client sans coach', 'w'); return; }
  if ((admins.length + coaches.length) === 0) { toast('Aucun coach disponible', 'w'); return; }
  
  const modalHtml = `
    <div id="modal-assign-clients" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;max-height:85vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">➕ Assigner des clients</h3>
          <button onclick="document.getElementById('modal-assign-clients').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="margin-bottom:1.5rem">
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Coach destinataire</label>
          <select id="assign-coach-select" class="inp" style="margin-bottom:1rem">
            <option value="">-- Choisir un coach --</option>
            ${admins.length > 0 ? `
              <optgroup label="👑 Administrateurs">
                ${admins.map(c => `<option value="${c.uid}">${h(c.name || c.uid)}</option>`).join('')}
              </optgroup>
            ` : ''}
            ${coaches.length > 0 ? `
              <optgroup label="📋 Coachs">
                ${coaches.map(c => `<option value="${c.uid}">${h(c.name || c.uid)}</option>`).join('')}
              </optgroup>
            ` : ''}
          </select>
        </div>
        
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">
            Clients à assigner (${clientsWithoutCoach.length})
          </label>
          <div style="display:flex;gap:.5rem;margin-bottom:.75rem">
            <button onclick="selectAllAssignClients(true)" class="btn btn-ghost btn-sm">Tout sélectionner</button>
            <button onclick="selectAllAssignClients(false)" class="btn btn-ghost btn-sm">Tout désélectionner</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:.5rem;max-height:250px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:.5rem">
            ${clientsWithoutCoach.map(c => `
              <label style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--card);border-radius:.5rem;cursor:pointer;transition:all .2s" 
                     onmouseover="this.style.background='rgba(240,165,0,0.1)'" onmouseout="this.style.background='var(--card)'">
                <input type="checkbox" class="assign-client-check" value="${c.id}" checked>
                <div style="flex:1">
                  <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif">${h(c.name || c.code)}</div>
                  <div style="font-size:.7rem;color:var(--muted)">${c.email || 'Pas d\'email'}</div>
                </div>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div style="display:flex;gap:.5rem">
          <button onclick="confirmAssignClients()" class="btn btn-primary" style="flex:1">➕ Assigner</button>
          <button onclick="document.getElementById('modal-assign-clients').remove()" class="btn" style="flex:1">Annuler</button>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-assign-clients');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function selectAllAssignClients(select) {
  const checkboxes = document.querySelectorAll('.assign-client-check');
  checkboxes.forEach(cb => cb.checked = select);
}

async function confirmAssignClients() {
  const coachUid = document.getElementById('assign-coach-select')?.value;
  if (!coachUid) { toast('Veuillez choisir un coach', 'w'); return; }
  
  const checkboxes = document.querySelectorAll('.assign-client-check:checked');
  if (checkboxes.length === 0) { toast('Veuillez sélectionner au moins un client', 'w'); return; }
  
  const clientIds = Array.from(checkboxes).map(cb => cb.value);
  
  try {
    let assigned = 0;
    for (const clientId of clientIds) {
      const client = allClients.find(c => c.id === clientId);
      if (client) {
        client.coachUid = coachUid;
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
        assigned++;
      }
    }
    
    const coachName = coachesList.find(c => c.uid === coachUid)?.name || 'Coach';
    toast(`${assigned} client(s) assigné(s) à ${coachName}`, 's');
    document.getElementById('modal-assign-clients').remove();
    renderCoachsList();
    renderClientsGrid();
  } catch(e) {
    console.error('Erreur assignation clients:', e);
    toast('Erreur lors de l\'assignation', 'e');
  }
}

function openAssignSingleClientModal(clientId, clientName) {
  const activeCoaches = coachesList.filter(c => !c.archived);
  
  if (activeCoaches.length === 0) { toast('Aucun coach disponible', 'w'); return; }
  
  const modalHtml = `
    <div id="modal-assign-single" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:400px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">➕ Assigner ${h(clientName)}</h3>
          <button onclick="document.getElementById('modal-assign-single').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="margin-bottom:1.5rem">
          <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Choisir un coach</label>
          <div style="display:flex;flex-direction:column;gap:.5rem">
            ${activeCoaches.map(c => `
              <button onclick="confirmAssignSingleClient('${clientId}', '${c.uid}', '${h(c.name || c.uid)}')" 
                      class="btn btn-ghost" style="justify-content:flex-start;text-align:left;padding:1rem">
                <div style="display:flex;align-items:center;gap:.75rem">
                  <div style="width:32px;height:32px;border-radius:50%;background:${c.role === 'admin' ? 'var(--danger)' : 'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:900;color:#1a0900">
                    ${(c.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif">${h(c.name || c.uid)}${c.role === 'admin' ? ' <span style="color:var(--danger)">(Admin)</span>' : ''}</div>
                    <div style="font-size:.65rem;color:var(--muted)">${allClients.filter(cl => cl.coachUid === c.uid && !cl.archived).length} clients</div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
        
        <button onclick="document.getElementById('modal-assign-single').remove()" class="btn" style="width:100%">Annuler</button>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-assign-single');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function confirmAssignSingleClient(clientId, coachUid, coachName) {
  try {
    const client = allClients.find(c => c.id === clientId);
    if (client) {
      client.coachUid = coachUid;
      await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
    }
    
    toast(`${client.name || client.code} assigné à ${coachName}`, 's');
    document.getElementById('modal-assign-single').remove();
    renderCoachsList();
    renderClientsGrid();
  } catch(e) {
    console.error('Erreur assignation client:', e);
    toast('Erreur lors de l\'assignation', 'e');
  }
}

// ── MODIFIER COACH ───────────────────────────────────────
function renderCoachCard(coach, isArchived) {
  const assignedClients = allClients.filter(c => c.coachUid === coach.uid && !c.archived);
  const clientCount = assignedClients.length;
  const archivedClientsCount = allClients.filter(c => c.coachUid === coach.uid && c.archived).length;
  
  return `
    <div class="card" style="padding:1.5rem;${isArchived ? 'border-left:3px solid var(--muted);opacity:0.8' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1rem">
        <div style="display:flex;align-items:center;gap:.75rem;flex:1;min-width:0">
          <div style="width:40px;height:40px;border-radius:50%;background:${isArchived ? 'var(--muted)' : 'var(--gold)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:900;color:#1a0900;flex-shrink:0">
            ${(coach.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div style="min-width:0;overflow:hidden">
            <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isArchived ? 'text-decoration:line-through;color:var(--muted)' : ''}">${h(coach.name || 'Sans nom')}${isArchived ? ' (ARCHIVÉ)' : ''}</div>
            <div style="font-size:.7rem;color:var(--muted)">${coach.role === 'admin' ? '👑 Admin' : '📋 Coach'}</div>
          </div>
        </div>
        
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;flex-shrink:0">
          ${coach.uid !== currentUser.uid ? `
            ${!isArchived ? `
              <button onclick="openEditCoachModal('${coach.uid}')" class="btn btn-ghost btn-sm" style="padding:.4rem .6rem;font-size:.7rem">
                ✏️
              </button>
              <button onclick="openArchiveCoachModal('${coach.uid}', '${h(coach.name || 'ce coach')}')" class="btn btn-warning btn-sm" style="padding:.4rem .6rem;font-size:.7rem">
                📦
              </button>
            ` : `
              <button onclick="reactivateCoach('${coach.uid}')" class="btn btn-success btn-sm" style="padding:.4rem .6rem;font-size:.7rem">
                ✅
              </button>
            `}
            <button onclick="openDeleteCoachModal('${coach.uid}', '${h(coach.name || 'ce coach')}')" class="btn btn-danger btn-sm" style="padding:.4rem .6rem;font-size:.7rem">
              🗑️
            </button>
          ` : '<span style="font-size:.7rem;color:var(--muted);font-style:italic;padding:.4rem">Vous</span>'}
        </div>
      </div>
      
      <div style="font-size:.75rem;color:var(--muted);padding-left:3.25rem">
        ${clientCount} client${clientCount > 1 ? 's' : ''} actif${clientCount > 1 ? 's' : ''}
        ${archivedClientsCount > 0 ? ` · ${archivedClientsCount} archivé${archivedClientsCount > 1 ? 's' : ''}` : ''}
        ${clientCount > 0 ? `<div style="margin-top:.5rem;color:var(--gold);font-size:.7rem">${assignedClients.map(c => c.name || c.code).slice(0,3).join(', ')}${clientCount > 3 ? '...' : ''}</div>` : ''}
      </div>
    </div>
  `;
}

// ── MODIFIER COACH ───────────────────────────────────────

function openEditCoachModal(coachUid) {
  const coach = coachesList.find(c => c.uid === coachUid);
  if (!coach) return;
  
  const modalHtml = `
    <div id="modal-edit-coach" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:400px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">✏️ Modifier Coach</h3>
          <button onclick="document.getElementById('modal-edit-coach').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:1rem">
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Nom du coach</label>
            <input type="text" id="edit-coach-name" class="inp" value="${h(coach.name || '')}" placeholder="Nom du coach">
          </div>
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Rôle</label>
            <select id="edit-coach-role" class="inp">
              <option value="coach" ${coach.role === 'coach' ? 'selected' : ''}>📋 Coach</option>
              <option value="admin" ${coach.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Email</label>
            <input type="email" id="edit-coach-email" class="inp" value="${h(coach.email || '')}" placeholder="email@exemple.com">
          </div>
          <div style="display:flex;gap:.5rem;margin-top:1rem">
            <button onclick="saveCoachEdit('${coachUid}')" class="btn btn-primary" style="flex:1">💾 Enregistrer</button>
            <button onclick="document.getElementById('modal-edit-coach').remove()" class="btn" style="flex:1">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-edit-coach');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function saveCoachEdit(coachUid) {
  if (!isAdminUser()) { toast('Action réservée à l\'admin', 'w'); return; }
  
  const name = document.getElementById('edit-coach-name')?.value?.trim();
  const role = document.getElementById('edit-coach-role')?.value;
  const email = document.getElementById('edit-coach-email')?.value?.trim();
  
  if (!name) { toast('Le nom est requis', 'w'); return; }
  
  try {
    const coachRef = window.fdb.doc(window.db, 'apps', APP_ID, 'users', coachUid);
    const updateData = { displayName: name, role: role };
    if (email) updateData.email = email;
    
    await window.fdb.updateDoc(coachRef, updateData);
    
    // Mettre à jour la liste locale
    const coach = coachesList.find(c => c.uid === coachUid);
    if (coach) {
      coach.name = name;
      coach.role = role;
      if (email) coach.email = email;
    }
    
    toast('Coach modifié avec succès', 's');
    document.getElementById('modal-edit-coach').remove();
    renderCoachsList();
  } catch(e) {
    console.error('Erreur modification coach:', e);
    toast('Erreur lors de la modification', 'e');
  }
}

// ── ARCHIVER COACH ───────────────────────────────────────

function openArchiveCoachModal(coachUid, coachName) {
  const coach = coachesList.find(c => c.uid === coachUid);
  const assignedClients = allClients.filter(c => c.coachUid === coachUid && !c.archived);
  const clientCount = assignedClients.length;
  
  const modalHtml = `
    <div id="modal-archive-coach" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">📦 Archiver ${h(coachName)}</h3>
          <button onclick="document.getElementById('modal-archive-coach').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        ${clientCount > 0 ? `
          <div style="background:var(--surface);padding:1rem;border-radius:.75rem;margin-bottom:1.5rem">
            <p style="margin-bottom:1rem"><strong>${clientCount} client${clientCount > 1 ? 's' : ''}</strong> sera${clientCount > 1 ? 'ont' : ''} affecté${clientCount > 1 ? 's' : ''} par cette action :</p>
            <div style="font-size:.8rem;color:var(--muted);margin-bottom:1rem">
              ${assignedClients.slice(0,5).map(c => `• ${h(c.name || c.code)}`).join('<br>')}
              ${clientCount > 5 ? `<br>... et ${clientCount - 5} autres` : ''}
            </div>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Que faire de ces clients ?</label>
            <div style="display:flex;flex-direction:column;gap:.5rem">
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(240,165,0,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="archive-option" value="archive-clients" checked>
                <span>📦 Archiver aussi les clients</span>
              </label>
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(240,165,0,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="archive-option" value="transfer">
                <span>🔄 Transférer à un autre coach</span>
              </label>
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(240,165,0,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="archive-option" value="no-coach">
                <span>👤 Laisser sans coach</span>
              </label>
            </div>
          </div>
          
          <div id="archive-transfer-select" style="display:none;margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Coach destinataire</label>
            <select id="archive-new-coach" class="inp">
              <option value="">-- Choisir un coach --</option>
              ${coachesList.filter(c => c.uid !== coachUid && !c.archived).map(c => `<option value="${c.uid}">${h(c.name || c.uid)}</option>`).join('')}
            </select>
          </div>
        ` : '<p style="color:var(--muted);font-style:italic;margin-bottom:1.5rem">Ce coach n\'a aucun client assigné.</p>'}
        
        <div style="display:flex;gap:.5rem">
          <button onclick="confirmArchiveCoach('${coachUid}', '${h(coachName)}', ${clientCount})" class="btn btn-warning" style="flex:1">📦 Archiver</button>
          <button onclick="document.getElementById('modal-archive-coach').remove()" class="btn" style="flex:1">Annuler</button>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-archive-coach');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Gérer l'affichage du select de transfert
  if (clientCount > 0) {
    setTimeout(() => {
      const radios = document.querySelectorAll('input[name="archive-option"]');
      radios.forEach(radio => {
        radio.addEventListener('change', () => {
          const transferSelect = document.getElementById('archive-transfer-select');
          if (transferSelect) {
            transferSelect.style.display = radio.value === 'transfer' ? 'block' : 'none';
          }
        });
      });
    }, 100);
  }
}

async function confirmArchiveCoach(coachUid, coachName, clientCount) {
  if (!isAdminUser()) { toast('Action réservée à l\'admin', 'w'); return; }
  
  let option = 'no-action';
  if (clientCount > 0) {
    const selected = document.querySelector('input[name="archive-option"]:checked');
    if (selected) option = selected.value;
  }
  
  try {
    const assignedClients = allClients.filter(c => c.coachUid === coachUid && !c.archived);
    
    // Gérer les clients selon l'option choisie
    if (option === 'archive-clients') {
      // Archiver les clients
      for (const client of assignedClients) {
        client.archived = true;
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
      }
    } else if (option === 'transfer') {
      const newCoachUid = document.getElementById('archive-new-coach')?.value;
      if (!newCoachUid) { toast('Veuillez choisir un coach destinataire', 'w'); return; }
      
      for (const client of assignedClients) {
        client.coachUid = newCoachUid;
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
      }
    } else if (option === 'no-coach' || clientCount === 0) {
      // Laisser sans coach
      for (const client of assignedClients) {
        client.coachUid = '';
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
      }
    }
    
    // Archiver le coach
    const coachRef = window.fdb.doc(window.db, 'apps', APP_ID, 'users', coachUid);
    await window.fdb.updateDoc(coachRef, { archived: true });
    
    // Mettre à jour la liste locale
    const coach = coachesList.find(c => c.uid === coachUid);
    if (coach) coach.archived = true;
    
    toast(`${coachName} archivé avec succès`, 's');
    document.getElementById('modal-archive-coach').remove();
    renderCoachsList();
    renderClientsGrid();
  } catch(e) {
    console.error('Erreur archivage coach:', e);
    toast('Erreur lors de l\'archivage', 'e');
  }
}

async function reactivateCoach(coachUid) {
  if (!isAdminUser()) { toast('Action réservée à l\'admin', 'w'); return; }
  
  const coach = coachesList.find(c => c.uid === coachUid);
  if (!coach) return;
  
  try {
    const coachRef = window.fdb.doc(window.db, 'apps', APP_ID, 'users', coachUid);
    await window.fdb.updateDoc(coachRef, { archived: false });
    
    coach.archived = false;
    toast(`${coach.name || 'Coach'} réactivé avec succès`, 's');
    renderCoachsList();
  } catch(e) {
    console.error('Erreur réactivation coach:', e);
    toast('Erreur lors de la réactivation', 'e');
  }
}

// ── SUPPRIMER COACH (avec options clients) ──────────────

function openDeleteCoachModal(coachUid, coachName) {
  if (!isAdminUser()) { toast('Action réservée à l\'admin', 'w'); return; }
  if (coachUid === currentUser.uid) { toast('Vous ne pouvez pas vous supprimer vous-même', 'w'); return; }
  
  const coach = coachesList.find(c => c.uid === coachUid);
  const assignedClients = allClients.filter(c => c.coachUid === coachUid && !c.archived);
  const clientCount = assignedClients.length;
  
  const modalHtml = `
    <div id="modal-delete-coach" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--danger)">🗑️ Supprimer ${h(coachName)}</h3>
          <button onclick="document.getElementById('modal-delete-coach').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);padding:1rem;border-radius:.75rem;margin-bottom:1.5rem">
          <p style="color:var(--danger);font-weight:700;margin-bottom:.5rem">⚠️ Cette action est IRRÉVERSIBLE</p>
          <p style="font-size:.8rem;color:var(--muted)">Le coach sera définitivement supprimé. Vous devez choisir ce qu'il advient de ses clients.</p>
        </div>
        
        ${clientCount > 0 ? `
          <div style="background:var(--surface);padding:1rem;border-radius:.75rem;margin-bottom:1.5rem">
            <p style="margin-bottom:1rem"><strong>${clientCount} client${clientCount > 1 ? 's' : ''}</strong> sera${clientCount > 1 ? 'ont' : ''} affecté${clientCount > 1 ? 's' : ''} :</p>
            <div style="font-size:.8rem;color:var(--muted);margin-bottom:1rem">
              ${assignedClients.slice(0,5).map(c => `• ${h(c.name || c.code)}`).join('<br>')}
              ${clientCount > 5 ? `<br>... et ${clientCount - 5} autres` : ''}
            </div>
          </div>
          
          <div style="margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem">Que faire de ces clients ?</label>
            <div style="display:flex;flex-direction:column;gap:.5rem">
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="delete-option" value="archive-clients" checked>
                <span>📦 Archiver les clients</span>
              </label>
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="delete-option" value="transfer">
                <span>🔄 Transférer à un autre coach</span>
              </label>
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="delete-option" value="no-coach">
                <span>👤 Laisser sans coach</span>
              </label>
              <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;padding:.75rem;background:var(--surface);border-radius:.5rem;transition:all .2s" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='var(--surface)'">
                <input type="radio" name="delete-option" value="delete-clients">
                <span style="color:var(--danger)">🗑️ Supprimer aussi les clients (IRREVERSIBLE)</span>
              </label>
            </div>
          </div>
          
          <div id="delete-transfer-select" style="display:none;margin-bottom:1.5rem">
            <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Coach destinataire</label>
            <select id="delete-new-coach" class="inp">
              <option value="">-- Choisir un coach --</option>
              ${coachesList.filter(c => c.uid !== coachUid && !c.archived).map(c => `<option value="${c.uid}">${h(c.name || c.uid)}</option>`).join('')}
            </select>
          </div>
        ` : '<p style="color:var(--muted);font-style:italic;margin-bottom:1.5rem">Ce coach n\'a aucun client assigné.</p>'}
        
        <div style="display:flex;gap:.5rem">
          <button onclick="confirmDeleteCoach('${coachUid}', '${h(coachName)}', ${clientCount})" class="btn btn-danger" style="flex:1">🗑️ Supprimer</button>
          <button onclick="document.getElementById('modal-delete-coach').remove()" class="btn" style="flex:1">Annuler</button>
        </div>
      </div>
    </div>
  `;
  
  const oldModal = document.getElementById('modal-delete-coach');
  if (oldModal) oldModal.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Gérer l'affichage du select de transfert
  if (clientCount > 0) {
    setTimeout(() => {
      const radios = document.querySelectorAll('input[name="delete-option"]');
      radios.forEach(radio => {
        radio.addEventListener('change', () => {
          const transferSelect = document.getElementById('delete-transfer-select');
          if (transferSelect) {
            transferSelect.style.display = radio.value === 'transfer' ? 'block' : 'none';
          }
        });
      });
    }, 100);
  }
}

async function confirmDeleteCoach(coachUid, coachName, clientCount) {
  if (!isAdminUser()) { toast('Action réservée à l\'admin', 'w'); return; }
  
  let option = 'no-action';
  if (clientCount > 0) {
    const selected = document.querySelector('input[name="delete-option"]:checked');
    if (selected) option = selected.value;
  }
  
  try {
    const assignedClients = allClients.filter(c => c.coachUid === coachUid && !c.archived);
    let archivedCount = 0;
    let transferredCount = 0;
    let deletedCount = 0;
    
    // Gérer les clients selon l'option choisie
    if (option === 'archive-clients') {
      for (const client of assignedClients) {
        client.archived = true;
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
        archivedCount++;
      }
    } else if (option === 'transfer') {
      const newCoachUid = document.getElementById('delete-new-coach')?.value;
      if (!newCoachUid) { toast('Veuillez choisir un coach destinataire', 'w'); return; }
      
      for (const client of assignedClients) {
        client.coachUid = newCoachUid;
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
        transferredCount++;
      }
    } else if (option === 'delete-clients') {
      // Supprimer les clients définitivement
      for (const client of assignedClients) {
        await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id));
        deletedCount++;
      }
      // Mettre à jour la liste locale
      allClients = allClients.filter(c => c.coachUid !== coachUid);
    } else if (option === 'no-coach' || clientCount === 0) {
      for (const client of assignedClients) {
        client.coachUid = '';
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
      }
    }
    
    // Supprimer le coach
    await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'users',coachUid));
    
    // Mettre à jour la liste locale
    coachesList = coachesList.filter(c => c.uid !== coachUid);
    
    let message = `${coachName} supprimé`;
    if (archivedCount > 0) message += `. ${archivedCount} client(s) archivé(s)`;
    if (transferredCount > 0) message += `. ${transferredCount} client(s) transféré(s)`;
    if (deletedCount > 0) message += `. ${deletedCount} client(s) supprimé(s)`;
    
    toast(message, 's');
    document.getElementById('modal-delete-coach').remove();
    renderCoachsList();
    renderClientsGrid();
  } catch(e) {
    console.error('Erreur suppression coach:', e);
    toast('Erreur lors de la suppression', 'e');
  }
}

// ── TRANSFERT CLIENTS ENTRE COACHS ───────────────────────

function populateTransferCoachSelects() {
  const srcSelect = document.getElementById('tr-coach-src');
  const dstSelect = document.getElementById('tr-coach-dst');
  if (!srcSelect || !dstSelect) return;
  
  const admins = coachesList.filter(c => !c.archived && c.role === 'admin');
  const coaches = coachesList.filter(c => !c.archived && c.role === 'coach');
  
  srcSelect.innerHTML = '<option value="">-- Choisir un coach --</option>' + 
    (admins.length > 0 ? `<optgroup label="👑 Administrateurs">${admins.map(c => `<option value="${c.uid}">${h(c.name || c.uid)} (${allClients.filter(cl => cl.coachUid === c.uid && !cl.archived).length} clients)</option>`).join('')}</optgroup>` : '') +
    (coaches.length > 0 ? `<optgroup label="📋 Coachs">${coaches.map(c => `<option value="${c.uid}">${h(c.name || c.uid)} (${allClients.filter(cl => cl.coachUid === c.uid && !cl.archived).length} clients)</option>`).join('')}</optgroup>` : '');
  
  dstSelect.innerHTML = '<option value="">-- Sans coach --</option>' + 
    (admins.length > 0 ? `<optgroup label="👑 Administrateurs">${admins.map(c => `<option value="${c.uid}">${h(c.name || c.uid)}</option>`).join('')}</optgroup>` : '') +
    (coaches.length > 0 ? `<optgroup label="📋 Coachs">${coaches.map(c => `<option value="${c.uid}">${h(c.name || c.uid)}</option>`).join('')}</optgroup>` : '');
}

function loadTransferCoachClients() {
  const coachUid = document.getElementById('tr-coach-src')?.value;
  const container = document.getElementById('tr-coach-clients-container');
  const btn = document.getElementById('tr-coach-btn');
  
  if (!coachUid) {
    if (container) container.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Sélectionnez un coach source pour voir ses clients.</p>';
    if (btn) btn.disabled = true;
    return;
  }
  
  const clients = allClients.filter(c => c.coachUid === coachUid && !c.archived);
  
  if (clients.length === 0) {
    container.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Ce coach n\'a aucun client actif.</p>';
    btn.disabled = true;
    return;
  }
  
  _selectedClientsForTransfer = new Set(clients.map(c => c.id));
  
  container.innerHTML = `
    <div style="margin-bottom:.75rem">
      <label style="font-size:.65rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted)">
        ${clients.length} client${clients.length > 1 ? 's' : ''} à transférer
      </label>
      <div style="display:flex;gap:.5rem;margin-top:.5rem">
        <button onclick="selectAllTransferClients(true)" class="btn btn-ghost btn-sm">Tout sélectionner</button>
        <button onclick="selectAllTransferClients(false)" class="btn btn-ghost btn-sm">Tout désélectionner</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:.5rem;max-height:300px;overflow-y:auto;padding:.5rem;background:var(--surface);border-radius:.5rem">
      ${clients.map(c => `
        <label style="display:flex;align-items:center;gap:.75rem;padding:.75rem;background:var(--card);border-radius:.5rem;cursor:pointer;transition:all .2s" 
               onmouseover="this.style.background='rgba(240,165,0,0.1)'" onmouseout="this.style.background='var(--card)'">
          <input type="checkbox" value="${c.id}" checked onchange="toggleTransferClient('${c.id}')">
          <div style="flex:1">
            <div style="font-weight:700;font-family:'Barlow Condensed',sans-serif">${h(c.name || c.code)}</div>
            <div style="font-size:.7rem;color:var(--muted)">${c.email || 'Pas d\'email'}</div>
          </div>
        </label>
      `).join('')}
    </div>
  `;
  
  btn.disabled = false;
}

function toggleTransferClient(clientId) {
  if (_selectedClientsForTransfer.has(clientId)) {
    _selectedClientsForTransfer.delete(clientId);
  } else {
    _selectedClientsForTransfer.add(clientId);
  }
  updateTransferButton();
}

function selectAllTransferClients(select) {
  const checkboxes = document.querySelectorAll('#tr-coach-clients-container input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = select;
    if (select) _selectedClientsForTransfer.add(cb.value);
    else _selectedClientsForTransfer.delete(cb.value);
  });
  updateTransferButton();
}

function updateTransferButton() {
  const btn = document.getElementById('tr-coach-btn');
  if (btn) btn.disabled = _selectedClientsForTransfer.size === 0;
}

async function transferCoachClients() {
  const srcCoachUid = document.getElementById('tr-coach-src')?.value;
  const dstCoachUid = document.getElementById('tr-coach-dst')?.value;
  
  if (!srcCoachUid) { toast('Veuillez sélectionner un coach source', 'w'); return; }
  if (_selectedClientsForTransfer.size === 0) { toast('Veuillez sélectionner au moins un client', 'w'); return; }
  
  const count = _selectedClientsForTransfer.size;
  const srcName = coachesList.find(c => c.uid === srcCoachUid)?.name || 'Source';
  const dstName = dstCoachUid ? (coachesList.find(c => c.uid === dstCoachUid)?.name || 'Destination') : 'Sans coach';
  
  const confirmed = confirm(`Transférer ${count} client${count > 1 ? 's' : ''} de ${srcName} vers ${dstName} ?`);
  if (!confirmed) return;
  
  try {
    let transferred = 0;
    for (const clientId of _selectedClientsForTransfer) {
      const client = allClients.find(c => c.id === clientId);
      if (client) {
        client.coachUid = dstCoachUid;
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',client.id), client);
        transferred++;
      }
    }
    
    toast(`${transferred} client${transferred > 1 ? 's' : ''} transféré${transferred > 1 ? 's' : ''} avec succès`, 's');
    
    // Réinitialiser
    _selectedClientsForTransfer.clear();
    document.getElementById('tr-coach-src').value = '';
    document.getElementById('tr-coach-dst').value = '';
    loadTransferCoachClients();
    renderClientsGrid();
    renderCoachsList();
  } catch(e) {
    console.error('Erreur transfert clients:', e);
    toast('Erreur lors du transfert', 'e');
  }
}
