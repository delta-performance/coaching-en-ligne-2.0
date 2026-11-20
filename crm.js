window.crmState = { prospects: [], appointments: [], tunnel: Object.assign({}, window.TUNNEL_DEFAULTS || {}) };

const crmRef = (...path) => window.fdb.doc(window.db, 'apps', APP_ID, ...path);
const slotId = a => `${a.date}_${a.time}`;

async function crmLoad() {
  if (!currentUser?.isCoach) return;
  try {
    const [pSnap, aSnap, tSnap] = await Promise.all([
      window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'prospects')),
      window.fdb.getDocs(window.fdb.collection(window.db, 'apps', APP_ID, 'appointments')),
      window.fdb.getDoc(crmRef('settings', 'tunnel')).catch(() => null)
    ]);
    crmState.prospects = []; pSnap.forEach(d => crmState.prospects.push({ id: d.id, ...d.data() }));
    crmState.appointments = []; aSnap.forEach(d => crmState.appointments.push({ id: d.id, ...d.data() }));
    crmState.tunnel = Object.assign({}, window.TUNNEL_DEFAULTS || {}, tSnap && tSnap.exists ? tSnap.data() : {});
    renderProspects(); renderAppointments(); renderTunnelSettings();
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

function convertProspect(id) {
  const p = crmState.prospects.find(x => x.id === id); if (!p) return;
  openClientFromLead(p, { prospectId: id });
}

function convertAppointment(id) {
  const a = crmState.appointments.find(x => x.id === id); if (!a) return;
  openClientFromLead(a, { appointmentId: id, prospectId: a.prospectId || '' });
}

function isExistingClientEmail(email) {
  const e = String(email || '').toLowerCase();
  return !!e && typeof allClients !== 'undefined' && allClients.some(c => String(c.email || '').toLowerCase() === e);
}

function generateClientPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pwd = Array.from(crypto.getRandomValues(new Uint32Array(10)), n => chars[n % chars.length]).join('');
  const el = document.getElementById('nc-password');
  if (el) { el.value = pwd; el.type = 'text'; }
}

function openClientFromLead(lead, refs) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('nc-prenom', lead.name);
  set('nc-email', lead.email);
  set('nc-phone', lead.phone);
  set('nc-code', '');
  set('nc-objectif', [lead.objectiveType, lead.objective].filter(Boolean).join(' — '));
  generateClientPassword();
  window._crmPendingConversion = { email: String(lead.email || '').toLowerCase(), ...refs };
  openModal('modal-add-client');
}

async function crmAfterClientCreated(email, clientId) {
  const pending = window._crmPendingConversion;
  window._crmPendingConversion = null;
  if (!pending || pending.email !== String(email || '').toLowerCase()) return;
  const now = new Date().toISOString();
  try {
    if (pending.prospectId) {
      await crmRef('prospects', pending.prospectId).set({ status: 'converted', clientId, updatedAt: now }, { merge: true });
      const p = crmState.prospects.find(x => x.id === pending.prospectId); if (p) Object.assign(p, { status: 'converted', clientId });
    }
    const appts = crmState.appointments.filter(a => a.id === pending.appointmentId || (pending.prospectId && a.prospectId === pending.prospectId));
    for (const a of appts) { await crmRef('appointments', a.id).set({ clientId, updatedAt: now }, { merge: true }); a.clientId = clientId; }
  } catch (e) { console.error(e); }
  renderProspects(); renderAppointments();
}

function answersHtml(x) {
  const qa = Array.isArray(x.answers) ? x.answers : [];
  if (!qa.length) return '';
  return `<details style="font-size:.75rem;color:var(--muted);margin-top:.35rem"><summary style="cursor:pointer;color:var(--gold)">Voir l'entretien (${qa.length} réponses)</summary><div style="margin-top:.35rem;display:grid;gap:.25rem">${qa.map(r => `<div><span style="opacity:.75">${h(r.q)}</span><br><b style="color:var(--text);font-weight:600">${h(r.a)}</b></div>`).join('')}</div></details>`;
}

