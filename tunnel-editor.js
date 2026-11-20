(function () {
  const T = window.TUNNEL;
  const ADMIN_ROLES = ['admin', 'Admin', 'administrateur'];
  const els = [...document.querySelectorAll('[data-k]')];
  const imgEls = [...document.querySelectorAll('[data-img]')];
  const imgKeys = [...new Set(imgEls.map(el => el.dataset.img))];
  const imgSrc = k => document.querySelector('[data-img="' + k + '"]').getAttribute('src');
  const setImg = (k, src) => imgEls.filter(el => el.dataset.img === k).forEach(el => { el.src = src; });
  const isOpt = el => el.hasAttribute('data-opt');
  let saved = {}, savedImg = {}, dirty = false;

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
    body.editing .ph{position:relative;cursor:pointer;outline:1px dashed rgba(240,165,0,.6);outline-offset:3px}
    body.editing .ph::after{content:"📷 Changer";position:absolute;left:50%;bottom:8px;transform:translateX(-50%);background:rgba(8,12,18,.85);color:var(--gold);font:700 11px Inter,sans-serif;padding:5px 9px;border-radius:999px;white-space:nowrap;pointer-events:none}
    body.editing .coach-chip .ph::after{content:"📷";padding:3px 5px;bottom:2px}
    .te-x{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:#0b111a;color:var(--text);font-size:11px;cursor:pointer;z-index:2;padding:0}
    body.editing .club .ph::after{content:"📷";padding:3px 5px;bottom:2px}
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
        else if (e.key === ' ' && el.closest('button,[role=button],summary')) { e.preventDefault(); document.execCommand('insertText', false, ' '); }
      });
      el.addEventListener('paste', e => {
        e.preventDefault();
        document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text').replace(/\s*\n\s*/g, ' '));
      });
    });
    document.addEventListener('click', e => {
      if (e.target.closest('#te-bar')) return;
      if (e.target.closest('a,button,.goal,summary')) e.preventDefault();
    }, true);
    const picker = document.createElement('input');
    picker.type = 'file'; picker.accept = 'image/*'; picker.style.display = 'none';
    document.body.appendChild(picker);
    let pickKey = null;
    imgKeys.forEach(k => { savedImg[k] = imgSrc(k); });
    imgEls.forEach(el => {
      (el.closest('.ph') || el).addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); pickKey = el.dataset.img; picker.value = ''; picker.click(); });
    });
    imgEls.filter(el => el.closest('.club')).forEach(el => {
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'te-x'; x.textContent = '✕'; x.title = 'Retirer le logo';
      x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); setImg(el.dataset.img, ''); update(); });
      el.closest('.ph').appendChild(x);
    });
    picker.addEventListener('change', async () => {
      const f = picker.files && picker.files[0]; if (!f || !pickKey) return;
      try { setImg(pickKey, await shrink(f)); update(); }
      catch (e) { console.error(e); msg('<b>Image illisible</b> : essaie une photo JPG ou PNG.'); }
    });
    window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
    bar.innerHTML = '<div class="te-msg"></div>' +
      '<button type="button" class="te-reset">Textes d\'origine</button>' +
      '<button type="button" class="te-cancel">Annuler</button>' +
      '<a href="tunnel.html?funnel" target="_blank">Voir la page</a>' +
      '<button type="button" class="te-save">Enregistrer</button>';
    bar.querySelector('.te-save').onclick = save;
    bar.querySelector('.te-cancel').onclick = () => { els.forEach(el => { el.textContent = saved[el.dataset.k]; }); imgKeys.forEach(k => setImg(k, savedImg[k])); update(); };
    bar.querySelector('.te-reset').onclick = () => {
      if (!confirm('Remettre tous les textes d\'origine ? (il faudra ensuite enregistrer)')) return;
      els.forEach(el => { el.textContent = T.DEFAULT_TEXTS[el.dataset.k]; }); imgKeys.forEach(k => setImg(k, T.DEFAULT_IMGS[k])); update();
    };
    update();
  }

  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1000, r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject; img.src = url;
    });
  }

  function changedImgs() { return imgKeys.filter(k => imgSrc(k) !== savedImg[k]); }

  function value(el) { return el.textContent.replace(/\s+/g, ' ').trim(); }

  function update() {
    const n = els.filter(el => value(el) !== saved[el.dataset.k].replace(/\s+/g, ' ').trim()).length + changedImgs().length;
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
      if (!v && !isOpt(el)) { el.focus(); msg('<b>Un texte est vide</b> : remplis-le ou clique « Annuler ».'); return; }
      data.texts[k] = v === T.DEFAULT_TEXTS[k].replace(/\s+/g, ' ').trim() ? del : v;
    }
    T.LEGACY_KEYS.forEach(k => { data[k] = del; });
    const imgs = changedImgs();
    btn.disabled = true; msg('Enregistrement…');
    try {
      for (const k of imgs) {
        const src = imgSrc(k);
        if (src === T.DEFAULT_IMGS[k]) await T.col('tunnel_media').doc(k).delete();
        else await T.col('tunnel_media').doc(k).set({ src, updatedAt: data.updatedAt });
      }
      await T.col('settings').doc('tunnel').set(data, { merge: true });
      els.forEach(el => { el.textContent = value(el); saved[el.dataset.k] = el.textContent; });
      imgKeys.forEach(k => { savedImg[k] = imgSrc(k); });
      update(); msg('<b>Enregistré ✓</b> — la page publique est à jour.');
    } catch (e) {
      console.error(e); btn.disabled = false; msg('<b>Erreur d\'enregistrement</b> (droits Firestore ?)');
    }
  }
})();
