// ── CLIENT TRACKING ───────────────────────────────────────
if (typeof _weightHistory === 'undefined') window._weightHistory = [];

// Initialiser currentClient côté client
function initCurrentClient() {
  if (!currentClient && currentUser && !currentUser.isCoach && currentUser.id) {
    // Charger les données du client depuis la grille
    const clientData = document.querySelector('.client-card[data-client-id]');
    if (clientData) {
      const clientId = clientData.getAttribute('data-client-id');
      const allClients = typeof allClients !== 'undefined' ? allClients : [];
      const found = allClients.find(c => c.id === clientId);
      if (found) {
        currentClient = found;
        console.log('✅ currentClient initialisé:', found);
        // Charger l'historique des poids
        loadClientWeightHistory();
      }
    }
  }
}

// Charger l'historique des poids côté client
async function loadClientWeightHistory() {
  if (!currentClient) return;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','weightHistory'));
    _weightHistory = (doc.exists && doc.data()?.entries) ? doc.data().entries : [];
    console.log('✅ Historique poids chargé:', _weightHistory.length, 'entrées');
  } catch(e) { 
    console.error('❌ Erreur chargement historique:', e);
    _weightHistory = [];
  }
}

function renderClientTracking() {
  const el = document.getElementById('client-tracking-section');
  if (!el) return;

  // Initialiser currentClient si ce n'est pas fait
  initCurrentClient();
  // Charger les données PR
  loadClientPRData();

  console.log('🔍 renderClientTracking - currentClient:', currentClient);
  console.log('🔍 renderClientTracking - currentUser:', currentUser);
  
  if (!currentClient) {
    el.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--muted)"><p>Chargement des informations client...</p></div>';
    return;
  }

  const hasWeight = (_weightHistory || []).length > 0;
  const hasBodyFat = (_weightHistory || []).some(e => e.bodyFat);
  const exNames = Object.keys(_clientPRData?.records || {}).sort();

  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:1.5rem">
    <!-- Section Poids (toujours visible) -->
    ${hasWeight ? `
      <div class="card" style="padding:2rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">⚖️ PROGRESSION POIDS</h4>
          <button onclick="openClientAddWeightEntry()" class="btn btn-primary btn-sm">+ Ajouter une mesure</button>
        </div>
        <div>${_renderClientWeightChart()}</div>
      </div>
    ` : `
      <div class="card" style="padding:2rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase">⚖️ PROGRESSION POIDS</h4>
          <button onclick="openClientAddWeightEntry()" class="btn btn-primary btn-sm">+ Ajouter une mesure</button>
        </div>
        <p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune mesure enregistrée. Commencez à suivre votre poids !</p>
      </div>
    `}
    
    <!-- Section Masse Grasse (visible si données existent) -->
    ${hasBodyFat ? `
      <div class="card" style="padding:2rem">
        <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1.5rem">📈 PROGRESSION MASSE GRASSE</h4>
        <div>${_renderClientBodyFatChart()}</div>
      </div>
    ` : ''}
    
    <!-- Section Progression 1RM par exercice -->
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:1rem">💪 PROGRESSION 1RM</h4>
      <div style="display:flex;gap:.75rem;flex-wrap:wrap;align-items:center;margin-bottom:1.5rem">
        <select id="client-prog-ex-select" class="inp" style="width:auto" onchange="renderClientExProgressChart()">
          <option value="">-- Choisir un exercice --</option>
          ${exNames.map(n=>`<option value="${h(n)}">${h(n)}</option>`).join('')}
        </select>
      </div>
      <div id="client-prog-ex-chart"><p style="color:var(--muted);font-style:italic;font-size:.8rem">Sélectionnez un exercice ci-dessus pour voir votre progression.</p></div>
    </div>

    <!-- Section Tonnage par séance -->
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:.5rem">📦 TONNAGE PAR SÉANCE</h4>
      <p style="font-size:.75rem;color:var(--muted);margin-bottom:1.5rem">Tonnage total (kg) de chaque séance validée avec saisie de charges.</p>
      <div id="client-tonnage-chart">${_renderClientTonnageChart()}</div>
    </div>

    <!-- Section Meilleurs 1RM -->
    <div class="card" style="padding:2rem">
      <h4 style="font-size:1.5rem;font-weight:900;font-style:italic;text-transform:uppercase;margin-bottom:.5rem">🏆 MEILLEURS 1RM PAR EXERCICE</h4>
      <div id="client-pr-table">${_renderClientPRTable()}</div>
    </div>

  </div>`;
}

// Charger les données PR côté client
async function loadClientPRData() {
  if (!currentClient) return;
  try {
    const doc = await window.fdb.getDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','personalRecords'));
    _clientPRData = (doc.exists && doc.data()) ? doc.data() : { records: {} };
    if (!_clientPRData.records) _clientPRData.records = {};
  } catch(e) { 
    console.error(e); 
    _clientPRData = { records:{} }; 
  }
}

// Graphique de masse grasse
function _renderClientBodyFatChart() {
  const entries = (_weightHistory || []).filter(e => e.bodyFat).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune mesure de masse grasse enregistrée.</p>';
  }
  
  const maxBF = Math.max(...entries.map(e => e.bodyFat));
  const minBF = Math.min(...entries.map(e => e.bodyFat));
  const range = maxBF - minBF || 1;
  const padding = range * 0.1;
  const yMax = maxBF + padding;
  const yMin = Math.max(0, minBF - padding);
  const yRange = yMax - yMin;
  
  return `<div style="position:relative;height:280px;background:var(--surface);border-radius:1rem;padding:1rem 1rem 1rem 3rem;margin-bottom:1rem">
    <!-- Échelle Y (% MG) -->
    <div style="position:absolute;left:.5rem;top:1rem;bottom:45px;display:flex;flex-direction:column;justify-content:space-between;font-size:.65rem;color:var(--muted);text-align:right;width:2rem">
      <span>${yMax.toFixed(1)}%</span>
      <span>${(yMax - yRange * 0.25).toFixed(1)}%</span>
      <span>${(yMin + yRange * 0.5).toFixed(1)}%</span>
      <span>${(yMin + yRange * 0.25).toFixed(1)}%</span>
      <span>${yMin.toFixed(1)}%</span>
    </div>
    
    <!-- Zone du graphique -->
    <div style="position:absolute;left:3rem;right:1rem;top:1rem;bottom:45px;border-left:1px solid var(--border);border-bottom:1px solid var(--border)">
      <svg width="100%" height="100%" style="overflow:visible">
        <!-- Lignes de grille horizontales -->
        ${[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = 100 - (pct * 100);
          return `<line x1="0%" y1="${y}%" x2="100%" y2="${y}%" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2"/>`;
        }).join('')}
        
        <!-- Ligne de progression -->
        ${entries.map((entry, i) => {
          if (i === 0) return '';
          const prevEntry = entries[i-1];
          const x1 = ((i-1) / (entries.length - 1 || 1)) * 100;
          const y1 = 100 - ((prevEntry.bodyFat - yMin) / yRange) * 100;
          const x2 = (i / (entries.length - 1 || 1)) * 100;
          const y2 = 100 - ((entry.bodyFat - yMin) / yRange) * 100;
          return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="var(--gold)" stroke-width="2"/>`;
        }).join('')}
        
        <!-- Points avec valeurs -->
        ${entries.map((entry, i) => {
          const x = (i / (entries.length - 1 || 1)) * 100;
          const y = 100 - ((entry.bodyFat - yMin) / yRange) * 100;
          const date = new Date(entry.date).toLocaleDateString('fr-FR');
          return `<g>
            <circle cx="${x}%" cy="${y}%" r="8" fill="var(--gold)" stroke="white" stroke-width="3" style="cursor:pointer" 
                   onclick="showClientWeightDetailByDate('${entry.date}')" 
                   title="${date}: ${entry.bodyFat}% MG"/>
            <text x="${x}%" y="${y - 15}%" text-anchor="middle" fill="var(--gold)" font-size="10" font-family="'Barlow Condensed',sans-serif" font-weight="700">${entry.bodyFat}%</text>
          </g>`;
        }).join('')}
      </svg>
    </div>
    
    <!-- Dates en abscisse -->
    <div style="position:absolute;bottom:25px;left:3rem;right:1rem;height:20px">
      ${entries.map((entry, i) => {
        const x = (i / (entries.length - 1 || 1)) * 100;
        return `<span style="position:absolute;left:${x}%;transform:translateX(-50%);font-size:.6rem;color:var(--muted);white-space:nowrap">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span>`;
      }).join('')}
    </div>
    
    <!-- Label axe X -->
    <div style="position:absolute;bottom:5px;left:3rem;right:1rem;text-align:center;font-size:.7rem;color:var(--muted)">Date</div>
  </div>`;
}

// Graphique de progression 1RM par exercice
function renderClientExProgressChart() {
  const exName = document.getElementById('client-prog-ex-select')?.value;
  const el = document.getElementById('client-prog-ex-chart'); 
  if (!el) return;
  
  if (!exName) { 
    el.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Sélectionnez un exercice.</p>'; 
    return; 
  }
  
  const record = _clientPRData?.records?.[exName];
  if (!record || !record.history?.length) { 
    el.innerHTML = '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucune donnée pour cet exercice.</p>'; 
    return; 
  }
  
  let history = record.history.slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  // N'afficher qu'un 1RM par date (le meilleur de chaque date)
  const dateMap = new Map();
  history.forEach(e => {
    const dateKey = e.date;
    if (!dateMap.has(dateKey) || dateMap.get(dateKey).theoreticalMax < e.theoreticalMax) {
      dateMap.set(dateKey, e);
    }
  });
  history = Array.from(dateMap.values()).sort((a,b)=>new Date(a.date)-new Date(b.date));
  
  el.innerHTML = svgLineChart(
    history.map(e=>({ 
      label: new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}), 
      value: e.theoreticalMax, 
      tooltip: `${e.weight}kg × ${e.reps} = ${e.theoreticalMax}kg 1RM` 
    })),
    'var(--gold)', 
    '1RM théorique (kg)'
  );
}

