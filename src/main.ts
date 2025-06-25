import { Application, Graphics, Container, Text } from "pixi.js";
import * as Tone from "tone";
import createDefaultSynth, { SupportedSynthType } from "./createDefaultSynth";

// --- BEAT Y MIDI BPM CONTROL ---
let midiAccess: WebMidi.MIDIAccess;
let loop: Tone.Loop;

const minBPM = 30;
const maxBPM = 300;
const initialBPM = 30;

// Tabla grave (bayan)
const tablaBayan = new Tone.MembraneSynth({
  pitchDecay: 0.04,
  octaves: 2,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 }
}).toDestination();

// Tabla agudo (dayan)
const tablaDayan = new Tone.MetalSynth({
  frequency: 200,
  envelope: { attack: 0.001, decay: 0.12, release: 0.01 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
}).toDestination();

// Sintetizador para "Tin" en Teen Taal
const tablaTin = new Tone.Synth({
  oscillator: { type: "triangle" },
  envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.15 }
}).toDestination();

// Slap de tabla
const tablaSlap = new Tone.MembraneSynth({
  pitchDecay: 0.008,
  octaves: 2,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 }
}).toDestination();

(async () => {
  // Crear la aplicación
  const app = new Application();
  await app.init({ background: "#1099bb", resizeTo: window });
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Parámetros del piano
  const octaves = 2;
  const whiteNotes = ["C", "D", "E", "F", "G", "A", "B"];
  const blackNotes = ["C#", "D#", "", "F#", "G#", "A#", ""];

  const totalWhiteKeys = octaves * whiteNotes.length;
  const whiteKeyWidth = app.screen.width / totalWhiteKeys;
  const whiteKeyHeight = whiteKeyWidth * 4.2;
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const blackKeyHeight = whiteKeyHeight * 0.6;

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

  // --- TEEN TAAL VISUAL ---
  const teenTaalSyllables = [
    "Dha", "Dhin", "Dhin", "Dha",
    "Dha", "Dhin", "Dhin", "Dha",
    "Dha", "Tin",  "Tin",  "Ta",
    "Ta",  "Dhin", "Dhin", "Dha"
  ];

  const syllableContainer = new Container();
  const syllableTexts: Text[] = [];
  const syllableFontSize = 48;
  const syllableSpacingX = 130;
  const syllableSpacingY = 60;
  const syllablesPerRow = 4;

  for (let i = 0; i < teenTaalSyllables.length; i++) {
    const txt = new Text(teenTaalSyllables[i], {
      fontFamily: "monospace",
      fontSize: syllableFontSize,
      fill: 0x000000,
      fontWeight: "bold"
    });
    txt.anchor.set(0.5, 0); // centra horizontalmente
    // Calcula posición en 4 filas de 4 columnas
    const row = Math.floor(i / syllablesPerRow);
    const col = i % syllablesPerRow;
    txt.x = col * syllableSpacingX + syllableSpacingX / 2;
    txt.y = row * syllableSpacingY;
    syllableContainer.addChild(txt);
    syllableTexts.push(txt);
  }

  // Centra el container debajo del piano
  syllableContainer.x = (app.screen.width - syllablesPerRow * syllableSpacingX) / 2;
  syllableContainer.y = piano.y + whiteKeyHeight + 160;
  app.stage.addChild(syllableContainer);

  // --- TEEN TAAL LOOP ---
  const teenTaalLength = 16;
  let teenStep = 0;
  loop = new Tone.Loop((time) => {
    const syllable = teenTaalSyllables[teenStep];
    triggerTablaSyllable(syllable, time);

    // VISUAL: todas las sílabas en negro, solo la activa en amarillo
    for (let i = 0; i < syllableTexts.length; i++) {
      syllableTexts[i].visible = true; // Siempre visibles
      if (i === teenStep) {
        syllableTexts[i].style.fill = 0xffeb3b; // Amarillo para la activa
      } else {
        syllableTexts[i].style.fill = 0x000000; // Negro para las inactivas
      }
      syllableTexts[i].style.fontSize = 48;
    }

    teenStep = (teenStep + 1) % teenTaalLength;
  }, "16n");

  // --- MIDI + Tone.js + Beat ---
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

        // NOTE ON (velocidad > 0) para trigger de sílabas
        if (status === 137 && data2 > 0) {
          // Normaliza la fuerza [0..127] a [0..1]
          const velocity = data2 / 127;

          switch (data1) {
            case 40:
              triggerTablaSyllable("Dha", Tone.now(), velocity);
              break;
            case 41:
              triggerTablaSyllable("Dhin", Tone.now(), velocity);
              break;
            case 42:
              triggerTablaSyllable("Tin", Tone.now(), velocity);
              break;
            case 43:
              triggerTablaSyllable("Ta", Tone.now(), velocity);
              break;
            default:
              break;
          }
        }
      };
    } catch (err) {
      console.error("MIDI error", err);
    }

    // Iniciar transporte y loop
    Tone.getTransport().bpm.value = initialBPM;
    Tone.getTransport().start();
    // loop.start(0);
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

  let bpmValue = initialBPM; // valor inicial
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

  // Crea un botón para disparar el Teen Taal manualmente
  const teenTaalBtn = document.createElement("button");
  teenTaalBtn.textContent = "Play Teen Taal";
  teenTaalBtn.style.position = "absolute";
  teenTaalBtn.style.top = "250px";
  teenTaalBtn.style.left = "10px";
  teenTaalBtn.style.zIndex = "1000";
  document.body.appendChild(teenTaalBtn);

  teenTaalBtn.addEventListener("click", () => {
    loop.start(0);
  });

  function triggerTablaSyllable(syllable: string, time: number, velocity = 1) {
    switch (syllable) {
      case "Dha":
        tablaBayan.triggerAttackRelease("A1", "4n", time, velocity);
        tablaDayan.triggerAttackRelease("16n", time, velocity * 0.7);
        break;
      case "Dhin":
        tablaBayan.triggerAttackRelease("C2", "8n", time, velocity);
        break;
      case "Tin":
        tablaDayan.triggerAttackRelease("F#5", "16n", time, velocity * 0.5);
        break;
      case "Ta":
        tablaDayan.triggerAttackRelease("D#5", "8n", time, velocity * 0.4);
        break;
      default:
        break;
    }
  }
})();
