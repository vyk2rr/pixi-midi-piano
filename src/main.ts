import { Application, Graphics, Container, Text } from "pixi.js";
import * as Tone from "tone";
import createDefaultSynth, { SupportedSynthType } from "./createDefaultSynth";

// --- BEAT Y MIDI BPM CONTROL ---
let midiAccess: WebMidi.MIDIAccess;
let loop: Tone.Loop;

// BPM range controlado por la perilla "mode"
const minBPM = 60;
const maxBPM = 180;

// Crear beat
const kick = new Tone.MembraneSynth().toDestination();
loop = new Tone.Loop(
  (time) => {
    kick.triggerAttackRelease("C1", "8n", time);
  },
  "4n"
);

(async () => {
  // Crear la aplicación
  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Parámetros del piano
  const octaves = 2;
  const whiteNotes = ["C", "D", "E", "F", "G", "A", "B"];
  const blackNotes = ["C#", "D#", "", "F#", "G#", "A#", ""];

  // Calcula el ancho de cada tecla para ocupar todo el width
  const totalWhiteKeys = octaves * whiteNotes.length;
  const whiteKeyWidth = app.screen.width / totalWhiteKeys;
  const whiteKeyHeight = whiteKeyWidth * 4.2; // Relación de aspecto piano clásico
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 0.6;

  // Piano alineado arriba a la izquierda
  const pianoOffsetX = 0;
  const pianoOffsetY = 0;

  const piano = new Container();

  // Helper para interacción
  function makeKeyInteractive(
    key: Graphics,
    baseColor: number,
    hoverColor: number,
    activeColor: number,
    width: number,
    height: number,
    stroke: boolean = false
  ) {
    key.eventMode = "static";
    key.cursor = "pointer";
    // Guarda el color base y el estado activo en la instancia
    // @ts-ignore
    key.baseColor = baseColor;
    // @ts-ignore
    key.isActive = false;
    // @ts-ignore
    key.draw = (color: number) => {
      key.clear();
      key.rect(0, 0, width, height);
      key.fill({ color });
      if (stroke) key.stroke({ color: 0x000000, width: 2 });
    };

    key.on("pointerover", () => {
      // @ts-ignore
      if (!key.isActive) key.draw(hoverColor);
    });
    key.on("pointerout", () => {
      // @ts-ignore
      if (!key.isActive) key.draw(baseColor);
    });
    key.on("pointerdown", () => {
      // @ts-ignore
      key.isActive = true;
      // @ts-ignore
      key.draw(activeColor);
    });
    key.on("pointerup", () => {
      // @ts-ignore
      key.isActive = false;
      // @ts-ignore
      key.draw(hoverColor);
    });
    key.on("pointerupoutside", () => {
      // @ts-ignore
      key.isActive = false;
      // @ts-ignore
      key.draw(baseColor);
    });
  }

  // Mapeo de teclas MIDI a objetos visuales
  const midiNoteToKey: Record<number, Graphics> = {};

  // Utilidad para obtener el número MIDI de una nota y octava
  function getMidiNumber(note: string, octave: number) {
    // C4 = 60, C#4 = 61, D4 = 62, etc.
    return Tone.Frequency(`${note}${octave + 3}`).toMidi(); // octave+3 porque octave=1 es C1=24
  }

  // Dibuja teclas blancas
  for (let octave = 0; octave < octaves; octave++) {
    for (let i = 0; i < whiteNotes.length; i++) {
      const note = whiteNotes[i];
      const midi = getMidiNumber(note, octave);
      const key = new Graphics();
      key.rect(0, 0, whiteKeyWidth, whiteKeyHeight);
      key.fill({ color: 0xffffff });
      key.stroke({ color: 0x000000, width: 2 });
      key.x = (octave * whiteNotes.length + i) * whiteKeyWidth;
      key.y = 0;
      makeKeyInteractive(
        key,
        0xffffff,
        0xdddddd,
        0xffeb3b,
        whiteKeyWidth,
        whiteKeyHeight,
        true
      );
      piano.addChild(key);
      midiNoteToKey[midi] = key;
    }
  }

  // Dibuja teclas negras
  for (let octave = 0; octave < octaves; octave++) {
    for (let i = 0; i < blackNotes.length; i++) {
      if (blackNotes[i] === "") continue;
      const note = blackNotes[i];
      const midi = getMidiNumber(note, octave);
      const key = new Graphics();
      key.rect(0, 0, blackKeyWidth, blackKeyHeight);
      key.fill({ color: 0x000000 });
      key.x =
        (octave * whiteNotes.length + i) * whiteKeyWidth +
        whiteKeyWidth - blackKeyWidth / 2;
      key.y = 0;
      makeKeyInteractive(
        key,
        0x000000,
        0x444444,
        0xffeb3b,
        blackKeyWidth,
        blackKeyHeight,
        false
      );
      piano.addChild(key);
      midiNoteToKey[midi] = key;
    }
  }

  piano.x = pianoOffsetX;
  piano.y = pianoOffsetY;

  app.stage.addChild(piano);

  // MIDI + Tone.js + Beat
  async function setupMidiAndTone() {
    await Tone.start();

    // --- SINTETIZADOR Y EFECTOS ---
    const synth: SupportedSynthType = createDefaultSynth();
    const distortion = new Tone.Distortion(0).toDestination();
    synth.connect(distortion);
    let currentPitchBend = 0;

    // --- MIDI ---
    try {
      midiAccess = await navigator.requestMIDIAccess();

      const inputs = Array.from(midiAccess.inputs.values());
      const input = inputs[0];
      if (!input) {
        console.warn("No MIDI input found");
        return;
      }

      input.onmidimessage = (msg) => {
        const [status, data1, data2] = msg.data;

        // Log de todos los mensajes MIDI
        console.log(
          `MIDI Message: status=${status}, data1=${data1}, data2=${data2}`
        );

        // PITCH BEND
        if (status === 224) {
          const value = (data2 << 7) | data1;
          const bend = (value - 8192) / 8192;
          currentPitchBend = bend;
          synth.set({ detune: bend * 200 });
        }

        // NOTE ON
        if (status === 144 && data2 > 0) {
          const noteName = Tone.Frequency(data1, "midi").toNote();
          synth.triggerAttack(noteName);
          const key = midiNoteToKey[data1];
          if (key && typeof key.draw === "function") {
            // @ts-ignore
            key.draw(0xffeb3b);
            // @ts-ignore
            key.isActive = true;
          }
        }

        // NOTE OFF
        if ((status === 128) || (status === 144 && data2 === 0)) {
          const noteName = Tone.Frequency(data1, "midi").toNote();
          synth.triggerRelease(noteName);
          const key = midiNoteToKey[data1];
          if (key && typeof key.draw === "function") {
            // @ts-ignore
            key.draw(key.baseColor);
            // @ts-ignore
            key.isActive = false;
          }
        }

        // CONTROL CHANGE (Mod Wheel)
        if (status === 176 && data1 === 1) {
          const modValue = data2 / 127;
          synth.volume.value = -12 + modValue * 12; // de -12dB a 0dB
          distortion.distortion = modValue; // 0 a 1
        }

        // CONTROL CHANGE (Knob físico CC 20) para BPM del beat
        if (status === 176 && data1 === 20) {
          const knobValue = data2 / 127;
          const bpm = minBPM + knobValue * (maxBPM - minBPM);
          Tone.getTransport().bpm.value = bpm;
          bpmValue = bpm; // actualiza el valor global para el texto

          // Calcula el ángulo correspondiente al valor de la perilla
          const angle = bpmToAngle(bpm);
          drawKnob(angle);

          console.log(
            `%c[KNOB MODE] CC20 value: ${data2} → BPM: ${bpm.toFixed(1)}`,
            "color: orange; font-weight: bold"
          );
        }
      };
    } catch (err) {
      console.error("MIDI error", err);
    }

    // Iniciar transporte y loop
    Tone.getTransport().start();
    loop.start(0);
  }

  // Ejecuta setupMidiAndTone automáticamente al cargar
  window.addEventListener("DOMContentLoaded", () => {
    setupMidiAndTone();
  });

  // Si quieres que funcione también con el botón, puedes dejarlo:
  let audioBtn = document.getElementById("audio-btn");
  if (!audioBtn) {
    audioBtn = document.createElement("button");
    audioBtn.id = "audio-btn";
    audioBtn.textContent = "Activar audio y MIDI";
    audioBtn.style.position = "absolute";
    audioBtn.style.top = "10px";
    audioBtn.style.left = "10px";
    audioBtn.style.zIndex = "1000";
    document.body.appendChild(audioBtn);
  }

  audioBtn.addEventListener("click", async () => {
    await setupMidiAndTone();
    audioBtn.remove();
  });

  // --- KNOB VISUAL PARA BPM ---
  const knobRadius = 40;
  const knobX = app.screen.width / 2 - knobRadius;
  const knobY = piano.y + whiteKeyHeight + 30;

  let bpmValue = 120; // valor inicial
  const bpmMin = minBPM;
  const bpmMax = maxBPM;

  const knob = new Graphics();
  const bpmText = new Text(`${Math.round(bpmValue)} BPM`, {
    fill: 0x222222,
    fontSize: 18,
    fontFamily: "monospace",
    align: "center"
  });
  bpmText.anchor.set(0.5, 0); // centra el texto horizontalmente

  function drawKnob(angle: number) {
    knob.clear();
    // Círculo base
    knob.circle(knobRadius, knobRadius, knobRadius);
    knob.fill({ color: 0xeeeeee });
    knob.stroke({ color: 0x888888, width: 3 });

    // Indicador
    const indicatorLength = knobRadius * 0.8;
    const cx = knobRadius;
    const cy = knobRadius;
    const indX = cx + indicatorLength * Math.cos(angle - Math.PI / 2);
    const indY = cy + indicatorLength * Math.sin(angle - Math.PI / 2);
    knob.moveTo(cx, cy);
    knob.lineTo(indX, indY);
    knob.stroke({ color: 0x333399, width: 5 });

    // Actualiza texto BPM
    bpmText.text = `${Math.round(bpmValue)} BPM`;
    bpmText.x = knob.x + knobRadius;
    bpmText.y = knob.y + knobRadius * 2 + 10;
  }

  function bpmToAngle(bpm: number) {
    return ((bpm - bpmMin) / (bpmMax - bpmMin)) * (Math.PI * 1.5) - Math.PI * 0.75;
  }
  function angleToBpm(angle: number) {
    let norm = (angle + Math.PI * 0.75) / (Math.PI * 1.5);
    norm = Math.max(0, Math.min(1, norm));
    return bpmMin + norm * (bpmMax - bpmMin);
  }

  // Inicializa knob y texto
  knob.x = knobX;
  knob.y = knobY;
  knob.eventMode = "static";
  knob.cursor = "pointer";
  app.stage.addChild(knob);
  app.stage.addChild(bpmText);
  drawKnob(bpmToAngle(bpmValue));

  // Interacción drag para el knob
  let dragging = false;
  knob.on("pointerdown", () => {
    dragging = true;
  });
  app.stage.on("pointerup", () => {
    dragging = false;
  });
  app.stage.on("pointerupoutside", () => {
    dragging = false;
  });
  app.stage.on("pointermove", (e) => {
    if (!dragging) return;
    const local = e.global.clone();
    local.x -= knob.x + knobRadius;
    local.y -= knob.y + knobRadius;
    const angle = Math.atan2(local.y, local.x) + Math.PI / 2;
    const limited = Math.max(-Math.PI * 0.75, Math.min(Math.PI * 0.75, angle));
    bpmValue = angleToBpm(limited);
    drawKnob(limited);
    Tone.getTransport().bpm.value = bpmValue;
  });
})();
