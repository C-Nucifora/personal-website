// Plates: builds the key plan, one drawing sheet per project, and the history.
(function () {
  const { person, experience, projects, smaller, snapshot } = window.CN;
  const MONTHS = [
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
  const month = ([y, m]) => `${MONTHS[m - 1]} ${y}`;
  const slot = (name) => document.querySelector(`[data-slot="${name}"]`);
  const SVG = "http://www.w3.org/2000/svg";

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "class") node.className = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    node.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
    return node;
  }
  function svg(tag, attrs = {}, ...children) {
    const node = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    node.append(...children.flat(Infinity).filter((c) => c != null));
    return node;
  }

  // Isometric projection: x runs down-right, y runs down-left, z is up.
  const C = Math.cos(Math.PI / 6),
    S = 0.5;
  const iso = (x, y, z) => [(x - y) * C, (x + y) * S - z];
  const pts = (list) =>
    list
      .map((p) =>
        iso(...p)
          .map((n) => n.toFixed(1))
          .join(","),
      )
      .join(" ");

  function box(x, y, z, w, d, h) {
    return [
      svg("polygon", {
        class: "side-l",
        points: pts([
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ]),
      }),
      svg("polygon", {
        class: "side-r",
        points: pts([
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x + w, y, z + h],
        ]),
      }),
      svg("polygon", {
        class: "top",
        points: pts([
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ]),
      }),
    ];
  }

  function balloon(cx, cy, label, r = 15) {
    return svg(
      "g",
      { class: "balloon" },
      svg("circle", { cx, cy, r }),
      svg("text", { x: cx, y: cy + 0.5 }, String(label)),
    );
  }

  function fitViewBox(node, pad) {
    // Measured once the SVG is in the document.
    const b = node.getBBox();
    node.setAttribute(
      "viewBox",
      `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`,
    );
  }

  const CAVEAT =
    /progress|needs|experimental|depends|limitation|active development/i;
  const firstSheet = 2;
  const totalSheets = projects.length + 3;
  const sheetLabel = (n) => `Sheet ${n} of ${totalSheets}`;

  // Plain content ------------------------------------------------------------

  slot("oneLine").textContent = person.oneLine;
  slot("snapshot").textContent = snapshot;
  slot("intro").append(...person.intro.map((p) => el("p", {}, p)));
  const email = slot("email");
  email.href = `mailto:${person.email}`;
  email.textContent = person.email;
  const gh = slot("github");
  gh.href = person.github;
  gh.textContent = person.githubHandle;
  slot("linkedin").href = person.linkedin;
  slot("smaller").append(
    ...smaller.map((s) =>
      el(
        "li",
        {},
        el("a", { href: s.url }, s.name),
        el("span", {}, `. ${s.what}`),
      ),
    ),
  );
  slot("aboutNo").textContent = sheetLabel(totalSheets - 1);
  slot("contactNo").textContent = sheetLabel(totalSheets);

  slot("index").append(
    ...projects.map((p, i) =>
      el(
        "li",
        {},
        el("span", {}, String(firstSheet + i)),
        el("a", { href: `#${p.id}` }, p.name),
      ),
    ),
    el(
      "li",
      {},
      el("span", {}, String(totalSheets - 1)),
      el("a", { href: "#about" }, "About and history"),
    ),
    el(
      "li",
      {},
      el("span", {}, String(totalSheets)),
      el("a", { href: "#contact" }, "Contact"),
    ),
  );

  // History as a revision table, lettered oldest first.
  slot("history").append(
    ...experience.map((x, i) => {
      const end = x.end
        ? `${month(x.end)}${x.expectedEnd ? ", expected" : ""}`
        : "present";
      return el(
        "tr",
        { class: x.end ? "" : "current" },
        el("td", {}, String.fromCharCode(65 + i)),
        el("td", {}, `${month(x.start)} to ${end}`),
        el(
          "td",
          {},
          el("strong", {}, x.title),
          el("span", {}, x.org),
          el("span", {}, x.summary),
          x.end
            ? null
            : el(
                "span",
                { class: "open" },
                `Listed as current in ${snapshot}.`,
              ),
        ),
      );
    }),
  );

  // Key plan -----------------------------------------------------------------

  const plan = svg("svg", {
    role: "group",
    "aria-label": "Key plan of project sheets",
  });
  slot("keyplan").append(plan);
  const COLS = 5,
    CELL = 96,
    FOOT = 64;
  const ground = svg("g");
  for (let i = 0; i <= COLS; i++) {
    ground.append(
      svg("line", {
        class: "ground",
        x1: iso(i * CELL - 16, -16, 0)[0],
        y1: iso(i * CELL - 16, -16, 0)[1],
        x2: iso(i * CELL - 16, 2 * CELL - 16, 0)[0],
        y2: iso(i * CELL - 16, 2 * CELL - 16, 0)[1],
      }),
    );
  }
  for (let j = 0; j <= 2; j++) {
    ground.append(
      svg("line", {
        class: "ground",
        x1: iso(-16, j * CELL - 16, 0)[0],
        y1: iso(-16, j * CELL - 16, 0)[1],
        x2: iso(COLS * CELL - 16, j * CELL - 16, 0)[0],
        y2: iso(COLS * CELL - 16, j * CELL - 16, 0)[1],
      }),
    );
  }
  plan.append(ground);

  // Draw far blocks first so nearer ones overlap them.
  projects
    .map((p, i) => ({
      p,
      i,
      x: (i % COLS) * CELL,
      y: Math.floor(i / COLS) * CELL,
    }))
    .sort((a, b) => a.x + a.y - (b.x + b.y))
    .forEach(({ p, i, x, y }) => {
      const h = p.path.length * 20;
      const [bx, by] = iso(x + FOOT / 2, y + FOOT / 2, h);
      const link = svg(
        "a",
        {
          class: "block-link",
          href: `#${p.id}`,
          "aria-label": `Sheet ${firstSheet + i}: ${p.name}`,
        },
        svg(
          "g",
          { class: "rise", style: `--i:${i}` },
          box(x, y, 0, FOOT, FOOT, h),
          balloon(bx, by, firstSheet + i, 14),
        ),
      );
      plan.append(link);
    });

  // Project sheets -------------------------------------------------------------

  const sheets = slot("sheets");
  projects.forEach((p, i) => {
    const caveat = CAVEAT.test(p.status);
    const tb = [
      ["Project", p.name],
      ["Revision", el("a", { class: "rev-code", href: p.source }, p.rev)],
      [
        "Drawn by",
        p.credit
          ? el("span", {}, "Christian Nucifora, ", p.creditUrl ? el("a", { href: p.creditUrl }, p.credit.replace("Co-developed", "co-developed")) : p.credit)
          : "Christian Nucifora",
        "tb-wide",
      ],
      ["Kind", p.kind],
      ["Sheet", `${firstSheet + i} of ${totalSheets}`],
      ["Platform", p.platform, "tb-wide"],
      ["Status", p.status, `tb-wide${caveat ? " clouded" : ""}`],
    ];

    const sheet = el(
      "section",
      { class: "sheet project", id: p.id, "aria-labelledby": `${p.id}-h` },
      el(
        "header",
        { class: "sheet-head" },
        el("h2", { id: `${p.id}-h` }, p.name),
        el("span", { class: "sheet-no" }, sheetLabel(firstSheet + i)),
      ),
      el(
        "div",
        { class: "project-grid" },
        el("figure", { class: "drawing" }, drawing(p)),
        el(
          "div",
          { class: "parts" },
          el(
            "table",
            {},
            el("caption", {}, "Stages, bottom to top"),
            el(
              "thead",
              {},
              el(
                "tr",
                {},
                el("th", { scope: "col" }, "Item"),
                el("th", { scope: "col" }, "Stage"),
              ),
            ),
            el(
              "tbody",
              {},
              p.path.map((s, k) =>
                el(
                  "tr",
                  {},
                  el("td", {}, el("span", { class: "num" }, String(k + 1))),
                  el("td", {}, s.label, el("span", {}, s.note)),
                ),
              ),
            ),
          ),
        ),
        el(
          "div",
          { class: "notes" },
          el("h3", {}, "Notes"),
          el(
            "ol",
            {},
            p.notes.map((n) => el("li", {}, n)),
          ),
        ),
        el(
          "div",
          { class: "project-text" },
          el("p", { class: "what" }, p.what),
          el("p", { class: "summary" }, p.summary),
          p.code && el("pre", { class: "code" }, el("code", {}, p.code)),
          el(
            "p",
            {},
            el(
              "a",
              { href: `https://github.com/C-Nucifora/${p.repo}` },
              `github.com/C-Nucifora/${p.repo}`,
            ),
          ),
        ),
        el(
          "dl",
          { class: "titleblock project-block" },
          tb.map(([k, v, cls]) =>
            el("div", { class: cls }, el("dt", {}, k), el("dd", {}, v)),
          ),
        ),
      ),
    );
    sheets.append(sheet);
  });

  // An exploded stack: one slab per stage, the output slab inked solid.
  function drawing(p) {
    const n = p.path.length;
    const W = 230,
      D = 150,
      T = 20,
      GAP = 54;
    const node = svg("svg", {
      role: "img",
      "aria-label": `Exploded drawing of ${p.name}: ${p.path.map((s) => s.label).join(", then ")}.`,
    });
    const top = (n - 1) * (T + GAP) + T;

    // Chain lines through the gaps, at the three visible vertical corners.
    for (const [cx, cy] of [
      [0, D],
      [W, D],
      [W, 0],
    ]) {
      const [x1, y1] = iso(cx, cy, -14),
        [x2, y2] = iso(cx, cy, top + 14);
      node.append(svg("line", { class: "assembly", x1, y1, x2, y2 }));
    }

    p.path.forEach((s, k) => {
      const z = k * (T + GAP);
      node.append(
        svg(
          "g",
          { class: `slab${k === n - 1 ? " last" : ""}` },
          box(0, 0, z, W, D, T),
        ),
      );
      const [ax, ay] = iso(W, D * 0.35, z + T / 2);
      const [rx] = iso(W, 0, 0);
      const bx = rx + 64;
      node.append(
        svg("circle", { class: "leader-dot", cx: ax, cy: ay, r: 2.6 }),
        svg("path", { class: "leader", d: `M ${ax} ${ay} L ${bx - 15} ${ay}` }),
        balloon(bx, ay, k + 1),
      );
    });

    // Flow arrow up the left side.
    const [lx] = iso(0, D, 0);
    const [, yb] = iso(0, D, 0),
      [, yt] = iso(0, D, top);
    const ax = lx - 36;
    node.append(
      svg("path", {
        class: "flow-arrow",
        d: `M ${ax} ${yb} L ${ax} ${yt} M ${ax - 5} ${yt + 9} L ${ax} ${yt} L ${ax + 5} ${yt + 9}`,
      }),
      svg(
        "text",
        { class: "flow-label", x: ax - 8, y: yb + 4, "text-anchor": "end" },
        "in",
      ),
      svg(
        "text",
        { class: "flow-label", x: ax - 8, y: yt + 10, "text-anchor": "end" },
        "out",
      ),
    );
    return node;
  }

  // Layout-dependent pieces --------------------------------------------------

  fitViewBox(plan, 22);
  document.querySelectorAll(".drawing svg").forEach((s) => fitViewBox(s, 18));

  // Scalloped revision clouds sized to their cell.
  function cloudPath(w, h) {
    const r = 7;
    let d = "M 0 0";
    const edge = (x0, y0, x1, y1) => {
      const len = Math.hypot(x1 - x0, y1 - y0),
        k = Math.max(2, Math.round(len / (r * 2)));
      for (let i = 1; i <= k; i++) {
        const x = x0 + ((x1 - x0) * i) / k,
          y = y0 + ((y1 - y0) * i) / k;
        d += ` A ${(len / k) * 0.62} ${(len / k) * 0.62} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    };
    edge(0, 0, w, 0);
    edge(w, 0, w, h);
    edge(w, h, 0, h);
    edge(0, h, 0, 0);
    return d;
  }
  const clouds = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const w = target.clientWidth - 10,
        h = target.clientHeight - 10;
      let c = target.querySelector(".cloud");
      if (!c) {
        c = svg("svg", { class: "cloud", "aria-hidden": "true" }, svg("path"));
        target.append(c);
      }
      c.setAttribute("viewBox", `0 0 ${w} ${h}`);
      c.firstChild.setAttribute("d", cloudPath(w, h));
    }
  });
  document
    .querySelectorAll(".titleblock .clouded")
    .forEach((n) => clouds.observe(n));
})();
