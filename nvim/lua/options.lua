local opt = vim.opt

-- Line numbers
opt.relativenumber = true
opt.number = true

-- Editing
opt.backspace = "indent,eol,start"
opt.hidden = true
opt.autoread = true
opt.showmatch = true
opt.matchtime = 5

-- No sounds
opt.visualbell = true
opt.belloff = "all"

-- No swap/backup
opt.swapfile = false
opt.backup = false
opt.writebackup = false

-- Indentation
opt.tabstop = 2
opt.shiftwidth = 2
opt.expandtab = true
opt.smartindent = true

-- Display
opt.list = true
opt.listchars = { tab = "  ", trail = "·" }
opt.wrap = false
opt.linebreak = true
opt.termguicolors = true
opt.showmode = false
opt.ruler = true
opt.showcmd = true

-- Search
opt.incsearch = true
opt.hlsearch = true
opt.ignorecase = true
opt.smartcase = true

-- Scrolling
opt.scrolloff = 8
opt.sidescrolloff = 15
opt.sidescroll = 1

-- Folds
opt.foldmethod = "indent"
opt.foldnestmax = 3
opt.foldenable = false

-- Completion
opt.wildmode = "list:longest"
opt.wildmenu = true
opt.wildignore = "*.o,*.obj,*~,*vim/backups*,*sass-cache*,*DS_Store*,vendor/rails/**,vendor/cache/**,*.gem,log/**,tmp/**,*.png,*.jpg,*.gif"

-- History
opt.history = 1000

-- Markdown wrapping
vim.api.nvim_create_autocmd("FileType", {
  pattern = "markdown",
  callback = function() vim.opt_local.wrap = true end,
})
