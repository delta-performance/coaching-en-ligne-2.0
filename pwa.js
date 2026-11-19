(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPod/.test(ua);
  const isAndroidPhone = /Android/.test(ua) && /Mobile/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const LATER_KEY = 'delta-pwa-later';
  let installPrompt = null;

  if (isStandalone) {
    try { localStorage.setItem('delta-pwa-installed', '1'); } catch (e) {}
    return;
  }
  if (!isIOS && !isAndroidPhone) return;
  if (sessionStorage.getItem(LATER_KEY)) return;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.style.display = 'block';
  });
  window.addEventListener('appinstalled', close);

  const shareIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" stroke-width="2" style="vertical-align:-3px"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/></svg>';
  const dots = '<b style="font-size:18px;line-height:0">⋮</b>';
  const iosNotSafari = isIOS && /CriOS|FxiOS|EdgiOS|GSA\//.test(ua);
  const steps = isIOS
    ? (iosNotSafari
        ? ['Touche ' + shareIcon + ' <b>Partager</b> (en haut ou en bas de l\'écran)', 'Choisis <b>« Sur l\'écran d\'accueil »</b>', 'Touche <b>Ajouter</b>']
        : ['Touche ' + shareIcon + ' <b>Partager</b> en bas de Safari', 'Fais défiler et choisis <b>« Sur l\'écran d\'accueil »</b>', 'Touche <b>Ajouter</b> en haut à droite'])
    : ['Touche le menu ' + dots + ' en haut à droite', 'Choisis <b>« Installer l\'application »</b> ou <b>« Ajouter à l\'écran d\'accueil »</b>', 'Confirme avec <b>Installer</b>'];

  function close() {
    document.getElementById('pwa-tuto')?.remove();
  }

  function show() {
    if (document.getElementById('pwa-tuto')) return;
    const el = document.createElement('div');
    el.id = 'pwa-tuto';
    el.innerHTML = `
<style>
#pwa-tuto{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;font-family:Arial,sans-serif}
#pwa-tuto .sheet{width:100%;background:#141d2b;color:#e8edf3;border-radius:22px 22px 0 0;border-top:1px solid #26384d;padding:22px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px #000a}
#pwa-tuto .hd{display:flex;align-items:center;gap:12px}
#pwa-tuto svg{display:inline-block}
#pwa-tuto .hd img{width:52px;height:52px;border-radius:12px}
#pwa-tuto h3{margin:0;font-size:18px}
#pwa-tuto .sub{color:#8da0b8;font-size:13px;margin-top:3px;line-height:1.4}
#pwa-tuto ol{list-style:none;padding:0;margin:18px 0 6px}
#pwa-tuto li{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #26384d;font-size:15px;line-height:1.4}
#pwa-tuto li span.n{flex:0 0 28px;height:28px;border-radius:50%;background:#f0a500;color:#1a0900;font-weight:800;display:flex;align-items:center;justify-content:center}
#pwa-tuto .tip{color:#8da0b8;font-size:12.5px;line-height:1.45;margin:12px 0 0}
#pwa-tuto button{width:100%;border:0;border-radius:12px;padding:14px;font-weight:800;font-size:15px;margin-top:12px;cursor:pointer}
#pwa-tuto .install{background:linear-gradient(135deg,#c8102e,#8a0c1f);color:#fff;display:none}
#pwa-tuto .later{background:transparent;color:#8da0b8;border:1px solid #26384d}
${isIOS && !iosNotSafari ? '#pwa-tuto .arrow{text-align:center;font-size:26px;color:#f0a500;margin-top:6px;animation:pwab 1s infinite alternate}@keyframes pwab{to{transform:translateY(6px)}}' : '#pwa-tuto .arrow{display:none}'}
</style>
<div class="sheet" role="dialog" aria-label="Installer l'application">
  <div class="hd"><img src="apple-touch-icon.png" alt=""><div><h3>Installe l'appli DELTA</h3><div class="sub">Accès en un clic depuis ton écran d'accueil, et tu restes connecté.</div></div></div>
  <button class="install" id="pwa-install-btn">INSTALLER L'APPLI</button>
  <ol>${steps.map((s, i) => `<li><span class="n">${i + 1}</span><span>${s}</span></li>`).join('')}</ol>
  <p class="tip">Ensuite, ouvre <b>DELTA</b> depuis ton écran d'accueil et connecte-toi une fois : la connexion sera ensuite automatique.</p>
  <button class="later" id="pwa-later-btn">Plus tard</button>
  <div class="arrow">↓</div>
</div>`;
    document.body.appendChild(el);
    if (installPrompt) document.getElementById('pwa-install-btn').style.display = 'block';
    document.getElementById('pwa-install-btn').onclick = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      installPrompt = null;
      if (outcome === 'accepted') close();
    };
    document.getElementById('pwa-later-btn').onclick = () => {
      sessionStorage.setItem(LATER_KEY, '1');
      close();
    };
  }

  window.showInstallTutorial = show;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(show, 1200));
  else setTimeout(show, 1200);
})();
