/* global Chart */
(function () {
  const urlInput = document.getElementById('urlInput');
  const acceptHeaderInput = document.getElementById('acceptHeader');
  const limitInput = document.getElementById('limitInput');
  const loadBtn = document.getElementById('loadBtn');
  const useRecommendedBtn = document.getElementById('useRecommended');
  const statusEl = document.getElementById('status');
  const pageInfoEl = document.getElementById('pageInfo');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');

  // New UI elements
  const breedFilterInput = document.getElementById('breedFilter');
  const countryFilterInput = document.getElementById('countryFilter');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  // New search and advanced filter elements
  const globalSearchInput = document.getElementById('globalSearch');
  const activeFiltersEl = document.getElementById('activeFilters');
  const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
  const advPanel = document.getElementById('advPanel');
  const advBreed = document.getElementById('advBreed');
  const advCountry = document.getElementById('advCountry');
  const advOrigin = document.getElementById('advOrigin');
  const advCoat = document.getElementById('advCoat');
  const advPattern = document.getElementById('advPattern');
  const advLogic = document.getElementById('advLogic');

  // Random Fact elements
  const randomFactText = document.getElementById('randomFactText');
  const refreshFactBtn = document.getElementById('refreshFactBtn');
  const factMaxLenInput = document.getElementById('factMaxLen');

  const table = document.getElementById('breedsTable');
  const tbody = table.querySelector('tbody');

  const chartCanvas = document.getElementById('countryChart');
  let countryChart = null;

  // Data state
  let rawData = [];
  let filteredData = [];
  let sortState = { key: null, asc: true };

  // Helpers
  function setStatus(msg) {
    statusEl.textContent = msg || '';
  }

  // Fuzzy matching helpers
  function levenshtein(a, b) {
    a = String(a || '');
    b = String(b || '');
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = new Array(n + 1);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = i - 1;
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = dp[j];
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,        // deletion
          dp[j - 1] + 1,    // insertion
          prev + cost       // substitution
        );
        prev = tmp;
      }
    }
    return dp[n];
  }

  function fuzzyIncludes(haystack, needle) {
    const h = String(haystack || '').toLowerCase();
    const n = String(needle || '').toLowerCase().trim();
    if (!n) return true;
    if (h.includes(n)) return true;
    // simple threshold: allow ~33% edits, minimum 1 if len>=4
    const thresh = n.length <= 3 ? 0 : Math.max(1, Math.floor(n.length / 3));
    const dist = levenshtein(h, n);
    return dist <= thresh;
  }

  function getUrlWithLimit(baseUrl, limit) {
    try {
      const u = new URL(baseUrl);
      if (limit != null && !Number.isNaN(Number(limit))) {
        u.searchParams.set('limit', String(limit));
      }
      return u.toString();
    } catch (e) {
      return baseUrl; // leave as is if not a valid URL
    }
  }

  function syncLimitFromUrl() {
    try {
      const u = new URL(urlInput.value);
      const limit = u.searchParams.get('limit');
      if (limit) {
        limitInput.value = limit;
      }
    } catch (e) {
      /* ignore invalid URL */
    }
  }

  function parseHeaders() {
    const headers = {};
    const accept = (acceptHeaderInput.value || '').trim();
    if (accept) headers['Accept'] = accept;
    return headers;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Rendering
  function renderTable(data) {
    tbody.innerHTML = '';
    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td data-col="breed">${escapeHtml(item.breed)}</td>
        <td data-col="country">${escapeHtml(item.country)}</td>
        <td data-col="origin">${escapeHtml(item.origin)}</td>
        <td data-col="coat">${escapeHtml(item.coat)}</td>
        <td data-col="pattern">${escapeHtml(item.pattern)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Client-side pagination for breeds table
  const tablePageSizeEl = document.getElementById('tablePageSize');
  const tablePrevBtn = document.getElementById('tablePrevBtn');
  const tableNextBtn = document.getElementById('tableNextBtn');
  const tablePageInfoEl = document.getElementById('tablePageInfo');
  let tablePage = 1;
  function getTablePageSize() {
    return Number(tablePageSizeEl?.value || 50);
  }
  function renderTableWithPagination() {
    const total = filteredData.length;
    const size = getTablePageSize();
    const pages = Math.max(1, Math.ceil(total / Math.max(1, size)));
    if (tablePage > pages) tablePage = pages;
    if (tablePage < 1) tablePage = 1;
    const start = (tablePage - 1) * size;
    const slice = filteredData.slice(start, start + size);
    renderTable(slice);
    if (tablePageInfoEl) tablePageInfoEl.textContent = `Page ${tablePage} of ${pages} • Total: ${total}`;
    if (tablePrevBtn) tablePrevBtn.disabled = tablePage <= 1;
    if (tableNextBtn) tableNextBtn.disabled = tablePage >= pages;
  }

  function renderChart(data) {
    const counts = {};
    data.forEach(item => {
      const key = (item.country || 'Unknown').trim() || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    const labels = Object.keys(counts).sort();
    const values = labels.map(k => counts[k]);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Breeds by Country',
          data: values,
          backgroundColor: 'rgba(92, 200, 255, 0.35)',
          borderColor: 'rgba(92, 200, 255, 1)',
          borderWidth: 1,
        },
      ],
    };

    if (countryChart) {
      countryChart.data = chartData;
      countryChart.update();
    } else {
      countryChart = new Chart(chartCanvas, {
        type: 'bar',
        data: chartData,
        options: {
          responsive: true,
          scales: {
            x: {
              ticks: { color: '#a5b3c0' },
              grid: { color: 'rgba(255,255,255,0.06)' },
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#a5b3c0' },
              grid: { color: 'rgba(255,255,255,0.06)' },
            },
          },
          plugins: {
            legend: { labels: { color: '#e6edf3' } },
          },
        },
      });
    }
  }

  function sortByKey(key, asc = true) {
    sortState.key = key;
    sortState.asc = asc;
    const dir = asc ? 1 : -1;
    filteredData.sort((a, b) => {
      const va = String(a[key] ?? '').toLowerCase();
      const vb = String(b[key] ?? '').toLowerCase();
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    renderTable(filteredData);
  }


  function applyFiltersAndRender() {
    const breedTerm = (breedFilterInput.value || '').toLowerCase().trim();
    const countryTerm = (countryFilterInput.value || '').toLowerCase().trim();
    const globalTerm = (globalSearchInput?.value || '').toLowerCase().trim();

    const adv = {
      breed: (advBreed?.value || '').toLowerCase().trim(),
      country: (advCountry?.value || '').toLowerCase().trim(),
      origin: (advOrigin?.value || '').toLowerCase().trim(),
      coat: (advCoat?.value || '').toLowerCase().trim(),
      pattern: (advPattern?.value || '').toLowerCase().trim(),
    };
    const advKeys = Object.keys(adv).filter(k => adv[k]);
    const logic = (advLogic?.value || 'AND').toUpperCase();

    filteredData = rawData.filter(item => {
      const breedOk = !breedTerm || fuzzyIncludes(item.breed, breedTerm);
      const countryOk = !countryTerm || fuzzyIncludes(item.country, countryTerm);

      const fields = [item.breed, item.country, item.origin, item.coat, item.pattern];
      const globalOk = !globalTerm || fields.some(v => fuzzyIncludes(v, globalTerm));

      let advOk = true;
      if (advKeys.length) {
        const checks = advKeys.map(k => fuzzyIncludes(item[k], adv[k]));
        advOk = logic === 'AND' ? checks.every(Boolean) : checks.some(Boolean);
      }

      return breedOk && countryOk && globalOk && advOk;
    });

    if (sortState.key) {
      sortByKey(sortState.key, sortState.asc);
    }
    renderTableWithPagination();
    renderChart(filteredData);

    renderActiveFilters();
    setStatus(`Showing ${filteredData.length} of ${rawData.length} item(s).`);
    saveSettings();
  }

  function exportCsv(rows) {
    const headers = ['breed', 'country', 'origin', 'coat', 'pattern'];
    const escapeCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => escapeCsv(r[h])).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breeds.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Persistence
  function saveSettings() {
    try {
      const state = {
        url: urlInput.value,
        accept: acceptHeaderInput.value,
        limit: String(limitInput.value || ''),
        breed: breedFilterInput.value,
        country: countryFilterInput.value,
        global: globalSearchInput?.value || '',
        adv: {
          breed: advBreed?.value || '',
          country: advCountry?.value || '',
          origin: advOrigin?.value || '',
          coat: advCoat?.value || '',
          pattern: advPattern?.value || '',
          logic: advLogic?.value || 'AND',
        },
        factMaxLen: factMaxLenInput?.value || '',
        autoFact: {
          enabled: !!(autoRefreshFactInput && autoRefreshFactInput.checked),
          intervalSec: Number(factIntervalSecInput?.value || 30),
        },
        tablePageSize: Number(tablePageSizeEl?.value || 50),
        facts: {
          limit: Number(factsLimitInput?.value || 10),
          maxLen: Number(factsMaxLenInput?.value || 0),
        },
        sortKey: sortState.key,
        sortAsc: sortState.asc,
      };
      localStorage.setItem('cbv_state', JSON.stringify(state));
    } catch {}
  }

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('cbv_state') || 'null');
      if (!s) return;
      if (s.url) urlInput.value = s.url;
      if (s.accept) acceptHeaderInput.value = s.accept;
      if (s.limit) limitInput.value = s.limit;
      if (typeof s.breed === 'string') breedFilterInput.value = s.breed;
      if (typeof s.country === 'string') countryFilterInput.value = s.country;
      if (s.global != null && globalSearchInput) globalSearchInput.value = s.global;
      if (s.adv && advLogic) {
        advBreed.value = s.adv.breed || '';
        advCountry.value = s.adv.country || '';
        advOrigin.value = s.adv.origin || '';
        advCoat.value = s.adv.coat || '';
        advPattern.value = s.adv.pattern || '';
        advLogic.value = s.adv.logic || 'AND';
      }
      if (s.factMaxLen != null && factMaxLenInput) factMaxLenInput.value = s.factMaxLen;
      if (s.autoFact) {
        if (typeof s.autoFact.enabled === 'boolean' && autoRefreshFactInput) autoRefreshFactInput.checked = s.autoFact.enabled;
        if (s.autoFact.intervalSec != null && factIntervalSecInput) factIntervalSecInput.value = s.autoFact.intervalSec;
      }
      if (s.tablePageSize != null && tablePageSizeEl) tablePageSizeEl.value = String(s.tablePageSize);
      if (s.facts) {
        if (s.facts.limit != null && factsLimitInput) factsLimitInput.value = s.facts.limit;
        if (s.facts.maxLen != null && factsMaxLenInput) factsMaxLenInput.value = s.facts.maxLen;
      }
      if (s.sortKey) sortState.key = s.sortKey;
      if (typeof s.sortAsc === 'boolean') sortState.asc = s.sortAsc;
    } catch {}
  }

  // Fetching
  async function fetchAndRender(baseUrl) {
    setStatus('Loading...');
    const url = getUrlWithLimit(baseUrl, Number(limitInput.value));

    let resp;
    try {
      resp = await fetch(url, { headers: parseHeaders() });
    } catch (e) {
      setStatus('Network error.');
      console.error(e);
      return;
    }

    if (!resp.ok) {
      setStatus(`Request failed: ${resp.status} ${resp.statusText}`);
      return;
    }

    let json;
    try {
      json = await resp.json();
    } catch (e) {
      setStatus('Failed to parse JSON.');
      console.error(e);
      return;
    }

    rawData = Array.isArray(json?.data) ? json.data : [];

    // pagination meta if available
    const current = json?.current_page ?? json?.meta?.current_page ?? null;
    const last = json?.last_page ?? json?.meta?.last_page ?? null;
    const total = json?.total ?? json?.meta?.total ?? null;

    if (current != null && last != null) {
      pageInfoEl.textContent = `Page ${current} of ${last}${total != null ? ` • Total: ${total}` : ''}`;
      prevPageBtn.disabled = current <= 1;
      nextPageBtn.disabled = current >= last;
    } else {
      pageInfoEl.textContent = '';
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
    }

    applyFiltersAndRender();
  }

  // Events
  loadBtn.addEventListener('click', () => {
    fetchAndRender(urlInput.value);
    saveSettings();
  });

  useRecommendedBtn.addEventListener('click', () => {
    try {
      const u = new URL(urlInput.value);
      u.searchParams.set('limit', '50');
      urlInput.value = u.toString();
      limitInput.value = '50';
    } catch (e) {
      urlInput.value = 'https://catfact.ninja/breeds?limit=50';
      limitInput.value = '50';
    }
    saveSettings();
    fetchAndRender(urlInput.value);
  });

  limitInput.addEventListener('change', () => {
    urlInput.value = getUrlWithLimit(urlInput.value, Number(limitInput.value));
    saveSettings();
  });

  // Filters
  breedFilterInput.addEventListener('input', applyFiltersAndRender);
  countryFilterInput.addEventListener('input', applyFiltersAndRender);
  clearFiltersBtn.addEventListener('click', () => {
    breedFilterInput.value = '';
    countryFilterInput.value = '';
    applyFiltersAndRender();
  });

  // CSV Export
  exportCsvBtn.addEventListener('click', () => {
    exportCsv(filteredData.length ? filteredData : rawData);
  });

  // Table pagination events
  if (tablePageSizeEl) tablePageSizeEl.addEventListener('change', () => { tablePage = 1; renderTableWithPagination(); saveSettings(); });
  if (tablePrevBtn) tablePrevBtn.addEventListener('click', () => { tablePage = Math.max(1, tablePage - 1); renderTableWithPagination(); });
  if (tableNextBtn) tableNextBtn.addEventListener('click', () => { tablePage = tablePage + 1; renderTableWithPagination(); });

  // Global search and advanced filters
  if (globalSearchInput) globalSearchInput.addEventListener('input', applyFiltersAndRender);
  [advBreed, advCountry, advOrigin, advCoat, advPattern].forEach(el => el && el.addEventListener('input', applyFiltersAndRender));
  if (advLogic) advLogic.addEventListener('change', applyFiltersAndRender);

  // Active filter summary and quick clear
  function renderActiveFilters() {
    if (!activeFiltersEl) return;
    const chips = [];
    const addChip = (key, label, value) => {
      if (!value) return;
      const span = document.createElement('span');
      span.className = 'chip';
      span.dataset.key = key;
      span.textContent = `${label}: ${value}`;
      const btn = document.createElement('button');
      btn.setAttribute('aria-label', `Clear ${label}`);
      btn.textContent = '×';
      btn.addEventListener('click', () => {
        switch (key) {
          case 'breed': breedFilterInput.value = ''; break;
          case 'country': countryFilterInput.value = ''; break;
          case 'global': globalSearchInput.value = ''; break;
          case 'advBreed': advBreed.value = ''; break;
          case 'advCountry': advCountry.value = ''; break;
          case 'advOrigin': advOrigin.value = ''; break;
          case 'advCoat': advCoat.value = ''; break;
          case 'advPattern': advPattern.value = ''; break;
        }
        applyFiltersAndRender();
      });
      span.appendChild(btn);
      chips.push(span);
    };

    activeFiltersEl.innerHTML = '';
    addChip('breed', 'Breed', breedFilterInput.value);
    addChip('country', 'Country', countryFilterInput.value);
    addChip('global', 'Search', globalSearchInput?.value || '');
    addChip('advBreed', 'Adv Breed', advBreed?.value || '');
    addChip('advCountry', 'Adv Country', advCountry?.value || '');
    addChip('advOrigin', 'Adv Origin', advOrigin?.value || '');
    addChip('advCoat', 'Adv Coat', advCoat?.value || '');
    addChip('advPattern', 'Adv Pattern', advPattern?.value || '');
    chips.forEach(chip => activeFiltersEl.appendChild(chip));
  }

  if (clearAllFiltersBtn) clearAllFiltersBtn.addEventListener('click', () => {
    breedFilterInput.value = '';
    countryFilterInput.value = '';
    if (globalSearchInput) globalSearchInput.value = '';
    if (advBreed) advBreed.value = '';
    if (advCountry) advCountry.value = '';
    if (advOrigin) advOrigin.value = '';
    if (advCoat) advCoat.value = '';
    if (advPattern) advPattern.value = '';
    applyFiltersAndRender();
  });

  // Clickable sorting
  table.querySelectorAll('th[data-key]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-key');
      if (sortState.key === key) {
        sortState.asc = !sortState.asc;
      } else {
        sortState.key = key;
        sortState.asc = true;
      }
      sortByKey(key, sortState.asc);
      saveSettings();
    });
  });

  // Pagination
  function setPage(delta) {
    try {
      const u = new URL(urlInput.value);
      const current = Number(u.searchParams.get('page') || '1');
      const next = Math.max(1, current + delta);
      u.searchParams.set('page', String(next));
      urlInput.value = u.toString();
      saveSettings();
      fetchAndRender(urlInput.value);
    } catch (e) {
      // If URL invalid, reset to base with page
      urlInput.value = 'https://catfact.ninja/breeds?page=1&limit=' + encodeURIComponent(limitInput.value || '50');
      saveSettings();
      fetchAndRender(urlInput.value);
    }
  }
  prevPageBtn.addEventListener('click', () => setPage(-1));
  nextPageBtn.addEventListener('click', () => setPage(1));

  // Facts list
  const factsLimitInput = document.getElementById('factsLimit');
  const factsMaxLenInput = document.getElementById('factsListMaxLen');
  const loadFactsBtn = document.getElementById('loadFactsBtn');
  const exportFactsCsvBtn = document.getElementById('exportFactsCsvBtn');
  const factsPrevBtn = document.getElementById('factsPrevBtn');
  const factsNextBtn = document.getElementById('factsNextBtn');
  const factsPageInfoEl = document.getElementById('factsPageInfo');
  const factsTable = document.getElementById('factsTable');
  const factsTbody = factsTable ? factsTable.querySelector('tbody') : null;

  let factsPage = 1;
  function buildFactsUrl() {
    try {
      const u = new URL('https://catfact.ninja/facts');
      const lim = Number(factsLimitInput?.value || 10);
      if (!Number.isNaN(lim) && lim > 0) u.searchParams.set('limit', String(lim));
      const ml = Number(factsMaxLenInput?.value);
      if (!Number.isNaN(ml) && ml > 0) u.searchParams.set('max_length', String(ml));
      u.searchParams.set('page', String(factsPage));
      return u.toString();
    } catch {
      return 'https://catfact.ninja/facts';
    }
  }

  function renderFactsTable(rows) {
    if (!factsTbody) return;
    factsTbody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(r.fact)}</td>
        <td>${escapeHtml(r.length)}</td>
      `;
      factsTbody.appendChild(tr);
    });
  }

  function exportFactsCsv(rows) {
    const headers = ['fact', 'length'];
    const escapeCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.join(',')].concat(rows.map(r => headers.map(h => escapeCsv(r[h])).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fetchFactsList() {
    if (factsPageInfoEl) factsPageInfoEl.textContent = 'Loading...';
    let resp;
    try {
      resp = await fetch(buildFactsUrl(), { headers: parseHeaders() });
    } catch (e) {
      if (factsPageInfoEl) factsPageInfoEl.textContent = 'Network error';
      return;
    }
    if (!resp.ok) {
      if (factsPageInfoEl) factsPageInfoEl.textContent = `Error ${resp.status}`;
      return;
    }
    let j;
    try { j = await resp.json(); } catch { if (factsPageInfoEl) factsPageInfoEl.textContent = 'Parse error'; return; }
    const rows = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
    renderFactsTable(rows);
    const current = j?.current_page ?? j?.meta?.current_page ?? factsPage;
    const last = j?.last_page ?? j?.meta?.last_page ?? current;
    const total = j?.total ?? j?.meta?.total ?? rows.length;
    factsPage = current || factsPage;
    if (factsPageInfoEl) factsPageInfoEl.textContent = `Page ${current} of ${last} • Total: ${total}`;
    if (factsPrevBtn) factsPrevBtn.disabled = (current || 1) <= 1;
    if (factsNextBtn) factsNextBtn.disabled = (current || 1) >= (last || 1);
  }

  if (loadFactsBtn) loadFactsBtn.addEventListener('click', () => { factsPage = 1; fetchFactsList(); saveSettings(); });
  if (factsPrevBtn) factsPrevBtn.addEventListener('click', () => { factsPage = Math.max(1, factsPage - 1); fetchFactsList(); });
  if (factsNextBtn) factsNextBtn.addEventListener('click', () => { factsPage = factsPage + 1; fetchFactsList(); });
  if (exportFactsCsvBtn) exportFactsCsvBtn.addEventListener('click', async () => {
    // Fetch current page and export
    let resp;
    try { resp = await fetch(buildFactsUrl(), { headers: parseHeaders() }); } catch { return; }
    if (!resp.ok) return;
    try {
      const j = await resp.json();
      const rows = Array.isArray(j?.data) ? j.data : (Array.isArray(j) ? j : []);
      exportFactsCsv(rows);
    } catch {}
  });

  // Random Fact
  function buildFactUrl() {
    try {
      const u = new URL('https://catfact.ninja/fact');
      const ml = Number(factMaxLenInput?.value);
      if (!Number.isNaN(ml) && ml > 0) u.searchParams.set('max_length', String(ml));
      return u.toString();
    } catch {
      return 'https://catfact.ninja/fact';
    }
  }

  async function fetchRandomFact() {
    randomFactText.textContent = 'Loading a fact...';
    let resp;
    try {
      resp = await fetch(buildFactUrl(), { headers: parseHeaders() });
    } catch (e) {
      randomFactText.textContent = 'Failed to load fact (network error).';
      return;
    }
    if (!resp.ok) {
      randomFactText.textContent = `Failed to load fact: ${resp.status}`;
      return;
    }
    try {
      const j = await resp.json();
      const fact = j?.fact || (Array.isArray(j?.data) && j.data[0]?.fact) || '';
      randomFactText.textContent = fact || 'No fact available.';
    } catch {
      randomFactText.textContent = 'Failed to parse fact.';
    }
  }

  if (refreshFactBtn) refreshFactBtn.addEventListener('click', () => {
    saveSettings();
    fetchRandomFact();
  });
  if (factMaxLenInput) factMaxLenInput.addEventListener('change', () => {
    saveSettings();
  });

  // Auto-refresh for Random Fact
  const autoRefreshFactInput = document.getElementById('autoRefreshFact');
  const factIntervalSecInput = document.getElementById('factIntervalSec');
  let factTimer = null;
  function updateFactTimer() {
    if (factTimer) { clearInterval(factTimer); factTimer = null; }
    if (autoRefreshFactInput && autoRefreshFactInput.checked) {
      const sec = Math.max(1, Number(factIntervalSecInput?.value || 30));
      factTimer = setInterval(fetchRandomFact, sec * 1000);
    }
  }
  if (autoRefreshFactInput) autoRefreshFactInput.addEventListener('change', () => { saveSettings(); if (autoRefreshFactInput.checked) fetchRandomFact(); updateFactTimer(); });
  if (factIntervalSecInput) factIntervalSecInput.addEventListener('change', () => { saveSettings(); updateFactTimer(); });

  // Initialize
  loadSettings();
  syncLimitFromUrl();
  fetchAndRender(urlInput.value);
  fetchRandomFact();
  updateFactTimer();
  // Optionally load initial facts list
  if (loadFactsBtn) fetchFactsList();
})();

