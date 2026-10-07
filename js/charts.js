/**
 * charts.js
 * ---------------------------------------------------------------
 * Four chart builders. Each one:
 *   - Reads TABLE1 / TABLE2 / TABLE3 from data.js
 *   - Reads the current selections from state.js
 *   - Registers an updater in `updaters` so broadcast() can
 *     re-render it on any state change.
 *
 * INTERACTION MODEL
 *   Hover           -> temporary highlight + tooltip (no state change)
 *   Click           -> persistent selection (source OR year)
 *   Click again     -> toggle that selection off
 *   Double-click    -> zoom in (line chart and sector chart)
 *   Scroll / drag   -> zoom and pan on zoomable charts
 *   Reset button    -> clears all selections and zoom
 *
 * Source and year selections are INDEPENDENT: picking a source
 * does not clear the selected year, and vice versa. That makes
 * the dashboard analytically useful ("Bioenergy in 2020") rather
 * than just hover-driven.
 *
 * Credits
 *   Treemap layout follows the official D3 treemap documentation
 *   at d3js.org/d3-hierarchy/treemap. The area + line + dots
 *   composition for the share chart follows the d3-shape area
 *   chart pattern. Zoom behaviour uses d3.zoom as documented at
 *   d3js.org/d3-zoom.
 * ---------------------------------------------------------------
 */

'use strict';


/* =============================================================
   CHART A - MULTI-LINE: RENEWABLE SOURCES OVER TIME
   Answers the first half of the dashboard question:
   "Which sources drove renewable growth?"

   Zoom (Part-2 update)
     Double-click    -> zoom in 2x on that point (reset past 4x)
     Scroll wheel    -> zoom in / out
     Drag            -> pan horizontally when zoomed
     Reset button    -> resets zoom along with selections
   Only the time (x) axis zooms; the value axis stays fixed so
   direct comparison across sources remains valid.
   ============================================================= */
