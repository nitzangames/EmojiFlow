#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the diversity analysis
const data = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'twemoji_diversity_analysis.json'), 'utf8'
));

// ── Filters ──────────────────────────────────────────────────────────────────

function isFlag(fname) {
  // Regional indicators (flag country codes)
  if (fname.includes('1f1')) return true;
  // White/Black flag emoji
  if (fname === '1f3f3' || fname === '1f3f4') return true;
  return false;
}

function isSkinTone(fname) {
  const tones = ['1f3fb', '1f3fc', '1f3fd', '1f3fe', '1f3ff'];
  return tones.some(t => fname.includes(t));
}

function isZwjPersonVariant(fname) {
  // ZWJ sequences with multiple 200d segments are typically people/gender variants
  const zwjCount = (fname.match(/200d/g) || []).length;
  return zwjCount >= 2;
}

const filtered = data.filter(e => {
  if (isFlag(e.fname)) return false;
  if (isSkinTone(e.fname)) return false;
  if (isZwjPersonVariant(e.fname)) return false;
  return true;
});

// ── Group by color count ──────────────────────────────────────────────────────

const groups = {};
for (let c = 2; c <= 12; c++) groups[c] = [];

for (const e of filtered) {
  if (groups[e.colors]) groups[e.colors].push(e);
}

// Sort each group by avgDist descending (easiest first)
for (const g of Object.values(groups)) {
  g.sort((a, b) => b.avgDist - a.avgDist);
}

console.log('Group sizes after filtering:');
for (let c = 4; c <= 8; c++) {
  console.log(`  ${c} colors: ${groups[c].length} emoji`);
}

// ── Emoji name lookup (codepoint → approximate name) ─────────────────────────

