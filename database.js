// ═══════════════════════════════════
// EXERCISE DATABASE
// ═══════════════════════════════════

function updateDbFilterDropdowns() {
  const zones = [...new Set(exerciseDb.map(e => e.zone).filter(Boolean))].sort();
  const patterns = [...new Set(exerciseDb.map(e => e.pattern).filter(Boolean))].sort();

  ['dbf-zone'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Toutes zones</option>' + zones.map(z => `<option value="${z}">${h(z)}</option>`).join('');
  });

  ['dbf-pattern'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Tous patterns</option>' + patterns.map(p => `<option value="${p}">${h(p)}</option>`).join('');
  });

  // datalists for add/edit forms
  document.getElementById('zone-list').innerHTML = zones.map(z => `<option value="${z}">`).join('');
  document.getElementById('pattern-list').innerHTML = patterns.map(p => `<option value="${p}">`).join('');
}

function renderDatabase() {
  const body = document.getElementById('db-body');
  if (!body) return;

  const zone = document.getElementById('dbf-zone')?.value || '';
  const pattern = document.getElementById('dbf-pattern')?.value || '';
  const search = (document.getElementById('dbf-search')?.value || '').toLowerCase();

  const list = exerciseDb.filter(e => {
    if (zone && e.zone !== zone) return false;
    if (pattern && e.pattern !== pattern) return false;
    if (search && !e.name.toLowerCase().includes(search) && !(e.zone || '').toLowerCase().includes(search)) return false;
    return true;
  });

  if (!list.length) {
    body.innerHTML = '<tr><td colspan="7" style="padding:3rem;text-align:center;color:var(--muted);font-style:italic">Aucun exercice.' + (exerciseDb.length === 0 ? ' Ajoutez le premier !' : '') + '</td></tr>';
    return;
  }

  body.innerHTML = list.map(e => `<tr class="db-row">
    <td style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;font-style:italic">${h(e.name)}</td>
    <td><span class="badge" style="background:rgba(240,165,0,.1);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${h(e.zone || '—')}</span></td>
    <td><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${h(e.pattern || '—')}</span></td>
    <td style="font-size:.8rem;color:var(--muted)">${h(e.lat || '—')}</td>
    <td>${e.photo ? `<img src="${h(e.photo)}" style="width:3rem;height:3rem;object-fit:cover;border-radius:.5rem;border:1px solid var(--border)" onerror="this.style.display='none'">` : '<span style="color:var(--border);font-size:.75rem">—</span>'}</td>
    <td>${e.video ? `<a href="${h(e.video)}" target="_blank" style="font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--gold);text-decoration:none">VOIR</a>` : '<span style="color:var(--border);font-size:.75rem">—</span>'}</td>
    <td style="text-align:right">
      <button class="btn btn-ghost btn-sm" onclick="openEditExercise('${e.id}')" style="margin-right:.5rem">Modifier</button>
      <button class="btn btn-danger btn-sm" onclick="deleteExFromDb('${e.id}')">Suppr.</button>
    </td>
  </tr>`).join('');
}

async function saveExerciseToDb() {
  const name = document.getElementById('dbex-name').value.trim();
  const zone = document.getElementById('dbex-zone').value.trim();
  const pattern = document.getElementById('dbex-pattern').value.trim();

  if (!name || !zone || !pattern) {
    toast('Nom, zone et pattern requis', 'w');
    return;
  }

  const lat = document.getElementById('dbex-lat').value;
  const desc = document.getElementById('dbex-desc').value.trim();
  const videoUrl = document.getElementById('dbex-video').value.trim();
  const photoUrl = document.getElementById('dbex-photo-url').value.trim();

  // Handle file upload (convert to base64)
  let photoFinal = photoUrl;
  const file = document.getElementById('dbex-photo-file').files[0];

  if (file) {
    photoFinal = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej();
      r.readAsDataURL(file);
    });
  }

  const newId = 'ex_' + Date.now();
  const exData = {
    name,
    zone,
    pattern,
    lat,
    desc,
    photo: photoFinal,
    video: videoUrl,
    createdAt: new Date().toISOString()
  };

  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'exerciseDb', newId), exData);

  exerciseDb.push({ id: newId, ...exData });

  closeModal('modal-add-exercise');

  ['dbex-name', 'dbex-zone', 'dbex-pattern', 'dbex-desc', 'dbex-photo-url', 'dbex-video'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.getElementById('dbex-photo-file').value = '';
  document.getElementById('dbex-lat').value = 'Bilatéral';

  updateDbFilterDropdowns();
  renderDatabase();

  toast(name + ' ajouté à la base !', 's');
}

