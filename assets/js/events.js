/*
  Live events for the Events page.
  Reads ICPF's program feed from org-app and shows:
    - the next 3 upcoming programs as feature cards
    - every later program in a compact list
  If the feed can't be reached, it shows org-app's own embedded list instead.
  Nothing here needs editing when programs change: add or update them in org-app.
*/
(function () {
  var root = document.getElementById('events-root');
  if (!root) return;

  var FEED = root.getAttribute('data-feed');
  var FEATURED = 3;
  var TIMEOUT_MS = 10000;

  // ---------- helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function safeUrl(u) {
    try { var x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : null; } catch (e) { return null; }
  }
  function tzOf(p) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: p.timeZone }); return p.timeZone; } catch (e) { return undefined; }
  }
  function fmt(d, opts, tz) {
    return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, opts)).format(d);
  }
  function dateRange(p) {
    var tz = tzOf(p), s = new Date(p.starts), e = p.ends ? new Date(p.ends) : null;
    var o = { month: 'short', day: 'numeric', year: 'numeric' };
    var f = new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz }, o));
    if (!e || fmt(s, o, tz) === fmt(e, o, tz)) return f.format(s);
    return f.formatRange ? f.formatRange(s, e) : f.format(s) + ' to ' + f.format(e);
  }
  function place(p) {
    if (p.online && !(p.places && p.places.length)) return 'Online';
    var pl = (p.places || []).map(function (x) {
      return [x.name, x.city].filter(Boolean).join(', ');
    }).filter(Boolean).join(' · ');
    return p.online ? (pl ? pl + ' · Online' : 'Online') : pl;
  }
  // Registration status -> { text, tone }
  function status(p, now) {
    var opens = p.opensAt ? new Date(p.opensAt) : null;
    var closes = p.closesAt ? new Date(p.closesAt) : null;
    // A deadline at 12:00 AM means "through the day before", so display it that way.
    var closesShown = closes ? new Date(closes.getTime() - 60000) : null;
    var tz = tzOf(p), short = { month: 'short', day: 'numeric' };
    var st = String(p.status || '').toLowerCase();
    if (opens && opens > now) return { text: 'Opens ' + fmt(opens, short, tz), tone: 'soon' };
    if (st === 'open' && (!closes || closes > now)) {
      if (closes) {
        var days = Math.ceil((closes - now) / 864e5);
        return { text: days <= 7 ? 'Closing soon · ' + fmt(closesShown, short, tz) : 'Register by ' + fmt(closesShown, short, tz), tone: days <= 7 ? 'urgent' : 'open' };
      }
      return { text: 'Registration open', tone: 'open' };
    }
    if (st === 'open' && closes && closes <= now) return { text: 'Registration closed', tone: 'closed' };
    if (!st) return null;
    var label = st.replace(/[_-]+/g, ' ');
    return { text: label.charAt(0).toUpperCase() + label.slice(1), tone: /full|closed|cancel/.test(st) ? 'closed' : 'soon' };
  }
  function canRegister(s) { return s && (s.tone === 'open' || s.tone === 'urgent'); }
  function summary(t, n) {
    if (!t) return '';
    t = String(t).replace(/\s+/g, ' ').trim();
    return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
  }
  var ICON = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  function meta(icon, text) {
    var li = el('li'); li.innerHTML = ICON[icon]; li.appendChild(el('span', null, text)); return li;
  }
  function buttons(p, s, cls) {
    var wrap = el('div', cls);
    var reg = safeUrl(p.registerUrl), more = safeUrl(p.url);
    if (canRegister(s) && reg) {
      var a = el('a', 'btn btn-primary', 'Register'); a.href = reg; a.target = '_blank'; a.rel = 'noopener';
      a.insertAdjacentHTML('beforeend', ICON.arrow); a.setAttribute('aria-label', 'Register for ' + p.title);
      wrap.appendChild(a);
    }
    if (more) {
      var d = el('a', 'btn btn-ghost', 'Details'); d.href = more; d.target = '_blank'; d.rel = 'noopener';
      d.setAttribute('aria-label', 'Details for ' + p.title);
      wrap.appendChild(d);
    }
    return wrap;
  }

  // ---------- views ----------
  function card(p, now) {
    var s = status(p, now);
    var c = el('article', 'ev-card reveal');
    var media = el('div', 'ev-img');
    var img = safeUrl(p.image);
    if (img) {
      var i = el('img'); i.src = img; i.alt = ''; i.loading = 'lazy'; i.decoding = 'async';
      i.onerror = function () { i.remove(); media.classList.add('ev-noimg'); };
      media.appendChild(i);
    } else media.classList.add('ev-noimg');
    if (p.category && p.category.name) media.appendChild(el('span', 'ev-cat', p.category.name));
    if (s) media.appendChild(el('span', 'ev-status ev-' + s.tone, s.text));
    c.appendChild(media);

    var body = el('div', 'ev-body');
    body.appendChild(el('h3', null, p.title));
    var ul = el('ul', 'ev-meta');
    ul.appendChild(meta('cal', dateRange(p)));
    var pl = place(p); if (pl) ul.appendChild(meta('pin', pl));
    if (p.price && p.price.label) ul.appendChild(meta('tag', p.price.label));
    body.appendChild(ul);
    var sm = summary(p.summary, 150); if (sm) body.appendChild(el('p', 'ev-sum', sm));
    body.appendChild(buttons(p, s, 'ev-actions'));
    c.appendChild(body);
    return c;
  }

  function row(p, now) {
    var s = status(p, now), tz = tzOf(p), d = new Date(p.starts);
    var r = el('article', 'ev-row reveal');
    var date = el('div', 'ev-date');
    date.appendChild(el('span', 'm', fmt(d, { month: 'short' }, tz)));
    date.appendChild(el('b', null, fmt(d, { day: 'numeric' }, tz)));
    date.appendChild(el('span', 'y', fmt(d, { year: 'numeric' }, tz)));
    r.appendChild(date);

    var info = el('div', 'ev-info');
    var top = el('div', 'ev-top');
    if (p.category && p.category.name) top.appendChild(el('span', 'ev-cat-sm', p.category.name));
    if (s) top.appendChild(el('span', 'ev-status ev-' + s.tone, s.text));
    info.appendChild(top);
    info.appendChild(el('h3', null, p.title));
    var ul = el('ul', 'ev-meta');
    ul.appendChild(meta('cal', dateRange(p)));
    var pl = place(p); if (pl) ul.appendChild(meta('pin', pl));
    if (p.price && p.price.label) ul.appendChild(meta('tag', p.price.label));
    info.appendChild(ul);
    r.appendChild(info);
    r.appendChild(buttons(p, s, 'ev-row-actions'));
    return r;
  }

  function reveal(scope) {
    var items = scope.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { items.forEach(function (x) { x.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: .08 });
    items.forEach(function (x) { io.observe(x); });
  }

  function render(data) {
    var now = new Date();
    var list = (data && (data.programmes || data.programs)) || [];
    list = list.filter(function (p) {
      if (!p || !p.title || !p.starts) return false;
      var end = new Date(p.ends || p.starts);
      return !isNaN(end) && end >= now;
    }).sort(function (a, b) { return new Date(a.starts) - new Date(b.starts); });

    root.innerHTML = '';
    root.setAttribute('aria-busy', 'false');

    if (!list.length) {
      root.appendChild(document.getElementById('ev-empty').content.cloneNode(true));
      return;
    }

    var head = el('div', 'head ev-head');
    var h = el('div');
    h.appendChild(el('span', 'eyebrow', 'Coming up next'));
    var h2 = el('h2'); h2.innerHTML = 'Upcoming <em>programs.</em>'; h.appendChild(h2);
    head.appendChild(h);
    head.appendChild(el('span', 'pill', list.length + (list.length === 1 ? ' program' : ' programs')));
    root.appendChild(head);

    var feat = el('div', 'ev-featured');
    list.slice(0, FEATURED).forEach(function (p) { feat.appendChild(card(p, now)); });
    root.appendChild(feat);

    var rest = list.slice(FEATURED);
    if (rest.length) {
      root.appendChild(el('h3', 'ev-more-title', 'More programs'));
      var lst = el('div', 'ev-list');
      rest.forEach(function (p) { lst.appendChild(row(p, now)); });
      root.appendChild(lst);
    }
    reveal(root);
  }

  function fallback() {
    root.innerHTML = '';
    root.setAttribute('aria-busy', 'false');
    root.appendChild(document.getElementById('ev-fallback').content.cloneNode(true));
    var s = document.createElement('script');
    s.src = 'https://icpfint.org-app.com/website/org-app-frame.v1.js';
    s.async = true;
    document.body.appendChild(s);
  }

  var ctrl = 'AbortController' in window ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
  fetch(FEED, { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) { clearTimeout(timer); render(d); })
    .catch(function () { clearTimeout(timer); fallback(); });
})();
