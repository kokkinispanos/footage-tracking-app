import {
  Video, Star, Film, Image as ImageIcon, FolderUp,
  ShieldCheck, BarChart3, Phone, Award, Globe,
} from 'lucide-react';

/**
 * What the phone bar shows on each tab, and which section counter drives each tick.
 * Kept out of SectionNav.jsx so that file exports a component and nothing else.
 */
export const FOOTAGE_NAV = [
  { anchor: 'full-games', key: 'fullGames', icon: Video, label: 'Games' },
  { anchor: 'top-clips', key: 'topThreeClips', icon: Star, label: 'Top 3' },
  { anchor: 'skill-clips', key: 'skillClips', icon: Film, label: 'Skills' },
  { anchor: 'photos', key: 'photos', icon: ImageIcon, label: 'Photos' },
  { anchor: 'drive-folder', key: 'driveFolder', icon: FolderUp, label: 'Drive' },
];

export const ABOUT_NAV = [
  { anchor: 'identity', key: 'identity', icon: ShieldCheck, label: 'You' },
  { anchor: 'player-card', key: 'playerCard', icon: BarChart3, label: 'Numbers' },
  { anchor: 'contact', key: 'contact', icon: Phone, label: 'Contact' },
  { anchor: 'deliverables', key: 'deliverables', icon: Award, label: 'Finished' },
  { anchor: 'platforms', key: 'platforms', icon: Globe, label: 'Online' },
];