function openEditExercise(exId) {
  const ex = exerciseDb.find(e => e.id === exId);
  if (!ex) return;

  currentEditExId = exId;

  document.getElementById('edit-dbex-name').value = ex.name || '';
  document.getElementById('edit-dbex-zone').value = ex.zone || '';
  document.getElementById('edit-dbex-pattern').value = ex.pattern || '';
  document.getElementById('edit-dbex-lat').value = ex.lat || 'Bilatéral';
  document.getElementById('edit-dbex-desc').value = ex.desc || '';
  document.getElementById('edit-dbex-photo-url').value = ex.photo || '';
  document.getElementById('edit-dbex-video').value = ex.video || '';

  openModal('modal-edit-exercise');
}

async function updateExerciseInDb() {
  if (!currentEditExId) return;

  const name = document.getElementById('edit-dbex-name').value.trim();
  const zone = document.getElementById('edit-dbex-zone').value.trim();
  const pattern = document.getElementById('edit-dbex-pattern').value.trim();

  if (!name || !zone || !pattern) {
    toast('Nom, zone et pattern requis', 'w');
    return;
  }

  const lat = document.getElementById('edit-dbex-lat').value;
  const desc = document.getElementById('edit-dbex-desc').value.trim();
  const videoUrl = document.getElementById('edit-dbex-video').value.trim();
  const photoUrl = document.getElementById('edit-dbex-photo-url').value.trim();

  // Handle file upload (convert to base64)
  let photoFinal = photoUrl;
  const file = document.getElementById('edit-dbex-photo-file').files[0];

  if (file) {
    photoFinal = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej();
      r.readAsDataURL(file);
    });
  }

  const exData = {
    name,
    zone,
    pattern,
    lat,
    desc,
    photo: photoFinal,
    video: videoUrl,
    updatedAt: new Date().toISOString()
  };

  // Keep original createdAt
  const original = exerciseDb.find(e => e.id === currentEditExId);
  if (original && original.createdAt) {
    exData.createdAt = original.createdAt;
  }

  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'exerciseDb', currentEditExId), exData);

  // Update in local array
  const idx = exerciseDb.findIndex(e => e.id === currentEditExId);
  if (idx !== -1) {
    exerciseDb[idx] = { id: currentEditExId, ...exData };
  }

  closeModal('modal-edit-exercise');
  currentEditExId = null;

  updateDbFilterDropdowns();
  renderDatabase();

  toast(name + ' modifié !', 's');
}

let _delExPending = null;

async function deleteExFromDb(id) {
  if (_delExPending !== id) {
    _delExPending = id;
    setTimeout(() => _delExPending = null, 3000);
    toast('Cliquez encore pour confirmer', 'w', 3000);
    return;
  }
  _delExPending = null;

  await window.fdb.deleteDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'exerciseDb', id));

  exerciseDb = exerciseDb.filter(e => e.id !== id);

  updateDbFilterDropdowns();
  renderDatabase();
  toast('Exercice supprimé', 'i');
}

// Export to window
Object.assign(window, {
  updateDbFilterDropdowns,
  renderDatabase,
  saveExerciseToDb,
  openEditExercise,
  updateExerciseInDb,
  deleteExFromDb
});