function guessName(fname) {
  const map = {
    // 4-color range examples
    '1f300': 'cyclone', '1f301': 'foggy', '1f302': 'umbrella-rain',
    '1f303': 'night-stars', '1f304': 'sunrise-mountains', '1f305': 'sunrise',
    '1f306': 'cityscape-dusk', '1f307': 'sunset', '1f308': 'rainbow',
    '1f309': 'bridge-night', '1f30a': 'wave', '1f30b': 'volcano',
    '1f30c': 'milky-way', '1f30d': 'globe-europe', '1f30e': 'globe-americas',
    '1f30f': 'globe-asia', '1f310': 'globe-meridians', '1f311': 'new-moon',
    '1f312': 'waxing-crescent', '1f313': 'first-quarter', '1f314': 'waxing-gibbous',
    '1f315': 'full-moon', '1f316': 'waning-gibbous', '1f317': 'last-quarter',
    '1f318': 'waning-crescent', '1f319': 'crescent-moon', '1f31a': 'new-moon-face',
    '1f31b': 'first-quarter-face', '1f31c': 'last-quarter-face', '1f31d': 'full-moon-face',
    '1f31e': 'sun-face', '1f31f': 'glowing-star', '1f320': 'shooting-star',
    '1f321': 'thermometer', '1f324': 'sun-small-cloud', '1f325': 'sun-behind-cloud',
    '1f326': 'rain-cloud', '1f327': 'rain', '1f328': 'snow-cloud',
    '1f329': 'lightning', '1f32a': 'tornado', '1f32b': 'fog',
    '1f32c': 'wind', '1f32d': 'hotdog', '1f32e': 'taco',
    '1f32f': 'burrito', '1f330': 'chestnut', '1f331': 'seedling',
    '1f332': 'evergreen-tree', '1f333': 'deciduous-tree', '1f334': 'palm-tree',
    '1f335': 'cactus', '1f336': 'hot-pepper', '1f337': 'tulip',
    '1f338': 'cherry-blossom', '1f339': 'rose', '1f33a': 'hibiscus',
    '1f33b': 'sunflower', '1f33c': 'blossom', '1f33d': 'ear-of-corn',
    '1f33e': 'sheaf-of-rice', '1f33f': 'herb', '1f340': 'four-leaf-clover',
    '1f341': 'maple-leaf', '1f342': 'fallen-leaf', '1f343': 'leaf-wind',
    '1f344': 'mushroom', '1f345': 'tomato', '1f346': 'eggplant',
    '1f347': 'grapes', '1f348': 'melon', '1f349': 'watermelon',
    '1f34a': 'tangerine', '1f34b': 'lemon', '1f34c': 'banana',
    '1f34d': 'pineapple', '1f34e': 'red-apple', '1f34f': 'green-apple',
    '1f350': 'pear', '1f351': 'peach', '1f352': 'cherries',
    '1f353': 'strawberry', '1f354': 'hamburger', '1f355': 'pizza',
    '1f356': 'meat-on-bone', '1f357': 'poultry-leg', '1f358': 'rice-cracker',
    '1f359': 'rice-ball', '1f35a': 'cooked-rice', '1f35b': 'curry',
    '1f35c': 'ramen', '1f35d': 'spaghetti', '1f35e': 'bread',
    '1f35f': 'french-fries', '1f360': 'roasted-sweet-potato', '1f361': 'dango',
    '1f362': 'oden', '1f363': 'sushi', '1f364': 'fried-shrimp',
    '1f365': 'fish-cake', '1f366': 'soft-ice-cream', '1f367': 'shaved-ice',
    '1f368': 'ice-cream', '1f369': 'doughnut', '1f36a': 'cookie',
    '1f36b': 'chocolate-bar', '1f36c': 'candy', '1f36d': 'lollipop',
    '1f36e': 'custard', '1f36f': 'honey-pot', '1f370': 'shortcake',
    '1f371': 'bento-box', '1f372': 'pot-of-food', '1f373': 'cooking',
    '1f374': 'fork-knife', '1f375': 'teacup', '1f376': 'sake',
    '1f377': 'wine-glass', '1f378': 'cocktail', '1f379': 'tropical-drink',
    '1f37a': 'beer', '1f37b': 'beers', '1f37c': 'baby-bottle',
    '1f37d': 'fork-knife-plate', '1f37e': 'bottle-cork', '1f37f': 'popcorn',
    '1f380': 'ribbon', '1f381': 'wrapped-gift', '1f382': 'birthday-cake',
    '1f383': 'jack-o-lantern', '1f384': 'christmas-tree', '1f385': 'santa',
    '1f386': 'fireworks', '1f387': 'sparkler', '1f388': 'balloon',
    '1f389': 'party-popper', '1f38a': 'confetti-ball', '1f38b': 'tanabata-tree',
    '1f38c': 'crossed-flags', '1f38d': 'pine-decoration', '1f38e': 'japanese-dolls',
    '1f38f': 'carp-streamer', '1f390': 'wind-chime', '1f391': 'moon-ceremony',
    '1f392': 'backpack', '1f393': 'graduation-cap', '1f3a0': 'carousel-horse',
    '1f3a1': 'ferris-wheel', '1f3a2': 'roller-coaster', '1f3a3': 'fishing-pole',
    '1f3a4': 'microphone', '1f3a5': 'movie-camera', '1f3a6': 'cinema',
    '1f3a7': 'headphone', '1f3a8': 'artist-palette', '1f3a9': 'top-hat',
    '1f3aa': 'circus-tent', '1f3ab': 'ticket', '1f3ac': 'clapper-board',
    '1f3ad': 'performing-arts', '1f3ae': 'video-game', '1f3af': 'bullseye',
    '1f3b0': 'slot-machine', '1f3b1': 'billiards', '1f3b2': 'game-die',
    '1f3b3': 'bowling', '1f3b4': 'flower-playing-cards', '1f3b5': 'musical-note',
    '1f3b6': 'musical-notes', '1f3b7': 'saxophone', '1f3b8': 'guitar',
    '1f3b9': 'musical-keyboard', '1f3ba': 'trumpet', '1f3bb': 'violin',
    '1f3bc': 'musical-score', '1f3bd': 'running-shirt', '1f3be': 'tennis',
    '1f3bf': 'skis', '1f3c0': 'basketball', '1f3c1': 'chequered-flag',
    '1f3c2': 'snowboarder', '1f3c3': 'runner', '1f3c4': 'surfer',
    '1f3c5': 'sports-medal', '1f3c6': 'trophy', '1f3c7': 'horse-racing',
    '1f3c8': 'american-football', '1f3c9': 'rugby', '1f3ca': 'swimmer',
    '1f3cb': 'weightlifter', '1f3cc': 'golfer', '1f3cd': 'motorcycle',
    '1f3ce': 'racing-car', '1f3cf': 'cricket', '1f3d0': 'volleyball',
    '1f3d1': 'field-hockey', '1f3d2': 'ice-hockey', '1f3d3': 'ping-pong',
    '1f3d4': 'snow-capped-mountain', '1f3d5': 'camping', '1f3d6': 'beach',
    '1f3d7': 'building-construction', '1f3d8': 'houses', '1f3d9': 'cityscape',
    '1f3da': 'derelict-house', '1f3db': 'classical-building', '1f3dc': 'desert',
    '1f3dd': 'desert-island', '1f3de': 'national-park', '1f3df': 'stadium',
    '1f3e0': 'house', '1f3e1': 'house-garden', '1f3e2': 'office',
    '1f3e3': 'japanese-post-office', '1f3e4': 'post-office', '1f3e5': 'hospital',
    '1f3e6': 'bank', '1f3e7': 'atm', '1f3e8': 'hotel',
    '1f3e9': 'love-hotel', '1f3ea': 'convenience-store', '1f3eb': 'school',
    '1f3ec': 'department-store', '1f3ed': 'factory', '1f3ee': 'red-lantern',
    '1f3ef': 'japanese-castle', '1f3f0': 'european-castle',
    '1f400': 'rat', '1f401': 'mouse', '1f402': 'ox', '1f403': 'water-buffalo',
    '1f404': 'cow', '1f405': 'tiger', '1f406': 'leopard', '1f407': 'rabbit',
    '1f408': 'cat', '1f409': 'dragon', '1f40a': 'crocodile', '1f40b': 'whale',
    '1f40c': 'snail', '1f40d': 'snake', '1f40e': 'horse', '1f40f': 'ram',
    '1f410': 'goat', '1f411': 'sheep', '1f412': 'monkey', '1f413': 'rooster',
    '1f414': 'chicken', '1f415': 'dog', '1f416': 'pig', '1f417': 'boar',
    '1f418': 'elephant', '1f419': 'octopus', '1f41a': 'spiral-shell',
    '1f41b': 'bug', '1f41c': 'ant', '1f41d': 'honeybee', '1f41e': 'lady-beetle',
    '1f41f': 'fish', '1f420': 'tropical-fish', '1f421': 'blowfish',
    '1f422': 'turtle', '1f423': 'hatching-chick', '1f424': 'baby-chick',
    '1f425': 'front-chick', '1f426': 'bird', '1f427': 'penguin',
    '1f428': 'koala', '1f429': 'poodle', '1f42a': 'dromedary-camel',
    '1f42b': 'camel', '1f42c': 'dolphin', '1f42d': 'mouse-face',
    '1f42e': 'cow-face', '1f42f': 'tiger-face', '1f430': 'rabbit-face',
    '1f431': 'cat-face', '1f432': 'dragon-face', '1f433': 'spouting-whale',
    '1f434': 'horse-face', '1f435': 'monkey-face', '1f436': 'dog-face',
    '1f437': 'pig-face', '1f438': 'frog', '1f439': 'hamster',
    '1f43a': 'wolf', '1f43b': 'bear', '1f43c': 'panda',
    '1f43d': 'pig-nose', '1f43e': 'paw-prints', '1f43f': 'chipmunk',
    '1f440': 'eyes', '1f441': 'eye', '1f442': 'ear', '1f443': 'nose',
    '1f444': 'mouth', '1f445': 'tongue', '1f446': 'backhand-up',
    '1f447': 'backhand-down', '1f448': 'backhand-left', '1f449': 'backhand-right',
    '1f44a': 'oncoming-fist', '1f44b': 'waving-hand', '1f44c': 'ok-hand',
    '1f44d': 'thumbs-up', '1f44e': 'thumbs-down', '1f44f': 'clapping',
    '1f450': 'open-hands', '1f451': 'crown', '1f452': 'womans-hat',
    '1f453': 'glasses', '1f454': 'necktie', '1f455': 't-shirt',
    '1f456': 'jeans', '1f457': 'dress', '1f458': 'kimono',
    '1f459': 'bikini', '1f45a': 'womans-clothes', '1f45b': 'purse',
    '1f45c': 'handbag', '1f45d': 'clutch-bag', '1f45e': 'mans-shoe',
    '1f45f': 'running-shoe', '1f460': 'high-heeled-shoe', '1f461': 'womans-sandal',
    '1f462': 'womans-boot', '1f463': 'footprints', '1f464': 'bust-silhouette',
    '1f465': 'busts-silhouette', '1f466': 'boy', '1f467': 'girl',
    '1f468': 'man', '1f469': 'woman', '1f46a': 'family',
    '1f46b': 'man-woman', '1f46c': 'two-men', '1f46d': 'two-women',
    '1f46e': 'police-officer', '1f46f': 'people-with-bunny-ears',
    '1f470': 'bride', '1f471': 'blond-person', '1f472': 'man-chinese-cap',
    '1f473': 'person-turban', '1f474': 'old-man', '1f475': 'old-woman',
    '1f476': 'baby', '1f477': 'construction-worker', '1f478': 'princess',
    '1f479': 'japanese-ogre', '1f47a': 'japanese-goblin', '1f47b': 'ghost',
    '1f47c': 'baby-angel', '1f47d': 'alien', '1f47e': 'alien-monster',
    '1f47f': 'angry-face-horns', '1f480': 'skull', '1f481': 'person-tipping-hand',
    '1f482': 'guard', '1f483': 'woman-dancing', '1f484': 'lipstick',
    '1f485': 'nail-polish', '1f486': 'person-massage', '1f487': 'person-haircut',
    '1f488': 'barber-pole', '1f489': 'syringe', '1f48a': 'pill',
    '1f48b': 'kiss-mark', '1f48c': 'love-letter', '1f48d': 'ring',
    '1f48e': 'gem-stone', '1f48f': 'kiss', '1f490': 'bouquet',
    '1f491': 'couple-heart', '1f492': 'wedding', '1f493': 'beating-heart',
    '1f494': 'broken-heart', '1f495': 'two-hearts', '1f496': 'sparkling-heart',
    '1f497': 'growing-heart', '1f498': 'heart-arrow', '1f499': 'blue-heart',
    '1f49a': 'green-heart', '1f49b': 'yellow-heart', '1f49c': 'purple-heart',
    '1f49d': 'heart-ribbon', '1f49e': 'revolving-hearts', '1f49f': 'heart-decoration',
    '1f4a0': 'diamond', '1f4a1': 'light-bulb', '1f4a2': 'anger',
    '1f4a3': 'bomb', '1f4a4': 'zzz', '1f4a5': 'collision',
    '1f4a6': 'droplet', '1f4a7': 'sweat-droplet', '1f4a8': 'dashing',
    '1f4a9': 'pile-of-poo', '1f4aa': 'flexed-bicep', '1f4ab': 'dizzy',
    '1f4ac': 'speech-bubble', '1f4ad': 'thought-bubble', '1f4ae': 'white-flower',
    '1f4af': '100', '1f4b0': 'money-bag', '1f4b1': 'currency-exchange',
    '1f4b2': 'dollar', '1f4b3': 'credit-card', '1f4b4': 'yen',
    '1f4b5': 'dollar-bill', '1f4b8': 'money-wings', '1f4b9': 'chart-up',
    '1f4bb': 'laptop', '1f4bc': 'briefcase', '1f4bd': 'floppy-disk',
    '1f4be': 'floppy-disk-2', '1f4bf': 'cd', '1f4c0': 'dvd',
    '1f4c1': 'file-folder', '1f4c2': 'open-folder', '1f4c5': 'calendar',
    '1f4c6': 'calendar-tear', '1f4c7': 'card-index', '1f4c8': 'chart-up-2',
    '1f4c9': 'chart-down', '1f4ca': 'bar-chart', '1f4cb': 'clipboard',
    '1f4cc': 'pushpin', '1f4cd': 'round-pushpin', '1f4ce': 'paperclip',
    '1f4cf': 'ruler', '1f4d0': 'triangular-ruler', '1f4d1': 'bookmark-tabs',
    '1f4d2': 'ledger', '1f4d3': 'notebook', '1f4d4': 'notebook-cover',
    '1f4d5': 'closed-book', '1f4d6': 'open-book', '1f4d7': 'green-book',
    '1f4d8': 'blue-book', '1f4d9': 'orange-book', '1f4da': 'books',
    '1f4db': 'name-badge', '1f4dc': 'scroll', '1f4dd': 'memo',
    '1f4de': 'telephone', '1f4df': 'pager', '1f4e0': 'fax',
    '1f4e1': 'satellite-antenna', '1f4e2': 'loudspeaker', '1f4e3': 'megaphone',
    '1f4e4': 'outbox', '1f4e5': 'inbox', '1f4e6': 'package',
    '1f4e7': 'e-mail', '1f4e8': 'incoming-envelope', '1f4e9': 'envelope-arrow',
    '1f4ea': 'closed-mailbox-lowered', '1f4eb': 'closed-mailbox-raised',
    '1f4ec': 'open-mailbox-raised', '1f4ed': 'open-mailbox-lowered',
    '1f4ee': 'postbox', '1f4ef': 'postal-horn', '1f4f0': 'newspaper',
    '1f4f1': 'mobile-phone', '1f4f2': 'mobile-phone-arrow', '1f4f3': 'vibration',
    '1f4f4': 'mobile-off', '1f4f5': 'no-mobile', '1f4f6': 'signal',
    '1f4f7': 'camera', '1f4f8': 'camera-flash', '1f4f9': 'video-camera',
    '1f4fa': 'tv', '1f4fb': 'radio', '1f4fc': 'videocassette',
    '1f4fd': 'film-projector', '1f4ff': 'prayer-beads',
    '1f500': 'shuffle', '1f501': 'repeat', '1f502': 'repeat-one',
    '1f503': 'clockwise-arrows', '1f504': 'counterclockwise-arrows',
    '1f505': 'low-brightness', '1f506': 'high-brightness', '1f507': 'muted',
    '1f508': 'speaker', '1f509': 'speaker-wave', '1f50a': 'loud-sound',
    '1f50b': 'battery', '1f50c': 'electric-plug', '1f50d': 'magnifying-glass',
    '1f50e': 'magnifying-glass-right', '1f50f': 'locked-pen', '1f510': 'locked-key',
    '1f511': 'key', '1f512': 'locked', '1f513': 'unlocked',
    '1f514': 'bell', '1f515': 'bell-slash', '1f516': 'bookmark',
    '1f517': 'link', '1f518': 'radio-button', '1f519': 'back',
    '1f51a': 'end', '1f51b': 'on', '1f51c': 'soon', '1f51d': 'top',
    '1f51e': 'no-under-eighteen', '1f51f': 'keycap-ten', '1f520': 'abcd',
    '1f521': 'abc', '1f522': '1234', '1f523': 'symbols',
    '1f524': 'latin-cross', '1f525': 'fire', '1f526': 'flashlight',
    '1f527': 'wrench', '1f528': 'hammer', '1f529': 'nut-bolt',
    '1f52a': 'hocho', '1f52b': 'pistol', '1f52c': 'microscope',
    '1f52d': 'telescope', '1f52e': 'crystal-ball', '1f52f': 'dotted-six-star',
    '1f530': 'japanese-beginner', '1f531': 'trident-emblem', '1f532': 'black-square-button',
    '1f533': 'white-square-button', '1f534': 'red-circle', '1f535': 'blue-circle',
    '1f536': 'orange-diamond', '1f537': 'blue-diamond', '1f538': 'small-orange-diamond',
    '1f539': 'small-blue-diamond', '1f53a': 'red-triangle-up', '1f53b': 'red-triangle-down',
    '1f53c': 'up-button', '1f53d': 'down-button', '1f549': 'om',
    '1f54a': 'dove', '1f54b': 'kaaba', '1f54c': 'mosque',
    '1f54d': 'synagogue', '1f54e': 'menorah', '1f54f': 'dotted-six-star-2',
    '1f550': 'clock-1', '1f551': 'clock-2', '1f552': 'clock-3',
    '1f553': 'clock-4', '1f554': 'clock-5', '1f555': 'clock-6',
    '1f556': 'clock-7', '1f557': 'clock-8', '1f558': 'clock-9',
    '1f559': 'clock-10', '1f55a': 'clock-11', '1f55b': 'clock-12',
    '1f55c': 'clock-1-30', '1f55d': 'clock-2-30', '1f55e': 'clock-3-30',
    '1f55f': 'clock-4-30', '1f560': 'clock-5-30', '1f561': 'clock-6-30',
    '1f562': 'clock-7-30', '1f563': 'clock-8-30', '1f564': 'clock-9-30',
    '1f565': 'clock-10-30', '1f566': 'clock-11-30', '1f567': 'clock-12-30',
    '1f56f': 'candle', '1f570': 'mantelpiece-clock', '1f573': 'hole',
    '1f574': 'man-suit', '1f575': 'detective', '1f576': 'sunglasses',
    '1f577': 'spider', '1f578': 'spider-web', '1f579': 'joystick',
    '1f57a': 'man-dancing', '1f587': 'linked-paperclips', '1f58a': 'pen-ballpoint',
    '1f58b': 'pen-fountain', '1f58c': 'paintbrush', '1f58d': 'crayon',
    '1f590': 'hand-5-fingers', '1f595': 'middle-finger', '1f596': 'vulcan-salute',
    '1f5a4': 'black-heart', '1f5a5': 'desktop-computer', '1f5a8': 'printer',
    '1f5b1': 'computer-mouse', '1f5b2': 'trackball', '1f5bc': 'framed-picture',
    '1f5c2': 'card-index-dividers', '1f5c3': 'card-file-box', '1f5c4': 'file-cabinet',
    '1f5d1': 'wastebasket', '1f5d2': 'spiral-notepad', '1f5d3': 'spiral-calendar',
    '1f5dc': 'compression', '1f5dd': 'old-key', '1f5de': 'rolled-up-newspaper',
    '1f5e1': 'dagger', '1f5e3': 'speaking-head', '1f5e8': 'left-speech-bubble',
    '1f5ef': 'right-anger-bubble', '1f5f3': 'ballot-box', '1f5fa': 'world-map',
    '1f5fb': 'mount-fuji', '1f5fc': 'tokyo-tower', '1f5fd': 'statue-of-liberty',
    '1f5fe': 'map-of-japan', '1f5ff': 'moyai',
    '1f600': 'grinning', '1f601': 'beaming', '1f602': 'tears-of-joy',
    '1f603': 'grinning-face', '1f604': 'grinning-squinting', '1f605': 'sweat-smile',
    '1f606': 'squinting', '1f607': 'smiling-halo', '1f608': 'smiling-horns',
    '1f609': 'winking', '1f60a': 'smiling-eye', '1f60b': 'face-savouring',
    '1f60c': 'relieved', '1f60d': 'smiling-heart-eyes', '1f60e': 'smiling-sunglasses',
    '1f60f': 'smirking', '1f610': 'neutral', '1f611': 'expressionless',
    '1f612': 'unamused', '1f613': 'downcast-sweat', '1f614': 'pensive',
    '1f615': 'confused', '1f616': 'confounded', '1f617': 'kissing',
    '1f618': 'kissing-heart', '1f619': 'kissing-smiling-eyes', '1f61a': 'kissing-closed-eyes',
    '1f61b': 'face-tongue', '1f61c': 'winking-tongue', '1f61d': 'squinting-tongue',
    '1f61e': 'disappointed', '1f61f': 'worried', '1f620': 'angry',
    '1f621': 'pouting', '1f622': 'crying', '1f623': 'persevering',
    '1f624': 'steam-nose', '1f625': 'sad-but-relieved', '1f626': 'frowning',
    '1f627': 'anguished', '1f628': 'fearful', '1f629': 'weary',
    '1f62a': 'sleepy', '1f62b': 'tired', '1f62c': 'grimacing',
    '1f62d': 'loudly-crying', '1f62e': 'face-open-mouth', '1f62f': 'hushed',
    '1f630': 'anxious-sweat', '1f631': 'face-screaming', '1f632': 'astonished',
    '1f633': 'flushed', '1f634': 'sleeping', '1f635': 'dizzy-face',
    '1f636': 'no-mouth', '1f637': 'medical-mask', '1f638': 'cat-grinning',
    '1f639': 'cat-tears-joy', '1f63a': 'cat-grinning-2', '1f63b': 'cat-heart-eyes',
    '1f63c': 'cat-wry-smile', '1f63d': 'cat-kissing', '1f63e': 'cat-pouting',
    '1f63f': 'cat-crying', '1f640': 'cat-weary', '1f641': 'slightly-frowning',
    '1f642': 'slightly-smiling', '1f643': 'upside-down', '1f644': 'rolling-eyes',
    '1f645': 'no-good', '1f646': 'ok-person', '1f647': 'person-bowing',
    '1f648': 'see-no-evil', '1f649': 'hear-no-evil', '1f64a': 'speak-no-evil',
    '1f64b': 'raising-hand', '1f64c': 'raising-hands', '1f64d': 'frowning-person',
    '1f64e': 'pouting-person', '1f64f': 'folded-hands',
    '1f680': 'rocket', '1f681': 'helicopter', '1f682': 'locomotive',
    '1f683': 'railway-car', '1f684': 'bullet-train', '1f685': 'train',
    '1f686': 'train-2', '1f687': 'metro', '1f688': 'light-rail',
    '1f689': 'station', '1f68a': 'tram', '1f68b': 'tram-car',
    '1f68c': 'bus', '1f68d': 'oncoming-bus', '1f68e': 'trolleybus',
    '1f68f': 'bus-stop', '1f690': 'minibus', '1f691': 'ambulance',
    '1f692': 'fire-engine', '1f693': 'police-car', '1f694': 'oncoming-police-car',
    '1f695': 'taxi', '1f696': 'oncoming-taxi', '1f697': 'automobile',
    '1f698': 'oncoming-automobile', '1f699': 'suv', '1f69a': 'delivery-truck',
    '1f69b': 'articulated-lorry', '1f69c': 'tractor', '1f69d': 'monorail',
    '1f69e': 'mountain-railway', '1f69f': 'suspension-railway',
    '1f6a0': 'mountain-cableway', '1f6a1': 'aerial-tramway', '1f6a2': 'ship',
    '1f6a3': 'rowboat', '1f6a4': 'speedboat', '1f6a5': 'traffic-light',
    '1f6a6': 'vertical-traffic-light', '1f6a7': 'construction-sign',
    '1f6a8': 'police-lights', '1f6a9': 'triangular-flag', '1f6aa': 'door',
    '1f6ab': 'no-entry-sign', '1f6ac': 'cigarette', '1f6ad': 'no-smoking',
    '1f6ae': 'litter', '1f6af': 'no-littering', '1f6b0': 'potable-water',
    '1f6b1': 'non-potable-water', '1f6b2': 'bicycle', '1f6b3': 'no-bicycles',
    '1f6b4': 'person-biking', '1f6b5': 'person-mountain-biking', '1f6b6': 'person-walking',
    '1f6b7': 'no-pedestrians', '1f6b8': 'children-crossing', '1f6b9': 'mens-room',
    '1f6ba': 'womens-room', '1f6bb': 'restroom', '1f6bc': 'baby-symbol',
    '1f6bd': 'toilet', '1f6be': 'wc', '1f6bf': 'shower',
    '1f6c0': 'person-bathing', '1f6c1': 'bathtub', '1f6c2': 'passport-control',
    '1f6c3': 'customs', '1f6c4': 'baggage-claim', '1f6c5': 'left-luggage',
    '1f6cb': 'couch', '1f6cc': 'person-in-bed', '1f6cd': 'shopping-bags',
    '1f6ce': 'bellhop-bell', '1f6cf': 'bed', '1f6d0': 'place-of-worship',
    '1f6d1': 'stop-sign', '1f6d2': 'shopping-cart', '1f6d5': 'hindu-temple',
    '1f6e0': 'hammer-wrench', '1f6e1': 'shield', '1f6e2': 'oil-drum',
    '1f6e3': 'motorway', '1f6e4': 'railway-track', '1f6e5': 'motor-boat',
    '1f6e9': 'small-airplane', '1f6eb': 'airplane-departure', '1f6ec': 'airplane-arrival',
    '1f6f0': 'satellite', '1f6f3': 'passenger-ship', '1f6f4': 'kick-scooter',
    '1f6f5': 'motor-scooter', '1f6f6': 'canoe', '1f6f7': 'sled',
    '1f6f8': 'flying-saucer', '1f6f9': 'skateboard', '1f6fa': 'auto-rickshaw',
    '1f900': 'zipper-mouth', '1f910': 'zipper-mouth-2', '1f911': 'money-mouth',
    '1f912': 'face-thermometer', '1f913': 'nerd', '1f914': 'thinking',
    '1f915': 'head-bandage', '1f916': 'robot', '1f917': 'hugging',
    '1f918': 'sign-of-horns', '1f919': 'call-me', '1f91a': 'raised-back-hand',
    '1f91b': 'left-facing-fist', '1f91c': 'right-facing-fist', '1f91d': 'handshake',
    '1f91e': 'crossed-fingers', '1f91f': 'love-you-gesture', '1f920': 'cowboy',
    '1f921': 'clown', '1f922': 'nauseated', '1f923': 'rolling-on-floor',
    '1f924': 'drooling', '1f925': 'lying-face', '1f926': 'face-palm',
    '1f927': 'sneezing', '1f928': 'raised-eyebrow', '1f929': 'star-struck',
    '1f92a': 'zany', '1f92b': 'shushing', '1f92c': 'swearing',
    '1f92d': 'hand-over-mouth', '1f92e': 'face-vomiting', '1f92f': 'exploding-head',
    '1f930': 'pregnant-woman', '1f931': 'breast-feeding', '1f932': 'palms-up',
    '1f933': 'selfie', '1f934': 'prince', '1f935': 'person-tuxedo',
    '1f936': 'mrs-claus', '1f937': 'shrug', '1f938': 'person-cartwheeling',
    '1f939': 'person-juggling', '1f93a': 'person-fencing', '1f93b': 'modern-pentathlon',
    '1f93c': 'people-wrestling', '1f93d': 'person-water-polo', '1f93e': 'person-handball',
    '1f93f': 'person-diving', '1f940': 'wilted-flower', '1f941': 'drum',
    '1f942': 'clinking-glasses', '1f943': 'tumbler-glass', '1f944': 'spoon',
    '1f945': 'goal-net', '1f947': 'first-place', '1f948': 'second-place',
    '1f949': 'third-place', '1f94a': 'boxing-glove', '1f94b': 'martial-arts',
    '1f94c': 'curling-stone', '1f94d': 'lacrosse', '1f94e': 'softball',
    '1f94f': 'flying-disc', '1f950': 'croissant', '1f951': 'avocado',
    '1f952': 'cucumber', '1f953': 'bacon', '1f954': 'potato',
    '1f955': 'carrot', '1f956': 'baguette', '1f957': 'salad',
    '1f958': 'shallow-pan', '1f959': 'stuffed-flatbread', '1f95a': 'egg',
    '1f95b': 'glass-of-milk', '1f95c': 'peanuts', '1f95d': 'kiwi',
    '1f95e': 'pancakes', '1f95f': 'dumpling', '1f960': 'fortune-cookie',
    '1f961': 'takeout-box', '1f962': 'chopsticks', '1f963': 'bowl-spoon',
    '1f964': 'cup-straw', '1f965': 'coconut', '1f966': 'broccoli',
    '1f967': 'pie', '1f968': 'pretzel', '1f969': 'cut-of-meat',
    '1f96a': 'sandwich', '1f96b': 'canned-food', '1f96c': 'leafy-green',
    '1f96d': 'mango', '1f96e': 'moon-cake', '1f96f': 'bagel',
    '1f970': 'smiling-hearts', '1f971': 'yawning', '1f973': 'partying',
    '1f974': 'woozy', '1f975': 'hot-face', '1f976': 'cold-face',
    '1f977': 'ninja', '1f978': 'disguised-face', '1f97a': 'pleading',
    '1f97b': 'sari', '1f97c': 'lab-coat', '1f97d': 'goggles',
    '1f97e': 'hiking-boot', '1f97f': 'flat-shoe', '1f980': 'crab',
    '1f981': 'lion', '1f982': 'scorpion', '1f983': 'turkey',
    '1f984': 'unicorn', '1f985': 'eagle', '1f986': 'duck',
    '1f987': 'bat', '1f988': 'shark', '1f989': 'owl',
    '1f98a': 'fox', '1f98b': 'butterfly', '1f98c': 'deer',
    '1f98d': 'gorilla', '1f98e': 'lizard', '1f98f': 'rhinoceros',
    '1f990': 'shrimp', '1f991': 'squid', '1f992': 'giraffe',
    '1f993': 'zebra', '1f994': 'hedgehog', '1f995': 'sauropod',
    '1f996': 't-rex', '1f997': 'cricket', '1f998': 'kangaroo',
    '1f999': 'llama', '1f99a': 'peacock', '1f99b': 'hippo',
    '1f99c': 'parrot', '1f99d': 'raccoon', '1f99e': 'lobster',
    '1f99f': 'mosquito', '1f9a0': 'microbe', '1f9a1': 'badger',
    '1f9a2': 'swan', '1f9a3': 'mammoth', '1f9a4': 'dodo',
    '1f9a5': 'sloth', '1f9a6': 'otter', '1f9a7': 'orangutan',
    '1f9a8': 'skunk', '1f9a9': 'flamingo', '1f9aa': 'oyster',
    '1f9ab': 'beaver', '1f9ac': 'bison', '1f9ad': 'seal',
    '1f9ae': 'guide-dog', '1f9af': 'probing-cane', '1f9b0': 'red-hair',
    '1f9b1': 'curly-hair', '1f9b2': 'bald', '1f9b3': 'white-hair',
    '1f9b4': 'bone', '1f9b5': 'leg', '1f9b6': 'foot',
    '1f9b7': 'tooth', '1f9b8': 'superhero', '1f9b9': 'supervillain',
    '1f9ba': 'safety-vest', '1f9bb': 'ear-hearing-aid', '1f9bc': 'motorized-wheelchair',
    '1f9bd': 'manual-wheelchair', '1f9be': 'mechanical-arm', '1f9bf': 'mechanical-leg',
    '1f9c0': 'cheese-wedge', '1f9c1': 'cupcake', '1f9c2': 'salt',
    '1f9c3': 'beverage-box', '1f9c4': 'garlic', '1f9c5': 'onion',
    '1f9c6': 'falafel', '1f9c7': 'waffle', '1f9c8': 'butter',
    '1f9c9': 'mate', '1f9ca': 'ice', '1f9cb': 'bubble-tea',
    '1f9cc': 'troll', '1f9cd': 'person-standing', '1f9ce': 'person-kneeling',
    '1f9cf': 'deaf-person', '1f9d0': 'monocle', '1f9d1': 'adult',
    '1f9d2': 'child', '1f9d3': 'older-adult', '1f9d4': 'beard',
    '1f9d5': 'woman-headscarf', '1f9d6': 'person-sauna', '1f9d7': 'person-climbing',
    '1f9d8': 'person-lotus', '1f9d9': 'mage', '1f9da': 'fairy',
    '1f9db': 'vampire', '1f9dc': 'merperson', '1f9dd': 'elf',
    '1f9de': 'genie', '1f9df': 'zombie', '1f9e0': 'brain',
    '1f9e1': 'orange-heart', '1f9e2': 'billed-cap', '1f9e3': 'scarf',
    '1f9e4': 'gloves', '1f9e5': 'coat', '1f9e6': 'socks',
    '1f9e7': 'red-envelope', '1f9e8': 'firecracker', '1f9e9': 'puzzle',
    '1f9ea': 'test-tube', '1f9eb': 'petri-dish', '1f9ec': 'dna',
    '1f9ed': 'compass', '1f9ee': 'abacus', '1f9ef': 'fire-extinguisher',
    '1f9f0': 'toolbox', '1f9f1': 'brick', '1f9f2': 'magnet',
    '1f9f3': 'luggage', '1f9f4': 'lotion-bottle', '1f9f5': 'thread',
    '1f9f6': 'yarn', '1f9f7': 'safety-pin', '1f9f8': 'teddy-bear',
    '1f9f9': 'broom', '1f9fa': 'basket', '1f9fb': 'roll-of-paper',
    '1f9fc': 'soap', '1f9fd': 'sponge', '1f9fe': 'receipt',
    '1f9ff': 'nazar-amulet',
    '1fa70': 'ballet-shoes', '1fa71': 'one-piece-swimsuit', '1fa72': 'briefs',
    '1fa73': 'shorts', '1fa74': 'thong-sandal', '1fa78': 'drop-of-blood',
    '1fa79': 'adhesive-bandage', '1fa7a': 'stethoscope', '1fa80': 'yo-yo',
    '1fa81': 'kite', '1fa82': 'parachute', '1fa83': 'boomerang',
    '1fa84': 'magic-wand', '1fa85': 'pinata', '1fa86': 'nesting-dolls',
    '1fa90': 'ringed-planet', '1fa91': 'chair', '1fa92': 'razor',
    '1fa93': 'axe', '1fa94': 'diya-lamp', '1fa95': 'banjo',
    '1fa96': 'military-helmet', '1fa97': 'accordion', '1fa98': 'long-drum',
    '1fa99': 'coin', '1fa9a': 'carpentry-saw', '1fa9b': 'screwdriver',
    '1fa9c': 'ladder', '1fa9d': 'hook', '1fa9e': 'mirror',
    '1fa9f': 'window', '1faa0': 'plunger', '1faa1': 'sewing-needle',
    '1faa2': 'knot', '1faa3': 'bucket', '1faa4': 'mouse-trap',
    '1faa5': 'toothbrush', '1faa6': 'headstone', '1faa7': 'placard',
    '1faa8': 'rock', '1fab0': 'fly', '1fab1': 'worm',
    '1fab2': 'beetle', '1fab3': 'cockroach', '1fab4': 'potted-plant',
    '1fab5': 'wood', '1fab6': 'feather', '1fac0': 'anatomical-heart',
    '1fac1': 'lungs', '1fac2': 'people-hugging', '1fad0': 'blueberries',
    '1fad1': 'bell-pepper', '1fad2': 'olive', '1fad3': 'flatbread',
    '1fad4': 'tamale', '1fad5': 'fondue', '1fad6': 'teapot',
    '2614': 'umbrella-rain', '2615': 'hot-beverage', '2622': 'radioactive',
    '2623': 'biohazard', '2626': 'orthodox-cross', '2638': 'wheel-of-dharma',
    '2639': 'frowning-face', '263a': 'smiling-face', '2648': 'aries',
    '2649': 'taurus', '264a': 'gemini', '264b': 'cancer',
    '264c': 'leo', '264d': 'virgo', '264e': 'libra',
    '264f': 'scorpius', '2650': 'sagittarius', '2651': 'capricorn',
    '2652': 'aquarius', '2653': 'pisces', '2660': 'spade',
    '2663': 'clubs', '2665': 'hearts', '2666': 'diamonds',
    '2668': 'hot-springs', '26a0': 'warning', '26a1': 'lightning-bolt',
    '26be': 'baseball', '26bf': 'softball-2', '26c4': 'snowman-no-snow',
    '26c5': 'sun-cloud', '26ce': 'ophiuchus', '26d4': 'no-entry',
    '26ea': 'church', '26f2': 'fountain', '26f3': 'flag-in-hole',
    '26f4': 'ferry', '26f5': 'sailboat', '26f7': 'skier',
    '26f8': 'ice-skate', '26f9': 'person-bouncing-ball', '26fa': 'tent',
    '26fd': 'fuel-pump', '2702': 'scissors', '2709': 'envelope',
    '2712': 'black-nib', '2714': 'check-mark', '2716': 'multiply',
    '271d': 'latin-cross', '2721': 'star-of-david', '2728': 'sparkles',
    '2733': 'eight-spoked-asterisk', '2734': 'eight-pointed-star',
    '2744': 'snowflake', '2747': 'sparkle', '274c': 'cross-mark',
    '274e': 'cross-mark-button', '2753': 'question', '2754': 'white-question',
    '2755': 'white-exclamation', '2757': 'exclamation', '2763': 'heart-exclamation',
    '2764': 'red-heart', '2795': 'plus', '2796': 'minus',
    '2797': 'divide', '27a1': 'right-arrow', '27b0': 'curly-loop',
    '27bf': 'double-curly-loop', '2934': 'arrow-up-right', '2935': 'arrow-down-right',
    '3030': 'wavy-dash', '303d': 'part-alternation-mark', '3297': 'circled-ideograph-congratulation',
    '3299': 'circled-ideograph-secret',
  };
  return map[fname] || null;
}

