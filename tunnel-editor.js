(function () {
  const T = window.TUNNEL;
  const ADMIN_ROLES = ['admin', 'Admin', 'administrateur'];
  const els = [...document.querySelectorAll('[data-k]')];
  const defaultOf = k => (T.LEGACY_KEYS.includes(k) && window.TUNNEL_DEFAULTS[k]) || T.DEFAULT_TEXTS[k];
  let saved = {}, dirty = false;

  const css = document.createElement('style');
  css.textContent = `
    body.editing{padding-bottom:90px}
    body.editing [data-k]{outline:1px dashed rgba(240,165,0,.45);outline-offset:3px;border-radius:4px;cursor:text}
    body.editing [data-k]:hover{outline-color:var(--gold)}
    body.editing [data-k]:focus{outline:2px solid var(--gold);background:rgba(240,165,0,.08)}
    body.editing #success,body.editing #closed{display:block!important;margin-top:28px;padding-top:22px;border-top:1px dashed var(--border)}
    body.editing #success::before,body.editing #closed::before{display:block;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
    body.editing #success::before{content:"Message affiché après la réservation"}
    body.editing #closed::before{content:"Message affiché si le tunnel est fermé"}
    #te-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#0b111a;border-top:1px solid var(--gold);padding:12px 18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:14px;box-shadow:0 -10px 40px #000a}
    #te-bar .te-msg{flex:1;min-width:200px;color:var(--muted)}#te-bar .te-msg b{color:var(--gold)}
    #te-bar button,#te-bar a{border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:9px;padding:9px 14px;font-weight:700;cursor:pointer;text-decoration:none;font-size:13px}
    #te-bar .te-save{background:var(--gold);color:#1a0900;border-color:var(--gold)}#te-bar .te-save:disabled{opacity:.5;cursor:default}`;
  document.head.appendChild(css);

  const bar = document.createElement('div');
  bar.id = 'te-bar';
  bar.innerHTML = '<div class="te-msg">Vérification de ton compte admin…</div>';
  document.body.appendChild(bar);
  const msg = html => { bar.querySelector('.te-msg').innerHTML = html; };

  const script = document.createElement('script');
  script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
  script.onerror = () => msg('Éditeur indisponible (connexion internet ?).');
  script.onload = () => checkAdmin(firebase.auth());
  document.head.appendChild(script);

  function checkAdmin(auth) {
  const unsub = auth.onAuthStateChanged(async user => {
    unsub();
    if (!user) return deny('Connecte-toi d\'abord en <b>admin</b> dans l\'appli, puis rouvre l\'éditeur.');
    try {
      const d = await window.db.collection('apps').doc('delta-perf-v2').collection('users').doc(user.uid).get();
      if (!d.exists || !ADMIN_ROLES.includes((d.data() || {}).role)) return deny('Ce compte n\'est pas <b>admin</b> : édition impossible.');
      start();
    } catch (e) { console.error(e); deny('Impossible de vérifier ton compte.'); }
  });
  }

  function deny(text) {
    msg(text);
    bar.insertAdjacentHTML('beforeend', '<a href="index.html">Se connecter</a><a href="tunnel.html?funnel">Voir la page</a>');
  }

  function start() {
    document.body.classList.add('editing');
    els.forEach(el => {
      try { el.contentEditable = 'plaintext-only'; } catch (e) {}
      if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
      el.spellcheck = true;
      saved[el.dataset.k] = el.textContent;
      el.addEventListener('input', update);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        else if (e.key === ' ' && el.closest('button,[role=button]')) { e.preventDefault(); document.execCommand('insertText', false, ' '); }
      });
      el.addEventListener('paste', e => {
        e.preventDefault();
        document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text').replace(/\s*\n\s*/g, ' '));
      });
    });
    document.addEventListener('click', e => {
      if (e.target.closest('#te-bar')) return;
      if (e.target.closest('a,button,.goal')) e.preventDefault();
    }, true);
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    bar.innerHTML = '<div class="te-msg"></div>' +
      '<button type="button" class="te-reset">Textes d\'origine</button>' +
      '<button type="button" class="te-cancel">Annuler</button>' +
      '<a href="tunnel.html?funnel" target="_blank">Voir la page</a>' +
      '<button type="button" class="te-save">Enregistrer</button>';
    bar.querySelector('.te-save').onclick = save;
    bar.querySelector('.te-cancel').onclick = () => { els.forEach(el => { el.textContent = saved[el.dataset.k]; }); update(); };
    bar.querySelector('.te-reset').onclick = () => {
      if (!confirm('Remettre tous les textes d\'origine ? (il faudra ensuite enregistrer)')) return;
      els.forEach(el => { el.textContent = defaultOf(el.dataset.k); }); update();
    };
    update();
  }

  function value(el) { return el.textContent.replace(/\s+/g, ' ').trim(); }

  function update() {
    const n = els.filter(el => value(el) !== saved[el.dataset.k].replace(/\s+/g, ' ').trim()).length;
    dirty = n > 0;
    msg(dirty ? '<b>' + n + ' modification' + (n > 1 ? 's' : '') + '</b> non enregistrée' + (n > 1 ? 's' : '')
              : '<b>Mode édition</b> : clique sur un texte pour le modifier.');
    bar.querySelector('.te-save').disabled = !dirty;
  }

  async function save() {
    const btn = bar.querySelector('.te-save');
    const del = firebase.firestore.FieldValue.delete();
    const data = { texts: {}, updatedAt: new Date().toISOString() };
    for (const el of els) {
      const k = el.dataset.k, v = value(el);
      if (!v) { el.focus(); msg('<b>Un texte est vide</b> : remplis-le ou clique « Annuler ».'); return; }
      if (T.LEGACY_KEYS.includes(k)) data[k] = v;
      else data.texts[k] = v === T.DEFAULT_TEXTS[k].replace(/\s+/g, ' ').trim() ? del : v;
    }
    btn.disabled = true; msg('Enregistrement…');
    try {
      await T.col('settings').doc('tunnel').set(data, { merge: true });
      els.forEach(el => { el.textContent = value(el); saved[el.dataset.k] = el.textContent; });
      update(); msg('<b>Enregistré ✓</b> — la page publique est à jour.');
    } catch (e) {
      console.error(e); btn.disabled = false; msg('<b>Erreur d\'enregistrement</b> (droits Firestore ?)');
    }
  }
})();