function buildLineChart() {
  const wrap = document.getElementById('c-line');
  const M  = { top: 10, right: 16, bottom: 92, left: 52 };
  const W  = wrap.clientWidth  || 520;
  const H  = wrap.clientHeight || 280;
  const iW = W - M.left - M.right;
  const iH = H - M.top  - M.bottom;

  const svg = d3.select(wrap).append('svg')
    .attr('width',  W)
    .attr('height', H)
    .attr('role', 'img')
    .attr('aria-label',
      'Multi-line chart of UK renewable energy by source, 1990 to 2023. Double-click or scroll to zoom.');

  /* Clip the plotting area so zoomed lines never spill into the
     axis gutters or the legend below. */
  svg.append('defs').append('clipPath').attr('id', 'clip-ln')
    .append('rect').attr('width', iW).attr('height', iH + 4).attr('y', -2);

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  /* Base scales. xSc is the unzoomed reference; xZ is the current
     zoomed scale used for drawing. */
  const xSc = d3.scaleLinear().domain([FIRST_YEAR, LAST_YEAR]).range([0, iW]);
  const ySc = d3.scaleLinear().range([iH, 0]).nice();
  let   xZ  = xSc.copy();

  const xMaj = d3.axisBottom(xZ).tickFormat(fmtInt).tickSize(6)
                 .tickValues(majorTicks(FIRST_YEAR, LAST_YEAR));
  const xMin = d3.axisBottom(xZ).tickFormat('').tickSize(3)
                 .tickValues(minorTicks(FIRST_YEAR, LAST_YEAR));
  const yAxis = d3.axisLeft(ySc).tickFormat(fmt2).ticks(5);

  const gX    = g.append('g').attr('class', 'axis x-tick-rotated').attr('transform', `translate(0,${iH})`);
  const gXMin = g.append('g').attr('class', 'axis-minor').attr('transform', `translate(0,${iH})`);
  const gY    = g.append('g').attr('class', 'axis');

  /* Axis titles. */
  g.append('text').attr('class', 'ax-lbl').attr('text-anchor', 'middle')
    .attr('x', iW / 2).attr('y', iH + 42).text('Year');
  g.append('text').attr('class', 'ax-lbl').attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle').attr('x', -iH / 2).attr('y', -40)
    .text('Energy Consumption (Mtoe)');

  /* Small hint in the top-right so the zoom is discoverable. */
  const hint = svg.append('text').attr('class', 'zoom-hint')
    .attr('x', W - M.right).attr('y', 10)
    .attr('text-anchor', 'end')
    .text('Double-click or scroll to zoom');

  /* Line generator; uses xZ so lines redraw on zoom. */
  const lineGen = d3.line()
    .x(d => xZ(d.Year))
    .y(d => ySc(d.v))
    .curve(d3.curveMonotoneX);

  const srcSeries = SRC_KEYS.map(k => ({
    key: k,
    pts: TABLE1.map(d => ({ Year: d.Year, v: d[k] }))
  }));

  const xhair = g.append('line').attr('class', 'xhair')
                 .attr('y1', 0).attr('y2', iH).style('display', 'none');

  /* Invisible overlay handles hover (crosshair + tooltip) and the
     year-select click. It sits beneath the lines so line-specific
     hovers still take precedence. */
  const overlay = g.append('rect').attr('class', 'overlay')
    .attr('width', iW).attr('height', iH)
    .on('mousemove', function(ev) {
      const mx = d3.pointer(ev)[0];
      const yr = Math.round(xZ.invert(mx));
      const row = TABLE1.find(d => d.Year === yr);
      if (!row) return;
      const snapX = xZ(yr);
      xhair.attr('x1', snapX).attr('x2', snapX).style('display', 'block');
      moveTT(ev);
      showTT(
        `<b>Year ${yr}</b>` +
        SRC_KEYS.map(k =>
          `<br/>${SRC_LBL[k]}: <b>${fmt3(row[k])}</b> Mtoe`).join('')
      );
    })
    .on('mouseleave', () => {
      /* Restore the crosshair to the selected year if there is one. */
      if (hasExplicitYear()) {
        xhair.attr('x1', xZ(state.selectedYear))
             .attr('x2', xZ(state.selectedYear))
             .style('display', 'block');
      } else {
        xhair.style('display', 'none');
      }
      hideTT();
    })
    .on('click', function(ev) {
      /* Single click on empty area -> select that year. */
      const yr = Math.round(xZ.invert(d3.pointer(ev)[0]));
      selectYear(yr);
    });

  const linesG = g.append('g').attr('clip-path', 'url(#clip-ln)');

  /* Draws every source path. When `animate` is true, paths enter
     with a dashoffset reveal; otherwise they transition smoothly. */
  function drawLines(data, animate) {
    const filtSeries = srcSeries.map(s => ({
      key: s.key,
      pts: s.pts.filter(p => p.Year >= data[0].Year && p.Year <= data[data.length - 1].Year)
    }));
    const paths = linesG.selectAll('.src-line')
      .data(filtSeries, d => d.key)
      .join('path')
        .attr('class', 'src-line')
        .attr('stroke', d => COLOR(d.key));

    if (animate) {
      paths.attr('d', d => lineGen(d.pts)).each(function() {
        /* Guard against environments where getTotalLength is missing. */
        let len = 0;
        try { len = this.getTotalLength(); } catch (e) { len = 0; }
        if (!len) return;
        d3.select(this)
          .attr('stroke-dasharray', len)
          .attr('stroke-dashoffset', len)
          .transition().duration(1000).ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
          .on('end', function() {
            d3.select(this).attr('stroke-dasharray', 'none').attr('stroke-dashoffset', null);
          });
      });
    } else {
      paths.attr('stroke-dasharray', 'none').attr('stroke-dashoffset', null)
        .attr('d', d => lineGen(d.pts));
    }

    paths
      .on('click', function(ev, d) {
        ev.stopPropagation();
        selectSource(d.key);
      })
      .on('mousemove', function(ev, d) {
        ev.stopPropagation();
        const yr = Math.round(xZ.invert(d3.pointer(ev)[0]));
        const pt = d.pts.find(p => p.Year === yr);
        if (!pt) return;
        moveTT(ev);
        showTT(
          `<b>${SRC_LBL[d.key]}</b><br/>` +
          `Year ${yr}<br/>` +
          `Value: <b>${fmt3(pt.v)}</b> Mtoe`
        );
      })
      .on('mouseleave', hideTT);
  }

  /* Legend: two rows of three, below the rotated tick labels. */
  const legG = g.append('g').attr('transform', `translate(0,${iH + 54})`);
  SRC_KEYS.forEach((k, i) => {
    const item = legG.append('g')
      .attr('class', 'leg-item').attr('data-key', k)
      .attr('transform', `translate(${(i % 3) * 132},${Math.floor(i / 3) * 15})`);
    item.append('rect').attr('width', 9).attr('height', 9).attr('y', -8).attr('rx', 2).attr('fill', COLOR(k));
    item.append('text').attr('x', 12).attr('y', 0).attr('font-size', '9px').attr('fill', 'var(--muted)').text(SRC_LBL[k]);
    item.on('click', () => selectSource(k));
  });

  /* ---- Zoom behaviour ----
     Zoom is attached to the SVG so the wheel, drag and custom
     double-click all travel through the same transform. Only the
     x scale is rescaled; the y scale stays fixed so cross-source
     comparisons remain valid. */
  const zoom = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([[0, 0], [iW, iH]])
    .extent([[0, 0], [iW, iH]])
    .on('zoom', zoomed);

  svg.call(zoom).on('dblclick.zoom', dblclickZoom);

  function dblclickZoom(ev) {
    /* Custom double-click: zoom in 2x on the clicked point. If
       already zoomed past 4x, reset. Matches the sector chart
       interaction so the dashboard feels consistent. */
    const t = d3.zoomTransform(svg.node());
    const [mx] = d3.pointer(ev, svg.node());
    const localX = mx - M.left;
    if (localX < 0 || localX > iW) return;
    if (t.k >= 4) {
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    } else {
      const newK = Math.min(12, t.k * 2);
      const cx   = (localX - t.x) / t.k;
      const tx   = localX - cx * newK;
      svg.transition().duration(400)
         .call(zoom.transform, d3.zoomIdentity.translate(tx, 0).scale(newK));
    }
  }

  function zoomed(ev) {
    xZ = ev.transform.rescaleX(xSc);
    /* Regenerate tick values so they fall on whole years inside the
       visible range. Without this the axis shows fractional years. */
    const vs = Math.ceil(xZ.domain()[0]);
    const ve = Math.floor(xZ.domain()[1]);
    gX.call(xMaj.scale(xZ).tickValues(majorTicks(vs, ve)).tickSize(6));
    gXMin.call(xMin.scale(xZ).tickValues(minorTicks(vs, ve)).tickSize(3));
    applyRotation(gX);
    /* Redraw every line with the new x scale. */
    linesG.selectAll('.src-line').attr('d', d => lineGen(d.pts));
    /* Keep the selected-year crosshair anchored correctly. */
    if (hasExplicitYear()) {
      xhair.attr('x1', xZ(state.selectedYear)).attr('x2', xZ(state.selectedYear));
    }
    hint.text(ev.transform.k > 1.01
      ? `Zoom ${ev.transform.k.toFixed(1)}x - double-click at 4x+ to reset`
      : 'Double-click or scroll to zoom');
  }

  /* Header Reset also clears the zoom. Capture phase so the zoom
     resets before the state updaters fire, which avoids a frame
     drawn at the old zoom. */
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      svg.call(zoom.transform, d3.zoomIdentity);
    }, true);
  }

  /* ---- Range-select brush (Part-2 self-study addition) ----
     d3.brushX overlay layered above the lines. Toggled on by the
     "Range select" header button. Drag-release commits a year range
     to the global state and syncs the dropdowns. Reference:
     d3.brush docs at d3js.org/d3-brush. */
  const brush = d3.brushX()
    .extent([[0, 0], [iW, iH]])
    .on('end', brushEnded);

  /* Brush group sits on top so it captures the drag. Hidden until
     the user toggles brush mode. */
  const brushG = g.append('g').attr('class', 'brush-group');
  brushG.style('display', 'none');

  let brushMode = false;

  function brushEnded(ev) {
    /* Reentrancy guard: programmatic brush.move(null) inside
       exitBrushMode also fires this event. Skip when we are already
       tearing down. */
    if (!brushMode) return;
    /* No selection (plain click) -> just clear and exit. */
    if (!ev.selection) { exitBrushMode(); return; }
    const [x0, x1] = ev.selection;
    let yA = Math.round(xZ.invert(x0));
    let yB = Math.round(xZ.invert(x1));
    /* Sort and clamp to the dataset bounds. */
    const yMin = Math.max(FIRST_YEAR, Math.min(yA, yB));
    const yMax = Math.min(LAST_YEAR,  Math.max(yA, yB));
    /* Need at least a 2-year window for a meaningful range. */
    if (yMax - yMin < 1) { exitBrushMode(); return; }

    /* Sync the dropdowns so the visible filter state matches. */
    const sStart = document.getElementById('yrStart');
    const sEnd   = document.getElementById('yrEnd');
    if (sStart) sStart.value = yMin;
    if (sEnd)   sEnd.value   = yMax;

    /* Push to shared state and refresh every chart. */
    state.yearRange = [yMin, yMax];
    /* If the previously selected year falls outside the new range,
       drop it so badges stay honest. */
    if (state.selectedYear !== null &&
        (state.selectedYear < yMin || state.selectedYear > yMax)) {
      state.selectedYear = null;
    }
    /* Exit brush mode FIRST so the recursive end-event from
       brush.move(null) is skipped by the guard above. */
    exitBrushMode();
    broadcast();
  }

  function enterBrushMode() {
    brushMode = true;
    /* Suspend zoom while brushing so the wheel and drag both go to
       the brush handler without competing transforms. */
    svg.on('.zoom', null);
    overlay.style('pointer-events', 'none');
    brushG.style('display', null).call(brush);
    const btn = document.getElementById('brushBtn');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
    hint.text('Drag across the chart to set a year range');
  }

  function exitBrushMode() {
    brushMode = false;
    brushG.call(brush.move, null);
    brushG.style('display', 'none');
    overlay.style('pointer-events', 'all');
    /* Re-attach zoom and the custom dblclick handler. */
    svg.call(zoom).on('dblclick.zoom', dblclickZoom);
    const btn = document.getElementById('brushBtn');
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
    /* Restore the zoom hint text from the current transform. */
    const t = d3.zoomTransform(svg.node());
    hint.text(t.k > 1.01
      ? `Zoom ${t.k.toFixed(1)}x - double-click at 4x+ to reset`
      : 'Double-click or scroll to zoom');
  }

  /* Wire up the toggle button. */
  const brushBtn = document.getElementById('brushBtn');
  if (brushBtn) {
    brushBtn.addEventListener('click', function() {
      if (brushMode) exitBrushMode(); else enterBrushMode();
    });
  }

  /* Reset must also exit brush mode so state is clean. */
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      if (brushMode) exitBrushMode();
    }, true);
  }

  /* Initial render. */
  const initData = TABLE1.filter(inRange);
  ySc.domain([0, d3.max(initData, d => d3.max(SRC_KEYS, k => d[k])) * 1.08]).nice();
  gX.call(xMaj); gXMin.call(xMin); applyRotation(gX); gY.call(yAxis);
  drawLines(initData, true);

  /* Register updater so the chart redraws on any state change. */
  updaters.line = function() {
    const data = TABLE1.filter(inRange);
    if (!data.length) return;
    const rS = data[0].Year, rE = data[data.length - 1].Year;

    xSc.domain([rS, rE]);
    /* Apply the current zoom transform to the new base scale so the
       user's zoom state is preserved across year-range changes. */
    const t = d3.zoomTransform(svg.node());
    xZ = t.rescaleX(xSc);

    /* Y-axis scaling. When no source is selected, use the global
       max across all six sources so they sit on a comparable
       scale. When one source is selected, rescale to that source's
       own max so its growth becomes visible. Solar PV peaks
       around 1.19 Mtoe in 2023, which is invisible on a scale
       designed to fit Bioenergy at 13 Mtoe, so this rescaling is
       the difference between a flat line and a clear trend. */
    const sel = state.selectedSource;
    let yMax;
    if (sel) {
      yMax = d3.max(data, d => d[sel]) * 1.15;
      if (!yMax || yMax < 0.05) yMax = 0.1;
    } else {
      yMax = d3.max(data, d => d3.max(SRC_KEYS, k => d[k])) * 1.08;
    }
    ySc.domain([0, yMax]).nice();

    const vs = Math.ceil(xZ.domain()[0]);
    const ve = Math.floor(xZ.domain()[1]);
    gX.transition().duration(350).call(xMaj.scale(xZ).tickValues(majorTicks(vs, ve)).tickSize(6));
    gXMin.transition().duration(350).call(xMin.scale(xZ).tickValues(minorTicks(vs, ve)).tickSize(3));
    applyRotation(gX);
    gY.transition().duration(350).call(yAxis);
    drawLines(data, false);

    /* Selection styling for paths and legend. */
    linesG.selectAll('.src-line')
      .classed('fade',   d => state.selectedSource !== null && d.key !== state.selectedSource)
      .classed('active', d => d.key === state.selectedSource);
    legG.selectAll('.leg-item')
      .classed('fade', function() {
        const k = d3.select(this).attr('data-key');
        return state.selectedSource !== null && k !== state.selectedSource;
      })
      .classed('active', function() {
        return d3.select(this).attr('data-key') === state.selectedSource;
      });

    /* Selected-year crosshair. */
    if (hasExplicitYear()) {
      xhair.attr('x1', xZ(state.selectedYear))
           .attr('x2', xZ(state.selectedYear))
           .style('display', 'block');
    } else {
      xhair.style('display', 'none');
    }
  };
}


