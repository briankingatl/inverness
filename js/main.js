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
    .then(r => r.json())
    .then(d => { data.events = d; })
    .catch(err => console.error('Failed to load events.json', err)),
  poi: fetch('data/poi.json')
    .then(r => r.json())
    .then(d => { data.poi = d; })
    .catch(err => console.error('Failed to load poi.json', err))
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
  navLinks.classList.toggle('is-open');
  navToggle.classList.toggle('is-open');
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
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

$$('[data-reveal]').forEach(el => revealObs.observe(el));

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
    <div class="polaroid" style="top: ${item.top}; left: ${item.left};" data-rotation="${item.rotation}">
      <img src="${item.image}" alt="${item.alt}">
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

  // Disable scroll-wheel zoom by default (better for page flow)
  // Enable on click, disable on mouseout
  map.on('click', () => {
    map.scrollWheelZoom.enable();
  });
  map.on('mouseout', () => {
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

/* ============== PAUSE KEN BURNS OFF-SCREEN ============== */
const kenObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    e.target.style.animationPlayState = e.isIntersecting ? 'running' : 'paused';
  });
});
$$('.hero__bg img, .overview__image-wrap img').forEach(img => kenObs.observe(img));
