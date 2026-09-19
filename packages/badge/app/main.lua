-- HTN Arcade badge app. Turns the badge into a controller for the cabinet
-- over USB serial. Every line it logs is read by packages/badge on the Mac.
-- The cabinet never writes back (serial input does not reach a running app),
-- so everything on the screen and the LEDs is driven locally.
--
-- Wire protocol, one line per event, prefixed by the firmware as
-- "I (<ms>) lua: [arcade] ...":
--   ARCADE HELLO <badge_id> <name> <r> <g> <b>   on enter
--   ARCADE MAP UP=6 DOWN=3 ...                     button codes for this firmware
--   B <code> <1|0>                                 press (1) or release (0)
--   ARCADE BYE                                     on exit

local NAMES = { "UP", "DOWN", "LEFT", "RIGHT", "A", "B", "START", "HOME", "AUX1" }
local r, g, b = 255, 255, 255

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
  local title = badge.ui.label(root, "HTN ARCADE")
  title:align("top_mid", 0, 18)
  title:style({ text_color = 0xffec27 })
  local who = badge.ui.label(root, name)
  who:align("center", 0, -20)
  local status = badge.ui.label(root, "CONNECTED  -  HOME TO LEAVE")
  status:align("center", 0, 12)
  status:style({ text_color = 0xc2c3c7 })
  -- The cabinet reads this label with `uitree` when the app is already open
  -- at plug-in time, so it can identify the badge without a fresh HELLO.
  local meta = badge.ui.label(root, "id=" .. id .. " rgb=" .. r .. "," .. g .. "," .. b)
  meta:align("bottom_mid", 0, -10)
  meta:style({ text_color = 0x5f574f })
  leds(r, g, b)
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
