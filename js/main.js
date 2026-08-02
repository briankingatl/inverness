/* ============== UTIL ============== */
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

/* ============== DATA STORE ============== */
const data = {
  events: null,
  poi: null
};

/* Promises that resolve when each dataset has loaded. */
const dataReady = {
  events: fetch('data/events.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .catch(err => { console.warn('events.json fetch failed, using inline data', err); return inlineJSON('eventsData'); })
    .then(d => { data.events = d; }),
  poi: fetch('data/poi.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .catch(err => { console.warn('poi.json fetch failed, using inline data', err); return inlineJSON('poiData'); })
    .then(d => { data.poi = d; })
};

/* ============== PAGE ROUTER ============== */
const router = {
  current: null,
  pages: $$('.page'),

  go(page, push = true) {
    if (!page || page === this.current) return;
    this.pages.forEach(p => p.classList.toggle('is-active', p.dataset.page === page));
    $$('.nav__link').forEach(l => l.classList.toggle('is-active', l.dataset.nav === page));
    this.current = page;
    const titles = {
      home:      'Inverness | A peaceful life on the Chattahoochee, Roswell, Georgia',
      amenities: 'Amenities | Inverness HOA, Roswell, Georgia',
      events:    'Social | Inverness HOA, Roswell, Georgia',
      location:  'Location | Inverness HOA, Roswell, Georgia'
    };
    if (titles[page]) document.title = titles[page];
    window.scrollTo({ top: 0, behavior: 'instant' });

    requestAnimationFrame(() => {
      $$('[data-reveal]').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight) el.classList.add('is-in');
      });
      if (page === 'events') initScrapbook();
      if (page === 'location') {
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 200);
      }
    });

    if (push) history.pushState({ page }, '', `#${page}`);
  }
};

/* ============== NAV CLICKS ============== */
// Brand scrolls to top / goes home (no data-nav)
$('#navBrand').addEventListener('click', e => {
  e.preventDefault();
  router.go('home');
  $('#navLinks').classList.remove('is-open');
  $('#navToggle').classList.remove('is-open');
  $('#navToggle').setAttribute('aria-expanded', 'false');
});

// All data-nav clicks (nav links, hero buttons, footer links)
document.addEventListener('click', e => {
  const navEl = e.target.closest('[data-nav]');
  if (!navEl) return;
  e.preventDefault();
  e.stopPropagation();
  const target = navEl.dataset.nav;
  router.go(target);
  $('#navLinks').classList.remove('is-open');
  $('#navToggle').classList.remove('is-open');
  $('#navToggle').setAttribute('aria-expanded', 'false');
});

// Browser back/forward
window.addEventListener('popstate', e => {
  const page = (e.state && e.state.page) || (location.hash || '#home').slice(1) || 'home';
  router.go(page, false);
});

// Initial route
const initialHash = (location.hash || '#home').replace('#', '') || 'home';
router.go(initialHash, false);

/* ============== NAV SCROLL STATE + PROGRESS + BACK-TO-TOP ============== */
const nav = $('#nav');
const progressEl = $('#scrollProgress');
const toTop = $('#toTop');
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
      if (progressEl) {
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        progressEl.style.transform = `scaleX(${max > 0 ? Math.min(window.scrollY / max, 1) : 0})`;
      }
      if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 700);
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

