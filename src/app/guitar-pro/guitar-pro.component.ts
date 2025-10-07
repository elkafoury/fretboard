import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy,NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as alphaTab from '@coderline/alphatab';
import { SmartLightBluetoothService } from '../smart-light-bluetooth.service';
import { WebBluetoothModule } from '@manekinekko/angular-web-bluetooth';
import { delay } from 'rxjs';

interface PlaybackPosition {
  currentTick: number;
  endTick: number;
  currentTimeMillis: number;
  endTimeMillis: number;
  isLooping: boolean;
}
interface Track {
  index: number;
  name: string;
  shortName: string;
  color: string;
  channel: any;
  isVisible: boolean;
  isMute: boolean;
  isSolo: boolean;
  score: any;
  playbackInfo: any;
  fretCount: number;
  tuning: number[];
}
interface note {
  fret: number; 
  gstring: number;
}

@Component({
  selector: 'guitar-pro',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './guitar-pro.component.html',
  styleUrls: ['./guitar-pro.component.css']
})
export class GuitarProComponent implements AfterViewInit, OnDestroy {
  @ViewChild('alphaTabContainer', { static: false }) alphaTabContainer!: ElementRef;

  private api: any;
  private score: any;
  private arrayBuffer?: ArrayBuffer;
  isLoading = false;
  isLoaded = false;
  isPlaying = false;
  currentTempo = 100;
  tracks: Track[] = [];
  selectedTracks: number[] = [];
  currentSelectedTrackIndex: number =0; // Track the currently selected track
  autoScrollEnabled = true;
  playbackPosition: PlaybackPosition | null = null;
  loopEnabled: boolean = false;
  playednote?: note = { fret: -1, gstring: -1 }; // to keep track of last played note
  
