/**
 * The vocabulary of the hub: positions, skill categories, photo types.
 *
 * These lists were written out separately inside SignUp, Section3 and Section4. Adding the
 * export gave a fourth place to forget, so they live here once and every screen imports them.
 * If a category is renamed here, the dashboard, the admin view and the export all agree.
 *
 * The `key` values are stored in the database. Change a `label` freely; changing a `key`
 * orphans whatever players have already saved under the old one.
 */

export const POSITIONS = [
  "Goalkeeper",
  "Center Back",
  "Full Back / Wing Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Winger",
  "Striker",
];

export const FIELD_CATEGORIES = [
  { key: 'passing', label: 'Passing & vision' },
  { key: 'dribbling', label: 'Dribbling & 1v1 attacking' },
  { key: 'defending', label: 'Defending & 1v1 defensive' },
  { key: 'finishing', label: 'Finishing / ball striking' },
  { key: 'movement', label: 'Movement off the ball' },
  { key: 'pressing', label: 'Pressing & hustle' },
  { key: 'aerial', label: 'Aerial duels' },
  { key: 'other', label: 'Other skills' },
];

export const GK_CATEGORIES = [
  { key: 'saves', label: 'Shot stopping / saves' },
  { key: 'distribution', label: 'Distribution (hands & feet)' },
  { key: 'commandingTheBox', label: 'Commanding the box / crosses' },
  { key: '1v1Situations', label: '1v1 situations / sweeping' },
  { key: 'organizingDefense', label: 'Communication / organising' },
];

/** Which categories matter most for this position, so a player knows where to double down. */
export const KEY_FOR_POSITION = {
  'Goalkeeper': ['saves', 'distribution', 'commandingTheBox'],
  'Center Back': ['defending', 'aerial', 'passing'],
  'Full Back / Wing Back': ['defending', 'dribbling', 'movement'],
  'Defensive Midfielder': ['defending', 'passing', 'pressing'],
  'Central Midfielder': ['passing', 'movement', 'dribbling'],
  'Attacking Midfielder': ['passing', 'dribbling', 'finishing'],
  'Winger': ['dribbling', 'finishing', 'movement'],
  'Striker': ['finishing', 'movement', 'aerial'],
};

export const PHOTO_TYPES = [
  { key: 'cleanKit', label: 'Clean kit & boots', desc: 'Full body, standing straight, professional look.' },
  { key: 'actionShot', label: 'Action shot', desc: 'In a game, showing intensity.' },
  { key: 'training', label: 'Training', desc: 'At training, on the ball or with a coach.' },
  { key: 'headshot', label: 'Headshot', desc: 'Confident, good light, face clearly visible.' },
  { key: 'teamPhoto', label: 'Team photo', desc: 'Starting XI. Tell us which one is you.' },
  { key: 'lifestyle', label: 'Lifestyle', desc: 'Off the pitch, still professional.' },
];

export const isGoalkeeper = (position) =>
  (position || '').toLowerCase().includes('goalkeeper');

/** Every skill category that exists, whatever the position — the export needs all of them. */
export const ALL_SKILL_CATEGORIES = [...FIELD_CATEGORIES, ...GK_CATEGORIES];

export const skillLabel = (key) =>
  ALL_SKILL_CATEGORIES.find((c) => c.key === key)?.label || key;

export const photoLabel = (key) =>
  PHOTO_TYPES.find((p) => p.key === key)?.label || key;
