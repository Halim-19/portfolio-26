(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ---------- Routing: #/ , #/projects , #/contact , #services ---------- */
  var views = { home: 'view-home', projects: 'view-projects', contact: 'view-contact' };
  var siteTitle = document.title;
  var siteName = siteTitle.split(' – ')[0];
  var titles = { projects: 'Projects', contact: 'Contact' };
  var firstRoute = true;

  function route() {
    var raw = location.hash.replace(/^#\/?/, '') || 'home';
    var k = raw.split('/')[0];
    var toServices = k === 'services';
    if (toServices || !views[k]) k = 'home';
    var current = toServices ? 'services' : k;

    Object.keys(views).forEach(function (n) { $(views[n]).hidden = n !== k; });
    document.querySelectorAll('[data-r]').forEach(function (a) {
      if (a.dataset.r === current) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.title = titles[k] ? titles[k] + ' – ' + siteName : siteTitle;

    if (toServices) {
      $('services').scrollIntoView();
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      // Move focus to the new view so keyboard and screen-reader users land on it.
      if (!firstRoute) $('main').focus({ preventScroll: true });
    }
    firstRoute = false;
  }

  /* ---------- Render from data.json ---------- */
  function renderProfile(p) {
    $('brand').textContent = '~/' + p.name.toLowerCase().replace(/\s+/g, '-');
    $('heroTitle').textContent = p.fullName || p.name;
    $('heroRole').textContent = p.role;
    $('heroIntro').textContent = p.intro;
    $('photo').src = p.photo;
    $('photo').alt = p.photoAlt || p.name;
    $('footName').textContent = '© ' + new Date().getFullYear() + ' ' + (p.fullName || p.name);
  }

  function field(label, value, cls) {
    var d = el('div', cls || '');
    d.appendChild(el('dt', '', label));
    d.appendChild(el('dd', '', value));
    return d;
  }

  function renderProjects(projects) {
    var filters = $('filters'), cards = $('cards'), status = $('filterStatus');
    var cats = ['All'];
    projects.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });

    cats.forEach(function (c, i) {
      var b = el('button', 'f', c);
      b.type = 'button';
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        var shown = 0;
        filters.querySelectorAll('.f').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        cards.querySelectorAll('.card').forEach(function (card) {
          card.hidden = !(c === 'All' || card.dataset.c === c);
          if (!card.hidden) shown++;
        });
        status.textContent = shown + (shown === 1 ? ' project' : ' projects') + ' shown';
      });
      filters.appendChild(b);
    });

    projects.forEach(function (p) {
      var card = el('article', 'card');
      card.dataset.c = p.category;

      var shot = el('div', 'shot' + (/mobile/i.test(p.type || '') ? ' shot-mobile' : ''));
      if (p.file) {
        var img = el('img');
        img.src = p.file;
        img.alt = p.title + ' screenshot';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', function () { img.remove(); });
        shot.appendChild(img);
      }
      card.appendChild(shot);

      var cb = el('div', 'cb');
      cb.appendChild(el('h3', '', p.title));
      cb.appendChild(el('p', '', p.description));

      var fields = el('dl', 'fields');
      fields.appendChild(field('Category', p.category));
      fields.appendChild(field('Type', p.type));
      fields.appendChild(field('Year', String(p.year), 'year'));
      if (p.tags && p.tags.length) fields.appendChild(field('Stack', p.tags.join(', '), 'wide'));
      cb.appendChild(fields);

      // The visible text is specific per project so links make sense out of context.
      var link = el('a', 'lnk', p.url ? 'Visit live project' : 'Request something similar');
      link.appendChild(el('span', 'sr', ': ' + p.title + (p.url ? ' (opens in a new tab)' : '')));
      link.href = p.url || '#/contact';
      if (p.url) { link.target = '_blank'; link.rel = 'noopener'; }
      cb.appendChild(link);

      card.appendChild(cb);
      cards.appendChild(card);
    });

    status.textContent = '';
  }

  function copyText(text) {
    function fallbackCopy() {
      var input = el('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (error) { copied = false; }
      input.remove();
      return copied;
    }
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return Promise.resolve(fallbackCopy());
    }
    return navigator.clipboard.writeText(text).then(function () { return true; }, fallbackCopy);
  }

  function renderContact(c) {
    $('contactIntro').textContent = c.intro;
    $('footLoc').textContent = c.location;
    var info = $('info');
    [['Email', c.email, 'email address'], ['Phone', c.phone, 'phone number'], ['Location', c.location], ['Availability', c.availability]]
      .forEach(function (r) {
        info.appendChild(el('dt', '', r[0]));
        var dd = el('dd');
        if (r[2]) {
          var button = el('button', 'copy-btn', 'Copy');
          var status = el('span', 'copy-status');
          button.type = 'button';
          button.setAttribute('aria-label', 'Copy ' + r[2]);
          status.setAttribute('role', 'status');
          button.addEventListener('click', function () {
            copyText(r[1]).then(function (copied) {
              if (!copied) {
                status.textContent = 'Could not copy. Select the text and copy it manually.';
                return;
              }
              button.textContent = 'Copied';
              status.textContent = r[0] + ' copied to clipboard.';
              window.setTimeout(function () { button.textContent = 'Copy'; }, 1800);
            });
          });
          dd.appendChild(el('span', '', r[1]));
          dd.appendChild(button);
          dd.appendChild(status);
        } else {
          dd.textContent = r[1];
        }
        info.appendChild(dd);
      });
  }

  function renderAll(d) {
    // Each section is isolated so one failure can't blank the others.
    [
      function () { renderProfile(d.profile); },
      function () { renderProjects(d.projects); },
      function () { renderContact(d.contact); }
    ].forEach(function (fn) {
      try { fn(); } catch (error) { console.error('Render error:', error); }
    });
  }

  /* ---------- Start ---------- */
  document.querySelector('.skip').addEventListener('click', function (e) {
    e.preventDefault(); // "#main" would otherwise be read by the hash router
    $('main').focus();
  });
  window.addEventListener('hashchange', route);
  route();

  fetch(new URL('data.json', window.location.href).href)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(renderAll)
    .catch(function (error) {
      console.error('Could not load data.json:', error);
      var msg = el('p', 'load-error', 'Content could not be loaded. If you opened index.html straight from disk, serve the folder over HTTP instead, for example with: python3 -m http.server');
      msg.setAttribute('role', 'alert');
      $('main').prepend(msg);
    });
})();