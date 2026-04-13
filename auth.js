const _CODE_SESSION_KEY = 'delta-code-session';
const _CREDENTIALS_KEY = 'delta-credentials';

async function findClientByAccessCode(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return null;
  const snap = await window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'clients'));
  let found = null;
  snap.forEach(d => {
    const c = d.data();
    if (c.code && String(c.code).trim().toUpperCase() === code) found = { id: d.id, ...c };
  });
  return found;
}

async function restoreClientSessionByCode(code) {
  const found = await findClientByAccessCode(code);
  if (!found) {
    localStorage.removeItem(_CODE_SESSION_KEY);
    return false;
  }
  currentAuthUser = _auth.currentUser;
  currentUserRole = 'client';
  currentUserAccess = { role: 'client', managedClientIds: [] };
  currentUser = { ...found, isCoach: false, id: found.id, isCodeLogin: true };
  enterApp();
  return true;
}

function _normalizeRole(raw) {
  const s = String(raw == null ? '' : raw).trim().toLowerCase();
  if (s === 'admin' || s === 'administrateur') return 'admin';
  return 'coach';
}

/** Cherche un client par son authUid Firebase - OBSOLÈTE */
async function findClientByAuthUid(uid) {
  // Fonction conservée pour compatibilité mais non utilisée
  // Les clients utilisent maintenant l'authentification anonyme avec code
  return null;
}

/** Admin uniquement : crée un compte Firebase Auth + doc users (coach). */
async function adminCreateCoachAccount() {
  if (typeof isAdminUser !== 'function' || !isAdminUser()) { toast('Reserve a l admin', 'w'); return; }
  const email = document.getElementById('ncoach-email')?.value.trim();
  const password = document.getElementById('ncoach-password')?.value || '';
  const displayName = document.getElementById('ncoach-name')?.value.trim() || '';
  if (!email || !password) { toast('Email et mot de passe requis', 'w'); return; }
  if (password.length < 6) { toast('Mot de passe : min. 6 caracteres (Firebase)', 'w'); return; }
  const sec = window.getSecondaryAuth();
  try {
    const cred = await sec.createUserWithEmailAndPassword(email, password);
    await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'users', cred.user.uid), {
      role: 'coach',
      displayName: displayName || email.split('@')[0],
      managedClientIds: []
    });
    await sec.signOut();
    closeModal('modal-add-coach');
    ['ncoach-email', 'ncoach-password', 'ncoach-name'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    toast('Coach cree : il peut se connecter avec cet email.', 's');
    if (typeof loadAllData === 'function') await loadAllData();
  } catch (e) {
    console.error(e);
    try { await sec.signOut(); } catch (_) {}
    toast(e.message || 'Erreur creation coach', 'e');
  }
}

async function doLogin() {
  const code = document.getElementById('login-code')?.value.trim().toUpperCase() || '';
  const remember = document.getElementById('login-remember')?.checked || false;
  const errEl = document.getElementById('login-error');
  const shake = () => {
    errEl.classList.remove('hidden');
    document.getElementById('login-code').classList.add('shake');
    setTimeout(() => {
      document.getElementById('login-code').classList.remove('shake');
    }, 300);
  };

  if (!code) {
    errEl.innerText = 'Code requis';
    errEl.classList.remove('hidden');
    return;
  }

  // Vérifier si c'est le code coach (interdit en mode client)
  if (code === (typeof COACH_CODE !== 'undefined' ? COACH_CODE : 'DELTA')) {
    shake();
    errEl.innerText = 'Pour le panneau coach, clique sur "Je suis coach / admin"';
    return;
  }

  try {
    await _auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
    await _auth.signInAnonymously();
    const found = await findClientByAccessCode(code);
    if (!found) {
      await _auth.signOut();
      shake();
      errEl.innerText = 'Code inconnu. Vérifie avec ton coach.';
      return;
    }
    if (remember) localStorage.setItem(_CODE_SESSION_KEY, JSON.stringify({ code: code.trim().toUpperCase() }));
    else localStorage.removeItem(_CODE_SESSION_KEY);
    currentAuthUser = _auth.currentUser;
    currentUserRole = 'client';
    currentUserAccess = { role: 'client', managedClientIds: [] };
    currentUser = { ...found, isCoach: false, id: found.id, isCodeLogin: true };
    errEl.classList.add('hidden');
    enterApp();
  } catch (e) {
    console.error(e);
    try { await _auth.signOut(); } catch (_) {}
    shake();
    errEl.innerText = 'Erreur connexion. Réessaie.';
  }
}

document.getElementById('login-code').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('login-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') doCoachLogin(); });
document.getElementById('login-password')?.addEventListener('keydown', e => { if (e.key === 'Enter') doCoachLogin(); });

