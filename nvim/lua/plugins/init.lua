return {
  -- Theme
  {
    "navarasu/onedark.nvim",
    lazy = false,
    priority = 1000,
    config = function()
      require("onedark").setup({ style = "dark" })
      require("onedark").load()
    end,
  },

  -- Status line
  {
    "nvim-lualine/lualine.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    opts = { options = { theme = "onedark" } },
  },

  -- Treesitter (replaces polyglot + all syntax plugins)
  {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    opts = {
      ensure_installed = { "lua", "typescript", "tsx", "javascript", "rust", "json", "yaml", "toml", "markdown", "bash", "html", "css", "graphql" },
      highlight = { enable = true },
      indent = { enable = true },
    },
  },

  -- Context-aware comments (correct comment style in JSX/TSX)
  { "JoosepAlviste/nvim-ts-context-commentstring", opts = {} },

  -- Fuzzy finder (replaces CtrlP)
  {
    "nvim-telescope/telescope.nvim",
    branch = "0.1.x",
    dependencies = {
      "nvim-lua/plenary.nvim",
      { "nvim-telescope/telescope-fzf-native.nvim", build = "make" },
    },
    config = function()
      require("telescope").load_extension("fzf")
    end,
    keys = {
      { "<C-p>", "<cmd>Telescope find_files<cr>" },
      { "<leader>fg", "<cmd>Telescope live_grep<cr>" },
      { "<leader>fb", "<cmd>Telescope buffers<cr>" },
      { "<leader>fs", "<cmd>Telescope lsp_document_symbols<cr>" },
      { "<leader>fr", "<cmd>Telescope lsp_references<cr>" },
      { "K", "<cmd>Telescope grep_string<cr>", mode = "n" },
    },
  },

  -- File explorer (replaces NERDTree)
  {
    "stevearc/oil.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    keys = { { "<C-n>", "<cmd>Oil<cr>" }, { "-", "<cmd>Oil<cr>" } },
    opts = { view_options = { show_hidden = true } },
  },

  -- Tmux navigation
  { "christoomey/vim-tmux-navigator" },

  -- Git
  { "tpope/vim-fugitive" },
  { "lewis6741/gitsigns.nvim", opts = {} },

  -- Keymap discoverability
  { "folke/which-key.nvim", event = "VeryLazy", opts = {} },

  -- Markdown preview
  { "ellisonleao/glow.nvim", cmd = "Glow", opts = {} },
}
