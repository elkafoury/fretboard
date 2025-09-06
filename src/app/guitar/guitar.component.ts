import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { CommonModule } from "@angular/common";
import { WebBluetoothModule } from '@manekinekko/angular-web-bluetooth';
import * as Tone from 'tone';
 
@Component({
  standalone: true,
  selector: 'guitar-app',
  templateUrl: './guitar.component.html',
  styleUrls: ['./guitar.component.css'],
  imports: [FormsModule, CommonModule ] // Add FormsModule here
  
})



export class GuitarComponent {
  ngOnInit() {}

  // Automatically switch to Scale mode and Major scale when Circle of Fifths tab is activated
  ngOnChanges(): void {
    if (this.activeTab === 'circlefifths') {
      this.displayMode = 'Scale';
      this.selectedScale = 'Major';
    }
  }
  // Helper to check if a minor note in the inner circle is a minor chord in the suggested sequence
  isMinorChordInSequence(note: string): boolean {
    return this.chordSequenceFull.some(cs => cs.note === note && cs.chord && cs.chord.toLowerCase().includes('minor'));
  }
  // Display the chord for the clicked circle on the fretboard
  onCircleChordClick(key: string, chordTypeOverride?: string): void {
    // Use override if provided, otherwise find the chord type for this key in the current sequence
    const chordType = chordTypeOverride || this.getChordTypeForKey(key) || 'Major';
    this.displayChordOnFretboard({ note: key, chord: chordType });
    // Do NOT change selectedNote or selectedChord
  }
  isChordSequenceKey(key: string): boolean {
    return this.chordSequenceFull.some(cs => cs.note === key);
  }

  getChordTypeForKey(key: string): string {
    const found = this.chordSequenceFull.find(cs => cs.note === key);
    return found ? found.chord : '';
  }
  // Chord sequence with notes and chord types for highlighting on Circle of Fifths
  get chordSequenceFull(): { note: string; chord: string }[] {
    return this.getChordSequence();
  }
  // Notes in the current suggested chord sequence (for highlighting on Circle of Fifths)
  get chordSequenceNotes(): string[] {
    return this.getChordSequence().map(seq => seq.note);
  }
  // Circle of Fifths minor keys (relative minors, clockwise)
  circleOfFifthsMinors: string[] = [
    'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'Bb', 'F', 'C', 'G', 'D'
  ];
  // Circle of Fifths keys (clockwise)
  circleOfFifths: string[] = [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'
  ];

  // Helper for SVG label positions
  getCircleLabelPosition(index: number, radius: number = 140): { x: number; y: number } {
    const angle = (index * 30 - 90) * Math.PI / 180;
    return {
      x: 200 + radius * Math.cos(angle),
      y: 200 + radius * Math.sin(angle)
    };
  }
  showOtherNotes: boolean = false;
  private sequenceIntervalId: any = null;
  countdown: number = 0;
  sequenceInterval: number = 5000;

  private _activeTab: 'controls' | 'bluetooth' | 'chordseq' | 'circlefifths' = 'controls';
  get activeTab() {
    return this._activeTab;
  }
  set activeTab(val: 'controls' | 'bluetooth' | 'chordseq' | 'circlefifths') {
    this._activeTab = val;
    if (val === 'circlefifths') {
      this.displayMode = 'Scale';
      this.selectedScale = 'Major';
    }
  }
  fretMarkers: number[] = [1,3,5,7,9,12,15,17,19,21,23];
  handedness: 'right' | 'left' = 'right';
  notes: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  selectedNote: string = 'C';
  selectedChord: string = 'Major';
  selectedScale: string = 'Major';
  displayMode: string = 'Chord'; // Default mode is "Chord"
  animatedNotes: string[] = []; // Notes currently being animated
  clickedNote: string | null = null; // Note that was clicked
  //selectedCAGEDPatterns: string[] = ['C', 'A', 'G', 'E', 'D']; // Selected CAGED patterns to display
  cagedShapes: string[] = ['C', 'A', 'G', 'E', 'D']; 
  selectedCAGEDShapes: string[] = [];
  displayedChordNotes: string[] = []; // Notes of the currently displayed chord
  selectedChordNotes: string[] = []; // Notes of the currently selected chord
  isSequencePlaying: boolean = false; 
  activeChordIndex: number | null = null;
  ischordActive: boolean =false;

