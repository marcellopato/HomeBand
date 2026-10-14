import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DrummerConfig, MidiNote } from '../types/audio';

export const useDrummerStore = defineStore('drummer', () => {
  const config = ref<DrummerConfig>({
    x: 0.6, // Simple <-> Complex
    y: 0.75, // Soft <-> Loud / Intense
    fillsFrequency: 4,
    swing: 0.15,
    ghostNotes: true,
    activeKit: 'acoustic-rock'
  });

  // Procedural Drum Pattern Generator (GarageBand Drummer Emulation)
  function generateDrumPattern(numBars: number = 4): MidiNote[] {
    const notes: MidiNote[] = [];
    let noteIdCounter = 0;
    const { x, y, fillsFrequency, swing } = config.value;

    const baseVelocity = Math.floor(65 + y * 55); // 65 to 120
    const accentVelocity = Math.min(127, baseVelocity + 15);
    const ghostVelocity = Math.max(30, Math.floor(baseVelocity * 0.45));

    for (let bar = 0; bar < numBars; bar++) {
      const barStartBeat = bar * 4;
      const isFillBar = (bar + 1) % fillsFrequency === 0;

      // 1. Crash on downbeat of 1st bar or right after fill
      if (bar === 0 || bar % fillsFrequency === 0) {
        notes.push({
          id: `drum-${noteIdCounter++}`,
          pitch: 49, // Crash
          start: barStartBeat,
          duration: 1.0,
          velocity: accentVelocity
        });
      }

      // 2. Regular Groove (Beats 1 & 2, and beats 3 & 4 if not filling)
      const maxBeatInBar = isFillBar ? 2 : 4;

      for (let beat = 0; beat < maxBeatInBar; beat++) {
        const beatPos = barStartBeat + beat;

        // Kick Drum placement
        if (beat === 0) {
          notes.push({ id: `kick-${noteIdCounter++}`, pitch: 36, start: beatPos, duration: 0.5, velocity: accentVelocity });
        } else if (beat === 2 && x < 0.6) {
          notes.push({ id: `kick-${noteIdCounter++}`, pitch: 36, start: beatPos, duration: 0.5, velocity: baseVelocity });
        } else if (x >= 0.5 && (beat === 1 || beat === 2)) {
          // Syncopated kick on offbeat
          const kickSwing = swing * 0.25;
          notes.push({ id: `kick-${noteIdCounter++}`, pitch: 36, start: beatPos + 0.5 + kickSwing, duration: 0.5, velocity: baseVelocity });
        }

        // Snare Drum (Classic 2 and 4 backbeat)
        if (beat === 1 || beat === 3) {
          notes.push({ id: `snare-${noteIdCounter++}`, pitch: 38, start: beatPos, duration: 0.5, velocity: accentVelocity });
        }

        // Snare Ghost notes when Complex (X > 0.6)
        if (x > 0.65 && beat === 2) {
          notes.push({ id: `ghost-${noteIdCounter++}`, pitch: 38, start: beatPos + 0.75, duration: 0.25, velocity: ghostVelocity });
        }

        // Hi-Hat Subdivisions (Simple = 8ths, Complex = 16ths)
        const subdivisions = x > 0.7 ? 4 : 2; // 16th or 8th notes
        for (let s = 0; s < subdivisions; s++) {
          const subFraction = s / subdivisions;
          const swingOffset = (s % 2 === 1) ? swing * 0.15 : 0;
          const isOffbeatAccent = (s === 1 && y > 0.6);
          const isHatOpen = (beat === 3 && s === subdivisions - 1 && y > 0.8);

          notes.push({
            id: `hat-${noteIdCounter++}`,
            pitch: isHatOpen ? 46 : 42, // 46 = Open, 42 = Closed
            start: beatPos + subFraction + swingOffset,
            duration: 0.2,
            velocity: isOffbeatAccent ? accentVelocity : Math.floor(baseVelocity * 0.75)
          });
        }
      }

      // 3. Drum Fill on beats 3 & 4 of fill bars
      if (isFillBar) {
        // Tom & Snare roll fill
        notes.push({ id: `fill-snare1`, pitch: 38, start: barStartBeat + 2.0, duration: 0.25, velocity: baseVelocity });
        notes.push({ id: `fill-snare2`, pitch: 38, start: barStartBeat + 2.5, duration: 0.25, velocity: accentVelocity });
        notes.push({ id: `fill-tom1`, pitch: 48, start: barStartBeat + 3.0, duration: 0.25, velocity: accentVelocity }); // High tom
        notes.push({ id: `fill-tom2`, pitch: 45, start: barStartBeat + 3.25, duration: 0.25, velocity: baseVelocity }); // Mid tom
        notes.push({ id: `fill-tom3`, pitch: 41, start: barStartBeat + 3.5, duration: 0.5, velocity: accentVelocity }); // Low tom
      }
    }

    return notes;
  }

  function setCoordinates(newX: number, newY: number) {
    config.value.x = Math.max(0, Math.min(1, newX));
    config.value.y = Math.max(0, Math.min(1, newY));
  }

  return {
    config,
    generateDrumPattern,
    setCoordinates
  };
});
