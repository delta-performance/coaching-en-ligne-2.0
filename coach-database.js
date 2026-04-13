function updateDbFilterDropdowns() {
  const zones = [...new Set(window.exerciseDb.map(e => e.zone).filter(Boolean))].sort();
  const patterns = [...new Set(window.exerciseDb.map(e => e.pattern).filter(Boolean))].sort();
  ['dbf-zone'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = '<option value="">Toutes zones</option>'+zones.map(z=>`<option value="${z}">${h(z)}</option>`).join('');
  });
  ['dbf-pattern'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = '<option value="">Tous patterns</option>'+patterns.map(p=>`<option value="${p}">${h(p)}</option>`).join('');
  });
  document.getElementById('zone-list').innerHTML = zones.map(z=>`<option value="${z}">`).join('');
  document.getElementById('pattern-list').innerHTML = patterns.map(p=>`<option value="${p}">`).join('');
}

function renderDatabase() {
  console.log('renderDatabase called, exerciseDb length:', window.exerciseDb?.length);
  console.log('exerciseDb:', window.exerciseDb);
  const body = document.getElementById('db-body'); 
  console.log('db-body element:', body);
  if (!body) return;
  const zone = document.getElementById('dbf-zone')?.value||'';
  const pattern = document.getElementById('dbf-pattern')?.value||'';
  const search = (document.getElementById('dbf-search')?.value||'').toLowerCase();
  const list = window.exerciseDb.filter(e => {
    if (zone && e.zone!==zone) return false;
    if (pattern && e.pattern!==pattern) return false;
    if (search && !e.name.toLowerCase().includes(search) && !(e.zone||'').toLowerCase().includes(search)) return false;
    return true;
  });
  if (!list.length) { body.innerHTML = `<tr><td colspan="8" style="padding:3rem;text-align:center;color:var(--muted);font-style:italic">Aucun exercice.${window.exerciseDb.length===0?' Ajoutez le premier !':''}</td></tr>`; return; }
  body.innerHTML = list.map(e => {
    if (_editingDbExId === e.id) {
      // Mode édition inline
      return `<tr class="db-row" style="background:rgba(240,165,0,.05)">
        <td><input type="text" id="edit-name-${e.id}" class="inp" value="${h(e.name)}" style="font-size:.8rem;padding:.4rem .6rem"></td>
        <td><input type="text" id="edit-zone-${e.id}" class="inp" value="${h(e.zone||'')}" style="font-size:.8rem;padding:.4rem .6rem" list="zone-list"></td>
        <td><input type="text" id="edit-pattern-${e.id}" class="inp" value="${h(e.pattern||'')}" style="font-size:.8rem;padding:.4rem .6rem" list="pattern-list"></td>
        <td><select id="edit-lat-${e.id}" class="inp" style="font-size:.8rem;padding:.4rem .6rem"><option${(e.lat||'Bilatéral')==='Bilatéral'?' selected':''}>Bilatéral</option><option${(e.lat||'')==='Unilatéral'?' selected':''}>Unilatéral</option><option${(e.lat||'')==='Alterné'?' selected':''}>Alterné</option></select></td>
        <td>${e.photo?`<img src="${h(e.photo)}" style="width:3rem;height:3rem;object-fit:cover;border-radius:.5rem;border:1px solid var(--border)">`:'<span style="font-size:.7rem;color:var(--muted)">—</span>'}</td>
        <td>${e.video?`<a href="${h(e.video)}" target="_blank" style="font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--gold);text-decoration:none">VOIR</a>`:'—'}</td>
        <td><input type="text" id="edit-video-${e.id}" class="inp" value="${h(e.video||'')}" placeholder="URL vidéo" style="font-size:.75rem;padding:.4rem .6rem;width:140px"></td>
        <td style="text-align:right;white-space:nowrap">
          <button class="btn btn-gold btn-sm" onclick="saveDbExEdit('${e.id}')">✓</button>
          <button class="btn btn-ghost btn-sm" onclick="_editingDbExId=null;renderDatabase()">✕</button>
        </td>
      </tr>`;
    }
    return `<tr class="db-row">
      <td style="font-family:'Barlow Condensed',sans-serif;font-size:.9rem;font-weight:900;font-style:italic">${h(e.name)}</td>
      <td><span class="badge" style="background:rgba(240,165,0,.1);color:var(--gold);border:1px solid rgba(240,165,0,.2)">${h(e.zone||'—')}</span></td>
      <td><span class="badge" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">${h(e.pattern||'—')}</span></td>
      <td style="font-size:.8rem;color:var(--muted)">${h(e.lat||'—')}</td>
      <td>${e.photo?`<img src="${h(e.photo)}" style="width:3rem;height:3rem;object-fit:cover;border-radius:.5rem;border:1px solid var(--border)" onerror="this.style.display='none'">`:' <span style="color:var(--border);font-size:.75rem">—</span>'}</td>
      <td>${e.video?`<a href="${h(e.video)}" target="_blank" style="font-family:'Barlow Condensed',sans-serif;font-size:.7rem;font-weight:900;font-style:italic;text-transform:uppercase;color:var(--gold);text-decoration:none">VOIR</a>`:'<span style="color:var(--border);font-size:.75rem">—</span>'}</td>
      <td></td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-ghost btn-sm" onclick="_editingDbExId='${e.id}';renderDatabase()">Modifier</button>
        <button class="btn btn-danger btn-sm" onclick="deleteExFromDb('${e.id}')">Suppr.</button>
      </td>
    </tr>`;
  }).join('');
}