  bluetoothDevices: BluetoothDevice[] = []; // List of discovered Bluetooth devices
  connectedDevice: BluetoothDevice | null = null; // Currently connected device

  strings: string[][] = [
    this.generateString('E'), // Low E string
    this.generateString('A'), // A string
    this.generateString('D'), // D string
    this.generateString('G'), // G string
    this.generateString('B'), // B string
    this.generateString('E')  // High E string
  ];

  getDisplayedNotes(): string[] {
    return this.displayMode === 'Chord' ? this.getChordNotes() : this.getScaleNotes();
  } 
 // Dynamically calculate CAGED shapes for the selected root note
 getCAGEDShapes(): { shape: string; frets: number[] }[] {
  const rootIndex = this.notes.indexOf(this.selectedNote);
  const displayedNotes = this.getDisplayedNotes(); // Only include notes from the chord or scale

  const shapes = [
   
   //  { shape: 'C', intervals: [-1, 2, 1, -1,0, -1],rootString: 5 }, // half working c shape, root on A string
 { shape: 'C', intervals: [-1, 3, 2, 0, 1, 0], rootString: 5 }, // C shape, root on A string
 
    { shape: 'A', intervals: [0, 0, 2, 2, 2, 0], rootString: 2 }, // A shape, root on D string
    { shape: 'G', intervals: [3, 2, 0, 0, 0, 3], rootString: 4 }, // G shape, root on low E string
    { shape: 'E', intervals: [0, 2, 2, 1, 0, 0], rootString: 6}, // E shape, root on low E string
    { shape: 'D', intervals: [-1, 0, 0, 2, 3, 2], rootString: 3 } // D shape, root on G string
  ];

  // For each shape, find the fret offset so the root note matches selectedNote on rootString
  return shapes.map(shape => {
    const rootNote = this.selectedNote;
    const stringNotes = this.strings[shape.rootString - 1];
    // Find the first fret where the string matches the root note
    const rootFret = stringNotes.findIndex(n => n === rootNote);
    console.log(' first fret where the string matches the root note fret # ' + rootFret) ;
    // If not found, default to 0
    const offset =( rootFret >= 0 && shape.shape !== 'C') ?  rootFret :  rootFret-1;
     console.log(' offset # ' + offset) ;
    const frets = shape.intervals.map(interval => interval === -1 ? -1 : interval + offset);

    console.log(' frets  ---> ' + frets) ;

    if (shape.shape === 'C') {
      console.log('C shape debug:', {
        selectedNote: rootNote,
        rootString: shape.rootString,
        stringNotes,
        rootFret,
        offset,
        intervals: shape.intervals,
        frets
      });
    
    }
    return {
      shape: shape.shape,
      frets
    };
  });
}

// Filter CAGED shapes based on user selection
getFilteredCAGEDShapes(): { shape: string; frets: number[] }[] {
  const allShapes = this.getCAGEDShapes();
  // Always show selected shapes, but highlight only frets matching the selected root note
  return allShapes.filter(shape => this.selectedCAGEDShapes.includes(shape.shape));
}

toggleCAGEDShape(shape: string): void {
  if (this.selectedCAGEDShapes.includes(shape)) {
    this.selectedCAGEDShapes = this.selectedCAGEDShapes.filter(s => s !== shape);
  } else {
    this.selectedCAGEDShapes.push(shape);
  }
}

  // Generate notes for a string up to 24 frets
  generateString(openNote: string): string[] {
    const startIndex = this.notes.indexOf(openNote);
    const stringNotes = [];
    for (let i = 0; i < 24; i++) {
      stringNotes.push(this.notes[(startIndex + i) % 12]);
    }
    return stringNotes;
  }

