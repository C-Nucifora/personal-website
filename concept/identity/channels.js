// Channels: the timeline cursor and the project viewer. Markup comes from
// views.js, either pre-rendered by the build or mounted here in the preview.
// The portfolio uses the timeline with featured project milestones and static work links.
(function () {
  const view = document.body.dataset.view === "site" ? CNViews.site : null;
  const pages = !document.querySelector("[data-preview-only]");
  const CN = view ? view.content(window.CN, { pages }) : window.CN;
  const V = CNViews.channels;
  CNViews.mount((view || V).slots(window.CN, { pages }));
  const slot = (name) => document.querySelector(`[data-slot="${name}"]`);

  // Timeline ----------------------------------------------------------------
  // The month can be linked as #YYYY-MM. Moving the cursor replaces the hash
  // rather than adding history entries, so Back still leaves the page.

  const chart = slot("chart");
  const controls = document.querySelector("[data-timeline-controls]");
  const cursor = document.getElementById("cursor");
  const scrub = cursor.parentElement;
  const zoom = document.getElementById("timeline-zoom");
  const compact = document.getElementById("timeline-compact");
  const fit = document.getElementById("timeline-fit");
  const pan = document.getElementById("timeline-pan");
  const layers = [...controls.querySelectorAll(".timeline-options input")];
  const period = document.getElementById("timeline-period");
  const range = pan.closest(".timeline-navigator");
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  let month = V.SNAP;
  let start = 0;
  let size = V.TOTAL;
  let geometry;
  let renderedMonth;
  let visibleCN = CN;

  function drawChart() {
    geometry = V.geometry(visibleCN, chart.clientWidth, { start, size, compact: compact.checked });
    chart.innerHTML = V.chart(geometry, month);
    scrub.style.setProperty("--plot-left", `${geometry.left}px`);
    scrub.style.setProperty("--month-inset", `${(geometry.x(1) - geometry.x(0)) / 2}px`);
    cursor.min = String(start);
    cursor.max = String(start + size - 1);
    cursor.value = String(month);
    range.hidden = size === V.TOTAL;
    zoom.value = String(V.TOTAL - size);
    zoom.setAttribute("aria-valuetext", size === V.TOTAL ? "All years" : `${size} months`);
    if (!range.hidden) {
      const dates = `${V.monthName(start)} to ${V.monthName(start + size - 1)}`;
      period.textContent = dates;
      pan.max = String(V.TOTAL - size);
      pan.value = String(start);
      range.style.setProperty("--plot-left", `${geometry.left}px`);
      pan.style.setProperty("--window-width", `${(pan.clientWidth * size) / V.TOTAL}px`);
      pan.setAttribute("aria-valuetext", dates);
    }
    updateReadout();
  }

  function updateReadout() {
    if (renderedMonth === month) return;
    renderedMonth = month;
    const r = V.readout(visibleCN, month);
    cursor.setAttribute("aria-valuetext", r.month);
    slot("month").textContent = r.month;
    slot("active").innerHTML = r.active;
  }

  const monthHash = (m) =>
    `#${V.FIRST_YEAR + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
  function shareMonth() {
    history.replaceState(null, "", monthHash(month));
  }

  function centerOn(m) {
    start = clamp(m - Math.floor(size / 2), 0, V.TOTAL - size);
  }

  function setMonth(value, share = true) {
    const next = clamp(value, 0, V.TOTAL - 1);
    if (next === month && geometry) return;
    month = next;
    if (!geometry || month < start || month >= start + size) {
      centerOn(month);
      drawChart();
    } else {
      const cx = geometry.x(month + 0.5);
      const line = chart.querySelector(".cursor");
      line.setAttribute("x1", cx);
      line.setAttribute("x2", cx);
      chart.querySelector(".cursor-cap")
        .setAttribute("transform", `translate(${cx} ${geometry.top - 10})`);
      cursor.value = String(month);
      updateReadout();
    }
    if (share) shareMonth();
  }

  cursor.addEventListener("input", () => setMonth(Number(cursor.value)));
  function zoomTo(nextSize, anchor = month + 0.5, fraction = 0.5) {
    if (size === nextSize) return;
    size = nextSize;
    start = clamp(Math.round(anchor - size * fraction), 0, V.TOTAL - size);
    keepCursorInView();
  }

  function keepCursorInView() {
    const previous = month;
    month = clamp(month, start, start + size - 1);
    drawChart();
    if (month !== previous) shareMonth();
  }

  zoom.addEventListener("input", () => zoomTo(V.TOTAL - zoom.valueAsNumber));
  fit.addEventListener("click", () => zoomTo(V.TOTAL));
  compact.addEventListener("change", drawChart);
  pan.addEventListener("input", () => {
    start = pan.valueAsNumber;
    keepCursorInView();
  });
  controls.querySelector(".timeline-options").addEventListener("change", () => {
    const enabled = new Set(layers.filter((input) => input.checked).map((input) => input.value));
    visibleCN = { ...CN, timeline: { ...CN.timeline, groups: CN.timeline.groups.filter((group) => enabled.has(group.id)) } };
    renderedMonth = undefined;
    drawChart();
  });

  function plotFraction(clientX) {
    const box = chart.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * geometry.W;
    return clamp((px - geometry.x(start)) / (geometry.x(start + size) - geometry.x(start)), 0, 1);
  }

  let panRemainder = 0;
  chart.addEventListener("wheel", (event) => {
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? chart.clientWidth : 1;
    if (event.altKey && event.deltaY) {
      event.preventDefault();
      const fraction = plotFraction(event.clientX);
      const delta = event.deltaY * unit;
      const step = Math.max(1, Math.round(size * Math.abs(delta) / 800));
      zoomTo(clamp(size + Math.sign(delta) * step, 3, V.TOTAL), start + size * fraction, fraction);
      return;
    }
    const horizontal = event.shiftKey ? event.deltaX || event.deltaY : event.deltaX;
    if (size === V.TOTAL || !horizontal || (!event.shiftKey && Math.abs(horizontal) < Math.abs(event.deltaY))) return;
    event.preventDefault();
    panRemainder += horizontal * unit / (geometry.x(1) - geometry.x(0));
    const offset = Math.trunc(panRemainder);
    panRemainder -= offset;
    const next = clamp(start + offset, 0, V.TOTAL - size);
    if (next === start) return;
    start = next;
    keepCursorInView();
  }, { passive: false });

  // Dragging the chart scrubs within the current view. Vertical swipes still
  // scroll the page, and the range input offers the same action by keyboard.
  const scrubChart = (event) =>
    setMonth(start + Math.min(size - 1, Math.floor(plotFraction(event.clientX) * size)));
  chart.addEventListener("pointerdown", (event) => {
    if (event.button || !event.isPrimary) return;
    chart.setPointerCapture(event.pointerId);
    scrubChart(event);
  });
  chart.addEventListener("pointermove", (event) => {
    if (chart.hasPointerCapture(event.pointerId)) scrubChart(event);
  });

  controls.hidden = false;
  scrub.hidden = false;
  drawChart();
  new ResizeObserver(() => {
    if (chart.clientWidth !== geometry.W) drawChart();
  }).observe(chart);

  // Project viewer (tabs) -------------------------------------------------
  // Without JavaScript the tabs are links to project pages and every panel shows.

  const tabs = slot("tabs");
  const tabList = [...(tabs?.querySelectorAll(".tab") || [])];
  const panelList = [...(slot("panels")?.querySelectorAll(".panel") || [])];
  tabs?.setAttribute("role", "tablist");
  tabs?.setAttribute("aria-orientation", "vertical");

  tabList.forEach((tab, i) => {
    const panel = panelList[i];
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panel.id);
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    panel.tabIndex = 0;
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      select(i, true);
    });
  });

  function select(i, focus) {
    tabList.forEach((t, k) => {
      const on = k === i;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panelList[k].hidden = !on;
      panelList[k].classList.remove("run");
    });
    void panelList[i].offsetWidth; // restart the one-off signal animation
    panelList[i].classList.add("run");
    if (focus) {
      const tab = tabList[i];
      tab.focus();
      history.replaceState(null, "", `#${tab.id.slice(4)}`);
    }
  }

  tabs?.addEventListener("keydown", (e) => {
    const i = tabList.indexOf(document.activeElement);
    if (i < 0) return;
    const keys = {
      ArrowDown: i + 1,
      ArrowRight: i + 1,
      ArrowUp: i - 1,
      ArrowLeft: i - 1,
      Home: 0,
      End: tabList.length - 1,
    };
    if (e.key === " ") {
      e.preventDefault();
      select(i, true);
      return;
    }
    if (!(e.key in keys)) return;
    e.preventDefault();
    select((keys[e.key] + tabList.length) % tabList.length, true);
  });

  function fromHash(scroll) {
    const month = /^#(\d{4})-(\d{2})$/.exec(location.hash);
    if (month) {
      const monthNumber = Number(month[2]);
      const m = V.index(Number(month[1]), monthNumber);
      if (monthNumber < 1 || monthNumber > 12 || m < 0 || m >= V.TOTAL)
        return false;
      setMonth(m, false);
      if (scroll) document.getElementById("log").scrollIntoView();
      return false;
    }
    const i = tabList.findIndex((t) =>
      location.hash === `#${t.id}` || location.hash === `#${t.id.slice(4)}`,
    );
    if (i >= 0) {
      select(i, false);
      if (scroll) document.getElementById("work").scrollIntoView();
    }
    return i >= 0;
  }
  window.addEventListener("hashchange", () => fromHash(true));
  if (!fromHash(true) && tabList.length) select(0, false);
})();