function renderProspects() {
  const el = document.getElementById('prospects-list'); if (!el) return;
  const statuses = { new: 'Nouveau', contacted: 'Contacté', booked: 'RDV pris', proposal: 'Proposition', converted: 'Client', lost: 'Perdu' };
  el.innerHTML = crmState.prospects.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(p => `
    <div class="card" style="padding:1rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:220px"><strong>${h(p.name)}</strong><div style="font-size:.75rem;color:var(--muted)">${h(p.email)} ${p.phone ? '· ' + h(p.phone) : ''}</div><div style="font-size:.75rem;color:var(--muted);margin-top:.35rem">${p.objectiveType ? `<b style="color:var(--gold)">${h(p.objectiveType)}</b> · ` : ''}${h(p.objective || 'Objectif non renseigné')}</div>${p.level || p.blocker ? `<div style="font-size:.75rem;color:var(--muted);margin-top:.25rem">${p.level ? h(p.level) : ''}${p.level && p.blocker ? ' · ' : ''}${p.blocker ? 'Frein : ' + h(p.blocker) : ''}</div>` : ''}${answersHtml(p)}</div>
      <select class="inp" style="width:auto" onchange="updateProspectStatus('${p.id}', this.value)">${Object.entries(statuses).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      ${p.status !== 'converted' && !isExistingClientEmail(p.email) ? `<button class="btn btn-gold btn-sm" onclick="convertProspect('${p.id}')">+ Créer le client</button>` : '<span class="badge badge-client">CLIENT</span>'}
    </div>`).join('') || '<p style="color:var(--muted);font-style:italic">Aucun prospect pour le moment.</p>';
}

async function createAppointment() {
  const name = document.getElementById('appointment-name')?.value.trim();
  const email = document.getElementById('appointment-email')?.value.trim().toLowerCase();
  const phone = document.getElementById('appointment-phone')?.value.trim() || '';
  const date = document.getElementById('appointment-date')?.value;
  const time = document.getElementById('appointment-time')?.value;
  if (!name || !email || !date || !time) { toast('Nom, email, date et heure requis', 'w'); return; }
  const id = 'appointment_' + Date.now();
  const appointment = { name, email, phone, date, time, status: 'booked', source: 'coach', createdAt: new Date().toISOString(), ownerUid: currentUser.uid };
  await window.fdb.setDoc(crmRef('appointments', id), appointment);
  await window.fdb.setDoc(crmRef('tunnel_slots', slotId(appointment)), { date, time, createdAt: appointment.createdAt }).catch(e => console.warn(e));
  crmState.appointments.push({ id, ...appointment });
  ['appointment-name', 'appointment-email', 'appointment-phone', 'appointment-date', 'appointment-time'].forEach(x => { const el = document.getElementById(x); if (el) el.value = ''; });
  renderAppointments(); toast('Rendez-vous enregistré', 's');
}

const APPOINTMENT_STATUSES = { booked: 'Réservé', confirmed: 'Confirmé', done: 'Effectué', noshow: 'Absent', cancelled: 'Annulé' };

async function updateAppointmentStatus(id, status) {
  const a = crmState.appointments.find(x => x.id === id); if (!a) return;
  const wasCancelled = a.status === 'cancelled';
  a.status = status; a.updatedAt = new Date().toISOString();
  try {
    await window.fdb.setDoc(crmRef('appointments', id), a);
    if (status === 'cancelled' && !wasCancelled) await window.fdb.deleteDoc(crmRef('tunnel_slots', slotId(a)));
    if (status !== 'cancelled' && wasCancelled) await window.fdb.setDoc(crmRef('tunnel_slots', slotId(a)), { date: a.date, time: a.time, createdAt: a.updatedAt });
    toast(status === 'cancelled' ? 'RDV annulé — créneau libéré' : 'Statut mis à jour', 's');
  } catch (e) { console.error(e); toast('Erreur de mise à jour', 'e'); }
  renderAppointments();
}

