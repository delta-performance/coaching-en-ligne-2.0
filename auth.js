async function doLogin() {
  const code = document.getElementById('login-code').value.trim().toUpperCase();
  if (!code) return;
  if (code === COACH_CODE) {
    currentUser = { isCoach: true, name: 'Coach', code: COACH_CODE };
    enterApp(); return;
  }
  try {
    const snap = await window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'clients'));
    let found = null;
    snap.forEach(d => { const c = d.data(); if (c.code && c.code.toUpperCase() === code) found = { id: d.id, ...c }; });
    if (found) { currentUser = { ...found, isCoach: false }; enterApp(); }
    else {
      document.getElementById('login-error').classList.remove('hidden');
      document.getElementById('login-code').classList.add('shake');
      setTimeout(() => document.getElementById('login-code').classList.remove('shake'), 300);
    }
  } catch(e) { console.error(e); toast('Erreur connexion', 'e'); }
}
document.getElementById('login-code').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });

function enterApp() {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  document.getElementById('btn-refresh').classList.remove('hidden');
  if (currentUser.isCoach) {
    document.getElementById('nav-badge').className = 'badge badge-coach';
    document.getElementById('nav-badge').innerText = 'COACH';
    document.getElementById('nav-name').innerText = 'Administration';
    document.getElementById('view-coach').classList.remove('hidden');
    loadAllData();
  } else {
    document.getElementById('nav-badge').className = 'badge badge-client';
    document.getElementById('nav-badge').innerText = 'CLIENT';
    document.getElementById('nav-name').innerText = currentUser.name || currentUser.code;
    document.getElementById('client-greeting').innerText = 'SALUT, ' + (currentUser.name || currentUser.code).split(' ')[0].toUpperCase() + '.';
    document.getElementById('view-client').classList.remove('hidden');
    loadClientData(currentUser.id);
  }
}

function doLogout() {
  currentUser = null; currentClient = null;
  clientProgram = []; clientUnlocked = new Set(); clientArchived = new Set(); clientLogs = {};
  if (unsubLogs) { unsubLogs(); unsubLogs = null; }
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('login-code').value = '';
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('view-client').classList.add('hidden');
  document.getElementById('view-coach').classList.add('hidden');
  document.getElementById('btn-refresh').classList.add('hidden');
}

async function refreshData() {
  if (!currentUser) return;
  toast('Actualisation...', 'i');
  if (currentUser.isCoach) {
    await loadAllData();
    if (currentClient) {
      await loadClientData(currentClient.id);
      rebuildEditorSelects();
      populateVisuSelect();
    }
  } else {
    await loadClientData(currentUser.id);
  }
  toast('Actualisé !', 's');
}