if (toTop) {
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ============== MOBILE NAV ============== */
const navToggle = $('#navToggle');
const navLinks  = $('#navLinks');
navToggle.addEventListener('click', e => {
  e.stopPropagation();
  const open = navLinks.classList.toggle('is-open');
  navToggle.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});

/* ============== HERO ENTRANCE ============== */
window.addEventListener('load', () => {
  const hero = $('.hero');
  requestAnimationFrame(() => {
    hero.classList.add('is-loaded');
    const img = $('.hero__bg img');
    img.style.transition = 'opacity 1.8s cubic-bezier(.22,1,.36,1), filter 1.8s cubic-bezier(.22,1,.36,1), transform 1.8s cubic-bezier(.22,1,.36,1)';
    img.style.opacity = '1';
    img.style.filter = 'blur(0px)';
    img.style.transform = 'scale(1.04)';
    setTimeout(() => { img.style.transition = ''; }, 1900);
  });
  setTimeout(() => hero.classList.add('is-in'), 250);
});

// Set --i on hero lines
$$('.hero__title .inner').forEach((el, i) => el.style.setProperty('--i', i));

/* ============== SEASONAL THEME ============== */
const SEASONS = {
  spring: {
    label: 'Spring · dogwoods',
    note: 'Dogwoods are in bloom along Azalea Drive',
    icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M8 8C8 5.6 9.7 3.8 8 2 6.3 3.8 8 5.6 8 8Z"/><path d="M8 8C10.4 8 12.2 6.3 14 8 12.2 9.7 10.4 8 8 8Z"/><path d="M8 8C8 10.4 6.3 12.2 8 14 9.7 12.2 8 10.4 8 8Z"/><path d="M8 8C5.6 8 3.8 9.7 2 8 3.8 6.3 5.6 8 8 8Z"/><circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none"/></svg>'
  },
  summer: {
    label: 'Summer · pool season',
    note: 'The Stingrays are in the water — laps until ten',
    icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="2.7"/><path d="M8 1.2v1.9M8 12.9v1.9M1.2 8h1.9M12.9 8h1.9M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3"/></svg>'
  },
  fall: {
    label: 'Fall · festivals',
    note: 'Fall Festival and Halloween festivities ahead',
    icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" aria-hidden="true"><path d="M2.5 13.5C2.5 7.2 7.2 2.5 13.5 2.5c0 6.3-4.7 11-11 11Z"/><path d="M2.5 13.5C5.2 10.8 8.2 7.8 13.5 2.5"/></svg>'
  },
  winter: {
    label: 'Winter · holidays',
    note: 'Breakfast with Santa is around the corner',
    icon: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" aria-hidden="true"><path d="M8 1.2v13.6M1.2 8h13.6M3.2 3.2l9.6 9.6M12.8 3.2l-9.6 9.6"/><path d="M8 1.2 6.6 3M8 1.2l1.4 1.8M8 14.8 6.6 13M8 14.8l1.4-1.8M1.2 8l1.8-1.4M1.2 8 3 9.4M14.8 8l-1.8-1.4M14.8 8 13 9.4"/></svg>'
  }
};

function currentSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'fall';
  return 'winter';
}

(function initSeasonTheme() {
  const season = currentSeason();
  const s = SEASONS[season];
  document.documentElement.dataset.season = season;

  const pill = $('#navSeason');
  if (pill) {
    pill.innerHTML = `${s.icon}<span>${s.label}</span>`;
    pill.title = s.note;
  }
})();

/* ============== REVEAL OBSERVER ============== */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in');
      if (entry.target.querySelector('.count')) animateCounts(entry.target);
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

$$('[data-reveal]').forEach(el => revealObs.observe(el));

/* ============== ANIMATED COUNT-UP ============== */
function animateCounts(scope) {
  $$('.count', scope).forEach(el => {
    const target = parseFloat(el.dataset.countTo);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals);
    }
    requestAnimationFrame(tick);
  });
}

// Set --i on any line-mask groups inside reveals
$$('[data-reveal]').forEach(group => {
  $$('.line .inner', group).forEach((el, i) => el.style.setProperty('--i', i));
});

/* ============== SOCIAL / EVENTS ============== */
function renderEventsPage() {
  const intro = $('#eventsIntro');
  const scrapbook = $('#scrapbook');
  const seasonalRows = $('#seasonalRows');
  const roswellRows = $('#roswellRows');
  if (!intro || !scrapbook || !seasonalRows || !data.events) return;

  const e = data.events;

  intro.innerHTML = `
    <div class="eyebrow"><span>${e.intro.eyebrow}</span></div>
    <h2>${e.intro.title}</h2>
    <p>${e.intro.text}</p>
  `;

  scrapbook.innerHTML = e.scrapbook.map(item => `
    <div class="polaroid" style="top: ${item.top}; left: ${item.left};" data-rotation="${item.rotation}" data-title="${item.title}" data-date="${item.date}">
      <img loading="lazy" decoding="async" src="${item.image}" alt="${item.alt}">
      <div class="polaroid__caption">
        <span class="polaroid__title">${item.title}</span>
        <span class="polaroid__date">${item.date}</span>
      </div>
    </div>
  `).join('');

  seasonalRows.innerHTML = e.seasonal.map(item => `
    <div class="seasonal__row">
      <span class="seasonal__num">${item.num}</span>
      <span class="seasonal__event">${item.event}</span>
      <span class="seasonal__detail">${item.detail}</span>
      <span class="seasonal__date">${item.date}</span>
    </div>
  `).join('');

  if (roswellRows) {
    roswellRows.innerHTML = (e.roswell || []).map(item => `
      <div class="seasonal__row">
        <span class="seasonal__num">${item.num}</span>
        <span class="seasonal__event">${item.event}</span>
        <span class="seasonal__detail">${item.detail}</span>
        <span class="seasonal__date">${item.date}</span>
      </div>
    `).join('');
  }
}