// Graphique tonnage par séance
function _renderClientTonnageChart() {
  const logs = Object.values(clientLogs || {}).filter(l=>l.tonnage>0).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  if (!logs.length) return '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucune donnée. Les données apparaissent quand vous saisissez vos charges pendant une séance.</p>';
  
  return svgLineChart(
    logs.map(l=>({ 
      label: `C${l.cycle}S${l.type}`, 
      value: Math.round(l.tonnage), 
      tooltip: `${Math.round(l.tonnage)} kg` 
    })),
    '#3b82f6', 
    'Tonnage (kg)'
  );
}

// Tableau des meilleurs 1RM
function _renderClientPRTable() {
  const records = _clientPRData?.records || {};
  const exNames = Object.keys(records).sort();
  if (!exNames.length) return '<p style="color:var(--muted);font-style:italic;font-size:.8rem">Aucun record. Les records apparaissent quand vous saisissez vos charges pendant une séance.</p>';
  
  return `<div style="overflow-x:auto"><table class="tbl" style="width:100%">
    <thead><tr><th>Exercice</th><th>Meilleur 1RM</th><th>Dernière séance</th><th>Reps</th></tr></thead>
    <tbody>${exNames.map(name => {
      const ex = records[name];
      const bestEntry = (ex.history||[]).slice().sort((a,b)=>b.theoreticalMax - a.theoreticalMax)[0];
      const last = (ex.history||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
      return `<tr class="db-row">
        <td style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic">${h(name)}</td>
        <td><span class="badge" style="background:var(--gold);color:#1a0900">${ex.best1RM||0} kg</span></td>
        <td style="font-size:.7rem;color:var(--muted)">${last?new Date(last.date).toLocaleDateString('fr-FR'):'—'}</td>
        <td style="font-size:.8rem;color:var(--muted)">${bestEntry?bestEntry.reps:'—'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// Fonction helper pour trouver une entrée par date
function showClientWeightDetailByDate(dateStr) {
  const sorted = (_weightHistory||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const idx = sorted.findIndex(e => e.date === dateStr);
  if (idx >= 0) showClientWeightDetail(idx);
}



function _renderClientWeightChart() {
  const entries = (_weightHistory || []).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) {
    return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune mesure enregistrée.</p>';
  }
  
  const maxWeight = Math.max(...entries.map(e => e.weight));
  const minWeight = Math.min(...entries.map(e => e.weight));
  const range = maxWeight - minWeight || 1;
  const padding = range * 0.1; // 10% padding
  const yMax = maxWeight + padding;
  const yMin = Math.max(0, minWeight - padding);
  const yRange = yMax - yMin;
  
  return `<div style="position:relative;height:280px;background:var(--surface);border-radius:1rem;padding:1rem 1rem 1rem 3rem;margin-bottom:1rem">
    <!-- Échelle Y (poids) -->
    <div style="position:absolute;left:.5rem;top:1rem;bottom:45px;display:flex;flex-direction:column;justify-content:space-between;font-size:.65rem;color:var(--muted);text-align:right;width:2rem">
      <span>${yMax.toFixed(1)}kg</span>
      <span>${(yMax - yRange * 0.25).toFixed(1)}kg</span>
      <span>${(yMin + yRange * 0.5).toFixed(1)}kg</span>
      <span>${(yMin + yRange * 0.25).toFixed(1)}kg</span>
      <span>${yMin.toFixed(1)}kg</span>
    </div>
    
    <!-- Zone du graphique -->
    <div style="position:absolute;left:3rem;right:1rem;top:1rem;bottom:45px;border-left:1px solid var(--border);border-bottom:1px solid var(--border)">
      <svg width="100%" height="100%" style="overflow:visible">
        <!-- Lignes de grille horizontales -->
        ${[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = 100 - (pct * 100);
          return `<line x1="0%" y1="${y}%" x2="100%" y2="${y}%" stroke="var(--border)" stroke-width="1" stroke-dasharray="2,2"/>`;
        }).join('')}
        
        <!-- Ligne de progression -->
        ${entries.map((entry, i) => {
          if (i === 0) return '';
          const prevEntry = entries[i-1];
          const x1 = ((i-1) / (entries.length - 1 || 1)) * 100;
          const y1 = 100 - ((prevEntry.weight - yMin) / yRange) * 100;
          const x2 = (i / (entries.length - 1 || 1)) * 100;
          const y2 = 100 - ((entry.weight - yMin) / yRange) * 100;
          return `<line x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%" stroke="var(--brand)" stroke-width="2"/>`;
        }).join('')}
        
        <!-- Points avec valeurs -->
        ${entries.map((entry, i) => {
          const x = (i / (entries.length - 1 || 1)) * 100;
          const y = 100 - ((entry.weight - yMin) / yRange) * 100;
          const date = new Date(entry.date).toLocaleDateString('fr-FR');
          return `<g>
            <circle cx="${x}%" cy="${y}%" r="8" fill="var(--brand)" stroke="white" stroke-width="3" style="cursor:pointer" 
                   onclick="showWeightDetail('${entry.date}')" 
                   title="${date}: ${entry.weight}kg${entry.bodyFat ? ' - ' + entry.bodyFat + '% MG' : ''}"/>
            <text x="${x}%" y="${y - 15}%" text-anchor="middle" fill="var(--text)" font-size="10" font-family="'Barlow Condensed',sans-serif" font-weight="700">${entry.weight}kg</text>
          </g>`;
        }).join('')}
      </svg>
    </div>
    
    <!-- Dates en abscisse -->
    <div style="position:absolute;bottom:25px;left:3rem;right:1rem;height:20px">
      ${entries.map((entry, i) => {
        const x = (i / (entries.length - 1 || 1)) * 100;
        return `<span style="position:absolute;left:${x}%;transform:translateX(-50%);font-size:.6rem;color:var(--muted);white-space:nowrap">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</span>`;
      }).join('')}
    </div>
    
    <!-- Label axe X -->
    <div style="position:absolute;bottom:5px;left:3rem;right:1rem;text-align:center;font-size:.7rem;color:var(--muted)">Date</div>
  </div>`;
}

function _renderClientWeightList() {
  const entries = (_weightHistory||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  if (!entries.length) return '';
  
  return `<div style="display:flex;flex-direction:column;gap:1rem">
    ${entries.slice(0,8).map(e => {
      const date = new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'});
      return `<div class="card" style="padding:1rem;cursor:pointer" onclick="showClientWeightDetail(${entries.indexOf(e)})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.2rem;color:#60a5fa">${e.weight} kg</span>
            ${e.bodyFat ? `<span style="margin-left:1rem;color:var(--gold);font-family:'Barlow Condensed',sans-serif;font-weight:700">${e.bodyFat}% MG</span>` : ''}
          </div>
          <span style="font-size:.7rem;color:var(--muted)">${date}</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function openClientAddWeightEntry() {
  // Utiliser le même modal que le coach
  const modalHtml = '<div id="modal-client-add-weight" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000"><div class="modal" style="max-width:600px;width:90%;max-height:90vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem"><h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">⚖️ NOUVELLE MESURE</h3><button onclick="document.getElementById(\'modal-client-add-weight\').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button></div><div style="display:flex;flex-direction:column;gap:1rem"><div><label style="display:block;font-size:.6rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids (kg) *</label><input type="number" step="0.1" min="0" id="client-add-weight-val" class="inp" style="font-size:2rem;text-align:center;padding:1rem" placeholder="75.5" oninput="if(currentClient && currentClient.height && currentClient.birthday && currentClient.gender) calculateClientBodyFat()"></div><div><label style="display:block;font-size:.6rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Date et heure</label><input type="datetime-local" id="client-add-weight-date" class="inp"></div><div><label style="display:block;font-size:.6rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Type de mesures</label><div style="display:flex;gap:.5rem"><button onclick="setClientMeasurementType(\'body\')" id="client-meas-type-body" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid rgba(240,165,0,.5);background:rgba(240,165,0,.15);color:var(--gold)">Mensurations</button><button onclick="setClientMeasurementType(\'skinfold\')" id="client-meas-type-skinfold" style="flex:1;padding:.6rem;border-radius:.75rem;font-family:\'Barlow Condensed\',sans-serif;font-weight:900;font-style:italic;font-size:.7rem;text-transform:uppercase;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--muted)">Plis cutanés</button></div></div><div id="client-meas-body-fields" style="display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem"><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Tour cou (cm)</label><input type="number" step="0.1" min="0" id="client-meas-neck" class="inp" placeholder="35.5" oninput="calculateClientBodyFat()"></div><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Tour taille (cm)</label><input type="number" step="0.1" min="0" id="client-meas-waist" class="inp" placeholder="75.0" oninput="calculateClientBodyFat()"></div><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Tour hanche (cm)</label><input type="number" step="0.1" min="0" id="client-meas-hip" class="inp" placeholder="95.0" oninput="calculateClientBodyFat()"></div></div><div id="client-meas-skinfold-fields" style="display:none;grid-template-columns:repeat(2,1fr);gap:.5rem"><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli bicipital (mm)</label><input type="number" step="0.1" min="0" id="client-meas-biceps" class="inp" placeholder="5.0" oninput="calculateClientBodyFat()"></div><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli tricipital (mm)</label><input type="number" step="0.1" min="0" id="client-meas-triceps" class="inp" placeholder="8.0" oninput="calculateClientBodyFat()"></div><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli sous-scapulaire (mm)</label><input type="number" step="0.1" min="0" id="client-meas-subscapular" class="inp" placeholder="12.0" oninput="calculateClientBodyFat()"></div><div><label style="display:block;font-size:.55rem;color:var(--muted);margin-bottom:.25rem">Pli supra-iliaque (mm)</label><input type="number" step="0.1" min="0" id="client-meas-suprailiac" class="inp" placeholder="10.0" oninput="calculateClientBodyFat()"></div></div><div id="client-bodyfat-result" style="display:none;padding:1rem;background:var(--surface);border-radius:.75rem;border:1px solid var(--border)"><div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:900;font-size:1.2rem;color:var(--gold)">Pourcentage de masse grasse estimé</div><div id="client-bodyfat-value" style="font-size:2rem;font-weight:900;font-style:italic;margin:.5rem 0">—</div><div id="client-bodyfat-category" style="font-size:.8rem;color:var(--muted)"></div></div><button class="btn btn-primary" style="width:100%;padding:1rem" onclick="saveClientWeightEntry()">ENREGISTRER</button></div></div></div>';
  
  // Supprimer l'ancien modal s'il existe
  const oldModal = document.getElementById('modal-client-add-weight');
  if (oldModal) oldModal.remove();
  
  // Ajouter le nouveau modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Initialiser les valeurs
  document.getElementById('client-add-weight-val').value = '';
  const now = new Date();
  document.getElementById('client-add-weight-date').value = now.toISOString().slice(0,16);
  
  
  // Reset measurements
  ['client-meas-neck','client-meas-waist','client-meas-hip','client-meas-biceps','client-meas-triceps','client-meas-subscapular','client-meas-suprailiac'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  
  // Reset bodyfat display
  const bodyfatResult = document.getElementById('client-bodyfat-result');
  if (bodyfatResult) {
    bodyfatResult.style.display = 'none';
    const bodyfatValue = document.getElementById('client-bodyfat-value');
    const bodyfatCategory = document.getElementById('client-bodyfat-category');
    if (bodyfatValue) bodyfatValue.innerText = '—';
    if (bodyfatCategory) bodyfatCategory.innerText = '';
  }
  
  setClientMeasurementType('body');
}

async function saveClientWeightEntry() {
  const weight = parseFloat(document.getElementById('client-add-weight-val')?.value);
  const date = document.getElementById('client-add-weight-date')?.value;
  
  if (!weight || weight <= 0) {
    alert('Veuillez entrer un poids valide');
    return;
  }
  
  // Calculer le pourcentage de masse grasse (simplifié)
  let bodyFat = null;
  const height = currentClient?.height || 0;
  const age = currentClient?.birthday ? _calcAge(currentClient.birthday) : 0;
  const gender = currentClient?.gender || '';
  
  console.log('🧮 Calcul %MG - Poids:', weight, 'Taille:', height, 'Age:', age, 'Genre:', gender);
  
  if (height && age && gender) {
    const bodyFieldsVisible = document.getElementById('client-meas-body-fields').style.display !== 'none';
    
    if (bodyFieldsVisible) {
      // Formule US Navy simplifiée
      const neck = parseFloat(document.getElementById('client-meas-neck')?.value) || 0;
      const waist = parseFloat(document.getElementById('client-meas-waist')?.value) || 0;
      const hip = parseFloat(document.getElementById('client-meas-hip')?.value) || 0;
      
      console.log('📏 Mensurations - Cou:', neck, 'Taille:', waist, 'Hanche:', hip);
      
      if (neck && waist && (gender === 'homme' || hip)) {
        if (gender === 'homme') {
          const log10 = Math.log10(waist - neck);
          bodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
        } else {
          const log10 = Math.log10(waist + hip - neck);
          bodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
        }
      }
    } else {
      // Formule de Durnin-Womersley (4 sites : biceps, triceps, subscapulaire, supra-iliaque)
      const biceps = parseFloat(document.getElementById('client-meas-biceps')?.value) || 0;
      const triceps = parseFloat(document.getElementById('client-meas-triceps')?.value) || 0;
      const subscapular = parseFloat(document.getElementById('client-meas-subscapular')?.value) || 0;
      const suprailiac = parseFloat(document.getElementById('client-meas-suprailiac')?.value) || 0;
      
      console.log('📏 Plis cutanés - Biceps:', biceps, 'Triceps:', triceps, 'Sous-scap:', subscapular, 'Supra-iliaque:', suprailiac);
      
      if (biceps && triceps && subscapular && suprailiac) {
        const sum = biceps + triceps + subscapular + suprailiac;
        const log10Sum = Math.log10(sum);
        
        // Coefficients Durnin-Womersley selon âge et genre
        let a, c;
        
        if (gender === 'homme') {
          if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
          else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0632; }
          else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
          else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
          else { a = 1.1715; c = 0.0779; }
        } else {
          if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
          else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
          else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
          else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
          else { a = 1.1339; c = 0.0645; }
        }
        
        // Calcul de la densité corporelle (Durnin-Womersley)
        const density = a - (c * log10Sum);
        
        // Conversion en % de masse grasse (formule de Siri)
        bodyFat = ((4.95 / density) - 4.50) * 100;
      }
    }
    
    console.log('📊 Résultat %MG calculé:', bodyFat);
  }
  
  // Afficher le résultat en temps réel
  const bodyfatResult = document.getElementById('client-bodyfat-result');
  if (bodyfatResult && bodyFat !== null && !isNaN(bodyFat) && bodyFat > 0 && bodyFat < 100) {
    bodyfatResult.style.display = 'block';
    const bodyfatValue = document.getElementById('client-bodyfat-value');
    const bodyfatCategory = document.getElementById('client-bodyfat-category');
    
    if (bodyfatValue) bodyfatValue.innerText = bodyFat.toFixed(1) + '%';
    
    // Catégorie
    let category = '';
    if (gender === 'homme') {
      if (bodyFat < 6) category = 'Essentiel (danger)';
      else if (bodyFat < 14) category = 'Athlétique';
      else if (bodyFat < 18) category = 'Fit';
      else if (bodyFat < 25) category = 'Moyen';
      else category = 'Élevé';
    } else {
      if (bodyFat < 14) category = 'Essentiel (danger)';
      else if (bodyFat < 21) category = 'Athlétique';
      else if (bodyFat < 25) category = 'Fit';
      else if (bodyFat < 32) category = 'Moyen';
      else category = 'Élevé';
    }
    
    if (bodyfatCategory) bodyfatCategory.innerText = category;
    console.log('📈 %MG affiché:', bodyFat.toFixed(1) + '% -', category);
  } else {
    if (bodyfatResult) bodyfatResult.style.display = 'none';
  }
}

function setClientMeasurementType(type) {
  const bodyBtn = document.getElementById('client-meas-type-body');
  const skinfoldBtn = document.getElementById('client-meas-type-skinfold');
  const bodyFields = document.getElementById('client-meas-body-fields');
  const skinfoldFields = document.getElementById('client-meas-skinfold-fields');
  
  // Vérifier que tous les éléments existent
  if (!bodyBtn || !skinfoldBtn || !bodyFields || !skinfoldFields) {
    console.log('⏳ Éléments du modal pas encore prêts');
    return;
  }
  
  if (type === 'body') {
    bodyBtn.style.borderColor = 'rgba(240,165,0,.5)';
    bodyBtn.style.background = 'rgba(240,165,0,.15)';
    bodyBtn.style.color = 'var(--gold)';
    skinfoldBtn.style.borderColor = 'var(--border)';
    skinfoldBtn.style.background = 'var(--surface)';
    skinfoldBtn.style.color = 'var(--muted)';
    bodyFields.style.display = 'grid';
    skinfoldFields.style.display = 'none';
  } else {
    skinfoldBtn.style.borderColor = 'rgba(59,130,246,.5)';
    skinfoldBtn.style.background = 'rgba(59,130,246,.15)';
    skinfoldBtn.style.color = '#60a5fa';
    bodyBtn.style.borderColor = 'var(--border)';
    bodyBtn.style.background = 'var(--surface)';
    bodyBtn.style.color = 'var(--muted)';
    skinfoldFields.style.display = 'grid';
    bodyFields.style.display = 'none';
  }
  
  // Ne pas appeler calculateBodyFat si les données client ne sont pas complètes
  if (currentClient && currentClient.height && currentClient.birthday && currentClient.gender) {
    calculateClientBodyFat();
  }
}

function calculateClientBodyFat() {
  const weight = parseFloat(document.getElementById('client-add-weight-val')?.value);
  const height = currentClient?.height || 0;
  const age = currentClient?.birthday ? _calcAge(currentClient.birthday) : 0;
  const gender = currentClient?.gender || '';
  
  const bodyfatResult = document.getElementById('client-bodyfat-result');
  
  if (!weight || !height || !age || !gender) {
    if (bodyfatResult) bodyfatResult.style.display = 'none';
    return;
  }
  
  let bodyFat = null;
  const bodyFields = document.getElementById('client-meas-body-fields');
  const bodyFieldsVisible = bodyFields ? bodyFields.style.display !== 'none' : false;
  
  if (bodyFieldsVisible) {
    // Formule US Navy
    const neck = parseFloat(document.getElementById('client-meas-neck')?.value) || 0;
    const waist = parseFloat(document.getElementById('client-meas-waist')?.value) || 0;
    const hip = parseFloat(document.getElementById('client-meas-hip')?.value) || 0;
    
    if (neck && waist && (gender === 'homme' || hip)) {
      if (gender === 'homme') {
        const log10 = Math.log10(waist - neck);
        bodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
      } else {
        const log10 = Math.log10(waist + hip - neck);
        bodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
      }
    }
  } else {
    // Formule de Durnin-Womersley (4 sites : biceps, triceps, subscapulaire, supra-iliaque)
    const biceps = parseFloat(document.getElementById('client-meas-biceps')?.value) || 0;
    const triceps = parseFloat(document.getElementById('client-meas-triceps')?.value) || 0;
    const subscapular = parseFloat(document.getElementById('client-meas-subscapular')?.value) || 0;
    const suprailiac = parseFloat(document.getElementById('client-meas-suprailiac')?.value) || 0;
    
    if (biceps && triceps && subscapular && suprailiac) {
      const sum = biceps + triceps + subscapular + suprailiac;
      const log10Sum = Math.log10(sum);
      
      // Coefficients Durnin-Womersley selon âge et genre
      let a, c;
      if (gender === 'homme') {
        if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
        else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0632; }
        else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
        else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
        else { a = 1.1715; c = 0.0779; } // 50+
      } else {
        if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
        else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
        else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
        else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
        else { a = 1.1339; c = 0.0645; } // 50+
      }
      
      const density = a - (c * log10Sum);
      // Formule de Siri : MG = (4.95/density - 4.50) × 100
      bodyFat = ((4.95 / density) - 4.50) * 100;
    }
  }
  
  if (bodyFat !== null && !isNaN(bodyFat) && bodyFat > 0 && bodyFat < 100) {
    document.getElementById('client-bodyfat-result').style.display = 'block';
    document.getElementById('client-bodyfat-value').innerText = bodyFat.toFixed(1) + '%';
    
    // Catégorie
    let category = '';
    if (gender === 'homme') {
      if (bodyFat < 6) category = 'Essentiel (danger)';
      else if (bodyFat < 14) category = 'Athlétique';
      else if (bodyFat < 18) category = 'Fit';
      else if (bodyFat < 25) category = 'Moyen';
      else category = 'Élevé';
    } else {
      if (bodyFat < 14) category = 'Essentiel (danger)';
      else if (bodyFat < 21) category = 'Athlétique';
      else if (bodyFat < 25) category = 'Fit';
      else if (bodyFat < 32) category = 'Moyen';
      else category = 'Élevé';
    }
    
    document.getElementById('client-bodyfat-category').innerText = category;
  } else {
    document.getElementById('client-bodyfat-result').style.display = 'none';
  }
}

function previewClientWeightPhoto(photoNum, input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById(`client-add-weight-photo-preview-${photoNum}`);
      preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:.5rem">`;
      preview.style.background = 'transparent';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function saveClientWeightEntry() {
  if (!currentClient) return;
  const weight = parseFloat(document.getElementById('client-add-weight-val')?.value);
  const date = document.getElementById('client-add-weight-date')?.value;
  if (!weight || weight <= 0) { toast('Poids invalide','w'); return; }
  
  // Calculer le pourcentage de masse grasse
  let bodyFat = null;
  const height = currentClient?.height || 0;
  const age = currentClient?.birthday ? _calcAge(currentClient.birthday) : 0;
  const gender = currentClient?.gender || '';
  
  if (height && age && gender) {
    const bodyFieldsVisible = document.getElementById('client-meas-body-fields').style.display !== 'none';
    
    if (bodyFieldsVisible) {
      const neck = parseFloat(document.getElementById('client-meas-neck')?.value) || 0;
      const waist = parseFloat(document.getElementById('client-meas-waist')?.value) || 0;
      const hip = parseFloat(document.getElementById('client-meas-hip')?.value) || 0;
      
      if (neck && waist && (gender === 'homme' || hip)) {
        if (gender === 'homme') {
          const log10 = Math.log10(waist - neck);
          bodyFat = 495 / (1.0324 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
        } else {
          const log10 = Math.log10(waist + hip - neck);
          bodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
        }
      }
    } else {
      const biceps = parseFloat(document.getElementById('client-meas-biceps')?.value) || 0;
      const triceps = parseFloat(document.getElementById('client-meas-triceps')?.value) || 0;
      const subscapular = parseFloat(document.getElementById('client-meas-subscapular')?.value) || 0;
      const suprailiac = parseFloat(document.getElementById('client-meas-suprailiac')?.value) || 0;
      
      if (biceps && triceps && subscapular && suprailiac) {
        const sum = biceps + triceps + subscapular + suprailiac;
        const log10Sum = Math.log10(sum);
        
        // Coefficients selon âge et genre (formule Jackson & Pollock)
        let a, c;
        if (gender === 'homme') {
          if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
          else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0632; }
          else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
          else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
          else { a = 1.1715; c = 0.0779; }
        } else {
          if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
          else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
          else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
          else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
          else { a = 1.1339; c = 0.0645; }
        }
        
        const density = a - (c * log10Sum);
        // Formule de Siri pour le % de masse grasse
        bodyFat = ((4.95 / density) - 4.50) * 100;
      }
    }
  }
  
  // Récupérer les photos
  const photos = [];
  for (let i = 1; i <= 3; i++) {
    const input = document.getElementById(`client-add-weight-photo-${i}`);
    if (input && input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        photos.push(e.target.result);
      };
      reader.readAsDataURL(input.files[0]);
    }
  }
  
  // Attendre la lecture des photos
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Récupérer les mensurations
  let measurements = null;
  const bodyFieldsVisible = document.getElementById('client-meas-body-fields').style.display !== 'none';
  if (bodyFieldsVisible) {
    const neck = parseFloat(document.getElementById('client-meas-neck')?.value) || null;
    const waist = parseFloat(document.getElementById('client-meas-waist')?.value) || null;
    const hip = parseFloat(document.getElementById('client-meas-hip')?.value) || null;
    if (neck || waist || hip) {
      measurements = { neck, waist, hip };
    }
  } else {
    const biceps = parseFloat(document.getElementById('client-meas-biceps')?.value) || null;
    const triceps = parseFloat(document.getElementById('client-meas-triceps')?.value) || null;
    const subscapular = parseFloat(document.getElementById('client-meas-subscapular')?.value) || null;
    const suprailiac = parseFloat(document.getElementById('client-meas-suprailiac')?.value) || null;
    if (biceps || triceps || subscapular || suprailiac) {
      measurements = { biceps, triceps, subscapular, suprailiac };
    }
  }
  
  if (!_weightHistory) _weightHistory = [];
  
  // Créer une entrée propre sans valeurs undefined
  const entry = {
    date: date ? new Date(date).toISOString() : new Date().toISOString(),
    weight: weight
  };
  
  // Ajouter bodyFat seulement si calculé
  if (bodyFat !== null && !isNaN(bodyFat)) {
    entry.bodyFat = Math.round(bodyFat * 10) / 10;
  }
  
  // Ajouter photos seulement si présentes
  if (photos.length > 0) {
    entry.photos = photos;
  }
  
  // Ajouter measurements seulement si présentes
  if (measurements) {
    entry.measurements = measurements;
  }
  
  console.log('📝 Entrée à sauvegarder:', entry);
  
  _weightHistory.push(entry);
  
  try {
    await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'clients',currentClient.id,'data','weightHistory'), { entries: _weightHistory });
    console.log('✅ Données sauvegardées avec succès!');
  } catch(e) {
    console.error('❌ Erreur Firebase:', e);
    alert('Erreur de sauvegarde: ' + e.message);
    return;
  }
  closeModal('modal-client-add-weight');
  
  // Mettre à jour les vues
  renderClientTracking();
  toast('Mesure enregistrée','s');
}