document.addEventListener('DOMContentLoaded', () => {
  
  // Restaurer les identifiants sauvegardés (mode coach)
  const saved = localStorage.getItem(_CREDENTIALS_KEY);
  if (saved) {
    try {
      const { email, password } = JSON.parse(saved);
      const emailEl = document.getElementById('login-email');
      const pwdEl = document.getElementById('login-password');
      if (email && emailEl) emailEl.value = email;
      if (password && pwdEl) pwdEl.value = password;
      document.getElementById('login-remember').checked = true;
      // Basculer automatiquement en mode coach si des identifiants sont sauvegardés
      if (email && password) {
        toggleCoachLogin();
      }
    } catch (e) {
      console.warn('Failed to restore credentials', e);
    }
  }
});

_auth.onAuthStateChanged(async (fbUser) => {
  if (!fbUser) return;
  if (document.getElementById('screen-app') && !document.getElementById('screen-app').classList.contains('hidden')) return;

  if (fbUser.isAnonymous) {
    const saved = localStorage.getItem(_CODE_SESSION_KEY);
    if (saved) {
      try {
        const { code } = JSON.parse(saved);
        if (code && await restoreClientSessionByCode(code)) return;
      } catch (e) {
        console.warn('Code session restore', e);
      }
      localStorage.removeItem(_CODE_SESSION_KEY);
      await _auth.signOut();
    }
    return;
  }

  try {
    const udoc = await window.fdb.getDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'users', fbUser.uid));
    if (udoc.exists) {
      const data = udoc.data() || {};
      const accessClean = {
        role: _normalizeRole(data.role),
        displayName: data.displayName || '',
        managedClientIds: Array.isArray(data.managedClientIds) ? data.managedClientIds : []
      };
      currentAuthUser = fbUser;
      currentUserRole = accessClean.role;
      currentUserAccess = accessClean;
      currentUser = {
        uid: fbUser.uid,
        isCoach: true,
        role: accessClean.role,
        managedClientIds: accessClean.managedClientIds || [],
        name: accessClean.displayName || fbUser.displayName || fbUser.email || 'Coach',
        email: fbUser.email || ''
      };
      enterApp();
      return;
    }
    // Si ce n'est pas un coach (users/), ce n'est pas un compte valide
    // Les clients utilisent l'authentification anonyme avec code, pas email/password
    await _auth.signOut();
    toast('Compte non reconnu. Les clients doivent utiliser leur code d\'accès.', 'e', 6000);
  } catch (e) {
    console.error('Auth profile error', e);
    await _auth.signOut();
    toast('Acces refuse (Firestore ou reseau).', 'e');
  }
});

function enterApp() {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  document.getElementById('btn-refresh').classList.remove('hidden');
  if (currentUser.isCoach) {
    document.getElementById('nav-badge').className = 'badge badge-coach';
    document.getElementById('nav-badge').innerText = currentUser.role === 'admin' ? 'ADMIN' : 'COACH';
    document.getElementById('nav-name').innerText = currentUser.name || 'Administration';
    document.getElementById('view-coach').classList.remove('hidden');
    const adminOnlyTabs = ['ctab-groupes', 'ctab-transfer', 'ctab-database', 'ctab-coachs'];
    adminOnlyTabs.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (isAdminUser()) el.style.removeProperty('display');
      else el.style.display = 'none';
    });
    loadAllData();
  } else {
    document.getElementById('nav-badge').className = 'badge badge-client';
    document.getElementById('nav-badge').innerText = 'CLIENT';
    document.getElementById('nav-name').innerText = currentUser.name || currentUser.code;
    document.getElementById('client-greeting').innerText = 'SALUT, ' + (currentUser.name || currentUser.code).split(' ')[0].toUpperCase() + '.';
    document.getElementById('view-client').classList.remove('hidden');
    // Afficher le bouton de chat flottant
    if (typeof showClientChatButton === 'function') showClientChatButton();
    // Définir currentClient pour les clients
    currentClient = currentUser;
    loadClientData(currentUser.id);
  }
  // Initialiser le chat system après connexion
  if (typeof initChatSystem === 'function') initChatSystem();
}

/**
 * ============================================
 * CHANGEMENT DE MOT DE PASSE
 * ============================================
 */

/**
 * ============================================
 * TOGGLE LOGIN MODES (Client / Coach)
 * ============================================
 */

function toggleCoachLogin() {
  const clientMode = document.getElementById('login-client-mode');
  const coachMode = document.getElementById('login-coach-mode');
  
  if (clientMode.classList.contains('hidden')) {
    // Retour au mode client
    clientMode.classList.remove('hidden');
    coachMode.classList.add('hidden');
  } else {
    // Passage au mode coach
    clientMode.classList.add('hidden');
    coachMode.classList.remove('hidden');
    document.getElementById('login-email')?.focus();
  }
}