function initScrapbook() {
  const polaroids = $$('.polaroid');
  polaroids.forEach((p, i) => {
    const r = parseFloat(p.dataset.rotation) || (Math.random() - 0.5) * 24;
    p.style.transform = `rotate(${r}deg)`;
    p.style.opacity = '0';
    p.style.transition = 'transform .65s cubic-bezier(.16,1,.3,1), box-shadow .65s cubic-bezier(.22,1,.36,1), z-index 0s, opacity .8s cubic-bezier(.22,1,.36,1)';
    setTimeout(() => { p.style.opacity = '1'; }, 80 * i + 200);

    p.addEventListener('click', () => {
      const item = data.events.scrapbook[i];
      const gallery = (item.images && item.images.length) ? item.images : [item.image];
      openLightbox(gallery, gallery.indexOf(item.image), item.title, item.date);
    });
  });
}

/* ============== LIGHTBOX ============== */
const lightbox = $('#lightbox');
let lightboxGallery = [];
let lightboxIndex = 0;
let lightboxTitle = '';
let lightboxDate = '';

function openLightbox(gallery, startIndex, title, date) {
  if (!lightbox) return;
  lightboxGallery = gallery;
  lightboxIndex = startIndex > -1 ? startIndex : 0;
  lightboxTitle = title || '';
  lightboxDate = date || '';
  renderLightboxImage();
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function renderLightboxImage() {
  const multi = lightboxGallery.length > 1;
  $('#lightboxImg').src = lightboxGallery[lightboxIndex];
  $('#lightboxTitle').textContent = lightboxTitle;
  $('#lightboxDate').textContent = lightboxDate;
  $('#lightboxCounter').textContent = multi ? `${lightboxIndex + 1} / ${lightboxGallery.length}` : '';
  $('#lightboxPrev').hidden = !multi;
  $('#lightboxNext').hidden = !multi;
}
function stepLightbox(delta) {
  if (lightboxGallery.length < 2) return;
  lightboxIndex = (lightboxIndex + delta + lightboxGallery.length) % lightboxGallery.length;
  renderLightboxImage();
}
function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('is-open');
  document.body.style.overflow = '';
}
if (lightbox) {
  $('#lightboxClose').addEventListener('click', closeLightbox);
  $('#lightboxPrev').addEventListener('click', e => { e.stopPropagation(); stepLightbox(-1); });
  $('#lightboxNext').addEventListener('click', e => { e.stopPropagation(); stepLightbox(1); });
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  window.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });

  /* Swipe navigation on touch */
  const lightboxFig = $('.lightbox__figure');
  let swipeX = null;
  lightboxFig.addEventListener('touchstart', e => {
    swipeX = e.touches[0].clientX;
    lightboxFig.style.transition = 'none';
  }, { passive: true });
  lightboxFig.addEventListener('touchmove', e => {
    if (swipeX === null) return;
    const dx = e.touches[0].clientX - swipeX;
    lightboxFig.style.transform = `translateX(${(dx * 0.35).toFixed(1)}px)`;
  }, { passive: true });
  lightboxFig.addEventListener('touchend', e => {
    lightboxFig.style.transition = '';
    lightboxFig.style.transform = '';
    if (swipeX !== null) {
      const dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) > 40) stepLightbox(dx < 0 ? 1 : -1);
    }
    swipeX = null;
  }, { passive: true });
}

/* Render the events page as soon as its data is available, then
   initialize the scrapbook if the events page is currently shown. */
