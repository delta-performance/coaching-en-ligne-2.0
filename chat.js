// ============================================================
// CHAT SYSTEM - Système de messagerie Client/Coach
// ============================================================

// ── État global du chat ─────────────────────────────────────
let chatUnsubscribe = null;
let chatMessages = [];
let unreadCountClient = 0;
let unreadCountCoach = 0;
let currentChatClientId = null;
let chatTemplates = [];

// ── INITIALISATION ─────────────────────────────────────────

function initChatSystem() {
  // Charger les templates de messages
  loadChatTemplates();
  
  // Vérifier les messages non lus au démarrage
  if (currentUser) {
    if (!currentUser.isCoach) {
      // Côté client - charger les messages de ce client
      loadClientChat(currentUser.id);
      checkUnreadClientMessages();
      // S'assurer que le bouton de chat est visible
      showClientChatButton();
    }
  }
  
  // Initialiser la présence
  initPresence();
}

// Afficher le bouton de chat côté client
function showClientChatButton() {
  const btn = document.getElementById('btn-chat-client');
  if (btn) {
    btn.style.display = 'flex';
    btn.style.visibility = 'visible';
    btn.style.opacity = '1';
    console.log('>>> Client chat button is now visible');
  } else {
    console.error('>>> btn-chat-client not found in DOM');
  }
}

// ── PRÉSENCE EN LIGNE ────────────────────────────────────────

function updateOnlineStatus(userId, isOnline) {
  if (!userId || !APP_ID) return;
  
  const statusRef = window.fdb.doc(window.db, 'apps', APP_ID, 'presence', userId);
  const status = {
    online: isOnline,
    lastSeen: new Date().toISOString(),
    userId: userId,
    role: currentUser?.role || 'unknown',
    name: currentUser?.name || currentUser?.displayName || 'Anonyme'
  };
  
  window.fdb.setDoc(statusRef, status, { merge: true }).catch(e => {
    console.error('Erreur mise à jour statut:', e);
  });
}

function listenToUserStatus(userId, callback) {
  if (!userId || !APP_ID) return;
  
  const statusRef = window.fdb.doc(window.db, 'apps', APP_ID, 'presence', userId);
  return window.fdb.onSnapshot(statusRef, (doc) => {
    if (doc.exists) {
      callback(doc.data());
    } else {
      callback({ online: false, lastSeen: null });
    }
  });
}

function initPresence() {
  if (!currentUser?.uid) return;
  
  updateOnlineStatus(currentUser.uid, true);
  
  const interval = setInterval(() => {
    if (currentUser?.uid) {
      updateOnlineStatus(currentUser.uid, true);
    } else {
      clearInterval(interval);
    }
  }, 30000);
  
  window.addEventListener('beforeunload', () => {
    if (currentUser?.uid) {
      updateOnlineStatus(currentUser.uid, false);
    }
  });
  
  return interval;
}

function formatStatus(status) {
  if (!status) return { text: 'Hors ligne', color: '#666', icon: '⚫' };
  
  if (status.online) {
    return { text: 'En ligne', color: '#22c55e', icon: '🟢' };
  }
  
  const lastSeen = status.lastSeen ? new Date(status.lastSeen) : null;
  if (!lastSeen) return { text: 'Hors ligne', color: '#666', icon: '⚫' };
  
  const diff = Math.floor((Date.now() - lastSeen) / 1000);
  
  if (diff < 60) return { text: 'Vu à l\'instant', color: '#22c55e', icon: '🟡' };
  if (diff < 3600) return { text: `Vu il y a ${Math.floor(diff/60)} min`, color: '#f59e0b', icon: '🟡' };
  if (diff < 86400) return { text: `Vu il y a ${Math.floor(diff/3600)}h`, color: '#f59e0b', icon: '🟠' };
  return { text: 'Hors ligne', color: '#666', icon: '⚫' };
}

// ── CHAT CÔTÉ CLIENT ───────────────────────────────────────

