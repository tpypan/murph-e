const FACTORY=((config = {}) => {
  // Original arcade driving foundation. SI-like track units and dt seconds.
  // The build script embeds assets.json here; no file/network access at runtime.
  const ART = {"width":32,"height":32,"animations":{"idle":{"frames":["idle-0","idle-1"],"loop":true,"frameMs":200},"drive":{"frames":["drive-0","drive-1"],"loop":true,"frameMs":90},"steerLeft":{"frames":["left-0","left-1"],"loop":true,"frameMs":100},"steerRight":{"frames":["right-0","right-1"],"loop":true,"frameMs":100},"driftLeft":{"frames":["drift-left-0","drift-left-1"],"loop":true,"frameMs":80},"driftRight":{"frames":["drift-right-0","drift-right-1"],"loop":true,"frameMs":80},"boost":{"frames":["boost-0","boost-1"],"loop":true,"frameMs":60},"crash":{"frames":["crash-0","crash-1","crash-2","crash-3"],"loop":true,"frameMs":90}},"frames":{"idle-0":{"pixels":["................................","................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":200,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}},"idle-1":{"pixels":["................................","................................","................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................"],"durationMs":200,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":8}}},"drive-0":{"pixels":["................................","................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":90,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}},"drive-1":{"pixels":["................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................","................................"],"durationMs":90,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":6}}},"left-0":{"pixels":["................................","..............a.................","...........2777aa2..............","..........2a777aaa2.............","..........aa777aaaa.............",".........2aa777aaaa2............",".........2aa777aaaa2............",".........aaa777aaaaa............","........22aa777aaaa22...........",".........2aa777aaaa2............",".........299999999a2............",".........29999999922............","........1c2444444221............","........1c2222a22221............","......ffffc2222222ffff..........","......ffff11112111ffff99........","......ffff11111111ffff998.......","..6662fff0000000000fff88822.....",".066688810000000000188888888000.",".055888811111111111188888888500.",".011888888888888888888888555110.",".055888888888888888888888555500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":100,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":14,"y":7}}},"left-1":{"pixels":["..............a.................","...........2777aa2..............","..........2a777aaa2.............","..........aa777aaaa.............",".........2aa777aaaa2............",".........2aa777aaaa2............",".........aaa777aaaaa............","........22aa777aaaa22...........",".........2aa777aaaa2............",".........299999999a2............",".........29999999922............","........1c2444444221............","........1c2222a22221............","......ffffc2222222ffff..........","......ffff11112111ffff99........","......ffff11111111ffff998.......",".....2fff0000000000fff88822.....",".066688810000000000188888888000.",".066688811111111111188888888500.",".011888888888888888888888888110.",".055888888888888888888888555500.",".055887777755555555557777555500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................","................................"],"durationMs":100,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":14,"y":6}}},"right-0":{"pixels":["................................","..................a.............","...............2777aa2..........","..............2a777aaa2.........","..............aa777aaaa.........",".............2aa777aaaa2........",".............2aa777aaaa2........",".............aaa777aaaaa........","............22aa777aaaa22.......",".............2aa777aaaa2........",".............299999999a2........",".............29999999922........","............1c2444444221........","............1c2222a22221........","..........ffffc2222222ffff......","........99ffff11112111ffff......",".......899ffff11111111ffff......",".....22888fff0000000000fff2666..",".000888888881000000000018886660.",".055888888881111111111118888500.",".015558888888888888888888888110.",".055558888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":100,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":18,"y":7}}},"right-1":{"pixels":["..................a.............","...............2777aa2..........","..............2a777aaa2.........","..............aa777aaaa.........",".............2aa777aaaa2........",".............2aa777aaaa2........",".............aaa777aaaaa........","............22aa777aaaa22.......",".............2aa777aaaa2........",".............299999999a2........",".............29999999922........","............1c2444444221........","............1c2222a22221........","..........ffffc2222222ffff......","........99ffff11112111ffff......",".......899ffff11111111ffff......",".....22888fff0000000000fff2.....",".000888888881000000000018886660.",".055888888881111111111118886660.",".011888888888888888888888888110.",".055558888888888888888888888500.",".055557777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................","................................"],"durationMs":100,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":18,"y":6}}},"drift-left-0":{"pixels":["................................","............a...................",".........2777aa2................","........2a777aaa2...............","........aa777aaaa...............",".......2aa777aaaa2..............",".......2aa777aaaa2..............",".......aaa777aaaaa..............","......22aa777aaaa22.............",".......2aa777aaaa2..............",".......299999999a2..............",".......29999999922..............","......1c2444444221..............","......1c2222a22221..............","....ffffc2222222ffff............","....ffff11112111ffff9999........","....ffff11111111ffff99998.......","..666ff0000000000fff8888822.....",".066681000000000018888888888000.",".055881111111111118888888888500.",".011888888888888888888888555110.",".055888888888888888888888555500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":80,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":12,"y":7}}},"drift-left-1":{"pixels":["............a...................",".........2777aa2................","........2a777aaa2...............","........aa777aaaa...............",".......2aa777aaaa2..............",".......2aa777aaaa2..............",".......aaa777aaaaa..............","......22aa777aaaa22.............",".......2aa777aaaa2..............",".......299999999a2..............",".......29999999922..............","......1c2444444221..............","......1c2222a22221..............","....ffffc2222222ffff............","....ffff11112111ffff9999........","....ffff11111111ffff99998.......","....fff0000000000fff8888822.....",".066681000000000018888888888000.",".066681111111111118888888888500.",".011888888888888888888888888110.",".055888888888888888888888555500.",".055887777755555555557777555500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................","................................"],"durationMs":80,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":12,"y":6}}},"drift-right-0":{"pixels":["................................","....................a...........",".................2777aa2........","................2a777aaa2.......","................aa777aaaa.......","...............2aa777aaaa2......","...............2aa777aaaa2......","...............aaa777aaaaa......","..............22aa777aaaa22.....","...............2aa777aaaa2......","...............299999999a2......","...............29999999922......","..............1c2444444221......","..............1c2222a22221......","............ffffc2222222ffff....","........9999ffff11112111ffff....",".......89999ffff11111111ffff....",".....2288888fff0000000000ff666..",".000888888888810000000000186660.",".055888888888811111111111188500.",".015558888888888888888888888110.",".055558888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":80,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":20,"y":7}}},"drift-right-1":{"pixels":["....................a...........",".................2777aa2........","................2a777aaa2.......","................aa777aaaa.......","...............2aa777aaaa2......","...............2aa777aaaa2......","...............aaa777aaaaa......","..............22aa777aaaa22.....","...............2aa777aaaa2......","...............299999999a2......","...............29999999922......","..............1c2444444221......","..............1c2222a22221......","............ffffc2222222ffff....","........9999ffff11112111ffff....",".......89999ffff11111111ffff....",".....2288888fff0000000000fff....",".000888888888810000000000186660.",".055888888888811111111111186660.",".011888888888888888888888888110.",".055558888888888888888888888500.",".055557777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................","................................"],"durationMs":80,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":20,"y":6}}},"boost-0":{"pixels":["................................","................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","...........999.....999..........","...........9a9.....9a9..........","..........a.a.......a.a........."],"durationMs":60,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}},"boost-1":{"pixels":["................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","...........999.....999..........","...........9c9.....9c9..........","..........c.c.......c.c........."],"durationMs":60,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":6}}},"crash-0":{"pixels":["................................","................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........aaa777aaaaa..........","..........22aa777aaaa22.........","...........2aa777aaaa2..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":90,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}},"crash-1":{"pixels":["................................","................a...............","..............aa7aa.............",".............a77777a............","............a7777777a...........","............777777777...........","............a7777777a...........","...........aaa777711111.........","............aaaa7a11111.........","............aaaaaa11111.........","............aaaaaaaaa...........",".............aaaaaaa............","............cccccccc............","............cccccccc............","............cccccccc............",".......7777711111117777.........","....888777771111111777788888....","....888888999999999999888888....","....888088999999999999888088....","....800000881111111888800000....","....0000000811111118880000000...","..2222222222222222222222222220..","..2222222222222222222222222220..",".110005550001111111110005550001.",".100055555000111111100055555000.","...000555000.........000555000..","...000555000.........000555000..","...000050000.........000050000..","....0000000...........0000000...",".....00000.............00000....",".......0.................0......","................................"],"durationMs":90,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}},"crash-2":{"pixels":["................................","................a...............",".............2777aa2............","............2a777aaa2...........","............aa777aaaa...........","...........2aa777aaaa2..........","...........2aa777aaaa2..........","...........11ccc11111a..........","..........2111111111122.........","...........11111111112..........","...........299999999a2..........","...........29999999922..........","..........1c2444444221..........","..........1c2222a22221..........","........ffffc2222222ffff........","........ffff11112111ffff........",".......8ffff11111111ffff8.......",".....228fff0000000000fff822.....",".000888888100000000001888888000.",".055888888111111111111888888500.",".011888888888888888888888888110.",".055888888888888888888888888500.",".055887777755555555557777788500.",".011887777750000000057777788110.",".05502aaaa255555555552aaaa25500.",".05502aaaa855555555558aaaa25500.",".011122888888888888888888221110.",".000000811166111111166118000000.",".000000011166111111166110000000.","................................","................................","................................"],"durationMs":90,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}},"crash-3":{"pixels":["................................","................a...............","..............aa7aa.............",".............a77777a............","............a7777777a...........","............777777777...........","............a7777777a...........","...........11111777aaa..........","...........111117aaaa...........","...........11111aaaaa...........","............aaaaaaaaa...........",".............aaaaaaa............","............cccccccc............","............cccccccc............","............cccccccc............",".......7777711111117777.........","....888777771111111777788888....","....888888999999999999888888....","....888088999999999999888088....","....800000881111111888800000....","....0000000811111118880000000...","..2222222222222222222222222220..","..2222222222222222222222222220..",".110005550001111111110005550001.",".100055555000111111100055555000.","...000555000.........000555000..","...000555000.........000555000..","...000050000.........000050000..","....0000000...........0000000...",".....00000.............00000....",".......0.................0......","................................"],"durationMs":90,"anchor":{"x":16,"y":29},"hurtboxes":[{"x":3,"y":17,"w":26,"h":12}],"hitboxes":[],"sockets":{"exhaustLeft":{"x":12,"y":29},"exhaustRight":{"x":20,"y":29},"driver":{"x":16,"y":7}}}}};
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mod = (n, d) => ((n % d) + d) % d;
  const lerp = (a, b, t) => a + (b - a) * t;
  const STEP = 80;
  const colors = [8, 12, 11, 14, 9, 10];
  const names = ['YOU', 'COMET', 'MANGO', 'PEARL', 'SPARK', 'COBALT'];
  const defaultTrack = [
    [24, 0, 'harbor'], [24, 0.7, 'palms'], [18, 0, 'beach'],
    [22, -0.8, 'cliffs'], [16, 0.15, 'cliffs'], [26, 1, 'palms'],
    [20, -0.65, 'beach'], [24, 0, 'harbor'],
  ];
  let track = [], length = 0, racers = [], countdown = 3, raceTime = 0;
  let frames = 0, humanCount = 1, finished = false, finishDelay = 0, winner = null;
  let laps = 3, limit = 180, level = 0.45, checkpointPositions = [];
  let ordered = [], message = '', messageT = 0, worldHeading = 0;
  const night = config.theme === 'night';
  // Authored scenery palettes: exact RGB, separate from vehicle/source palettes.
  const sceneryPalette = night
    ? ['#192c48','#29405c','#4d627b','#bbc3c6','#18344e','#315c73','#40536a','#2b4b4b','#28473b','#2d5040','#343c46','#39414a','#a64e52','#c6c7b7','#807f6b','#17252f']
    : ['#457da6','#75adc1','#b8d7cd','#f4ebcf','#245579','#3d91aa','#547c88','#38635c','#376847','#3d724b','#454b50','#494f54','#bc4b42','#e5e0c8','#b7a679','#293940'];
  const sceneryRasters = new Map();

  const stats = { collisions: 0, driftBoosts: 0, padBoosts: 0, checkpointPasses: 0 };
  const allFrames = ART.frames;
  const vehicleArt = new Map(), roadsideArt = {}, scaledArt = new Map();
  const vehiclePoses = ['idle','drive','steerLeft','steerRight','driftLeft','driftRight','boost','crash'];
  let artFrameId = 0;

  function prepareArt(input, required, label, defaultWidth, maxWidth) {
    if (!input || !input.frames || !input.animations) throw new Error('Kart '+label+' requires frames and animations');
    const entries = Object.entries(input.frames);
    if (!entries.length || entries.length > 128) throw new Error('Kart '+label+' requires 1-128 frames');
    const result = { frames: Object.create(null), animations: Object.create(null) };
    for (const [key, raw] of entries) {
      const rows = raw?.pixels, w = rows?.[0]?.length, h = rows?.length;
      if (!Array.isArray(rows) || !w || w > 256 || !h || h > 224 || rows.some(r=>typeof r!=='string'||r.length!==w||!/^[0-9a-f.]+$/i.test(r)))
        throw new Error('Invalid rectangular kart sprite '+label+'/'+key);
      const anchor = raw.anchor;
      if (!anchor || !Number.isInteger(anchor.x) || !Number.isInteger(anchor.y) || anchor.x<0 || anchor.x>w || anchor.y<0 || anchor.y>h)
        throw new Error('Invalid kart ground anchor '+label+'/'+key);
      const palette = raw.palette;
      if (palette !== undefined && (!Array.isArray(palette) || !palette.length || palette.length>16 || palette.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)) || rows.some(r=>[...r].some(c=>c!=='.'&&parseInt(c,16)>=palette.length))))
        throw new Error('Invalid kart sprite palette '+label+'/'+key);
      if (raw.durationMs!==undefined && (!Number.isFinite(raw.durationMs)||raw.durationMs<1||raw.durationMs>10000))
        throw new Error('Invalid kart frame duration '+label+'/'+key);
      result.frames[key] = { id: artFrameId++, pixels: rows.map(r=>r.toLowerCase()), width:w, height:h,
        anchor:{...anchor}, palette:palette?.slice(), durationMs:raw.durationMs };
    }
    const sourceWidth = input.sourceWidth ?? Math.max(...entries.map(([,f])=>f.pixels[0].length));
    const displayWidth = input.displayWidth ?? defaultWidth;
    if (!Number.isFinite(sourceWidth)||sourceWidth<1||sourceWidth>256||!Number.isFinite(displayWidth)||displayWidth<1||displayWidth>maxWidth)
      throw new Error('Invalid kart source/display width '+label);
    result.scale = displayWidth/sourceWidth;
    // Bound one cached raster to the console size without distorting or silently resizing art.
    if (Object.values(result.frames).some(f=>Math.round(f.width*result.scale*1.6)>256||Math.round(f.height*result.scale*1.6)>224))
      throw new Error('Kart '+label+' projected sprite exceeds 256x224; reduce displayWidth');
    for (const pose of required) {
      const clip = input.animations[pose];
      if (!clip || !Array.isArray(clip.frames) || !clip.frames.length || clip.frames.length>128 || !Number.isFinite(clip.frameMs) || clip.frameMs<1 || clip.frameMs>10000 || clip.frames.some(k=>!Object.hasOwn(result.frames,k)))
        throw new Error('Missing or invalid kart '+label+' animation '+pose);
      const times = clip.frames.map(k=>result.frames[k].durationMs ?? clip.frameMs);
      result.animations[pose] = { frames:clip.frames.slice(), times, total:times.reduce((a,b)=>a+b,0) };
    }
    return result;
  }
  function prepareCustomArt() {
    vehicleArt.clear(); scaledArt.clear(); artFrameId=0;
    for(const key of Object.keys(roadsideArt))delete roadsideArt[key];
    if(config.assets===undefined)return;
    if(!config.assets||typeof config.assets!=='object')throw new Error('Kart assets must be an object');
    const vehicles=config.assets.vehicles??[];
    if(!Array.isArray(vehicles)||vehicles.length>6)throw new Error('Kart assets.vehicles must contain at most 6 sets');
    for(const set of vehicles){
      if(typeof set?.id!=='string'||!set.id.length||set.id.length>64||vehicleArt.has(set.id))throw new Error('Kart vehicle requires a unique id');
      vehicleArt.set(set.id,prepareArt(set,vehiclePoses,'vehicle '+set.id,32,64));
    }
    for(const key of ['palm','sign','billboard'])if(config.assets.roadside?.[key])
      roadsideArt[key]=prepareArt(config.assets.roadside[key],['idle'],'roadside '+key,key==='palm'?34:key==='sign'?29:62,160);
  }
  function customFrame(set, pose, time, once=false) {
    const clip=set.animations[pose];let cursor=once?Math.min(time,clip.total-0.001):mod(time,clip.total);
    for(let i=0;i<clip.frames.length;i++){if(cursor<clip.times[i])return set.frames[clip.frames[i]];cursor-=clip.times[i];}
    return set.frames[clip.frames[clip.frames.length-1]];
  }
  function drawCustom(p,set,pose,cx,base,scale,time,once=false){
    const f=customFrame(set,pose,time,once),factor=scale*set.scale;
    const w=Math.max(1,Math.round(f.width*factor)),h=Math.max(1,Math.round(f.height*factor));
    const key=f.id+':'+w+':'+h;
    let raster=scaledArt.get(key);
    if(!raster){
      // Sample each destination pixel exactly once: no overlapping source rectangles or palette loss.
      const pixels=[];
      for(let y=0;y<h;y++){let row='';const sy=Math.min(f.height-1,Math.floor((y+0.5)*f.height/h));
        for(let x=0;x<w;x++)row+=f.pixels[sy][Math.min(f.width-1,Math.floor((x+0.5)*f.width/w))];pixels.push(row);}
      raster={pixels,rows:pixels.map(row=>[row])};
      if(scaledArt.size>=128)scaledArt.delete(scaledArt.keys().next().value);
      scaledArt.set(key,raster);
    }else{scaledArt.delete(key);scaledArt.set(key,raster);}
    p.sprite(raster,Math.round(cx-f.anchor.x*w/f.width),Math.round(base-f.anchor.y*h/f.height),f.palette);
  }

  function segmentAt(distance) { return track[Math.floor(mod(distance, length) / STEP) % track.length]; }
  function makeTrack() {
    const input = Array.isArray(config.track) && config.track.length >= 4 ? config.track.slice(0, 24) : defaultTrack;
    const pieces = input.map(p => Array.isArray(p)
      ? { length: p[0], curve: p[1], scenery: p[2] }
      : p);
    track = [];
    for (let section = 0; section < pieces.length; section++) {
      const p = pieces[section];
      const count = clamp(Math.floor(Number(p.length) || 20), 12, 60);
      const curve = clamp(Number(p.curve) || 0, -1.2, 1.2);
      for (let i = 0; i < count; i++) {
        const ramp = Math.min(1, i / 7, (count - 1 - i) / 7);
        const smooth = ramp * ramp * (3 - 2 * ramp);
        const index = track.length;
        track.push({ index, curve: curve * smooth, scenery: p.scenery || 'palms', section,
          palm: index % 5 === 2, sign: Math.abs(curve) > 0.45 && i % 7 === 3,
          boost: (section === 0 || section === pieces.length - 2) && i === count - 8,
        });
      }
    }
    length = track.length * STEP;
    checkpointPositions = [0.25, 0.5, 0.75, 1].map(n => n * length);
  }
  function makeRacer(i) {
    const custom = (Array.isArray(config.drivers) && config.drivers[i]) || {};
    if(custom.asset!==undefined&&!vehicleArt.has(custom.asset))throw new Error('Unknown kart vehicle asset '+custom.asset);
    return { id: i, human: i < humanCount, name: String(custom.name || (i === 1 && humanCount === 2 ? 'P2' : names[i])).slice(0, 9),
      art:vehicleArt.get(custom.asset),
      body: clamp(Number.isFinite(custom.body) ? custom.body : colors[i], 0, 15),
      helmet: clamp(Number.isFinite(custom.helmet) ? custom.helmet : (i % 2 ? 7 : 10), 0, 15),
      rev: 0, brakeLamp: false, preDrift: 0, distance: 0 - Math.floor(i / 2) * 90, x: (i % 2 ? 0.28 : -0.28), speed: 0, steer: 0,
      // The first row starts at zero; rear rows physically cover their extra grid spacing.
      grid: Math.floor(i / 2) * 90, lap: 0, checkpoint: 0, checkpointBits: [],
      boost: 0, drift: 0, driftSide: 0, driftHeld: false, crash: 0,
      invulnerable: 0, padSegment: -1, finishTime: null, bestLap: null, lastLapAt: 0,
      skid: [], score: 0, passed: 0, aiPhase: i * 1.43,
    };
  }
  function init(api) {
    humanCount = (api.players ?? config.players) === 2 ? 2 : 1;
    laps = clamp(Math.floor(Number(config.laps) || 3), 1, 5);
    limit = clamp(Number(config.timeLimit) || 180, 30, 600);
    level = clamp(Number.isFinite(config.difficulty) ? config.difficulty : 0.45, 0, 1);
    prepareCustomArt();makeTrack(); racers = Array.from({ length: 6 }, (_, i) => makeRacer(i));
    countdown = 3; raceTime = 0; frames = 0; finished = false; finishDelay = 0; winner = null;
    message = ''; messageT = 0; worldHeading = 0;
    stats.collisions = stats.driftBoosts = stats.padBoosts = stats.checkpointPasses = 0;
    for (let p = 0; p < humanCount; p++) api.score(0, p);
    ordered = racers.slice();
  }
  function announce(api, text, sound = 'coin') {
    message = text; messageT = 1.5; api.sfx(sound);
  }
  function updateCheckpoints(c, oldDistance, api) {
    // Crossing the finish early cannot award a lap: every ordered gate must have been crossed.
    while (c.checkpoint < checkpointPositions.length &&
      oldDistance < c.lap * length + checkpointPositions[c.checkpoint] &&
      c.distance >= c.lap * length + checkpointPositions[c.checkpoint]) {
      c.checkpointBits.push(c.checkpoint); c.checkpoint++; stats.checkpointPasses++;
      if (c.human) { c.score += 100; api.score(c.score, c.id); }
      if (c.human && typeof config.onCheckpoint === 'function') {
        config.onCheckpoint({ player: c.id, lap: c.lap + 1, gate: c.checkpoint }, api);
        if (c.human) c.score = api.getScore(c.id);
      }
      if (c.checkpoint === 4) {
        c.lap++; c.checkpoint = 0; c.checkpointBits = [];
        const lapTime = raceTime - c.lastLapAt; c.lastLapAt = raceTime;
        c.bestLap = c.bestLap === null ? lapTime : Math.min(c.bestLap, lapTime);
        if (c.lap >= laps) {
          c.finishTime = raceTime;
          if (c.human) { c.score += 1000; api.score(c.score, c.id); }
          if (c.id === 0) announce(api, 'FINISH!', 'powerup');
          if (c.human && typeof config.onFinish === 'function') {
            config.onFinish({ player: c.id, time: raceTime, score: c.score }, api);
            if (c.human) c.score = api.getScore(c.id);
          }
          break;
        }
        if (c.human) announce(api, c.lap === laps - 1 ? 'FINAL LAP!' : 'LAP ' + (c.lap + 1), 'coin');
      }
    }
  }
  function drive(c, dt, api) {
    const seg = segmentAt(c.distance);
    let turn, gas, brake, drift;
    if (c.human) {
      turn = (api.btn('right', c.id) ? 1 : 0) - (api.btn('left', c.id) ? 1 : 0);
      gas = api.btn('a', c.id) || api.btn('up', c.id);
      brake = api.btn('down', c.id);
      drift = api.btn('b', c.id);
    } else {
      // Steering and throttle use the same physics as people. No hidden teleports.
      const ahead = segmentAt(c.distance + 420);
      const desired = Math.sin(raceTime * 0.52 + c.aiPhase) * 0.34 - ahead.curve * 0.12;
      const avoidance = racers.reduce((a, r) => {
        const gap = r.distance - c.distance;
        return gap > 0 && gap < 180 && Math.abs(r.x - c.x) < 0.34 ? a + (c.x > r.x ? 0.55 : -0.55) : a;
      }, 0);
      turn = clamp((desired - c.x) * 2.2 + seg.curve * 0.60 + avoidance, -1, 1);
      const target = 1020 + level * 190 - Math.abs(ahead.curve) * (150 - level * 45) + Math.sin(c.aiPhase) * 55;
      gas = c.speed < target; brake = c.speed > target + 90;
      drift = Math.abs(seg.curve) > 0.55 && c.speed > 700 && Math.sin(raceTime * 1.6 + c.aiPhase) > 0.05;
    }
    if (c.finishTime !== null) { gas = false; brake = true; turn = -c.x; drift = false; }
    c.brakeLamp = brake || drift; c.rev = gas ? 1 : 0; c.preDrift = 0;
    c.invulnerable = Math.max(0, c.invulnerable - dt);
    c.crash = Math.max(0, c.crash - dt);
    c.boost = Math.max(0, c.boost - dt);
    c.steer = lerp(c.steer, turn, Math.min(1, dt * 8));
    const offroad = Math.abs(c.x) > 1;
    const maxSpeed = c.boost > 0 ? 1550 : 1220;
    c.speed += (gas ? 540 : -185) * dt;
    if (brake) c.speed -= 1050 * dt;
    if (offroad) c.speed -= (c.speed > 400 ? 1600 : 140) * dt;
    if (c.crash > 0) c.speed -= 750 * dt;
    if (c.boost > 0 && !offroad) c.speed += 900 * dt;
    c.speed = clamp(c.speed, 0, offroad ? 520 : maxSpeed);
    const ratio = c.speed / 1220;
    const drifting = drift && Math.abs(turn) > 0.15 && c.speed > 540 && !offroad && c.crash <= 0;
    if (drifting) {
      c.drift += dt * (0.65 + Math.abs(seg.curve) * 0.85); c.drift = Math.min(2, c.drift);
      c.driftSide = Math.sign(turn);
    }
    if (!drift && c.driftHeld) {
      if (c.drift >= 0.55 && !offroad && c.crash <= 0) {
        c.boost = Math.max(c.boost, 0.6 + c.drift * 0.55); stats.driftBoosts++;
        if (c.human) { c.score += 40; api.score(c.score, c.id); api.sfx('powerup'); }
      }
      c.drift = 0; c.driftSide = 0;
    }
    if (offroad || c.crash > 0) c.drift = Math.max(0, c.drift - dt * 3);
    c.driftHeld = drift;
    c.x += ((c.crash > 0 ? c.steer * 0.2 : c.steer * (drifting ? 1.9 : 1.55)) * Math.min(1, ratio * 1.7)
      - seg.curve * ratio * ratio * (drifting ? 1.00 : 0.91)) * dt;
    if (Math.abs(c.x) > 1.65) { c.x = clamp(c.x, -1.65, 1.65); c.speed = Math.min(260, c.speed); }
    if (drifting && frames % 4 === 0) c.skid.push({distance:c.distance, x:c.x, life:0.8});
    c.skid = c.skid.filter(mark => (mark.life -= dt) > 0);
    const old = c.distance;
    // Distance and all checkpoint gates are in the same physical track coordinates.
    c.distance += c.speed * dt;
    if (seg.boost && Math.abs(c.x) < 0.35 && c.padSegment !== seg.index && c.speed > 250) {
      c.padSegment = seg.index; c.boost = 1.1; stats.padBoosts++;
      if (c.human) { c.score += 25; api.score(c.score, c.id); api.sfx('powerup'); }
    } else if (!seg.boost) c.padSegment = -1;
    updateCheckpoints(c, old, api);
  }
  function collideRacers(api) {
    for (let i = 0; i < racers.length; i++) for (let j = i + 1; j < racers.length; j++) {
      const a = racers[i], b = racers[j];
      const gap = a.distance - b.distance;
      if (Math.abs(gap) > 90 || Math.abs(a.x - b.x) > 0.30 || a.invulnerable > 0 || b.invulnerable > 0) continue;
      const rear = gap < 0 ? a : b, front = rear === a ? b : a;
      const impact = Math.max(0, rear.speed - front.speed);
      if (impact < 40 && Math.abs(gap) > 45) continue;
      const dir = a.x <= b.x ? -1 : 1;
      a.x += dir * 0.13; b.x -= dir * 0.13;
      rear.speed *= 0.64; front.speed *= 0.92;
      a.invulnerable = b.invulnerable = 0.7;
      if (impact > 390) rear.crash = 0.65;
      stats.collisions++;
      if (a.human || b.human) api.sfx('hit');
    }
  }
  function update(api, dt) {
    dt = clamp(dt || 1 / 60, 1 / 240, 0.05); frames++;
    messageT = Math.max(0, messageT - dt);
    if (finished) return;
    if (countdown > 0) {
      // The race is held on the grid, but steering, handbrake lamps and engine revs respond immediately.
      for (const c of racers.filter(r=>r.human)) {
        const turn = (api.btn('right', c.id) ? 1 : 0) - (api.btn('left', c.id) ? 1 : 0);
        const gas = api.btn('a', c.id) || api.btn('up', c.id);
        c.steer = lerp(c.steer, turn, Math.min(1, dt * 8));
        c.rev = lerp(c.rev, gas ? 1 : 0, Math.min(1, dt * 5));
        c.preDrift = lerp(c.preDrift, api.btn('b', c.id) ? 1 : 0, Math.min(1, dt * 9));
        c.brakeLamp = api.btn('down', c.id) || api.btn('b', c.id);
        if (gas && frames % 15 === 0) api.tone(80 + c.rev * 110, 45, 'saw');
      }
      const before = Math.ceil(countdown); countdown = Math.max(0, countdown - dt);
      if (Math.ceil(countdown) !== before) api.tone(countdown === 0 ? 880 : 440, 100);
      return;
    }
    raceTime += dt;
    for (const c of racers) drive(c, dt, api);
    collideRacers(api);
    worldHeading += segmentAt(racers[0].distance).curve * racers[0].speed * dt * 0.014;
    ordered = racers.slice().sort((a, b) => {
      if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
      if (a.finishTime !== null) return -1;
      if (b.finishTime !== null) return 1;
      return b.distance - a.distance;
    });
    const completed = racers.filter(c => c.human && c.finishTime !== null);
    if (completed.length > 0 && finishDelay === 0) { finishDelay = 2.0; winner = completed.sort((a,b)=>a.finishTime-b.finishTime)[0].id; }
    if (finishDelay > 0) {
      finishDelay -= dt;
      if (finishDelay <= 0) {
        finished = true;
        if (humanCount === 2) api.win(winner);
        else if (ordered[0].id === 0) api.win(); else api.gameOver();
      }
    } else if (raceTime >= limit) { finished = true; if (humanCount === 2) api.win(ordered.find(c=>c.human).id); else api.gameOver(); }
  }

  // Viewport-clipped drawing makes both simultaneous 2P cameras independent.
  function painter(api, view) {
    const top = view.y, bottom = view.y + view.h;
    return {
      rect(x,y,w,h,c) { const y1=Math.max(top,Math.floor(y)), y2=Math.min(bottom,Math.ceil(y+h)); if(y2>y1)api.rectfill(x,y1,w,y2-y1,c); },
      ink(x,y,w,h,color) {
        const left=Math.max(0,Math.floor(x)),right=Math.min(256,Math.ceil(x+w));
        const y1=Math.max(top,Math.floor(y)),y2=Math.min(bottom,Math.ceil(y+h));
        if(right<=left||y2<=y1)return;
        const key=color+':'+(right-left)+':'+(y2-y1);
        let rows=sceneryRasters.get(key);
        if(!rows){rows=Array(y2-y1).fill(color.toString(16).repeat(right-left));if(sceneryRasters.size>=512)sceneryRasters.delete(sceneryRasters.keys().next().value);sceneryRasters.set(key,rows);}
        api.spr(rows,left,y1,false,false,sceneryPalette);
      },
      line(x1,y1,x2,y2,c) { if(y1>=top&&y1<bottom&&y2>=top&&y2<bottom)api.line(x1,y1,x2,y2,c); },
      text(str,x,y,c=7) { if(y>=top&&y+7<=bottom)api.text(str,x,y,c); },
      dot(x,y,c) { if(y>=top&&y<bottom)api.pset(x,y,c); },
      sprite(raster,x,y,palette) {
        if(y>=top&&y+raster.pixels.length<=bottom){api.spr(raster.pixels,x,y,false,false,palette);return;}
        // Reuse cached one-row arrays when a sprite crosses a viewport edge. Never paint into the other player's camera/HUD.
        for(let row=Math.max(0,top-y);row<Math.min(raster.rows.length,bottom-y);row++)api.spr(raster.rows[row],x,y+row,false,false,palette);
      },
    };
  }
  function scene(api, c, view) {
    const p = painter(api, view), h = view.h, y0 = view.y, split = humanCount === 2;
    const horizon = y0 + Math.floor(h * (split ? 0.34 : 0.36));
    const camera = c.distance;
    const bend = [], rate = []; let x = 0, dx = 0;
    for (let n = 0; n < 96; n++) { bend.push(x); rate.push(dx); dx += segmentAt(camera+n*STEP).curve * 7.0; x += dx; }
    const focal = split ? 75 : 105;
    const camHeight = split ? 39 : 57;
    const cameraDistance = focal * camHeight;
    const projection = distance => {
      const idx = clamp(distance/STEP, 0, bend.length-2), n=Math.floor(idx);
      const scale=focal/Math.max(20,distance), curveX=lerp(bend[n],bend[n+1],idx-n);
      return {x:128+(curveX-c.x*70)*scale, y:horizon+cameraDistance/Math.max(20,distance), half:70*scale, scale};
    };
    p.ink(0,y0,256,h,0);
    for(let band=0;band<6;band++)p.ink(0,y0+band*(horizon-y0)/6,256,(horizon-y0)/6+1,Math.min(2,Math.floor(band/2)));
    // Layered island silhouettes move much more slowly than the road.
    p.ink(0,horizon-8,256,9,6);
    const mountainShift = worldHeading * 0.35;
    for(let xx=0;xx<256;xx++) {
      const ridge=10+Math.sin((xx+mountainShift)*0.024)*8+Math.sin((xx+mountainShift)*0.049+1)*5;
      p.ink(xx,horizon-ridge-8,1,ridge,6);
      const far=7+Math.sin((xx+mountainShift*0.4)*0.036+4)*5;
      p.ink(xx,horizon-far-8,1,far,7);
    }
    // Small clouds/sun, sea strips and horizon glints give depth without bitmap backgrounds.
    for(let i=0;i<4;i++) {
      const cloudX=mod(i*83-worldHeading*0.18,330)-35;
      const cy=y0+12+(i%2)*12;
      p.ink(cloudX,cy,29,4,2);p.ink(cloudX+4,cy-3,22,6,3);p.ink(cloudX+9,cy-6,13,4,3);
    }
    p.rect(174,y0+19,13,12,10);p.rect(177,y0+16,7,3,10);
    p.ink(0,horizon-8,256,8,5);
    for(let i=0;i<12;i++){const gx=mod(i*41+frames*0.07,256);p.rect(gx,horizon-5+i%3,5,1,night?13:7);}
    // Each scanline samples actual track distance: curves, lane markings and pads approach naturally.
    for(let yy=horizon+1;yy<y0+h;yy++) {
      const z=cameraDistance/(yy-horizon), q=projection(z), seg=segmentAt(camera+z);
      const band=Math.floor((camera+z)/160)%2;
      p.ink(0,yy,256,1,seg.scenery==='beach'?14:(band?8:9));
      if(seg.scenery==='beach'){p.ink(0,yy,Math.max(0,q.x-q.half*1.65),1,4);p.ink(q.x-q.half*1.65,yy,q.half*.10,1,5);}
      const curb=Math.max(1,q.half*0.11), edge=q.x-q.half;
      p.ink(edge-curb*1.5,yy,q.half*2+curb*3,1,14);
      p.ink(edge-curb,yy,q.half*2+curb*2,1,band?13:12);
      p.ink(edge,yy,q.half*2,1,band?10:11);
      p.ink(edge+1,yy,Math.max(1,q.half*.012),1,13);
      p.ink(q.x+q.half-2,yy,Math.max(1,q.half*.012),1,13);
      if(Math.floor((camera+z)/105)%3!==0) {
        p.ink(q.x-q.half/3,yy,Math.max(1,q.half*0.018),1,13);
        p.ink(q.x+q.half/3,yy,Math.max(1,q.half*0.018),1,13);
      }
      const startDistance=mod(camera+z,length);
      if(startDistance<96) {
        const cells=12,cell=q.half*2/cells;
        for(let xx=0;xx<cells;xx++)p.rect(edge+xx*cell,yy,cell+1,1,(xx+Math.floor(startDistance/24))%2?7:0);
      }
      if(seg.boost) {
        const center=q.x,ww=q.half*0.34;
        p.rect(center-ww,yy,ww*2,1,9);
        const stripe=Math.floor((camera+z)/12)%2;
        if(stripe)p.rect(center-ww*0.72,yy,ww*1.44,1,10);
      }
    }
    // Decor and competitors sorted far-to-near, sharing the same perspective.
    const objects=[];
    for(let n=1;n<67;n++) {
      const z=n*STEP-mod(camera,STEP),seg=segmentAt(camera+z);
      if(z<25)continue;
      if(seg.palm) objects.push({kind:seg.scenery==='cliffs'?'rock':seg.scenery==='harbor'?'warehouse':'palm',z,lane:n%2?1.65:-1.65,seg});
      if(seg.index%8===0)for(const lane of [-1.25,1.25])objects.push({kind:'post',z,lane,seg});
      if(seg.index%47===10)objects.push({kind:'beacon',z,lane:-2.1,seg});
      if(seg.sign) objects.push({kind:'sign',z,lane:seg.curve>0?-1.2:1.2,seg});
      if(seg.index%19===7)objects.push({kind:'billboard',z,lane:seg.index%2?1.8:-1.8,seg});
    }
    for(const other of racers) {
      if(other.id===c.id)continue;
      const gap=mod(other.distance-camera,length);
      if(gap>35&&gap<3200)objects.push({kind:'kart',z:gap,lane:other.x,c:other});
    }
    objects.sort((a,b)=>b.z-a.z);
    for(const obj of objects) {
      const q=projection(obj.z),sx=q.x+q.half*obj.lane,sy=q.y;
      if(sy>=y0+h||sy<horizon)continue;
      if(obj.kind==='kart'){drawKart(p,obj.c,sx,sy,clamp(q.scale*0.9,0.13,1.2));continue;}
      const scale=clamp(q.scale,0.06,1.6);
      if(roadsideArt[obj.kind]){drawCustom(p,roadsideArt[obj.kind],'idle',sx,sy,scale,frames*1000/60);continue;}
      if(obj.kind==='post'){
        p.ink(sx,sy-18*scale,Math.max(1,3*scale),18*scale,13);p.ink(sx,sy-15*scale,Math.max(1,3*scale),5*scale,12);
      }else if(obj.kind==='rock'){
        for(let row=0;row<25;row++){const half=(8+row*.6)*scale;p.ink(sx-half,sy-(25-row)*scale,half*2,Math.max(1,scale),row<4?13:6);p.ink(sx+half*.1,sy-(25-row)*scale,half*.8,Math.max(1,scale),15);}
      }else if(obj.kind==='warehouse'){
        p.ink(sx-26*scale,sy-29*scale,52*scale,29*scale,6);p.ink(sx-29*scale,sy-33*scale,58*scale,6*scale,15);
        p.ink(sx-22*scale,sy-23*scale,17*scale,23*scale,15);p.ink(sx+3*scale,sy-23*scale,17*scale,23*scale,15);
        for(let row=0;row<4;row++)p.ink(sx-23*scale,sy-(21-row*5)*scale,44*scale,scale,7);
      }else if(obj.kind==='beacon'){
        for(let row=0;row<7;row++){const width=(8+row)*scale;p.ink(sx-width/2,sy-(70-row*10)*scale,width,10*scale,row%2?12:13);}
        p.ink(sx-8*scale,sy-76*scale,16*scale,7*scale,15);p.ink(sx-6*scale,sy-73*scale,12*scale,4*scale,3);
      }else if(obj.kind==='palm') {
        const ht=74*scale,w=Math.max(1,5*scale);
        p.rect(sx,sy-ht,w,ht,4);p.rect(sx+w,sy-ht,w*0.45,ht,9);
        const cy=sy-ht,leaf=34*scale;
        for(let fringe=0;fringe<Math.max(1,5*scale);fringe++){
          p.line(sx-leaf,cy+leaf*0.35,sx,cy-3+fringe,3);p.line(sx,cy-3+fringe,sx+leaf,cy+leaf*0.3,3);
          p.line(sx-leaf*0.7,cy-leaf*0.25,sx,cy+fringe,11);p.line(sx,cy+fringe,sx+leaf*0.7,cy-leaf*0.25,11);
        }
        p.line(sx-leaf*0.7,cy-leaf*0.25,sx+leaf*0.7,cy+leaf*0.3,11);
        p.line(sx-leaf*0.8,cy+leaf*0.35,sx+leaf*0.75,cy-leaf*0.25,11);
        p.rect(sx-2*scale,cy,6*scale,6*scale,9);
      } else if(obj.kind==='sign') {
        const ww=29*scale,hh=19*scale,top=sy-45*scale;
        p.rect(sx-ww/2+2,top+hh,Math.max(1,3*scale),26*scale,6);
        p.rect(sx-ww/2,top,ww,hh,0);p.rect(sx-ww/2+scale,top+scale,ww-2*scale,hh-2*scale,10);
        const dir=obj.seg.curve>0?1:-1;
        p.line(sx-dir*6*scale,top+4*scale,sx+dir*3*scale,top+9*scale,0);
        p.line(sx+dir*3*scale,top+9*scale,sx-dir*6*scale,top+14*scale,0);
      } else {
        const ww=62*scale,top=sy-42*scale;
        p.rect(sx-ww/2+3,top+19*scale,2*scale,23*scale,6);
        p.rect(sx+ww/2-5,top+19*scale,2*scale,23*scale,6);
        p.rect(sx-ww/2,top,ww,20*scale,7);p.rect(sx-ww/2+2,top+2,ww-4,16*scale,8);
        if(scale>0.65)p.text('TURBO',sx-20,top+5*scale,7);
      }
    }
    const playerScale=split?0.87:1.55,baseY=y0+h-(split?4:5);
    if(c.speed>550&&(Math.abs(c.x)>1||c.drift>0)) {
      const spark=c.drift>=1.2?12:c.drift>=0.55?10:6;
      for(let i=0;i<6;i++){const tx=128+(i%2?1:-1)*(17+i*2)*playerScale,ty=baseY-5-i%3*4; p.rect(tx+Math.sin(frames+i)*3,ty,2,2,Math.abs(c.x)>1?15:spark);}
    }
    if(c.boost>0) {
      for(let i=0;i<5;i++){const bx=i%2?238-i*8:18+i*7;p.line(bx,y0+h*0.65,bx+(bx<128?-6:6),y0+h*0.65+13+i*3,7);}
    }
    // Foreground kart sits on the road, not on a separate HUD panel.
    drawKart(p,c,128+c.steer*5,baseY,playerScale);
    hud(p,c,view,api);
    if(countdown>0) {
      const txt=String(Math.ceil(countdown));p.rect(116,horizon-3,24,20,0);
      p.text(txt,124,horizon+4,10);
    } else if(raceTime<0.8){p.rect(109,horizon-3,40,16,0);p.text('GO!',117,horizon+2,11);}
    if(c.finishTime!==null){p.rect(87,horizon-3,82,15,0);p.text('FINISH!',100,horizon+1,10);}
  }
  function animation(c) {
    if(c.crash>0)return 'crash';
    if(c.boost>0)return 'boost';
    if(c.drift>0.05&&c.driftHeld)return c.driftSide<0?'driftLeft':'driftRight';
    if(c.preDrift>0.1&&Math.abs(c.steer)>0.18)return c.steer<0?'driftLeft':'driftRight';
    if(c.steer<-0.18)return 'steerLeft';if(c.steer>0.18)return 'steerRight';
    return c.speed>40||c.rev>0.1?'drive':'idle';
  }
  function drawKart(p,c,cx,base,scale) {
    if(c.art){const pose=animation(c);drawCustom(p,c.art,pose,cx,base,scale,pose==='crash'?(0.65-c.crash)*1000:frames*1000/60,pose==='crash');return;}
    const state=animation(c),clip=ART.animations[state];
    const key=clip.frames[Math.floor(frames*1000/60/clip.frameMs)%clip.frames.length];
    const f=allFrames[key];
    const ox=cx-f.anchor.x*scale,oy=base-f.anchor.y*scale;
    p.rect(cx-13*scale,base-2*scale,26*scale,3*scale,0);
    for(let y=0;y<ART.height;y++)for(let x=0;x<ART.width;x++){
      const ch=f.pixels[y][x]; if(ch==='.')continue;
      let color=Number.parseInt(ch,16);
      if(ch==='8')color=c.body;if(ch==='a')color=c.helmet;
      if(c.brakeLamp&&y>=24&&y<26&&((x>=6&&x<10)||(x>=22&&x<26)))color=8;
      p.rect(Math.floor(ox+x*scale),Math.floor(oy+y*scale),Math.max(1,Math.ceil(scale)),Math.max(1,Math.ceil(scale)),color);
    }
  }
  function hud(p,c,view,api) {
    const split=humanCount===2,y=view.y,rank=ordered.findIndex(r=>r.id===c.id)+1;
    p.rect(0,y,256,11,0);
    p.text('P'+(c.id+1)+' '+rank+'/6',3,y+2,c.id===0?12:8);
    p.text('L'+Math.min(laps,c.lap+1)+'/'+laps,99,y+2,7);
    const remaining=Math.max(0,Math.ceil(limit-raceTime));
    p.text(String(remaining)+'S',213,y+2,remaining<20?8:10);
    // Read actual ahead-track curvature early enough to prepare in a short split view.
    if(countdown<=0&&c.finishTime===null){
      let bend=0,metres=0;
      for(let ahead=160;ahead<=Math.max(900,c.speed*1.6);ahead+=160){const curve=segmentAt(c.distance+ahead).curve;if(Math.abs(curve)>.45){bend=curve;metres=ahead;break;}}
      if(bend&&Math.abs(segmentAt(c.distance).curve)<.3){
        const label=(bend<0?'<< ':'>> ')+(metres<700?'TURN':'BEND');
        p.rect(99,y+14,60,11,0);p.text(label,103,y+16,metres<700?10:7);
      }
    }
    // Speed and drift charge are short, legible labels on both cameras.
    const speed=Math.floor(c.speed/7.5),speedY=y+view.h-(split?13:17);
    if(countdown>0&&c.rev>0.02) {
      p.rect(59,speedY+5-c.rev*9,3,c.rev*9,10);
      p.rect(63,speedY+5-c.rev*6,3,c.rev*6,9);
    }
    p.rect(2,speedY-2,54,14,0);p.text(String(speed).padStart(3,'0'),4,speedY,7);p.text('K',30,speedY,6);
    p.rect(190,speedY-2,64,14,0);p.text(c.boost>0?'BOOST':'DRIFT',192,speedY,c.boost>0?10:7);
    p.rect(192,speedY+9,58,2,5);p.rect(192,speedY+9,58*(c.boost>0?Math.min(1,c.boost/1.7):c.drift/2),2,c.drift>=0.55?10:12);
    if(!split) {
      // Compact progress loop: dots are ordered by race distance, independent of camera.
      const mx=224,my=y+40,rx=23,ry=17;
      p.rect(197,y+20,58,41,1);
      for(let i=0;i<48;i++){const t=i/48*Math.PI*2;p.dot(mx+Math.sin(t)*rx,my-Math.cos(t)*ry,7);}
      for(const r of racers){const t=mod(r.distance,length)/length*Math.PI*2;p.rect(mx+Math.sin(t)*rx-1,my-Math.cos(t)*ry-1,3,3,r.id===c.id?10:r.body);}
      if(messageT>0)p.text(message,(256-api.textWidth(message))/2,y+15,10);
      if(countdown>0){p.rect(23,y+view.h-57,210,13,0);p.text('A:GAS B:DRIFT DOWN:BRAKE',27,y+view.h-54,7);}
    }
  }
  function draw(api) {
    api.cls(0);
    if(humanCount===2){scene(api,racers[0],{y:12,h:105});scene(api,racers[1],{y:119,h:105});api.rectfill(0,117,256,2,7);}
    else scene(api,racers[0],{y:12,h:212});
  }
  function inspect() {
    return { phase:finished?'finished':countdown>0?'countdown':'racing', countdown, time:raceTime, trackLength:length,
      laps, timeLimit:limit, winner, stats:{...stats}, checkpoints:checkpointPositions.slice(),
      racers:racers.map(c=>({id:c.id,human:c.human,x:c.x,speed:c.speed,distance:c.distance,lap:c.lap,
        checkpoint:c.checkpoint,boost:c.boost,drift:c.drift,crash:c.crash,score:c.score,finishTime:c.finishTime,
        pose:animation(c),curve:segmentAt(c.distance).curve})),
      positions:ordered.map(c=>c.id),
    };
  }
  return { init, update, draw, inspect };
});
const CONFIG={};
let game;
function init(api){game=FACTORY(CONFIG);game.init(api)}
function update(api,dt){game.update(api,dt)}
function draw(api){game.draw(api)}
