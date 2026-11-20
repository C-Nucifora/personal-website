// Module reading pages use public documentation pinned in sources/m1-sources.json.
export const m1Content = {
  "m1-tools": {
    "description": "The umbrella repository is the starting point for the M1 development environment. It holds the multi-repository checkout manifest, explains the dependency layers and documents configuration shared by editors and command-line tools.",
    "facts": [
      {
        "label": "Purpose",
        "value": "Toolchain manifest and documentation"
      },
      {
        "label": "Configuration",
        "value": "m1-tools.toml"
      },
      {
        "label": "Checkout",
        "value": "Sibling repositories via vcstool"
      }
    ],
    "sections": [
      {
        "id": "m1-tools-1",
        "type": "text",
        "title": "One checkout, separate releases",
        "body": "The development manifest tracks each repository at main. That is useful when changing several tools together, but it differs from the version-pinned binaries consumed by CI and editor integrations."
      },
      {
        "id": "m1-tools-2",
        "type": "text",
        "title": "Reproducing the published tools",
        "body": "A release-manifest script reads the tool pins from the released m1-ci configuration and resolves other components to release tags. It refuses an unreleased component unless the caller explicitly permits a main-branch fallback."
      },
      {
        "id": "m1-tools-3",
        "type": "text",
        "title": "Where configuration belongs",
        "body": "A project-level m1-tools.toml shares formatting, lint and diagnostic policy. In editors, committed workspace settings override personal preferences. The umbrella also links collaborator-owned components; this cabinet presents a selection of that wider ecosystem."
      },
      {
        "id": "m1-tools-usage",
        "type": "code",
        "title": "Import the workspace",
        "language": "shell",
        "code": "vcs import .. < m1-tools.repos\nscripts/release-manifest.sh > m1-tools-release.repos"
      },
      {
        "id": "m1-tools-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-tools/blob/599969ac0276d01fba8a45f9fa51030ba7f40971/README.md"
          },
          {
            "label": "scripts/release-manifest.sh",
            "url": "https://github.com/C-Nucifora/m1-tools/blob/599969ac0276d01fba8a45f9fa51030ba7f40971/scripts/release-manifest.sh"
          }
        ]
      }
    ]
  },
  "tree-sitter-m1": {
    "description": "A grammar and generated parser for .m1scr files. It gives editors syntax highlighting and gives the Rust tools a concrete syntax tree, including the M1 names that ordinary word-based tokenisation would split incorrectly.",
    "facts": [
      {
        "label": "Input",
        "value": ".m1scr source"
      },
      {
        "label": "Output",
        "value": "Parser and editor queries"
      },
      {
        "label": "Implementation",
        "value": "Grammar with a C external scanner"
      }
    ],
    "sections": [
      {
        "id": "tree-sitter-m1-1",
        "type": "text",
        "title": "Names can contain spaces",
        "body": "A name segment can contain several words, while dots separate segments. The external scanner joins those words but stops before reserved words such as eq, so a comparison operator does not become part of a channel name."
      },
      {
        "id": "tree-sitter-m1-2",
        "type": "text",
        "title": "A shared language boundary",
        "body": "The repository commits the generated parser alongside the grammar. m1-core builds its typed node definitions from the grammar, and editor queries define highlighting, indentation and folding."
      },
      {
        "id": "tree-sitter-m1-3",
        "type": "text",
        "title": "Keeping the scanner honest",
        "body": "Corpus fixtures and fuzzing exercise parsing and incremental edits. The documentation separates observed M1 behaviour from conservative inferences, including the decimal-mantissa rule for scientific literals. These are parser checks, not evidence that a script behaves correctly on an ECU."
      },
      {
        "id": "tree-sitter-m1-usage",
        "type": "code",
        "title": "Regenerate and check the parser",
        "language": "shell",
        "code": "npx tree-sitter generate\nnpx tree-sitter test"
      },
      {
        "id": "tree-sitter-m1-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/tree-sitter-m1/blob/0a9e32a444c7b659d42657b6dcfc9ebdaf8f5648/README.md"
          },
          {
            "label": "src/scanner.c",
            "url": "https://github.com/C-Nucifora/tree-sitter-m1/blob/0a9e32a444c7b659d42657b6dcfc9ebdaf8f5648/src/scanner.c"
          }
        ]
      }
    ]
  },
  "m1-core": {
    "description": "The Rust library that gives the rest of the toolchain one way to read M1 syntax. It wraps the parser with typed nodes, source positions and diagnostics, so each downstream tool does not need its own tree-sitter integration.",
    "facts": [
      {
        "label": "Interface",
        "value": "Rust library"
      },
      {
        "label": "Input",
        "value": ".m1scr source text"
      },
      {
        "label": "Output",
        "value": "Typed syntax tree and diagnostics"
      }
    ],
    "sections": [
      {
        "id": "m1-core-1",
        "type": "text",
        "title": "Parse once, share the structure",
        "body": "Consumers work with Cst, Node, Kind and Field rather than importing tree-sitter directly. Incremental reparsing supports editor updates, while common source-position and operator helpers keep diagnostics consistent."
      },
      {
        "id": "m1-core-2",
        "type": "text",
        "title": "Annotations stay inside valid scripts",
        "body": "The library reads @m1: directives from ordinary comments. Those annotations can suppress a diagnostic, mark a safety-critical value or control formatting. Each tool registers the annotation kinds it understands."
      },
      {
        "id": "m1-core-3",
        "type": "text",
        "title": "Syntax has a clear limit",
        "body": "m1-core describes the source structure. It deliberately has no expression-type query because resolving types requires a project symbol model. That work belongs to m1-typecheck, above this library in the dependency graph."
      },
      {
        "id": "m1-core-usage",
        "type": "code",
        "title": "Parse a script in Rust",
        "language": "Rust",
        "code": "let source = \"local <Integer> Count = 0;\";\nlet tree = m1_core::parse(source);\nlet diagnostics = tree.syntax_diagnostics();"
      },
      {
        "id": "m1-core-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-core/blob/d294ea79dab8a42f12ed62372b781d4d2a7bb8cd/README.md"
          },
          {
            "label": "src/lib.rs",
            "url": "https://github.com/C-Nucifora/m1-core/blob/d294ea79dab8a42f12ed62372b781d4d2a7bb8cd/src/lib.rs"
          }
        ]
      }
    ]
  },
  "m1-lsp": {
    "description": "The language server connects M1 analysis to an editor. It combines parsing, linting, project-aware type diagnostics and formatting behind the Language Server Protocol, so navigation and feedback use the same tools as command-line checks.",
    "facts": [
      {
        "label": "Transport",
        "value": "LSP over standard input/output"
      },
      {
        "label": "Project data",
        "value": ".m1prj, .m1cfg and .m1dbc"
      },
      {
        "label": "Consumers",
        "value": "LSP-compatible editors"
      }
    ],
    "sections": [
      {
        "id": "m1-lsp-1",
        "type": "text",
        "title": "The editor sees the project",
        "body": "The server discovers project, calibration and CAN database files and reloads their model when they change. Hover, completion and definitions can therefore use declared types and units rather than matching text alone."
      },
      {
        "id": "m1-lsp-2",
        "type": "text",
        "title": "Following a channel through scripts",
        "body": "Group-relative and fully qualified channel references resolve to the same project entity. References, read/write highlights and call hierarchy help follow data across scripts. Formatting and code actions reuse m1-fmt and m1-lint."
      },
      {
        "id": "m1-lsp-3",
        "type": "text",
        "title": "One process per editor connection",
        "body": "Editors normally launch the binary with no arguments and exchange LSP messages over stdio. The scaffold command prints a starter shared configuration. The documented release binaries cover Linux x64, Windows x64 and Apple Silicon; Intel Mac users build from source."
      },
      {
        "id": "m1-lsp-usage",
        "type": "code",
        "title": "Generate shared configuration",
        "language": "shell",
        "code": "m1-lsp --scaffold-config > m1-tools.toml"
      },
      {
        "id": "m1-lsp-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-lsp/blob/3ed54bb96cbd54120d53dab087c91f65b13d3e37/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-lsp/blob/3ed54bb96cbd54120d53dab087c91f65b13d3e37/src/main.rs"
          }
        ]
      }
    ]
  },
  "m1-fmt": {
    "description": "A formatter for M1 scripts, available as a command-line program and a Rust library. It changes whitespace and layout, then checks the result against the parsed input before accepting the formatted source.",
    "facts": [
      {
        "label": "Input",
        "value": ".m1scr files or standard input"
      },
      {
        "label": "Output",
        "value": "Formatted source or a diff"
      },
      {
        "label": "Editor path",
        "value": "Library used by m1-lsp"
      }
    ],
    "sections": [
      {
        "id": "m1-fmt-1",
        "type": "text",
        "title": "Formatting needs a safety check",
        "body": "The formatter checks that output reparses, preserves meaningful tokens and remains unchanged on a second formatting pass. Source with syntax errors stays untouched, and check mode reports a failure instead of treating that file as clean."
      },
      {
        "id": "m1-fmt-2",
        "type": "text",
        "title": "Useful before and inside a commit",
        "body": "Print a formatted file, inspect a diff, edit a directory in place or run a read-only CI check. Stdin support lets editors format an unsaved buffer; a supplied filename also selects that project's configuration."
      },
      {
        "id": "m1-fmt-3",
        "type": "text",
        "title": "Style is a project decision",
        "body": "Defaults use tabs and Allman braces. Workspace settings, tool-specific configuration and CLI overrides can choose another layout. Comment directives let deliberately aligned regions remain unchanged; alignment and comment reflow are opt-in."
      },
      {
        "id": "m1-fmt-usage",
        "type": "code",
        "title": "Preview and check formatting",
        "language": "shell",
        "code": "m1-fmt --diff Scripts/Example.m1scr\nm1-fmt --check Scripts/"
      },
      {
        "id": "m1-fmt-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-fmt/blob/0c46a6e16ee9dd46e648186507a7f39b2ef3b997/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-fmt/blob/0c46a6e16ee9dd46e648186507a7f39b2ef3b997/src/main.rs"
          }
        ]
      }
    ]
  },
  "m1-lint": {
    "description": "A syntax-based linter for M1 scripts. It reports naming, layout and local correctness issues, with rule codes that can be explained in the terminal, suppressed in source or configured for a project.",
    "facts": [
      {
        "label": "Analysis",
        "value": "Syntax-tree rules"
      },
      {
        "label": "Output",
        "value": "Human, JSON or SARIF diagnostics"
      },
      {
        "label": "Integration",
        "value": "CLI and language-server library"
      }
    ],
    "sections": [
      {
        "id": "m1-lint-1",
        "type": "text",
        "title": "Checks without a project model",
        "body": "Rules inspect the script itself, including unused locals, deep nesting, operator conventions and complexity. They do not resolve a channel against Project.m1prj; project-aware checks belong to m1-typecheck."
      },
      {
        "id": "m1-lint-2",
        "type": "text",
        "title": "Fixes can be reviewed first",
        "body": "Autofix supports a diff-only preview. Before writing a fix, the tool reparses the result and checks meaningful tokens. Rules that need a semantic change, such as renaming a local, do not receive an automatic fix."
      },
      {
        "id": "m1-lint-3",
        "type": "text",
        "title": "Adopting checks gradually",
        "body": "A baseline records existing findings so a legacy project can gate new regressions first. Rule selection, severity overrides and source annotations let teams choose policy without maintaining a separate linter. The running binary provides its own rule catalogue and explanations."
      },
      {
        "id": "m1-lint-usage",
        "type": "code",
        "title": "Preview fixes and explain a rule",
        "language": "shell",
        "code": "m1-lint --fix --diff Scripts/Example.m1scr\nm1-lint --explain L022"
      },
      {
        "id": "m1-lint-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-lint/blob/6b7815c012f8832b9349d75a54bb5bb3e1ae7206/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-lint/blob/6b7815c012f8832b9349d75a54bb5bb3e1ae7206/src/main.rs"
          }
        ]
      }
    ]
  },
  "m1-typecheck": {
    "description": "The semantic-analysis layer loads an M1 project and resolves what the names in its scripts refer to. It checks relationships that syntax alone cannot establish, including declared types, enum cases, units and cross-script invalid-value paths.",
    "facts": [
      {
        "label": "Model",
        "value": ".m1prj plus calibration and CAN data"
      },
      {
        "label": "Consumers",
        "value": "CLI and m1-lsp"
      },
      {
        "label": "Reports",
        "value": "Human, JSON and SARIF"
      }
    ],
    "sections": [
      {
        "id": "m1-typecheck-1",
        "type": "text",
        "title": "Checking a complete project",
        "body": "The CLI discovers nearby project, parameter and CAN database files. Supplying the full script set allows analyses to follow values across files, rather than judging each script in isolation."
      },
      {
        "id": "m1-typecheck-2",
        "type": "text",
        "title": "Unknown data stays unknown",
        "body": "Diagnostics depend on types or enum information the model can establish. Missing firmware or parameter information does not justify guessing. The tool can also explain a channel's NaN or unit provenance to show how an inferred value reached it."
      },
      {
        "id": "m1-typecheck-3",
        "type": "text",
        "title": "A gate with explicit policy",
        "body": "Error findings fail the default CLI run; strict mode also fails on warnings. Shared configuration and per-symbol ignores control project policy. The same project model supports editor hover and completion, and a companion exporter can describe expected calibration parameters."
      },
      {
        "id": "m1-typecheck-usage",
        "type": "code",
        "title": "Run semantic checks",
        "language": "shell",
        "code": "m1-typecheck Scripts/*.m1scr\nm1-typecheck --format sarif Scripts/*.m1scr"
      },
      {
        "id": "m1-typecheck-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-typecheck/blob/2729e222dfa890f421ffd6beb4f192c1cfa5efd9/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-typecheck/blob/2729e222dfa890f421ffd6beb4f192c1cfa5efd9/src/main.rs"
          }
        ]
      }
    ]
  },
  "nvim-m1": {
    "description": "The Neovim integration assembles the M1 editor environment in one plugin. It configures the parser and language server, provides formatting and lint commands, and connects project-editing commands to the separate m1-project tool.",
    "facts": [
      {
        "label": "Editor",
        "value": "Neovim 0.10 or newer"
      },
      {
        "label": "Setup",
        "value": "Pinned tool downloads and local parser build"
      },
      {
        "label": "Health check",
        "value": ":checkhealth nvim-m1"
      }
    ],
    "sections": [
      {
        "id": "nvim-m1-1",
        "type": "text",
        "title": "Setup includes the tools",
        "body": "The install hook downloads platform-specific pinned binaries. The parser compiles locally, so setup needs a C compiler and curl. Explicit paths and binaries already on PATH take precedence over the bundled tools."
      },
      {
        "id": "nvim-m1-2",
        "type": "text",
        "title": "Stay in the current buffer",
        "body": "Formatting, linting, call-rate lenses and configuration generation are available as editor commands. Optional conform.nvim and nvim-lint integrations have fallbacks. Neovim 0.11 uses native LSP support; 0.10 needs nvim-lspconfig."
      },
      {
        "id": "nvim-m1-3",
        "type": "text",
        "title": "Project edits have a separate owner",
        "body": "Component creation and attribute edits invoke m1-project, maintained in Ned Lane's repository. The language server reloads after those edits. This keeps structured project writes separate from the server's analysis and navigation work."
      },
      {
        "id": "nvim-m1-usage",
        "type": "code",
        "title": "Check the Neovim setup",
        "language": "Neovim commands",
        "code": ":M1GenerateConfig\n:M1Format\n:checkhealth nvim-m1"
      },
      {
        "id": "nvim-m1-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/nvim-m1/blob/72aad30609c1335f57744dd8e716f1d3442ae40f/README.md"
          },
          {
            "label": "lua/nvim-m1/init.lua",
            "url": "https://github.com/C-Nucifora/nvim-m1/blob/72aad30609c1335f57744dd8e716f1d3442ae40f/lua/nvim-m1/init.lua"
          }
        ]
      }
    ]
  },
  "telescope-m1.nvim": {
    "description": "A Telescope extension for exploring an M1 project without knowing an exact symbol name or XML location. It provides searchable symbols, a component tree, execution rates and the lint and type-check rule catalogues.",
    "facts": [
      {
        "label": "Editor",
        "value": "Neovim with Telescope"
      },
      {
        "label": "Symbols",
        "value": "m1-lsp workspace/symbol"
      },
      {
        "label": "Rule previews",
        "value": "m1-lint explanations"
      }
    ],
    "sections": [
      {
        "id": "telescope-m1-nvim-1",
        "type": "text",
        "title": "Search the loaded model",
        "body": "Symbol and component pickers query the running language server. Type, security level and tag filters reach the server too. The extension does not keep a second project parser that could disagree with the model."
      },
      {
        "id": "telescope-m1-nvim-2",
        "type": "text",
        "title": "Inspect, then jump",
        "body": "A selected symbol opens its definition. The component browser can jump to a function's backing script, while call-rate pickers show the scripts scheduled at a rate. Project-editing actions delegate to nvim-m1 and m1-project."
      },
      {
        "id": "telescope-m1-nvim-3",
        "type": "text",
        "title": "Explain a diagnostic in context",
        "body": "The lint picker asks the installed linter for a rule's rationale, with a short static summary when the binary is unavailable. Rule codes can be copied or added to the project ignore list. The extension requires Neovim 0.10 or newer and an active M1 LSP for symbol navigation."
      },
      {
        "id": "telescope-m1-nvim-usage",
        "type": "code",
        "title": "Open project pickers",
        "language": "Neovim commands",
        "code": ":Telescope m1 workspace_symbols type=enum\n:Telescope m1 call_rates\n:Telescope m1 lint_rules"
      },
      {
        "id": "telescope-m1-nvim-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/telescope-m1.nvim/blob/ab580d2324f87851dd231ca3d58f0976f92c0180/README.md"
          },
          {
            "label": "lua/telescope/_extensions/m1.lua",
            "url": "https://github.com/C-Nucifora/telescope-m1.nvim/blob/ab580d2324f87851dd231ca3d58f0976f92c0180/lua/telescope/_extensions/m1.lua"
          }
        ]
      }
    ]
  },
  "m1-ci": {
    "description": "Reusable GitHub Actions workflows put the M1 command-line checks on a project's pull requests. Each released workflow pins the tool versions so a new formatter or diagnostic release cannot silently change an existing project's gate.",
    "facts": [
      {
        "label": "Host",
        "value": "GitHub Actions"
      },
      {
        "label": "Checks",
        "value": "Separate formatter, lint and type-check jobs"
      },
      {
        "label": "Local use",
        "value": "Matching pre-commit hooks"
      }
    ],
    "sections": [
      {
        "id": "m1-ci-1",
        "type": "text",
        "title": "Independent results on a pull request",
        "body": "Formatting, linting and type checking run as separate jobs. Project structure validation and an opt-in CAN export drift check extend the gate. Findings can appear on the relevant source lines."
      },
      {
        "id": "m1-ci-2",
        "type": "text",
        "title": "Incremental adoption without hiding alerts",
        "body": "A lint baseline lets existing findings remain while new regressions fail. Changed-file mode narrows formatter and lint gates, but SARIF still covers the full project so untouched alerts are not incorrectly reported as resolved."
      },
      {
        "id": "m1-ci-3",
        "type": "text",
        "title": "The same pins locally",
        "body": "Pre-commit hooks read the workflow's tools.env pins. Downloaded tools require provenance verification by default; missing prebuilt binaries can build from the pinned source. Updating the workflow release is a deliberate change to the project's checking environment."
      },
      {
        "id": "m1-ci-usage",
        "type": "code",
        "title": "Configure local checks",
        "language": "YAML",
        "code": "repos:\n  - repo: https://github.com/C-Nucifora/m1-ci\n    rev: vX.Y.Z # choose a published release\n    hooks:\n      - id: m1-fmt\n      - id: m1-lint\n      - id: m1-typecheck"
      },
      {
        "id": "m1-ci-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-ci/blob/dafff6099a13787ce545a09207ce2e40d16aa8a5/README.md"
          },
          {
            "label": ".github/workflows/check.yml",
            "url": "https://github.com/C-Nucifora/m1-ci/blob/dafff6099a13787ce545a09207ce2e40d16aa8a5/.github/workflows/check.yml"
          }
        ]
      }
    ]
  },
  "m1-doc": {
    "description": "A documentation generator that turns an M1 project into a navigable reference. It reads the project model and script relationships, then emits Markdown, an offline HTML site or structured JSON for other tools.",
    "facts": [
      {
        "label": "Input",
        "value": "Project.m1prj and script relationships"
      },
      {
        "label": "Output",
        "value": "Markdown, HTML or JSON"
      },
      {
        "label": "HTML delivery",
        "value": "Self-contained, no CDN"
      }
    ],
    "sections": [
      {
        "id": "m1-doc-1",
        "type": "text",
        "title": "A reference organised by group",
        "body": "Generated pages describe channels, parameters, constants and functions with their available types, units and annotations. HTML adds search, navigation and security filters. Markdown is the canonical text used to produce the HTML reference."
      },
      {
        "id": "m1-doc-2",
        "type": "text",
        "title": "Relationships you can follow",
        "body": "Resolved calls, reads, writes and aliases become typed graph edges. Group pages show interactive relationships, and a requested subsystem page can include neighbouring groups. Unresolved targets remain unlinked or absent instead of receiving invented destinations."
      },
      {
        "id": "m1-doc-3",
        "type": "text",
        "title": "Different outputs for different readers",
        "body": "Security and tag filters can produce a symbol-focused subset. JSON exposes the same document model with a schema version and deterministic output, useful for comparing references or checking project metadata in another pipeline."
      },
      {
        "id": "m1-doc-usage",
        "type": "code",
        "title": "Generate a project reference",
        "language": "shell",
        "code": "m1-doc --project Project.m1prj --out reference --format both"
      },
      {
        "id": "m1-doc-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-doc/blob/8df33d8f18ea5a2d3f81cefbbb4fc7b7913a448b/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-doc/blob/8df33d8f18ea5a2d3f81cefbbb4fc7b7913a448b/src/main.rs"
          }
        ]
      }
    ]
  },
  "m1-visualiser": {
    "description": "A read-only graph of an M1 project's structure. It turns the loaded symbol model and parsed scripts into an interactive offline HTML file, with DOT and JSON alternatives for other graph tools.",
    "facts": [
      {
        "label": "Output",
        "value": "Self-contained HTML, DOT or JSON"
      },
      {
        "label": "Project access",
        "value": "Read-only"
      },
      {
        "label": "Numeric overlays",
        "value": "Experimental"
      }
    ],
    "sections": [
      {
        "id": "m1-visualiser-1",
        "type": "text",
        "title": "See the project's connections",
        "body": "The graph distinguishes data flow, table axes, group containment and execution schedules. Collapsible groups make it possible to inspect a subsystem without reading all of the project XML."
      },
      {
        "id": "m1-visualiser-2",
        "type": "text",
        "title": "Structure and values have different evidence",
        "body": "Structural links come from resolved project data. Optional scenario and recorded-log overlays call m1-eval, then colour the graph with computed values or counterfactual differences. Those numbers inherit the evaluator's assumptions and input requirements."
      },
      {
        "id": "m1-visualiser-3",
        "type": "text",
        "title": "Keep the boundary visible",
        "body": "Unresolved structure is omitted rather than guessed. Numeric overlays are experimental and unsuitable for calibration, safety or behavioural validation. The offline model does not reproduce ECU execution budgets, watchdogs or preemption."
      },
      {
        "id": "m1-visualiser-usage",
        "type": "code",
        "title": "Export the project graph",
        "language": "shell",
        "code": "m1-visualiser --project Project.m1prj --out graph.html\nm1-visualiser --format json"
      },
      {
        "id": "m1-visualiser-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-visualiser/blob/e025f550a43a1d1a70abf659b2851bb5fc97672f/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-visualiser/blob/e025f550a43a1d1a70abf659b2851bb5fc97672f/src/main.rs"
          }
        ]
      }
    ]
  },
  "m1-eval": {
    "description": "An experimental offline interpreter for M1 scripts. A scenario supplies inputs over time and the evaluator produces a repeatable trace, allowing source-level experiments without connecting the tool to a live ECU.",
    "facts": [
      {
        "label": "Status",
        "value": "Experimental"
      },
      {
        "label": "Inputs",
        "value": "Project, calibration, scenarios or recorded logs"
      },
      {
        "label": "Outputs",
        "value": "JSON or CSV traces and coverage"
      }
    ],
    "sections": [
      {
        "id": "m1-eval-1",
        "type": "text",
        "title": "Choose the experiment",
        "body": "A run can evaluate one function, a target channel or the project's multi-rate schedule. Counterfactual replay holds a recorded log as the baseline and recomputes the downstream effects of an override."
      },
      {
        "id": "m1-eval-2",
        "type": "text",
        "title": "Results carry assumptions",
        "body": "The maturity contract distinguishes verified, assumed, stubbed and unsupported behaviour. No advertised evaluator area currently meets the verified category. Synthetic tests establish the evaluator's own contracts; they do not prove equivalence with M1 firmware. Coverage reports expose the methods and scheduling assumptions a project would exercise."
      },
      {
        "id": "m1-eval-3",
        "type": "text",
        "title": "Keep it offline",
        "body": "The model excludes real-time and hardware-in-the-loop execution, ECU timing budgets, preemption and watchdog behaviour. Unsupported executable behaviour fails when reached. Missing inputs and calibration require explicit handling, so a successful trace still needs its assumptions reviewed before anyone relies on its numbers."
      },
      {
        "id": "m1-eval-usage",
        "type": "code",
        "title": "Inspect evaluator coverage and run a scenario",
        "language": "shell",
        "code": "m1-eval --project Project.m1prj --coverage\nm1-eval --project Project.m1prj --scenario scenario.toml --out trace.json"
      },
      {
        "id": "m1-eval-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-eval/blob/0b5cd55aaf159ee34d078faf7777a4c98e515701/README.md"
          },
          {
            "label": "src/lib.rs",
            "url": "https://github.com/C-Nucifora/m1-eval/blob/0b5cd55aaf159ee34d078faf7777a4c98e515701/src/lib.rs"
          }
        ]
      }
    ]
  },
  "m1-can": {
    "description": "CAN inspection combines a project's database definitions with the scripts that bind them to buses. This component is maintained in Ned Lane's repository and also exports M1 databases to the standard Vector DBC format.",
    "facts": [
      {
        "label": "Canonical repository",
        "value": "nedlane/m1-can"
      },
      {
        "label": "Inspection output",
        "value": "Structured JSON"
      },
      {
        "label": "Export",
        "value": ".m1dbc to .dbc"
      }
    ],
    "sections": [
      {
        "id": "m1-can-1",
        "type": "text",
        "title": "A repeated ID needs bus context",
        "body": "A database declares messages without identifying its bus. Inspection reads DBC Init calls and available calibration values to distinguish same-bus collisions from legitimate reuse on different buses. Unresolved bindings remain unknown."
      },
      {
        "id": "m1-can-2",
        "type": "text",
        "title": "One source, shareable exports",
        "body": "The .m1dbc database remains authoritative. A shared workspace configuration explicitly maps source stems to output stems, so generated .dbc files can be committed for tools outside M1 Build."
      },
      {
        "id": "m1-can-3",
        "type": "text",
        "title": "Check generated files without rewriting them",
        "body": "Export check mode generates into temporary storage and compares decoded text with the committed files. Normalised line endings are not treated as drift. Export verification compares message and signal counts and reparses output with an independent DBC parser."
      },
      {
        "id": "m1-can-usage",
        "type": "code",
        "title": "Inspect CAN bindings and verify exports",
        "language": "shell",
        "code": "m1-can inspect --project Project.m1prj\nm1-can export --check"
      },
      {
        "id": "m1-can-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/nedlane/m1-can/blob/b69d74ff7130367a5b3456209b8864a95b5cf23c/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/nedlane/m1-can/blob/b69d74ff7130367a5b3456209b8864a95b5cf23c/src/main.rs"
          }
        ]
      }
    ]
  },
  "m1-dbc": {
    "description": "The standalone DBC exporter converts MoTeC .m1dbc databases into Vector .dbc files. Its scope is deliberately narrow: regenerate shared CAN descriptions and let CI detect when committed exports no longer match their source.",
    "facts": [
      {
        "label": "Input",
        "value": "MoTeC .m1dbc databases"
      },
      {
        "label": "Output",
        "value": "Vector .dbc files"
      },
      {
        "label": "Configuration",
        "value": "m1-tools.toml [dbc]"
      }
    ],
    "sections": [
      {
        "id": "m1-dbc-1",
        "type": "text",
        "title": "Make the export mapping explicit",
        "body": "The workspace configuration names the source and output directories and pairs each source stem with an output stem. The command discovers that configuration by walking up from its current directory, so a hook needs no file-path arguments."
      },
      {
        "id": "m1-dbc-2",
        "type": "text",
        "title": "Generated output deserves a gate",
        "body": "Check mode writes only to temporary storage, then compares the generated text with existing exports. Line endings, a leading BOM and supported legacy encoding do not create a false change. A missing export is reported as out of sync."
      },
      {
        "id": "m1-dbc-3",
        "type": "text",
        "title": "How it relates to m1-can",
        "body": "The cabinet keeps this exporter as its own record. The current m1-can component also provides export plus project-aware topology inspection. m1-dbc focuses on conversion and verification; a repository without export configuration is a clean no-op."
      },
      {
        "id": "m1-dbc-usage",
        "type": "code",
        "title": "Regenerate and verify DBC files",
        "language": "shell",
        "code": "m1-dbc export\nm1-dbc export --check"
      },
      {
        "id": "m1-dbc-sources",
        "type": "links",
        "title": "Documentation and implementation",
        "links": [
          {
            "label": "Project README at the reviewed revision",
            "url": "https://github.com/C-Nucifora/m1-dbc/blob/9d9df71cfaed9becca956c95506d6e5156a5bc9e/README.md"
          },
          {
            "label": "src/main.rs",
            "url": "https://github.com/C-Nucifora/m1-dbc/blob/9d9df71cfaed9becca956c95506d6e5156a5bc9e/src/main.rs"
          }
        ]
      }
    ]
  }
};