/* =============================================================
   CHART B - TREEMAP: SOURCE MIX IN THE ACTIVE YEAR
   Replaces the Part-1 donut. Treemaps communicate part-to-whole
   hierarchically and use rectangular space more efficiently than
   arcs. Treemap layout follows the official D3 treemap docs.

   A compact legend strip below the treemap keeps small tiles
   (Hydro, Landfill Gas, Sewage Gas in low-share years) identifiable
   by colour and name even when the tile itself is too small to
   hold a label. Tile labels use tiered sizing so medium tiles still
   show a shortened label.
   ============================================================= */
function buildTreemap() {
  const wrap = document.getElementById('c-tree');
  const W = wrap.clientWidth  || 420;
  const H = wrap.clientHeight || 240;

  /* Reserve space for the compact legend strip below. */
  const LEG_H = 34;
  const tmH   = Math.max(60, H - LEG_H);

  const svg = d3.select(wrap).append('svg')
    .attr('width', W).attr('height', H)
    .attr('role', 'img')
    .attr('aria-label', 'Treemap of renewable source mix for the active year');

  /* Per-tile clip paths so labels never visually overflow into
     neighbouring tiles or the panel edge. One clipPath per source. */
  const defs = svg.append('defs');
  SRC_KEYS.forEach(k => {
    defs.append('clipPath').attr('id', `tm-clip-${k}`).append('rect');
  });

  const g = svg.append('g');

  /* Legend strip: always shows all six sources (colour + name),
     two rows of three so small tiles stay identifiable even when
     the tile cannot fit its own inline label. */
  const legG = svg.append('g').attr('class', 'tm-legend')
    .attr('transform', `translate(6,${tmH + 4})`);

  const cols = 3;
  const colW = (W - 12) / cols;
  SRC_KEYS.forEach((k, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const item = legG.append('g')
      .attr('class', 'tm-leg-item')
      .attr('data-key', k)
      .attr('transform', `translate(${col * colW},${row * 14})`)
      .on('click', () => selectSource(k))
      .on('mousemove', function(ev) {
        moveTT(ev);
        showTT(`<b>${SRC_LBL[k]}</b><br/>Click to focus this source`);
      })
      .on('mouseleave', hideTT);
    item.append('rect')
      .attr('class', 'tm-leg-swatch')
      .attr('width', 10).attr('height', 10)
      .attr('rx', 2).attr('fill', COLOR(k));
    item.append('text')
      .attr('class', 'tm-leg-text')
      .attr('x', 14).attr('y', 9)
      .text(SRC_LBL[k]);
  });

  /* Tile label sizing. Always uses the full source name from
     SRC_LBL. Font size is picked from tile height. The clip-path
     defined per source above hides any horizontal overflow at the
     tile boundary, so every reasonably sized tile carries an
     inline label. The legend below the treemap remains the safety
     net for tiles that fall under the smallest threshold. */
  function chooseLabel(d) {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    const text = SRC_LBL[d.data.name];
    if (w >= 22 && h >= 24) return { text: text, size: 11 };
    if (w >= 22 && h >= 20) return { text: text, size: 10 };
    if (w >= 20 && h >= 16) return { text: text, size:  9 };
    if (w >= 18 && h >= 13) return { text: text, size:  8 };
    return { text: '', size: 0 };
  }
  function fitLabel(textEl, d) {
    const c = chooseLabel(d);
    textEl.text(c.text).style('font-size', c.size + 'px');
  }
  function pctFor(d, total) {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    if (w > 70 && h > 42) return `${fmt1((d.value / total) * 100)}%`;
    return '';
  }

  function render() {
    const yr = activeYear();
    const row = TABLE1.find(d => d.Year === yr);
    document.getElementById('treeYrLbl').textContent = yr;

    /* Build hierarchical data for d3.treemap. Tiny floor so empty
       slices still receive a visible (non-zero) layout area. */
    const rootData = {
      name: 'Renewables',
      children: SRC_KEYS.map(k => ({ name: k, value: row[k] || 0.0001 }))
    };
    const root = d3.hierarchy(rootData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([W, tmH])
      .paddingInner(2)
      .round(true)(root);

    const total  = root.value;
    const leaves = root.leaves();

    /* Update each per-source clipPath to match the current tile
       layout for this year. Done before tiles render so the text
       elements pick up the correct clip immediately. */
    leaves.forEach(leaf => {
      defs.select(`#tm-clip-${leaf.data.name} rect`)
        .attr('x', leaf.x0).attr('y', leaf.y0)
        .attr('width',  Math.max(0, leaf.x1 - leaf.x0 - 2))
        .attr('height', Math.max(0, leaf.y1 - leaf.y0 - 2));
    });

    /* Data join on source name keeps tiles stable across year
       changes (smooth transitions, no enter/exit flicker). */
    const tiles = g.selectAll('.tm-g').data(leaves, d => d.data.name);
    const tilesEnter = tiles.enter().append('g').attr('class', 'tm-g');

    tilesEnter.append('rect').attr('class', 'tm-tile')
      .attr('fill', d => COLOR(d.data.name))
      .attr('x', d => d.x0).attr('y', d => d.y0)
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .on('click', (ev, d) => selectSource(d.data.name))
      .on('mousemove', function(ev, d) {
        moveTT(ev);
        const pct = fmt1((d.value / total) * 100);
        showTT(
          `<b>${SRC_LBL[d.data.name]}</b><br/>` +
          `Year ${yr}<br/>` +
          `Value: <b>${fmt3(d.value)}</b> Mtoe<br/>` +
          `${pct}% of renewable total`
        );
      })
      .on('mouseleave', hideTT);

    tilesEnter.append('text').attr('class', 'tm-label')
      .attr('clip-path', d => `url(#tm-clip-${d.data.name})`)
      .attr('x', d => d.x0 + 6).attr('y', d => d.y0 + 14)
      .each(function(d) { fitLabel(d3.select(this), d); });
    tilesEnter.append('text').attr('class', 'tm-value')
      .attr('clip-path', d => `url(#tm-clip-${d.data.name})`)
      .attr('x', d => d.x0 + 6).attr('y', d => d.y0 + 28)
      .text(d => pctFor(d, total));

    /* Update existing tiles with a smooth transition. */
    tiles.select('.tm-tile').transition().duration(500)
      .attr('x', d => d.x0).attr('y', d => d.y0)
      .attr('width',  d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0));
    tiles.select('.tm-label')
      .attr('x', d => d.x0 + 6).attr('y', d => d.y0 + 14)
      .each(function(d) { fitLabel(d3.select(this), d); });
    tiles.select('.tm-value').transition().duration(500)
      .attr('x', d => d.x0 + 6).attr('y', d => d.y0 + 28)
      .text(d => pctFor(d, total));

    tiles.exit().remove();

    /* Selection mirroring: matching tile stays sharp, others fade. */
    g.selectAll('.tm-tile')
      .classed('fade',   d => state.selectedSource !== null && d.data.name !== state.selectedSource)
      .classed('active', d => d.data.name === state.selectedSource);

    /* Same treatment on the legend strip. */
    legG.selectAll('.tm-leg-item')
      .classed('fade', function() {
        const k = d3.select(this).attr('data-key');
        return state.selectedSource !== null && k !== state.selectedSource;
      })
      .classed('active', function() {
        return d3.select(this).attr('data-key') === state.selectedSource;
      });
  }

  render();
  updaters.tree = render;
}


