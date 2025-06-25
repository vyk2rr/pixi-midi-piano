import * as Tone from "tone";

export type SupportedSynthType = Tone.PolySynth;

export default function createDefaultSynth(): SupportedSynthType {
  // PolySynth con un sonido más profundo y resonante, simulando una sitara
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: {
      attack: 0.005,
      decay: 0.3,
      sustain: 0.05,
      release: 2 // liberación larga para alargar la resonancia
    }
  });

  // Filtrado semi-oriental para resaltar armónicos tipo sitar
  const filter = new Tone.Filter({
    type: "bandpass",
    frequency: 1200,
    Q: 1.5
  });

  // Efecto de retroalimentación para prolongar el final de las notas
  const delay = new Tone.FeedbackDelay({
    delayTime: 0.06,
    feedback: 0.38,
    wet: 0.3
  });

  // Reverb con mayor decaimiento, simulando caja de resonancia
  const reverb = new Tone.Reverb({
    decay: 4,
    wet: 0.3
  });

  // Conecta los efectos en cadena
  synth.chain(filter, delay, reverb, Tone.Destination);

  return synth;
}