async function saveDbExEdit(id) {
  const ex = window.exerciseDb.find(e => e.id === id); if (!ex) return;
  const name = document.getElementById('edit-name-'+id)?.value.trim();
  const zone = document.getElementById('edit-zone-'+id)?.value.trim();
  const pattern = document.getElementById('edit-pattern-'+id)?.value.trim();
  const lat = document.getElementById('edit-lat-'+id)?.value;
  const video = document.getElementById('edit-video-'+id)?.value.trim();
  if (!name||!zone||!pattern) { toast('Nom, zone et pattern requis','w'); return; }
  const updated = { ...ex, name, zone, pattern, lat, video };
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'exerciseDb',id), updated);
  const idx = window.exerciseDb.findIndex(e => e.id === id);
  if (idx !== -1) window.exerciseDb[idx] = { ...updated };
  _editingDbExId = null;
  updateDbFilterDropdowns(); renderDatabase(); toast(name+' modifié !','s');
}

async function saveExerciseToDb() {
  const name = document.getElementById('dbex-name').value.trim();
  const zone = document.getElementById('dbex-zone').value.trim();
  const pattern = document.getElementById('dbex-pattern').value.trim();
  if (!name||!zone||!pattern) { toast('Nom, zone et pattern requis','w'); return; }
  const lat = document.getElementById('dbex-lat').value;
  const desc = document.getElementById('dbex-desc').value.trim();
  const videoUrl = document.getElementById('dbex-video').value.trim();
  const photoUrl = document.getElementById('dbex-photo-url').value.trim();
  let photoFinal = photoUrl;
  const file = document.getElementById('dbex-photo-file').files[0];
  if (file) {
    photoFinal = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=()=>rej(); r.readAsDataURL(file); });
  }
  const newId = 'ex_'+Date.now();
  const exData = { name, zone, pattern, lat, desc, photo:photoFinal, video:videoUrl, createdAt:new Date().toISOString() };
  await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'exerciseDb',newId), exData);
  window.exerciseDb.push({ id:newId, ...exData });
  closeModal('modal-add-exercise');
  ['dbex-name','dbex-zone','dbex-pattern','dbex-desc','dbex-photo-url','dbex-video'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
  document.getElementById('dbex-photo-file').value = '';
  document.getElementById('dbex-lat').value = 'Bilatéral';
  updateDbFilterDropdowns(); renderDatabase();
  toast(name+' ajouté à la base !','s');
}

