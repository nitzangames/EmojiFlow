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
];

var GRID_SIZE = 18;
var NUM_COLUMNS = 4;
var NUM_WAIT_SLOTS = 5;