async function loadClientChat(clientId) {
  if (!clientId || !APP_ID) return;
  
  // Nettoyer l'ancien listener
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  
  const chatRef = window.fdb.collection(window.db, 'apps', APP_ID, 'clients', clientId, 'chat');
  
  chatUnsubscribe = window.fdb.onSnapshot(chatRef, (snapshot) => {
    console.log('Client chat snapshot received, docs count:', snapshot.size);
    chatMessages = [];
    let unreadCount = 0;
    
    snapshot.forEach((doc) => {
      const msg = { id: doc.id, ...doc.data() };
      chatMessages.push(msg);
      
      // Compter les messages non lus du coach
      if (msg.sender === 'coach' && !msg.read) {
        unreadCount++;
      }
    });
    
    // Trier par timestamp
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log('Processed', chatMessages.length, 'messages, unread:', unreadCount);
    
    // Mettre à jour le badge
    unreadCountClient = unreadCount;
    updateChatBadgeClient();
    
    // Rendre les messages si la vue est ouverte
    const chatView = document.getElementById('client-chat-view');
    if (chatView && !chatView.classList.contains('hidden')) {
      console.log('Rendering client chat, messages count:', chatMessages.length);
      renderClientChat();
    }
  }, (error) => {
    console.error('Erreur chat client onSnapshot:', error);
  });
}

async function sendClientMessage(text) {
  const input = document.getElementById('client-chat-input');
  const messageText = text || (input ? input.value : '');
  
  if (!messageText.trim()) {
    console.log('sendClientMessage: empty message');
    return;
  }
  
  if (!currentUser?.id || !APP_ID) {
    console.error('sendClientMessage: no current user or APP_ID');
    toast('Erreur: utilisateur non connecté', 'e');
    return;
  }
  
  const clientId = currentUser.id;
  const messageData = {
    text: messageText.trim(),
    sender: 'client',
    timestamp: new Date().toISOString(),
    read: false,
    senderName: currentUser.name || 'Client'
  };
  
  console.log('Sending client message:', messageData);
  
  try {
    // Utiliser le chemin complet directement
    const docRef = window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId, 'chat', 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    await window.fdb.setDoc(docRef, messageData);
    
    console.log('Client message sent successfully');
    
    // Vider l'input
    if (input) input.value = '';
    
    // Forcer le rafraîchissement immédiat
    setTimeout(() => {
      chatMessages.push({ ...messageData, id: 'temp_' + Date.now() });
      renderClientChat();
    }, 100);
    
  } catch (e) {
    console.error('Erreur envoi message client:', e);
    toast('Erreur envoi message: ' + (e.message || 'inconnue'), 'e');
  }
}

async function markClientMessagesAsRead() {
  if (!currentUser?.id || !APP_ID || chatMessages.length === 0) return;
  
  const unreadMessages = chatMessages.filter(m => m.sender === 'coach' && !m.read);
  if (unreadMessages.length === 0) return;
  
  const clientId = currentUser.id;
  const batch = window.fdb.writeBatch(window.db);
  
  unreadMessages.forEach(msg => {
    const msgRef = window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId, 'chat', msg.id);
    batch.update(msgRef, { read: true });
  });
  
  try {
    await batch.commit();
    unreadCountClient = 0;
    updateChatBadgeClient();
  } catch (e) {
    console.error('Erreur marquage lu:', e);
  }
}

// ── CHAT CÔTÉ COACH ────────────────────────────────────────

async function loadCoachChat(clientId) {
  if (!clientId || !APP_ID) return;
  
  currentChatClientId = clientId;
  
  // Nettoyer l'ancien listener
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  
  const chatRef = window.fdb.collection(window.db, 'apps', APP_ID, 'clients', clientId, 'chat');
  
  chatUnsubscribe = window.fdb.onSnapshot(chatRef, (snapshot) => {
    console.log('Coach chat snapshot received for', clientId, 'docs count:', snapshot.size);
    chatMessages = [];
    let unreadCount = 0;
    
    snapshot.forEach((doc) => {
      const msg = { id: doc.id, ...doc.data() };
      chatMessages.push(msg);
      
      // Compter les messages non lus du client
      if (msg.sender === 'client' && !msg.read) {
        unreadCount++;
      }
    });
    
    // Trier par timestamp
    chatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log('Coach processed', chatMessages.length, 'messages, unread:', unreadCount);
    
    // Mettre à jour le titre du chat
    updateChatTitle(unreadCount);
    
    // Rendre les messages
    renderCoachChat();
    
    // Marquer comme lu automatiquement
    if (unreadCount > 0) {
      markCoachMessagesAsRead(clientId);
    }
  }, (error) => {
    console.error('Erreur chat coach onSnapshot:', error);
  });
}