dataReady.events.then(() => {
  renderEventsPage();
  if (router.current === 'events') initScrapbook();
});

/* ============== LOCATION — LEGEND & POI CARDS ============== */
const POI_CATEGORIES = [
  ['outdoors', 'Outdoors'],
  ['culture', 'Culture'],
  ['essentials', 'Essentials'],
  ['community', 'Community']
];
let poiCat = 'all';

function renderPoiFilters() {
  const legend = $('#mapLegend');
  if (!legend || !data.poi || legend.querySelector('.map-legend__filters')) return;

  const cats = POI_CATEGORIES.filter(([key]) => data.poi.some(p => p.cat === key));
  const chips = document.createElement('div');
  chips.className = 'map-legend__filters';
  chips.innerHTML = `<button class="map-legend__filter is-active" data-cat="all" type="button">All</button>` +
    cats.map(([key, label]) =>
      `<button class="map-legend__filter" data-cat="${key}" type="button">${label}</button>`
    ).join('');

  const title = legend.querySelector('.map-legend__title');
  legend.insertBefore(chips, title.nextSibling);

  chips.addEventListener('click', e => {
    const btn = e.target.closest('.map-legend__filter');
    if (!btn) return;
    poiCat = btn.dataset.cat;
    $$('.map-legend__filter').forEach(b => b.classList.toggle('is-active', b === btn));
    applyPoiFilter();
  });
}

function applyPoiFilter() {
  if (!data.poi) return;
  const show = poi => poiCat === 'all' || poi.cat === poiCat;
  $$('.legend-item').forEach((l, i) => { l.style.display = show(data.poi[i]) ? '' : 'none'; });
  $$('.poi-card').forEach((c, i) => { c.style.display = show(data.poi[i]) ? '' : 'none'; });
  if (map) {
    markers.forEach((m, i) => {
      if (show(data.poi[i])) {
        if (!map.hasLayer(m)) m.addTo(map);
      } else if (map.hasLayer(m)) {
        map.removeLayer(m);
      }
    });
  }
}

function renderPoiContent() {
  const legend = $('#mapLegend');
  const poiDetails = $('#poiDetails');
  if (!data.poi) return;

  // Keep the legend title; render the legend items after it.
  const legendTitle = legend.querySelector('.map-legend__title');
  legend.innerHTML = '';
  legend.appendChild(legendTitle);
  legend.insertAdjacentHTML('beforeend', data.poi.map((poi, i) => `
    <div class="legend-item${i === 0 ? ' is-active' : ''}" data-poi="${i}">
      <div class="legend-item__head">
        <span class="legend-item__num">${poi.num}</span>
        <span class="legend-item__name">${poi.name}</span>
        <span class="legend-item__dist">${poi.dist}</span>
      </div>
      <p class="legend-item__desc">${poi.desc}</p>
    </div>
  `).join(''));

  // POI detail cards
  poiDetails.innerHTML = data.poi.map(poi => `
    <div class="poi-card">
      <span class="poi-card__num">${poi.num}</span>
      <span class="poi-card__name">${poi.name}</span>
      <p class="poi-card__desc">${poi.cardDesc}</p>
      <span class="poi-card__meta">${poi.cardMeta}</span>
    </div>
  `).join('');

  // Category filter chips
  renderPoiFilters();

  // Wire up legend interactions now that the items exist.
  $$('.legend-item').forEach((l, i) => {
    l.addEventListener('mouseenter', () => highlightPoi(i));
    l.addEventListener('click', () => highlightPoi(i));
  });
}

/* ============== LEAFLET MAP ============== */
let map = null;
let markers = [];

