/**
 * main.js
 * ---------------------------------------------------------------
 * Application entry point.
 *   - Populates the year filter dropdowns
 *   - Wires up the Reset button
 *   - Renders the SELECTION-AWARE KPI strip
 *   - Renders the selection-state badges in the header
 *   - Builds all four charts
 *   - Registers the KPI + badge refreshers as broadcast updaters
 *
 * SELECTION-AWARE KPIs
 * The KPI strip adapts to what the user has clicked:
 *   - No source selected:
 *     1) Renewables share in the active year
 *     2) Total renewables in the active year
 *     3) Growth since range start
 *     4) Top source in the active year
 *   - Source selected (with or without an explicit year):
 *     1) Selected source value in the active year
 *     2) Selected source share of renewable total
 *     3) Selected source growth since range start
 *     4) Renewables share in the active year
 * ---------------------------------------------------------------
 */

'use strict';


/* ---- Filter bar: populate dropdowns and handle changes ---- */
function setupFilters() {
  const selStart = document.getElementById('yrStart');
  const selEnd   = document.getElementById('yrEnd');

  TABLE1.forEach(function(d) {
    selStart.insertAdjacentHTML('beforeend', `<option value="${d.Year}">${d.Year}</option>`);
    selEnd.insertAdjacentHTML('beforeend',   `<option value="${d.Year}">${d.Year}</option>`);
  });
  selStart.value = FIRST_YEAR;
  selEnd.value   = LAST_YEAR;

  function apply() {
    const s = +selStart.value;
    const e = +selEnd.value;
    if (s > e) {
      /* Revert illegal range: start must be <= end. */
      selStart.value = state.yearRange[0];
      selEnd.value   = state.yearRange[1];
      return;
    }
    state.yearRange = [s, e];
    /* Keep selected source. Only clear selected year if it now
       falls outside the new range. */
    if (state.selectedYear !== null &&
        (state.selectedYear < s || state.selectedYear > e)) {
      state.selectedYear = null;
    }
    broadcast();
  }
  selStart.addEventListener('change', apply);
  selEnd.addEventListener('change', apply);

  document.getElementById('resetBtn').addEventListener('click', function() {
    selStart.value = FIRST_YEAR;
    selEnd.value   = LAST_YEAR;
    resetAll();
  });
}


