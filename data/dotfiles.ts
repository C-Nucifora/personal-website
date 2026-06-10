/**
 * Hidden-home-directory flavor files (EASTER_EGGS.md §4.1). Revealed by
 * `ls -a`, readable with `cat`. `.plan` is generated from data/now.ts so the
 * sincere part stays single-source — see lib/vfs/builders.ts.
 */

export const bashrc = `# ~/.bashrc

alias work='echo no'
alias vim=vim  # leave it alone

export EDITOR=nvim
export PATH="$HOME/.local/bin:$PATH"
`;

export const vimrc = `" yes, relative numbers. obviously.
set relativenumber number
set tabstop=2 shiftwidth=2 expandtab
set ignorecase smartcase
set undofile
nnoremap <leader>w :w<CR>
`;

export const nothingToSeeHere = "told you.";
