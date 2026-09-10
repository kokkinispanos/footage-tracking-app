/**
 * Every question the hub asks about the player, in one place.
 *
 * The five footage sections live in catalog.js. These are the five that go around them:
 * who he is, his numbers, how we reach him, his finished work, and where he is already
 * online. Each one feeds something real further down the program, and the comment on each
 * group says what.
 *
 * All the wording here is written for a tired sixteen year old reading on a phone. Short
 * words. Short sentences. Say what to do, not what the field is called.
 */

// ---------------------------------------------------------------- countries
// Passport country decides which countries a player can even be sent to, so this is the
// single highest-value answer in the whole app. EU and EEA first because that is the split
// that matters; the rest is there so nobody has to type "Other".
export const EU_EEA = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Norway',
  'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden',
];

export const OTHER_COUNTRIES = [
  'Albania', 'Algeria', 'Argentina', 'Australia', 'Bosnia and Herzegovina', 'Brazil',
  'Cameroon', 'Canada', 'Chile', 'Colombia', 'Costa Rica', 'Ivory Coast', 'Ecuador',
  'Egypt', 'England', 'Georgia', 'Ghana', 'Israel', 'Jamaica', 'Japan', 'Kosovo', 'Mexico',
  'Moldova', 'Montenegro', 'Morocco', 'New Zealand', 'Nigeria', 'North Macedonia',
  'Northern Ireland', 'Paraguay', 'Peru', 'Russia', 'Saudi Arabia', 'Scotland', 'Senegal',
  'Serbia', 'South Africa', 'South Korea', 'Switzerland', 'Tunisia', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Venezuela',
  'Wales',
];

export const ALL_COUNTRIES = [...EU_EEA, ...OTHER_COUNTRIES].sort();

export const isEuEea = (country) => EU_EEA.includes(country);

// ---------------------------------------------------------------- identity
export const FAMILY_RELATIONS = [
  { value: 'mother', label: 'My mum' },
  { value: 'father', label: 'My dad' },
  { value: 'grandmother', label: 'My grandma' },
  { value: 'grandfather', label: 'My grandad' },
];

export const WORK_STATUS = [
  { value: 'eu-passport', label: 'Yes. I have a passport from an EU country.' },
  { value: 'has-visa', label: 'Yes. I have a visa or a permit.' },
  { value: 'needs-visa', label: 'No. I would need a visa first.' },
  { value: 'not-sure', label: 'I do not know.' },
];

/**
 * The three yes/no answers Stage 3 will not start without.
 *
 * Each one is a real permission the player gives, so each is stored with the date he ticked
 * it. Nothing here is ticked for him and nothing is ticked by default.
 */
export const CONSENTS = [
  {
    key: 'shareContact',
    label: 'Clubs can see my email and my Instagram.',
    why: 'A club that likes you needs a way to answer.',
  },
  {
    key: 'emailClubs',
    label: 'Pro Placement can email clubs for me.',
    why: 'We send the emails. They come from your name, so replies come back to you.',
  },
  {
    key: 'parentEmail',
    label: 'The person paying can get my Monday update.',
    why: 'One short email a week that says what we did and what came back.',
  },
];

// ---------------------------------------------------------------- player card
export const FOOT = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'both', label: 'Both' },
];

export const PLAY_LEVEL = [
  { value: 'pro', label: 'Professional' },
  { value: 'semi-pro', label: 'Semi professional' },
  { value: 'academy', label: 'Academy' },
  { value: 'college', label: 'College or university' },
  { value: 'amateur', label: 'Amateur or Sunday league' },
  { value: 'none', label: 'No club right now' },
];

export const COMMON_LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Greek',
  'Polish', 'Romanian', 'Serbian', 'Croatian', 'Albanian', 'Turkish', 'Arabic', 'Russian',
  'Ukrainian', 'Swedish', 'Norwegian', 'Danish',
];

/**
 * Measured numbers, as separate boxes with the unit written on them.
 *
 * They used to be one free text box, and what came out of it was
 * "Top Speed/ 32 km/hour, Distance sprint: 120m 13seconds, 7 saves avr per game, 6 foot 7
 * tall" in a single cell that then went in front of clubs. One box per number fixes that.
 */
