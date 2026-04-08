var LEVELS = [
  // Band 1: 2-3 colors (levels 1-10)
  { emoji: '1f534', name: 'Red Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e0', name: 'Orange Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e1', name: 'Yellow Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e2', name: 'Green Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f535', name: 'Blue Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f7e3', name: 'Purple Circle', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '2b50', name: 'Star', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '2764-fe0f', name: 'Red Heart', ammoBuffer: 0.25, quantizeThreshold: 40 },
  { emoji: '1f49b', name: 'Yellow Heart', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f499', name: 'Blue Heart', ammoBuffer: 0.20, quantizeThreshold: 35 },

  // Band 2: 3-4 colors (levels 11-20)
  { emoji: '1f34e', name: 'Red Apple', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f34a', name: 'Tangerine', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f33b', name: 'Sunflower', ammoBuffer: 0.20, quantizeThreshold: 35 },
  { emoji: '1f525', name: 'Fire', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f4a7', name: 'Droplet', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f31f', name: 'Glowing Star', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f33a', name: 'Hibiscus', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f352', name: 'Cherries', ammoBuffer: 0.15, quantizeThreshold: 30 },
  { emoji: '1f353', name: 'Strawberry', ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f438', name: 'Frog', ammoBuffer: 0.10, quantizeThreshold: 25 },

  // Band 3: 4-5 colors (levels 21-30)
  { emoji: '1f345', name: 'Tomato', ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f34b', name: 'Lemon', ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f34c', name: 'Banana', ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f347', name: 'Grapes', ammoBuffer: 0.10, quantizeThreshold: 25 },
  { emoji: '1f349', name: 'Watermelon', ammoBuffer: 0.10, quantizeThreshold: 22 },
  { emoji: '1f350', name: 'Pear', ammoBuffer: 0.10, quantizeThreshold: 22 },
  { emoji: '1f351', name: 'Peach', ammoBuffer: 0.10, quantizeThreshold: 22 },
  { emoji: '1f33d', name: 'Corn', ammoBuffer: 0.08, quantizeThreshold: 22 },
  { emoji: '1f955', name: 'Carrot', ammoBuffer: 0.08, quantizeThreshold: 22 },
  { emoji: '1f966', name: 'Broccoli', ammoBuffer: 0.08, quantizeThreshold: 22 },

  // Band 4: 5-6 colors (levels 31-40)
  { emoji: '1f338', name: 'Cherry Blossom', ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f40c', name: 'Snail', ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f41b', name: 'Bug', ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f42c', name: 'Dolphin', ammoBuffer: 0.08, quantizeThreshold: 20 },
  { emoji: '1f431', name: 'Cat Face', ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f435', name: 'Monkey Face', ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f436', name: 'Dog Face', ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f98a', name: 'Fox', ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f98e', name: 'Lizard', ammoBuffer: 0.05, quantizeThreshold: 18 },
  { emoji: '1f984', name: 'Unicorn', ammoBuffer: 0.05, quantizeThreshold: 18 },

  // Band 5: 6+ colors (levels 41-50)
  { emoji: '1f340', name: 'Four Leaf Clover', ammoBuffer: 0.05, quantizeThreshold: 16 },
  { emoji: '1f332', name: 'Evergreen Tree', ammoBuffer: 0.05, quantizeThreshold: 16 },
  { emoji: '1f383', name: 'Jack-O-Lantern', ammoBuffer: 0.05, quantizeThreshold: 16 },
  { emoji: '1f384', name: 'Christmas Tree', ammoBuffer: 0.05, quantizeThreshold: 15 },
  { emoji: '1f30b', name: 'Volcano', ammoBuffer: 0.05, quantizeThreshold: 15 },
  { emoji: '1f3a8', name: 'Artist Palette', ammoBuffer: 0.05, quantizeThreshold: 15 },
  { emoji: '1f30d', name: 'Globe', ammoBuffer: 0.03, quantizeThreshold: 14 },
  { emoji: '1f308', name: 'Rainbow', ammoBuffer: 0.03, quantizeThreshold: 14 },
  { emoji: '1f386', name: 'Fireworks', ammoBuffer: 0.03, quantizeThreshold: 14 },
  { emoji: '1f3d4', name: 'Snow Mountain', ammoBuffer: 0.03, quantizeThreshold: 14 },
];

var GRID_SIZE = 18;
var NUM_COLUMNS = 4;
var NUM_WAIT_SLOTS = 5;
