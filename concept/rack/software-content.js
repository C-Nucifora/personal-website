// Public repository snapshots and approved publication records are listed in sources/software-sources.json.
const source = (repository, commit, path, label) => ({ label, url: `https://github.com/${repository}/blob/${commit}/${path}` });
const text = (id, title, body) => ({ id, type: 'text', title, body });
const references = links => ({ id: 'technical-references', type: 'links', title: 'Technical references', links });

export const softwareContent = {
  'ci-runner-console': {
    description: 'A control panel for self-hosted GitHub Actions runner instances on one dedicated virtual machine. The useful part is reconciling two accounts of the same runner: what GitHub has registered, and what systemd is actually running.',
    facts: [
      { label: 'Control path', value: 'GitHub API and restricted SSH' },
      { label: 'Authentication', value: 'Authentik OIDC' },
      { label: 'Runner boundary', value: 'Shared virtual machine' },
    ],
    sections: [
      text('runner-inventory', 'A runner can exist on only one side', 'Deleting a runner registration does not necessarily remove its service, and creating a directory does not register a working runner. The console compares both inventories and names those disagreements explicitly. A deliberate stop stays stopped while GitHub catches up. If GitHub is unavailable, the interface reports incomplete information rather than labelling every local instance an orphan.'),
      text('runner-control', 'A small remote control vocabulary', 'The Node service can start, stop, restart, create and remove instances through a forced SSH command. Its wrapper validates a JSON argument list against an allowlist before running the VM control script. Registration and removal tokens travel through standard input, and the SSH host key is pinned. Successful and failed changes are recorded against the signed-in identity.'),
      text('runner-capacity', 'More instances, the same machine', 'Each instance has a separate directory, registration and systemd unit and accepts one job at a time. Instances still share the VM filesystem and Docker daemon. Adding one increases concurrency without creating a new security boundary. The application and VM script enforce their own instance caps, while the console exposes host headroom. It does not provision virtual machines or manage a hypervisor.'),
      references([
        source('C-Nucifora/ci-runner-console', '247135a5b6dbd224b5a840a53fedb6dd09a118b2', 'README.md', 'Deployment and security model'),
        source('C-Nucifora/ci-runner-console', '247135a5b6dbd224b5a840a53fedb6dd09a118b2', 'src/reconcile.ts', 'Runner inventory and disagreement states'),
        source('C-Nucifora/ci-runner-console', '247135a5b6dbd224b5a840a53fedb6dd09a118b2', 'vm/ci-runner-ctl-ssh', 'Forced-command validation'),
      ]),
    ],
  },
  'artifact-platform': {
    description: 'A self-hosted catalog for small HTML tools, dashboards and documents spread across several devices. Each node keeps serving its own files, while a discovery service assembles links to the other nodes on the Tailscale network.',
    facts: [
      { label: 'Publishing unit', value: 'A directory with index.html' },
      { label: 'Discovery identity', value: 'Tailscale SSH node identity' },
      { label: 'Administration', value: 'Optional OIDC overlay' },
    ],
    sections: [
      text('artifact-authoring', 'Publish a directory', 'An artifact is a directory under artifacts/ with an index.html file and optional title and description metadata. Caddy serves it immediately. The local Docker Compose preview works before Tailscale enrollment, so authoring a small tool does not depend on setting up the network first.'),
      text('artifact-discovery', 'A catalog assembled across devices', 'The Python discovery service asks Tailscale for online platform nodes, then reads their generated manifests through Tailscale SSH. It validates peer data, rebuilds public URLs and writes the combined catalog atomically. Operator rules can exclude devices or individual artifacts, override endpoints, or add a manually configured peer.'),
      text('artifact-access', 'Separate publication from administration', 'Tailscale Funnel can publish the ordinary catalog and artifact pages. The base mode does not expose the admin routes. A separate custom-domain overlay adds OIDC through OAuth2 Proxy and an administrator group check. The internal management token stays between services rather than becoming a browser credential. Live enrollment and external identity-provider behavior require operational checks beyond the repository tests.'),
      references([
        source('C-Nucifora/artifact-platform', 'defe312919ef574f2ad9d1e1605ab409dd5400c0', 'README.md', 'Artifact convention and deployment modes'),
        source('C-Nucifora/artifact-platform', 'defe312919ef574f2ad9d1e1605ab409dd5400c0', 'platform/discovery/discovery/mesh.py', 'Peer resolution and operator overrides'),
        source('C-Nucifora/artifact-platform', 'defe312919ef574f2ad9d1e1605ab409dd5400c0', 'platform/discovery/discovery/ssh_fetch.py', 'Bounded manifest fetch over Tailscale SSH'),
      ]),
    ],
  },
  'nvim-stm32': {
    description: 'A Neovim plugin for the firmware loop between editing a source file and checking the board. It discovers the nearest STM32 project, keeps build artifacts attached to the selected configuration, and exposes inspection, programming and serial monitoring in the editor.',
    facts: [
      { label: 'Editor', value: 'Neovim 0.11+' },
      { label: 'Build systems', value: 'CMake and Make' },
      { label: 'Programmers', value: 'CubeProgrammer, stlink and OpenOCD' },
      { label: 'Status', value: 'Physical-board acceptance still required' },
    ],
    sections: [
      text('stm32-project', 'Start from the current file', 'Project discovery walks from the current buffer to the Git root. CubeMX configuration, startup files, linker scripts and compiler definitions provide target evidence. The information view distinguishes exact device matches from inferred signals. Each project and image retains its own selected build configuration instead of sharing one global output directory.'),
      text('stm32-programming', 'Inspect before touching the target', 'The plugin can show a plan containing the target, probe, image layout, tool and escaped arguments before starting an operation. Programming checks target identity and artifact freshness. Multi-image flashes reject overlapping erase sectors, and erase requires a new confirmation. UART monitoring owns its own process and device lock, so closing it does not terminate unrelated serial sessions.'),
      { id: 'stm32-example', type: 'code', title: 'A passive first look', language: 'vim', code: ':STM32Info\n:STM32Plan flash\n:checkhealth nvim-stm32' },
      text('stm32-validation', 'Software checks are only part of the result', 'Fake programmer executables exercise process handling without connecting to a board. They do not establish USB reliability, target power, actual flash contents or UART wiring. The documented release boundary still requires a connected NUCLEO-F429ZI run. Debugging is planned rather than presented as an implemented editor feature.'),
      references([
        source('C-Nucifora/nvim-stm32', '6a7951e6fe29b51a90290e2e8ee6b0573cd406dd', 'README.md', 'Commands, target checks and validation limits'),
        source('C-Nucifora/nvim-stm32', '6a7951e6fe29b51a90290e2e8ee6b0573cd406dd', 'lua/nvim-stm32/init.lua', 'Editor command and operation entry points'),
      ]),
    ],
  },
  mozaproxy: {
    description: 'A native Linux control panel for MOZA wheel settings and live input, with an optional virtual-wheel relay for game compatibility work. It separates reading the device, applying settings and starting a relay so that opening the app does not silently change the wheel or a game.',
    facts: [
      { label: 'Interface', value: 'Python and Qt 6 desktop app' },
      { label: 'Input path', value: 'evdev with optional uinput relay' },
      { label: 'Status', value: 'Hardware and game validation in progress' },
    ],
    sections: [
      text('moza-desktop', 'Read, edit, then apply', 'Live monitoring reads steering, pedals, paddles and buttons. A separate settings connection reads the base and supported controls. Selecting a saved profile does not write it to hardware; Apply performs the write and checks readback. The settings connection takes exclusive serial ownership and reports a competing settings application.'),
      text('moza-relay', 'Pass through the effects a game actually sends', 'The optional relay creates a uinput wheel and forwards supported force-feedback parameters to the physical driver. It does not invent road feel. Native and compact button profiles preserve axes while offering different button mappings for game limits. Custom sampled waveforms are excluded because they refer to memory in the sending process.'),
      text('moza-compatibility', 'A game launch is not a driving pass', 'The published compatibility matrix records attended controls and physical force-feedback checks for Forza Horizon 5 and JDM under specific manual setups. Those results do not certify every firmware, wheel, Proton version or integrated route. Calibration, firmware management and automatic game switching remain outside the implemented desktop feature set.'),
      references([
        source('C-Nucifora/mozaproxy', '98d5dadc6efdf565e6caa7e49a3d029f4046946e', 'README.md', 'Desktop behavior and relay boundaries'),
        source('C-Nucifora/mozaproxy', '98d5dadc6efdf565e6caa7e49a3d029f4046946e', 'docs/compatibility.md', 'Configuration-specific game evidence'),
      ]),
    ],
  },
  'm1-toolchain': {
    description: 'A community toolchain for editing and checking MoTeC M1 Script outside the original development environment. Shared parsing and project analysis feed command-line checks, a language server and editor integrations, so the same project rules can follow a script from the editor into CI.',
    facts: [
      { label: 'Role', value: 'Co-development with Ned Lane' },
      { label: 'Language', value: 'MoTeC M1 Script and project files' },
      { label: 'Configuration', value: 'Shared m1-tools.toml' },
      { label: 'Integration', value: 'Editors, standalone tools and CI' },
    ],
    sections: [
      text('m1-team', 'Team context', 'Co-developed with Ned Lane. The toolchain spans repositories under both accounts, including Ned\'s workspace library, project editor, CAN tool, MCP server and VS Code extension. The fifteen tools in this rack are a selection from that shared ecosystem. This is independent community work, without MoTeC affiliation or endorsement.'),
      text('m1-language', 'One language model, several ways to use it', 'The Tree-sitter grammar feeds shared syntax access and diagnostics. Domain tools add formatting, linting, type checking, documentation and project inspection. The language server connects these to editor operations. The visualiser can consume project relationships and evaluator output, while CI runs checks on M1 script repositories independently of an editor session.'),
      text('m1-releases', 'Develop together, install pinned versions', 'The umbrella repository checks out sibling repositories through a vcstool manifest. That development manifest follows main branches; consumers use released tools and the versions pinned by CI. Dependencies use versioned Git tags, and consumer updates propagate releases through the graph. Shared workspace configuration makes committed team rules take precedence over personal editor preferences.'),
      text('m1-boundaries', 'Offline analysis has a boundary', 'Parsing, diagnostics and graph inspection help explain a project before it reaches hardware. Offline evaluation is a model rather than an ECU emulator, and experimental numeric overlays are not calibration or safety evidence. Each tool record below explains its own inputs, outputs and limits. Public editor setup includes both the Neovim integration and Ned\'s VS Code extension.'),
      references([
        source('C-Nucifora/m1-tools', '599969ac0276d01fba8a45f9fa51030ba7f40971', 'README.md', 'Architecture, editor setup and release model'),
        source('C-Nucifora/m1-tools', '599969ac0276d01fba8a45f9fa51030ba7f40971', 'm1-tools.repos', 'Cross-account repository manifest'),
        source('C-Nucifora/m1-eval', '0b5cd55aaf159ee34d078faf7777a4c98e515701', 'README.md', 'Offline evaluator maturity contract'),
        source('C-Nucifora/m1-visualiser', 'e025f550a43a1d1a70abf659b2851bb5fc97672f', 'README.md', 'Experimental value-overlay limits'),
        { label: 'Ned Lane, collaborator', url: 'https://github.com/nedlane' },
        { label: 'Language-server contributor history', url: 'https://github.com/C-Nucifora/m1-lsp/graphs/contributors' },
      ]),
    ],
  },
  wavelength: {
    description: 'An experimental macOS music-discovery app that turns genres, artist seeds and discographies into reviewed Apple Music playlists. A SwiftUI interface owns the account connection and a bundled local Bun engine handles discovery, drafts and saved jobs.',
    facts: [
      { label: 'Platform', value: 'macOS 14+ source builds' },
      { label: 'Interface', value: 'SwiftUI with a local Bun engine' },
      { label: 'Account requirement', value: 'Apple Music subscription' },
      { label: 'Status', value: 'Experimental; public download not declared ready' },
    ],
    sections: [
      text('wavelength-discover', 'A draft to review before creating anything', 'Genre discovery uses the largely historical Every Noise map with current Apple metadata. Artist discovery uses MusicBrainz and ListenBrainz, while discography mode reads an artist\'s catalog releases and tracklists. Drafts retain their sources and uncertain matches. The listener selects tracks, checks availability in the connected storefront and explicitly starts playlist creation.'),
      text('wavelength-writes', 'Treat an uncertain write differently from a failed read', 'Playlist jobs save write intent and retain the returned playlist identity. Additions are checked against ordered catalog contents rather than trusting an HTTP success response. An interrupted or ambiguous creation cannot simply resend the create request. Cover generation uses background Music Automation separately, so retrying artwork does not resend the playlist\'s songs.'),
      text('wavelength-local', 'A native boundary around the account session', 'The native helper owns the dedicated Keychain item and Apple web-session credentials. The Bun engine runs on loopback and does not receive those credentials. Saved drafts, jobs, assessments and listening-history imports remain in the app\'s local data directory. History reports distinguish cumulative library metadata from timestamped export rows rather than turning play counts into invented listening hours.'),
      text('wavelength-status', 'An experiment with explicit service limits', 'Apple does not support this web-session reuse route and can change or expire it. The app needs a subscription and sensitive session credentials. Source builds are available, but the repository does not declare a public download ready; notarization, clean-machine installation and real Apple CSV export compatibility are not established. AI-artist filtering uses recorded local assessments, not a comprehensive detector.'),
      references([
        source('C-Nucifora/wavelength', '1e651133b0f65336d6336af12cc0a9aab0f58869', 'README.md', 'Discovery, connection flow and current delivery state'),
        source('C-Nucifora/wavelength', '1e651133b0f65336d6336af12cc0a9aab0f58869', 'src/jobs.ts', 'Interrupted jobs and uncertain playlist writes'),
      ]),
    ],
  },
  islet: {
    description: 'A native macOS utility that puts brief interactions around the MacBook notch: a timer, media controls, a file shelf or the progress of a build. Activities can be reordered or hidden, while a contextual Home view combines the information relevant to the current session.',
    facts: [
      { label: 'Role', value: 'Co-development with Ned Lane' },
      { label: 'Platform', value: 'macOS 26 and macOS 27' },
      { label: 'Interaction', value: 'Top-edge reveal or click to pin' },
      { label: 'Status', value: 'Active development; build from source' },
    ],
    sections: [
      text('islet-team', 'Team context', 'Co-developed with Ned Lane. The shared project combines native interface work, system integrations and a growing set of activities. The public repository and contributor history document that collaboration.'),
      text('islet-edge', 'Keep short tasks at the edge of the screen', 'Islet opens when the pointer moves past the top edge, with an optional click-to-pin mode. Now Playing, timers, clipboard history, connected ports, battery state and the temporary file shelf share one activity area. Home adds events, reminders and actions based on the current app and system state. Multiple displays and full-screen hiding are configurable.'),
      text('islet-pulse', 'Let a build report progress without loading a plugin', 'Pulse accepts bounded JSON messages from local providers running outside the app. Islet owns presentation, expiry and allowed actions. Provider credentials have explicit permissions, and a first-party wrapper can report command-line Xcode builds and tests. T3 Code activity is another local integration rather than a reason to give every provider unrestricted access to the app.'),
      text('islet-permissions', 'Ask for access where it is used', 'Setup lets people choose activities and request the permissions those activities need. Calendar and Reminders data stays on the Mac. Clipboard history is session-only and filters concealed, transient and likely credential content. Stable code signing preserves macOS permission identity across local builds. Islet is in active development, with source-build instructions for macOS 26 and 27.'),
      references([
        source('C-Nucifora/islet', '608b32779cda8026f3a080fcfaf153ee97320d61', 'README.md', 'Current activities, supported systems and privacy'),
        source('C-Nucifora/islet', '608b32779cda8026f3a080fcfaf153ee97320d61', 'Integrations/Pulse/README.md', 'Local Pulse provider contract'),
        { label: 'Islet contributor history', url: 'https://github.com/C-Nucifora/islet/graphs/contributors' },
      ]),
    ],
  },
  'personal-website': {
    description: 'A portfolio developed through successive interface experiments. The earlier public version used a terminal and virtual filesystem; this rack revision uses physical rack units, pull-out project carriers and a camera transition into ordinary reading pages.',
    facts: [
      { label: 'Current interface', value: 'Procedural Three.js datacenter' },
      { label: 'Reading routes', value: 'Direct pages and a Text view' },
      { label: 'Public snapshot', value: 'Earlier terminal implementation' },
    ],
    sections: [
      text('portfolio-interface', 'Make the interface part of the work', 'The terminal version offered typed commands, clicked tabs and keyboard shortcuts over one shared state. Its read-only source viewer exposed project files through a virtual filesystem. The rack revision explores a different physical model: each enclosure represents a project, while smaller records share drive sleds in the Personal Projects server.'),
      text('portfolio-reading', 'The spatial path still ends at a web page', 'Selecting a rack unit brings the project forward. M1 tools and the personal-project sleds can then be pulled out individually before a deeper camera move opens the reading view. Each record also has a direct URL. Text view reaches the same material without loading Three.js, and reduced motion keeps navigation usable without following the camera.'),
      text('portfolio-current', 'Procedural equipment and a static build', 'The rack uses procedural Three.js geometry, shared textures and hardware-specific fronts. Its static build targets Vercel, and project content and placement share a structured catalog with the admin preview. The linked public commit documents the earlier terminal implementation; it is not the source snapshot for the current rack.'),
      references([
        source('C-Nucifora/personal-website', '0084c1bf0013ea3d6771dc031443a8247aab68ab', 'README.md', 'Earlier terminal portfolio snapshot'),
      ]),
    ],
  },
  'reconcile-app': {
    description: 'A browser app for working out shared expenses without setting up accounts or a server. Groups contain people and costs; the calculation engine turns those entries into balances and a repeatable list of suggested transfers.',
    facts: [
      { label: 'Calculations', value: 'Integer cents with deterministic rounding' },
      { label: 'Storage', value: 'localStorage and IndexedDB' },
      { label: 'Export', value: 'PDF expense and settlement reports' },
    ],
    sections: [
      text('reconcile-splits', 'Split the whole expense or assign individual items', 'An expense can be divided equally, by exact amounts, percentages or shares. Itemized entries assign specific items to specific people, and optional receipt photos stay with the browser data. Groups keep unrelated trips or household expenses separate. The result shows both each person\'s net position and the entries behind it.'),
      text('reconcile-engine', 'Repeatable arithmetic before presentation', 'The engine calculates in integer cents and uses deterministic rounding. Settlement repeatedly matches the largest remaining debt with the largest credit, breaking equal amounts by identifier. This produces a predictable plan, but the greedy method does not guarantee the smallest possible number of transfers. Calculation code is separate from browser state, PDF generation and interface components.'),
      text('reconcile-storage', 'Local records have a clear limit', 'Names, people and expenses live in localStorage; receipt images use IndexedDB. The app does not upload or sync them between devices. Clearing site data or changing browser profile or origin makes those records unavailable. A PDF is a readable report of expenses and settlements, not a restorable backup of the application data.'),
      references([
        source('C-Nucifora/reconcile-app', '13fece900d952963f0390296d704b86206b70e34', 'README.md', 'Split modes, local storage and report boundaries'),
        source('C-Nucifora/reconcile-app', '13fece900d952963f0390296d704b86206b70e34', 'src/engine/settle.ts', 'Deterministic settlement algorithm'),
        source('C-Nucifora/reconcile-app', '13fece900d952963f0390296d704b86206b70e34', 'src/engine/money.ts', 'Cent arithmetic and rounding'),
      ]),
    ],
  },
  mountd: {
    description: 'A macOS mount manager for network shares that are not always reachable. It waits for the right network, required services and a successful file-service probe before attempting an NFS or SMB mount, then checks whether that connection remains healthy.',
    facts: [
      { label: 'Runtime', value: 'Rust per-user LaunchAgent' },
      { label: 'Protocols', value: 'NFS and SMB' },
      { label: 'Inspection', value: 'mountctl status and explain' },
    ],
    sections: [
      text('mountd-conditions', 'A reachable host is not a reachable share', 'Each logical mount has conditions and an ordered list of endpoints. A LAN address can take priority over Tailscale or a hostname. Before mounting, the daemon checks the relevant dependencies and probes TCP port 445 for SMB or 2049 for NFS. Network events schedule a fresh reconciliation pass; they do not by themselves prove that a share is ready.'),
      text('mountd-recovery', 'Handle wake, failure and deliberate unmounts differently', 'Health checks detect an endpoint that stops responding and can rebuild the mount through a surviving address. Wake handling allows the network time to settle before interpreting failed conditions. A manual unmount remains unmounted until conditions change or the user requests another attempt. Nonblocking mount enumeration and bounded operations keep an unavailable server from stalling the status interface.'),
      { id: 'mountd-example', type: 'code', title: 'Inspect the decision', language: 'sh', code: 'mountctl status\nmountctl explain nas-media' },
      text('mountd-user', 'Run in the user session', 'A LaunchAgent keeps mounts and login-Keychain access in the signed-in user\'s context. The optional AppKit menu bar client calls mountctl rather than duplicating the daemon\'s logic. SMB credentials come from the Keychain. The documented implementation still exposes the password to local process inspection during a bounded mount attempt, which is a known limitation rather than a hidden security claim.'),
      references([
        source('C-Nucifora/mountd', 'b39ea7ed42b418faa870f74f8edf282f60797fde', 'README.md', 'Reconciliation policy, recovery and credential limits'),
      ]),
    ],
  },
  'gphotos-album-downloader': {
    description: 'A resumable Python tool for large shared Google Photos albums. It tracks individual media items through enumeration, downloading and retry, with a web-API backend and a browser fallback for when the undocumented service behavior changes.',
    facts: [
      { label: 'Interface', value: 'gphotos-dl command line' },
      { label: 'Backends', value: 'gpwc web API and Playwright' },
      { label: 'Progress', value: 'Resumable per-item manifest' },
    ],
    sections: [
      text('photos-workflow', 'Keep a failed item from restarting the album', 'The API path enumerates the album, saves shared items into the signed-in library when required and resolves the saved copies before downloading. A manifest records item identity and progress so another run can resume. The Playwright path retains browser-based enumeration and downloading as a fallback rather than assuming one undocumented interface will remain stable.'),
      text('photos-fidelity', 'A successful download can still be the wrong file', 'The browser workflow includes delay and fidelity checks to flag likely preview copies. Saving a shared photo to the user library can be necessary before Google exposes the stored original. Neither backend can recover detail that the uploader never stored, and sharing can strip location data. The project therefore records suspect results instead of treating a completed HTTP transfer as proof of archival fidelity.'),
      text('photos-account', 'Library changes need explicit boundaries', 'Saving shared items consumes the signed-in account\'s storage. The current API backend skips cleanup where ownership cannot be established and never empties Trash. The browser backend has a separate opt-in cleanup mode whose empty-Trash operation is global and irreversible. That mode belongs in the documented account-risk discussion, not an unattended copy-and-paste example.'),
      references([
        source('C-Nucifora/gphotos-album-downloader', '4a4e7471a05e34059205a691b3b6fc4f8db753e4', 'README.md', 'Backends, fidelity checks and account-side changes'),
      ]),
    ],
  },
  'small-utilities': {
    description: 'Three smaller repositories kept together rather than presented as three large case studies. They cover version-controlled iOS Shortcuts, a resumable Instagram automation script and a set of Python programming exercises.',
    facts: [
      { label: 'Contents', value: 'Shortcuts, an automation script and exercises' },
      { label: 'Languages', value: 'Python and Shortcuts property lists' },
    ],
    sections: [
      text('utilities-shortcuts', 'Keep shortcut source reviewable', 'The iOS Shortcuts repository keeps unsigned XML property lists as its editable source and separates installable builds. One shortcut accepts a structured meal-nutrition payload, presents editable values and a date, then writes the confirmed entries to Apple Health. Missing nutrients are skipped; an estimate is not presented as a measured nutrition result.'),
      text('utilities-unliker', 'A small script with persistent progress', 'Instagram Unliker uses instagrapi to inspect or remove likes. It has a dry-run mode and a per-run limit, caches its session locally and records processed media so a later run can continue. It relies on an unofficial service API. The source documents rate limits and the possibility of account restrictions, so this is an automation experiment rather than a supported Instagram integration.'),
      text('utilities-exercises', 'Practice belongs in its own category', 'The LeetCode repository contains individual problem solutions, primarily in Python, named by problem identifier and slug. These are programming exercises rather than a deployed application. Keeping their source linked here makes that distinction clear without enlarging them into a product claim.'),
      references([
        source('C-Nucifora/iOS-Shortcuts', 'f3237a5f54b19b2d165568579bd720b8bdb2739f', 'README.md', 'Shortcut source and review-before-write workflow'),
        source('C-Nucifora/instagram-unliker', '7e87b20ec158bae40999373fb3310298946625fb', 'README.md', 'Script modes, progress and service limits'),
        source('C-Nucifora/leetcode', '8a1150a7561366e40f625856ebfc170e67d6a6b5', 'README.md', 'Programming exercise repository'),
      ]),
    ],
  },
  'personal-projects': {
    description: 'A shared enclosure for seven smaller project records. Reconcile and the portfolio sit alongside CI administration, static publishing, network mounts, photo downloading and a compact utilities collection. Each sled opens a separate reading page.',
    facts: [
      { label: 'Layout', value: 'Seven project sleds and one spare bay' },
      { label: 'Contents', value: 'Applications, infrastructure and utilities' },
    ],
    sections: [
      text('personal-apps', 'Small applications with a complete job', 'Reconcile turns shared expenses into balances and a settlement plan without a backend. The portfolio experiments with a physical route into technical records. The photo downloader handles resumable album work, while the utilities collection keeps short scripts and exercises at their actual scale. Their individual pages describe the implementation and its limits.'),
      text('personal-infrastructure', 'Tools for the systems around the projects', 'CI Runner Console compares GitHub registrations with services on a runner VM. Artifact Platform publishes small static tools across devices. mountd manages network shares only when their conditions and service probes allow it. They share an interest in observed state, explicit failure modes and recovering without pretending an uncertain operation succeeded.'),
      text('personal-navigation', 'The enclosure is a grouping, not one codebase', 'Each occupied bay links to its own record and source repository. The spare bay is intentionally empty. Larger projects such as M1 Toolchain, Wavelength and Islet retain their own rack units, so their deeper technical material is not hidden inside this collection.'),
    ],
  },
};