// ── Wave difficulty picker ────────────────────────────────────────────────────
//
// The idea: within each tier (4-color, 5-color, 6-8 color) we want a wave
// pattern of avgDist values. We sort by avgDist descending (easiest first).
// The wave pattern picks indices with a sinusoidal offset on top of a linear
// progression toward harder emoji.

function pickWave(pool, count, overallHardnessTrend = true) {
  if (pool.length < count) {
    console.warn(`Pool only has ${pool.length}, need ${count}`);
  }
  const n = Math.min(count, pool.length);
  const total = pool.length;
  const picked = [];
  const used = new Set();

  for (let i = 0; i < n; i++) {
    // Linear index: progress from easy (index 0) to hard (index total-1)
    // Add sine wave offset to create ripple
    const progress = i / (n - 1); // 0..1
    const trendIndex = progress * (total - 1);
    // Wave amplitude shrinks as we go (so we don't go back to pure easy)
    const waveAmp = (1 - progress * 0.5) * (total * 0.15);
    const wave = Math.sin(i * 1.2) * waveAmp;
    let idx = Math.round(trendIndex + wave);
    idx = Math.max(0, Math.min(total - 1, idx));

    // Find nearest unused slot
    let offset = 0;
    while (used.has(idx) && offset < total) {
      offset++;
      const candidate1 = idx + offset;
      const candidate2 = idx - offset;
      if (candidate1 < total && !used.has(candidate1)) { idx = candidate1; break; }
      if (candidate2 >= 0 && !used.has(candidate2)) { idx = candidate2; break; }
    }
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
}

// ── Build the 50-level selection ──────────────────────────────────────────────

// Levels 1-5: exactly 4 colors
const fourColorPool = groups[4];
const fiveColorPool = groups[5];
// Levels 11-50: mix of 6, 7, 8 colors — interleaved
const sixColorPool   = groups[6];
const sevenColorPool = groups[7];
const eightColorPool = groups[8];

console.log('\nPool sizes:');
console.log(`  4-color: ${fourColorPool.length}`);
console.log(`  5-color: ${fiveColorPool.length}`);
console.log(`  6-color: ${sixColorPool.length}`);
console.log(`  7-color: ${sevenColorPool.length}`);
console.log(`  8-color: ${eightColorPool.length}`);

// Pick 5 from 4-color pool (levels 1-5)
const tier1 = pickWave(fourColorPool, 5);

// Pick 5 from 5-color pool (levels 6-10)
const tier2 = pickWave(fiveColorPool, 5);

// Pick 40 from 6/7/8-color pool (levels 11-50)
// Interleave: bias toward 6-color early, 8-color late
// Build a combined 6/7/8 pool sorted by avgDist desc but tagged with color count
const combined678 = [
  ...sixColorPool.map(e => ({...e, _tier: 6})),
  ...sevenColorPool.map(e => ({...e, _tier: 7})),
  ...eightColorPool.map(e => ({...e, _tier: 8})),
].sort((a, b) => b.avgDist - a.avgDist);

const tier3 = pickWave(combined678, 40);

const allLevels = [...tier1, ...tier2, ...tier3];

// ── Format output ─────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(120));
console.log('EMOJI FLOW — 50-LEVEL SELECTION');
console.log('='.repeat(120));
console.log(
  'Level'.padEnd(7) +
  'Codepoint'.padEnd(30) +
  'Name'.padEnd(30) +
  'Colors'.padEnd(8) +
  'avgDist'.padEnd(10) +
  'Palette'
);
console.log('-'.repeat(120));

const output = [];
allLevels.forEach((e, i) => {
  const level = i + 1;
  const name = guessName(e.fname) || '?';
  const colors = e._tier || e.colors;
  const palette = e.palette.join(', ');
  console.log(
    String(level).padEnd(7) +
    e.fname.padEnd(30) +
    name.padEnd(30) +
    String(colors).padEnd(8) +
    String(e.avgDist).padEnd(10) +
    palette
  );
  output.push({
    level,
    codepoint: e.fname,
    name,
    colors,
    avgDist: e.avgDist,
    palette: e.palette,
  });
});

console.log('='.repeat(120));

// Save to JSON
fs.writeFileSync(
  path.join(__dirname, 'selected_levels.json'),
  JSON.stringify(output, null, 2)
);
console.log('\nSaved to selected_levels.json');
