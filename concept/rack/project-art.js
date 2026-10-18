const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
const repeat = (count, draw) => Array.from({ length: count }, (_, index) => draw(index)).join('');
const rect = (x, y, width, height, className = 'art-surface', extra = '') => `<rect x="${x}" y="${y}" width="${width}" height="${height}" class="${className}" ${extra}/>`;
const line = (path, className = 'art-line') => `<path d="${path}" class="${className}"/>`;
const text = (x, y, label, className = 'art-label', extra = '') => `<text x="${x}" y="${y}" class="${className}" ${extra}>${escape(label)}</text>`;
const circle = (x, y, radius, className = 'art-line') => `<circle cx="${x}" cy="${y}" r="${radius}" class="${className}"/>`;
const screws = (x, y, width, height) => [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([cx, cy]) => `${circle(cx, cy, 5)}${line(`M${cx - 2} ${cy}h4`)}`).join('');

function runner() {
  return `${line('M330 200H480M720 200H850', 'art-trace')}
    ${rect(55, 139, 275, 122)}${text(82, 176, 'GitHub Actions')}${line('M83 207h55m-55 21h88')}
    ${rect(480, 139, 240, 122, 'art-accent-surface')}${text(508, 176, 'Runner console')}${text(508, 224, 'API + SSH', 'art-small')}
    ${rect(850, 77, 295, 246)}${text(877, 114, 'Runner VM')}
    ${repeat(3, i => `${rect(877, 141 + i * 50, 240, 35, 'art-dark')}${repeat(7, j => rect(892 + j * 24, 153 + i * 50, 12, 10, 'art-slot'))}${circle(1099, 158 + i * 50, 3, 'art-copper')}`)}
    ${text(55, 350, 'Registrations', 'art-small')}${text(480, 350, 'Lifecycle control', 'art-small')}${text(850, 350, 'Local services', 'art-small')}`;
}

function publishing() {
  return `${line('M254 107H460V200H590M254 293H460V200M790 200H950V110M950 200V293', 'art-trace')}
    ${rect(70, 55, 184, 104)}${rect(70, 241, 184, 104)}${text(93, 91, 'Device')}${text(93, 277, 'Device')}
    ${repeat(3, i => `${rect(94 + i * 34, 112, 22, 27, 'art-sheet')}${rect(94 + i * 34, 298, 22, 27, 'art-sheet')}`)}
    ${rect(590, 127, 200, 146, 'art-accent-surface')}${text(617, 169, 'Catalog')}${line('M618 199h144m-144 23h112m-112 23h132')}
    ${rect(950, 60, 180, 103)}${rect(950, 241, 180, 103)}${text(973, 99, 'Tools')}${text(973, 280, 'Documents')}
    ${text(70, 383, 'Static artifacts, connected across a tailnet', 'art-small')}`;
}

function embedded() {
  return `${rect(205, 38, 790, 324, 'art-board')}${screws(225, 58, 750, 284)}
    ${line('M205 109H74V176H25M205 290H117V343H25M995 111h110V54h70M995 287h110v58h70', 'art-trace')}
    ${repeat(10, i => `${line(`M${436 + i * 34} 121V88H${417 + i * 34}V53`, 'art-trace')}${line(`M${436 + i * 34} 279v34h${i * 3}v32`, 'art-trace')}`)}
    ${rect(414, 119, 372, 162, 'art-chip')}${text(449, 181, 'STM32', 'art-title')}${text(449, 225, 'Build / flash / monitor', 'art-small')}
    ${repeat(9, i => `${rect(399, 134 + i * 16, 15, 7, 'art-pin')}${rect(786, 134 + i * 16, 15, 7, 'art-pin')}`)}
    ${rect(250, 117, 100, 166, 'art-dark')}${repeat(6, i => circle(276 + (i % 2) * 43, 143 + Math.floor(i / 2) * 52, 7, 'art-pad'))}
    ${rect(851, 98, 91, 52, 'art-dark')}${rect(851, 179, 91, 120, 'art-dark')}${repeat(5, i => rect(864, 190 + i * 20, 65, 6, 'art-pin'))}
    ${text(35, 206, 'ST-LINK', 'art-small')}${text(1032, 246, 'UART', 'art-small')}`;
}

function wheel() {
  return `${circle(375, 202, 158)}${circle(375, 202, 137)}${circle(375, 202, 62, 'art-accent-surface')}
    ${line('M263 105l76 54m148-54-76 54M375 264v73', 'art-heavy')}${line('M270 91a151 151 0 0 1 210 0', 'art-accent-line')}
    ${repeat(4, i => `${circle(338 + (i % 2) * 74, 183 + Math.floor(i / 2) * 36, 8, 'art-button')}`)}
    ${line('M534 202h130v-95h92M664 202h92M664 202v95h92', 'art-trace')}
    ${text(790, 114, 'Wheel settings')}${text(790, 209, 'Live input')}${text(790, 304, 'Force feedback')}
    ${rect(756, 91, 9, 31, 'art-copper')}${circle(761, 200, 7, 'art-copper')}${line('M753 297h17m-8-8v17', 'art-accent-line')}
    ${text(218, 393, 'Profiles and control, illustrated', 'art-small')}`;
}

