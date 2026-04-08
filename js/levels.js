var LEVELS = [
  // Levels 1-5: 4 colors (easy → medium, wave pattern)
  { emoji: '1f3db', name: 'Classical Building', ammoBuffer: 0, quantizeThreshold: 30 },  // spread 170 - very distinct
  { emoji: '1f526', name: 'Flashlight', ammoBuffer: 0, quantizeThreshold: 30 },          // spread 118
  { emoji: '1f48a', name: 'Pill', ammoBuffer: 0, quantizeThreshold: 30 },                // spread 115
  { emoji: '1f3ba', name: 'Trumpet', ammoBuffer: 0, quantizeThreshold: 30 },             // spread 115 - relief
  { emoji: '1f41b', name: 'Bug', ammoBuffer: 0, quantizeThreshold: 30 },                 // spread 107

  // Levels 6-10: 5 colors (medium, wave pattern)
  { emoji: '1f4a3', name: 'Bomb', ammoBuffer: 0, quantizeThreshold: 30 },                // spread 148 - easy start
  { emoji: '23f3', name: 'Hourglass', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 133
  { emoji: '1f43d', name: 'Pig Nose', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 124
  { emoji: '1f352', name: 'Cherries', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 106 - harder
  { emoji: '1f329', name: 'Lightning', ammoBuffer: 0, quantizeThreshold: 30 },           // spread 146 - relief

  // Levels 11-20: 6 colors (medium-hard, wave)
  { emoji: '1f4b6', name: 'Banknote', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 155 - easy start
  { emoji: '1f3c8', name: 'Football', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 141
  { emoji: '1f9af', name: 'Guide Dog', ammoBuffer: 0, quantizeThreshold: 30 },           // spread 145 - relief
  { emoji: '1f480', name: 'Skull', ammoBuffer: 0, quantizeThreshold: 30 },               // spread 140
  { emoji: '1f573', name: 'Hole', ammoBuffer: 0, quantizeThreshold: 30 },                // spread 134
  { emoji: '1f6d2', name: 'Shopping Cart', ammoBuffer: 0, quantizeThreshold: 30 },       // spread 132
  { emoji: '1f31d', name: 'Sun With Face', ammoBuffer: 0, quantizeThreshold: 30 },       // spread 129
  { emoji: '1f9e6', name: 'Socks', ammoBuffer: 0, quantizeThreshold: 30 },               // spread 145 - relief
  { emoji: '1f4db', name: 'Name Badge', ammoBuffer: 0, quantizeThreshold: 30 },          // spread 141
  { emoji: '1f642', name: 'Smiley', ammoBuffer: 0, quantizeThreshold: 30 },              // spread 104

  // Levels 21-30: 7 colors (hard, wave)
  { emoji: '1f305', name: 'Sunrise', ammoBuffer: 0, quantizeThreshold: 30 },             // spread 158 - easy start
  { emoji: '1f359', name: 'Rice Ball', ammoBuffer: 0, quantizeThreshold: 30 },           // spread 155
  { emoji: '1f988', name: 'Squid', ammoBuffer: 0, quantizeThreshold: 30 },               // spread 144
  { emoji: '1f3b1', name: 'Pool Ball', ammoBuffer: 0, quantizeThreshold: 30 },           // spread 142
  { emoji: '1f516', name: 'Bookmark', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 141
  { emoji: '1f34d', name: 'Pineapple', ammoBuffer: 0, quantizeThreshold: 30 },           // relief (familiar)
  { emoji: '1f344', name: 'Mushroom', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 104
  { emoji: '1f32d', name: 'Hotdog', ammoBuffer: 0, quantizeThreshold: 30 },              // spread 84
  { emoji: '1f968', name: 'Pretzel', ammoBuffer: 0, quantizeThreshold: 30 },             // spread 92 - relief
  { emoji: '1f94e', name: 'Softball', ammoBuffer: 0, quantizeThreshold: 30 },            // spread 75

  // Levels 31-40: 8 colors (very hard, wave)
  { emoji: '1fa84', name: 'Magic Wand', ammoBuffer: 0, quantizeThreshold: 30 },          // spread 156 - easy start
  { emoji: '1f94a', name: 'Boxing Glove', ammoBuffer: 0, quantizeThreshold: 30 },        // spread 149
  { emoji: '1f432', name: 'Dragon Face', ammoBuffer: 0, quantizeThreshold: 30 },         // spread 142
  { emoji: '1f3d9', name: 'Cityscape', ammoBuffer: 0, quantizeThreshold: 30 },           // spread 142
  { emoji: '1f47b', name: 'Ghost', ammoBuffer: 0, quantizeThreshold: 30 },               // spread 141 - relief
  { emoji: '1f3e8', name: 'Hotel', ammoBuffer: 0, quantizeThreshold: 30 },               // spread 141
  { emoji: '1f440', name: 'Eyes', ammoBuffer: 0, quantizeThreshold: 30 },                // spread 140
  { emoji: '1f438', name: 'Frog', ammoBuffer: 0, quantizeThreshold: 30 },                // spread 132 - relief
  { emoji: '1f419', name: 'Octopus', ammoBuffer: 0, quantizeThreshold: 30 },             // medium
  { emoji: '1f402', name: 'Ox', ammoBuffer: 0, quantizeThreshold: 30 },                  // spread 89

  // Levels 41-50: mixed 6-8 colors (expert, tighter colors)
  { emoji: '1f98b', name: 'Butterfly', ammoBuffer: 0, quantizeThreshold: 30 },           // 6 colors, spread 98
  { emoji: '1f9a6', name: 'Otter', ammoBuffer: 0, quantizeThreshold: 30 },               // 6 colors, spread 93
  { emoji: '1f9c0', name: 'Cheese', ammoBuffer: 0, quantizeThreshold: 30 },              // 7 colors, spread 75
  { emoji: '1f30a', name: 'Ocean Wave', ammoBuffer: 0, quantizeThreshold: 30 },          // 4 colors but tight
  { emoji: '1f333', name: 'Deciduous Tree', ammoBuffer: 0, quantizeThreshold: 30 },      // greens
  { emoji: '1f348', name: 'Melon', ammoBuffer: 0, quantizeThreshold: 30 },               // greens
  { emoji: '1f316', name: 'Waning Moon', ammoBuffer: 0, quantizeThreshold: 30 },         // 7 colors, spread 92
  { emoji: '1f330', name: 'Chestnut', ammoBuffer: 0, quantizeThreshold: 30 },            // browns
  { emoji: '1f525', name: 'Fire', ammoBuffer: 0, quantizeThreshold: 30 },                // reds/oranges
  { emoji: '1f30b', name: 'Volcano', ammoBuffer: 0, quantizeThreshold: 25 },             // final boss
];

var GRID_SIZE = 18;
var NUM_COLUMNS = 4;
var NUM_WAIT_SLOTS = 5;