  // Chord formulas based on intervals
  chordFormulas: { [key: string]: number[] } = {
    Major: [0, 4, 7], // Root, Major Third, Perfect Fifth
  Minor: [0, 3, 7], // Root, Minor Third, Perfect Fifth
  Seventh: [0, 4, 7, 10], // Root, Major Third, Perfect Fifth, Minor Seventh
  MinorSeventh: [0, 3, 7, 10], // Root, Minor Third, Perfect Fifth, Minor Seventh
  MajorSeventh: [0, 4, 7, 11], // Root, Major Third, Perfect Fifth, Major Seventh
  Augmented: [0, 4, 8], // Root, Major Third, Augmented Fifth
  Diminished: [0, 3, 6], // Root, Minor Third, Diminished Fifth
  Suspended2: [0, 2, 7], // Root, Major Second, Perfect Fifth
  Suspended4: [0, 5, 7], // Root, Perfect Fourth, Perfect Fifth
  Dim7: [0, 3, 6, 9], // Root, Minor Third, Diminished Fifth, Diminished Seventh
  HalfDim7: [0, 3, 6, 10], // Root, Minor Third, Diminished Fifth, Minor Seventh
  Augmented7: [0, 4, 8, 10], // Root, Major Third, Augmented Fifth, Minor Seventh
  MinorMajor7: [0, 3, 7, 11], // Root, Minor Third, Perfect Fifth, Major Seventh
  Add9: [0, 4, 7, 14], // Root, Major Third, Perfect Fifth, Major Ninth
  MinorAdd9: [0, 3, 7, 14], // Root, Minor Third, Perfect Fifth, Major Ninth
  Sixth: [0, 4, 7, 9], // Root, Major Third, Perfect Fifth, Major Sixth
  MinorSixth: [0, 3, 7, 9] // Root, Minor Third, Perfect Fifth, Major Sixth
  };

