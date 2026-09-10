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

// ---------------------------------------------------------------- uploads
/**
 * The four files the hub accepts, and nothing else.
 *
 * A fixed slot per file rather than a free filename. Two reasons: a player cannot fill the
 * bucket with a thousand objects, and there is no filename for anyone to play games with.
 * Uploading again replaces what is there. The real filename is kept in Firestore for display.
 */
export const UPLOAD_SLOTS = {
  passportOne: { accept: 'image/*,application/pdf', label: 'Passport photo' },
  passportTwo: { accept: 'image/*,application/pdf', label: 'Second passport photo' },
  cv: { accept: 'application/pdf', label: 'Your CV' },
  headshot: { accept: 'image/*', label: 'Your photo' },
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;   // matches storage.rules
