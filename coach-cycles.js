function renderCycleStatus() {
  const el = document.getElementById('cycle-status'); if (!el) return;
  if (!clientProgram.length) { el.innerHTML = '<p style="color:var(--muted);font-style:italic">Aucun cycle.</p>'; return; }
  el.innerHTML = clientProgram.map(c => {
    const isArch = clientArchived.has(c.id); const isUnlock = clientUnlocked.has(c.id);
    const active = getActiveSessions(c);
    return `<div style="display:flex;align-items:center;gap:.75rem;padding:.875rem 1rem;border-radius:1rem;background:${isArch?'rgba(8,12,18,.5)':'var(--surface)'};border:1px solid ${isArch?'var(--border)':'rgba(30,45,64,.8)'};flex-wrap:wrap">
      <span style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:.875rem;color:${isArch?'var(--muted)':'var(--text)'};flex-shrink:0">C${c.id}</span>
      <input type="text" value="${h(c.focus)}" id="rename-${c.id}" style="flex:1;min-width:120px;background:transparent;border:none;color:${isArch?'var(--muted)':'var(--text)'};font-size:.8rem;font-style:italic;outline:none">
      <span style="font-size:.65rem;color:var(--muted)">${active.length} séance(s)</span>
      <label style="display:flex;align-items:center;gap:.4rem;cursor:pointer;padding:.25rem .5rem;border-radius:.5rem;background:${isUnlock?'rgba(16,185,129,.1)':'transparent'};border:1px solid ${isUnlock?'rgba(16,185,129,.3)':'var(--border)'}">
        <input type="checkbox" ${isUnlock?'checked':''} onchange="toggleCycleUnlock(${c.id})" style="accent-color:var(--green)">
        <span style="font-size:.65rem;color:${isUnlock?'var(--green)':'var(--muted)'};font-family:'Barlow Condensed',sans-serif;font-weight:700">${isUnlock?'Accès ouvert':'Accès fermé'}</span>
      </label>
      ${isArch?`<span class="badge badge-archived">Archive</span>`:''}
      <button class="btn btn-ghost btn-sm" onclick="renameCycle(${c.id})">✓</button>
      <button class="btn btn-ghost btn-sm" onclick="toggleArchiveCycle(${c.id})">${isArch?'↑ Désarchiver':'↓ Archiver'}</button>
      <button class="btn btn-danger btn-sm" id="del-c-${c.id}" data-c="0" onclick="deleteCycleBtn(${c.id})">Suppr.</button>
    </div>`;
  }).join('');
}

async function addCycle() {
  if (!currentClient) return;
  const name = document.getElementById('nc-name').value.trim() || 'Nouveau cycle';
  const newId = clientProgram.length ? Math.max(...clientProgram.map(c => c.id))+1 : 1;
  clientProgram.push({
    id: newId, focus: name, sessions_active: [],
    sessions: {
      A: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      B: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      C: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] },
      D: { rest:'45s', tours:'3', mode:'circuit', comment:'', exercises:[] }
    }
  });
  try { await saveClientProgram(); rebuildEditorSelects(); renderClientGrid(); renderCycleStatus(); toast('Cycle '+newId+' créé !','s'); }
  catch(e) { toast('Erreur','e'); }
}

async function renameCycle(id) {
  const inp = document.getElementById('rename-'+id); if (!inp||!inp.value.trim()) return;
  const idx = clientProgram.findIndex(c => c.id === id); if (idx===-1) return;
  clientProgram[idx].focus = inp.value.trim();
  try { await saveClientProgram(); rebuildEditorSelects(); renderClientGrid(); toast('Renommé !','s'); } catch(e) { toast('Erreur','e'); }
}

async function toggleArchiveCycle(id) {
  if (!currentClient) return;
  if (clientArchived.has(id)) clientArchived.delete(id); else clientArchived.add(id);
  try { await saveClientUnlock(currentClient.id); renderCycleStatus(); renderClientGrid(); toast('Archivage modifié','i'); } catch(e) { toast('Erreur','e'); }
}

async function toggleCycleUnlock(id) {
  if (!currentClient) return;
  if (clientUnlocked.has(id)) clientUnlocked.delete(id); else clientUnlocked.add(id);
  try { 
    await saveClientUnlock(currentClient.id); 
    renderCycleStatus(); 
    renderClientGrid(); 
    toast(clientUnlocked.has(id)?'Cycle accessible au client':'Cycle verrouillé', clientUnlocked.has(id)?'s':'i'); 
  } catch(e) { 
    toast('Erreur','e'); 
  }
}

async function deleteCycleBtn(id) {
  const btn = document.getElementById('del-c-'+id); if (!btn) return;
  if (btn.dataset.c !== '1') { btn.dataset.c = '1'; btn.innerText = 'CONFIRMER ?'; btn.style.color = '#f87171'; setTimeout(()=>{ btn.dataset.c='0'; btn.innerText='Suppr.'; btn.style.color=''; },3000); return; }
  const idx = clientProgram.findIndex(c => c.id === id); if (idx===-1) return;
  clientProgram.splice(idx,1); clientUnlocked.delete(id); clientArchived.delete(id);
  try { await saveClientProgram(); await saveClientUnlock(currentClient.id); rebuildEditorSelects(); renderClientGrid(); renderCycleStatus(); toast('Cycle supprimé','w'); } catch(e) { toast('Erreur','e'); }
}