/* =============================================================
   CHART C - RENEWABLES SHARE AREA + LINE + DOTS
   Answers the second half of the dashboard question:
   "How did renewable growth change the share of UK energy?"
   A static annotation highlights the 2020 structural jump that
   reflects both renewable growth and a pandemic-driven fall in
   total UK energy consumption.
   ============================================================= */
function buildShareChart() {
  const wrap = document.getElementById('c-share');
  const M  = { top: 12, right: 18, bottom: 50, left: 46 };
  const W  = wrap.clientWidth  || 520;
  const H  = wrap.clientHeight || 250;
  const iW = W - M.left - M.right;
  const iH = H - M.top  - M.bottom;

  const svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H)
    .attr('role', 'img').attr('aria-label', 'Area chart of UK renewables share of total energy, 1990 to 2023');

  /* Gradient for the filled area under the line. */
  const defs = svg.append('defs');
  const grad = defs.append('linearGradient').attr('id', 'share-grad')
    .attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
  grad.append('stop').attr('offset', '0%').attr('stop-color', '#005a7a').attr('stop-opacity', 0.55);
  grad.append('stop').attr('offset', '100%').attr('stop-color', '#7baecb').attr('stop-opacity', 0.05);

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  const xSc = d3.scaleLinear().range([0, iW]);
  const ySc = d3.scaleLinear().range([iH, 0]);

  const xAxis = d3.axisBottom(xSc).tickFormat(fmtInt).tickSize(6);
  const yAxis = d3.axisLeft(ySc).tickFormat(d => d + '%').ticks(5);

  const gX = g.append('g').attr('class', 'axis x-tick-rotated').attr('transform', `translate(0,${iH})`);
  const gY = g.append('g').attr('class', 'axis');

  g.append('text').attr('class', 'ax-lbl').attr('text-anchor', 'middle')
    .attr('x', iW / 2).attr('y', iH + 38).text('Year');
  g.append('text').attr('class', 'ax-lbl').attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle').attr('x', -iH / 2).attr('y', -32)
    .text('Renewable Share (%)');

  const yrBand = g.append('rect').attr('class', 'yr-band')
    .attr('y', 0).attr('height', iH).attr('width', 0);

  /* Static annotation: the 2020 jump corresponds to both renewable
     growth AND a pandemic-driven fall in total UK energy use. */
  const annG = g.append('g').attr('class', 'share-ann').style('display', 'none');
  annG.append('line').attr('class', 'share-ann-line');
  annG.append('text').attr('class', 'share-ann-text');

  /* Area + line generators. Pattern follows the d3-shape docs. */
  const areaGen = d3.area()
    .x(d => xSc(d.Year))
    .y0(iH)
    .y1(d => ySc(d.Renewables_Pct))
    .curve(d3.curveMonotoneX);
  const lineGen = d3.line()
    .x(d => xSc(d.Year))
    .y(d => ySc(d.Renewables_Pct))
    .curve(d3.curveMonotoneX);

  const areaPath = g.append('path').attr('class', 'share-area');
  const linePath = g.append('path').attr('class', 'share-line');

  function render(animate) {
    const data = TABLE3.filter(inRange);
    if (!data.length) return;
    const rS = data[0].Year;
    const rE = data[data.length - 1].Year;

    xSc.domain([rS, rE]);
    ySc.domain([0, d3.max(data, d => d.Renewables_Pct) * 1.15]).nice();

    /* Adaptive tick density: ~10 major ticks across the range. */
    const allYrs = data.map(d => d.Year);
    const step = Math.max(1, Math.ceil(allYrs.length / 10));
    const majT = allYrs.filter((_, i) => i % step === 0 || i === allYrs.length - 1);

    gX.transition().duration(animate ? 600 : 350).call(xAxis.scale(xSc).tickValues(majT));
    applyRotation(gX);
    gY.transition().duration(animate ? 600 : 350).call(yAxis.scale(ySc));

    areaPath.datum(data).transition().duration(animate ? 700 : 350).attr('d', areaGen);
    linePath.datum(data).transition().duration(animate ? 700 : 350).attr('d', lineGen);

    const pts = g.selectAll('.share-pt').data(data, d => d.Year)
      .join('circle')
        .attr('class', 'share-pt')
        .attr('r', 3.5)
        .on('click', (ev, d) => selectYear(d.Year))
        .on('mousemove', function(ev, d) {
          moveTT(ev);
          /* Year-over-year change gives useful trend context. */
          const idx  = data.indexOf(d);
          const prev = idx > 0 ? data[idx - 1] : null;
          const dChg = prev ? (d.Renewables_Pct - prev.Renewables_Pct) : null;
          const chgHtml = dChg === null ? '' :
            `<br/>Change vs previous year: <b>${dChg >= 0 ? '+' : ''}${fmt1(dChg)}pp</b>`;
          /* Absolute renewables value behind the percentage. Pulled
             from the source-side total (TABLE1) for the same year so
             the tooltip carries both the share and the underlying
             renewables consumption. */
          const row1 = TABLE1.find(r => r.Year === d.Year);
          const absHtml = row1 ? `<br/>Total renewables: <b>${fmt2(row1.Total)}</b> Mtoe` : '';
          showTT(
            `<b>Year ${d.Year}</b><br/>` +
            `Renewable share: <b>${d.Renewables_Pct}%</b>` +
            chgHtml +
            absHtml
          );
        })
        .on('mouseleave', hideTT);

    pts.transition().duration(animate ? 700 : 350)
      .attr('cx', d => xSc(d.Year))
      .attr('cy', d => ySc(d.Renewables_Pct));

    pts.classed('active', d => d.Year === state.selectedYear)
       .classed('fade',   d => hasExplicitYear() && d.Year !== state.selectedYear);

    /* Annotation for the 2020 point if it lies inside the current range. */
    const annRow = data.find(d => d.Year === 2020);
    if (annRow) {
      const ax = xSc(2020);
      const ay = ySc(annRow.Renewables_Pct);
      annG.style('display', null);
      annG.select('line').attr('x1', ax).attr('x2', ax).attr('y1', ay - 4).attr('y2', Math.max(ay - 32, 4));
      annG.select('text')
        .attr('x', ax - 3).attr('y', Math.max(ay - 36, 10))
        .attr('text-anchor', 'end')
        .text('2020 jump: renewables rose, total energy fell');
    } else {
      annG.style('display', 'none');
    }

    /* Year-band highlight for the selected year. */
    if (hasExplicitYear()) {
      const xp = xSc(state.selectedYear);
      yrBand.attr('x', xp - 4).attr('width', 8);
    } else {
      yrBand.attr('width', 0);
    }
  }

  render(true);
  updaters.share = function() { render(false); };
}


