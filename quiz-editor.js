// Admin → CRM & RDV → Tunnel : arbre décisionnel du questionnaire + expériences / certifications.
(function () {
  const S = { qs: [], exps: [], certs: [], logos: {}, logosOrig: {}, dirtyQ: false, dirtyE: false, open: new Set(), loaded: false };
  const TYPES = { one: 'Choix unique', many: 'Choix multiples', text: 'Texte libre', scale: 'Note sur 10' };
  const ROLES = { objectiveType: 'Accompagnement', level: 'Niveau', objective: 'Objectif', blocker: 'Freins' };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = v => JSON.parse(JSON.stringify(v));
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ref = (...p) => window.db.collection('apps').doc('delta-perf-v2').collection(p[0]).doc(p[1]);
  const Q = id => S.qs.find(q => q.id === id);
  const parentOf = q => (q.if && q.if.q && Q(q.if.q)) ? q.if.q : null;
  const groupKey = q => parentOf(q) ? (q.if.in || []).join('|') : '';
  const kids = id => S.qs.filter(q => parentOf(q) === id);
  const desc = id => kids(id).flatMap(k => [k, ...desc(k.id)]);
  const notify = m => (typeof toast === 'function' ? toast(m, 's') : null);

  function normalize() {
    const out = [], seen = new Set();
    const walk = q => { if (seen.has(q.id)) return; seen.add(q.id); out.push(q); kids(q.id).forEach(walk); };
    S.qs.filter(q => !parentOf(q)).forEach(walk);
    S.qs.forEach(q => { if (!seen.has(q.id)) { delete q.if; walk(q); } });
    S.qs = out;
  }

  const css = document.createElement('style');
  css.textContent = `
  .qe-tree{display:grid;gap:.5rem}
  .qe-node{border:1px solid var(--border,#e2e8f0);border-radius:12px;background:var(--card,#fff)}
  .qe-head{display:flex;gap:.5rem;align-items:center;padding:.6rem .75rem;cursor:pointer;flex-wrap:wrap}
  .qe-head b{flex:1;min-width:160px;font-size:.9rem}
  .qe-n{font:800 .7rem Inter,sans-serif;color:#fff;background:#0f172a;border-radius:6px;padding:.1rem .4rem}
  .qe-tag{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-radius:6px;padding:.15rem .4rem;background:rgba(100,116,139,.12);color:var(--muted,#64748b)}
  .qe-tag.role{background:rgba(240,165,0,.15);color:#b45309}
  .qe-ib{border:1px solid var(--border,#e2e8f0);background:transparent;border-radius:7px;width:28px;height:28px;cursor:pointer;font-size:.8rem;line-height:1}
  .qe-ib:hover{border-color:#f0a500}.qe-ib.del:hover{border-color:#dc2626;color:#dc2626}
  .qe-chips{display:flex;flex-wrap:wrap;gap:.3rem;padding:0 .75rem .6rem}
  .qe-chip{font-size:.72rem;border:1px solid var(--border,#e2e8f0);border-radius:99px;padding:.1rem .5rem;color:var(--muted,#64748b)}
  .qe-branch{margin:.1rem .75rem .6rem 1.1rem;padding-left:.9rem;border-left:2px solid #f0a500;display:grid;gap:.45rem}
  .qe-cond{font-size:.72rem;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:.03em;margin-top:.2rem}
  .qe-form{padding:.75rem;border-top:1px dashed var(--border,#e2e8f0);display:grid;gap:.6rem;background:rgba(240,165,0,.04)}
  .qe-form label.l{display:block;font-size:.65rem;font-weight:700;text-transform:uppercase;color:var(--muted,#64748b);margin-bottom:.2rem}
  .qe-row{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap}
  .qe-row .inp{flex:1;min-width:140px;padding:.45rem .6rem;font-size:.85rem}
  .qe-opt{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;padding:.4rem;border:1px solid var(--border,#e2e8f0);border-radius:9px;background:var(--card,#fff)}
  .qe-opt .inp{padding:.4rem .55rem;font-size:.82rem}
  .qe-ck{font-size:.72rem;display:flex;gap:.25rem;align-items:center;color:var(--muted,#64748b);white-space:nowrap}
  .qe-add{border:1px dashed #f0a500;background:transparent;color:#b45309;border-radius:9px;padding:.35rem .7rem;font-size:.75rem;font-weight:700;cursor:pointer;justify-self:start}
  .qe-warn{color:#dc2626;font-size:.75rem;font-weight:700}
  .qe-bar{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center;margin-top:1rem}
  .qe-bar .msg{flex:1;font-size:.8rem;color:var(--muted,#64748b)}
  .qe-item{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;padding:.45rem;border:1px solid var(--border,#e2e8f0);border-radius:10px;margin-bottom:.4rem}
  .qe-item .inp{flex:1;min-width:130px;padding:.45rem .6rem;font-size:.85rem}
  .qe-logo{width:46px;height:46px;border:1px dashed var(--border,#cbd5e1);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.6rem;color:var(--muted,#64748b);position:relative;background:#0b111a0d;flex:none;text-align:center}
  .qe-logo img{max-width:100%;max-height:100%;object-fit:contain}
  .qe-logo .x{position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;border:1px solid var(--border,#cbd5e1);background:#fff;font-size:.6rem;cursor:pointer;padding:0;color:#0f172a}`;
  document.head.appendChild(css);

  // ---------- arbre ----------
  let num = {};
  function renderTree() {
    const root = document.getElementById('qe-root'); if (!root) return;
    num = {}; S.qs.forEach((q, i) => { num[q.id] = i + 1; });
    const roots = S.qs.filter(q => !parentOf(q));
    root.innerHTML = `<div class="qe-tree"><div class="qe-node" style="opacity:.75"><div class="qe-head"><span class="qe-n">✓</span><b>Prénom → question 1 (objectif) → créneau → coordonnées : la réservation est enregistrée</b><span class="qe-tag">avant la réservation</span></div></div>
      <div class="qe-cond" style="margin:.2rem 0 0">Juste après la réservation : les sous-questions de la question 1, puis les questions suivantes</div>${roots.map(nodeHtml).join('')}
      <button type="button" class="qe-add" onclick="qeAdd(null,'')">+ Question pour tout le monde</button>
      <div class="qe-node" style="opacity:.7"><div class="qe-head"><span class="qe-n">✓</span><b>Message de remerciement</b><span class="qe-tag">fin</span></div></div></div>`;
    bar('qe-bar', S.dirtyQ);
  }
  function nodeHtml(q) {
    const open = S.open.has(q.id);
    const groups = [];
    kids(q.id).forEach(k => { const key = groupKey(k); let g = groups.find(x => x.key === key); if (!g) groups.push(g = { key, items: [] }); g.items.push(k); });
    const labels = key => key.split('|').map(id => { const o = (q.options || []).find(x => x.id === id); return '« ' + esc(o ? o.label : '?') + ' »'; }).join(' ou ');
    return `<div class="qe-node" id="qe-${esc(q.id)}">
      <div class="qe-head" onclick="qeToggle('${q.id}')">
        <span class="qe-n">${num[q.id]}</span><b>${esc(q.title) || '<i>Sans titre</i>'}</b>
        <span class="qe-tag">${TYPES[q.type] || q.type}</span>${q.role ? `<span class="qe-tag role">${ROLES[q.role] || q.role}</span>` : ''}${q.optional ? '<span class="qe-tag">facultative</span>' : ''}
        <button type="button" class="qe-ib" title="Monter" onclick="event.stopPropagation();qeMove('${q.id}',-1)">↑</button>
        <button type="button" class="qe-ib" title="Descendre" onclick="event.stopPropagation();qeMove('${q.id}',1)">↓</button>
        ${q.role === 'objectiveType' ? '' : `<button type="button" class="qe-ib del" title="Supprimer" onclick="event.stopPropagation();qeDel('${q.id}')">🗑</button>`}
        <button type="button" class="qe-ib" title="Modifier">${open ? '▲' : '✏️'}</button>
      </div>
      ${open ? formHtml(q) : ((q.options || []).length && q.type !== 'scale' ? `<div class="qe-chips">${q.options.map(o => `<span class="qe-chip">${esc(o.label)}${o.other ? ' ✎' : ''}</span>`).join('')}</div>` : '')}
      ${groups.map(g => `<div class="qe-branch"><div class="qe-cond">↳ Si ${labels(g.key)}</div>${g.items.map(nodeHtml).join('')}<button type="button" class="qe-add" onclick="qeAdd('${q.id}','${esc(g.key)}')">+ Question dans cette branche</button></div>`).join('')}
    </div>`;
  }
  function formHtml(q) {
    const hasOpts = q.type === 'one' || q.type === 'many';
    const forbidden = new Set([q.id, ...desc(q.id).map(x => x.id)]);
    const parents = S.qs.filter(x => (x.type === 'one' || x.type === 'many') && !forbidden.has(x.id));
    const p = parentOf(q) ? Q(q.if.q) : null;
    const ids = (q.if && q.if.in) || [];
    return `<div class="qe-form">
      <div><label class="l">Question</label><div class="qe-row"><input class="inp" value="${esc(q.title)}" oninput="qeSet('${q.id}','title',this.value)"></div></div>
      <div><label class="l">Sous-titre (facultatif)</label><div class="qe-row"><input class="inp" value="${esc(q.sub)}" oninput="qeSet('${q.id}','sub',this.value)"></div></div>
      <div><label class="l">Nom de l'étape affiché au-dessus (facultatif, ex : Ton sport). Vide = celui de la question d'avant</label><div class="qe-row"><input class="inp" value="${esc(q.section)}" oninput="qeSet('${q.id}','section',this.value)"></div></div>
      <div class="qe-row">
        <div><label class="l">Type</label><select class="inp" style="min-width:150px" onchange="qeType('${q.id}',this.value)">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${q.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
        <label class="qe-ck"><input type="checkbox" ${q.optional ? 'checked' : ''} onchange="qeSet('${q.id}','optional',this.checked)"> Facultative</label>
        ${q.type === 'one' ? `<label class="qe-ck"><input type="checkbox" ${q.grid ? 'checked' : ''} onchange="qeSet('${q.id}','grid',this.checked)"> Boutons sur 2 colonnes</label>` : ''}
      </div>
      ${q.type === 'text' ? `<div><label class="l">Exemple affiché dans le champ</label><div class="qe-row"><input class="inp" value="${esc(q.placeholder)}" oninput="qeSet('${q.id}','placeholder',this.value)"></div></div>` : ''}
      ${q.type === 'many' ? `<div><label class="l">Champ libre sous les choix (laisser vide pour ne pas l'afficher)</label><div class="qe-row"><input class="inp" value="${esc(q.extraText)}" placeholder="Ex : Autre chose ?" oninput="qeSet('${q.id}','extraText',this.value)"></div></div>` : ''}
      ${q.type === 'scale' ? `<div class="qe-row"><input class="inp" value="${esc(q.low)}" placeholder="Texte sous 1" oninput="qeSet('${q.id}','low',this.value)"><input class="inp" value="${esc(q.high)}" placeholder="Texte sous 10" oninput="qeSet('${q.id}','high',this.value)"></div>` : ''}
      ${hasOpts ? `<div><label class="l">Réponses proposées</label><div style="display:grid;gap:.35rem">${(q.options || []).map((o, i) => `<div class="qe-opt">
          <input class="inp" style="flex:1;min-width:130px" value="${esc(o.label)}" oninput="qeOpt('${q.id}',${i},'label',this.value)">
          ${q.role === 'objectiveType' ? `<input class="inp" style="flex:2;min-width:160px" value="${esc(o.sub)}" placeholder="Description" oninput="qeOpt('${q.id}',${i},'sub',this.value)">` : ''}
          ${q.type === 'one' ? `<label class="qe-ck"><input type="checkbox" ${o.other ? 'checked' : ''} onchange="qeOpt('${q.id}',${i},'other',this.checked)"> + champ texte</label>` : `<label class="qe-ck"><input type="checkbox" ${o.excl ? 'checked' : ''} onchange="qeOpt('${q.id}',${i},'excl',this.checked)"> exclusive</label>`}
          <button type="button" class="qe-ib" onclick="qeOptMove('${q.id}',${i},-1)">↑</button><button type="button" class="qe-ib" onclick="qeOptMove('${q.id}',${i},1)">↓</button>
          <button type="button" class="qe-ib del" onclick="qeOptDel('${q.id}',${i})">🗑</button>
          <button type="button" class="qe-add" onclick="qeAdd('${q.id}','${esc(o.id)}')">+ Sous-question si cette réponse</button></div>`).join('')}
          <button type="button" class="qe-add" onclick="qeOptAdd('${q.id}')">+ Ajouter une réponse</button></div></div>
          ${q.type === 'one' && (q.options || []).some(o => o.other) ? `<div><label class="l">Texte du champ « + champ texte »</label><div class="qe-row"><input class="inp" value="${esc(q.otherPh)}" placeholder="Précise" oninput="qeSet('${q.id}','otherPh',this.value)"></div></div>` : ''}` : ''}
      ${q.role === 'objectiveType' ? '' : `<div><label class="l">Afficher cette question</label><div class="qe-row">
        <select class="inp" style="min-width:220px" onchange="qeCond('${q.id}',this.value)"><option value="">Toujours</option>${parents.map(x => `<option value="${esc(x.id)}" ${p && p.id === x.id ? 'selected' : ''}>Seulement si la question ${num[x.id]} : ${esc(x.title).slice(0, 60)}</option>`).join('')}</select></div>
        ${p ? `<div class="qe-row" style="margin-top:.35rem">${(p.options || []).map(o => `<label class="qe-ck"><input type="checkbox" ${ids.includes(o.id) ? 'checked' : ''} onchange="qeCondOpt('${q.id}','${esc(o.id)}',this.checked)"> ${esc(o.label)}</label>`).join('')}</div>${ids.length ? '' : '<div class="qe-warn">Coche au moins une réponse, sinon la question ne s\'affichera jamais.</div>'}` : ''}</div>`}
    </div>`;
  }
  function dirtyQ() { S.dirtyQ = true; bar('qe-bar', true); }
  function bar(id, dirty) {
    const el = document.getElementById(id); if (!el) return;
    el.querySelector('.msg').innerHTML = dirty ? '<b style="color:#b45309">Modifications non enregistrées</b>' : 'À jour';
    el.querySelector('.save').disabled = !dirty;
  }
  function rerender(focusId) { normalize(); renderTree(); if (focusId) { const n = document.getElementById('qe-' + focusId); if (n) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }

  Object.assign(window, {
    qeToggle(id) { S.open.has(id) ? S.open.delete(id) : S.open.add(id); renderTree(); },
    qeSet(id, k, v) { const q = Q(id); if (!q) return; if (v === false || v === '') delete q[k]; else q[k] = v; dirtyQ(); if (k === 'title') { const b = document.querySelector('#qe-' + id + ' > .qe-head b'); if (b) b.textContent = v; } },
    qeType(id, t) {
      const q = Q(id); const d = desc(id);
      if ((t === 'text' || t === 'scale') && d.length && !confirm(`Ce type n'a pas de réponses : ${d.length} sous-question(s) seront supprimées. Continuer ?`)) return renderTree();
      if (t === 'text' || t === 'scale') { const gone = new Set(d.map(x => x.id)); S.qs = S.qs.filter(x => !gone.has(x.id)); q.options = []; }
      else if (!(q.options || []).length) q.options = [{ id: uid('o'), label: 'Réponse 1' }, { id: uid('o'), label: 'Réponse 2' }];
      q.type = t; dirtyQ(); rerender();
    },
    qeOpt(id, i, k, v) { const o = Q(id).options[i]; if (v === false || v === '') delete o[k]; else o[k] = v; dirtyQ(); if (k === 'other' && Q(id).type === 'one') renderTree(); },
    qeOptAdd(id) { const q = Q(id); q.options = q.options || []; q.options.push({ id: uid('o'), label: 'Nouvelle réponse' }); dirtyQ(); renderTree(); },
    qeOptMove(id, i, d) { const a = Q(id).options; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; dirtyQ(); renderTree(); },
    qeOptDel(id, i) {
      const q = Q(id), o = q.options[i];
      if (q.options.length <= 1) { alert('Il faut au moins une réponse.'); return; }
      const hit = kids(id).filter(k => (k.if.in || []).includes(o.id));
      const lost = hit.filter(k => k.if.in.length === 1);
      const lostAll = lost.flatMap(k => [k, ...desc(k.id)]);
      if (lostAll.length && !confirm(`Supprimer « ${o.label} » supprimera aussi ${lostAll.length} sous-question(s) de cette branche. Continuer ?`)) return;
      hit.forEach(k => { k.if.in = k.if.in.filter(x => x !== o.id); });
      const gone = new Set(lostAll.map(x => x.id)); S.qs = S.qs.filter(x => !gone.has(x.id));
      q.options.splice(i, 1); dirtyQ(); rerender();
    },
    qeAdd(parentId, key) {
      const q = { id: uid('q'), type: 'one', title: 'Nouvelle question', sub: '', options: [{ id: uid('o'), label: 'Réponse 1' }, { id: uid('o'), label: 'Réponse 2' }] };
      if (parentId) q.if = { q: parentId, in: String(key).split('|').filter(Boolean) };
      S.qs.push(q); S.open.add(q.id); dirtyQ(); rerender(q.id);
    },
    qeDel(id) {
      const q = Q(id), d = desc(id);
      if (!confirm(`Supprimer « ${q.title} »${d.length ? ` et ses ${d.length} sous-question(s)` : ''} ?`)) return;
      const gone = new Set([id, ...d.map(x => x.id)]); S.qs = S.qs.filter(x => !gone.has(x.id)); dirtyQ(); rerender();
    },
    qeMove(id, dir) {
      const q = Q(id), p = parentOf(q), key = groupKey(q);
      const sib = S.qs.filter(x => parentOf(x) === p && groupKey(x) === key);
      const i = sib.indexOf(q), other = sib[i + dir]; if (!other) return;
      const a = S.qs.indexOf(q), b = S.qs.indexOf(other); S.qs[a] = other; S.qs[b] = q; dirtyQ(); rerender(id);
    },
    qeCond(id, pid) {
      const q = Q(id);
      if (!pid) delete q.if; else { const p = Q(pid); q.if = { q: pid, in: p.options && p.options[0] ? [p.options[0].id] : [] }; }
      dirtyQ(); rerender(id);
    },
    qeCondOpt(id, oid, on) { const q = Q(id); const s = new Set(q.if.in || []); on ? s.add(oid) : s.delete(oid); q.if.in = q.if.q && Q(q.if.q).options.map(o => o.id).filter(x => s.has(x)); dirtyQ(); renderTree(); },
    qeExpandAll(open) { S.open = new Set(open ? S.qs.map(q => q.id) : []); renderTree(); },
    qeReset() { if (!confirm('Revenir au questionnaire d\'origine ? (il faudra ensuite enregistrer)')) return; S.qs = clone(window.QUIZ_DEFAULT.questions); S.open.clear(); dirtyQ(); rerender(); },
    async qeSave() {
      for (const q of S.qs) {
        if (!String(q.title || '').trim()) { S.open.add(q.id); renderTree(); return alert('Une question n\'a pas de titre.'); }
        if ((q.type === 'one' || q.type === 'many') && (!(q.options || []).length || q.options.some(o => !String(o.label || '').trim()))) { S.open.add(q.id); renderTree(); return alert(`La question « ${q.title} » a une réponse vide.`); }
      }
      const questions = clone(S.qs);
      try {
        await ref('settings', 'tunnel').set({ quiz: { questions }, updatedAt: new Date().toISOString() }, { merge: true });
        if (window.crmState) crmState.tunnel.quiz = { questions };
        S.dirtyQ = false; bar('qe-bar', false); notify('Questionnaire enregistré');
      } catch (e) { console.error(e); alert('Erreur d\'enregistrement (droits admin ?)'); }
    }
  });

  // ---------- expériences & certifications ----------
  function renderExp() {
    const root = document.getElementById('exp-root'); if (!root) return;
    const row = (list, it, i) => `<div class="qe-item">
      ${list === 'exps' ? `<div class="qe-logo" title="Logo" onclick="qeLogo('${esc(it.id)}')">${S.logos[it.id] ? `<img src="${esc(S.logos[it.id])}" alt=""><button type="button" class="x" onclick="event.stopPropagation();qeLogoDel('${esc(it.id)}')">✕</button>` : '+ logo'}</div>` : ''}
      <input class="inp" value="${esc(it.name)}" placeholder="${list === 'exps' ? 'Club ou structure' : 'Diplôme ou certification'}" oninput="qeItem('${list}',${i},'name',this.value)">
      <input class="inp" value="${esc(it.detail)}" placeholder="Détail (facultatif)" oninput="qeItem('${list}',${i},'detail',this.value)">
      <button type="button" class="qe-ib" onclick="qeItemMove('${list}',${i},-1)">↑</button><button type="button" class="qe-ib" onclick="qeItemMove('${list}',${i},1)">↓</button>
      <button type="button" class="qe-ib del" onclick="qeItemDel('${list}',${i})">🗑</button></div>`;
    root.innerHTML = `<label style="display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:.4rem">Expériences (clubs et structures)</label>
      ${S.exps.map((e, i) => row('exps', e, i)).join('')}<button type="button" class="qe-add" onclick="qeItemAdd('exps')">+ Ajouter une expérience</button>
      <label style="display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;color:var(--muted);margin:1.2rem 0 .4rem">Diplômes et certifications</label>
      ${S.certs.map((c, i) => row('certs', c, i)).join('')}<button type="button" class="qe-add" onclick="qeItemAdd('certs')">+ Ajouter une certification</button>
      <p style="font-size:.75rem;color:var(--muted);margin-top:.8rem">N'affiche le logo d'un club qu'avec son accord. Sans logo, seul le nom s'affiche.</p>`;
    bar('exp-bar', S.dirtyE);
  }
  function dirtyE() { S.dirtyE = true; bar('exp-bar', true); }
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const r = Math.min(1, 400 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        resolve(/png|svg|webp|gif/.test(file.type) ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject; img.src = url;
    });
  }
  const picker = document.createElement('input'); picker.type = 'file'; picker.accept = 'image/*'; picker.style.display = 'none';
  let pickId = null;
  picker.addEventListener('change', async () => {
    const f = picker.files && picker.files[0]; if (!f || !pickId) return;
    try { S.logos[pickId] = await shrink(f); dirtyE(); renderExp(); } catch (e) { alert('Image illisible : essaie un PNG ou un JPG.'); }
  });
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(picker));
  if (document.body) document.body.appendChild(picker);

  Object.assign(window, {
    qeLogo(id) { pickId = id; picker.value = ''; picker.click(); },
    qeLogoDel(id) { delete S.logos[id]; dirtyE(); renderExp(); },
    qeItem(list, i, k, v) { S[list][i][k] = v; dirtyE(); },
    qeItemAdd(list) { S[list].push({ id: uid(list === 'exps' ? 'e' : 'c'), name: '', detail: '' }); dirtyE(); renderExp(); const r = document.querySelectorAll('#exp-root .qe-item'); },
    qeItemMove(list, i, d) { const a = S[list], j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; dirtyE(); renderExp(); },
    qeItemDel(list, i) { const it = S[list][i]; if (it.name && !confirm(`Retirer « ${it.name} » ?`)) return; S[list].splice(i, 1); if (list === 'exps') delete S.logos[it.id]; dirtyE(); renderExp(); },
    async qeSaveExp() {
      const clean = a => a.map(x => ({ id: x.id, name: String(x.name || '').trim(), detail: String(x.detail || '').trim() })).filter(x => x.name);
      const experiences = clean(S.exps), certs = clean(S.certs);
      try {
        const keep = new Set(experiences.map(e => e.id));
        for (const id of new Set([...Object.keys(S.logos), ...Object.keys(S.logosOrig)])) {
          const now = keep.has(id) ? S.logos[id] : undefined;
          if (now === S.logosOrig[id]) continue;
          if (now) await ref('tunnel_media', 'exp_' + id).set({ src: now, updatedAt: new Date().toISOString() });
          else await ref('tunnel_media', 'exp_' + id).delete();
        }
        await ref('settings', 'tunnel').set({ experiences, certs, updatedAt: new Date().toISOString() }, { merge: true });
        if (window.crmState) Object.assign(crmState.tunnel, { experiences, certs });
        S.exps = clone(experiences); S.certs = clone(certs);
        S.logosOrig = {}; experiences.forEach(e => { if (S.logos[e.id]) S.logosOrig[e.id] = S.logos[e.id]; }); S.logos = Object.assign({}, S.logosOrig);
        S.dirtyE = false; renderExp(); notify('Parcours enregistré');
      } catch (e) { console.error(e); alert('Erreur d\'enregistrement (droits admin ?)'); }
    }
  });

  window.renderQuizEditor = async function (t) {
    t = t || {};
    if (!S.dirtyQ) {
      S.qs = clone(t.quiz && Array.isArray(t.quiz.questions) && t.quiz.questions.length ? t.quiz.questions : window.QUIZ_DEFAULT.questions);
      normalize();
    }
    renderTree();
    if (!S.dirtyE) {
      S.exps = clone(Array.isArray(t.experiences) ? t.experiences : window.EXP_DEFAULT);
      S.certs = clone(Array.isArray(t.certs) ? t.certs : window.CERT_DEFAULT);
      renderExp();
      const res = await Promise.all(S.exps.map(e => ref('tunnel_media', 'exp_' + e.id).get().then(d => [e.id, d.exists ? (d.data() || {}).src : null]).catch(() => [e.id, null])));
      if (S.dirtyE) return;
      S.logosOrig = {}; res.forEach(([id, src]) => { if (src) S.logosOrig[id] = src; }); S.logos = Object.assign({}, S.logosOrig);
      renderExp();
    }
  };
  window.addEventListener('beforeunload', e => { if (S.dirtyQ || S.dirtyE) { e.preventDefault(); e.returnValue = ''; } });
})();
