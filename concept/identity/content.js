// Shared content for the identity prototypes.
// Adapted from ../rack/software-content.js, ../rack/experience-content.js and
// ../rack/sources/software-sources.json. Dates come from the August 2026
// LinkedIn snapshot and have not been re-verified.

(function () {
  const gh = "https://github.com/C-Nucifora/";
  const at = (repo, commit, path = "README.md") =>
    `${gh}${repo}/blob/${commit}/${path}`;

  const person = {
    name: "Christian Nucifora",
    email: "cgnucifora@proton.me",
    github: "https://github.com/C-Nucifora",
    githubHandle: "C-Nucifora",
    linkedin: "https://www.linkedin.com/in/christian-nucifora-501432387/",
    oneLine:
      "Engineering and computer science at UQ. Perception and electrical work with UQ Racing.",
    intro: [
      "I study a combined engineering and computer science degree at the University of Queensland, expected to finish in July 2029.",
      "I joined UQ Racing in March 2026 as an Electrical Systems Engineer, contributing to perception and electrical work on the team's autonomous and electric cars.",
      "Outside the team I build my own software, mostly native tools for macOS, Linux and STM32 development.",
    ],
  };

  // Ordered oldest first. `end: null` means listed as current in the August 2026 snapshot.
  const experience = [
    {
      id: "school",
      kind: "school",
      title: "Student",
      org: "St Augustine's College, Cairns",
      start: [2018, 1],
      end: [2023, 11],
      summary: "Secondary school in Cairns.",
    },
    {
      id: "uq",
      kind: "study",
      title: "Bachelor of Engineering / Bachelor of Computer Science",
      org: "The University of Queensland",
      start: [2024, 2],
      end: [2029, 7],
      expectedEnd: true,
      summary: "Combined degree, electrical and electronics engineering field.",
    },
    {
      id: "st-leos",
      kind: "work",
      title: "IT Assistant",
      org: "St Leo's College, UQ",
      start: [2025, 2],
      end: [2025, 11],
      summary:
        "Part-time, on site. Level 1 support and troubleshooting for college staff and residents, including after-hours help.",
    },
    {
      id: "uqr",
      kind: "team",
      title: "Electrical Systems Engineer",
      org: "UQ Racing",
      start: [2026, 3],
      end: null,
      summary:
        "Part-time, hybrid, St Lucia. Team contribution to perception and electrical systems on the autonomous and electric Formula SAE cars.",
    },
    {
      id: "dataannotation",
      kind: "work",
      title: "Software Engineer (contract)",
      org: "DataAnnotation",
      start: [2026, 8],
      end: null,
      summary:
        "Remote contract. The published role covers writing code and reviewing generated implementations.",
    },
  ];

  // `path` is the project's own data or control flow, taken from its README at `rev`.
  // Figures built from it are diagrams of that description, not screenshots.
  const projects = [
    {
      id: "m1",
      name: "M1 Toolchain",
      repo: "m1-tools",
      repositoryCreated: "2026-05-31",
      rev: "599969a",
      source: at("m1-tools", "599969ac0276d01fba8a45f9fa51030ba7f40971"),
      kind: "Language tooling",
      platform: "CLI, language server, editors and CI",
      credit: "Co-developed with Ned Lane",
      creditUrl: "https://github.com/nedlane",
      status: "Independent community project, no MoTeC affiliation",
      what: "Formatting, diagnostics and editor support for MoTeC M1 Script.",
      summary:
        "A community toolchain for M1 Script, the language for MoTeC M1 engine and vehicle controllers. Shared parsing and project analysis feed command-line checks, a language server and editor integrations, so a team's committed rules apply in the editor and in CI.",
      example: {
        before: "local spare=1+2;\nlocal value=3+4;\nvalue=value*2;",
        formatted: "local spare = 1 + 2;\nlocal value = 3 + 4;\nvalue = value * 2;",
        diagnostic: "Example.m1scr:1:7: warning[L012]: local `spare` is never used",
        fixed: "local value = 3 + 4;\nvalue = value * 2;",
        checks: "m1-fmt --check Example.m1scr\nm1-lint --select L012 Example.m1scr",
        ci: "https://github.com/C-Nucifora/m1-ci",
      },
      notes: [
        "One Tree-sitter grammar feeds syntax and diagnostics. Formatting, linting, type checking, documentation and project inspection are separate tools on top of it.",
        "An umbrella repository checks out the sibling repositories from a vcstool manifest. Consumers install tagged releases pinned by CI, not whatever is on main.",
        "Offline evaluation is a model, not an ECU emulator. The numeric overlays in the visualiser are experimental and are not calibration evidence.",
      ],
      path: [
        { label: "Tree-sitter grammar", note: "One parse of M1 Script" },
        { label: "Project analysis", note: "Shared m1-tools.toml rules" },
        { label: "Format, lint, type-check", note: "Separate domain tools" },
        { label: "Language server", note: "Editor operations" },
        { label: "Neovim, VS Code and CI", note: "Same rules everywhere" },
      ],
    },
    {
      id: "wavelength",
      name: "Wavelength",
      repo: "wavelength",
      repositoryCreated: "2026-10-16",
      rev: "1e65113",
      source: at("wavelength", "1e651133b0f65336d6336af12cc0a9aab0f58869"),
      kind: "macOS app",
      platform: "macOS 14+, SwiftUI with a local Bun engine",
      status: "Experimental, source builds only",
      what: "Discover music and review a playlist draft before saving it to Apple Music.",
      summary:
        "An experimental macOS app that turns genres, artist seeds and discographies into playlist drafts. Nothing is written to Apple Music until the listener reviews the draft and asks for it.",
      notes: [
        "Genre discovery uses the largely historical Every Noise map with current Apple metadata. Artist discovery uses MusicBrainz and ListenBrainz. Drafts keep their sources and their uncertain matches.",
        "A playlist job saves its write intent and the returned playlist identity. Additions are checked against the playlist's actual contents instead of trusting an HTTP 200, and an ambiguous create is never blindly resent.",
        "The native helper holds the Keychain item and session credentials; the Bun engine on loopback never sees them. Apple does not support this session route and could break it at any time.",
      ],
      path: [
        {
          label: "Genres, artists, discographies",
          note: "Every Noise, MusicBrainz, ListenBrainz",
        },
        { label: "Local Bun engine", note: "Builds a draft with sources" },
        { label: "Listener review", note: "Pick tracks, check storefront" },
        { label: "Playlist job", note: "Write intent saved first" },
        { label: "Apple Music", note: "Contents read back and compared" },
      ],
    },
    {
      id: "islet",
      name: "Islet",
      repo: "islet",
      repositoryCreated: "2026-07-22",
      rev: "608b327",
      source: at("islet", "608b32779cda8026f3a080fcfaf153ee97320d61"),
      kind: "macOS utility",
      platform: "macOS 26 and 27",
      credit: "Co-developed with Ned Lane",
      creditUrl: "https://github.com/C-Nucifora/islet/graphs/contributors",
      status: "Active development, build from source",
      what: "Now Playing, timers, clipboard history and a file shelf at the MacBook notch.",
      summary:
        "A native utility that opens from the top edge of the screen with Now Playing, timers, clipboard history, a file shelf, and battery and port state. A Home view collects events and actions for the current app and session.",
      notes: [
        "Pulse lets local programs report progress, such as a command-line Xcode build, by sending bounded JSON. Islet owns presentation, expiry and allowed actions; providers get explicit permissions, not the run of the app.",
        "Setup asks for each permission where the activity that needs it is enabled. Calendar and Reminders data stay on the Mac, and clipboard history drops concealed and likely-credential content.",
      ],
      path: [
        { label: "Pointer reaches top edge", note: "Or click to pin" },
        { label: "Activity area", note: "Media, timers, clipboard, shelf" },
        { label: "Home view", note: "Events and actions for this session" },
        { label: "Pulse providers", note: "Bounded JSON from local tools" },
      ],
    },
    {
      id: "mozaproxy",
      name: "mozaproxy",
      repo: "mozaproxy",
      repositoryCreated: "2026-10-16",
      rev: "98d5dad",
      source: at("mozaproxy", "98d5dadc6efdf565e6caa7e49a3d029f4046946e"),
      kind: "Linux desktop app",
      platform: "Python and Qt 6, evdev and uinput",
      status: "Hardware and game validation in progress",
      what: "A Linux control panel for MOZA racing wheels.",
      summary:
        "Live input monitoring and settings for MOZA wheel bases on Linux, plus an optional virtual-wheel relay for games. Reading the device, applying settings and starting the relay are separate steps, so opening the app never quietly changes the wheel.",
      notes: [
        "Choosing a saved profile does not write it. Apply writes the settings and reads them back. The settings connection takes the serial port exclusively and reports any other app holding it.",
        "The relay creates a uinput wheel and forwards the force-feedback parameters a game actually sends. It does not invent road feel. Custom sampled waveforms are excluded because they point into the sending process's memory.",
        "The compatibility notes record attended tests for Forza Horizon 5 and JDM under specific setups. That is not a promise for every firmware, wheel or Proton version.",
      ],
      path: [
        { label: "MOZA base", note: "Steering, pedals, paddles" },
        { label: "Live monitor", note: "Read-only evdev input" },
        { label: "Settings", note: "Apply, then read back" },
        { label: "Optional relay", note: "uinput virtual wheel" },
        { label: "Game", note: "Force feedback passed through" },
      ],
    },
    {
      id: "nvim-stm32",
      name: "nvim-stm32",
      repo: "nvim-stm32",
      repositoryCreated: "2026-09-04",
      rev: "6a7951e",
      source: at("nvim-stm32", "6a7951e6fe29b51a90290e2e8ee6b0573cd406dd"),
      kind: "Neovim plugin",
      platform: "Neovim 0.11+, CMake or Make",
      status: "Needs a physical-board acceptance run",
      what: "Build, flash and monitor STM32 firmware from Neovim.",
      summary:
        "Finds the nearest STM32 project from the open file, keeps build output tied to the selected configuration, and puts inspection, programming and UART monitoring in the editor.",
      notes: [
        ":STM32Plan flash shows the target, probe, image layout, tool and exact arguments before anything touches the board. Programming checks target identity and that the image is fresh.",
        "Multi-image flashes reject overlapping erase sectors. The UART monitor owns its own process and device lock, so closing it does not kill someone else's serial session.",
        "Fake programmer executables test the process handling. They cannot prove USB reliability or what ended up in flash, so the release still waits on a run against a NUCLEO-F429ZI.",
      ],
      code: ":STM32Info\n:STM32Plan flash\n:checkhealth nvim-stm32",
      path: [
        { label: "Current buffer", note: "Walk up to the Git root" },
        { label: "Target evidence", note: "CubeMX, linker script, defines" },
        { label: "Build configuration", note: "Kept per project and image" },
        { label: "Flash plan", note: "Shown before it runs" },
        { label: "Board and UART", note: "Identity and freshness checked" },
      ],
    },
    {
      id: "mountd",
      name: "mountd",
      repo: "mountd",
      repositoryCreated: "2026-07-29",
      rev: "b39ea7e",
      source: at("mountd", "b39ea7ed42b418faa870f74f8edf282f60797fde"),
      kind: "macOS daemon",
      platform: "Rust LaunchAgent, NFS and SMB",
      status: "Documented credential limitation",
      what: "Network shares that mount only when they can actually work.",
      summary:
        "A per-user mount manager for shares that are not always reachable. It waits for the right network and a successful file-service probe before mounting, then keeps checking the mount is healthy.",
      notes: [
        "Each mount has conditions and an ordered list of endpoints, so a LAN address can win over Tailscale. A network change triggers a fresh pass; it does not prove the share is ready.",
        "A manual unmount stays unmounted until conditions change. mountctl explain says why a share is or isn't mounted.",
      ],
      code: "mountctl status\nmountctl explain nas-media",
      path: [
        { label: "Network event", note: "Or wake from sleep" },
        { label: "Conditions", note: "Network, dependencies" },
        { label: "Service probe", note: "TCP 445 or 2049" },
        { label: "Mount", note: "Best surviving endpoint" },
      ],
    },
    {
      id: "reconcile",
      name: "Reconcile",
      repo: "reconcile-app",
      repositoryCreated: "2026-10-16",
      rev: "13fece9",
      source: at("reconcile-app", "13fece900d952963f0390296d704b86206b70e34"),
      kind: "Web app",
      platform: "Browser only, no accounts",
      status: "Data stays in the browser",
      what: "Shared expenses into balances and a settlement plan.",
      summary:
        "Split costs equally, by amount, percentage, shares or item by item. The engine works in integer cents and produces a repeatable list of transfers.",
      notes: [
        "Settlement matches the largest debt with the largest credit, breaking ties by identifier. The plan is predictable, though the greedy method doesn't guarantee the fewest transfers.",
      ],
      path: [
        { label: "Expenses", note: "Equal, exact, percent, items" },
        { label: "Integer cents", note: "Deterministic rounding" },
        { label: "Balances", note: "Net position per person" },
        { label: "Transfers", note: "Greedy, repeatable" },
      ],
    },
    {
      id: "ci-runner-console",
      name: "CI Runner Console",
      repo: "ci-runner-console",
      repositoryCreated: "2026-08-15",
      rev: "247135a",
      source: at(
        "ci-runner-console",
        "247135a5b6dbd224b5a840a53fedb6dd09a118b2",
      ),
      kind: "Infrastructure",
      platform: "Node, GitHub API, restricted SSH",
      status: "Self-hosted",
      what: "Self-hosted GitHub Actions runners, reconciled against systemd.",
      summary:
        "Compares what GitHub thinks is registered with what systemd is actually running on the runner VM, and names every disagreement instead of guessing.",
      notes: [
        "Control goes through a forced SSH command whose wrapper validates arguments against an allowlist. Tokens travel over stdin and the host key is pinned.",
      ],
      path: [
        { label: "GitHub registrations", note: "One account of the runners" },
        { label: "systemd units", note: "The other account" },
        { label: "Reconcile", note: "Disagreements named" },
        { label: "Forced SSH command", note: "Allowlisted actions" },
      ],
    },
    {
      id: "artifact-platform",
      name: "Artifact Platform",
      repo: "artifact-platform",
      repositoryCreated: "2026-07-23",
      rev: "defe312",
      source: at(
        "artifact-platform",
        "defe312919ef574f2ad9d1e1605ab409dd5400c0",
      ),
      kind: "Infrastructure",
      platform: "Caddy, Python, Tailscale",
      status: "Self-hosted",
      what: "A catalog of small HTML tools spread across my devices.",
      summary:
        "Drop a directory with an index.html and it is served. A discovery service reads the other nodes' manifests over Tailscale SSH and assembles one catalog.",
      notes: [
        "Publishing and administration are separate: Funnel can publish the catalog, while admin routes need an optional OIDC overlay.",
      ],
      path: [
        { label: "A directory", note: "index.html and metadata" },
        { label: "Caddy", note: "Served immediately" },
        { label: "Discovery", note: "Manifests over Tailscale SSH" },
        { label: "One catalog", note: "Written atomically" },
      ],
    },
    {
      id: "gphotos",
      name: "Album downloader",
      repo: "gphotos-album-downloader",
      repositoryCreated: "2026-06-23",
      rev: "4a4e747",
      source: at(
        "gphotos-album-downloader",
        "4a4e7471a05e34059205a691b3b6fc4f8db753e4",
      ),
      kind: "Command line",
      platform: "Python, web API and Playwright",
      status: "Depends on undocumented behaviour",
      what: "Resumable downloads of large shared Google Photos albums.",
      summary:
        "Tracks every item through enumeration, download and retry, with a browser fallback for when the undocumented API changes. Likely preview copies are flagged rather than counted as done.",
      notes: [
        "Saving shared items uses the account's storage. Cleanup is skipped wherever ownership is unclear, and the API backend never empties Trash.",
      ],
      path: [
        { label: "Shared album", note: "API or browser enumeration" },
        { label: "Manifest", note: "Per-item progress" },
        { label: "Download", note: "Resumes after failure" },
        { label: "Fidelity check", note: "Flags preview copies" },
      ],
    },
  ];

  const smaller = [
    {
      name: "iOS Shortcuts",
      url: at("iOS-Shortcuts", "f3237a5f54b19b2d165568579bd720b8bdb2739f"),
      kind: "Shortcuts",
      what: "Shortcuts kept as reviewable XML source, including a meal-nutrition entry flow into Apple Health.",
    },
    {
      name: "Instagram Unliker",
      url: at("instagram-unliker", "7e87b20ec158bae40999373fb3310298946625fb"),
      kind: "Script",
      what: "A resumable script with dry-run mode, built on an unofficial API.",
    },
    {
      name: "LeetCode",
      url: at("leetcode", "8a1150a7561366e40f625856ebfc170e67d6a6b5"),
      kind: "Practice",
      what: "Practice solutions, mostly Python. Exercises, not a product.",
    },
  ];

  // The portfolio features these projects, in this order, on the
  // timeline and in Selected work. The rest go in Other projects.
  const featured = ["m1"];

  const scan = {
    simulated:
      "Simulated LiDAR sweep of a cone track, generated in the browser. Not UQ Racing data.",
    recorded: "Recorded LiDAR and planner paths. Path alignment is approximate.",
  };

  const racing = {
    summary: "I joined UQ Racing as an Electrical Systems Engineer in March 2026. I contribute to perception and electrical systems across the team's autonomous and electric Formula SAE cars.",
    example: "An earlier public project from the autonomous program generated depth maps from LiDAR for cone detection. The team also publishes ROS messages used by its vehicle software.",
    software: "https://github.com/UQRacing/lidar_processing",
    university: "https://www.eait.uq.edu.au/community/high-school-activities-and-digital-resources/high-school-workshops-and-activities/uq-racing-visit",
  };

  // Add, reorder or rename groups here. Experience retains its original kinds
  // for the other layouts. GitHub createdAt dates are repository milestones.
  const groups = [
    {
      id: "education",
      label: "Education",
      color: "#1f5fd6",
      kinds: ["school", "study"],
    },
    { id: "projects", label: "Projects", color: "#7a5cc2", kinds: [] },
    { id: "work", label: "Work", color: "#0e9f75", kinds: ["work"] },
    { id: "team", label: "Team", color: "#e5452f", kinds: ["team"] },
  ];
  const events = [
    ...experience.map((event) => ({
      ...event,
      group: groups.find((group) => group.kinds.includes(event.kind)).id,
      label: event.org,
      fromSnapshot: true,
    })),
    ...projects
      .filter((project) => project.repositoryCreated)
      .map((project) => ({
        id: project.id,
        group: "projects",
        title: project.name,
        start: project.repositoryCreated.split("-").slice(0, 2).map(Number),
        summary: project.what,
        projectId: project.id,
        source: { label: "GitHub repository created", url: gh + project.repo },
      })),
  ];

  window.CN = {
    person,
    experience,
    projects,
    smaller,
    featured,
    scan,
    racing,
    timeline: { groups, events },
    snapshot: "August 2026",
  };
})();