/* ---- KPI strip: refresh based on the current selection ---- */
function updateKPIs() {
  const yr       = activeYear();
  const rangeS   = state.yearRange[0];
  const row1     = TABLE1.find(d => d.Year === yr) || TABLE1[TABLE1.length - 1];
  const rowStart = TABLE1.find(d => d.Year === rangeS) || TABLE1[0];
  const row3     = TABLE3.slice().reverse().find(d => d.Year <= yr) || TABLE3[TABLE3.length - 1];

  const src = state.selectedSource;

  const k1L = document.getElementById('kl1');
  const k1V = document.getElementById('kv1');
  const k1U = document.getElementById('ku1');
  const k2L = document.getElementById('kl2');
  const k2V = document.getElementById('kv2');
  const k2U = document.getElementById('ku2');
  const k3L = document.getElementById('kl3');
  const k3V = document.getElementById('kv3');
  const k3U = document.getElementById('ku3');
  const k4L = document.getElementById('kl4');
  const k4V = document.getElementById('kv4');
  const k4U = document.getElementById('ku4');

  if (src) {
    /* Source-focused KPIs (year may or may not be explicitly selected). */
    const srcLbl   = SRC_LBL[src];
    const valYr    = row1[src] || 0;
    const rangeE   = state.yearRange[1];

    /* Growth multiple needs a non-zero baseline. If the source is
       at or near zero at the range start (Solar PV before 2005,
       Wind in the early 1990s), search forward in the range for
       the first year with at least 0.01 Mtoe and use it as the
       baseline. Below 0.01 Mtoe (about 10 kilotonnes of oil
       equivalent) the source is too small to give a meaningful
       multiplier. The label updates to show that baseline so the
       user knows the multiple is from the source's first
       meaningful year, not from the start of the range. */
    const BASE_MIN = 0.01;
    let baseYear = rangeS;
    let baseVal  = rowStart[src] || 0;
    if (baseVal < BASE_MIN) {
      for (let y = rangeS + 1; y <= rangeE; y++) {
        const r = TABLE1.find(d => d.Year === y);
        if (r && r[src] >= BASE_MIN) { baseYear = y; baseVal = r[src]; break; }
      }
    }
    const growth   = baseVal >= BASE_MIN && baseYear < yr ? valYr / baseVal : null;
    const shareYr  = (row1[src] / row1.Total) * 100;

    k1L.textContent = `${srcLbl} in ${yr}`;
    k1V.textContent = fmt2(valYr);
    k1U.textContent = 'Mtoe';

    k2L.textContent = `${srcLbl} share in ${yr}`;
    k2V.textContent = fmt1(shareYr) + '%';
    k2U.textContent = 'of total renewables';

    k3L.textContent = `${srcLbl} growth ${baseYear}\u2013${yr}`;
    k3V.textContent = (growth === null) ? 'n/a' : `${growth.toFixed(1)}\u00d7`;
    k3U.textContent = (baseYear === rangeS)
      ? 'multiple since range start'
      : `multiple since first meaningful year`;

    k4L.textContent = `Renewables share in ${yr}`;
    k4V.textContent = `${row3.Renewables_Pct}%`;
    k4U.textContent = 'of total UK energy';

  } else {
    /* Default KPIs (no source selected). */
    const topSrc    = SRC_KEYS.reduce((a, b) => row1[a] > row1[b] ? a : b);
    const topShare  = (row1[topSrc] / row1.Total) * 100;
    const growthMul = rowStart.Total > 0 ? row1.Total / rowStart.Total : null;

    k1L.textContent = `Renewables share in ${yr}`;
    k1V.textContent = `${row3.Renewables_Pct}%`;
    k1U.textContent = 'of total UK energy';

    k2L.textContent = `Total renewables in ${yr}`;
    k2V.textContent = fmt2(row1.Total);
    k2U.textContent = 'Mtoe';

    k3L.textContent = `Growth ${rangeS}\u2013${yr}`;
    k3V.textContent = (growthMul === null) ? 'n/a' : `${growthMul.toFixed(1)}\u00d7`;
    k3U.textContent = 'multiple since range start';

    k4L.textContent = `Top source in ${yr}`;
    k4V.textContent = SRC_LBL[topSrc];
    k4U.textContent = `${fmt1(topShare)}% of total renewables`;
  }
}


/* ---- Selection-state display in the header ---- */
function updateSelState() {
  document.getElementById('stRange').textContent =
    `${state.yearRange[0]}\u2013${state.yearRange[1]}`;
  document.getElementById('stYear').textContent =
    hasExplicitYear() ? state.selectedYear : 'none (using ' + activeYear() + ')';
  document.getElementById('stSource').textContent =
    (state.selectedSource !== null) ? SRC_LBL[state.selectedSource] : 'all sources';

  /* Active-state classes on the badges for a visible amber lift. */
  document.getElementById('bYear').classList.toggle('on', hasExplicitYear());
  document.getElementById('bSource').classList.toggle('on', state.selectedSource !== null);
}


/* ---- Bootstrap ---- */
(function init() {
  setupFilters();
  updateKPIs();
  updateSelState();

  /* Register KPI + badge refreshers as updaters so they refresh
     whenever any chart pushes a state change. */
  updaters.kpis     = updateKPIs;
  updaters.selState = updateSelState;

  /* Build the four charts. Each registers its own updater. */
  buildLineChart();
  buildTreemap();
  buildShareChart();
  buildSectorChart();
})();
