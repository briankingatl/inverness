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

/* ============== NAV SCROLL STATE ============== */
const nav = $('#nav');
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    });
    ticking = true;
  }
});

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
}

/* Render the events page as soon as its data is available, then
   initialize the scrapbook if the events page is currently shown. */
dataReady.events.then(() => {
  renderEventsPage();
  if (router.current === 'events') initScrapbook();
});

/* ============== LOCATION — LEGEND & POI CARDS ============== */
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
