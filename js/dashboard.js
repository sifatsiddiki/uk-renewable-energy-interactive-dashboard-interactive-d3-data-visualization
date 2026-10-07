/**
 * dashboard.js — UK Renewable Energy Dashboard
 * Source: ONS Environmental Accounts (2023 release)
 *
 * Data is embedded in data.js as CSV strings (RAW_TABLE1/2/3).
 * Parsed here with d3.csvParse(). No server needed.
 *
 * Chart 1: Multi-line — renewable energy by source (table1, Mtoe)
 * Chart 2: Grouped bar — renewable use by industry sector (table2, Mtoe)
 * Chart 3: Donut — source mix for selected year (table1)
 * Chart 4: Bar — renewables share of total UK energy (table3, %)
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// 0.  CONSTANTS & COLOUR PALETTE
// ═══════════════════════════════════════════════════════════

const SRC_KEYS = [
  'Hydro', 'Wind_Wave_Tidal', 'Solar_PV',
  'Landfill_Gas', 'Sewage_Gas', 'Bioenergy'
];
const SRC_LBL = {
  Hydro:           'Hydro',
  Wind_Wave_Tidal: 'Wind, Wave & Tidal',
  Solar_PV:        'Solar PV',
  Landfill_Gas:    'Landfill Gas',
  Sewage_Gas:      'Sewage Gas',
  Bioenergy:       'Bioenergy'
};

const SEC_KEYS = ['Energy_Supply','Manufacturing','Other_Industry','Services','Agriculture'];
const SEC_LBL  = {
  Energy_Supply:  'Energy Supply (SIC D)',
  Manufacturing:  'Manufacturing (SIC C)',
  Other_Industry: 'Other Industry (SIC B+E+F)',
  Services:       'Services (SIC G-M)',
  Agriculture:    'Agriculture (SIC A)'
};

const SRC_COLORS = {
  Hydro:           '#1565c0',
  Wind_Wave_Tidal: '#0288d1',
  Solar_PV:        '#f9a825',
  Landfill_Gas:    '#78909c',
  Sewage_Gas:      '#ab47bc',
  Bioenergy:       '#558b2f'
};

const SEC_COLORS = {
  Energy_Supply:  '#003c57',
  Manufacturing:  '#e65100',
  Other_Industry: '#2e7d32',
  Services:       '#6a1b9a',
  Agriculture:    '#f57f17'
};

function COLOR(key) {
  return SRC_COLORS[key] || SEC_COLORS[key] || '#999';
}

// ═══════════════════════════════════════════════════════════
// 1.  DATA — parsed from embedded CSV strings in data.js
// ═══════════════════════════════════════════════════════════

var TABLE1 = d3.csvParse(RAW_TABLE1, d3.autoType);
var TABLE2 = d3.csvParse(RAW_TABLE2, d3.autoType);
var TABLE3 = d3.csvParse(RAW_TABLE3, d3.autoType);

initDashboard(TABLE1, TABLE2, TABLE3);

// ═══════════════════════════════════════════════════════════
// 2.  DASHBOARD INIT
// ═══════════════════════════════════════════════════════════

function initDashboard(TABLE1, TABLE2, TABLE3) {

  var LAST_YEAR  = TABLE1[TABLE1.length - 1].Year;
  var FIRST_YEAR = TABLE1[0].Year;

  var state = {
    yearRange:      [FIRST_YEAR, LAST_YEAR],
    selectedYear:   null,
    selectedSource: null
  };

  var updaters = {};
  function broadcast() { Object.values(updaters).forEach(function(fn) { fn(); }); }

  // Tooltip
  var ttEl = d3.select('#tt');
  function showTT(html) { ttEl.html(html).classed('on', true); }
  function hideTT()     { ttEl.classed('on', false); }
  function moveTT(ev) {
    var x = ev.clientX + 14, y = ev.clientY - 32;
    if (x + 215 > window.innerWidth) x = ev.clientX - 216;
    if (y < 4) y = ev.clientY + 14;
    ttEl.style('left', x + 'px').style('top', y + 'px');
  }

  // Utility
  function inRange(d) {
    return d.Year >= state.yearRange[0] && d.Year <= state.yearRange[1];
  }

  function activeYear() {
    if (state.selectedYear !== null &&
        +state.selectedYear >= state.yearRange[0] &&
        +state.selectedYear <= state.yearRange[1]) {
      return +state.selectedYear;
    }
    return state.yearRange[1];
  }

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

  // Year dropdown helpers
  var _selStart, _selEnd;

  function setYearEnd(yr) {
    if (_selEnd) _selEnd.value = yr;
    state.yearRange = [+(_selStart ? _selStart.value : FIRST_YEAR), yr];
  }

  function resetYearEnd() {
    if (_selStart) _selStart.value = FIRST_YEAR;
    if (_selEnd)   _selEnd.value   = LAST_YEAR;
    state.yearRange = [FIRST_YEAR, LAST_YEAR];
  }

  // ── KPI CARDS ─────────────────────────────────────────────

  function updateKPIs() {
    var yr   = activeYear();
    var row1 = TABLE1.find(function(d) { return d.Year === yr; }) || TABLE1[TABLE1.length - 1];
    var row3 = TABLE3.slice().reverse().find(function(d) { return d.Year <= yr; }) || TABLE3[TABLE3.length - 1];
    var first = TABLE1[0];
    var topSrc = SRC_KEYS.reduce(function(a, b) { return row1[a] > row1[b] ? a : b; });

    document.getElementById('kl1').textContent = 'Total Renewables ' + yr;
    document.getElementById('kl2').textContent = 'Renewables Share ' + yr;
    document.getElementById('kl3').textContent = 'Growth ' + FIRST_YEAR + '\u2013' + yr;
    document.getElementById('kl4').textContent = 'Largest Source ' + yr;

    document.getElementById('kv1').textContent = d3.format('.2f')(row1.Total) + ' Mtoe';
    document.getElementById('kv2').textContent = row3.Renewables_Pct + '%';
    document.getElementById('kv3').textContent = (row1.Total / first.Total).toFixed(1) + '\u00d7';
    document.getElementById('kv4').textContent = SRC_LBL[topSrc];
  }

  updateKPIs();
  updaters.kpis = updateKPIs;

  // ── YEAR-RANGE FILTER ──────────────────────────────────────

  (function setupFilters() {
    var allYears = TABLE1.map(function(d) { return d.Year; });
    _selStart = document.getElementById('yrStart');
    _selEnd   = document.getElementById('yrEnd');

    allYears.forEach(function(y) {
      _selStart.innerHTML += '<option value="' + y + '">' + y + '</option>';
      _selEnd.innerHTML   += '<option value="' + y + '">' + y + '</option>';
    });
    _selStart.value = FIRST_YEAR;
    _selEnd.value   = LAST_YEAR;

    function apply() {
      var s = +_selStart.value, e = +_selEnd.value;
      if (s > e) return;
      state.yearRange = [s, e];
      state.selectedYear = null;
      state.selectedSource = null;
      broadcast();
    }
    _selStart.addEventListener('change', apply);
    _selEnd.addEventListener('change', apply);

    document.getElementById('resetBtn').addEventListener('click', function() {
      state.yearRange = [FIRST_YEAR, LAST_YEAR];
      state.selectedYear = null;
      state.selectedSource = null;
      _selStart.value = FIRST_YEAR;
      _selEnd.value   = LAST_YEAR;
      broadcast();
    });
  })();

  // ═══════════════════════════════════════════════════════════
  // CHART 1 — MULTI-LINE
  //   Source: table1, renewable energy by source (Mtoe)
  //   Bottom margin increased, legend pushed down to avoid
  //   overlapping with rotated year tick labels.
  // ═══════════════════════════════════════════════════════════

  (function buildLine() {
    var wrap = document.getElementById('c-line');
    var M  = { top:10, right:16, bottom:120, left:68 };
    var W  = wrap.clientWidth || 520;
    var H  = 360;
    var iW = W - M.left - M.right;
    var iH = H - M.top  - M.bottom;

    var svg = d3.select(wrap).append('svg')
      .attr('width', W).attr('height', H)
      .attr('role', 'img')
      .attr('aria-label', 'Multi-line chart of UK renewable energy by source, 1990-2023');

    svg.append('defs').append('clipPath').attr('id','clip-ln')
      .append('rect').attr('width', iW).attr('height', iH + 4).attr('y', -2);

    var g = svg.append('g').attr('transform','translate(' + M.left + ',' + M.top + ')');

    var xSc = d3.scaleLinear().domain([FIRST_YEAR, LAST_YEAR]).range([0, iW]);
    var ySc = d3.scaleLinear().range([iH, 0]).nice();

    var xMaj = d3.axisBottom(xSc).tickFormat(d3.format('d')).tickSize(6)
                  .tickValues(majorTicks(FIRST_YEAR, LAST_YEAR));
    var xMin = d3.axisBottom(xSc).tickFormat('').tickSize(3)
                  .tickValues(minorTicks(FIRST_YEAR, LAST_YEAR));
    var yAxis = d3.axisLeft(ySc).tickFormat(function(d) { return d3.format('.2f')(d); }).ticks(6);

    var gX    = g.append('g').attr('class','axis x-tick-rotated').attr('transform','translate(0,' + iH + ')');
    var gXMin = g.append('g').attr('class','axis-minor').attr('transform','translate(0,' + iH + ')');
    var gY    = g.append('g').attr('class','axis');

    g.append('text').attr('class','ax-lbl').attr('text-anchor','middle')
      .attr('x', iW/2).attr('y', iH + 50).text('Year');
    g.append('text').attr('class','ax-lbl').attr('transform','rotate(-90)')
      .attr('text-anchor','middle').attr('x', -iH/2).attr('y', -52)
      .text('Consumption (Mtoe)');

    var lineGen = d3.line()
      .x(function(d) { return xSc(d.Year); })
      .y(function(d) { return ySc(d.v); })
      .curve(d3.curveMonotoneX);

    var srcSeries = SRC_KEYS.map(function(k) {
      return {
        key: k,
        pts: TABLE1.map(function(d) { return { Year: d.Year, v: d[k] }; })
      };
    });

    var xhair = g.append('line').attr('class','xhair')
                  .attr('y1',0).attr('y2',iH).style('display','none');

    g.append('rect').attr('class','overlay').attr('width', iW).attr('height', iH)
      .on('mousemove', function(ev) {
        var mx = d3.pointer(ev)[0];
        var yr = Math.round(xSc.invert(mx));
        var row = TABLE1.find(function(d) { return d.Year === yr; });
        if (!row) return;
        xhair.attr('x1', mx).attr('x2', mx).style('display','block');
        moveTT(ev);
        showTT('<b>Year: ' + yr + '</b><br/>' +
          SRC_KEYS.map(function(k) {
            return SRC_LBL[k] + ': <b>' + d3.format('.3f')(row[k]) + '</b> Mtoe';
          }).join('<br/>'));
      })
      .on('mouseleave', function() { xhair.style('display','none'); hideTT(); })
      .on('click', function(ev) {
        var yr = Math.round(xSc.invert(d3.pointer(ev)[0]));
        if (yr < state.yearRange[0] || yr > state.yearRange[1]) return;
        if (state.selectedYear === yr) {
          state.selectedYear = null;
          resetYearEnd();
        } else {
          state.selectedYear = yr;
          setYearEnd(yr);
        }
        state.selectedSource = null;
        broadcast();
      });

    var linesG = g.append('g').attr('clip-path','url(#clip-ln)');

    function drawLines(data, animate) {
      var filtSeries = srcSeries.map(function(s) {
        return {
          key: s.key,
          pts: s.pts.filter(function(p) {
            return p.Year >= data[0].Year && p.Year <= data[data.length-1].Year;
          })
        };
      });
      var paths = linesG.selectAll('.src-line')
        .data(filtSeries, function(d) { return d.key; })
        .join('path')
          .attr('class','src-line')
          .attr('stroke', function(d) { return COLOR(d.key); });

      if (animate) {
        paths.attr('d', function(d) { return lineGen(d.pts); }).each(function() {
          var len = this.getTotalLength();
          d3.select(this).attr('stroke-dasharray', len).attr('stroke-dashoffset', len)
            .transition().duration(1400).ease(d3.easeCubicOut)
            .attr('stroke-dashoffset', 0)
            .on('end', function() {
              d3.select(this).attr('stroke-dasharray','none').attr('stroke-dashoffset', null);
            });
        });
      } else {
        paths.attr('stroke-dasharray','none').attr('stroke-dashoffset', null)
          .transition().duration(350).attr('d', function(d) { return lineGen(d.pts); });
      }

      paths.on('click', function(ev, d) {
        ev.stopPropagation();
        state.selectedSource = (state.selectedSource === d.key) ? null : d.key;
        state.selectedYear   = null;
        broadcast();
      })
      .on('mousemove', function(ev, d) {
        ev.stopPropagation();
        var yr = Math.round(xSc.invert(d3.pointer(ev)[0]));
        var pt = d.pts.find(function(p) { return p.Year === yr; });
        if (!pt) return;
        moveTT(ev);
        showTT('<b>' + SRC_LBL[d.key] + '</b><br/>Year: ' + yr + '<br/>' + d3.format('.3f')(pt.v) + ' Mtoe');
      })
      .on('mouseleave', hideTT);
    }

    // Legend — 2 rows of 3 — pushed below x-axis labels
    var legG = g.append('g').attr('transform','translate(0,' + (iH + 68) + ')');
    SRC_KEYS.forEach(function(k, i) {
      var item = legG.append('g').attr('class','leg-item').attr('data-key', k)
        .attr('transform','translate(' + ((i % 3) * 138) + ',' + (Math.floor(i / 3) * 16) + ')');
      item.append('rect').attr('width',9).attr('height',9).attr('y',-8).attr('rx',2).attr('fill',COLOR(k));
      item.append('text').attr('x',12).attr('y',0).attr('font-size','9px').attr('fill','var(--muted)').text(SRC_LBL[k]);
      item.on('click', function() {
        state.selectedSource = (state.selectedSource === k) ? null : k;
        state.selectedYear   = null;
        broadcast();
      });
    });

    // Zoom
    var zoom = d3.zoom().scaleExtent([1, 12])
      .translateExtent([[0,0],[iW,iH]]).extent([[0,0],[iW,iH]])
      .on('zoom', function(ev) {
        var nx = ev.transform.rescaleX(xSc);
        gX.call(xMaj.scale(nx)); gXMin.call(xMin.scale(nx)); applyRotation(gX);
        var zLine = d3.line().x(function(d) { return nx(d.Year); }).y(function(d) { return ySc(d.v); }).curve(d3.curveMonotoneX);
        linesG.selectAll('.src-line').attr('stroke-dasharray','none').attr('d', function(d) { return zLine(d.pts); });
      });
    svg.call(zoom);

    var initData = TABLE1.filter(inRange);
    ySc.domain([0, d3.max(initData, function(d) { return d3.max(SRC_KEYS, function(k) { return d[k]; }); }) * 1.08]).nice();
    gX.call(xMaj); gXMin.call(xMin); applyRotation(gX); gY.call(yAxis);
    drawLines(initData, true);

    updaters.line = function() {
      var data = TABLE1.filter(inRange);
      if (!data.length) return;
      var rS = data[0].Year, rE = data[data.length-1].Year;
      xSc.domain([rS, rE]);
      ySc.domain([0, d3.max(data, function(d) { return d3.max(SRC_KEYS, function(k) { return d[k]; }); }) * 1.08]).nice();
      gX.transition().duration(350).call(xMaj.scale(xSc).tickValues(majorTicks(rS,rE)).tickSize(6));
      gXMin.transition().duration(350).call(xMin.scale(xSc).tickValues(minorTicks(rS,rE)).tickSize(3));
      applyRotation(gX);
      gY.transition().duration(350).call(yAxis);
      drawLines(data, false);
      linesG.selectAll('.src-line')
        .classed('fade',   function(d) { return state.selectedSource !== null && d.key !== state.selectedSource; })
        .classed('active', function(d) { return d.key === state.selectedSource; });
      legG.selectAll('.leg-item').classed('fade', function() {
        var k = d3.select(this).attr('data-key');
        return state.selectedSource !== null && k !== state.selectedSource;
      });
      if (state.selectedYear !== null &&
          state.selectedYear >= state.yearRange[0] &&
          state.selectedYear <= state.yearRange[1]) {
        var xp = xSc(state.selectedYear);
        xhair.attr('x1', xp).attr('x2', xp).style('display','block');
      } else {
        xhair.style('display','none');
      }
    };
  })();

  // ═══════════════════════════════════════════════════════════
  // CHART 2 — GROUPED BAR
  //   Source: table2, industry sectors from ONS Table 1a (Mtoe)
  // ═══════════════════════════════════════════════════════════

  (function buildBar() {
    var wrap = document.getElementById('c-bar');
    var M  = { top:10, right:16, bottom:120, left:68 };
    var W  = wrap.clientWidth || 520;
    var H  = 340;
    var iW = W - M.left - M.right;
    var iH = H - M.top  - M.bottom;

    var svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H)
      .attr('role','img').attr('aria-label','Grouped bar chart of UK renewable energy by sector, 1990-2023');
    var g = svg.append('g').attr('transform','translate(' + M.left + ',' + M.top + ')');

    var xSc  = d3.scaleBand().range([0, iW]).paddingInner(0.18).paddingOuter(0.06);
    var xSec = d3.scaleBand().domain(SEC_KEYS).padding(0.06);
    var ySc  = d3.scaleLinear().range([iH, 0]).nice();

    var xAxis = d3.axisBottom(xSc).tickFormat(d3.format('d'));
    var yAxis = d3.axisLeft(ySc).tickFormat(function(d) { return d3.format('.2f')(d); }).ticks(6);

    var gX = g.append('g').attr('class','axis x-tick-rotated').attr('transform','translate(0,' + iH + ')');
    var gY = g.append('g').attr('class','axis');

    g.append('text').attr('class','ax-lbl').attr('text-anchor','middle')
      .attr('x', iW/2).attr('y', iH + 44).text('Year');
    g.append('text').attr('class','ax-lbl').attr('transform','rotate(-90)')
      .attr('text-anchor','middle').attr('x', -iH/2).attr('y', -52)
      .text('Consumption (Mtoe)');

    var legG = g.append('g').attr('transform','translate(0,' + (iH + 58) + ')');
    SEC_KEYS.forEach(function(k, i) {
      var col = i % 3, row = Math.floor(i / 3);
      var item = legG.append('g').attr('transform','translate(' + (col * 145) + ',' + (row * 14) + ')');
      item.append('rect').attr('width',9).attr('height',9).attr('y',-8).attr('rx',2).attr('fill',COLOR(k));
      item.append('text').attr('x',12).attr('y',0).attr('font-size','9px').attr('fill','var(--muted)').text(SEC_LBL[k]);
    });

    function renderBars(animate) {
      var data  = TABLE2.filter(inRange);
      var allYrs = data.map(function(d) { return d.Year; });
      var step   = Math.max(1, Math.ceil(allYrs.length / 10));
      var ticks  = allYrs.filter(function(_, i) { return i % step === 0 || i === allYrs.length - 1; });

      xSc.domain(allYrs);
      xSec.range([0, xSc.bandwidth()]);
      ySc.domain([0, d3.max(data, function(d) { return d3.max(SEC_KEYS, function(k) { return d[k]; }); }) * 1.1]).nice();
      gX.call(xAxis.scale(xSc).tickValues(ticks));
      applyRotation(gX);
      gY.call(yAxis);

      var grps = g.selectAll('.yr-grp').data(data, function(d) { return d.Year; })
        .join('g').attr('class','yr-grp')
        .attr('transform', function(d) { return 'translate(' + xSc(d.Year) + ',0)'; });

      var bars = grps.selectAll('.bar')
        .data(function(d) {
          return SEC_KEYS.map(function(k) { return { sec:k, val:d[k], yr:+d.Year }; });
        })
        .join('rect')
          .attr('class','bar')
          .attr('x', function(d) { return xSec(d.sec); })
          .attr('width', xSec.bandwidth())
          .attr('fill',  function(d) { return COLOR(d.sec); })
          .attr('rx', 2)
          .attr('data-year', function(d) { return d.yr; })
          .on('click', function(ev, d) {
            var yr = +d.yr;
            if (state.selectedYear === yr) {
              state.selectedYear = null;
              resetYearEnd();
            } else {
              state.selectedYear = yr;
              setYearEnd(yr);
            }
            state.selectedSource = null;
            broadcast();
          })
          .on('mousemove', function(ev, d) {
            moveTT(ev);
            showTT('<b>' + SEC_LBL[d.sec] + '</b><br/>Year: ' + d.yr + '<br/>' + d3.format('.3f')(d.val) + ' Mtoe');
          })
          .on('mouseleave', hideTT);

      if (animate) {
        bars.attr('y', iH).attr('height', 0)
          .transition().duration(900).ease(d3.easeCubicOut)
          .attr('y', function(d) { return ySc(d.val); })
          .attr('height', function(d) { return iH - ySc(d.val); });
      } else {
        bars.transition().duration(350)
          .attr('y', function(d) { return ySc(d.val); })
          .attr('height', function(d) { return iH - ySc(d.val); });
      }
      setTimeout(function() {
        g.selectAll('.bar')
          .classed('fade',   function(d) { return state.selectedYear !== null && d.yr !== state.selectedYear; })
          .classed('active', function(d) { return d.yr === state.selectedYear; });
      }, 0);
    }

    renderBars(true);
    updaters.bar = function() { renderBars(false); };
  })();

  // ═══════════════════════════════════════════════════════════
  // CHART 3 — DONUT
  //   Source: table1, source mix for activeYear()
  // ═══════════════════════════════════════════════════════════

  (function buildDonut() {
    var wrap = document.getElementById('c-pie');
    var W    = wrap.clientWidth || 350;
    var H    = 400;
    var R    = Math.min(W, H * 0.54) / 2 - 20;
    var Rin  = R * 0.52;
    var CY   = R + 32;

    var svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H)
      .attr('role','img').attr('aria-label','Donut chart of renewable source mix for selected year');

    var g = svg.append('g').attr('transform','translate(' + (W/2) + ',' + CY + ')');

    var yrTxt  = g.append('text').attr('class','dnt-yr').attr('y', -4);
    var totTxt = g.append('text').attr('class','dnt-tot').attr('y', 15);

    var pieLayout = d3.pie().value(function(d) { return d.v; }).sort(null);
    var arcNorm   = d3.arc().innerRadius(Rin).outerRadius(R);
    var arcHover  = d3.arc().innerRadius(Rin).outerRadius(R + 10);

    // Legend
    var legOffY = CY + R + 16;
    var legOffX = W / 2 - R;
    var COL_W   = Math.max(110, (W - legOffX * 2) / 2);
    var legG    = svg.append('g').attr('transform','translate(' + legOffX + ',' + legOffY + ')');
    SRC_KEYS.forEach(function(k, i) {
      var col = i % 2;
      var row = Math.floor(i / 2);
      var item = legG.append('g').attr('class','leg-item').attr('data-key', k)
        .attr('transform','translate(' + (col * COL_W) + ',' + (row * 15 + 4) + ')');
      item.append('rect').attr('width',9).attr('height',9).attr('y',-8).attr('rx',2).attr('fill',COLOR(k));
      item.append('text').attr('x',12).attr('y',0).attr('font-size','9px').attr('fill','var(--muted)').text(SRC_LBL[k]);
      item.on('click', function() {
        state.selectedSource = (state.selectedSource === k) ? null : k;
        state.selectedYear   = null;
        broadcast();
      });
    });

    function drawDonut(yr) {
      yr = +yr;
      var row = TABLE1.find(function(d) { return d.Year === yr; }) ||
                TABLE1.filter(function(d) { return d.Year <= state.yearRange[1]; }).slice(-1)[0] ||
                TABLE1[TABLE1.length - 1];
      var total = d3.sum(SRC_KEYS, function(k) { return row[k]; });
      yrTxt.text(row.Year);
      totTxt.text(d3.format('.2f')(total) + ' Mtoe');
      var labelEl = document.getElementById('donut-yr-label');
      if (labelEl) labelEl.textContent = row.Year;

      g.selectAll('.slice')
        .data(pieLayout(SRC_KEYS.map(function(k) { return { key:k, v:row[k] }; })), function(d) { return d.data.key; })
        .join(
          function(enter) {
            return enter.append('path').attr('class','slice').attr('fill', function(d) { return COLOR(d.data.key); })
              .each(function(d) { this._prev = { startAngle:d.startAngle, endAngle:d.startAngle }; })
              .call(function(sel) {
                sel.transition().duration(700)
                  .attrTween('d', function(d) {
                    var i = d3.interpolate(this._prev, d);
                    return function(t) { this._prev = i(t); return arcNorm(i(t)); }.bind(this);
                  });
              })
              .on('click', function(ev, d) {
                state.selectedSource = (state.selectedSource === d.data.key) ? null : d.data.key;
                state.selectedYear   = null;
                broadcast();
              })
              .on('mousemove', function(ev, d) {
                moveTT(ev);
                var pct = ((d.data.v / total) * 100).toFixed(1);
                showTT('<b>' + SRC_LBL[d.data.key] + '</b><br/>' + d3.format('.3f')(d.data.v) + ' Mtoe<br/>' + pct + '% of total');
                d3.select(ev.currentTarget).attr('d', arcHover);
              })
              .on('mouseleave', function(ev) { hideTT(); d3.select(ev.currentTarget).attr('d', arcNorm); });
          },
          function(update) {
            return update.call(function(sel) {
              sel.transition().duration(450)
                .attrTween('d', function(d) {
                  var i = d3.interpolate(this._prev || d, d);
                  return function(t) { this._prev = i(t); return arcNorm(i(t)); }.bind(this);
                });
            });
          },
          function(exit) { return exit.remove(); }
        );
    }

    drawDonut(activeYear());

    updaters.donut = function() {
      drawDonut(activeYear());
      setTimeout(function() {
        g.selectAll('.slice')
          .classed('fade',   function(d) { return state.selectedSource !== null && d.data.key !== state.selectedSource; })
          .classed('active', function(d) { return d.data.key === state.selectedSource; });
        legG.selectAll('.leg-item').classed('fade', function() {
          var k = d3.select(this).attr('data-key');
          return state.selectedSource !== null && k !== state.selectedSource;
        });
      }, 0);
    };
  })();

  // ═══════════════════════════════════════════════════════════
  // CHART 4 — RENEWABLES SHARE BAR
  //   Source: table3, Renewables_Pct (%)
  // ═══════════════════════════════════════════════════════════

  (function buildShare() {
    var wrap = document.getElementById('c-area');
    var M  = { top:10, right:16, bottom:108, left:58 };
    var W  = wrap.clientWidth || 1040;
    var H  = 272;
    var iW = W - M.left - M.right;
    var iH = H - M.top  - M.bottom;

    var svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H)
      .attr('role','img').attr('aria-label','Bar chart of UK renewables share of total energy, 1990-2023');

    var g = svg.append('g').attr('transform','translate(' + M.left + ',' + M.top + ')');

    var xMaj = d3.axisBottom(null).tickFormat(d3.format('d')).tickSize(6);
    var xMin = d3.axisBottom(null).tickFormat('').tickSize(3);
    var yAxis = d3.axisLeft(null).tickFormat(function(d) { return d + '%'; }).ticks(5);

    var gX    = g.append('g').attr('class','axis x-tick-rotated').attr('transform','translate(0,' + iH + ')');
    var gXMin = g.append('g').attr('class','axis-minor').attr('transform','translate(0,' + iH + ')');
    var gY    = g.append('g').attr('class','axis');

    var yrBand = g.append('rect').attr('class','yr-band')
      .attr('height', iH).attr('y', 0).attr('width', 0);

    g.append('text').attr('class','ax-lbl').attr('text-anchor','middle')
      .attr('x', iW/2).attr('y', iH + 46).text('Year');
    g.append('text').attr('class','ax-lbl').attr('transform','rotate(-90)')
      .attr('text-anchor','middle').attr('x', -iH/2).attr('y', -42)
      .text('% of Total UK Energy');

    svg.append('defs').append('linearGradient').attr('id','share-grad')
      .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%')
      .selectAll('stop').data([
        { offset:'0%',   color:'#003c57', opacity:1   },
        { offset:'100%', color:'#7baecb', opacity:0.7 }
      ]).join('stop')
        .attr('offset', function(d) { return d.offset; })
        .attr('stop-color', function(d) { return d.color; })
        .attr('stop-opacity', function(d) { return d.opacity; });

    function renderShare(animate) {
      var data = TABLE3.filter(inRange);
      if (!data.length) return;

      var xSc = d3.scaleBand()
        .domain(data.map(function(d) { return d.Year; }))
        .range([0, iW]).padding(0.18);
      var ySc = d3.scaleLinear()
        .domain([0, d3.max(data, function(d) { return d.Renewables_Pct; }) * 1.15])
        .range([iH, 0]).nice();

      var allYrs = data.map(function(d) { return d.Year; });
      var step = Math.max(1, Math.ceil(allYrs.length / 10));
      var majT = allYrs.filter(function(_, i) { return i % step === 0 || i === allYrs.length - 1; });

      gX.call(xMaj.scale(xSc).tickValues(majT).tickSize(6));
      applyRotation(gX);
      var xScLinear = d3.scaleLinear()
        .domain([d3.min(data, function(d) { return d.Year; }), d3.max(data, function(d) { return d.Year; })])
        .range([xSc(data[0].Year) + xSc.bandwidth()/2,
                xSc(data[data.length-1].Year) + xSc.bandwidth()/2]);
      gXMin.call(
        d3.axisBottom(xScLinear).tickFormat('').tickSize(3)
          .tickValues(minorTicks(data[0].Year, data[data.length-1].Year))
      );
      gY.call(yAxis.scale(ySc));

      var bars = g.selectAll('.share-bar').data(data, function(d) { return d.Year; })
        .join('rect')
          .attr('class','share-bar bar')
          .attr('x', function(d) { return xSc(d.Year); })
          .attr('width', xSc.bandwidth())
          .attr('fill', 'url(#share-grad)')
          .attr('rx', 2)
          .on('click', function(ev, d) {
            var yr = +d.Year;
            if (state.selectedYear === yr) {
              state.selectedYear = null;
              resetYearEnd();
            } else {
              state.selectedYear = yr;
              setYearEnd(yr);
            }
            state.selectedSource = null;
            broadcast();
          })
          .on('mousemove', function(ev, d) {
            moveTT(ev);
            showTT('<b>Year: ' + d.Year + '</b><br/>Renewables: <b>' + d.Renewables_Pct + '%</b><br/>Renewable total: ' + d.Renewable_Mtoe + ' Mtoe');
          })
          .on('mouseleave', hideTT);

      if (animate) {
        bars.attr('y', iH).attr('height', 0)
          .transition().duration(900).ease(d3.easeCubicOut)
          .attr('y', function(d) { return ySc(d.Renewables_Pct); })
          .attr('height', function(d) { return iH - ySc(d.Renewables_Pct); });
      } else {
        bars.transition().duration(350)
          .attr('y', function(d) { return ySc(d.Renewables_Pct); })
          .attr('height', function(d) { return iH - ySc(d.Renewables_Pct); });
      }

      if (xSc.bandwidth() > 20) {
        g.selectAll('.share-lbl').data(data, function(d) { return d.Year; })
          .join('text')
            .attr('class','share-lbl')
            .attr('x', function(d) { return xSc(d.Year) + xSc.bandwidth()/2; })
            .attr('text-anchor','middle')
            .attr('font-size', '7px')
            .attr('fill','var(--muted)')
            .transition().duration(350)
            .attr('y', function(d) { return ySc(d.Renewables_Pct) - 3; })
            .text(function(d) { return d.Renewables_Pct + '%'; });
      } else {
        g.selectAll('.share-lbl').remove();
      }

      setTimeout(function() {
        g.selectAll('.share-bar')
          .classed('fade',   function(d) { return state.selectedYear !== null && d.Year !== state.selectedYear; })
          .classed('active', function(d) { return d.Year === state.selectedYear; });
        if (state.selectedYear !== null &&
            state.selectedYear >= state.yearRange[0] &&
            state.selectedYear <= state.yearRange[1]) {
          var xp = xSc(state.selectedYear);
          yrBand.attr('x', xp - 2).attr('width', xSc.bandwidth() + 4);
        } else {
          yrBand.attr('width', 0);
        }
      }, 0);
    }

    renderShare(true);
    updaters.share = function() { renderShare(false); };
  })();

} // end initDashboard
