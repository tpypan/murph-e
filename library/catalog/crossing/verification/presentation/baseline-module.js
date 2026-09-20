(function(){const CROSSING_ASSETS={"schemaVersion":1,"fps":60,"palette":"pico8-16","coordinates":"center anchors; collision geometry relative to center","frames":{"frog-0-up-0":{"pixels":["................","................","...b0b....b0b...","...b7bbbbbb7b...","...bbbbbbbbbb...","..bbbbbbbbbbbb..","..bbbbccccbbbb..","..bbbbccccbbbb..","....3bccccb3....","....3bccccb3....","..333333333333..","..333333333333..","..3b33....33b3..","................","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-up-1":{"pixels":["................","................","...b0b....b0b...",".bbb7bbbbbb7bbb.",".bbbbbbbbbbbbbb.","...bbbbbbbbbb...","....3bccccb3....","....3bccccb3....","....3bccccb3....","....3bccccb3....","....33333333....","....33333333....","..bbb......bbb..","..bbb......bbb..","..bbb......bbb..","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-up-2":{"pixels":["................","................","...b0b....b0b...","...b7bbbbbb7b...","...bbbbbbbbbb...","...bbbbbbbbbb...","....3bccccb3....","..bbbbccccbbbb..","..bbbbccccbbbb..","..bbbbccccbbbb..","..333333333333..","..333333333333..","..3b33....33b3..","................","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-right-0":{"pixels":["................","................","...333..bbb.....","...b33..bbbbbb..","...33333bbbb70..","...333bbbbbbbb..","....33ccccbbb...","....33ccccbbb...","....33ccccbbb...","....33ccccbbb...","...333bbbbbbbb..","...33333bbbb70..","...b33..bbbbbb..","...333..bbb.....","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-right-1":{"pixels":["................","...........bb...",".bbb.......bb...",".bbb......bbbb..",".bbb333333bb70..","....33bbbbbbbb..","....33ccccbbb...","....33ccccbbb...","....33ccccbbb...","....33ccccbbb...","....33bbbbbbbb..",".bbb333333bb70..",".bbb......bbbb..",".bbb.......bb...","...........bb...","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-right-2":{"pixels":["................","................","...333bbb.......","...b33bbb.bbbb..","...333bbb3bb70..","...333bbbbbbbb..","....33ccccbbb...","....33ccccbbb...","....33ccccbbb...","....33ccccbbb...","...333bbbbbbbb..","...333bbb3bb70..","...b33bbb.bbbb..","...333bbb.......","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-down-0":{"pixels":["................","................","................","..3b33....33b3..","..333333333333..","..333333333333..","....3bccccb3....","....3bccccb3....","..bbbbccccbbbb..","..bbbbccccbbbb..","..bbbbbbbbbbbb..","...bbbbbbbbbb...","...b7bbbbbb7b...","...b0b....b0b...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-down-1":{"pixels":["................","..bbb......bbb..","..bbb......bbb..","..bbb......bbb..","....33333333....","....33333333....","....3bccccb3....","....3bccccb3....","....3bccccb3....","....3bccccb3....","...bbbbbbbbbb...",".bbbbbbbbbbbbbb.",".bbb7bbbbbb7bbb.","...b0b....b0b...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-down-2":{"pixels":["................","................","................","..3b33....33b3..","..333333333333..","..333333333333..","..bbbbccccbbbb..","..bbbbccccbbbb..","..bbbbccccbbbb..","....3bccccb3....","...bbbbbbbbbb...","...bbbbbbbbbb...","...b7bbbbbb7b...","...b0b....b0b...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-left-0":{"pixels":["................","................",".....bbb..333...","..bbbbbb..33b...","..07bbbb33333...","..bbbbbbbb333...","...bbbcccc33....","...bbbcccc33....","...bbbcccc33....","...bbbcccc33....","..bbbbbbbb333...","..07bbbb33333...","..bbbbbb..33b...",".....bbb..333...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-left-1":{"pixels":["................","...bb...........","...bb.......bbb.","..bbbb......bbb.","..07bb333333bbb.","..bbbbbbbb33....","...bbbcccc33....","...bbbcccc33....","...bbbcccc33....","...bbbcccc33....","..bbbbbbbb33....","..07bb333333bbb.","..bbbb......bbb.","...bb.......bbb.","...bb...........","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-0-left-2":{"pixels":["................","................",".......bbb333...","..bbbb.bbb33b...","..07bb3bbb333...","..bbbbbbbb333...","...bbbcccc33....","...bbbcccc33....","...bbbcccc33....","...bbbcccc33....","..bbbbbbbb333...","..07bb3bbb333...","..bbbb.bbb33b...",".......bbb333...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-up-0":{"pixels":["................","................","...b0b....b0b...","...b7bbbbbb7b...","...bbbbbbbbbb...","..bbbbbbbbbbbb..","..bbbb8888bbbb..","..bbbb8888bbbb..","....3b8888b3....","....3b8888b3....","..333333333333..","..333333333333..","..3b33....33b3..","................","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-up-1":{"pixels":["................","................","...b0b....b0b...",".bbb7bbbbbb7bbb.",".bbbbbbbbbbbbbb.","...bbbbbbbbbb...","....3b8888b3....","....3b8888b3....","....3b8888b3....","....3b8888b3....","....33333333....","....33333333....","..bbb......bbb..","..bbb......bbb..","..bbb......bbb..","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-up-2":{"pixels":["................","................","...b0b....b0b...","...b7bbbbbb7b...","...bbbbbbbbbb...","...bbbbbbbbbb...","....3b8888b3....","..bbbb8888bbbb..","..bbbb8888bbbb..","..bbbb8888bbbb..","..333333333333..","..333333333333..","..3b33....33b3..","................","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-right-0":{"pixels":["................","................","...333..bbb.....","...b33..bbbbbb..","...33333bbbb70..","...333bbbbbbbb..","....338888bbb...","....338888bbb...","....338888bbb...","....338888bbb...","...333bbbbbbbb..","...33333bbbb70..","...b33..bbbbbb..","...333..bbb.....","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-right-1":{"pixels":["................","...........bb...",".bbb.......bb...",".bbb......bbbb..",".bbb333333bb70..","....33bbbbbbbb..","....338888bbb...","....338888bbb...","....338888bbb...","....338888bbb...","....33bbbbbbbb..",".bbb333333bb70..",".bbb......bbbb..",".bbb.......bb...","...........bb...","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-right-2":{"pixels":["................","................","...333bbb.......","...b33bbb.bbbb..","...333bbb3bb70..","...333bbbbbbbb..","....338888bbb...","....338888bbb...","....338888bbb...","....338888bbb...","...333bbbbbbbb..","...333bbb3bb70..","...b33bbb.bbbb..","...333bbb.......","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-down-0":{"pixels":["................","................","................","..3b33....33b3..","..333333333333..","..333333333333..","....3b8888b3....","....3b8888b3....","..bbbb8888bbbb..","..bbbb8888bbbb..","..bbbbbbbbbbbb..","...bbbbbbbbbb...","...b7bbbbbb7b...","...b0b....b0b...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-down-1":{"pixels":["................","..bbb......bbb..","..bbb......bbb..","..bbb......bbb..","....33333333....","....33333333....","....3b8888b3....","....3b8888b3....","....3b8888b3....","....3b8888b3....","...bbbbbbbbbb...",".bbbbbbbbbbbbbb.",".bbb7bbbbbb7bbb.","...b0b....b0b...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-down-2":{"pixels":["................","................","................","..3b33....33b3..","..333333333333..","..333333333333..","..bbbb8888bbbb..","..bbbb8888bbbb..","..bbbb8888bbbb..","....3b8888b3....","...bbbbbbbbbb...","...bbbbbbbbbb...","...b7bbbbbb7b...","...b0b....b0b...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-left-0":{"pixels":["................","................",".....bbb..333...","..bbbbbb..33b...","..07bbbb33333...","..bbbbbbbb333...","...bbb888833....","...bbb888833....","...bbb888833....","...bbb888833....","..bbbbbbbb333...","..07bbbb33333...","..bbbbbb..33b...",".....bbb..333...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-left-1":{"pixels":["................","...bb...........","...bb.......bbb.","..bbbb......bbb.","..07bb333333bbb.","..bbbbbbbb33....","...bbb888833....","...bbb888833....","...bbb888833....","...bbb888833....","..bbbbbbbb33....","..07bb333333bbb.","..bbbb......bbb.","...bb.......bbb.","...bb...........","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"frog-1-left-2":{"pixels":["................","................",".......bbb333...","..bbbb.bbb33b...","..07bb3bbb333...","..bbbbbbbb333...","...bbb888833....","...bbb888833....","...bbb888833....","...bbb888833....","..bbbbbbbb333...","..07bb3bbb333...","..bbbb.bbb33b...",".......bbb333...","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},"car-0-0":{"pixels":["............................",".....06000.........00000....","..111000001111111110000011..","..1888881111111111888888aa..",".66778881cc77777c1888888aa6.",".66888881cccccccc1888888866.",".66888881cccccccc1888888866.",".66888881cccccccc1888888866.",".66888881cccccccc1888888866.",".66778881cccccccc1888888aa6.","..1888881111111111888888aa..","..111000001111111110000011..",".....00000.........06000....","............................"],"size":{"w":28,"h":14},"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},"car-0-1":{"pixels":["............................",".....00600.........00000....","..111000001111111110000011..","..1888881111111111888888aa..",".66778881cc77777c1888888aa6.",".66888881cccccccc1888888866.",".66888881cccccccc1888888866.",".66888881cccccccc1888888866.",".66888881cccccccc1888888866.",".66778881cccccccc1888888aa6.","..1888881111111111888888aa..","..111000001111111110000011..",".....00000.........00600....","............................"],"size":{"w":28,"h":14},"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},"car-1-0":{"pixels":["............................",".....06000.........00000....","..111000001111111110000011..","..1999991111111111999999aa..",".66779991cc77777c1999999aa6.",".66999991cccccccc1999999966.",".66999991cccccccc1999999966.",".66999991cccccccc1999999966.",".66999991cccccccc1999999966.",".66779991cccccccc1999999aa6.","..1999991111111111999999aa..","..111000001111111110000011..",".....00000.........06000....","............................"],"size":{"w":28,"h":14},"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},"car-1-1":{"pixels":["............................",".....00600.........00000....","..111000001111111110000011..","..1999991111111111999999aa..",".66779991cc77777c1999999aa6.",".66999991cccccccc1999999966.",".66999991cccccccc1999999966.",".66999991cccccccc1999999966.",".66999991cccccccc1999999966.",".66779991cccccccc1999999aa6.","..1999991111111111999999aa..","..111000001111111110000011..",".....00000.........00600....","............................"],"size":{"w":28,"h":14},"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},"car-2-0":{"pixels":["............................",".....06000.........00000....","..111000001111111110000011..","..1ccccc1111111111ccccccaa..",".6677ccc1cc77777c1ccccccaa6.",".66ccccc1cccccccc1ccccccc66.",".66ccccc1cccccccc1ccccccc66.",".66ccccc1cccccccc1ccccccc66.",".66ccccc1cccccccc1ccccccc66.",".6677ccc1cccccccc1ccccccaa6.","..1ccccc1111111111ccccccaa..","..111000001111111110000011..",".....00000.........06000....","............................"],"size":{"w":28,"h":14},"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},"car-2-1":{"pixels":["............................",".....00600.........00000....","..111000001111111110000011..","..1ccccc1111111111ccccccaa..",".6677ccc1cc77777c1ccccccaa6.",".66ccccc1cccccccc1ccccccc66.",".66ccccc1cccccccc1ccccccc66.",".66ccccc1cccccccc1ccccccc66.",".66ccccc1cccccccc1ccccccc66.",".6677ccc1cccccccc1ccccccaa6.","..1ccccc1111111111ccccccaa..","..111000001111111110000011..",".....00000.........00600....","............................"],"size":{"w":28,"h":14},"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},"log":{"pixels":["................................................................",".22222222222222222222222222222222222222222222222222222222222222.",".24444444444444444444444444444444444444444444444444444444444442.",".99999999999999999999999999999999999999999999999999999999999999.",".99944444444444444444444444444444444444444444444444444444444999.",".949444422222222444442222222244444222222224444422222222444449992",".94944444444444444444444444444444444444444444444444444444444999.",".94944444444444444444444444444444444444444444444444444444444999.",".949499999999944449999999994444999999999444499999999944449999999",".99944444444444444444444444444444444444444444444444444444444999.",".99955555555555555555555555555555555555555555555555555555555999.",".24555555555555555555555555555555555555555555555555555555555542.",".22222222222222222222222222222222222222222222222222222222222222.","................................................................"],"size":{"w":64,"h":14},"anchor":{"x":32,"y":7},"hitboxes":[{"x":-31,"y":-6,"w":62,"h":12}],"hurtboxes":[{"x":-31,"y":-6,"w":62,"h":12}]},"turtle-0":{"pixels":["......b0b0......","......bbbb......",".....3bbbb3.....","....33333333....","....33b7bb3333..","....33bbbb3333..","....33bbbb3333..","..3333bbbb33....","..3333bbbb33....","..3333333333....","....33333333....",".....333333.....","................","................"],"size":{"w":16,"h":14},"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]},"turtle-1":{"pixels":["......b0b0......","......bbbb......",".....3bbbb3.....","....33333333....","..3333b7bb33....","..3333bbbb33....","..3333bbbb33....","....33bbbb3333..","....33bbbb3333..","....3333333333..","....33333333....",".....333333.....","................","................"],"size":{"w":16,"h":14},"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]},"turtle-2":{"pixels":["......b0b0......","......bbbb......",".....9bbbb9.....","....99999999....","....99b7bb9333..","....99bbbb9333..","....99bbbb9333..","..3339bbbb99....","..3339bbbb99....","..3339999999....","....99999999....",".....999999.....","................","................"],"size":{"w":16,"h":14},"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]},"turtle-3":{"pixels":["......b0b0......","......bbbb......",".....dbbbbd.....","....dddddddd....","..333db7bbdd....","..333dbbbbdd....","..333dbbbbdd....","....ddbbbbd333..","....ddbbbbd333..","....ddddddd333..","....dddddddd....",".....dddddd.....","................","................"],"size":{"w":16,"h":14},"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]},"turtle-4":{"pixels":["................","................","................","......1111......","................","...cccc.........","................",".........cccc...","................","................","................","................","................","................"],"size":{"w":16,"h":14},"anchor":{"x":8,"y":7},"hitboxes":[],"hurtboxes":[]},"splash-0":{"pixels":["................","................","................","................",".......77.......",".....777777.....",".....77..77.....","....77....77....","....77....77....",".....77..77.....",".....777777.....",".......77.......","................","................","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[],"hurtboxes":[]},"splash-1":{"pixels":["................","................",".......cc.......","...cc..cc..cc...","...cc......cc...","................","................","..cc........cc..","..cc........cc..","................","................","...cc......cc...","...cc..cc..cc...",".......cc.......","................","................"],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[],"hurtboxes":[]},"splash-2":{"pixels":[".......cc.......",".......cc.......","..cc........cc..","..cc........cc..","................","................","................","cc............cc","cc............cc","................","................","................","..cc........cc..","..cc........cc..",".......cc.......",".......cc......."],"size":{"w":16,"h":16},"anchor":{"x":8,"y":8},"hitboxes":[],"hurtboxes":[]}},"animations":{"frog-0-up-idle":{"loop":true,"frames":[{"frame":"frog-0-up-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-up-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-up-hop":{"loop":true,"frames":[{"frame":"frog-0-up-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-up-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-right-idle":{"loop":true,"frames":[{"frame":"frog-0-right-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-right-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-right-hop":{"loop":true,"frames":[{"frame":"frog-0-right-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-right-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-down-idle":{"loop":true,"frames":[{"frame":"frog-0-down-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-down-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-down-hop":{"loop":true,"frames":[{"frame":"frog-0-down-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-down-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-left-idle":{"loop":true,"frames":[{"frame":"frog-0-left-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-left-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-0-left-hop":{"loop":true,"frames":[{"frame":"frog-0-left-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-0-left-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-up-idle":{"loop":true,"frames":[{"frame":"frog-1-up-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-up-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-up-hop":{"loop":true,"frames":[{"frame":"frog-1-up-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-up-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-right-idle":{"loop":true,"frames":[{"frame":"frog-1-right-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-right-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-right-hop":{"loop":true,"frames":[{"frame":"frog-1-right-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-right-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-down-idle":{"loop":true,"frames":[{"frame":"frog-1-down-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-down-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-down-hop":{"loop":true,"frames":[{"frame":"frog-1-down-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-down-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-left-idle":{"loop":true,"frames":[{"frame":"frog-1-left-0","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-left-2","duration":18,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"frog-1-left-hop":{"loop":true,"frames":[{"frame":"frog-1-left-1","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]},{"frame":"frog-1-left-2","duration":4,"anchor":{"x":8,"y":8},"hitboxes":[{"x":-5,"y":-5,"w":10,"h":10}],"hurtboxes":[{"x":-5,"y":-5,"w":10,"h":10}]}]},"car-0":{"loop":true,"frames":[{"frame":"car-0-0","duration":6,"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},{"frame":"car-0-1","duration":6,"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]}]},"car-1":{"loop":true,"frames":[{"frame":"car-1-0","duration":6,"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},{"frame":"car-1-1","duration":6,"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]}]},"car-2":{"loop":true,"frames":[{"frame":"car-2-0","duration":6,"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]},{"frame":"car-2-1","duration":6,"anchor":{"x":14,"y":7},"hitboxes":[{"x":-13,"y":-5,"w":26,"h":10}],"hurtboxes":[{"x":-13,"y":-5,"w":26,"h":10}]}]},"log":{"loop":true,"frames":[{"frame":"log","duration":6,"anchor":{"x":32,"y":7},"hitboxes":[{"x":-31,"y":-6,"w":62,"h":12}],"hurtboxes":[{"x":-31,"y":-6,"w":62,"h":12}]}]},"turtle-swim":{"loop":true,"frames":[{"frame":"turtle-0","duration":10,"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]},{"frame":"turtle-1","duration":10,"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]}]},"turtle-warning":{"loop":true,"frames":[{"frame":"turtle-2","duration":6,"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]},{"frame":"turtle-3","duration":6,"anchor":{"x":8,"y":7},"hitboxes":[{"x":-7,"y":-6,"w":14,"h":12}],"hurtboxes":[{"x":-7,"y":-6,"w":14,"h":12}]}]},"turtle-sunk":{"loop":true,"frames":[{"frame":"turtle-4","duration":1,"anchor":{"x":8,"y":7},"hitboxes":[],"hurtboxes":[]}]},"splash":{"loop":true,"frames":[{"frame":"splash-0","duration":8,"anchor":{"x":8,"y":8},"hitboxes":[],"hurtboxes":[]},{"frame":"splash-1","duration":8,"anchor":{"x":8,"y":8},"hitboxes":[],"hurtboxes":[]},{"frame":"splash-2","duration":8,"anchor":{"x":8,"y":8},"hitboxes":[],"hurtboxes":[]}]}},"provenance":{"kind":"original","authors":["Arcade project"],"sources":[],"method":"Original deterministic hand-shaped indexed pixels; no commercial game asset extraction"}};
// biome-ignore lint/correctness/noUnusedVariables: bundled factory entry.
function crossingFactory(config = {}) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    number = (v, f, lo, hi) => clamp(Number.isFinite(v) ? v : f, lo, hi)
  const levels = Math.round(number(config.levels, 3, 1, 8)),
    initialLives = Math.round(number(config.lives, 3, 1, 9)),
    timeLimit = Math.round(number(config.timeLimit, 90, 10, 180)),
    speedFactor = number(config.laneSpeed, 1, 0.25, 2)
  const homes = [40, 88, 136, 184, 216],
    hopFrames = 8,
    dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
  const laneDefinitions = [
    { row: 1, kind: 'turtle', speed: 0.45, bases: [0, 100, 200], width: 48 },
    { row: 2, kind: 'log', speed: -0.6, bases: [0, 96, 192, 288], width: 64 },
    { row: 3, kind: 'turtle', speed: 0.5, bases: [0, 100, 200], width: 48 },
    { row: 4, kind: 'log', speed: -0.45, bases: [0, 96, 192, 288], width: 64 },
    { row: 6, kind: 'car', speed: -0.9, bases: [8, 105, 202], width: 28 },
    { row: 7, kind: 'car', speed: 0.7, bases: [-10, 125, 260], width: 28 },
    { row: 8, kind: 'car', speed: -1.05, bases: [28, 132, 236], width: 28 },
    { row: 9, kind: 'car', speed: 0.85, bases: [0, 110, 220], width: 28 },
  ]
  let players,
    filled,
    reservations,
    level,
    phase,
    phaseAge,
    ticks,
    laneTick,
    timeLeft,
    terminal,
    tieTurn,
    events
  const emit = (api, type, detail = {}) => {
    events.push({ tick: ticks, type, ...detail })
    if (events.length > 300) events.shift()
    if (config.onEvent) config.onEvent(Object.freeze({ ...events[events.length - 1] }), api)
  }
  const sound = (api, name) => {
    if (config.sound !== false) api.sfx(name)
  }
  const spawn = (index, lives = initialLives) => ({
    index,
    x: 24 + 16 * Math.round(number(config.startColumns?.[index], index ? 8 : 6, 0, 13)),
    row: 10,
    y: 196,
    lives,
    hop: null,
    queued: null,
    direction: 'up',
    age: 0,
    wait: 0,
    dying: false,
    bestRow: 10,
    score: 0,
    reserved: -1,
  })
  function resetLevel() {
    filled = homes.map(() => null)
    reservations = homes.map(() => null)
    laneTick = 0
    timeLeft = timeLimit * 60
    phase = 'play'
    phaseAge = 0
    players = players.map((p) => ({ ...spawn(p.index, p.lives), score: p.score }))
    tieTurn = level % 2
  }
  function init(api) {
    ticks = 0
    level = 1
    events = []
    terminal = false
    players = Array.from({ length: api.players === 2 ? 2 : 1 }, (_, i) => spawn(i))
    resetLevel()
    api.score(0)
  }
  function hazards(at = laneTick) {
    const multiplier = Math.min(1.7, 1 + (level - 1) * 0.13) * speedFactor
    return laneDefinitions.flatMap((lane, li) =>
      lane.bases.map((base, id) => {
        const speed = lane.speed * multiplier,
          cycle = (at + id * 83 + lane.row * 17) % 360,
          kind = config.turtles === false && lane.kind === 'turtle' ? 'log' : lane.kind
        return {
          row: lane.row,
          kind,
          id,
          x: 16 + ((((base + at * speed) % 320) + 320) % 320) - 48,
          y: 36 + lane.row * 16,
          width: kind === 'log' ? 64 : lane.width,
          speed,
          base,
          span: 320,
          cycle,
          active: kind !== 'turtle' || cycle < 310,
          warning: kind === 'turtle' && cycle >= 270 && cycle < 310,
          color: li % 3,
        }
      }),
    )
  }
  function frame(id, age) {
    const clip = CROSSING_ASSETS.animations[id],
      total = clip.frames.reduce((s, f) => s + f.duration, 0)
    let t = age % total,
      selected = clip.frames[0]
    for (const f of clip.frames) {
      selected = f
      if (t < f.duration) break
      t -= f.duration
    }
    return CROSSING_ASSETS.frames[selected.frame]
  }
  function addScore(api, p, n) {
    p.score += n
    api.addScore(n, p.index)
  }
  function die(api, p, reason) {
    if (p.wait || p.lives <= 0) return
    p.lives--
    p.wait = 45
    p.dying = true
    p.hop = null
    if (p.reserved >= 0) reservations[p.reserved] = null
    p.reserved = -1
    sound(api, 'die')
    emit(api, 'death', { player: p.index, reason, lives: p.lives })
  }
  function startHop(api, p, direction) {
    const d = dirs[direction],
      row = p.row + d[1],
      x = p.x + d[0] * 16
    if (row < 0 || row > 10 || x < 22 || x > 234) return false
    let home = -1
    if (row === 0) {
      home = homes.findIndex((h) => Math.abs(h - x) < 8)
      if (home < 0) {
        die(api, p, 'missed-home')
        return false
      }
      if (filled[home] !== null || reservations[home] !== null) return false
      reservations[home] = p.index
      p.reserved = home
    }
    p.hop = { fromX: p.x, fromY: p.y, toX: x, toY: 36 + row * 16, toRow: row, age: 0 }
    p.direction = direction
    p.queued = null
    sound(api, 'jump')
    return true
  }
  function updatePlayer(api, p, list) {
    if (p.lives <= 0) return
    p.age++
    if (p.wait > 0) {
      p.wait--
      if (p.wait === 0) {
        const score = p.score,
          lives = p.lives
        Object.assign(p, spawn(p.index, lives), { score })
      }
      return
    }
    let pressed = null
    for (const dir of ['left', 'right', 'down', 'up']) if (api.btnp(dir, p.index)) pressed = dir
    if (pressed) p.queued = pressed
    if (!p.hop) {
      let direction = p.queued
      if (!direction)
        for (const dir of ['left', 'right', 'down', 'up'])
          if (api.btn(dir, p.index)) direction = dir
      if (direction) startHop(api, p, direction)
    }
    if (p.wait) return
    if (p.hop) {
      const h = p.hop
      h.age++
      const t = h.age / hopFrames
      p.x = h.fromX + (h.toX - h.fromX) * t
      p.y = h.fromY + (h.toY - h.fromY) * t
      if (h.age >= hopFrames) {
        p.row = h.toRow
        p.hop = null
        if (p.row < p.bestRow) {
          addScore(api, p, (p.bestRow - p.row) * 10)
          p.bestRow = p.row
        }
        if (p.row === 0) {
          const home = p.reserved
          filled[home] = p.index
          reservations[home] = null
          p.reserved = -1
          addScore(api, p, 200 + Math.ceil(timeLeft / 60))
          emit(api, 'home', {
            player: p.index,
            home,
            filled: filled.filter((x) => x !== null).length,
          })
          sound(api, 'powerup')
          p.wait = 30
          return
        }
      }
    }
    for (const h of list)
      if (h.kind === 'car' && Math.abs(h.y - p.y) < 9 && Math.abs(h.x - p.x) < h.width / 2 + 4) {
        die(api, p, 'traffic')
        return
      }
    if (!p.hop && p.row >= 1 && p.row <= 4) {
      const support = list.find(
        (h) =>
          h.row === p.row && h.kind !== 'car' && h.active && Math.abs(h.x - p.x) < h.width / 2 - 3,
      )
      if (!support) {
        die(api, p, 'water')
        return
      }
      p.x += support.speed
      if (p.x < 22 || p.x > 234) {
        die(api, p, 'carried-off')
        return
      }
    }
  }
  function update(api) {
    if (terminal) return
    ticks++
    phaseAge++
    if (phase === 'clear') {
      if (phaseAge >= 75) {
        if (level >= levels) {
          phase = 'complete'
          terminal = true
          api.win()
        } else {
          level++
          resetLevel()
          emit(api, 'level', { level })
        }
      }
      return
    }
    laneTick++
    timeLeft--
    const list = hazards()
    const ordered = players.length === 2 && tieTurn ? [players[1], players[0]] : players
    for (const p of ordered) updatePlayer(api, p, list)
    if (reservations.some((x) => x !== null)) tieTurn = 1 - tieTurn
    if (timeLeft <= 0) {
      for (const p of players) die(api, p, 'timer')
      timeLeft = timeLimit * 60
    }
    if (players.every((p) => p.lives <= 0)) {
      terminal = true
      phase = 'complete'
      api.gameOver()
      return
    }
    if (filled.every((x) => x !== null)) {
      phase = 'clear'
      phaseAge = 0
      sound(api, 'powerup')
      emit(api, 'level-clear', { level })
    }
  }
  function sprite(api, id, x, y, age = 0, flip = false) {
    const s = frame(id, age)
    api.spr(s.pixels, Math.round(x - s.anchor.x), Math.round(y - s.anchor.y), flip)
  }
  function draw(api) {
    api.cls(0)
    api.rectfill(16, 28, 224, 80, 1)
    for (let row = 1; row <= 4; row++)
      for (let x = 20; x < 240; x += 26) api.line(x, 31 + row * 16, x + 9, 31 + row * 16, 12)
    api.rectfill(16, 108, 224, 16, 3)
    api.rectfill(16, 188, 224, 16, 3)
    for (let x = 18; x < 238; x += 11) {
      api.pset(x, 113, 11)
      api.pset(x + 4, 119, 11)
      api.pset(x + 2, 193, 11)
      api.pset(x + 5, 200, 11)
    }
    api.rectfill(16, 124, 224, 64, 5)
    for (let row = 6; row < 10; row++)
      for (let x = 20; x < 240; x += 24) api.rectfill(x, 43 + row * 16, 12, 1, 6)
    for (const h of hazards()) {
      if (h.kind === 'car') sprite(api, `car-${h.color}`, h.x, h.y, ticks, h.speed < 0)
      else if (h.kind === 'log') sprite(api, 'log', h.x, h.y)
      else
        for (let i = -1; i <= 1; i++)
          sprite(
            api,
            !h.active ? 'turtle-sunk' : h.warning ? 'turtle-warning' : 'turtle-swim',
            h.x + i * 16,
            h.y,
            ticks,
          )
    }
    api.rectfill(0, 12, 16, 212, 0)
    api.rectfill(240, 12, 16, 212, 0)
    for (let i = 0; i < homes.length; i++) {
      const x = homes[i]
      api.rectfill(x - 9, 28, 18, 16, 3)
      api.rectfill(x - 7, 30, 14, 13, 0)
      api.line(x - 7, 30, x + 6, 30, 11)
      if (filled[i] !== null) sprite(api, `frog-${filled[i]}-up-idle`, x, 36, ticks)
      else if (reservations[i] !== null) api.rect(x - 8, 29, 16, 14, reservations[i] ? 8 : 12)
    }
    for (const p of players) {
      if (p.lives <= 0) continue
      if (p.dying && p.wait > 21) {
        sprite(api, 'splash', p.x, p.y, 45 - p.wait)
        continue
      }
      if (p.wait) continue
      sprite(
        api,
        `frog-${p.index}-${p.direction}-${p.hop ? 'hop' : 'idle'}`,
        p.x,
        p.y,
        p.hop ? p.hop.age : p.age,
      )
    }
    api.text(`P1 ${players[0].lives}`, 16, 15, 12)
    api.text(`R${level}`, 112, 15, 7)
    if (players.length === 2) api.text(`P2 ${players[1].lives}`, 200, 15, 8)
    else api.text(`${filled.filter((x) => x !== null).length}/5`, 200, 15, 10)
    api.text('TIME', 80, 211, 6)
    api.text(
      String(Math.max(0, Math.ceil(timeLeft / 60))).padStart(3, '0'),
      120,
      211,
      timeLeft < 600 ? 8 : 10,
    )
    if (phase === 'clear') {
      api.rectfill(65, 108, 126, 16, 0)
      api.textCenter('HOMES SAFE!', 112, 10)
    }
    if (config.drawOverlay) config.drawOverlay(api, { level, filled: [...filled], timeLeft, phase })
  }
  const inspect = () => ({
    level,
    phase,
    ticks,
    laneTick,
    timeLeft,
    terminal,
    filled: [...filled],
    reservations: [...reservations],
    homes: [...homes],
    players: players.map((p) => ({ ...p, hop: p.hop ? { ...p.hop } : null })),
    hazards: hazards(),
    events: events.map((e) => ({ ...e })),
    laneSpeed: speedFactor,
    hopFrames,
  })
  return { init, update, draw, inspect }
}

return crossingFactory;})()