async function doCoachLogin() {
  const email = document.getElementById('login-email')?.value.trim() || '';
  const password = document.getElementById('login-password')?.value || '';
  const remember = document.getElementById('login-remember')?.checked || false;
  const errEl = document.getElementById('login-error-coach');
  
  if (!email || !password) {
    errEl.textContent = 'Email et mot de passe requis';
    errEl.classList.remove('hidden');
    return;
  }
  
  try {
    localStorage.removeItem(_CODE_SESSION_KEY);
    
    // Sauvegarder les identifiants si "Rester connecté" est coché
    if (remember) {
      localStorage.setItem(_CREDENTIALS_KEY, JSON.stringify({ email, password }));
    } else {
      localStorage.removeItem(_CREDENTIALS_KEY);
    }
    
    await _auth.setPersistence(remember ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
    await _auth.signInWithEmailAndPassword(email, password);
    errEl.classList.add('hidden');
  } catch (e) {
    console.error(e);
    errEl.textContent = e.message || 'Erreur de connexion';
    errEl.classList.remove('hidden');
  }
}

/** Envoie un email de réinitialisation de mot de passe */
async function sendPasswordReset(email) {
  if (!email) {
    toast('Veuillez entrer une adresse email', 'w');
    return;
  }
  try {
    await _auth.sendPasswordResetEmail(email);
    toast('Email de réinitialisation envoyé ! Vérifie ta boîte mail.', 's', 5000);
  } catch (e) {
    console.error(e);
    toast(e.message || 'Erreur lors de l\'envoi de l\'email', 'e');
  }
}

/** Change le mot de passe de l'utilisateur connecté */
async function changePassword(currentPassword, newPassword) {
  if (!currentAuthUser || !currentAuthUser.email) {
    toast('Tu dois être connecté avec un email pour changer ton mot de passe', 'w');
    return;
  }
  if (!currentPassword || !newPassword) {
    toast('Mot de passe actuel et nouveau mot de passe requis', 'w');
    return;
  }
  if (newPassword.length < 6) {
    toast('Le nouveau mot de passe doit faire au moins 6 caractères', 'w');
    return;
  }
  try {
    const credential = firebase.auth.EmailAuthProvider.credential(
      currentAuthUser.email,
      currentPassword
    );
    await currentAuthUser.reauthenticateWithCredential(credential);
    await currentAuthUser.updatePassword(newPassword);
    toast('Mot de passe modifié avec succès !', 's');
  } catch (e) {
    console.error(e);
    if (e.code === 'auth/wrong-password') {
      toast('Mot de passe actuel incorrect', 'e');
    } else {
      toast(e.message || 'Erreur lors du changement de mot de passe', 'e');
    }
  }
}

/**
 * ============================================
 * PASSWORDLESS / EMAIL AUTH - DÉSACTIVÉ
 * ============================================
 * Ces systèmes ont été retirés pour simplifier l'authentification.
 * Les clients utilisent uniquement leur code d'accès.
 * Les coachs utilisent email + mot de passe.
 */

async function checkSignInLink() {
  // Désactivé - retourne false pour ne pas interférer
  return false;
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', () => {
  // Authentification simplifiée : code pour clients, email/password pour coachs
});

function doLogout() {
  localStorage.removeItem(_CODE_SESSION_KEY);
  localStorage.removeItem(_CREDENTIALS_KEY);
  _auth.signOut().catch(() => {});
  currentUser = null; currentClient = null;
  currentAuthUser = null;
  currentUserRole = 'guest';
  currentUserAccess = { role: 'guest', managedClientIds: [] };
  clientProgram = []; clientUnlocked = new Set(); clientArchived = new Set(); clientLogs = {};
  if (unsubLogs) { unsubLogs(); unsubLogs = null; }
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-login').classList.remove('hidden');
  
  // Réinitialiser l'interface de login en mode client
  const clientMode = document.getElementById('login-client-mode');
  const coachMode = document.getElementById('login-coach-mode');
  if (clientMode && coachMode) {
    clientMode.classList.remove('hidden');
    coachMode.classList.add('hidden');
  }
  
  document.getElementById('login-code').value = '';
  const emailEl = document.getElementById('login-email');
  const pwdEl = document.getElementById('login-password');
  if (emailEl) emailEl.value = '';
  if (pwdEl) pwdEl.value = '';
  document.getElementById('login-remember').checked = false;
  document.getElementById('login-error').classList.add('hidden');
  const errCoach = document.getElementById('login-error-coach');
  if (errCoach) errCoach.classList.add('hidden');
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