export const OUTFIELD_NUMBERS = [
  { key: 'topSpeedKmh', label: 'Your top speed', unit: 'km/h', hint: 'The fastest you have been clocked.' },
  { key: 'distanceKm', label: 'How far you run in a game', unit: 'km', hint: 'A normal full game.' },
  { key: 'sprintsPerGame', label: 'Sprints in a game', unit: 'sprints', hint: 'How many times you go full speed.' },
  { key: 'longestSprintM', label: 'Your longest sprint', unit: 'metres', hint: 'One run, at full speed.' },
];

export const KEEPER_NUMBERS = [
  { key: 'savesPerGame', label: 'Saves in a game', unit: 'saves', hint: 'Your average.' },
  { key: 'cleanSheets', label: 'Clean sheets this season', unit: 'games', hint: 'Games where you let nothing in.' },
  { key: 'distributionM', label: 'How far you can kick it', unit: 'metres', hint: 'From your hands or the floor.' },
  { key: 'topSpeedKmh', label: 'Your top speed', unit: 'km/h', hint: 'Only if you have been clocked.' },
];

// ---------------------------------------------------------------- platforms
/**
 * Where a scout can already find him.
 *
 * `phase2_visibility.md` line 211 says, in Panos's own words: "No internal tracker for which
 * platforms each client is live on, currently tribal knowledge per client folder." This is
 * that tracker. The player fills it in as he goes live and the coach sees it at a glance.
 */
export const PLATFORMS = [
  { key: 'transfermarkt', label: 'Transfermarkt', kind: 'scouting', hint: 'Most clubs check this one first.' },
  { key: 'wyscout', label: 'Wyscout', kind: 'scouting', hint: 'Scouts watch clips here.' },
  { key: 'soccerway', label: 'Soccerway', kind: 'scouting', hint: 'Your games and stats.' },
  { key: 'aiscout', label: 'aiScout', kind: 'scouting', hint: 'You film drills on your phone.' },
  { key: 'tonsser', label: 'Tonsser', kind: 'scouting', hint: 'Big for young players.' },
  { key: 'skouted', label: 'Skouted', kind: 'scouting', hint: 'Clubs post trials here.' },
  { key: 'veo', label: 'Veo', kind: 'scouting', hint: 'If your club films with Veo.' },
  { key: 'hudl', label: 'Hudl', kind: 'scouting', hint: 'If your club uses Hudl.' },
  { key: 'instagram', label: 'Instagram', kind: 'social', hint: 'Where most clubs message you.' },
  { key: 'youtube', label: 'YouTube', kind: 'social', hint: 'Your highlights can live here.' },
  { key: 'tiktok', label: 'TikTok', kind: 'social', hint: 'Only if you post football.' },
  { key: 'x', label: 'X (Twitter)', kind: 'social', hint: 'Some scouts still use it.' },
  { key: 'linkedin', label: 'LinkedIn', kind: 'social', hint: 'Good for agents.' },
  { key: 'facebook', label: 'Facebook', kind: 'social', hint: 'Still big in some countries.' },
];

export const PLATFORM_STATUS = [
  { value: 'live', label: 'Done', tone: 'success' },
  { value: 'todo', label: 'Not yet', tone: 'warning' },
  { value: 'na', label: 'Not for me', tone: 'neutral' },
];

// ------------------------------------------------------- the rest of his game
/**
 * Everything below was added for the CV.
 *
 * The CV is written for him from what is in this app, so anything the CV needs and the app
 * cannot hold is a question somebody has to ask him again by hand. These are those questions.
 * A player spends five extra minutes here and nobody chases him for a week.
 */

/** What he played, not just where. "20 games" means a different thing in an U19 side. */
export const TEAM_LEVELS = [
  { value: 'first', label: 'First team' },
  { value: 'reserves', label: 'Reserves or B team' },
  { value: 'u23', label: 'U23 or U21' },
  { value: 'u19', label: 'U19 or U18' },
  { value: 'academy', label: 'Academy' },
  { value: 'college', label: 'College or university' },
  { value: 'other', label: 'Something else' },
];

