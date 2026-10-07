/**
 * state.js
 * ---------------------------------------------------------------
 * Shared dashboard state and a simple broadcast mechanism used
 * to keep all four charts synchronised.
 *
 * PATTERN
 * Every chart registers an updater function into `updaters`. When
 * any chart changes `state`, it calls broadcast() which loops
 * through every registered updater and re-renders. This keeps
 * cross-highlighting and cross-selection logic simple and avoids
 * tight coupling between charts.
 *
 * SELECTION MODEL
 * selectedSource and selectedYear are INDEPENDENT fields. Picking
 * a source does not clear the selected year, and picking a year
 * does not clear the selected source. That lets the user combine
 * filters, for example "look at Bioenergy in 2020", which is the
 * analytical workflow the coursework brief asks for.
 *
 * Only the Reset button clears both at once.
 * ---------------------------------------------------------------
 */

'use strict';

/* Shared state. Defaults: full year range, no active selections. */
const state = {
  yearRange:      [FIRST_YEAR, LAST_YEAR],
  selectedYear:   null,   // integer year or null
  selectedSource: null    // key from SRC_KEYS or null
};

/* Registry of chart updaters. Charts push into this in charts.js. */
const updaters = {};

/* Broadcast a change to every registered chart. */
function broadcast() {
  Object.values(updaters).forEach(function(fn) { fn(); });
}

/* ---- Selection helpers ----
   These are INDEPENDENT. Setting one does not clear the other.
   Clicking the same element again toggles that field off. */

function selectSource(key) {
  state.selectedSource = (state.selectedSource === key) ? null : key;
  broadcast();
}

function selectYear(yr) {
  yr = +yr;
  if (yr < state.yearRange[0] || yr > state.yearRange[1]) return;
  state.selectedYear = (state.selectedYear === yr) ? null : yr;
  broadcast();
}

function resetAll() {
  state.yearRange      = [FIRST_YEAR, LAST_YEAR];
  state.selectedYear   = null;
  state.selectedSource = null;
  broadcast();
}

/* ---- Filter and derived helpers ---- */

/* True when a row is inside the current year range. */
function inRange(d) {
  return d.Year >= state.yearRange[0] && d.Year <= state.yearRange[1];
}

/* Active year used by year-dependent views (treemap, sector chart).
   Falls back to the upper bound of the range when no explicit
   year has been clicked. */
function activeYear() {
  if (state.selectedYear !== null &&
      state.selectedYear >= state.yearRange[0] &&
      state.selectedYear <= state.yearRange[1]) {
    return state.selectedYear;
  }
  return state.yearRange[1];
}

/* True when an explicit year has been clicked (not the fallback). */
function hasExplicitYear() {
  return state.selectedYear !== null &&
         state.selectedYear >= state.yearRange[0] &&
         state.selectedYear <= state.yearRange[1];
}

/* ---- Tooltip helpers shared by every chart ---- */

const _tt = typeof d3 !== 'undefined' ? d3.select('#tt') : null;

function showTT(html) { if (_tt) _tt.html(html).classed('on', true); }
function hideTT()     { if (_tt) _tt.classed('on', false); }
function moveTT(ev) {
  if (!_tt) return;
  var x = ev.clientX + 14;
  var y = ev.clientY - 32;
  if (x + 245 > window.innerWidth) x = ev.clientX - 246;
  if (y < 4) y = ev.clientY + 14;
  _tt.style('left', x + 'px').style('top', y + 'px');
}

/* ---- Misc formatting utilities ---- */

const fmt3   = d3.format('.3f');
const fmt2   = d3.format('.2f');
const fmt1   = d3.format('.1f');
const fmtInt = d3.format('d');

function majorTicks(start, end) {
  var base = Math.ceil(start / 5) * 5;
  var ticks = d3.range(base, end + 1, 5).filter(function(v) { return v >= start; });
  if (ticks.indexOf(end) === -1) ticks.push(end);
  return ticks;
}

function minorTicks(start, end) { return d3.range(start, end + 1); }

function applyRotation(axisGroup) {
  axisGroup.selectAll('.tick text')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end')
    .attr('dx', '-0.5em')
    .attr('dy', '0.15em');
}
