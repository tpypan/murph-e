# Cabinet font on the badge

The cabinet loads **Press Start 2P** via `next/font/google`. The JSON file here is
its uppercase ASCII/punctuation raster at the font's native 8×8 grid, extracted
from that loaded font with browser Canvas. This is font data, not a drawn imitation.
The original font's SIL Open Font License is included in `OFL.txt`.

`python3 scripts/generate-badge-font.py` regenerates nine small RGB565 LVGL files.
Each dynamic glyph is a clipped view into a 16-glyph atlas. The title and footer use whole-line images.
This keeps glyph coordinates and pixel data out of the Lua heap. Rendering uses
integer scaling and one character per tick; glyph widgets are reused in place across
label changes and pages, so updates do not continually allocate new UI handles. Names, PLAYER 1/2, controls and footer share the cabinet font.
Identity metadata retains the original name; unsupported display characters use ?.

The complete app bundle is under 48 KiB with 11 files. The manifest uses the
standard 48 KiB Lua budget. Upload requires the firmware's `PUT BINARY OK` support.
On this badge firmware, console `shot` can overflow the console task stack when
rendering file images; avoid it for this screen. This is separate from Lua memory.
