window.crmState = { prospects: [], appointments: [] };

async function crmLoad() {
  if (!currentUser?.isCoach) return;
  try {
    const [pSnap, aSnap] = await Promise.all([
      window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'prospects')),
      window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'appointments'))
    ]);
    crmState.prospects = []; pSnap.forEach(d => crmState.prospects.push({ id: d.id, ...d.data() }));
    crmState.appointments = []; aSnap.forEach(d => crmState.appointments.push({ id: d.id, ...d.data() }));
    renderProspects(); renderAppointments();
  } catch (e) { console.error(e); toast('Erreur chargement CRM', 'e'); }
}

async function createProspect() {
  const name = document.getElementById('prospect-name')?.value.trim();
  const email = document.getElementById('prospect-email')?.value.trim().toLowerCase();
  const phone = document.getElementById('prospect-phone')?.value.trim() || '';
  const objective = document.getElementById('prospect-objective')?.value.trim() || '';
  if (!name || !email) { toast('Nom et email requis', 'w'); return; }
  const id = 'prospect_' + Date.now();
  const prospect = { name, email, phone, objective, status: 'new', source: 'coach', createdAt: new Date().toISOString(), ownerUid: currentUser.uid };
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'prospects', id), prospect);
  crmState.prospects.unshift({ id, ...prospect });
  ['prospect-name', 'prospect-email', 'prospect-phone', 'prospect-objective'].forEach(x => { const el = document.getElementById(x); if (el) el.value = ''; });
  renderProspects(); toast('Prospect ajouté', 's');
}

async function updateProspectStatus(id, status) {
  const p = crmState.prospects.find(x => x.id === id); if (!p) return;
  p.status = status; p.updatedAt = new Date().toISOString();
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'prospects', id), p);
  renderProspects();
}

async function convertProspect(id) {
  const p = crmState.prospects.find(x => x.id === id); if (!p) return;
  document.getElementById('nc-prenom').value = p.name || '';
  document.getElementById('nc-email').value = p.email || '';
  document.getElementById('nc-objectif').value = p.objective || '';
  openModal('modal-add-client');
  await updateProspectStatus(id, 'converted');
}

function renderProspects() {
  const el = document.getElementById('prospects-list'); if (!el) return;
  const statuses = { new: 'Nouveau', contacted: 'Contacté', booked: 'RDV pris', proposal: 'Proposition', converted: 'Client', lost: 'Perdu' };
  el.innerHTML = crmState.prospects.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(p => `
    <div class="card" style="padding:1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:220px"><strong>${h(p.name)}</strong><div style="font-size:.75rem;color:var(--muted)">${h(p.email)} ${p.phone ? '· ' + h(p.phone) : ''}</div><div style="font-size:.75rem;color:var(--muted);margin-top:.35rem">${h(p.objective || 'Objectif non renseigné')}</div></div>
      <select class="inp" style="width:auto" onchange="updateProspectStatus('${p.id}', this.value)">${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      ${p.status !== 'converted' ? `<button class="btn btn-gold btn-sm" onclick="convertProspect('${p.id}')">Convertir</button>` : '<span class="badge badge-client">CLIENT</span>'}
    </div>`).join('') || '<p style="color:var(--muted);font-style:italic">Aucun prospect pour le moment.</p>';
}

async function createAppointment() {
  const name = document.getElementById('appointment-name')?.value.trim();
  const email = document.getElementById('appointment-email')?.value.trim().toLowerCase();
  const date = document.getElementById('appointment-date')?.value;
  const time = document.getElementById('appointment-time')?.value;
  if (!name || !email || !date || !time) { toast('Tous les champs du rendez-vous sont requis', 'w'); return; }
  const id = 'appointment_' + Date.now();
  const appointment = { name, email, date, time, status: 'booked', createdAt: new Date().toISOString(), ownerUid: currentUser.uid };
  await window.fdb.setDoc(window.fdb.doc(window.db, 'apps', APP_ID, 'appointments', id), appointment);
  crmState.appointments.push({ id, ...appointment });
  ['appointment-name', 'appointment-email', 'appointment-date', 'appointment-time'].forEach(x => { const el = document.getElementById(x); if (el) el.value = ''; });
  renderAppointments(); toast('Rendez-vous enregistré', 's');
}

function renderAppointments() {
  const el = document.getElementById('appointments-list'); if (!el) return;
  const rows = crmState.appointments.slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  el.innerHTML = rows.map(a => `<div class="card" style="padding:1rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap"><div><strong>${h(a.name)}</strong><div style="font-size:.75rem;color:var(--muted)">${h(a.email)}</div></div><span class="badge" style="background:rgba(16,185,129,.12);color:var(--green)">${h(a.date)} · ${h(a.time)}</span></div>`).join('') || '<p style="color:var(--muted);font-style:italic">Aucun rendez-vous.</p>';
}

function openCrmTab(tab) {
  document.querySelectorAll('[data-crm-view]').forEach(el => el.classList.toggle('hidden', el.dataset.crmView !== tab));
  document.querySelectorAll('[data-crm-tab]').forEach(el => el.classList.toggle('on', el.dataset.crmTab === tab));
  if (tab === 'prospects') renderProspects();
  if (tab === 'appointments') renderAppointments();
}
