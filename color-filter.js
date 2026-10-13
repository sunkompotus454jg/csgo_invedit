export const COLOR_DEFINITIONS = [
  { id: '', name: 'Все цвета', emoji: '🌈', hex: 'transparent' },
  { id: 'red', name: 'Красный', emoji: '🔴', hex: '#e63946' },
  { id: 'blue', name: 'Синий', emoji: '🔵', hex: '#3a86ff' },
  { id: 'green', name: 'Зеленый', emoji: '🟢', hex: '#2a9d8f' },
  { id: 'yellow', name: 'Золотой / Желтый', emoji: '🟡', hex: '#ffb703' },
  { id: 'purple', name: 'Фиолетовый', emoji: '🟣', hex: '#9d4edd' },
  { id: 'pink', name: 'Розовый', emoji: '🌸', hex: '#f72585' },
  { id: 'orange', name: 'Оранжевый', emoji: '🟠', hex: '#fb8500' },
  { id: 'white', name: 'Белый', emoji: '⚪', hex: '#e9ecef' },
  { id: 'black', name: 'Черный', emoji: '⚫', hex: '#212529' }
];

const COLOR_PATTERNS = {
  red: [
    /\bblood\w*/i, /\bred\b/i, /\bredline\b/i, /\bcrimson\w*/i, /\bslaughter\b/i, /\bhowl\b/i,
    /\bcyrex\b/i, /\bhot rod\b/i, /\bevil daimyo\b/i, /\bmuertos\b/i, /\btraitor\b/i, /\bwildfire\b/i,
    /\bcode red\b/i, /\bstyx\b/i, /\bmeltdown\b/i, /\bhellfire\b/i, /\bradiation hazard\b/i,
    /\bautotronic\b/i, /\bbullet queen\b/i, /\btrigger discipline\b/i, /\bsunset storm\b/i,
    /\brub(y|ies)\b/i, /\bkill confirmed\b/i, /\bcandy apple\b/i, /\bscarlet\b/i,
    /\bred laminate\b/i, /\bnevermore\b/i, /\brust coat\b/i, /\bdoppler ruby\b/i
  ],
  blue: [
    /\bblue\w*/i, /\bsapphire\b/i, /\bicarus\b/i, /\bemperor\b/i, /\bvulcan\b/i, /\bblueprint\b/i,
    /\bfrontside\b/i, /\bcobalt\w*/i, /\bsun in leo\b/i, /\bguardian\b/i, /\bbright water\b/i,
    /\bposeidon\b/i, /\bocean drive\b/i, /\btwilight galaxy\b/i, /\bman-o'-war\b/i, /\bcorticera\b/i,
    /\bhigh beam\b/i, /\bleaded glass\b/i, /\bhydroponic\b/i, /\bphosphor\b/i, /\bice coaled\b/i,
    /\brocket pop\b/i, /\boceanic\b/i, /\bdeep sea\b/i, /\baquamarine\b/i, /\bmedusa\b/i,
    /\bamphibious\b/i, /\babyssal\b/i, /\bnightwish\b/i, /\broyal blue\b/i, /\bblue gem\b/i
  ],
  green: [
    /\bgreen\w*/i, /\bemerald\b/i, /\bgamma\b/i, /\bfire serpent\b/i, /\bcontainment\b/i,
    /\bnuclear\b/i, /\bboreal\b/i, /\bmoss\w*/i, /\bwoodland\b/i, /\beco\b/i, /\bjungle\b/i,
    /\bbamboo\b/i, /\bspalted\b/i, /\bgrass\b/i, /\bturf\b/i, /\bfoliage\b/i, /\bcamo\b/i,
    /\bovergrowth\b/i, /\batheris\b/i, /\bmonster mashup\b/i, /\bvermin\b/i, /\bhedge maze\b/i
  ],
  yellow: [
    /\byellow\w*/i, /\bgold\w*/i, /\btiger tooth\b/i, /\blore\b/i, /\bfuel injector\b/i,
    /\bgolden coil\b/i, /\bbuzz kill\b/i, /\borion\b/i, /\bchatterbox\b/i, /\bbulldozer\b/i,
    /\barabesque\b/i, /\breactor\b/i, /\bmonkey business\b/i, /\bbrass\b/i, /\bstarlight\b/i,
    /\bcommemoration\b/i, /\btarget acquired\b/i, /\bamber\b/i, /\bbronze\b/i, /\bomega\b/i,
    /\bovertake\b/i, /\byellow jacket\b/i
  ],
  purple: [
    /\bpurple\b/i, /\bviolet\b/i, /\bultraviolet\b/i, /\bfreehand\b/i, /\bplaid\b/i,
    /\bneon rider\b/i, /\bmoonrise\b/i, /\blightning strike\b/i, /\bneo-noir\b/i,
    /\bfever dream\b/i, /\bchromatic\b/i, /\bsugar rush\b/i, /\bblack lotus\b/i,
    /\bimperial\b/i, /\bsyndicate\b/i, /\bplum\b/i, /\bamethyst\b/i
  ],
  pink: [
    /\bpink\w*/i, /\bfade\b/i, /\bneon revolution\b/i, /\bdecimator\b/i, /\bmount fuji\b/i,
    /\bdisco tech\b/i, /\bhead shot\b/i, /\bvice\b/i, /\bcortex\b/i, /\bwild lotus\b/i,
    /\bcoral\b/i, /\bblossom\b/i
  ],
  orange: [
    /\borange\w*/i, /\basiimov\b/i, /\bboom\b/i, /\bblaze\b/i, /\bignition\b/i,
    /\batomic alloy\b/i, /\bcombustion\b/i, /\bsafety net\b/i, /\boxide\b/i,
    /\btiger pit\b/i, /\bfire elemental\b/i, /\bbig chomp\b/i
  ],
  white: [
    /\bwhite\w*/i, /\bprintstream\b/i, /\bwhiteout\b/i, /\bmecha\b/i, /\bhypnotic\b/i,
    /\bkami\b/i, /\bdamascus\b/i, /\bdetour\b/i, /\bpolar\b/i, /\bfranklin\b/i,
    /\bwinterized\b/i, /\btuxedo\b/i, /\bfrost\b/i, /\bsnow\b/i, /\barctic\b/i,
    /\bking snake\b/i, /\bfield agent\b/i
  ],
  black: [
    /\bblack\w*/i, /\bslate\b/i, /\bgraphite\b/i, /\bdark water\b/i, /\bnight\b/i,
    /\bcarbon\b/i, /\bdark blossom\b/i, /\bticket to hell\b/i, /\belite build\b/i,
    /\bshadow\b/i, /\bbadlands\b/i, /\basphalt\b/i, /\bironwork\b/i, /\bebony\b/i,
    /\bblack tie\b/i, /\bblack laminate\b/i
  ]
};

export function detectColor(text) {
  if (!text) return '';
  for (const [color, patterns] of Object.entries(COLOR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return color;
      }
    }
  }
  return '';
}