function showWeightDetail(dateStr) {
  const entry = _weightHistory?.find(e => e.date === dateStr);
  if (!entry) return;
  
  const modal = document.getElementById('modal-weight-detail');
  if (!modal) {
    const div = document.createElement('div');
    div.id = 'modal-weight-detail';
    div.className = 'modal-overlay hidden';
    document.body.appendChild(div);
  }
  
  const date = new Date(entry.date);
  const photos = entry.photos || [];
  
  document.getElementById('modal-weight-detail').innerHTML = `
    <div class="modal" style="max-width:500px;width:100%">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
        <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">DÉTAIL DE LA MESURE</h3>
        <button onclick="closeModal('modal-weight-detail')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div style="text-align:center">
          <div style="font-size:2.5rem;font-weight:900;font-style:italic;font-family:'Barlow Condensed',sans-serif">${entry.weight} kg</div>
          ${entry.bodyFat ? `<div style="font-size:1.5rem;color:var(--gold);font-weight:700">${entry.bodyFat}% MG</div>` : ''}
          <div style="font-size:.8rem;color:var(--muted);margin-top:.5rem">${date.toLocaleDateString('fr-FR', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</div>
        </div>
        
        ${entry.measurements ? `
          <div style="padding:1rem;background:var(--surface);border-radius:.75rem">
            <div style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Mesures</div>
            ${Object.entries(entry.measurements).map(([key, value]) => {
              const labels = {
                neck: 'Tour cou', waist: 'Tour taille', hip: 'Tour hanche',
                biceps: 'Pli bicipital', triceps: 'Pli tricipital', 
                subscapular: 'Pli sous-scapulaire', suprailiac: 'Pli supra-iliaque'
              };
              const unit = key.includes('plis') ? 'mm' : 'cm';
              return `<div style="display:flex;justify-content:space-between;margin-bottom:.25rem">
                <span>${labels[key] || key}:</span>
                <span style="font-weight:700">${value} ${unit}</span>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
        
        ${photos.length > 0 ? `
          <div>
            <div style="font-size:.7rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Photos</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:.5rem">
              ${photos.map((photo, i) => `
                <img src="${photo}" style="width:100%;height:120px;object-fit:cover;border-radius:.5rem;cursor:pointer" 
                     onclick="window.open('${photo}', '_blank')" alt="Photo ${i+1}">
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  openModal('modal-weight-detail');
}

// Fonction utilitaire pour calculer l'âge
function _calcAge(birthday) {
  if (!birthday) return null;
  const b = new Date(birthday); const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) age--;
  return age;
}

function _renderWeightChart() {
  const entries = (_weightHistory||[]).slice().sort((a,b)=>new Date(a.date)-new Date(b.date));
  if (!entries.length) return '<p style="color:var(--muted);font-style:italic;text-align:center;padding:2rem">Aucune donnée pondérale.</p>';
  
  const chartData = entries.map(e=>({ 
    label: new Date(e.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}), 
    value: e.weight, 
    tooltip: `${e.weight} kg · ${new Date(e.date).toLocaleDateString('fr-FR')}`,
    onClick: `showClientWeightDetail(${entries.indexOf(e)})`
  }));
  
  return svgLineChart(chartData, '#3b82f6', 'Poids (kg)');
}

function showClientWeightDetail(sortedIdx) {
  const sorted = (_weightHistory||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const entry = sorted[sortedIdx]; if (!entry) return;
  
  // Calculer le %MG à partir des mensurations si présentes
  let calculatedBodyFat = null;
  if (entry.measurements && currentClient) {
    const height = currentClient.height || 0;
    const age = currentClient.birthday ? _calcAge(currentClient.birthday) : 0;
    const gender = currentClient.gender || '';
    
    if (height && age && gender) {
      // Vérifier si c'est des mensurations corporelles ou des plis cutanés
      if (entry.measurements.neck || entry.measurements.waist) {
        // Formule US Navy avec mensurations
        const neck = entry.measurements.neck || 0;
        const waist = entry.measurements.waist || 0;
        const hip = entry.measurements.hip || 0;
        
        if (neck && waist && (gender === 'homme' || hip)) {
          if (gender === 'homme') {
            const log10 = Math.log10(waist - neck);
            calculatedBodyFat = 495 / (1.03248 - 0.19077 * log10 + 0.15456 * Math.log10(height)) - 450;
          } else {
            const log10 = Math.log10(waist + hip - neck);
            calculatedBodyFat = 495 / (1.29579 - 0.35004 * log10 + 0.22100 * Math.log10(height)) - 450;
          }
        }
      } else if (entry.measurements.biceps || entry.measurements.triceps) {
        // Formule de Durnin-Womersley (4 sites : biceps, triceps, subscapulaire, supra-iliaque)
        const biceps = entry.measurements.biceps || 0;
        const triceps = entry.measurements.triceps || 0;
        const subscapular = entry.measurements.subscapular || 0;
        const suprailiac = entry.measurements.suprailiac || 0;
        
        if (biceps && triceps && subscapular && suprailiac) {
          const sum = biceps + triceps + subscapular + suprailiac;
          const log10Sum = Math.log10(sum);
          
          // Coefficients Durnin-Womersley selon âge et genre
          let a, c;
          if (gender === 'homme') {
            if (age >= 17 && age <= 19) { a = 1.1620; c = 0.0630; }
            else if (age >= 20 && age <= 29) { a = 1.1631; c = 0.0632; }
            else if (age >= 30 && age <= 39) { a = 1.1422; c = 0.0544; }
            else if (age >= 40 && age <= 49) { a = 1.1620; c = 0.0700; }
            else { a = 1.1715; c = 0.0779; }
          } else {
            if (age >= 17 && age <= 19) { a = 1.1549; c = 0.0678; }
            else if (age >= 20 && age <= 29) { a = 1.1599; c = 0.0717; }
            else if (age >= 30 && age <= 39) { a = 1.1423; c = 0.0632; }
            else if (age >= 40 && age <= 49) { a = 1.1333; c = 0.0612; }
            else { a = 1.1339; c = 0.0645; }
          }
          
          const density = a - (c * log10Sum);
          // Formule de Siri : MG = (4.95/density - 4.50) × 100
          calculatedBodyFat = ((4.95 / density) - 4.50) * 100;
        }
      }
    }
  }
  
  // Utiliser le bodyFat stocké ou le calculé
  const displayBodyFat = entry.bodyFat || (calculatedBodyFat && !isNaN(calculatedBodyFat) ? calculatedBodyFat.toFixed(1) : null);
  
  const modalHtml = `
    <div id="modal-client-weight-detail" class="modal-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000">
      <div class="modal" style="max-width:500px;width:90%;max-height:90vh;overflow-y:auto;background:var(--card);border-radius:1rem;padding:2rem;box-shadow:0 10px 25px rgba(0,0,0,0.2)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h3 style="font-size:1.25rem;font-weight:900;font-style:italic;text-transform:uppercase">📊 DÉTAILS DE LA MESURE</h3>
          <button onclick="document.getElementById('modal-client-weight-detail').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.25rem">✕</button>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:1.5rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Date</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem">${new Date(entry.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Poids</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:#60a5fa">${entry.weight} kg</div>
            </div>
          </div>
          
          ${displayBodyFat ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">% Masse Grasse</label>
              <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:1.1rem;color:var(--gold)">${displayBodyFat}%</div>
            </div>
          ` : ''}
          
          ${entry.measurements ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Mensurations</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem">
                ${entry.measurements.neck ? `<div><strong>Cou:</strong> ${entry.measurements.neck} cm</div>` : ''}
                ${entry.measurements.waist ? `<div><strong>Taille:</strong> ${entry.measurements.waist} cm</div>` : ''}
                ${entry.measurements.hip ? `<div><strong>Hanche:</strong> ${entry.measurements.hip} cm</div>` : ''}
                ${entry.measurements.biceps ? `<div><strong>Biceps:</strong> ${entry.measurements.biceps} mm</div>` : ''}
                ${entry.measurements.triceps ? `<div><strong>Triceps:</strong> ${entry.measurements.triceps} mm</div>` : ''}
                ${entry.measurements.subscapular ? `<div><strong>Sous-scap:</strong> ${entry.measurements.subscapular} mm</div>` : ''}
                ${entry.measurements.suprailiac ? `<div><strong>Supra-iliaque:</strong> ${entry.measurements.suprailiac} mm</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${entry.photos && entry.photos.length > 0 ? `
            <div>
              <label style="display:block;font-size:.6rem;font-family:'Barlow Condensed',sans-serif;font-weight:900;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem">Photos</label>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:.5rem">
                ${entry.photos.map((photo, i) => `
                  <img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:.5rem;cursor:pointer" 
                       onclick="window.open('${photo}', '_blank')" alt="Photo ${i+1}">
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
  
  // Supprimer l'ancien modal s'il existe
  const oldModal = document.getElementById('modal-client-weight-detail');
  if (oldModal) oldModal.remove();
  
  // Ajouter le nouveau modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}
