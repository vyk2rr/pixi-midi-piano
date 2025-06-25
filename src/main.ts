import { Application, Graphics, Container } from "pixi.js";
import * as Tone from "tone";

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

  // MIDI + Tone.js
  async function setupMidiAndTone() {
    // Inicializa Tone.js (necesario para que suene en navegadores modernos)
    await Tone.start();

    // Crea un sintetizador simple
    const synth = new Tone.Synth().toDestination();

    // Solicita acceso a MIDI
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((midiAccess) => {
        for (const input of midiAccess.inputs.values()) {
          input.onmidimessage = (msg) => {
            const [status, note, velocity] = msg.data;
            // Nota ON
            if (status === 144 && velocity > 0) {
              const noteName = Tone.Frequency(note, "midi").toNote();
              synth.triggerAttack(noteName);

              // Resalta la tecla visual
              const key = midiNoteToKey[note];
              if (key) {
                // Usa la función draw del helper para mantener consistencia
                // @ts-ignore
                if (typeof key.draw === "function") {
                  // @ts-ignore
                  key.draw(0xffeb3b); // Amarillo
                  // Marca como activa para evitar que el mouse la sobrescriba
                  // @ts-ignore
                  key.isActive = true;
                } else {
                  // Fallback por si no existe draw (no debería pasar)
                  key.clear();
                  if (key.height === whiteKeyHeight) {
                    key.rect(0, 0, whiteKeyWidth, whiteKeyHeight);
                    key.fill({ color: 0xffeb3b });
                    key.stroke({ color: 0x000000, width: 2 });
                  } else {
                    key.rect(0, 0, blackKeyWidth, blackKeyHeight);
                    key.fill({ color: 0xffeb3b });
                  }
                }
              }
            }
            // Nota OFF
            if ((status === 128) || (status === 144 && velocity === 0)) {
              synth.triggerRelease();
              const key = midiNoteToKey[note];
              if (key) {
                // @ts-ignore
                if (typeof key.draw === "function") {
                  // @ts-ignore
                  key.draw(key.baseColor); // Restaura color base
                  // @ts-ignore
                  key.isActive = false;
                } else {
                  key.clear();
                  if (key.height === whiteKeyHeight) {
                    key.rect(0, 0, whiteKeyWidth, whiteKeyHeight);
                    key.fill({ color: 0xffffff });
                    key.stroke({ color: 0x000000, width: 2 });
                  } else {
                    key.rect(0, 0, blackKeyWidth, blackKeyHeight);
                    key.fill({ color: 0x000000 });
                  }
                }
              }
            }
          };
        }
      });
    } else {
      console.warn("Web MIDI API no soportada en este navegador.");
    }
  }

  setupMidiAndTone();
})();
