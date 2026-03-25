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
  if (c && Array.isArray(c.sessions_active) && c.sessions_active.length >= 0) return c.sessions_active;
  return ['A', 'B', 'C', 'D'];
}
