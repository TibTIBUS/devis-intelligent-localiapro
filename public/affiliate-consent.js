(function () {
  'use strict';
  // In-memory pending reference only: no cookie or web storage before consent.
  var script = document.currentScript;
  var product = script && script.getAttribute('data-product');
  if (!/^(kliip|nalto|localia)$/.test(product || '')) return;
  var key = 'localia_affiliate_' + product;
  var marker = key + '_consent';
  var valid = function (value) { return typeof value === 'string' && /^[a-z0-9-]{3,50}$/.test(value); };
  var read = function (name) {
    var match = document.cookie.split('; ').find(function (part) { return part.indexOf(name + '=') === 0; });
    if (!match) return null;
    try { return decodeURIComponent(match.slice(name.length + 1)); } catch (_) { return null; }
  };
  var pending = new URLSearchParams(location.search).get('ref');
  if (!valid(pending)) pending = null;
  var current = read(key);
  if (!valid(current) || read(marker) !== 'yes') current = null;
  var secure = location.protocol === 'https:' ? '; Secure' : '';
  function save(name, value, age) { document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; Max-Age=' + age + '; SameSite=Lax' + secure; }
  function refreshLinks() {
    if (product !== 'localia') return;
    document.querySelectorAll('a[href]').forEach(function (a) {
      try {
        var u = new URL(a.href);
        if (u.origin !== 'https://buy.stripe.com') return;
        // Only the three approved Localia subscription Payment Links.
        if (!['/14A3cv7HOfdm9WhgP41gs0s', '/eVqbJ10fm4yIgkFdCS1gs0n', '/eVq14n9PWc1a1pL42i1gs0o'].includes(u.pathname)) return;
        if (current) u.searchParams.set('client_reference_id', 'localia-partner-' + current);
        else if ((u.searchParams.get('client_reference_id') || '').indexOf('localia-partner-') === 0) u.searchParams.delete('client_reference_id');
        a.href = u.toString();
      } catch (_) { /* unrelated link */ }
    });
  }
  function launch() {
    if (document.getElementById(key + '_settings')) return;
    if (!pending && !current) return;
    var box = document.createElement('section');
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', 'Recommandation partenaire');
    box.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:2147483000;max-width:540px;margin:auto;padding:18px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#17212f;box-shadow:0 8px 30px #0002;font:14px/1.5 system-ui,sans-serif';
    if (product === 'kliip') { box.style.position = 'relative'; box.style.bottom = 'auto'; box.style.left = 'auto'; box.style.right = 'auto'; box.style.margin = '16px auto'; box.style.width = 'calc(100% - 32px)'; box.style.boxSizing = 'border-box'; }
    var text = document.createElement('p');text.style.margin='0 0 12px';
    text.textContent = 'Autoriser le suivi de la recommandation ? Un cookie de 60 jours permet de rémunérer le partenaire qui vous a recommandé ce service, sans changer votre prix. Le refus ne bloque ni le service ni le paiement.';
    var accept = document.createElement('button');accept.type='button';accept.textContent='Autoriser';
    var refuse = document.createElement('button');refuse.type='button';refuse.textContent='Refuser';
    [accept, refuse].forEach(function (b) { b.style.cssText='padding:9px 14px;margin:0 8px 0 0;border:1px solid #64748b;border-radius:8px;background:#fff;color:#17212f;font:inherit;cursor:pointer'; });
    var settings = document.createElement('button');settings.id=key+'_settings';settings.type='button';settings.textContent='Recommandation partenaire';
    settings.style.cssText='position:fixed;bottom:8px;left:8px;z-index:2147482999;padding:5px 8px;border:1px solid #94a3b8;border-radius:6px;background:#fff;color:#334155;font:11px system-ui,sans-serif;cursor:pointer';
    function close() { box.hidden=true;settings.hidden=false; }
    accept.onclick=function () {
      // First consented referral wins; a later link cannot overwrite it.
      if (!current && pending) { current=pending;save(key,current,60*86400);save(marker,'yes',60*86400); }
      pending=null;refreshLinks();close();
    };
    refuse.onclick=function () { current=null;pending=null;save(key,'',0);save(marker,'',0);refreshLinks();close(); };
    settings.onclick=function () { text.textContent='Le suivi de recommandation est '+(current?'autorisé. Vous pouvez retirer votre accord avec Refuser.':'désactivé. Aucun cookie de recommandation actif.');box.hidden=false;settings.hidden=true; };
    box.append(text,accept,refuse);if(product === 'kliip'){document.body.prepend(box);document.body.append(settings);}else{document.body.append(box,settings);}settings.hidden=true;
    refreshLinks();
    if (current) close();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',launch,{once:true}); else launch();
})();
