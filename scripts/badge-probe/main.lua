-- Arcade cabinet day-one check: log identity and button map on enter, log every button event.
local label

function on_enter(root)
  local id = tostring(badge.me.badge_id())
  local name = tostring(badge.me.name())
  local r, g, b = badge.me.color()
  badge.sys.log("ARCADE HELLO " .. id .. " " .. name .. " " .. tostring(r) .. " " .. tostring(g) .. " " .. tostring(b))
  badge.sys.log("ARCADE FW " .. tostring(badge.sys.version()))
  local names = { "UP", "DOWN", "LEFT", "RIGHT", "A", "B", "START", "HOME", "AUX1" }
  local map = {}
  for i = 1, #names do
    map[#map + 1] = names[i] .. "=" .. tostring(badge.input.BUTTON[names[i]])
  end
  badge.sys.log("ARCADE MAP " .. table.concat(map, " "))
  label = badge.ui.label(root, "ARCADE TEST v2\n" .. name .. "\npress buttons")
end

function on_button(button, kind)
  local down = (kind == badge.input.KIND.PRESSED) and 1 or 0
  badge.sys.log("B " .. tostring(button) .. " " .. tostring(down))
end
