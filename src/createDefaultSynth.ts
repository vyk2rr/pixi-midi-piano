import * as Tone from "tone";
export type SupportedSynthType = Tone.PolySynth;

export default function createDefaultSynth(): SupportedSynthType {
  const synth = new Tone.PolySynth(Tone.Synth, {
    volume: -8,
    envelope: {
      attack: 0.002,
      decay: 0.5,
      sustain: 0.15,
      release: 1.5
    },
    oscillator: {
      type: "sine"
    }
  });

  const filter = new Tone.Filter({
    type: "lowpass",
    frequency: 5000,
    Q: 1
  });

  const compressor = new Tone.Compressor({
    threshold: -20,
    ratio: 3,
    attack: 0.003,
    release: 0.25
  });

  const reverb = new Tone.Reverb({
    decay: 1.5,
    wet: 0.2
  }).toDestination();

  // Conecta la cadena de efectos
  synth.chain(filter, compressor, reverb);

  // Retorna el PolySynth real, que sí tiene .toDestination()
  return synth;
}