async function sendCoachMessage(text) {
  const input = document.getElementById('coach-chat-input');
  const messageText = text || (input ? input.value : '');
  
  if (!messageText.trim()) {
    console.log('sendCoachMessage: empty message');
    return;
  }
  
  if (!currentChatClientId || !APP_ID) {
    console.error('sendCoachMessage: no client selected or APP_ID');
    toast('Erreur: aucun client sélectionné', 'e');
    return;
  }
  
  const messageData = {
    text: messageText.trim(),
    sender: 'coach',
    timestamp: new Date().toISOString(),
    read: false,
    senderName: currentUser?.name || 'Coach'
  };
  
  console.log('Sending coach message to', currentChatClientId, ':', messageData);
  
  try {
    // Utiliser le chemin complet directement
    const docRef = window.fdb.doc(window.db, 'apps', APP_ID, 'clients', currentChatClientId, 'chat', 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    await window.fdb.setDoc(docRef, messageData);
    
    console.log('Coach message sent successfully');
    
    // Vider l'input
    if (input) input.value = '';
    
    // Forcer le rafraîchissement immédiat
    setTimeout(() => {
      chatMessages.push({ ...messageData, id: 'temp_' + Date.now() });
      renderCoachChat();
    }, 100);
    
  } catch (e) {
    console.error('Erreur envoi message coach:', e);
    toast('Erreur envoi message: ' + (e.message || 'inconnue'), 'e');
  }
}

async function markCoachMessagesAsRead(clientId) {
  if (!clientId || !APP_ID || chatMessages.length === 0) return;
  
  const unreadMessages = chatMessages.filter(m => m.sender === 'client' && !m.read);
  if (unreadMessages.length === 0) return;
  
  const batch = window.fdb.writeBatch(window.db);
  
  unreadMessages.forEach(msg => {
    const msgRef = window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId, 'chat', msg.id);
    batch.update(msgRef, { read: true });
  });
  
  try {
    await batch.commit();
  } catch (e) {
    console.error('Erreur marquage lu coach:', e);
  }
}

// ── RENDU CÔTÉ CLIENT ─────────────────────────────────────