/* =============================================================
   CHART D - HORIZONTAL BAR: SECTOR COMPARISON (ACTIVE YEAR)
   Supporting context panel. The Part-1 grouped bar packed 34
   years * 5 sectors = 170 bars into a narrow panel, drowning the
   year-to-year trend. Since the dashboard already has a year
   selector and a treemap tied to that year, this panel now shows
   a clean single-year horizontal bar chart sorted by value so
   the dominant sector reads first.

   Zoom support (Part-2 update)
     Double-click a bar  -> zoom in 2x
     Scroll wheel        -> zoom in / out
     Drag                -> pan horizontally when zoomed
     Double-click at 4x+ -> resets to 1x
     Reset button        -> also resets the zoom
   Only the value (x) axis zooms; sector labels stay fixed.
   ============================================================= */
function buildSectorChart() {
  const wrap = document.getElementById('c-sector');
  const M  = { top: 12, right: 56, bottom: 36, left: 168 };
  const W  = wrap.clientWidth  || 520;
  const H  = wrap.clientHeight || 250;
  const iW = W - M.left - M.right;
  const iH = H - M.top  - M.bottom;

  const svg = d3.select(wrap).append('svg').attr('width', W).attr('height', H)
    .attr('role', 'img')
    .attr('aria-label', 'Horizontal bar chart of UK renewable use by sector for the active year. Double-click or scroll to zoom.');

  /* Clip path so zoomed bars never spill outside the plot area. */
  svg.append('defs').append('clipPath').attr('id', 'clip-sec')
    .append('rect').attr('x', 0).attr('y', 0)
    .attr('width', iW + M.right).attr('height', iH + 1);

  const g = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);

  /* Bars + value labels render inside the clipped group so the zoom
     transform can push them beyond the plot width without bleeding
     into the sector-label column on the left. */
  const plotG = g.append('g').attr('clip-path', 'url(#clip-sec)');

  const xSc = d3.scaleLinear().range([0, iW]);
  const ySc = d3.scaleBand().range([0, iH]).padding(0.22);

  /* Current zoomed x-scale. Starts equal to xSc; rescaleX replaces it. */
  let xZ = xSc.copy();

  const xAxis = d3.axisBottom(xZ).tickFormat(fmt1).ticks(5);
  const yAxis = d3.axisLeft(ySc);

  const gX = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${iH})`);
  const gY = g.append('g').attr('class', 'axis');

  g.append('text').attr('class', 'ax-lbl').attr('text-anchor', 'middle')
    .attr('x', iW / 2).attr('y', iH + 30).text('Sector Value (Mtoe)');

  /* Small hint so the zoom capability is discoverable. */
  const hint = svg.append('text').attr('class', 'zoom-hint')
    .attr('x', W - M.right).attr('y', 10)
    .attr('text-anchor', 'end')
    .text('Double-click or scroll to zoom');

  /* Short y-axis labels to avoid crowding the left gutter. */
  const SEC_SHORT = {
    Energy_Supply:  'Energy Supply',
    Manufacturing:  'Manufacturing',
    Other_Industry: 'Other Industry',
    Services:       'Services',
    Agriculture:    'Agriculture'
  };

  /* ---- Zoom behaviour ---- */
  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [iW, iH]])
    .extent([[0, 0], [iW, iH]])
    .on('zoom', zoomed);

  svg.call(zoom).on('dblclick.zoom', function(ev) {
    /* Custom double-click: zoom in 2x on the clicked point. If
       already zoomed past 4x, reset. Matches the line chart. */
    const t = d3.zoomTransform(svg.node());
    const [mx] = d3.pointer(ev, svg.node());
    const localX = mx - M.left;
    if (localX < 0 || localX > iW) return;
    if (t.k >= 4) {
      svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    } else {
      const newK = Math.min(10, t.k * 2);
      const cx   = (localX - t.x) / t.k;
      const tx   = localX - cx * newK;
      svg.transition().duration(400)
         .call(zoom.transform, d3.zoomIdentity.translate(tx, 0).scale(newK));
    }
  });

  function applyZoom(t) {
    xZ = t.rescaleX(xSc);
    gX.call(xAxis.scale(xZ));
    plotG.selectAll('.sec-bar')
      .attr('x', xZ(0))
      .attr('width', d => Math.max(0, xZ(d.val) - xZ(0)));
    plotG.selectAll('.sec-val-lbl')
      .attr('x', d => xZ(d.val) + 6);
    hint.text(t.k > 1.01
      ? `Zoom ${t.k.toFixed(1)}x - double-click at 4x+ to reset`
      : 'Double-click or scroll to zoom');
  }

  function zoomed(ev) { applyZoom(ev.transform); }

  /* Header Reset also clears the zoom. Capture phase so the zoom
     resets before main.js's state reset fires, avoiding an
     intermediate frame at the old zoom. */
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      svg.call(zoom.transform, d3.zoomIdentity);
    }, true);
  }

  function render(animate) {
    const yr  = activeYear();
    const row = TABLE2.find(d => d.Year === yr);
    if (!row) return;

    document.getElementById('secYrLbl').textContent = yr;

    /* One row per sector, sorted descending by value. */
    const rows = SEC_KEYS.map(k => ({ sec: k, val: +row[k] || 0 }))
                         .sort((a, b) => b.val - a.val);
    const total = rows.reduce((s, r) => s + r.val, 0) || 1;

    xSc.domain([0, d3.max(rows, r => r.val) * 1.15 || 1]).nice();
    ySc.domain(rows.map(r => r.sec));

    /* Preserve the current zoom transform across year changes so
       the user's zoom state isn't lost when they pick a new year. */
    const t = d3.zoomTransform(svg.node());
    xZ = t.rescaleX(xSc);

    gY.transition().duration(animate ? 500 : 300)
      .call(yAxis.scale(ySc).tickFormat(k => SEC_SHORT[k]));
    gX.transition().duration(animate ? 500 : 300).call(xAxis.scale(xZ));

    /* Bars. Sector key as join key gives smooth re-order transitions. */
    const bars = plotG.selectAll('.sec-bar').data(rows, d => d.sec);

    bars.join(
      enter => enter.append('rect')
        .attr('class', 'sec-bar bar')
        .attr('x', xZ(0))
        .attr('y', d => ySc(d.sec))
        .attr('height', ySc.bandwidth())
        .attr('width', 0)
        .attr('fill', d => COLOR(d.sec))
        .attr('rx', 2)
        .on('mousemove', function(ev, d) {
          moveTT(ev);
          const pct = fmt1((d.val / total) * 100);
          showTT(
            `<b>${SEC_LBL[d.sec]}</b><br/>` +
            `Year ${yr}<br/>` +
            `Value: <b>${fmt3(d.val)}</b> Mtoe<br/>` +
            `${pct}% of sector chart total`
          );
        })
        .on('mouseleave', hideTT)
        .call(enter => enter.transition().duration(animate ? 700 : 350)
          .attr('x', xZ(0))
          .attr('width', d => Math.max(0, xZ(d.val) - xZ(0)))),
      update => update
        .call(update => update.transition().duration(animate ? 700 : 350)
          .attr('x', xZ(0))
          .attr('y', d => ySc(d.sec))
          .attr('height', ySc.bandwidth())
          .attr('width', d => Math.max(0, xZ(d.val) - xZ(0)))),
      exit => exit.remove()
    );

    /* Value label at the end of each bar (easy read, no hover needed). */
    const labels = plotG.selectAll('.sec-val-lbl').data(rows, d => d.sec);
    labels.join(
      enter => enter.append('text').attr('class', 'sec-val-lbl')
        .attr('x', d => xZ(d.val) + 6)
        .attr('y', d => ySc(d.sec) + ySc.bandwidth() / 2 + 4)
        .text(d => fmt2(d.val))
        .style('opacity', 0)
        .call(enter => enter.transition().duration(animate ? 700 : 350).delay(animate ? 300 : 0)
          .style('opacity', 1)),
      update => update
        .call(update => update.transition().duration(animate ? 700 : 350)
          .attr('x', d => xZ(d.val) + 6)
          .attr('y', d => ySc(d.sec) + ySc.bandwidth() / 2 + 4)
          .text(d => fmt2(d.val))),
      exit => exit.remove()
    );
  }

  render(true);
  updaters.sector = function() { render(false); };
}