async function initMap() {
  if (map) return; // Already initialized
  await dataReady.poi;
  if (map) return; // Re-check after awaiting data
  const poiData = data.poi;
  if (!poiData) return;

  map = L.map('leafletMap', {
    scrollWheelZoom: false,
    zoomControl: true,
    attributionControl: true
  }).setView([34.0150, -84.3750], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  poiData.forEach((poi, i) => {
    const primaryClass = poi.primary ? ' inverness-marker--primary' : '';
    const iconSize = poi.primary ? 28 : 18;
    const iconAnchor = iconSize / 2;
    const icon = L.divIcon({
      className: '',
      html: `<div class="inverness-marker${primaryClass}" data-poi="${i}"><span class="inverness-marker__num">${i + 1}</span></div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconAnchor, iconAnchor],
      popupAnchor: [-iconSize / 2, -iconSize / 2 - 4]
    });

    const marker = L.marker([poi.lat, poi.lng], { icon: icon }).addTo(map);
    marker.bindPopup(`
      <strong>${poi.name}</strong>
      <em>No. ${poi.num}</em>
      <span>${poi.desc}</span>
      <span>${poi.detail}</span>
    `);

    marker.on('click', () => {
      highlightPoi(i);
    });

    markers.push(marker);
  });

  // Enable scroll-wheel zoom when hovering over the map, disable when leaving
  const mapElement = document.getElementById('leafletMap');
  mapElement.addEventListener('mouseenter', () => {
    map.scrollWheelZoom.enable();
  });
  mapElement.addEventListener('mouseleave', () => {
    map.scrollWheelZoom.disable();
  });
}

function highlightPoi(idx) {
  const poiData = data.poi;
  if (!poiData || !poiData[idx]) return;

  const legendItems = $$('.legend-item');
  legendItems.forEach((l, i) => l.classList.toggle('is-active', i === idx));

  // Highlight marker
  const markerEls = document.querySelectorAll('.inverness-marker');
  markerEls.forEach((m, i) => m.classList.toggle('is-active', i === idx));

  // Fly to marker and open popup
  if (map && markers[idx]) {
    map.flyTo([poiData[idx].lat, poiData[idx].lng], 15, {
      duration: 0.8,
      easeLinearity: 0.25
    });
    setTimeout(() => {
      markers[idx].openPopup();
    }, 400);
  }
}

// Initialize map when location page is first visited
const mapCanvas = $('#mapCanvas');
const mapObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      if (!map) {
        initMap();
      } else {
        // Ensure map renders correctly if it was hidden
        setTimeout(() => map.invalidateSize(), 100);
      }
      mapObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

mapObs.observe(mapCanvas);

/* Render legend + POI cards once the POI data is available. */
dataReady.poi.then(renderPoiContent);

/* ============== RIVER WATCH (live USGS gauge) ============== */
async function initRiverWatch() {
  const widget = $('#riverWatch');
  const updated = $('#riverWatchUpdated');
  const dot = $('#riverWatchDot');
  if (!widget) return;

  const USGS_SITE = '02335450'; // Chattahoochee River above Roswell, GA
  const url = `https://waterservices.usgs.gov/nwis/iv/?sites=${USGS_SITE}&parameterCd=00060,00065,00010&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const json = await res.json();
    const series = json.value.timeSeries;
    if (!series || !series.length) throw new Error('no data');

    const readings = {};
    series.forEach(ts => {
      const code = ts.variable.variableCode[0].value;
      const val = ts.values[0].value[0];
      if (!val) return;
      readings[code] = { value: parseFloat(val.value), dateTime: val.dateTime };
    });

    const flowEl = widget.querySelector('[data-field="flow"]');
    const heightEl = widget.querySelector('[data-field="height"]');
    const tempEl = widget.querySelector('[data-field="temp"]');

    if (readings['00060'] && flowEl) flowEl.textContent = Math.round(readings['00060'].value).toLocaleString();
    if (readings['00065'] && heightEl) heightEl.textContent = readings['00065'].value.toFixed(2);
    if (readings['00010'] && tempEl) tempEl.textContent = Math.round(readings['00010'].value * 9 / 5 + 32);

    const latest = Object.values(readings).map(r => new Date(r.dateTime)).sort((a, b) => b - a)[0];
    if (latest) {
      updated.textContent = `Updated ${latest.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      dot.classList.add('is-live');
    }
  } catch (err) {
    console.warn('River Watch: USGS fetch failed', err);
    updated.textContent = 'Live gauge unavailable — try again shortly';
  }
}

const riverWatchEl = $('#riverWatch');
if (riverWatchEl) {
  const riverObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        initRiverWatch();
        riverObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  riverObs.observe(riverWatchEl);
}

/* ============== PAUSE KEN BURNS OFF-SCREEN ============== */
const kenObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
  });
});
$$('.hero__bg img, .overview__image-wrap img').forEach(img => kenObs.observe(img));