/** A club that is about to fly him in wants to know if he can be talked to. */
export const LANGUAGE_LEVELS = [
  { value: 'native', label: 'First language' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'ok', label: 'Can get by' },
  { value: 'basic', label: 'A few words' },
];

export const RELOCATION = [
  { value: 'anywhere', label: 'Anywhere. I will go.' },
  { value: 'europe', label: 'Europe only' },
  { value: 'depends', label: 'Depends where it is' },
  { value: 'no', label: 'Not right now' },
];

/** A trial usually lands with about three days' notice, so this is a real question. */
export const TRIAL_NOTICE = [
  { value: 'now', label: 'I could go this week' },
  { value: 'week', label: 'I need about a week' },
  { value: 'month', label: 'I need about a month' },
  { value: 'season', label: 'After my season ends' },
];

export const WEAK_FOOT = [
  { value: 'strong', label: 'Nearly as good' },
  { value: 'ok', label: 'I can use it' },
  { value: 'weak', label: 'I barely use it' },
];

/**
 * What he is good at, as taps rather than an empty box.
 *
 * An empty box marked "your strengths" gets left blank or gets one word. A list gets tapped,
 * and what he taps is the raw material for the strengths block on his CV.
 */
export const STRENGTH_TAGS = [
  'Speed', 'Stamina', 'Strength in a duel', 'Heading', 'First touch', 'Passing range',
  'Long passing', 'Crossing', 'Dribbling', 'Finishing', 'Tackling', 'Interceptions',
  'Positioning', 'Reading the game', 'Pressing', 'Work rate', 'Leadership', 'Composure',
  'Set pieces', 'Free kicks', 'Penalties', 'One v one defending', 'Recovery runs',
  'Both feet',
];

export const GK_STRENGTH_TAGS = [
  'Shot stopping', 'Reflexes', 'Commanding the box', 'Crosses', 'Distribution with hands',
  'Distribution with feet', 'Playing out from the back', 'One v one saves', 'Penalty saves',
  'Organising the defence', 'Communication', 'Positioning', 'Reading the game', 'Composure',
];

// ---------------------------------------------------------------- uploads
/**
 * The four files the hub accepts, and nothing else.
 *
 * A fixed slot per file rather than a free filename: a player cannot fill the database with
 * a thousand objects, and there is no filename for anyone to play games with. Uploading
 * again replaces what is there. The real filename is kept beside it, for display only.
 *
 * The passports are photos, not PDFs. That is deliberate: a photo can be shrunk on the phone
 * until it fits, and "take a photo of the page with your face on it" is an instruction
 * everybody can follow. A PDF cannot be shrunk, so the CV has a real ceiling and a link as
 * the way out.
 */
export const UPLOAD_SLOTS = {
  passportOne: { accept: 'image/*', label: 'Passport photo', file: 'passport-1' },
  passportTwo: { accept: 'image/*', label: 'Second passport photo', file: 'passport-2' },
  cv: { accept: 'application/pdf', label: 'Your CV', file: 'cv' },
  headshot: { accept: 'image/*', label: 'Your photo', file: 'headshot' },
  // The family answer is the highest-value line in the app, and a birth certificate is what
  // turns it from something he thinks into something a club can act on. A photo or a PDF,
  // because these arrive as both.
  familyProof: { accept: 'image/*,application/pdf', label: 'Proof of your family link', file: 'family-proof' },
};

/** The slot ids, in the order the export bundles them. */
export const UPLOAD_SLOT_KEYS = Object.keys(UPLOAD_SLOTS);

/**
 * The size limits, and where they come from.
 *
 * Files are stored as base64 inside a Firestore document, because Firebase Storage needs the
 * paid plan and this project stays on the free one. A Firestore document tops out at 1 MiB
 * INCLUDING field names and overhead, and base64 makes a file about a third bigger than it
 * started. 900,000 characters of base64 is roughly 660 KB of real file and leaves comfortable
 * room under the ceiling.
 */
export const MAX_STORED_CHARS = 900000;              // ~660 KB of actual file
export const MAX_PDF_BYTES = 640 * 1024;             // a PDF cannot be shrunk, so this is real
export const MAX_FILE_BYTES = 25 * 1024 * 1024;      // a photo is shrunk; this just catches silly