async function deleteAppointment(id) {
  const a = crmState.appointments.find(x => x.id === id); if (!a) return;
  if (!confirm(`Supprimer le RDV de ${a.name} (${a.date} ${a.time}) ?`)) return;
  try {
    await window.fdb.deleteDoc(crmRef('appointments', id));
    if (a.status !== 'cancelled') await window.fdb.deleteDoc(crmRef('tunnel_slots', slotId(a)));
    crmState.appointments = crmState.appointments.filter(x => x.id !== id);
    renderAppointments(); toast('RDV supprimé', 's');
  } catch (e) { console.error(e); toast('Erreur de suppression', 'e'); }
}

function renderAppointments() {
  const el = document.getElementById('appointments-list'); if (!el) return;
  const filter = document.getElementById('appointments-filter')?.value || 'upcoming';
  const today = new Date().toISOString().slice(0, 10);
  let rows = crmState.appointments.slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  if (filter === 'upcoming') rows = rows.filter(a => a.date >= today && a.status !== 'cancelled');
  if (filter === 'past') rows = rows.filter(a => a.date < today).reverse();
  if (filter === 'tunnel') rows = rows.filter(a => a.source === 'tunnel').reverse();
  const badge = document.getElementById('crm-new-badge');
  const pending = crmState.appointments.filter(a => a.source === 'tunnel' && a.status === 'booked' && a.date >= today).length;
  if (badge) { badge.textContent = pending; badge.style.display = pending ? '' : 'none'; }
  const colors = { booked: 'var(--gold)', confirmed: 'var(--green)', done: 'var(--blue)', noshow: 'var(--orange)', cancelled: 'var(--muted)' };
  el.innerHTML = rows.map(a => `<div class="card" style="padding:1rem;display:flex;justify-content:space-between;gap:1rem;align-items:center;flex-wrap:wrap;${a.status === 'cancelled' ? 'opacity:.55' : ''}">
      <div style="flex:1;min-width:220px"><strong>${h(a.name)}</strong> ${a.source === 'tunnel' ? '<span class="badge" style="background:rgba(240,165,0,.12);color:var(--gold);margin-left:.35rem">TUNNEL</span>' : ''}
        <div style="font-size:.75rem;color:var(--muted)">${h(a.email || '')}${a.phone ? ' · <a href="tel:' + h(a.phone) + '" style="color:inherit">' + h(a.phone) + '</a>' : ''}</div>
        ${a.objective || a.objectiveType ? `<div style="font-size:.75rem;color:var(--muted);margin-top:.35rem">${a.objectiveType ? `<b style="color:var(--gold)">${h(a.objectiveType)}</b> · ` : ''}${h(a.objective || '')}</div>` : ''}${answersHtml(a)}</div>
      <span class="badge" style="background:rgba(16,185,129,.12);color:${colors[a.status] || 'var(--green)'}">${h(a.date)} · ${h(a.time)}</span>
      <select class="inp" style="width:auto" onchange="updateAppointmentStatus('${a.id}', this.value)">${Object.entries(APPOINTMENT_STATUSES).map(([k, v]) => `<option value="${k}" ${(a.status || 'booked') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      ${a.clientId || isExistingClientEmail(a.email) ? '<span class="badge badge-client">CLIENT</span>' : `<button class="btn btn-gold btn-sm" onclick="convertAppointment('${a.id}')">+ Créer le client</button>`}
      <button class="btn btn-ghost btn-sm" title="Supprimer" onclick="deleteAppointment('${a.id}')">✕</button>
    </div>`).join('') || '<p style="color:var(--muted);font-style:italic">Aucun rendez-vous.</p>';
}

const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TUNNEL_TEXT_FIELDS = ['web3formsKey', 'publicUrl'];

function renderTunnelSettings() {
  const t = crmState.tunnel;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
  const enabled = document.getElementById('tunnel-enabled'); if (enabled) enabled.checked = t.enabled !== false;
  TUNNEL_TEXT_FIELDS.forEach(k => set('tunnel-' + k, t[k]));
  set('tunnel-slots', (t.slots || []).join(', '));
  set('tunnel-blockedDates', (t.blockedDates || []).join('\n'));
  set('tunnel-maxDaysAhead', t.maxDaysAhead);
  set('tunnel-minHoursBefore', t.minHoursBefore);
  const days = document.getElementById('tunnel-closedWeekdays');
  if (days) days.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => `<label style="display:flex;gap:.35rem;align-items:center;font-size:.8rem"><input type="checkbox" value="${d}" ${(t.closedWeekdays || []).map(Number).includes(d) ? 'checked' : ''}>${WEEKDAYS[d]}</label>`).join('');
  const link = document.getElementById('tunnel-link'); if (link) { link.href = t.publicUrl || 'tunnel.html'; link.textContent = t.publicUrl || 'tunnel.html'; }
  const stats = document.getElementById('tunnel-stats');
  if (stats) {
    const month = new Date().toISOString().slice(0, 7);
    const fromTunnel = crmState.appointments.filter(a => a.source === 'tunnel');
    stats.textContent = `${fromTunnel.filter(a => String(a.createdAt).startsWith(month)).length} résa(s) ce mois · ${fromTunnel.length} au total`;
  }
}

function readTunnelForm() {
  const val = id => document.getElementById(id)?.value.trim() ?? '';
  const t = { enabled: !!document.getElementById('tunnel-enabled')?.checked };
  TUNNEL_TEXT_FIELDS.forEach(k => { t[k] = val('tunnel-' + k); });
  t.slots = [...new Set(val('tunnel-slots').split(/[,;\s]+/).map(x => x.replace('h', ':')).filter(x => /^\d{1,2}:\d{2}$/.test(x)).map(x => x.padStart(5, '0')))].sort();
  t.blockedDates = val('tunnel-blockedDates').split(/[,;\s]+/).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
  t.closedWeekdays = [...document.querySelectorAll('#tunnel-closedWeekdays input:checked')].map(x => Number(x.value));
  t.maxDaysAhead = Math.max(1, parseInt(val('tunnel-maxDaysAhead'), 10) || 30);
  t.minHoursBefore = Math.max(0, parseInt(val('tunnel-minHoursBefore'), 10) || 0);
  return t;
}

async function saveTunnelSettings() {
  if (!isAdminUser()) { toast('Réservé à l\'admin', 'w'); return; }
  const t = readTunnelForm();
  if (!t.slots.length) { toast('Ajoute au moins un créneau (ex : 09:00, 14:30)', 'w'); return; }
  t.updatedAt = new Date().toISOString();
  try {
    await crmRef('settings', 'tunnel').set(t, { merge: true });
    crmState.tunnel = Object.assign({}, window.TUNNEL_DEFAULTS || {}, t);
    renderTunnelSettings(); toast('Tunnel mis à jour', 's');
  } catch (e) { console.error(e); toast('Erreur d\'enregistrement (règles Firestore ?)', 'e'); }
}

async function testTunnelEmail() {
  const key = document.getElementById('tunnel-web3formsKey')?.value.trim();
  if (!key) { toast('Renseigne d\'abord la clé Web3Forms', 'w'); return; }
  try {
    const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ access_key: key, subject: 'Test notification tunnel DELTA', from_name: 'DELTA Performance — Tunnel', message: 'Si tu reçois ce mail, les notifications de réservation fonctionnent.' }) });
    const json = await res.json().catch(() => ({}));
    if (json.success) toast('Email de test envoyé — vérifie ta boîte', 's', 5000);
    else toast('Échec : ' + h(json.message || res.status), 'e', 6000);
  } catch (e) { console.error(e); toast('Échec de l\'envoi', 'e'); }
}

function copyTunnelLink() {
  const url = crmState.tunnel.publicUrl || '';
  navigator.clipboard?.writeText(url).then(() => toast('Lien copié', 's')).catch(() => prompt('Lien du tunnel :', url));
}

function openCrmTab(tab) {
  document.querySelectorAll('[data-crm-view]').forEach(el => el.classList.toggle('hidden', el.dataset.crmView !== tab));
  document.querySelectorAll('[data-crm-tab]').forEach(el => { el.classList.toggle('on', el.dataset.crmTab === tab); el.classList.toggle('off', el.dataset.crmTab !== tab); });
  if (tab === 'prospects') renderProspects();
  if (tab === 'appointments') renderAppointments();
  if (tab === 'tunnel') renderTunnelSettings();
}
