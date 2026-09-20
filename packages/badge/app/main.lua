-- HTN Arcade badge app. Turns the badge into a controller for the cabinet
-- over USB serial. Every line it logs is read by packages/badge on the Mac.
-- The console writes display.txt when player assignment or controls change.
-- Lua reads that small mailbox once a second; button events stay on serial.
--
-- Wire protocol, one line per event, prefixed by the firmware as
-- "I (<ms>) lua: [arcade] ...":
--   ARCADE HELLO <badge_id> <name> <r> <g> <b>   on enter
--   ARCADE MAP UP=6 DOWN=3 ...                     button codes for this firmware
--   B <code> <1|0>                                 press (1) or release (0)
--   ARCADE BYE                                     on exit

local NAMES = { "UP", "DOWN", "LEFT", "RIGHT", "A", "B", "START", "HOME", "AUX1" }
local r, g, b = 255, 255, 255
local player_label, footer, page_label
local screen_bg
local control_labels = {}
local rows = { "D-PAD: CHOOSE", "A: SELECT", "B: BACK" }
local last_read, last_page, page = -1000, 0, 0
local last_display = ""

-- Use the cabinet font as small RGB565 atlas files, not Lua coordinate tables.
local FONT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 :/-?.!+()"
local pixel_labels = {}
local function pixel_label(x, y, scale, color, max_chars)
  local style = scale == 2 and "white16" or "cyan8"
  local label = { widgets = {}, images = {}, text = "", next_char = 1, x = x, y = y, size = scale * 8, style = style }
  function label:set_text(text)
    text = string.upper(text)
    if #text > max_chars then text = string.sub(text, 1, max_chars - 3) .. "..." end
    if text == self.text then return end
    self.text = text
    self.next_char = 1
    for i, widget in pairs(self.widgets) do
      if i > #text then widget:hidden(true) end
    end
  end
  pixel_labels[#pixel_labels + 1] = label
  return label
end

local function paint_next_glyph()
  for _, label in ipairs(pixel_labels) do
    local c = label.next_char
    if c <= #label.text then
      local char = string.sub(label.text, c, c)
      if char ~= " " then
        local index = (string.find(FONT_CHARS, char, 1, true) or string.find(FONT_CHARS, "?", 1, true)) - 1
        local cell = label.widgets[c]
        local glyph = label.images[c]
        local src = "font-" .. label.style .. "-" .. math.floor(index / 16) .. ".bin"
        if not cell then
          cell = badge.ui.box(screen_bg, label.size, label.size)
          cell:set_pos(label.x + (c - 1) * label.size, label.y)
          cell:style({ bg_color = 0x000000, border_width = 0, radius = 0, pad_all = 0 })
          glyph = badge.ui.image(cell, src)
          label.widgets[c], label.images[c] = cell, glyph
        else
          glyph:set_src(src)
          cell:hidden(false)
        end
        glyph:set_pos(-(index % 4) * label.size, -math.floor((index % 16) / 4) * label.size)
      elseif label.widgets[c] then
        label.widgets[c]:hidden(true)
      end
      label.next_char = c + 1
      return
    end
  end
end

local function draw_controls()
  local pages = math.max(1, math.ceil(#rows / 3))
  page = page % pages
  for i = 1, 3 do control_labels[i]:set_text(rows[page * 3 + i] or "") end
  page_label:set_text(pages > 1 and ("CONTROLS " .. (page + 1) .. "/" .. pages) or "CONTROLS")
end

local function read_display()
  local text = badge.fs.read("display.txt")
  if not text or text == last_display then return end
  -- A put can be in progress: only accept complete, versioned messages.
  if string.sub(text, 1, 17) ~= "ARCADE-DISPLAY-1\n" or string.sub(text, -5) ~= "\nEND\n" then return end
  local lines = {}
  for line in string.gmatch(text, "([^\n]+)\n") do lines[#lines + 1] = line end
  if #lines < 5 or not string.match(lines[2], "^PLAYER %d+$") then return end
  last_display = text
  player_label:set_text(lines[2])
  footer:set_text(lines[3] .. "   HOME: EXIT")
  rows = {}
  for i = 4, #lines - 1 do rows[#rows + 1] = lines[i] end
  page = 0
  last_page = badge.sys.ms()
  draw_controls()
end

local function leds(rr, gg, bb)
  badge.led.set_all(rr, gg, bb)
  badge.led.show()
end

function on_enter(root)
  local id = tostring(badge.me.badge_id())
  local name = tostring(badge.me.name())
  local cr, cg, cb = badge.me.color()
  r, g, b = tonumber(cr) or 255, tonumber(cg) or 255, tonumber(cb) or 255
  badge.sys.log("ARCADE HELLO " .. id .. " " .. name .. " " .. r .. " " .. g .. " " .. b)
  local map = {}
  for i = 1, #NAMES do
    map[i] = NAMES[i] .. "=" .. tostring(badge.input.BUTTON[NAMES[i]])
  end
  badge.sys.log("ARCADE MAP " .. table.concat(map, " "))

  -- The sandbox has no pcall, so keep this to calls the README shows verbatim.
  local bg = badge.ui.box(root, 320, 240)
  bg:set_pos(0, 0)
  bg:style({ bg_color = 0x000000, border_width = 0, radius = 0, pad_all = 0 })
  screen_bg = bg
  -- Keep exact identity in hidden labels for USB reconnects.
  local title = badge.ui.label(bg, "ARCADE")
  title:hidden(true)
  local who = badge.ui.label(bg, name)
  who:hidden(true)
  local wordmark = badge.ui.image(bg, "font-heading-0.bin")
  wordmark:set_pos(16, 18)
  player_label = pixel_label(224, 23, 1, 0x55ffff, 10)
  player_label:set_text("CONNECTING")
  pixel_label(16, 64, 2, 0xffffff, 18):set_text(name)
  local divider = badge.ui.box(bg, 288, 2)
  divider:set_pos(16, 99)
  divider:style({ bg_color = 0x55ffff, border_width = 0, radius = 0 })
  page_label = pixel_label(16, 111, 1, 0x55ffff, 30)
  for i = 1, 3 do control_labels[i] = pixel_label(16, 133 + (i - 1) * 26, 2, 0xffffff, 18) end
  local footer_image = badge.ui.image(bg, "font-footer-0.bin")
  footer_image:set_pos(16, 221)
  footer = { current = "" }
  function footer:set_text(text)
    local src = string.find(text, "PAUSE", 1, true) and "font-footer-1.bin" or "font-footer-0.bin"
    if self.current ~= src then footer_image:set_src(src); self.current = src end
  end
  local meta = badge.ui.label(bg, "id=" .. id .. " rgb=" .. r .. "," .. g .. "," .. b)
  meta:hidden(true)
  draw_controls()
  read_display()
  leds(r, g, b)
end

function on_tick()
  paint_next_glyph()
  local now = badge.sys.ms()
  if now - last_read >= 1000 then
    last_read = now
    read_display()
  end
  if now - last_page >= 4000 then
    last_page = now
    page = page + 1
    draw_controls()
  end
end

function on_button(button, kind)
  local down = (kind == badge.input.KIND.PRESSED)
  badge.sys.log("B " .. tostring(button) .. " " .. (down and "1" or "0"))
  if button == badge.input.BUTTON.A or button == badge.input.BUTTON.B then
    if down then
      leds(255, 255, 255)
    else
      leds(r, g, b)
    end
  end
end

function on_exit()
  badge.sys.log("ARCADE BYE")
  badge.led.clear()
  badge.led.show()
end