  bluetoothDevices : BluetoothDevice[] = []; // List of discovered Bluetooth devices
  connectedDevice: BluetoothDevice | null = null; 
    constructor(public smartLightBluetoothService: SmartLightBluetoothService, private ngZone: NgZone) {

    this.isLoading = false;

  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.destroy();
    }
  }



  private initializeAlphaTab() {
    if (this.api) {
      this.api.destroy();
    } 
   
    this.api = new alphaTab.AlphaTabApi(this.alphaTabContainer.nativeElement, {
      //enableLazyLoading:  true,
      core: {
        engine: 'html5',
        //  tex: true,
        logLevel: 1,
        fontDirectory: 'assets/fonts/' // <-- path to your font files

      },
      display: {
        staveProfile: "Default",
        resources: {
          // staffLineColor: "rgb(200, 10, 110)"
        },
      },
      notation: {
        notationMode: 'GuitarPro',
        fingeringMode: 'SingleNoteEffectBand',

      },
      player: {
        enablePlayer: true,
        // outputMode : 'WebAudio',
        //  soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2', 

        soundFont: 'assets/sound_fonts/sonivox.sf2',
        // soundFont:'assets/sound_fonts/guitar_nylon.sf2',
        scrollMode: alphaTab.ScrollMode.OffScreen,
        enableCursor: true,
        //  PlayerMode: 'RealTime',
        scrollElement: this.alphaTabContainer.nativeElement, // this is the element to scroll during playback
        enableElementHighlighting: true,
        enableUserInteraction: true,
        enableAnimatedBeatCursor: true,
        scrollSpeed: 400, // Example: 400ms for scrolling speed
        //  scrollOffsetY: 50, // Example: 50px vertical offset
      }

    });
    this.api.midiEventsPlayedFilter = [alphaTab.midi.MidiEventType.NoteOn, alphaTab.midi.MidiEventType.NoteOff];
    this.api.load(this.arrayBuffer);
    //this.api.loadSoundFont('assets/sound_fonts/guitar_nylon.sf2');
    this.api.beatMouseDown.on((beat: any) => {
      console.log('Beat clicked:   ', beat);
      this.startSelectionOnBeat(beat);
    });

    const overlay = this.alphaTabContainer.nativeElement.querySelector('.at-overlay');
    this.api.renderStarted.on(() => {
      overlay.style.display = "flex";
    });
    this.api.renderFinished.on(() => {
      overlay.style.display = "none";
    });

    /* this.api.soundFontLoad.on((e: { loaded: number; total: number }) => {
      const percentage = Math.floor((e.loaded / e.total) * 100);
        const  playerIndicator = this.alphaTabContainer.nativeElement.querySelector('.at-controls .at-player-progress');
     
      playerIndicator.innerText = percentage + "%";
    });
       */


    // Set up event listeners
    this.api.scoreLoaded.on((score: any) => {
      console.log('Score loaded:', score);
      this.onScoreLoaded(score);
    });

    this.api.playerReady.on(() => {
      console.log('Player ready');
      //  const  playerIndicator = this.alphaTabContainer.nativeElement.querySelector('.at-controls .at-player-progress'); 
      // playerIndicator.style.display = 'none';
    });

    this.api.playerStateChanged.on((state: any) => {
      this.isPlaying = state.state === 1; // 1 = playing
    });

    this.api.playerPositionChanged.on((position: any) => {
       // console.log('Player position changed:', position);
      if (!position) {
        this.playbackPosition = null;
        return;
      }


      this.playbackPosition = {
        currentTick: position.currentTick,
        endTick: position.endTick,
        currentTimeMillis: position.currentTime,
        endTimeMillis: position.endTime,
        isLooping: position.isLooping || false
      };
    });


// elkafouri use this midi event listerner to get note on and note off events
   this.api.midiEventsPlayed.on((e: any)=> {
            // for (const midi of e.events) { // loop through all played events
            //   console.log('MIDI Event:', midi.command, midi.noteKey, midi.message, midi.track);
            //     if (midi.type === alphaTab.midi.MidiEventType.NoteOn) { // if a NoteOn event was played, update the UI
            //         //const notePosition = this.getFretAndString(midi.noteKey, midi.track);
            //         console.log(`MIDI Note On: ${midi.noteKey}   `);
            //     }else if (midi.type === alphaTab.midi.MidiEventType.NoteOff) {  
            //         console.log(`MIDI Note Off: ${midi.noteKey}`);
            //   }
            // }
        });




/* 
    this.api.midiEventsPlayed.on((event: any) => {
  // Type guard: check if midiEvents exists and is an array
  if (event && Array.isArray(event.events)) { //event.events[0]
    for (const midiEvent of event.events) {
      console.log('MIDI Event:', midiEvent.command, midiEvent.note, midiEvent.data1);
      // ...rest of your logic...

      if (midiEvent.command === 128 && midiEvent.data1 > 0) {
               
                const notePosition = this.getFretAndString(midiEvent.noteKey,midiEvent.track);
                console.log(`MIDI Note On: ${midiEvent.noteKey}`);
                if (notePosition) {
                    console.log(`Note ON: Fret ${notePosition.fret} on String ${notePosition.string}`);
                    // Your custom logic here, e.g., highlight the fretboard
                }

          if (midiEvent ==typeof('NoteOnEvent')) {
              console.log(`Note started: Key=${event.note.realValue}, Channel=${event.channel}`);
              // You can use the event data to apply visual effects or other logic.
          }

          // A NoteOff event signals that a note has finished playing.
          if (midiEvent.isNoteOff) {
              console.log(`Note finished: Key=${event.note.realValue}, Channel=${event.channel}`);
              // You can remove any active visual effects for this note.
          }





     }

       










    }
  } else {
    console.warn('No midiEvents property on event:', event);
  }
}); */

/* 
         this.api.midiEventsPlayed.on((event: any) => {
        console.log('MIDI Events Played:    ', event);
        const { midiEvents } = event;
    
        for (const event of midiEvents) {
          console.log('MIDI Event:', event.command, event.note, event.data1);
            if (event.command === 144 && event.data1 > 0) {
                const noteNumber = event.note;
                const notePosition = this.getFretAndString(noteNumber, this.api.score.tracks[0]);
                console.log(`MIDI Note On: ${noteNumber}`);
                if (notePosition) {
                    console.log(`Note ON: Fret ${notePosition.fret} on String ${notePosition.string}`);
                    // Your custom logic here, e.g., highlight the fretboard
                }
            }

       if (event.isNoteOn) {
              console.log(`Note started: Key=${event.note.realValue}, Channel=${event.channel}`);
              // You can use the event data to apply visual effects or other logic.
          }

          // A NoteOff event signals that a note has finished playing.
        if (event.isNoteOff) {
              console.log(`Note finished: Key=${event.note.realValue}, Channel=${event.channel}`);
              // You can remove any active visual effects for this note.
        }






        }
    });    */

/*        this.api.midiEventsPlayed.on((event: any) => {
        console.log('MIDI Events Played:    ', event);
        const { midiEvents } = event;
    
        for (const event of midiEvents) {
          console.log('MIDI Event:', event.command, event.note, event.data1);
            if (event.command === 144 && event.data1 > 0) {
                const noteNumber = event.note;
                const notePosition = this.getFretAndString(noteNumber, this.api.score.tracks[0]);
    console.log(`MIDI Note On: ${noteNumber}`);
                if (notePosition) {
                    console.log(`Note ON: Fret ${notePosition.fret} on String ${notePosition.string}`);
                    // Your custom logic here, e.g., highlight the fretboard
                }
            }
        }
    });   */

/*     this.api.midiLoad.on((e: any) => {
      // e.midiData contains an array of all MIDI events for the entire song.
      console.log("MIDI events generated:", e.midiData);
    }); */

    ////
    /* this.api.midiEventsPlayed.on(e => {
      for (const midiEvent of e.events) {
        if (midiEvent.type === alphaTab.midi.MidiEventType.NoteOn) {
          console.log(`Note started: Key ${midiEvent.noteKey} on channel ${midiEvent.channel}`);
          // Here you can add your custom logic, such as highlighting the note
        } else if (midiEvent.type === alphaTab.midi.MidiEventType.NoteOff) {
          console.log(`Note ended: Key ${midiEvent.noteKey} on channel ${midiEvent.channel}`);
          // Here you can add your custom logic, such as removing highlighting
        }
      }
    }); */


    ///



    // Auto-scroll functionality
    this.api.playbackRangeChanged.on((range: any) => {
      console.log('Playback range changed:', range);
      if (this.autoScrollEnabled && this.isPlaying) {
        this.scrollToCurrentPosition(range);
      }
    });

 
    

    const activeNotes = new Set();
    this.api.playedBeatChanged.on((beat: any) => {
     // console.log('Current beat: ------> ', beat);
    const newActiveNotes = new Set();

      if (this.autoScrollEnabled && this.isPlaying) {
        this.highlightCurrentBeat(beat);
      }
      // Log note, fret, and string for each note in the beat
      if (beat && beat.notes) {
        beat.notes.forEach((note: any) => {
/*
          // note.string is 1-based (1 = high E, 6 = low E)
          // note.fret is the fret number
          // note.value is the MIDI note number
          console.log(
            ` Fret: ${note.fret}, String: ${note.string}  note played`
          );

        if (this.connectedDevice){
           this.sendToBluetooth(note.fret, note.string, true);
        }

*/


newActiveNotes.add(note);
    //find the noted the just finished playing (in activeNotes but not in newActiveNotes)
  for (const note of activeNotes) {
          if (!newActiveNotes.has(note)) {
              // Note finished playing
              const typedNote = note as {  fret: number; string: number };
              console.log(`Note finished: Fret ${typedNote.fret}, String ${typedNote.string}`);
              // TODO: Call your custom function for a note starting
               setTimeout(() => {  
              this.sendToBluetooth(typedNote.fret, typedNote.string, false); 
               }, 50); // Adjust the delay as needed
                  
          }
      }

    // Find notes that just started playing (in newActiveNotes but not in activeNotes)
    for (const note of newActiveNotes) {
        if (!activeNotes.has(note)) {
            // Note started playing
            const typedNote = note as {  fret: number; string: number };
            console.log(`Note started: Fret ${typedNote.fret}, String ${typedNote.string}`);
            // TODO: Call your custom function for a note starting
                   this.sendToBluetooth(typedNote.fret, typedNote.string, true);     
        }
    }

// Update the set of active notes for the next event
    activeNotes.clear();
    for (const note of newActiveNotes) {
        activeNotes.add(note);
    }




/* teeeesetttttt*/












/* end test*/


        });
      }

  
    });


/* this.api.activeBeatsChanged.on((args: any) => {
    // args.activeBeats is an array of all beats that are currently active.
    for (const beat of args.activeBeats) {
        // beat.notes is an array of all notes in the active beat.
        for (const note of beat.notes) {
            // Check if the note is a fretted note.
                 console.log(`active note changed: ` ,note);
            if (note.isFrettedNote) {
                console.log(`String: ${note.string}, Fret: ${note.fret}`);
            }
        }
    }
}); */



//const activeNotes = new Set();

/* this.api.activeBeatsChanged.on((args: any) => {
    // A Set to hold the notes that just became active
    const newActiveNotes = new Set();

    // Loop through the currently active beats in the selected track
   if(args.activeBeats[this.currentSelectedTrackIndex] ) {
     for (const note of args.activeBeats[this.currentSelectedTrackIndex].notes) {
            newActiveNotes.add(note);
        }
    }
       
   

    // Find notes that just started playing (in newActiveNotes but not in activeNotes)
    for (const note of newActiveNotes) {
        if (!activeNotes.has(note)) {
            // Note started playing
            const typedNote = note as {  fret: number; string: number };
            console.log(`Note started: Fret ${typedNote.fret}, String ${typedNote.string}`);
            // TODO: Call your custom function for a note starting
              if (this.connectedDevice){

               
                   this.sendToBluetooth(typedNote.fret, typedNote.string, true);
              
              
              }
    }
  }

    // Find notes that just finished playing (in activeNotes but not in newActiveNotes)
    for (const note of activeNotes) {
        if (!newActiveNotes.has(note)) {
            // Note finished playing
             const typedNote = note as {  fret: number; string: number };
            console.log(`Note finished: Fret ${typedNote.fret}, String ${typedNote.string}`);
            // TODO: Call your custom function for a note starting
              if (this.connectedDevice){
                this.sendToBluetooth(typedNote.fret, typedNote.string, false);
              }
             
        }
    }

    // Update the set of active notes for the next event
    activeNotes.clear();
    for (const note of newActiveNotes) {
        activeNotes.add(note);
    }
}); */

/// end of active notes tracking




    
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.loadFile(file);
    }
  }

  private loadFile(file: File) {
    this.isLoading = true;
    this.isLoaded = false;

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = (e) => {
      this.arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        this.isLoaded = true;
        setTimeout(() => {
          if (this.alphaTabContainer && this.alphaTabContainer.nativeElement) {
            console.log('Element is now in the DOM:', this.alphaTabContainer.nativeElement);
            this.initializeAlphaTab();
          }
        }, 10);
      } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file. Please make sure it\'s a valid Guitar Pro file.');
        this.isLoading = false;
        this.isLoaded = false;
      }
    };

    reader.onerror = () => {
      alert('Error reading file.');
      this.isLoading = false;
      this.isLoaded = false;
    };

    
  }

  private onScoreLoaded(score: any) {
    this.score = score;
    this.isLoading = false;
    this.isLoaded = true;
    this.initializeTracks();
    /*  this.alphaTabContainer.nativeElement.querySelector(".at-song-title").innerText = score.title;
     this.alphaTabContainer.nativeElement.querySelector(".at-song-artist").innerText = score.artist; */
  }

  private initializeTracks() {
    this.tracks = this.score.tracks.map((track: any, index: number) => ({
      index: index,
      name: track.name,
      shortName: track.shortName,
      color: this.getTrackColor(index),
      channel: track.playbackInfo,
      isVisible: true,
      isMute: false,
      isSolo: false,
      score: track.score,
      playbackInfo: track.playbackInfo,
      fretCount: track,
      tuning: track.tuning
    }));

    console.log('Initialized tracks:', this.tracks);
    // Render all tracks initially
    this.updateTrackVisibility();
    // Select all tracks by default
    //this.selectedTracks = this.tracks.map(t => t.index);
    // select first track by default
    this.toggleTrackSelection(0); // Select the first track by default
  }

  private getTrackColor(index: number): string {
    const colors = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#e91e63'
    ];
    return colors[index % colors.length];
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.api.pause();
    } else {
      this.api.play();
    }
  }

  stop() {
    this.api.stop();
    this.playbackPosition = null;
  }

  setTempo(event: any) {
    const tempo = parseInt(event.target.value);
    this.currentTempo = tempo;
    this.api.playbackSpeed = tempo / 100;
  }

  toggleAutoScroll() {
    // Auto-scroll setting is handled in the playbackRangeChanged event
    if (!this.autoScrollEnabled) {
      // Reset any existing scroll animations
      this.resetScrollPosition();
    }
  }

  formatPosition(position: PlaybackPosition): string {
    const currentMinutes = Math.floor(position.currentTimeMillis / 60000);
    const currentSeconds = Math.floor((position.currentTimeMillis % 60000) / 1000);
    const totalMinutes = Math.floor(position.endTimeMillis / 60000);
    const totalSeconds = Math.floor((position.endTimeMillis % 60000) / 1000);

    const formatTime = (min: number, sec: number) =>
      `${min}:${sec.toString().padStart(2, '0')}`;

    return `${formatTime(currentMinutes, currentSeconds)} / ${formatTime(totalMinutes, totalSeconds)}`;
  }

  private scrollToCurrentPosition(range: any) {
    // Smooth scroll to the current playback position
    const container = this.alphaTabContainer.nativeElement;
    const scoreElements = container.querySelectorAll('.at-cursor-beat');

    if (scoreElements.length > 0) {
      const currentBeat = scoreElements[0]; // Get the first (current) beat cursor
      if (currentBeat) {
        currentBeat.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }

  private highlightCurrentBeat(beat: any) {
    // Add visual highlighting to the current beat being played
    const container = this.alphaTabContainer.nativeElement;

    // Remove previous highlights
    const previousHighlights = container.querySelectorAll('.current-beat-highlight');
    previousHighlights.forEach((element: Element) => {
      element.classList.remove('current-beat-highlight');
    });

    // Find and highlight current beat
    const beatElements = container.querySelectorAll(`[data-beat-id="${beat.id}"]`);
    beatElements.forEach((element: Element) => {
      element.classList.add('current-beat-highlight');
    });
  }

  private resetScrollPosition() {
    const container = this.alphaTabContainer.nativeElement;
    if (container) {
      container.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }
  }

  /*   toggleTrackSelection(trackIndex: number) {
      if (this.selectedTracks.includes(trackIndex)) {
        this.selectedTracks = this.selectedTracks.filter(i => i !== trackIndex);
      } else {
        this.selectedTracks.push(trackIndex);
      }
    } */
  toggleTrackSelection(trackIndex: number) {
    this.currentSelectedTrackIndex = trackIndex; // Track the selected track
    this.selectedTracks = [trackIndex];
    this.tracks.forEach((track, idx) => {
      track.isVisible = idx === trackIndex;
    });
    this.updateTrackVisibility();
    this.updateTrackPlayback();
  }



  toggleMute(trackIndex: number) {
    const track = this.tracks[trackIndex];
    track.isMute = !track.isMute;

    if (track.isSolo) {
      track.isSolo = false;
    }

    this.updateTrackPlayback();
  }

  toggleSolo(trackIndex: number) {
    const track = this.tracks[trackIndex];
    track.isSolo = !track.isSolo;

    if (track.isMute) {
      track.isMute = false;
    }

    // If soloing, mute other tracks; if un-soloing, unmute all
    const hasSoloTracks = this.tracks.some(t => t.isSolo);

    this.tracks.forEach(t => {
      if (t.index !== trackIndex && hasSoloTracks) {
        t.isMute = !t.isSolo;
      } else if (!hasSoloTracks) {
        t.isMute = false;
      }
    });

    this.updateTrackPlayback();
  }

  toggleTrackVisibility(trackIndex: number) {
    const track = this.tracks[trackIndex];
    track.isVisible = !track.isVisible;
    this.updateTrackVisibility();
  }

  /*  private updateTrackPlayback() {
     this.tracks.forEach((track, index) => {
       try {
         this.api.changeTrackMute([index], track.isMute);
       } catch (error) {
         console.warn(`Could not mute track ${index}:`, error);
       }
     });
   } */
  private updateTrackPlayback() {
    // Mute all tracks except the selected one
    this.tracks.forEach((track, index) => {
      const shouldMute = !this.selectedTracks.includes(index);
      track.isMute = shouldMute;
      try {
        console.log(`Updating track ${index} mute state to ${shouldMute}`);
        this.api.changeTrackMute([index], shouldMute);
      } catch (error) {
        console.warn(`Could not mute track ${index}:`, error);
      }
    });
  }
  private updateTrackVisibility() {
    const visibleTracks = this.tracks
      .filter(track => track.isVisible);
    //  .map(track => track.index);

    try {
      console.log('successfully updated track visibility:', this.tracks);
      this.api.renderTracks(visibleTracks);
    } catch (error) {
      console.warn('Could not update track visibility:', error);
    }
  }

  selectAllTracks() {
    this.selectedTracks = this.tracks.map(t => t.index);
  }

  deselectAllTracks() {
    this.selectedTracks = [];
  }

  muteAllTracks() {
    this.tracks.forEach(track => {
      track.isMute = true;
      track.isSolo = false;
    });
    this.updateTrackPlayback();
  }

  unmuteAllTracks() {
    this.tracks.forEach(track => {
      track.isMute = false;
      track.isSolo = false;
    });
    this.updateTrackPlayback();
  }

  trackByIndex(index: number, track: Track): number {
    return track.index;
  }

  startSelectionOnBeat(beat: any) {
    // Clear any existing selections
    if (!this.api.selection || !beat) return;
    this.api.selection.clear();

    // Add a new selection for the specified beat on the first track
    // Note: The 'beat' object from the event contains all necessary information,
    // including its track and voice index.
    const track = beat.masterBar.score.tracks[0];
    this.api.selection.add(track, beat.voice, beat);

    // Render the selection
    this.api.render();
  }


  // A simple function to convert note numbers to string/fret
  getFretAndString(noteNumber: number, track: Track): { string: number; fret: number } | null {

    const tuning = track.tuning;
    // Iterate from the lowest string (highest index) to the highest string
    for (let string = tuning.length - 1; string >= 0; string--) {
      const openStringNote = tuning[string]; // Note number of the open string
      // Check if the played note is on this string
      if (noteNumber >= openStringNote) {
        const fret = noteNumber - openStringNote;
        if (fret <= track.fretCount) { // Ensure it's within the fretboard limit
          return { string: string + 1, fret : fret }; // Strings are 1-based
        }
      }
    }
    return null; // No match found
  };

  toggleLoop() {
    if (this.api && this.api.player) {
      this.api.player.isLooping = this.loopEnabled;
    }
  }




  // bluetooth related functions
// Call discoverDevices on SmartLightBluetoothService
  async discoverDevices(): Promise<void> {
     this.isLoading = true;
     this.bluetoothDevices = []; // Clear previous devices   
 try { 
      (await this.smartLightBluetoothService.discoverDevices()).map(device => { 
          this.ngZone.run(() => {
          this.bluetoothDevices.push(device);
          this.isLoading = false;
        });
        });
    } catch (err) {
      //this.error = err.message || 'An unknown error occurred.';
      this.bluetoothDevices = []; // Clear any previous data
    } finally {
      this.isLoading = false; // Hide spinner
    }
  }  
async connectToDevice(device: BluetoothDevice): Promise<void> {
  this.isLoading = true;
  this.connectedDevice = null; // Clear previous device
  try {
    const connected = await this.smartLightBluetoothService.connectToDevice(device);
    this.ngZone.run(() => {
      this.connectedDevice = device;
      this.isLoading = false;
    });
  } catch (err) {
    //this.error = err.message || 'An unknown error occurred.';
    this.connectedDevice = null; // Clear any previous data
  } finally {
    this.isLoading = false; // Hide spinner
  }
}


   disconnectDevice(): void {
   this.smartLightBluetoothService.disconnectDevice();
      if (this.connectedDevice) {
        console.log('Disconnected from device:', this.connectedDevice.name);
      } else {
        console.log('Disconnected from device: (no device was connected)');
      }
      this.connectedDevice = null;
    }
   
  async sendToBluetooth(fret:number , gstring:number, on: boolean): Promise<void> {
     
      await this.smartLightBluetoothService.setLedByfretAndString(fret, gstring, on);
     
  }

   async  reset( ): Promise<void> {
     
      await this.smartLightBluetoothService.reset();
     
  }
  








}
/*

   // position.beat is the current beat object
         if (position && position.beat && position.beat.notes) {
    position.beat.notes.forEach((note: any) => {
      console.log(
        `Note: MIDI ${note.value}, Fret: ${note.fret}, String: ${note.string}`
      );
    });
  }  
 if (!this.score || !position) return;

  const currentTick = position.currentTick;

  //  console.log('this score is '  +  this.score);
              
//(Score.tracks[].staves[].bars)
//Voice (Score.tracks[].staves[].voices[])
//Score > Track > Staff > Bar > Voice > Beat > Note

  // For each track, find the notes at the current tick
  this.score.tracks.forEach((track: any, trackIdx: number) => {
   // console.log('this track is '  +  track.name);
  track.staves.forEach((stave: any) => {
    //   console.log('this stave is '  +  stave);
    stave.bars.forEach((bar: any) => {

  //console.log('this bar is '  +  bar);
      bar.voices.forEach((voice: any) => {
        voice.beats.forEach((beat: any) => {
          
  //console.log('this beat is '  +  beat);
        //  if (beat.startTick === currentTick && beat.notes) {
              console.log(  ' current tick is ' + currentTick + '   beat start tick is ' + beat.startTick);
            beat.notes.forEach((note: any) => {
         //     console.log('this is the note        ' +  note);
              console.log(
                ` Note: MIDI ${note.value}, Fret: ${note.fret}, String: ${note.string}`
              );
            });
        //  }
        });
      });
    });
});
  });




*/