  // Scale formulas based on intervals
  scaleFormulas: { [key: string]: number[] } = {
  Major: [0, 2, 4, 5, 7, 9, 11], // Major scale: W-W-H-W-W-W-H
  Minor: [0, 2, 3, 5, 7, 8, 10], // Minor scale: W-H-W-W-H-W-W
  PentatonicMajor: [0, 2, 4, 7, 9], // Pentatonic Major scale
  PentatonicMinor: [0, 3, 5, 7, 10], // Pentatonic Minor scale
  Blues: [0, 3, 5, 6, 7, 10], // Blues scale
  HarmonicMinor: [0, 2, 3, 5, 7, 8, 11], // Harmonic Minor scale
  MelodicMinor: [0, 2, 3, 5, 7, 9, 11], // Melodic Minor scale (ascending)
  Dorian: [0, 2, 3, 5, 7, 9, 10], // Dorian mode
  Phrygian: [0, 1, 3, 5, 7, 8, 10], // Phrygian mode
  Lydian: [0, 2, 4, 6, 7, 9, 11], // Lydian mode
  Mixolydian: [0, 2, 4, 5, 7, 9, 10], // Mixolydian mode
  Locrian: [0, 1, 3, 5, 6, 8, 10], // Locrian mode
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] // Chromatic scale (all semitones)
  };


  chordMappings: { [key: string]: string[] } = {
    Major: [
      'Major', 'Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished',
      'sus2', 'sus4', 'add9', 'add7', 'Major7', 'Minor7'
    ],
    Minor: [
      'Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major', 'Major',
      'sus2', 'sus4', 'add9', 'add7', 'Minor7', 'Diminished7'
    ],
    PentatonicMajor: ['Major', 'Major', 'Major', 'Major', 'Major'], // Pentatonic Major
    PentatonicMinor: ['Minor', 'Minor', 'Minor', 'Minor', 'Minor'], // Pentatonic Minor
    Blues: ['Minor', 'Minor', 'Minor', 'Minor', 'Minor', 'Minor'], // Blues scale
    HarmonicMinor: ['Minor', 'Diminished', 'Augmented', 'Minor', 'Major', 'Major', 'Diminished'], // Harmonic Minor
    MelodicMinor: ['Minor', 'Minor', 'Augmented', 'Major', 'Major', 'Diminished', 'Diminished'], // Melodic Minor
    Dorian: ['Minor', 'Minor', 'Major', 'Major', 'Minor', 'Diminished', 'Major'], // Dorian
    Phrygian: ['Minor', 'Minor', 'Major', 'Major', 'Minor', 'Major', 'Major'], // Phrygian
    Lydian: ['Major', 'Major', 'Minor', 'Diminished', 'Major', 'Minor', 'Minor'], // Lydian
    Mixolydian: ['Major', 'Minor', 'Diminished', 'Major', 'Minor', 'Minor', 'Major'], // Mixolydian
    Locrian: ['Diminished', 'Minor', 'Major', 'Minor', 'Major', 'Major', 'Major'], // Locrian
    Chromatic: ['Unknown'] // Chromatic scale does not have standard chords
  };

  playChord(chord: { note: string; chord: string }): void {
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease(`${chord.note}4`, '1s'); // Play the chord root note for 1 second
    console.log(`Playing chord: ${chord.note} ${chord.chord}`);
  }


  
    // Display the selected chord on the fretboard with a unique style
    displayChordOnFretboard(chord: { note: string; chord: string }): void {
      const rootIndex = this.notes.indexOf(chord.note);
      console.log( "root: " + rootIndex ) ;
      const formula = this.chordFormulas [chord.chord] || []; // Default to Major chord mapping
      console.log( "formula "  + formula ) ;
     // this.selectedChordNotes = formula.map(interval => this.notes[(rootIndex + Number(interval)) % 12]);
     this.selectedChordNotes =formula.map(interval => this.notes[(rootIndex + interval) % 12]);
      console.log( this.selectedChordNotes[0]) ;

    }
  

  // Generate chord sequence suggestions for the selected scale
   getChordSequence(): { note: string; chord: string }[] {
    const formula = this.scaleFormulas[this.selectedScale];
    const rootIndex = this.notes.indexOf(this.selectedNote);
    const scaleNotes = formula.map(interval => this.notes[(rootIndex + Number(interval)) % 12]);
    const chordTypes = this.chordMappings[this.selectedScale] || [];
    return scaleNotes.map((note, index) => ({
      note: note,
      chord: chordTypes[index] || 'Unknown'
    }));
  }  

  toggleChordOnFretboard(chord: { note: string; chord: string }): void {
    const rootIndex = this.notes.indexOf(chord.note);
    const formula = this.chordFormulas [chord.chord] || []; 
    const chordNotes = formula.map(interval => this.notes[(rootIndex + Number(interval)) % 12]);

    // Toggle the chord display
    if (this.selectedChordNotes.length > 0 && this.selectedChordNotes.every(note => chordNotes.includes(note))) {
      this.selectedChordNotes = []; // Clear the chord notes if already displayed
    } else {
      this.selectedChordNotes = chordNotes; // Display the chord notes
    }
  }

  playChordSequence(): void {
    const sequence = this.getChordSequence();
    this.isSequencePlaying = true;
    let currentIndex = 0;
    const playNextChord = () => {
      this.activeChordIndex = currentIndex;
      this.toggleChordOnFretboard(sequence[currentIndex]);
      if (currentIndex < sequence.length - 1) {
        let secondsLeft = Math.floor(this.sequenceInterval / 1000);
        this.countdown = secondsLeft;
        this.sequenceIntervalId = setInterval(() => {
          secondsLeft--;
          this.countdown = secondsLeft;
          if (secondsLeft <= 0) {
            clearInterval(this.sequenceIntervalId);
            currentIndex++;
            playNextChord();
          }
        }, 1000);
      } else {
        setTimeout(() => {
          this.isSequencePlaying = false;
          this.activeChordIndex = null;
          this.countdown = 0;
          this.resetChordSequence();
        }, this.sequenceInterval);
      }
    };
    playNextChord();

  }

  stopChordSequence(): void {
    this.isSequencePlaying = false;
    this.activeChordIndex = null;
    this.countdown = 0;
    if (this.sequenceIntervalId) {
      clearInterval(this.sequenceIntervalId);
      this.sequenceIntervalId = null;
    }
  }



    // Blink the chord on the fretboard
    blinkChordOnFretboard(rootNote: string): void {
      const chordNotes = this.getChordNotesForRoot(rootNote);
      this.animatedNotes = chordNotes; // Highlight the chord notes
      setTimeout(() => (this.animatedNotes = []), 1000); // Clear animation after 1 second
    }

    
  // Get all notes for a chord based on the root note
  getChordNotesForRoot(rootNote: string): string[] {
    const rootIndex = this.notes.indexOf(rootNote);
    const formula = this.chordMappings[this.selectedScale] || [];
    return formula.map(interval => this.notes[(rootIndex + Number(interval)) % 12]);
  }

  // Get fretboard positions for the selected chord
  getFretboardForChord(): string[][] {
    const formula = this.chordFormulas[this.selectedChord];
    const rootIndex = this.notes.indexOf(this.selectedNote);

    const fretboard: string[][] = this.strings.map(string =>
      string.map(note => {
        const noteIndex = this.notes.indexOf(note);
        return formula.some(interval => (rootIndex + interval) % 12 === noteIndex) ? note : '';
      })
    );

    return fretboard  ;   //.reverse(); // Ensure low E string is at the bottom
  }

  // Get fretboard positions for the selected scale
  getFretboardForScale(): string[][] {
    const formula = this.scaleFormulas[this.selectedScale];
    const rootIndex = this.notes.indexOf(this.selectedNote);

    const fretboard: string[][] = this.strings.map(string =>
      string.map(note => {
        const noteIndex = this.notes.indexOf(note);
        return formula.some(interval => (rootIndex + interval) % 12 === noteIndex) ? note : '';
      })
    );

    return fretboard; // Ensure low E string is at the bottom
  }


  getFretboard(): string[][] {
    return this.displayMode === 'Chord' ? this.getFretboardForChord() : this.getFretboardForScale();
  }

  isRootNote(note: string): boolean {
    return note === this.selectedNote;
  }


   // Get the notes for the selected chord
   getChordNotes(): string[] {
    const formula = this.chordFormulas[this.selectedChord];
    const rootIndex = this.notes.indexOf(this.selectedNote);
    return formula.map(interval => this.notes[(rootIndex + interval) % 12]);
  }

  // Get the notes for the selected scale
  getScaleNotes(): string[] {
    const formula = this.scaleFormulas[this.selectedScale];
    const rootIndex = this.notes.indexOf(this.selectedNote);
    return formula.map(interval => this.notes[(rootIndex + interval) % 12]);
  }


  isPartOfChordOrScale(note: string): boolean {
    const chordNotes = this.getChordNotes();
    const scaleNotes = this.getScaleNotes();
    return this.displayMode === 'Chord' ? chordNotes.includes(note) : scaleNotes.includes(note);
  }



  // Render all notes on the fretboard, including SVG-specific properties
  renderFretboard(): {
    note: string,
    isPartOfChordOrScale: boolean,
    isPartOfCAGEDShape: boolean,
    isPartOfSelectedChord: boolean,
    isAnimated: boolean,
    isRootNote: boolean
  }[][] {
    const filteredShapes = this.getFilteredCAGEDShapes();
    let fretboard = this.strings.map((string, stringIndex) =>
      string.map((note, fretIndex) => {
        // Highlight root of CAGED shape as selected note
        const isCAGEDRoot = filteredShapes.some(shape =>
          shape.frets[stringIndex] === fretIndex && note === this.selectedNote
        );
        // Only show CAGED shape if interval is not -1 (not muted)
        const isPartOfCAGEDShape = filteredShapes.some(shape => shape.frets[stringIndex] === fretIndex && shape.frets[stringIndex] !== -1);
        return {
          note: note,
          isPartOfChordOrScale: this.isPartOfChordOrScale(note),
          isPartOfCAGEDShape: isPartOfCAGEDShape,
          isPartOfSelectedChord: this.selectedChordNotes.includes(note),
          isAnimated: this.isAnimated(note),
          isRootNote: this.isRootNote(note) || isCAGEDRoot
        };
      })
    );
    if (this.handedness === 'right') {
      // Reverse the order of strings for left-handed mode
      fretboard = [...fretboard].reverse();
    }
    return fretboard;
  }

  // Helper properties for SVG dimensions
  get fretboardWidth(): number {
    return this.strings[0].length * 45;
  }
  get fretboardHeight(): number {
    return this.strings.length * 50;
  }

  // Play the selected chord or scale
  async play(): Promise<void> {
    const synth = new Tone.Synth().toDestination();
    const notes = this.displayMode === 'Chord' ? this.getChordNotes() : this.getScaleNotes();

    this.animatedNotes = []; // Clear animated notes

    if (this.displayMode === 'Chord') {
      // Play all notes simultaneously for chords
        // Play notes sequentially for scales
        let time = Tone.now(); // Start scheduling from the current time
        notes.forEach((note, index) => {
          synth.triggerAttackRelease(`${note}4`, '0.5s', time);
          setTimeout(() => {
            this.animatedNotes = [note]; // Animate the current note
          }, index * 500); // Animate each note 0.5 seconds apart
          time += 0.5; // Space each note by 0.5 seconds
        });
  
        // Clear animation after the last note
        setTimeout(() => (this.animatedNotes = []), notes.length * 500);
    } else {
      // Play notes sequentially for scales
      let time = Tone.now(); // Start scheduling from the current time
      notes.forEach((note, index) => {
        synth.triggerAttackRelease(`${note}4`, '0.5s', time);
        setTimeout(() => {
          this.animatedNotes = [note]; // Animate the current note
        }, index * 500); // Animate each note 0.5 seconds apart
        time += 0.5; // Space each note by 0.5 seconds
      });

      // Clear animation after the last note
      setTimeout(() => (this.animatedNotes = []), notes.length * 500);
    }
  }

  // Check if the note is currently being animated
  isAnimated(note: string): boolean {
    return this.animatedNotes.includes(note);
  }

  playNote(note: string, stringIndex: number, fretIndex: number): void {
    const synth = new Tone.Synth().toDestination();
    synth.triggerAttackRelease(`${note}4`, '0.5s'); // Play the note for 0.5 seconds

    // Animate the clicked note
    this.animatedNotes = [note];
    this.clickedNote = `String ${6 - stringIndex}, Fret ${fretIndex}: ${note}`; // Display the clicked note
    setTimeout(() => (this.animatedNotes = []), 500); // Clear animation after 0.5 seconds
  }




  // Discover nearby Bluetooth devices
  async discoverDevices(): Promise<void> {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true, // Accept all devices
        optionalServices: [] // Add specific services if needed
      });

      if (device) {
        this.bluetoothDevices.push(device);
      }
    } catch (error) {
      console.error('Error discovering Bluetooth devices:', error);
    }
  }

  // Connect to a selected Bluetooth device
  async connectToDevice(device: BluetoothDevice): Promise<void> {
    try {
      const server = await device.gatt?.connect();
      if (server) {
        this.connectedDevice = device;
        console.log('Connected to device:', device.name);
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }

  // Disconnect from the currently connected device
  disconnectDevice(): void {
    if (this.connectedDevice?.gatt?.connected) {
      this.connectedDevice.gatt.disconnect();
      console.log('Disconnected from device:', this.connectedDevice.name);
      this.connectedDevice = null;
    }
  }
 
  resetChordSequence() {
    this.activeChordIndex = null;
    this.selectedChordNotes = [];
    this.displayedChordNotes = [];
    this.isSequencePlaying = false;
    this.ischordActive = false;
  }


}
