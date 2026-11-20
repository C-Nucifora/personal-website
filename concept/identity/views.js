// Markup for Sweep, Channels and the portfolio, built from window.CN as HTML strings.
// The browser preview mounts these into empty slots; scripts/build-identity.mjs
// runs the same functions in Node to write static pages. Keep copy in content.js.

(function (root) {
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const join = (list, fn) => list.map(fn).join("");
  const SHORT = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = ([y, m]) => `${SHORT[m - 1]} ${y}`;
  const span = (x) =>
    `${month(x.start)} to ${x.end ? `${month(x.end)}${x.expectedEnd ? " (expected)" : ""}` : "present"}`;
  const repo = (p) => `https://github.com/C-Nucifora/${p.repo}`;
  const page = (p) => `work/${p.id}.html`;

  function facts(p) {
    const list = [
      ["Platform", esc(p.platform)],
      ["Status", esc(p.status)],
    ];
    if (p.credit)
      list.unshift([
        "Credit",
        p.creditUrl
          ? `<a href="${esc(p.creditUrl)}">${esc(p.credit)}</a>`
          : esc(p.credit),
      ]);
    return list;
  }
  const notes = (p) =>
    join(p.notes, (n) => `<p>${esc(n)}</p>`) +
    (p.code ? `<pre class="code"><code>${esc(p.code)}</code></pre>` : "");
  const sourceLinks = (p) =>
    `<a href="${esc(p.source)}">README at ${esc(p.rev)}</a><a href="${repo(p)}">Repository</a>`;
  const shared = (CN) => ({
    oneLine: esc(CN.person.oneLine),
    snapshot: esc(CN.snapshot),
    intro: join(CN.person.intro, (p) => `<p>${esc(p)}</p>`),
    smaller: join(
      CN.smaller,
      (s) =>
        `<li><a href="${esc(s.url)}">${esc(s.name)}</a><p>${esc(s.what)}</p></li>`,
    ),
    email: `<a class="email" href="mailto:${esc(CN.person.email)}">${esc(CN.person.email)}</a>`,
    elsewhere: `<li><a href="${esc(CN.person.github)}">GitHub</a></li><li><a href="${esc(CN.person.linkedin)}">LinkedIn</a></li>`,
  });

  function doc({ title, description, css, body, head = "" }) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${esc(description)}" />
    <title>${esc(title)}</title>
${head ? `    ${head}\n` : ""}${[css].flat().map((href) => `    <link rel="stylesheet" href="${href}" />`).join("\n")}
  </head>
  <body>
${body}
  </body>
</html>
`;
  }

  // Previous, next and back links for a project page.
  function pager(CN, i, back) {
    const prev = CN.projects[i - 1],
      next = CN.projects[i + 1];
    const item = (p, rel, label) =>
      p
        ? `<li class="${rel}"><a rel="${rel}" href="${p.id}.html"><small>${label}</small><strong>${esc(p.name)}</strong></a></li>`
        : `<li class="${rel}" aria-hidden="true"></li>`;
    return `<ul class="pager-list">${item(prev, "prev", "Previous")}${item(next, "next", "Next")}</ul>
        <p class="back"><a href="${back}">Back to work</a></p>`;
  }

  // Sweep hero ---------------------------------------------------------------
  // The scan, name and caption, shared by Sweep and the portfolio. `nav`
  // lists [id, label] pairs. `recording` swaps the simulation's pause control for
  // the recorded Play button; recording.mjs owns that button and the status line.

  function themePicker() {
    return `<li><label class="theme-picker" hidden>Theme
      <select data-theme-select>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label></li>`;
  }

  function coneOverlay(recording) {
    if (!recording?.cones) return "";
    return ` data-cone-overlay="${recording.classifiedCones ? "classified" : ""}"`;
  }

  function hero(CN, { nav, recording, replay = false, theme = false }) {
    const name = esc(CN.person.name);
    const foot = recording
      ? `<p class="caption">${esc(recording.cones ? "Recorded LiDAR, cones and planner paths. Alignment is approximate." : CN.scan.recorded)}${replay ? ' <a href="uq-racing.html#recordings">Open replays</a>' : ""}</p><div class="scan-controls"><p class="scan-status" role="status"></p><button class="pause" type="button" hidden>Play recording (${recording.sizeMB} MB)</button>${replay ? `<p class="scan-scroll-hint" hidden>Scroll to replay (${recording.sizeMB} MB)</p>` : ""}</div>`
      : `<p class="caption">${esc(CN.scan.simulated)}</p><button class="pause" type="button" aria-pressed="false">Pause scan</button>`;
    const poster = recording?.poster
      ? ' class="scan scan-recorded" style="background-image:url(recording-poster.webp)"'
      : ' class="scan"';
    return `<canvas${poster}${coneOverlay(recording)} aria-hidden="true"></canvas><nav class="bar" aria-label="Primary"><a class="mark" href="#top">${name}</a><ul>${join(nav, ([id, label]) => `<li><a href="#${id}">${label}</a></li>`)}${theme ? themePicker() : ""}</ul></nav><div class="hero-text"><h1>${name}</h1><p class="lede">${esc(CN.person.oneLine)}</p></div><div class="hero-foot">${foot}</div>`;
  }

  // Sweep --------------------------------------------------------------------

  function sweepFlow(p, h) {
    return `<${h} class="flow-h">Flow</${h}><ol class="flow">${join(
      p.path,
      (s) =>
        `<li><strong>${esc(s.label)}</strong><span>${esc(s.note)}</span></li>`,
    )}</ol>`;
  }
  const sweepFacts = (p) =>
    `<dl class="facts">${join(facts(p), ([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)}</dl>`;

  const sweepNav = [
    ["work", "Work"],
    ["about", "About"],
    ["experience", "Experience"],
    ["contact", "Contact"],
  ];

  const sweep = {
    // `pages`: link each row to its own page and keep the long notes there.
    slots(CN, { pages, recording }) {
      return {
        ...shared(CN),
        hero: hero(CN, { nav: sweepNav, recording }),
        projects: join(
          CN.projects,
          (p) =>
            `<li id="work-${p.id}"><h3><a class="row" href="${pages ? page(p) : `#work-${p.id}`}"><span class="row-name">${esc(p.name)}</span><span class="row-what">${esc(p.what)}</span><span class="row-kind">${esc(p.kind)}</span></a></h3><div class="panel" id="panel-${p.id}" hidden><div class="panel-text"><p class="panel-summary">${esc(p.summary)}</p>${pages ? "" : notes(p)}<p class="links">${pages ? `<a href="${page(p)}">Project page</a>` : ""}${sourceLinks(p)}</p></div><div class="panel-side">${sweepFacts(p)}${sweepFlow(p, "h4")}</div></div></li>`,
        ),
        experience: join(
          CN.experience.slice().reverse(),
          (x) =>
            `<li><time>${span(x)}</time><div><p><span class="exp-role">${esc(x.title)}</span>${x.end ? "" : '<span class="now">current</span>'}</p><p class="exp-org">${esc(x.org)}</p><p class="exp-sum">${esc(x.summary)}</p></div></li>`,
        ),
      };
    },

    projectPage(CN, i) {
      const p = CN.projects[i];
      return doc({
        title: `${p.name}, Christian Nucifora`,
        description: p.what,
        css: ["../hero.css", "../sweep.css"],
        body: `    <a class="skip" href="#main">Skip to content</a>
    <header class="hero hero-page">
      <nav class="bar" aria-label="Primary">
        <a class="mark" href="../index.html">Christian Nucifora</a>
        <ul>${join(sweepNav, ([id, n]) => `<li><a href="../index.html#${id}">${n}</a></li>`)}</ul>
      </nav>
      <div class="hero-text">
        <h1>${esc(p.name)}</h1>
        <p class="lede">${esc(p.what)}</p>
      </div>
    </header>
    <main id="main">
      <section class="block" aria-labelledby="notes-h">
        <h2 id="notes-h">${esc(p.kind)}</h2>
        <div class="block-body panel">
          <div class="panel-text">
            <p class="panel-summary">${esc(p.summary)}</p>${notes(p)}
            <p class="links">${sourceLinks(p)}</p>
          </div>
          <div class="panel-side">${sweepFacts(p)}${sweepFlow(p, "h3")}</div>
        </div>
      </section>
      <nav class="block pager" aria-labelledby="more-h">
        <h2 id="more-h">More work</h2>
        <div class="block-body">${pager(CN, i, `../index.html#work-${p.id}`)}</div>
      </nav>
    </main>
    <footer class="foot">
      <p>Notes summarise the README at revision ${esc(p.rev)}.</p>
    </footer>`,
      });
    },
  };

  // Channels -----------------------------------------------------------------
  // Months are indexed from January 2018. Ongoing roles are only known up to
  // the snapshot month; after that their channel is dashed.

  const FIRST_YEAR = 2018,
    LAST_YEAR = 2029;
  const TOTAL = (LAST_YEAR - FIRST_YEAR + 1) * 12;
  const index = ([y, m]) => (y - FIRST_YEAR) * 12 + (m - 1);
  const SNAP = index([2026, 8]);
  const monthName = (i) => `${LONG[i % 12]} ${FIRST_YEAR + Math.floor(i / 12)}`;
  const eventsIn = (CN, group) =>
    CN.timeline.events
      .filter((event) => event.group === group.id)
      .map((event) => {
        const s = index(event.start);
        const milestone = event.end === undefined;
        const e = milestone ? s : event.end ? index(event.end) : TOTAL - 1;
        return { ...event, s, e, milestone };
      });

  // First fit by start month. An end month is inclusive, so events that
  // meet in that month still need separate tracks.
  function packTracks(events) {
    const tracks = [];
    for (const event of [...events].sort((a, b) => a.s - b.s)) {
      const track = tracks.find((items) => items.at(-1).e < event.s);
      if (track) track.push(event);
      else tracks.push([event]);
    }
    return tracks;
  }

  function geometry(CN, W, { start = 0, size = TOTAL, compact = false } = {}) {
    const narrow = W < 560;
    const left = narrow ? 64 : 92;
    const inset = 8;
    const top = 28;
    const trackH = compact ? 22 : narrow ? 34 : 46;
    const gap = compact ? 8 : narrow ? 12 : 18;
    const end = start + size;
    const x0 = left + inset;
    const x1 = W - inset;
    let H = top;
    const groups = CN.timeline.groups.map((group) => {
      const events = eventsIn(CN, group).filter((event) => event.s < end && event.e >= start);
      const tracks = packTracks(events);
      const height = Math.max(1, tracks.length) * trackH + gap;
      const layout = { ...group, tracks, top: H, height };
      H += height;
      return layout;
    });
    return {
      W,
      narrow,
      left,
      top,
      trackH,
      compact,
      start,
      size,
      end,
      groups,
      H: H + 8,
      x: (m) => x0 + ((m - start) / size) * (x1 - x0),
    };
  }

  function drawTrack(events, g, color, lo) {
    const { x } = g;
    const hi = lo - (g.compact ? 8 : g.narrow ? 12 : 16);
    let out = `<line class="trace" stroke="${color}" x1="${x(g.start)}" x2="${x(g.end)}" y1="${lo}" y2="${lo}" opacity=".38"/>`;
    for (const event of events) {
      if (event.milestone) {
        out += `<ellipse class="milestone" cx="${x(event.s + 0.5)}" cy="${lo}" rx="${Math.min(4, (x(1) - x(0)) / 3)}" ry="4" fill="${color}"><title>${esc(event.title)}</title></ellipse>`;
        continue;
      }
      const startsHere = event.s >= g.start;
      const endsHere = event.e < g.end;
      const start = x(Math.max(event.s, g.start));
      const end = x(Math.min(event.e + 1, g.end));
      const split = event.fromSnapshot ? Math.max(start, Math.min(end, x(SNAP + 1))) : end;
      if (!g.narrow && !g.compact)
        out += `<text class="pulse-label" x="${start + 4}" y="${hi - 5}">${esc(event.label || event.title)}</text>`;
      if (split > start) {
        out += `<rect class="fill" x="${start}" y="${hi}" width="${split - start}" height="${lo - hi}" fill="${color}"/>`;
        out += `<path class="trace" stroke="${color}" d="M ${start} ${startsHere ? lo : hi} V ${hi} H ${split}${split === end && endsHere ? ` V ${lo}` : ""}"/>`;
      }
      if (end > split) {
        out += `<rect class="after" x="${split}" y="${hi}" width="${end - split}" height="${lo - hi}"/>`;
        out += `<path class="trace" stroke="${color}" stroke-dasharray="2 5" d="M ${split} ${split === start && startsHere ? lo : hi} V ${hi} H ${end}${endsHere ? ` V ${lo}` : ""}"/>`;
      }
    }
    return out;
  }

  const groupColor = (group) => `var(--channel-${esc(group.id)}, ${esc(group.color)})`;

  function chart(g, selected = SNAP) {
    const { W, x, H, top, narrow, start, end, size } = g;
    const labels = g.groups.map((group) => group.label).join(", ");
    const period = `${monthName(start)} to ${monthName(end - 1)}`;
    let out = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="chart-title"><title id="chart-title">Timeline, ${period}. Groups: ${esc(labels)}. Selected events are listed below.</title><defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--grid)" stroke-width="2"/></pattern></defs>`;
    const monthly = size <= 24;
    const step = monthly ? (size > 12 ? 3 : size > 6 && narrow ? 2 : 1) : 12;
    for (let m = Math.ceil(start / step) * step; m < end; m += step) {
      const gx = x(m);
      out += `<line class="gridline" x1="${gx}" x2="${gx}" y1="${top - 6}" y2="${H - 2}"/>`;
      if (!monthly && size === TOTAL && narrow && m % 36 !== 0) continue;
      const year = FIRST_YEAR + Math.floor(m / 12);
      const tick = monthly ? SHORT[m % 12] : narrow ? `'${String(year).slice(2)}` : year;
      out += `<text class="tick" x="${gx + 3}" y="${top - 10}">${tick}</text>`;
    }
    for (const group of g.groups) {
      out += `<line class="gridline" x1="0" x2="${W}" y1="${group.top + group.height}" y2="${group.top + group.height}"/>`;
      out += `<text class="lane-label" x="0" y="${group.top + group.height / 2 + 5}">${esc(group.label)}</text>`;
      group.tracks.forEach((track, i) => {
        out += drawTrack(track, g, groupColor(group), group.top + (i + 1) * g.trackH - 6);
      });
    }
    const cx = x(selected + 0.5);
    out += `<line class="cursor" x1="${cx}" x2="${cx}" y1="${top - 4}" y2="${H}"/><path class="cursor-cap" d="M -6 0 L 6 0 L 0 8 Z" transform="translate(${cx} ${top - 10})"/></svg>`;
    return out;
  }

  function readoutEvent(event, snapshot) {
    const title = esc(event.title);
    const name = event.projectId
      ? `<a href="#${esc(event.projectAnchor ?? `tab-${event.projectId}`)}">${title}</a>`
      : title;
    const org = !event.org ? "" : event.pageHref
      ? ` <span><a href="${esc(event.pageHref)}">${esc(event.org)}</a></span>`
      : ` <span>${esc(event.org)}</span>`;
    let when = event.milestone ? month(event.start) : span(event);
    if (event.source)
      when += ` · <a href="${esc(event.source.url)}">${esc(event.source.label)}</a>`;
    else if (event.fromSnapshot && !event.end)
      when = `${month(event.start)} · Current as of ${esc(snapshot)}`;
    return `<li><strong>${name}</strong>${org}<p>${when}. ${esc(event.summary)}</p></li>`;
  }

  // An unselected (static) timeline lists every event within its group.
  function readout(CN, m) {
    const groups = CN.timeline.groups.flatMap((group) => {
      const events = eventsIn(CN, group)
        .filter((event) => m == null || (event.s <= m && m <= event.e))
        .sort((a, b) => b.s - a.s);
      return events.length
        ? [`<li class="readout-group" style="--c:${groupColor(group)}"><strong>${esc(group.label)}</strong><ul>${join(events, (event) => readoutEvent(event, CN.snapshot))}</ul></li>`]
        : [];
    });
    return {
      month: m == null ? `${FIRST_YEAR} to ${LAST_YEAR}` : monthName(m),
      active: groups.join("") || `<li class="empty">${CN.timeline.groups.length ? "Nothing on record." : "No channels selected."}</li>`,
    };
  }

  function chain(p) {
    return `<div class="chain-wrap"><ol class="chain" aria-label="${esc(p.name)}, step by step">${p.path
      .map(
        (s, k) =>
          (k
            ? `<li class="wire" aria-hidden="true"><i style="--n:${k - 1}"></i></li>`
            : "") +
          `<li class="stage"><strong>${esc(s.label)}</strong><span>${esc(s.note)}</span></li>`,
      )
      .join("")}</ol></div>`;
  }
  // The timeline section: chart, month cursor and readout. Without JavaScript
  // it shows the chart at the snapshot and every event in the readout.
  function log(CN) {
    const all = readout(CN, null);
    return `<div class="log-head">
      <h2 id="log-h">Timeline, ${FIRST_YEAR} to ${LAST_YEAR}</h2>
      <p class="log-note">Experience from <a href="${esc(CN.person.linkedin)}">LinkedIn</a> as of ${esc(CN.snapshot)}. Hatched ranges extend those dates. Dots mark GitHub repository creation.</p>
    </div>
    <div class="timeline-controls" data-timeline-controls role="group" aria-label="Timeline view" hidden>
      <label class="timeline-zoom">Zoom
        <input id="timeline-zoom" type="range" min="0" max="${TOTAL - 3}" value="0" />
      </label>
      <button type="button" id="timeline-fit">Fit</button>
      <label class="timeline-compact"><input id="timeline-compact" type="checkbox" /> Compact</label>
      <details class="timeline-layers">
        <summary>Channels</summary>
        <div class="timeline-options">${join(CN.timeline.groups, (group) =>
          `<label><input type="checkbox" value="${esc(group.id)}" checked /> ${esc(group.label)}</label>`,
        )}</div>
      </details>
      <p class="timeline-gestures">Drag to scrub. Scroll sideways to pan. Alt-scroll to zoom.</p>
    </div>
    <div class="chart" data-slot="chart">${chart(geometry(CN, 1200))}</div>
    <div class="scrub" hidden><label for="cursor" class="visually-hidden">Timeline month</label><input id="cursor" type="range" min="0" step="1" /></div>
    <div class="timeline-navigator" hidden>
      <div class="timeline-overview-heading">
        <label for="timeline-pan">Timeline overview</label>
        <span id="timeline-period"></span>
      </div>
      <input id="timeline-pan" type="range" min="0" step="1" />
      <div class="timeline-overview-years" aria-hidden="true">${join(
        [FIRST_YEAR, FIRST_YEAR + 3, FIRST_YEAR + 6, FIRST_YEAR + 9, LAST_YEAR],
        (year) => `<span style="--year-position:${((year - FIRST_YEAR) * 12 * 100) / TOTAL}%">${year}</span>`,
      )}</div>
    </div>
    <div class="readout" aria-live="polite"><p class="readout-month" data-slot="month">${all.month}</p><ul class="readout-list" data-slot="active">${all.active}</ul></div>`;
  }

  const channelFacts = (p) =>
    `<dl class="facts">${join(facts(p), ([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>`;

  const channels = {
    TOTAL,
    SNAP,
    FIRST_YEAR,
    geometry,
    chart,
    readout,
    monthName,
    index: (y, m) => index([y, m]),

    slots(CN, { pages }) {
      return {
        ...shared(CN),
        log: log(CN),
        tabs: join(
          CN.projects,
          (p) =>
            `<a class="tab" id="tab-${p.id}" href="${pages ? page(p) : `#${p.id}`}"><span>${esc(p.name)}</span><small>${esc(p.kind)}</small></a>`,
        ),
        panels: join(
          CN.projects,
          (p) =>
            `<section class="panel" id="project-${p.id}" aria-labelledby="project-${p.id}-h" hidden><div class="panel-head"><h3 id="project-${p.id}-h">${esc(p.name)}</h3><span class="panel-kind">${esc(p.kind)}</span></div><p class="panel-what">${esc(p.what)}</p>${channelFacts(p)}${chain(p)}<div class="panel-body"><p class="summary">${esc(p.summary)}</p>${pages ? "" : notes(p)}</div><p class="panel-links">${pages ? `<a href="${page(p)}">Project page</a>` : ""}${sourceLinks(p)}</p></section>`,
        ),
      };
    },

    // `back` is the home-page anchor for this project.
    projectPage(CN, i, back = `#${CN.projects[i].id}`) {
      const p = CN.projects[i];
      const nav = [
        ["log", "Timeline"],
        ["work", "Work"],
        ["about", "About"],
        ["contact", "Contact"],
      ];
      return doc({
        title: `${p.name}, Christian Nucifora`,
        description: p.what,
        css: "../channels.css",
        body: `    <a class="skip" href="#main">Skip to content</a>
    <header class="top">
      <a class="mark" href="../index.html">Christian Nucifora</a>
      <nav aria-label="Primary">
        <ul>${join(nav, ([id, n]) => `<li><a href="../index.html#${id}">${n}</a></li>`)}</ul>
      </nav>
    </header>
    <main id="main">
      <section class="intro" aria-labelledby="name">
        <h1 id="name">${esc(p.name)}</h1>
        <p class="intro-text">${esc(p.what)}</p>
      </section>
      <section class="project" aria-labelledby="project-h">
        <h2 id="project-h">${esc(p.kind)}</h2>
        <article class="panel run">
          ${channelFacts(p)}${chain(p)}
          <div class="panel-body"><p class="summary">${esc(p.summary)}</p>${notes(p)}</div>
          <p class="panel-links">${sourceLinks(p)}</p>
        </article>
      </section>
      <nav class="pager" aria-labelledby="more-h">
        <h2 id="more-h">More work</h2>
        <div>${pager(CN, i, `../index.html${back}`)}</div>
      </nav>
    </main>
    <footer class="foot">
      <p>Notes and flow summarise the README at revision ${esc(p.rev)}.</p>
    </footer>`,
      });
    },
  };

  // Portfolio -----------------------------------------------------------------

  const siteNav = [
    ["log", "Timeline"],
    ["work", "Work"],
    ["about", "About"],
    ["contact", "Contact"],
  ];
  function sitePage(CN, { title, description, back, backLabel, body, base = "", script = "" }) {
    return doc({
      title: `${title}, ${CN.person.name}`,
      description,
      css: [`${base}channels.css`, `${base}site.css`],
      head: `<script src="${base}theme.js"></script>`,
      body: `    <a class="skip" href="#main">Skip to content</a>
    <header class="top">
      <a class="mark" href="${base}index.html">${esc(CN.person.name)}</a>
      <nav aria-label="Primary"><ul>${join(siteNav, ([id, name]) =>
        `<li><a href="${base}index.html#${id}">${name}</a></li>`,
      )}${themePicker()}</ul></nav>
    </header>
    <main id="main">
      <section class="case-title" aria-labelledby="name">
        <p class="case-back"><a href="${back}">${backLabel}</a></p>
        <h1 id="name">${esc(title)}</h1>
        <p class="case-deck">${esc(description)}</p>
      </section>
      ${body}
    </main>
    <footer class="foot"><p>${esc(CN.person.name)}</p></footer>
    ${script}`,
    });
  }

  function workedExample(e) {
    const code = (value) => `<pre class="code"><code>${esc(value)}</code></pre>`;
    return `<h2 id="example-h">Worked example</h2>
      <p>This small script has inconsistent spacing and an unused local.</p>
      <div class="example-pair">
        <div><h3>Before</h3>${code(e.before)}</div>
        <div><h3>After formatting</h3>${code(e.formatted)}</div>
      </div>
      <p>The formatter fixes the spacing. With rule L012 enabled, the linter reports the unused declaration.</p>
      ${code(e.diagnostic)}
      <p>Remove that declaration and run the checks again.</p>
      <div class="example-pair">
        <div><h3>Fixed script</h3>${code(e.fixed)}</div>
        <div><h3>Run the checks</h3>${code(e.checks)}</div>
      </div>
      <p>Both checks pass on the fixed script. The <a href="${esc(e.ci)}">shared CI workflow</a> runs formatter and lint checks with pinned tools. It can also fail on warnings when enabled.</p>`;
  }

  const isFeatured = (CN, id) => CN.featured.includes(id);
  const site = {
    content(CN, { pages = false } = {}) {
      return {
        ...CN,
        timeline: {
          ...CN.timeline,
          events: CN.timeline.events
            .filter((event) => !event.projectId || isFeatured(CN, event.projectId))
            .map((event) => {
              if (event.projectId) return { ...event, projectAnchor: event.projectId };
              if (pages && event.id === "uqr") return { ...event, pageHref: "uq-racing.html" };
              return event;
            }),
        },
      };
    },

    slots(CN, { pages, recording }) {
      const featured = CN.featured.map((id) => CN.projects.find((p) => p.id === id));
      const common = shared(CN);
      const href = (p) => pages ? page(p) : repo(p);
      const other = (name, href, id) =>
        `<li${id ? ` id="${esc(id)}"` : ""}><a href="${esc(href)}">${esc(name)}</a></li>`;
      return {
        ...common,
        intro: common.intro + (pages ? '<p><a href="uq-racing.html">UQ Racing contribution</a></p>' : ""),
        log: log(site.content(CN, { pages })),
        hero: `<header class="hero">${hero(CN, { nav: siteNav, recording, replay: pages, theme: true })}</header>`,
        selected: join(
          featured,
          (p) => `<li id="${esc(p.id)}">
            <a class="project-brief" id="tab-${esc(p.id)}" href="${esc(href(p))}">
              <h3>${esc(p.name)}</h3>
              <p>${esc(p.what)}</p>
            </a>
          </li>`,
        ),
        others:
          join(
            CN.projects.filter((p) => !isFeatured(CN, p.id)),
            (p) => other(p.name, href(p), p.id),
          ) + join(CN.smaller, (s) => other(s.name, s.url)),
        signature: esc(CN.person.name),
      };
    },

    projectPage(CN, i) {
      const p = CN.projects[i];
      const home = `../index.html#${p.id}`;
      return sitePage(CN, {
        title: p.name,
        description: p.summary,
        base: "../",
        back: home,
        backLabel: "Back to work",
        body: `<section class="case-body" aria-labelledby="${p.example ? "example-h" : "implementation-h"}">
        <div class="case-notes">
          ${p.example ? workedExample(p.example) : ""}
          <h2 id="implementation-h">Implementation</h2>
          ${notes(p)}
          <h3>Flow</h3>
          <ol class="case-flow">${join(p.path, (step) =>
            `<li><strong>${esc(step.label)}</strong> <span>${esc(step.note)}</span></li>`,
          )}</ol>
        </div>
        <aside class="case-facts" aria-label="Project details">
          <dl>${join(facts(p), ([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)}</dl>
          <p class="case-sources">${sourceLinks(p)}</p>
        </aside>
      </section>
      <nav class="pager" aria-labelledby="more-h">
        <h2 id="more-h">More work</h2>
        <div>${pager(CN, i, home)}</div>
      </nav>`,
      });
    },

    teamPage(CN, replays) {
      const team = CN.racing;
      return sitePage(CN, {
        title: "UQ Racing",
        description: team.summary,
        back: "index.html#log",
        backLabel: "Back to timeline",
        script: replays.length ? '<script type="module" src="recording.mjs"></script>' : "",
        body: `${replays.length ? replayCarousel(replays) : ""}
      <section class="case-body" aria-labelledby="team-h">
        <div class="case-notes">
          <h2 id="team-h">Perception and electrical</h2>
          <p>${esc(team.example)}</p>
        </div>
        <aside class="case-facts" aria-label="Team sources">
          <ul>
            <li><a href="${esc(team.software)}">Archived LiDAR processing project</a></li>
            <li><a href="${esc(team.university)}">University team overview</a></li>
          </ul>
        </aside>
      </section>`,
      });
    },

    replayPage(CN, recording, replays) {
      return sitePage(CN, {
        title: `${recording.title} LiDAR replay`,
        description: recording.description,
        back: "uq-racing.html#recordings",
        backLabel: "Back to UQ Racing",
        script: '<script type="module" src="recording.mjs"></script>',
        body: `${replays.length > 1 ? `<nav class="replay-nav" aria-label="LiDAR recordings">
        <ul>${join(replays, (replay) => `<li><a href="${esc(replay.href)}"${replay === recording ? ' aria-current="page"' : ""}>${esc(replay.title)}</a></li>`)}</ul>
      </nav>` : ""}
      ${replayPlayer(recording)}
      <section class="case-body" aria-labelledby="scene-h">
        <div class="case-notes">
          <h2 id="scene-h">What you’re seeing</h2>
          <p>Mint points show LiDAR returns.${recording.cones ? " Triangles show recorded cone positions and colours." : ""}</p>
          ${recording.paths ? '<p>Where recorded poses are available, the solid line shows the path visualisation and the dashed line shows the planned path. Alignment is approximate.</p>' : ""}
        </div>
        <aside class="case-facts" aria-label="Recording details">
          <dl><dt>Recorded</dt><dd><time datetime="${recording.recorded}">${recording.recorded}</time></dd>
          <dt>Duration</dt><dd>${replayLength(recording.duration)}</dd>
          <dt>Frames</dt><dd>${recording.frameCount.toLocaleString("en-AU")}</dd></dl>
        </aside>
      </section>`,
      });
    },
  };

  function replayPlayer(recording, inline = false) {
    return `<section class="replay" aria-label="LiDAR playback">
        <div class="replay-controls">
          <button class="pause" type="button" hidden>Play recording</button>
          <label class="replay-seek" hidden>
            <span class="visually-hidden">Recording position</span>
            <input type="range" data-replay-seek min="0" max="0" step="1" value="0" />
            <span data-replay-time aria-hidden="true"></span>
          </label>
          <button type="button" data-replay-fullscreen hidden>Fullscreen</button>
          <p class="scan-status" role="status"></p>
        </div>
        <div class="replay-stage">
          ${recording.poster && !inline ? '<img src="recording-poster.webp" alt="LiDAR returns and the planned path through the scene" />' : ""}
          <canvas class="scan replay-canvas" data-recording="${esc(recording.assetPath)}"${coneOverlay(recording)} aria-hidden="true"></canvas>
        </div>
      </section>`;
  }

  function replayCarousel(replays) {
    return `<section class="replay-carousel" id="recordings" data-replay-carousel aria-labelledby="recordings-h" aria-roledescription="carousel">
      <div class="replay-carousel-bar">
        <h2 id="recordings-h">LiDAR recordings</h2>
        ${replays.length > 1 ? `<div class="replay-arrows" hidden data-replay-arrows>
          <button type="button" data-replay-step="-1" aria-label="Previous recording">←</button>
          <button type="button" data-replay-step="1" aria-label="Next recording">→</button>
        </div>` : ""}
      </div>
      <div class="replay-cards" aria-live="polite" aria-atomic="true">
        ${join(replays, (replay, index) => `<div class="replay-card" data-replay-card data-recording="${esc(replay.assetPath)}" data-point-count="${replay.stillPointCount}"${coneOverlay(replay)}${index ? " hidden" : ""}>
          <h3>${esc(replay.title)}</h3>
          <p><time datetime="${replay.recorded}">${replay.recorded}</time> · ${replayLength(replay.duration)}</p>
          <p>${esc(replay.description)}</p>
        </div>`)}
      </div>
      ${replayPlayer(replays[0], true)}
      ${replays.length > 1 ? `<div class="replay-tabs" aria-label="Choose a recording" role="group" hidden data-replay-tabs>
        ${join(replays, (replay, index) => `<button type="button" data-replay-index="${index}" aria-pressed="${index === 0}">${esc(replay.title)}</button>`)}
      </div>` : ""}
      <noscript><ul>${join(replays, (replay) => `<li><a href="${esc(replay.href)}">${esc(replay.title)}</a></li>`)}</ul></noscript>
    </section>`;
  }

  function replayLength(seconds) {
    const rounded = Math.round(seconds);
    const minutes = Math.floor(rounded / 60);
    return minutes ? `${minutes} min ${rounded % 60} s` : `${rounded} s`;
  }

  // Fill empty [data-slot] elements; slots that already hold markup are left alone.
  function mount(slots) {
    for (const node of document.querySelectorAll("[data-slot]")) {
      const html = slots[node.dataset.slot];
      if (html != null && !node.childNodes.length) node.innerHTML = html;
    }
  }

  root.CNViews = { esc, sweep, channels, site, mount };
})(typeof window === "undefined" ? globalThis : window);
