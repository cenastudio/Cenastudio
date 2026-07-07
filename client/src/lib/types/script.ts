/**
 * Script Types - Professional Screenplay Editor
 * Hollywood Standard Format
 */

export type ScriptElementType =
  | 'scene_heading'    // INT/EXT. LOCATION - TIME
  | 'action'           // Description, full width
  | 'character'        // CHARACTER NAME (uppercase)
  | 'dialogue'         // Character speech
  | 'parenthetical'    // (wryly) - character direction
  | 'transition'       // CUT TO:, FADE IN:, etc
  | 'shot'             // CLOSE ON, ANGLE ON, etc
  | 'note';            // Production notes

export interface ScriptElementFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface ScriptElement {
  id: string;
  type: ScriptElementType;
  content: string;
  formatting?: ScriptElementFormatting;
  sceneNumber?: number;
  revisionMark?: string;  // Color: pink, blue, yellow...
  note?: string;          // Production note
}

export interface ScriptMetadata {
  title: string;
  subtitle?: string;
  author: string;
  basedOn?: string;         // "Based on X by Y"
  contact?: string;
  draftNumber: number;      // Draft 1, 2, 3...
  draftDate: Date;
  copyright?: string;
  wga?: string;            // WGA Registration number
  genre?: string;
  logline?: string;
  synopsis?: string;
}

export interface ScriptRevision {
  draftNumber: number;
  date: Date;
  changes: string;
  color: string;
}

export interface ScriptStats {
  pageCount: number;
  estimatedTime: number;    // minutes (1 page = 1 minute)
  sceneCount: number;
  characterCount: number;
  locationCount: number;
  dialogueCount: number;
}

export interface CharacterStats {
  name: string;
  sceneCount: number;
  dialogueCount: number;
  firstAppearance: number;  // scene number
}

export interface LocationStats {
  location: string;
  intExt: 'INT' | 'EXT' | 'INT/EXT';
  timeOfDay: string;
  sceneCount: number;
}

export interface Script {
  id: number;
  projectId?: number;
  metadata: ScriptMetadata;
  content: ScriptElement[];
  revisions: ScriptRevision[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default empty script
 */
export const createEmptyScript = (): Omit<Script, 'id' | 'createdAt' | 'updatedAt'> => ({
  metadata: {
    title: 'Untitled Script',
    author: '',
    draftNumber: 1,
    draftDate: new Date(),
  },
  content: [
    {
      id: crypto.randomUUID(),
      type: 'transition',
      content: 'FADE IN:',
    },
  ],
  revisions: [],
});

/**
 * Create a new script element
 */
export const createElement = (
  type: ScriptElementType,
  content: string = ''
): ScriptElement => ({
  id: crypto.randomUUID(),
  type,
  content,
});

/**
 * Screenplay formatting rules
 */
interface ScreenplayFormatRule {
  uppercase: boolean;
  indent: number;
  width: number;
  italic?: boolean;
  alignRight?: boolean;
}

export const SCREENPLAY_FORMAT: Record<ScriptElementType, ScreenplayFormatRule> = {
  scene_heading: {
    uppercase: true,
    indent: 0,
    width: 60,
  },
  action: {
    uppercase: false,
    indent: 0,
    width: 60,
  },
  character: {
    uppercase: true,
    indent: 22,
    width: 38,
  },
  dialogue: {
    uppercase: false,
    indent: 10,
    width: 35,
  },
  parenthetical: {
    uppercase: false,
    indent: 15,
    width: 25,
    italic: true,
  },
  transition: {
    uppercase: true,
    indent: 45,
    width: 15,
    alignRight: true,
  },
  shot: {
    uppercase: true,
    indent: 0,
    width: 60,
  },
  note: {
    uppercase: false,
    indent: 0,
    width: 60,
    italic: true,
  },
};

/**
 * Common transitions
 */
export const TRANSITIONS = [
  'FADE IN:',
  'FADE OUT.',
  'CUT TO:',
  'DISSOLVE TO:',
  'SMASH CUT TO:',
  'MATCH CUT TO:',
  'JUMP CUT TO:',
  'WIPE TO:',
  'FADE TO BLACK.',
] as const;

/**
 * Common shot types
 */
export const SHOT_TYPES = [
  'CLOSE ON',
  'CLOSE UP',
  'EXTREME CLOSE UP',
  'MEDIUM SHOT',
  'WIDE SHOT',
  'ANGLE ON',
  'POV',
  'INSERT',
  'MONTAGE',
  'SERIES OF SHOTS',
] as const;

/**
 * Time of day options
 */
export const TIME_OF_DAY = [
  'DAY',
  'NIGHT',
  'DAWN',
  'DUSK',
  'MORNING',
  'AFTERNOON',
  'EVENING',
  'LATER',
  'CONTINUOUS',
  'SAME TIME',
] as const;
