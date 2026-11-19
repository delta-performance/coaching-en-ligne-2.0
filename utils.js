function toast(msg, t='s', d=3000) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + t;
  el.innerHTML = '<span>' + msg + '</span>';
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.animation = 'tOut .3s ease forwards'; setTimeout(() => el.remove(), 300); }, d);
}
function openModal(id) { console.log('openModal', id); document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { console.log('closeModal', id); const el = document.getElementById(id); if(el) { el.classList.add('hidden'); console.log('hidden added to', id, 'classes:', el.className); } else { console.log('Element not found:', id); } }
document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.modal-bg').forEach(m => m.classList.add('hidden')); });
function h(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Groupe les exercices en prenant en compte les supersets
// Un exercice avec superset=true signifie "je suis lié à l'exercice suivant"
function groupExercises(exs) {
  const groups = [];
  let i = 0;
  while (i < exs.length) {
    if (exs[i].superset === true && i + 1 < exs.length) {
      const startIdx = i;
      const items = [{ ex: exs[i], idx: i }];
      while (exs[i].superset === true && i + 1 < exs.length) {
        i++;
        items.push({ ex: exs[i], idx: i });
      }
      i++;
      groups.push({ type: 'superset', items, startIdx });
    } else {
      groups.push({ type: 'single', ex: exs[i], idx: i });
      i++;
    }
  }
  return groups;
}

function getActiveSessions(c) {
  let arr = [];
  // Inclure toutes les séances de sessions_active
  if (c && Array.isArray(c.sessions_active)) {
    arr = [...c.sessions_active];
  }
  // Inclure aussi toutes les séances de sessions qui ne sont pas déjà listées
  const sessionKeys = Object.keys(c && c.sessions ? c.sessions : {});
  sessionKeys.forEach(key => {
    if (!arr.includes(key)) arr.push(key);
  });
  return arr.sort((a,b) => a.localeCompare(b));
}

// Safe accessor for workoutData (guards against missing script)
function getWorkoutData() { return (typeof workoutData !== 'undefined') ? workoutData : {}; }
function getSessParamsSafe(c,t) { return typeof getSessParams === 'function' ? getSessParams(c,t) : {}; }

function normalizeSessionData(session) {
  if (!session || Array.isArray(session)) {
    return { type: 'physical', rest: '45s', tours: '3', mode: 'circuit', comment: '', exercises: Array.isArray(session) ? session : [] };
  }
  return {
    type: session.type || 'physical',
    rest: session.rest || '45s',
    tours: session.tours || '3',
    mode: session.mode || 'circuit',
    comment: session.comment || '',
    exercises: Array.isArray(session.exercises) ? session.exercises : [],
    energetic: session.energetic || null,
    mental: session.mental || null
  };
}

function sessionTypeLabel(type) {
  return ({ physical: 'Physique', energetic: 'Énergétique', mental: 'Prépa mentale' })[type] || 'Physique';
}

function parseEnergeticBlocks(raw) {
  return String(raw || '').split('\\n').map(line => line.trim()).filter(Boolean).map(line => {
    const [title = '', duration = '', instruction = ''] = line.split('|').map(x => x.trim());
    return { title, duration, instruction };
  });
}

function formatEnergeticBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map(b => [b.title, b.duration, b.instruction].filter(Boolean).join(' | ')).join('\\n');
}

function sessionTypeChanged(prefix) {
  const type = document.getElementById(prefix === 'ed' ? 'ed-session-type' : 'bp-ed-session-type')?.value || 'physical';
  const fields = document.getElementById(prefix + '-energetic-fields');
  if (fields) fields.style.display = type === 'energetic' ? 'block' : 'none';
}

const SESS_COLORS = ['#3b82f6','#10b981','#f97316','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1'];
function getSessColor(sessKey, idx) {
  if (!isNaN(idx)) return SESS_COLORS[idx % SESS_COLORS.length];
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const i = keys.indexOf(String(sessKey).toUpperCase());
  return SESS_COLORS[(i >= 0 ? i : 0) % SESS_COLORS.length];
}

function isAdminUser() {
  return !!(currentUser && currentUser.isCoach && currentUser.role === 'admin');
}

function isCoachUser() {
  return !!(currentUser && currentUser.isCoach && currentUser.role === 'coach');
}

function canManageClient(client) {
  if (!client || !currentUser || !currentUser.isCoach) return false;
  if (isAdminUser()) return true;
  if (!isCoachUser()) return false;
  const managed = Array.isArray(currentUser.managedClientIds) ? currentUser.managedClientIds : [];
  return client.coachUid === currentUser.uid || managed.includes(client.id);
}

function getVisibleClients() {
  if (!Array.isArray(allClients)) return [];
  if (!currentUser || !currentUser.isCoach) return allClients;
  return allClients.filter(c => canManageClient(c));
}
