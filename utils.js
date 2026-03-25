function toast(msg, t='s', d=3000) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + t;
  el.innerHTML = '<span>' + msg + '</span>';
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.animation = 'tOut .3s ease forwards'; setTimeout(() => el.remove(), 300); }, d);
}
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
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
  let arr;
  if (c && Array.isArray(c.sessions_active) && c.sessions_active.length > 0) arr = [...c.sessions_active];
  else arr = Object.keys(c && c.sessions ? c.sessions : {}).filter(k => {
    const s = c.sessions[k];
    if (!s) return false;
    const exs = Array.isArray(s) ? s : (s.exercises || []);
    return exs.length > 0;
  });
  return arr.sort((a,b) => a.localeCompare(b));
}

// Safe accessor for workoutData (guards against missing script)
function getWorkoutData() { return (typeof workoutData !== 'undefined') ? workoutData : {}; }
function getSessParamsSafe(c,t) { return typeof getSessParams === 'function' ? getSessParams(c,t) : {}; }

const SESS_COLORS = ['#3b82f6','#10b981','#f97316','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#6366f1'];
function getSessColor(sessKey, idx) {
  if (!isNaN(idx)) return SESS_COLORS[idx % SESS_COLORS.length];
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const i = keys.indexOf(String(sessKey).toUpperCase());
  return SESS_COLORS[(i >= 0 ? i : 0) % SESS_COLORS.length];
}