function toolchain(unit, selected) {
  const carriers = unit.modules.map((item, index) => {
    const x = 53 + index * 74;
    const active = item.id === selected?.id;
    return `<g data-module="${escape(item.id)}" class="${active ? 'art-selected' : ''}">
      ${rect(x, active ? 43 : 64, 62, 258, active ? 'art-accent-surface' : 'art-carrier')}
      ${circle(x + 31, active ? 59 : 80, 4)}${rect(x + 22, active ? 275 : 296, 18, 15, 'art-dark')}
      ${text(x + 37, active ? 88 : 109, item.title, 'art-module-label', `transform="rotate(90 ${x + 37} ${active ? 88 : 109})"`)}
      ${line(`M${x + 31} 323v29`, active ? 'art-accent-line' : 'art-line')}</g>`;
  }).join('');
  return `${line('M52 352H1152', 'art-trace')}${carriers}${text(53, 390, selected ? selected.title : 'MoTeC M1 Script / fifteen tools', 'art-small')}`;
}

function audio() {
  return `${rect(40, 65, 1120, 270, 'art-audio')}${screws(58, 83, 1084, 234)}${text(80, 111, 'WAVELENGTH', 'art-small')}
    ${rect(80, 141, 488, 132, 'art-dark')}
    ${line('M101 207h17l12-22 15 46 16-65 18 85 17-44h21l12-10 13 24 13-34 17 36 13-22h20l14-32 18 63 14-74 19 98 16-68 15 23h24l13-15 16 32 14-45 17 48 14-29h26', 'art-wave')}
    ${repeat(2, i => `${rect(616 + i * 255, 108, 216, 112, 'art-meter')}${line(`M${640 + i * 255} 185q84-85 168 0`)}${line(`M${724 + i * 255} 196l${i ? -41 : 28}-55`, 'art-meter-needle')}${circle(724 + i * 255, 196, 4, 'art-dark')}`)}
    ${repeat(4, i => `${circle(647 + i * 128, 272, 22, 'art-knob')}${line(`M${647 + i * 128} 250v10`, 'art-accent-line')}`)}
    ${text(80, 315, 'Music discovery / Apple Music', 'art-small')}`;
}

function notch() {
  return `${rect(140, 41, 920, 320, 'art-display')}${line('M140 80h920')}
    <path d="M463 41h274v51q0 24-24 24H487q-24 0-24-24Z" class="art-notch"/>
    ${rect(399, 116, 402, 164, 'art-tray', 'rx="28"')}${circle(452, 171, 19)}
    ${line('M451 159v13l8 4')}${line('M497 160h112m-112 22h75M431 230h70m29 0h69m30 0h139')}
    ${rect(665, 145, 94, 48, 'art-dark', 'rx="8"')}${line('M682 170h9l5-11 7 24 8-24 8 23 7-12h14', 'art-accent-line')}
    ${text(173, 326, 'The top edge of the display', 'art-small')}`;
}

function rack() {
  return `<g transform="translate(165 24)">${line('M0 35 120 0h565l87 48v280H0Z', 'art-structure')}
    ${rect(0, 35, 685, 293, 'art-dark')}${line('M685 35v293l87 0M685 35l87 13M685 328l87 0')}
    ${repeat(8, i => `${rect(24, 51 + i * 33, 637, 25, 'art-carrier')}${circle(38, 64 + i * 33, 3)}${repeat(10, j => rect(411 + j * 20, 59 + i * 33, 10, 8, 'art-slot'))}`)}
    ${rect(105, 156, 637, 46, 'art-accent-surface')}${line('M105 156 24 183m718-27-81 27M105 202 24 208')}${text(133, 184, 'Project / source / interface', 'art-small')}
    ${line('M0 35 120 0M0 328l120-35M685 35l-565-35', 'art-line')}</g>`;
}

function ledger() {
  return `${rect(95, 35, 570, 330, 'art-ledger')}${text(125, 80, 'Shared expenses', 'art-title')}
    ${line('M125 104h510M125 156h510M125 208h510M125 260h510M125 312h510M435 104v208M535 104v208')}
    ${repeat(3, i => `${line(`M128 ${135 + i * 52}h${135 + i * 37}`, 'art-ink')}${rect(553, 124 + i * 52, 58, 8, 'art-ink-fill')}`)}
    ${line('M665 200h112v-81h282M777 200h282M777 200v81h282', 'art-trace')}
    ${text(805, 100, 'Equal / exact')}${text(805, 181, 'Percentage / shares')}${text(805, 262, 'Integer cents')}
    ${circle(1080, 119, 15, 'art-accent-surface')}${circle(1080, 200, 15, 'art-accent-surface')}${circle(1080, 281, 15, 'art-accent-surface')}`;
}