let _delExPending = null;
async function deleteExFromDb(id) {
  if (_delExPending !== id) { _delExPending = id; setTimeout(()=>_delExPending=null,3000); toast('Cliquez encore pour confirmer','w',3000); return; }
  _delExPending = null;
  await window.fdb.deleteDoc(window.fdb.doc(window.db,'apps',APP_ID,'exerciseDb',id));
  window.exerciseDb = window.exerciseDb.filter(e => e.id !== id);
  if (_editingDbExId === id) _editingDbExId = null;
  updateDbFilterDropdowns(); renderDatabase(); toast('Exercice supprimé','i');
}

async function importExercisesFromCsv() {
  const fileInput = document.getElementById('dbex-csv-file');
  const file = fileInput?.files[0];
  if (!file) { toast('Aucun fichier sélectionné','w'); return; }
  
  console.log('CSV import starting, file:', file.name, 'size:', file.size);
  
  try {
    const text = await file.text();
    console.log('CSV text loaded, length:', text.length);
    console.log('First 200 chars:', text.substring(0, 200));
    
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    console.log('Lines found:', lines.length);
    
    if (lines.length < 2) { toast('Fichier CSV vide ou invalide (besoin header + données)','e'); return; }
    
    // Auto-detect separator (comma or semicolon)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    console.log('Detected separator:', separator === ';' ? 'semicolon' : 'comma');
    
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    console.log('Headers:', headers);
    
    const nameIdx = headers.indexOf('name');
    const zoneIdx = headers.indexOf('zone');
    const patternIdx = headers.indexOf('pattern');
    
    console.log('Indices - name:', nameIdx, 'zone:', zoneIdx, 'pattern:', patternIdx);
    
    if (nameIdx === -1 || zoneIdx === -1 || patternIdx === -1) {
      toast('CSV invalide: colonnes name, zone, pattern requises. Trouvé: ' + headers.join(', '),'e'); return;
    }
    
    const latIdx = headers.indexOf('lat');
    const descIdx = headers.indexOf('desc');
    const photoIdx = headers.indexOf('photo');
    const videoIdx = headers.indexOf('video');
    
    let imported = 0;
    let errors = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i], separator);
      console.log('Line', i, 'cols:', cols.length, 'values:', cols.slice(0, 3));
      if (cols.length < 3) { console.log('Skipping line', i, '- not enough columns'); continue; }
      
      const name = cols[nameIdx]?.trim();
      const zone = cols[zoneIdx]?.trim();
      const pattern = cols[patternIdx]?.trim();
      
      console.log('Extracted - name:', name, 'zone:', zone, 'pattern:', pattern);
      
      if (!name || !zone || !pattern) { console.log('Skipping - missing required field'); errors++; continue; }
      
      const lat = latIdx !== -1 ? (cols[latIdx]?.trim() || 'Bilatéral') : 'Bilatéral';
      const desc = descIdx !== -1 ? (cols[descIdx]?.trim() || '') : '';
      const photo = photoIdx !== -1 ? (cols[photoIdx]?.trim() || '') : '';
      const video = videoIdx !== -1 ? (cols[videoIdx]?.trim() || '') : '';
      
      const newId = 'ex_' + Date.now() + '_' + i;
      const exData = { name, zone, pattern, lat, desc, photo, video, createdAt: new Date().toISOString() };
      
      try {
        console.log('Saving to Firebase:', newId, exData);
        await window.fdb.setDoc(window.fdb.doc(window.db,'apps',APP_ID,'exerciseDb',newId), exData);
        window.exerciseDb.push({ id: newId, ...exData });
        imported++;
        console.log('Saved successfully');
      } catch(e) { 
        console.error('Firebase error for line', i, e);
        errors++; 
      }
    }
    
    fileInput.value = '';
    updateDbFilterDropdowns(); renderDatabase();
    
    if (imported > 0) toast(`${imported} exercice(s) importé(s) !${errors > 0 ? ` (${errors} erreurs)` : ''}`,'s');
    else toast('Aucun exercice importé','e');
    
  } catch(e) {
    console.error('CSV import error:', e);
    toast('Erreur import: ' + e.message,'e');
  }
}

function parseCsvLine(line, separator = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}
