/**
 * Inverness Admin Panel - Client-side JavaScript
 * Handles authentication, CRUD for events/poi, and image management.
 */

(function () {
  'use strict';

  // ── State ──
  let eventsData = null;
  let poiData = null;
  let imagesList = [];
  let originalEvents = null;
  let originalPoi = null;

  // ── API helper ──
  async function api(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      ...options
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // ── AUTH ──
  const loginScreen = document.getElementById('loginScreen');
  const adminDashboard = document.getElementById('adminDashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  async function checkSession() {
    const { data } = await api('/api/auth/session');
    if (data.authenticated) {
      showDashboard();
    }
  }

  function showDashboard() {
    loginScreen.style.display = 'none';
    adminDashboard.style.display = 'flex';
    loadEvents();
    loadPoi();
  }

  function showLogin(msg) {
    loginScreen.style.display = 'flex';
    adminDashboard.style.display = 'none';
    if (msg) loginError.textContent = msg;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (result.ok) {
      showDashboard();
    } else {
      loginError.textContent = 'Invalid credentials';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    showLogin();
    loginForm.reset();
  });

  // ── TABS ──
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('is-active'));
      tab.classList.add('is-active');
      const target = tab.dataset.tab;
      document.getElementById('tab' + capitalize(target)).classList.add('is-active');
      if (target === 'images') loadImages();
    });
  });

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function showSaveStatus(msg) {
    const el = document.getElementById('saveStatus');
    el.textContent = msg;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 2500);
  }

  // ── EVENTS ──
  async function loadEvents() {
    const result = await api('/api/events');
    if (!result.ok) return;
    eventsData = result.data;
    originalEvents = JSON.stringify(eventsData);
    renderEvents();
  }

  function renderEvents() {
    const d = eventsData;
    document.getElementById('eventsEyebrow').value = d.intro?.eyebrow || '';
    document.getElementById('eventsTitle').value = d.intro?.title || '';
    document.getElementById('eventsText').value = d.intro?.text || '';
    renderScrapbookList();
    renderSeasonalList();
  }

  function readEventsForm() {
    eventsData.intro = {
      eyebrow: document.getElementById('eventsEyebrow').value,
      title: document.getElementById('eventsTitle').value,
      text: document.getElementById('eventsText').value
    };
  }

  // Scrapbook
  function renderScrapbookList() {
    const container = document.getElementById('scrapbookList');
    const items = eventsData.scrapbook || [];
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">No photos yet. Click "+ Add Photo" to create one.</div>';
      return;
    }
    container.innerHTML = items.map((item, i) => `
      <div class="item-entry" data-index="${i}">
        <div class="item-entry-header" onclick="window._toggleEntry(this)">
          <span class="item-entry-title">
            <span class="item-entry-index">${i + 1}.</span>
            ${item.title || 'Untitled Photo'}
          </span>
          <span class="item-entry-chevron">▼</span>
        </div>
        <div class="item-entry-fields">
          <div class="form-group">
            <label>Title</label>
            <input type="text" data-field="title" value="${esc(item.title || '')}">
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="text" data-field="date" value="${esc(item.date || '')}" placeholder="e.g. Summer 2025">
          </div>
          <div class="form-group">
            <label>Image URL (cover photo)</label>
            <div class="image-picker-row">
              <input type="text" data-field="image" value="${esc(item.image || '')}" placeholder="images/photo.jpg">
              <button class="image-picker-btn" onclick="window._openImagePicker(event, this)">Browse</button>
            </div>
          </div>
          <div class="form-group">
            <label>Gallery Images (one per line, optional)</label>
            <textarea data-field="images" rows="4" placeholder="images/photo1.jpg&#10;images/photo2.jpg">${esc((item.images || []).join('\n'))}</textarea>
            <p class="field-hint">If set, clicking this photo opens a lightbox visitors can page through. Leave blank to show just the cover photo.</p>
          </div>
          <div class="form-group">
            <label>Alt Text</label>
            <input type="text" data-field="alt" value="${esc(item.alt || '')}" placeholder="Image description">
          </div>
          <div class="form-row-3">
            <div class="form-group">
              <label>Top (%)</label>
              <input type="text" data-field="top" value="${esc(String(item.top ?? ''))}" placeholder="4%">
            </div>
            <div class="form-group">
              <label>Left (%)</label>
              <input type="text" data-field="left" value="${esc(String(item.left ?? ''))}" placeholder="6%">
            </div>
            <div class="form-group">
              <label>Rotation (deg)</label>
              <input type="text" data-field="rotation" value="${esc(String(item.rotation ?? ''))}" placeholder="-9">
            </div>
          </div>
          <div class="item-entry-actions">
            <button class="btn btn--danger" onclick="window._deleteScrapbook(${i})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window._deleteScrapbook = function (i) {
    eventsData.scrapbook.splice(i, 1);
    renderScrapbookList();
  };

  document.getElementById('addScrapbookBtn').addEventListener('click', () => {
    if (!eventsData.scrapbook) eventsData.scrapbook = [];
    eventsData.scrapbook.push({ title: '', date: '', image: '', images: [], alt: '', top: '10%', left: '10%', rotation: '-3' });
    renderScrapbookList();
  });

  // Seasonal events
  function renderSeasonalList() {
    const container = document.getElementById('seasonalList');
    const items = eventsData.seasonal || [];
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">No seasonal events yet. Click "+ Add Event" to create one.</div>';
      return;
    }
    container.innerHTML = items.map((item, i) => `
      <div class="item-entry" data-index="${i}">
        <div class="item-entry-header" onclick="window._toggleEntry(this)">
          <span class="item-entry-title">
            <span class="item-entry-index">${item.num || String(i + 1) + '.'}</span>
            ${item.event || 'Untitled Event'}
          </span>
          <span class="item-entry-chevron">▼</span>
        </div>
        <div class="item-entry-fields">
          <div class="form-row">
            <div class="form-group">
              <label>Number (roman)</label>
              <input type="text" data-field="num" value="${esc(item.num || '')}" placeholder="e.g. i., ii., iii.">
            </div>
            <div class="form-group">
              <label>Event Name</label>
              <input type="text" data-field="event" value="${esc(item.event || '')}">
            </div>
          </div>
          <div class="form-group">
            <label>Detail / Description</label>
            <textarea data-field="detail" rows="3">${esc(item.detail || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Date</label>
            <input type="text" data-field="date" value="${esc(item.date || '')}" placeholder="e.g. December 2025">
          </div>
          <div class="item-entry-actions">
            <button class="btn btn--danger" onclick="window._deleteSeasonal(${i})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window._deleteSeasonal = function (i) {
    eventsData.seasonal.splice(i, 1);
    renderSeasonalList();
  };

  document.getElementById('addSeasonalBtn').addEventListener('click', () => {
    if (!eventsData.seasonal) eventsData.seasonal = [];
    eventsData.seasonal.push({ num: '', event: '', detail: '', date: '' });
    renderSeasonalList();
  });

  // Save Events
  document.getElementById('saveEventsBtn').addEventListener('click', async () => {
    readEventsForm();
    // Read scrapbook fields
    for (const [i, item] of (eventsData.scrapbook || []).entries()) {
      const entry = document.querySelector(`#scrapbookList .item-entry[data-index="${i}"]`);
      if (!entry) continue;
      const fields = entry.querySelectorAll('[data-field]');
      fields.forEach(f => {
        const field = f.dataset.field;
        if (field === 'images') {
          item.images = f.value.split('\n').map(s => s.trim()).filter(Boolean);
        } else {
          item[field] = f.value;
        }
      });
    }
    // Read seasonal fields
    for (const [i, item] of (eventsData.seasonal || []).entries()) {
      const entry = document.querySelector(`#seasonalList .item-entry[data-index="${i}"]`);
      if (!entry) continue;
      const fields = entry.querySelectorAll('[data-field]');
      fields.forEach(f => { item[f.dataset.field] = f.value; });
    }

    const result = await api('/api/events', {
      method: 'PUT',
      body: JSON.stringify(eventsData)
    });
    if (result.ok) {
      originalEvents = JSON.stringify(eventsData);
      showSaveStatus('Events saved ✓');
    } else {
      showSaveStatus('Save failed');
    }
  });

  document.getElementById('resetEventsBtn').addEventListener('click', () => {
    if (originalEvents) {
      eventsData = JSON.parse(originalEvents);
      renderEvents();
      showSaveStatus('Reset to last saved');
    }
  });

  // ── POI ──
  async function loadPoi() {
    const result = await api('/api/poi');
    if (!result.ok) return;
    poiData = result.data;
    originalPoi = JSON.stringify(poiData);
    renderPoiList();
  }

  function renderPoiList() {
    const container = document.getElementById('poiList');
    const items = poiData || [];
    if (items.length === 0) {
      container.innerHTML = '<div class="empty-state">No points of interest yet.</div>';
      return;
    }
    container.innerHTML = items.map((item, i) => `
      <div class="item-entry" data-index="${i}">
        <div class="item-entry-header" onclick="window._toggleEntry(this)">
          <span class="item-entry-title">
            <span class="item-entry-index">${item.num || String(i + 1).padStart(2, '0')}.</span>
            ${item.name || 'Untitled POI'}
          </span>
          <span class="item-entry-chevron">▼</span>
        </div>
        <div class="item-entry-fields">
          <div class="form-group">
            <label>Name</label>
            <input type="text" data-field="name" value="${esc(item.name || '')}">
          </div>
          <div class="form-group">
            <label>Number</label>
            <input type="text" data-field="num" value="${esc(item.num || '')}" placeholder="e.g. 01, 02">
          </div>
          <div class="form-group">
            <label>Short Description</label>
            <textarea data-field="desc" rows="2">${esc(item.desc || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Detail (for popup)</label>
            <textarea data-field="detail" rows="2">${esc(item.detail || '')}</textarea>
          </div>
          <div class="form-row-3">
            <div class="form-group">
              <label>Distance</label>
              <input type="text" data-field="dist" value="${esc(item.dist || '')}" placeholder="0.4 mi">
            </div>
            <div class="form-group">
              <label>Card Description</label>
              <input type="text" data-field="cardDesc" value="${esc(item.cardDesc || '')}">
            </div>
            <div class="form-group">
              <label>Card Meta</label>
              <input type="text" data-field="cardMeta" value="${esc(item.cardMeta || '')}" placeholder="0.4 mi · 8 min walk">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Latitude</label>
              <input type="number" data-field="lat" value="${item.lat ?? ''}" step="any">
            </div>
            <div class="form-group">
              <label>Longitude</label>
              <input type="number" data-field="lng" value="${item.lng ?? ''}" step="any">
            </div>
          </div>
          <div class="form-group">
            <label>Primary (main marker)</label>
            <select data-field="primary">
              <option value="false" ${!item.primary ? 'selected' : ''}>No</option>
              <option value="true" ${item.primary ? 'selected' : ''}>Yes</option>
            </select>
          </div>
          <div class="item-entry-actions">
            <button class="btn btn--danger" onclick="window._deletePoi(${i})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window._deletePoi = function (i) {
    poiData.splice(i, 1);
    renderPoiList();
  };

  document.getElementById('addPoiBtn').addEventListener('click', () => {
    poiData.push({
      name: '', num: '', desc: '', detail: '', lat: '', lng: '',
      dist: '', cardDesc: '', cardMeta: '', primary: false
    });
    renderPoiList();
  });
  // Save POI
  document.getElementById('savePoiBtn').addEventListener('click', async () => {
    for (const [i, item] of poiData.entries()) {
      const entry = document.querySelector(`#poiList .item-entry[data-index="${i}"]`);
      if (!entry) continue;
      const fields = entry.querySelectorAll('[data-field]');
      fields.forEach(f => {
        const field = f.dataset.field;
        if (field === 'lat' || field === 'lng') {
          item[field] = f.value === '' ? undefined : Number(f.value);
        } else if (field === 'primary') {
          item[field] = f.value === 'true';
        } else {
          item[field] = f.value;
        }
      });
    }

    const result = await api('/api/poi', {
      method: 'PUT',
      body: JSON.stringify(poiData)
    });
    if (result.ok) {
      originalPoi = JSON.stringify(poiData);
      showSaveStatus('POI saved ✓');
    } else {
      showSaveStatus('Save failed');
    }
  });

  document.getElementById('resetPoiBtn').addEventListener('click', () => {
    if (originalPoi) {
      poiData = JSON.parse(originalPoi);
      renderPoiList();
      showSaveStatus('Reset to last saved');
    }
  });

  // ── IMAGES ──
  async function loadImages() {
    const result = await api('/api/images');
    if (!result.ok) return;
    imagesList = result.data;
    renderImagesGrid();
  }

  function renderImagesGrid() {
    const container = document.getElementById('imagesList');
    const countEl = document.getElementById('imageCount');
    countEl.textContent = `${imagesList.length} image${imagesList.length !== 1 ? 's' : ''}`;

    if (imagesList.length === 0) {
      container.innerHTML = '<div class="empty-state">No images uploaded yet.</div>';
      return;
    }

    container.innerHTML = imagesList.map(url => {
      const name = url.split('/').pop();
      return `
        <div class="image-card">
          <div class="image-card-preview">
            <img src="${url}" alt="${esc(name)}" loading="lazy">
          </div>
          <div class="image-card-info">
            <span class="image-card-path" title="Click to copy" onclick="window._copyText('${url}')">${esc(url)}</span>
            <div class="image-card-actions">
              <button class="btn btn--danger" onclick="window._deleteImage('${name}', '${url}')">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  window._deleteImage = async function (name, url) {
    if (!confirm(`Delete ${name}?`)) return;
    await api(`/api/images/${encodeURIComponent(name)}`, { method: 'DELETE' });
    loadImages();
  };

  // Upload handling
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const uploadBarFill = document.getElementById('uploadBarFill');
  const uploadLabel = document.getElementById('uploadLabel');
  const uploadResults = document.getElementById('uploadResults');

  uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

  async function handleFiles(files) {
    if (!files.length) return;
    uploadResults.innerHTML = '';
    const total = files.length;

    for (let i = 0; i < total; i++) {
      const file = files[i];
      const pct = Math.round(((i + 1) / total) * 100);
      uploadProgress.style.display = 'block';
      uploadBarFill.style.width = pct + '%';
      uploadLabel.textContent = `Uploading ${i + 1} of ${total}...`;

      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });
      const data = await res.json().catch(() => ({}));

      if (data.ok) {
        const item = document.createElement('div');
        item.className = 'upload-result-item';
        item.innerHTML = `✓ <code title="Click to copy" onclick="window._copyText('${data.url}')">${esc(data.url)}</code>`;
        uploadResults.appendChild(item);
        imagesList.push(data.url);
      } else {
        const item = document.createElement('div');
        item.className = 'upload-result-item';
        item.style.background = 'rgba(160,82,45,0.08)';
        item.textContent = `✗ ${file.name}: ${data.error || 'Upload failed'}`;
        uploadResults.appendChild(item);
      }
    }

    setTimeout(() => {
      uploadProgress.style.display = 'none';
      uploadBarFill.style.width = '0%';
    }, 2000);

    renderImagesGrid();
  }

  // ── Image Picker ──
  window._openImagePicker = async function (e, btn) {
    e.stopPropagation();

    // Close any open pickers
    document.querySelectorAll('.image-picker-panel.is-open').forEach(p => p.remove());

    // Fetch latest images
    const result = await api('/api/images');
    if (!result.ok || !result.data.length) {
      alert('No images uploaded yet. Go to the Images tab to upload some.');
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'image-picker-panel is-open';
    const rect = btn.getBoundingClientRect();
    panel.style.top = rect.bottom + 4 + 'px';
    panel.style.left = Math.min(rect.left, window.innerWidth - 440) + 'px';

    const grid = document.createElement('div');
    grid.className = 'image-picker-grid';
    result.data.forEach(url => {
      const thumb = document.createElement('div');
      thumb.className = 'image-picker-thumb';
      thumb.innerHTML = `<img src="${url}" alt="">`;
      thumb.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        if (input) input.value = url;
        panel.remove();
      });
      grid.appendChild(thumb);
    });
    panel.appendChild(grid);
    document.body.appendChild(panel);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler() {
        panel.remove();
        document.removeEventListener('click', handler);
      });
    }, 10);
  };

  // ── Utils ──
  window._toggleEntry = function (header) {
    header.closest('.item-entry').classList.toggle('is-open');
  };

  window._copyText = function (text) {
    navigator.clipboard.writeText(text).then(() => {
      showSaveStatus('Copied to clipboard ✓');
    });
  };

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ── Init ──
  checkSession();
})();