function renderClientChat() {
  const container = document.getElementById('client-chat-messages');
  if (!container) return;
  
  if (chatMessages.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:1rem">💬</div>
        <p style="font-style:italic">Aucun message encore.</p>
        <p style="font-size:.75rem;margin-top:.5rem">Envoyez un message à votre coach !</p>
      </div>
    `;
    return;
  }
  
  let lastDate = null;
  let html = '';
  
  chatMessages.forEach((msg, index) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('fr-FR');
    const msgTime = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Séparateur de date
    if (msgDate !== lastDate) {
      html += `<div class="chat-date-separator">${msgDate}</div>`;
      lastDate = msgDate;
    }
    
    const isClient = msg.sender === 'client';
    const bubbleClass = isClient ? 'chat-bubble-client' : 'chat-bubble-coach';
    const align = isClient ? 'flex-end' : 'flex-start';
    const showName = !isClient && (index === 0 || chatMessages[index - 1].sender !== 'coach');
    
    html += `
      <div class="chat-message-row" style="justify-content:${align}">
        <div class="${bubbleClass}" style="max-width:80%;">
          ${showName ? `<div class="chat-sender-name">${h(msg.senderName || 'Coach')}</div>` : ''}
          <div class="chat-text">${h(msg.text)}</div>
          <div class="chat-time">${msgTime} ${isClient && msg.read ? '✓✓' : ''}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function toggleClientChat() {
  const chatView = document.getElementById('client-chat-view');
  const gridView = document.getElementById('client-grid-view');
  
  if (!chatView || !gridView) return;
  
  const isHidden = chatView.classList.contains('hidden');
  
  if (isHidden) {
    // Ouvrir le chat
    gridView.classList.add('hidden');
    chatView.classList.remove('hidden');
    renderClientChat();
    markClientMessagesAsRead();
    
    // Focus sur l'input
    setTimeout(() => {
      const input = document.getElementById('client-chat-input');
      if (input) input.focus();
    }, 100);
  } else {
    // Fermer le chat
    chatView.classList.add('hidden');
    gridView.classList.remove('hidden');
  }
}

function updateChatBadgeClient() {
  const badge = document.getElementById('chat-badge-client');
  const btn = document.getElementById('btn-chat-client');
  
  if (badge) {
    badge.textContent = unreadCountClient;
    badge.style.display = unreadCountClient > 0 ? 'flex' : 'none';
  }
  
  if (btn && unreadCountClient > 0) {
    btn.classList.add('has-unread');
  } else if (btn) {
    btn.classList.remove('has-unread');
  }
}

// ── RENDU CÔTÉ COACH ───────────────────────────────────────

function renderCoachChat() {
  const container = document.getElementById('coach-chat-messages');
  if (!container) return;
  
  if (chatMessages.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:1rem">💬</div>
        <p style="font-style:italic">Aucun message encore.</p>
        <p style="font-size:.75rem;margin-top:.5rem">Le client n'a pas encore envoyé de message.</p>
      </div>
    `;
    return;
  }
  
  let lastDate = null;
  let html = '';
  
  chatMessages.forEach((msg, index) => {
    const msgDate = new Date(msg.timestamp).toLocaleDateString('fr-FR');
    const msgTime = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    // Séparateur de date
    if (msgDate !== lastDate) {
      html += `<div class="chat-date-separator">${msgDate}</div>`;
      lastDate = msgDate;
    }
    
    const isCoach = msg.sender === 'coach';
    const bubbleClass = isCoach ? 'chat-bubble-coach' : 'chat-bubble-client';
    const align = isCoach ? 'flex-end' : 'flex-start';
    const showName = !isCoach && (index === 0 || chatMessages[index - 1].sender !== 'client');
    
    html += `
      <div class="chat-message-row" style="justify-content:${align}">
        <div class="${bubbleClass}" style="max-width:80%;">
          ${showName ? `<div class="chat-sender-name">${h(msg.senderName || 'Client')}</div>` : ''}
          <div class="chat-text">${h(msg.text)}</div>
          <div class="chat-time">${msgTime} ${isCoach && msg.read ? '✓✓' : ''}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

// Variables pour stocker les listeners de statut
let clientStatusListener = null;
let coachStatusListener = null;

function updateChatTitle(unreadCount) {
  const title = document.getElementById('coach-chat-title');
  if (title) {
    const clientName = currentClient?.name || 'Client';
    title.innerHTML = `💬 ${h(clientName)} ${unreadCount > 0 ? `<span style="background:var(--brand);color:white;padding:.15rem .5rem;border-radius:1rem;font-size:.75rem">${unreadCount}</span>` : ''}`;
  }
}

// Afficher les participants avec leur statut en ligne
function updateChatParticipants() {
  const container = document.getElementById('chat-participants');
  if (!container) return;
  
  // Nettoyer les anciens listeners
  if (clientStatusListener) {
    clientStatusListener();
    clientStatusListener = null;
  }
  if (coachStatusListener) {
    coachStatusListener();
    coachStatusListener = null;
  }
  
  // Afficher le client
  const clientId = currentClient?.authUid || currentClient?.id;
  if (clientId) {
    clientStatusListener = listenToUserStatus(clientId, (status) => {
      const formatted = formatStatus(status);
      const clientEl = document.getElementById('participant-client');
      if (clientEl) {
        clientEl.innerHTML = `
          <span style="font-size:1rem;">${formatted.icon}</span>
          <span style="font-size:.8rem;color:${formatted.color};">${currentClient?.name || 'Client'} - ${formatted.text}</span>
        `;
      }
    });
  }
  
  // Afficher le coach (côté client)
  if (!currentUser?.isCoach && currentClient?.coachUid) {
    coachStatusListener = listenToUserStatus(currentClient.coachUid, (status) => {
      const formatted = formatStatus(status);
      const coachEl = document.getElementById('participant-coach');
      if (coachEl) {
        coachEl.innerHTML = `
          <span style="font-size:1rem;">${formatted.icon}</span>
          <span style="font-size:.8rem;color:${formatted.color};">Coach - ${formatted.text}</span>
        `;
      }
    });
  }
}

function openCoachChat() {
  const chatPanel = document.getElementById('coach-chat-panel');
  if (chatPanel) {
    chatPanel.classList.remove('hidden');
    loadCoachChat(currentClient.id);
    // Afficher juste les noms des participants (sans statut en ligne)
    updateParticipantNames();
  }
}

// Afficher les noms des participants (client, admins, coach assigné)
function updateParticipantNames() {
  const container = document.getElementById('chat-participants');
  if (!container) return;
  
  const participants = [];
  
  // 1. Ajouter le client
  if (currentClient?.name) {
    participants.push(currentClient.name);
  }
  
  // 2. Ajouter les admins (depuis coachesList ou allUsers)
  const admins = [];
  if (typeof coachesList !== 'undefined' && coachesList) {
    coachesList.forEach(c => {
      if (c.role === 'admin' || c.isAdmin) {
        admins.push(c.displayName || c.name || c.email || 'Admin');
      }
    });
  }
  if (admins.length > 0) {
    participants.push(...admins);
  }
  
  // 3. Ajouter le coach assigné (si différent de l'utilisateur courant)
  if (currentClient?.coachUid && currentUser?.uid !== currentClient.coachUid) {
    // Chercher le nom du coach dans coachesList
    const assignedCoach = coachesList?.find(c => c.uid === currentClient.coachUid);
    if (assignedCoach) {
      const coachName = assignedCoach.displayName || assignedCoach.name || assignedCoach.email || 'Coach';
      participants.push(coachName);
    }
  }
  
  // Mettre à jour l'affichage
  container.innerHTML = participants.map((name, index) => {
    const isLast = index === participants.length - 1;
    return `<span>${name}</span>${!isLast ? '<span style="color:var(--muted)"> • </span>' : ''}`;
  }).join('');
}

// Toggle pour le chat FAB du coach
function toggleCoachFabChat() {
  const chatPanel = document.getElementById('coach-chat-panel');
  if (chatPanel.classList.contains('hidden')) {
    openCoachChat();
  } else {
    closeCoachChat();
  }
}

// Afficher/masquer la bulle flottante du coach
function showCoachChatButton(clientId) {
  const btn = document.getElementById('btn-chat-coach');
  if (btn) {
    btn.classList.remove('hidden');
  }
}

function hideCoachChatButton() {
  const btn = document.getElementById('btn-chat-coach');
  if (btn) {
    btn.classList.add('hidden');
  }
}

function closeCoachChat() {
  const chatPanel = document.getElementById('coach-chat-panel');
  if (chatPanel) {
    chatPanel.classList.add('hidden');
  }
  
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
}

// ── TEMPLATES DE MESSAGES ─────────────────────────────────

function loadChatTemplates() {
  // Templates par défaut - pourront être personnalisés plus tard
  chatTemplates = [
    {
      id: 'relance',
      name: 'Relance douce',
      text: 'Hey ! On ne t\'a pas vu depuis quelques jours, tout va bien avec ton programme ? 💪',
      icon: '👋'
    },
    {
      id: 'félicitations',
      name: 'Félicitations',
      text: 'Bravo pour ta régularité ! Continue comme ça, les résultats vont suivre 🔥',
      icon: '🎉'
    },
    {
      id: 'rdv',
      name: 'Rendez-vous',
      text: 'On se fait un point cette semaine pour ajuster ton programme ? Dis-moi quand tu es dispo.',
      icon: '📅'
    },
    {
      id: 'motivation',
      name: 'Motivation',
      text: 'N\'oublie pas pourquoi tu as commencé. Chaque séance compte ! 💯',
      icon: '⚡'
    },
    {
      id: 'feedback',
      name: 'Feedback séance',
      text: 'Comment s\'est passée ta dernière séance ? Tu as senti les charges adaptées ?',
      icon: '📊'
    }
  ];
}

function showTemplatePicker() {
  const picker = document.getElementById('chat-template-picker');
  if (!picker) return;
  
  picker.innerHTML = chatTemplates.map(t => `
    <button onclick="applyChatTemplate('${t.id}')" class="chat-template-btn">
      <span style="font-size:1.25rem">${t.icon}</span>
      <span style="font-size:.75rem">${h(t.name)}</span>
    </button>
  `).join('');
  
  picker.classList.toggle('hidden');
}

function applyChatTemplate(templateId) {
  const template = chatTemplates.find(t => t.id === templateId);
  if (!template) return;
  
  const input = document.getElementById('coach-chat-input');
  if (input) {
    input.value = template.text;
    input.focus();
  }
  
  // Cacher le picker
  const picker = document.getElementById('chat-template-picker');
  if (picker) picker.classList.add('hidden');
}

// ── UTILITAIRES ────────────────────────────────────────────

function checkUnreadClientMessages() {
  if (!currentUser?.id || !APP_ID) return;
  
  const clientId = currentUser.id;
  const chatRef = window.fdb.collection(window.db, 'apps', APP_ID, 'clients', clientId, 'chat');
  
  window.fdb.getDocs(chatRef).then(snapshot => {
    let count = 0;
    snapshot.forEach(doc => {
      const msg = doc.data();
      if (msg.sender === 'coach' && !msg.read) {
        count++;
      }
    });
    unreadCountClient = count;
    updateChatBadgeClient();
  });
}

function getUnreadCountForClient(clientId) {
  if (!clientId || !APP_ID) return Promise.resolve(0);
  
  const chatRef = window.fdb.collection(window.db, 'apps', APP_ID, 'clients', clientId, 'chat');
  return window.fdb.getDocs(chatRef).then(snapshot => {
    let count = 0;
    snapshot.forEach(doc => {
      const msg = doc.data();
      if (msg.sender === 'client' && !msg.read) {
        count++;
      }
    });
    return count;
  });
}

// ── EXPORT ─────────────────────────────────────────────────

window.initChatSystem = initChatSystem;
window.loadClientChat = loadClientChat;
window.sendClientMessage = sendClientMessage;
window.toggleClientChat = toggleClientChat;
window.loadCoachChat = loadCoachChat;
window.sendCoachMessage = sendCoachMessage;
window.openCoachChat = openCoachChat;
window.closeCoachChat = closeCoachChat;
window.showTemplatePicker = showTemplatePicker;
window.applyChatTemplate = applyChatTemplate;
window.getUnreadCountForClient = getUnreadCountForClient;
window.renderAllMessages = renderAllMessages;
window.updateGlobalChatBadge = updateGlobalChatBadge;
window.showCoachChatButton = showCoachChatButton;
window.hideCoachChatButton = hideCoachChatButton;
window.toggleCoachFabChat = toggleCoachFabChat;
window.updateParticipantNames = updateParticipantNames;
window.showClientChatButton = showClientChatButton;

// ── GLOBAL MESSAGES VIEW (Coach) ───────────────────────────

let clientChatListeners = [];
let clientsUnreadCounts = {};

function updateGlobalChatBadge() {
  const badge = document.getElementById('global-chat-badge');
  if (!badge) return;
  
  let totalUnread = 0;
  Object.values(clientsUnreadCounts).forEach(count => {
    totalUnread += count;
  });
  
  badge.textContent = totalUnread;
  badge.style.display = totalUnread > 0 ? 'inline-flex' : 'none';
  
  // Also update the Messages tab text
  const tabBtn = document.getElementById('ctab-messages');
  if (tabBtn && totalUnread > 0) {
    tabBtn.classList.add('has-unread');
  } else if (tabBtn) {
    tabBtn.classList.remove('has-unread');
  }
}

async function renderAllMessages() {
  console.log('>>> renderAllMessages CALLED');
  
  // FORCER l'affichage du tab parent
  const messagesTab = document.getElementById('coach-messages');
  if (messagesTab) {
    messagesTab.classList.remove('hidden');
    console.log('>>> Forced coach-messages visible');
  }
  
  const container = document.getElementById('messages-list');
  console.log('>>> container found:', !!container);
  
  if (!container) {
    alert('Erreur: messages-list introuvable dans le HTML');
    return;
  }
  
  // Test visuel immédiat
  container.innerHTML = '<p style="color:var(--gold);text-align:center;padding:2rem;font-weight:bold">Chargement en cours...</p>';
  
  try {
    // Charger d'abord la liste des coachs
    const coachesRef = window.fdb.collection(window.db, 'apps', APP_ID, 'users');
    const coachesSnap = await window.fdb.getDocs(coachesRef);
    const coaches = {};
    coachesSnap.forEach(doc => {
      const c = doc.data();
      console.log('>>> Coach found:', doc.id, c.displayName, c.name, c.email, c.isCoach, c.role);
      if (c.isCoach || c.role === 'coach' || c.role === 'admin') {
        coaches[doc.id] = c.displayName || c.name || c.email || 'Coach';
      }
    });
    
    console.log('>>> Coaches loaded:', Object.keys(coaches).length);
    console.log('>>> Coaches map:', coaches);
    
    console.log('>>> Loading clients from Firestore...');
    const clientsRef = window.fdb.collection(window.db, 'apps', APP_ID, 'clients');
    const clientsSnap = await window.fdb.getDocs(clientsRef);
    console.log('>>> Clients loaded:', clientsSnap.size);
    
    const clients = [];
    clientsSnap.forEach(doc => {
      const c = { id: doc.id, ...doc.data() };
      if (!c.archived) clients.push(c);
    });
    
    console.log('>>> Non-archived clients:', clients.length);
    
    if (clients.length === 0) {
      container.innerHTML = '<p style="color:var(--muted);text-align:center;padding:2rem">Aucun client trouvé dans Firestore.</p>';
      return;
    }
    
    // Afficher les clients immédiatement (même sans messages)
    const html = clients.map(client => {
      const coachName = client.coachUid && coaches[client.coachUid] 
        ? coaches[client.coachUid] 
        : 'Sans coach';
      return `
        <div onclick="openClientChatFromMessages('${client.id}')" 
             style="display:flex;align-items:center;gap:1rem;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:1rem;cursor:pointer;margin-bottom:.5rem;">
          <div style="width:3rem;height:3rem;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;font-size:1.25rem;font-weight:900;color:white;">
            ${(client.name || client.code || '?')[0].toUpperCase()}
          </div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div style="font-weight:900;font-size:1rem;text-transform:uppercase">${h(client.name || client.code)}</div>
              <div style="font-size:.7rem;color:var(--muted);background:var(--surface);padding:.2rem .5rem;border-radius:.25rem;">👤 ${h(coachName)}</div>
            </div>
            <p style="font-size:.85rem;color:var(--muted);margin:0;">Cliquez pour ouvrir le chat</p>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('>>> HTML length:', html.length);
    
    container.innerHTML = html;
    
    console.log('>>> Render complete -', clients.length, 'clients displayed');
    
  } catch (e) {
    console.error('>>> ERROR:', e);
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem">Erreur: ${e.message}</p>`;
  }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // seconds
  
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `il y a ${Math.floor(diff / 86400)} j`;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

async function openClientChatFromMessages(clientId) {
  // Find the client - try allClients first, then fallback to searching in visible clients
  let client = null;
  
  if (typeof allClients !== 'undefined' && allClients) {
    client = allClients.find(c => c.id === clientId);
  }
  
  // If not found, load from Firestore
  if (!client && APP_ID) {
    try {
      const clientRef = window.fdb.doc(window.db, 'apps', APP_ID, 'clients', clientId);
      const doc = await window.fdb.getDoc(clientRef);
      if (doc.exists) {
        client = { id: doc.id, ...doc.data() };
      }
    } catch (e) {
      console.error('Error loading client:', e);
    }
  }
  
  if (!client) {
    console.error('Client not found:', clientId);
    toast('Client non trouvé', 'e');
    return;
  }
  
  // Set currentClient for the chat
  if (typeof currentClient !== 'undefined') {
    currentClient = client;
  }
  
  // Open the client fiche
  if (typeof openClientFiche === 'function') {
    await openClientFiche(clientId);
  }
  
  // Switch to chat sub-tab
  if (typeof switchSubTab === 'function') {
    switchSubTab('chat');
  }
  
  // Open the chat panel
  openCoachChat();
}