function storage() {
  return `${rect(73, 55, 660, 268)}${repeat(4, i => `${rect(95 + i * 153, 78, 135, 222, 'art-carrier')}${rect(109 + i * 153, 93, 107, 122, 'art-dark')}${rect(114 + i * 153, 236, 97, 29, 'art-slot')}${circle(130 + i * 153, 279, 3, 'art-copper')}`)}
    ${line('M733 188h84V84h40M817 188h40M817 188v104h40', 'art-trace')}
    ${text(882, 91, 'LAN')}${text(882, 195, 'Tailscale')}${text(882, 299, 'MagicDNS')}
    ${text(73, 369, 'NFS + SMB / ordered endpoints', 'art-small')}`;
}

function archive() {
  return `<g transform="rotate(-7 491 200)">${rect(170, 42, 640, 310, 'art-archive-back')}</g>
    ${rect(221, 55, 640, 310, 'art-archive')}${repeat(8, i => `${rect(250 + (i % 4) * 147, 83 + Math.floor(i / 4) * 133, 119, 106, 'art-thumbnail')}${line(`M${260 + (i % 4) * 147} ${170 + Math.floor(i / 4) * 133}l27-33 20 20 24-39 29 52`, 'art-line')}`)}
    ${line('M997 82v181m-42-42 42 42 42-42', 'art-accent-line')}${line('M942 299v26h110v-26')}${text(920, 369, 'Resume / archive', 'art-small')}`;
}

function tools() {
  return `${line('M95 325H1105', 'art-line')}
    ${rect(100, 76, 280, 211, 'art-tool')}${line('M144 123h67v49h-67Zm67 25h66v78h56M166 172v54h55', 'art-trace')}${circle(332, 226, 9, 'art-copper')}${text(100, 366, 'iOS Shortcuts', 'art-small')}
    ${rect(460, 76, 280, 211, 'art-dark')}${line('M499 128l23 20-23 20m46 0h62', 'art-accent-line')}${line('M499 211h173m-173 23h112')}${text(460, 366, 'Python scripts', 'art-small')}
    ${rect(820, 76, 280, 211, 'art-tool')}${text(867, 221, '{ }', 'art-code')}${text(820, 366, 'Programming exercises', 'art-small')}`;
}

function engineering(electric) {
  return `${rect(71, 55, 430, 290, 'art-board')}${screws(91, 75, 390, 250)}
    ${rect(207, 135, 160, 130, 'art-chip')}${repeat(7, i => `${line(`M${217 + i * 22} 135V98H${130 + i * 45}V75`, 'art-trace')}${line(`M${217 + i * 22} 265v43H${130 + i * 45}v17`, 'art-trace')}`)}
    ${line('M501 200h115', 'art-trace')}
    ${electric
      ? `${rect(653, 91, 440, 218)}${repeat(8, i => rect(680 + i * 48, 115, 28, 166, 'art-carrier'))}${line('M616 200h37M1093 200h52', 'art-trace')}`
      : `${line('M616 200h74M731 94h263l52 70v127H679V164Z', 'art-structure')}${line('M755 116h214l31 52H724ZM716 273h294M745 196h234')}${circle(723, 294, 29)}${circle(1003, 294, 29)}${line('M849 65v-30m-63 25-21-21m147 21 21-21', 'art-accent-line')}`}
    ${text(71, 388, 'Engineering illustration / team contribution', 'art-small')}`;
}

const themes = {
  'ci-runner-console': ['infrastructure', 'Runner infrastructure, illustrated', runner],
  'artifact-platform': ['publishing', 'Distributed publishing, illustrated', publishing],
  'nvim-stm32': ['embedded', 'Embedded development illustration', embedded],
  mozaproxy: ['wheel', 'Wheel control illustration', wheel],
  'm1-toolchain': ['toolchain', 'The fifteen-tool M1 bundle', toolchain],
  wavelength: ['audio', 'Audio hardware illustration', audio],
  islet: ['notch', 'Top-edge interaction study', notch],
  'personal-website': ['rack', 'The rack as an interface', rack],
  'reconcile-app': ['ledger', 'Shared expense illustration', ledger],
  mountd: ['storage', 'Network storage illustration', storage],
  'gphotos-album-downloader': ['archive', 'Media archive illustration', archive],
  'small-utilities': ['tools', 'A compact set of tools', tools],
  'hardware-uqr-autonomous': ['engineering', 'Illustrative engineering study, not a vehicle wiring diagram', () => engineering(false)],
  'hardware-uqr-electric': ['engineering', 'Illustrative engineering study, not a vehicle wiring diagram', () => engineering(true)],
};

export function projectArt(unit, selectedModule) {
  const theme = themes[unit.id];
  if (!theme) return null;
  const [name, caption, draw] = theme;
  return {
    name,
    caption: selectedModule ? `${selectedModule.title} in the M1 Toolchain` : caption,
    markup: `<svg class="project-illustration" viewBox="0 0 1200 420" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${draw(unit, selectedModule)}</svg>`,
  };
}
