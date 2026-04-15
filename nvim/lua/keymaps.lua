local map = vim.keymap.set

-- ESC is too far away
map("i", "jj", "<Esc>")

-- Buffer navigation
map("n", ",z", ":bp<CR>", { silent = true })
map("n", ",x", ":bn<CR>", { silent = true })

-- Zoom pane
map("n", ",gz", "<C-w>o", { silent = true })

-- Toggle search highlight
map("n", "<Space>", ":set hls!<CR>", { silent = true })

-- Strip trailing whitespace
map("n", ",w", function()
  local pos = vim.api.nvim_win_get_cursor(0)
  vim.cmd([[%s/\s\+$//e]])
  vim.api.nvim_win_set_cursor(0, pos)
end, { silent = true })

-- Smart close window/buffer
map("n", "Q", function()
  local wins = vim.fn.filter(vim.fn.range(1, vim.fn.winnr("$")),
    function(_, v) return vim.fn.winbufnr(v) == vim.fn.bufnr("%") end)
  if #wins > 1 then
    vim.cmd("close")
  else
    vim.cmd("bdelete")
  end
end, { silent = true })

-- Sudo write
vim.cmd([[cmap w!! w !sudo tee % >/dev/null]])

-- Toggle background
map("n", "<leader>bg", function()
  if vim.o.background == "dark" then
    vim.o.background = "light"
  else
    vim.o.background = "dark"
  end
end)
