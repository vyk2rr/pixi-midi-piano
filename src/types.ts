import * as Tone from "tone";
export const OCTAVES_RANGE = [1, 2, 3, 4, 5, 6, 7] as const;
export const BASE_NOTES = [
  'C', 'D', 'E', 'F', 'G', 'A', 'B'
] as const;
export const NOTES = [
  'Ab', 'A', 'A#', 'Bb', 'B', 'B#', 'Cb', 'C', 'C#', 'Db',
  'D', 'D#', 'Eb', 'E', 'E#', 'Fb', 'F', 'F#', 'Gb', 'G', 'G#'
] as const;
export const SHARP_TO_FLAT_MAP: Partial<Record<tNoteName, tNoteName>> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb"
};
export const CHORD_QUALITIES = [
  'maj', 'min', 'dim', 'aug',
  'sus2', 'sus4',
  'maj7', 'm7', 'dom7',
  'maj9', 'm9', 'dom9',
  'maj11', 'm11', 'dom11',
  'maj13', 'm13', 'dom13'
] as const;
export const MODES = [
  'ionian', 'dorian', 'phrygian',
  'lydian', 'mixolydian', 'aeolian',
  'locrian'
] as const;

export type tOctaveRange = typeof OCTAVES_RANGE[number]; // example: 1, 2, 3, 4, 5
export type tChordQualities = typeof CHORD_QUALITIES[number]; // "maj", "min", "dim", etc.

export type tMode = typeof MODES[number]; // example: "ionian", "dorian", etc.
export type tNote = typeof BASE_NOTES[number]; // example: "C", "D", "E", etc.
export type tNoteName = typeof NOTES[number]; // example: "C", "Db", "E#", etc.
export type tNoteWithOctave = `${tNoteName}${tOctaveRange}`; // example: "C4", "D#5", "Bb3", etc.
export type tNoteWQuality = `${tNoteName}${tChordQualities}`; // example: "Cmaj", "Dmin", "E#sus4", etc.
export type tNoteWOCtaveQuality = `${tNoteName}${tOctaveRange}${tChordQualities}`; // example: "C3maj", "Dmin", "E#sus4", etc.
export type tPercentString = `${number}%`; // example: "7.5%"
export type tTime = Tone.Unit.Time; // example: "4n", "2m", "1:2:3", etc.

export type tChord = tNoteWithOctave[]
export type tChordSequence = tChord[]

export type tChordWithName = {
  id: string; // note+type 
  quality: tChordQualities, // Ejemplo: "maj", "min", "sus4", etc.
  rootNote: tNoteName, // Ejemplo: "C", "D#", "E#", etc.
  name: string; // baseNoteName+type Ej: "Cmaj", "Dmin", "E#sus4"
  displayNotes: string; // Ej: "C E G"; 
  chord: tChord; // notas en logica completa para piano
}

export type tChordMap = Record<string, tNoteWithOctave[]>;

export type tPianoNotes = {
  white: tNoteWithOctave[];
  black: tNoteWithOctave[];
};

export type tSequenceToPlayProps = {
  sequenceToPlay: tChordSequence;
  onSequenceEnd: () => void;
  highlightedKeys?: boolean;
}

export const CHORD_INTERVALS: Record<tChordQualities, number[]> = {
  // casa posición del array representa 
  // la cantidad de semitonos desde la tónica
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
  dom9: [0, 4, 7, 10, 14],
  maj11: [0, 4, 7, 11, 14, 17],
  m11: [0, 3, 7, 10, 14, 17],
  dom11: [0, 4, 7, 10, 14, 17],
  maj13: [0, 4, 7, 11, 14, 17, 21],
  m13: [0, 3, 7, 10, 14, 17, 21],
  dom13: [0, 4, 7, 10, 14, 17, 21],
};

export interface iChordEvent {
  pitches: tChord;
  time: string;           // Tiempo musical (ej: "0:0:1", "1m", "4n")
  duration: tTime;
  velocity?: number;
  highlightGroup?: 1 | 2;
  scheduledPlayTime?: number;
}

export type tMelodySequence = iChordEvent[];