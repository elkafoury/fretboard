import { Component,OnInit,  ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
declare var alphaTab: any;
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

@Component({
  selector: 'guitar-pro',
  standalone: true,
  imports: [CommonModule,   FormsModule],
  templateUrl: './guitar-pro.component.html',
  styleUrls: ['./guitar-pro.component.css']
})
export class GuitarProComponent  implements AfterViewInit, OnDestroy {
  @ViewChild('alphaTabContainer', { static: false }) alphaTabContainer!: ElementRef;

  private api: any;
  private score: any;

  isLoaded = false;
  isLoading = false;
  isPlaying = false;
  currentTempo = 100;
  tracks: Track[] = [];
  selectedTracks: number[] = [];
  autoScrollEnabled = true;
  playbackPosition: PlaybackPosition | null = null;

  loopEnabled: boolean = false;

  ngAfterViewInit() {
    this.loadAlphaTab();
  }

  ngOnDestroy() {
    if (this.api) {
      this.api.destroy();
    }
  }

  private loadAlphaTab() {
    // Load AlphaTab from CDN
    if (typeof alphaTab === 'undefined') {
      const script = document.createElement('script');
    //   script.src = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js';
   
    script.src = 'assets/alphaTab17.min.js';
    //  script.src = 'assets/alphaTab1.0.1.min.js';

   script.onload = () => {


   // this.initializeAlphaTab(); // do that on file load
        
      };
      document.head.appendChild(script);
    } else {
    //  this.initializeAlphaTab(); // do that on file load
    }
  }

  private initializeAlphaTab() {
    const settings = {
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
        elements: {
          scoreTitle: false,
          scoreWordsAndMusic: false,
          effectTempo: true,
          guitarTuning: false,
        },
      },
      player: {
        enablePlayer: true,
       // outputMode : 'WebAudio',
       //  soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2', 
           
        soundFont: 'assets/sound_fonts/sonivox.sf2',
       // soundFont:'assets/sound_fonts/guitar_nylon.sf2',
         scrollMode: 'continuous',
        enableCursor: true,
      //  PlayerMode: 'RealTime',
       scrollElement:this.alphaTabContainer.nativeElement.querySelector('.at-viewport'), // this is the element to scroll during playback
          enableElementHighlighting: true,
         enableUserInteraction: true,
         enableAnimatedBeatCursor:true,
    scrollSpeed: 400, // Example: 400ms for scrolling speed
    scrollOffsetY: 50, // Example: 50px vertical offset
      },
       midiEventsPlayedFilter : [
    alphaTab.midi.MidiEventType.NoteOn,
    alphaTab.midi.MidiEventType.NoteOff,
    alphaTab.midi.MidiEventType.AlphaTabMetronome
  ]
     
    };


    this.api = new alphaTab.AlphaTabApi(this.alphaTabContainer.nativeElement, settings);
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

      
/* 
this.api.soundFontLoad.on((e: { loaded: number; total: number }) => {
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
    }
});

      this.api.midiLoad.on((e: any) => {
  // e.midiData contains an array of all MIDI events for the entire song.
  console.log("MIDI events generated:", e.midiData);
});

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

    // Beat cursor tracking -- thi is not working , old version
    this.api.playedBeatChanged.on((beat: any) => {
      console.log('Current beat: ------> ', beat);
      if (this.autoScrollEnabled && this.isPlaying) {
        this.highlightCurrentBeat(beat);
      }
// Log note, fret, and string for each note in the beat
  if (beat && beat.notes) {
    beat.notes.forEach((note: any) => {
      // note.string is 1-based (1 = high E, 6 = low E)
      // note.fret is the fret number
      // note.value is the MIDI note number
      console.log(
        `Note: MIDI ${note.value}, Fret: ${note.fret}, String: ${note.string}`
      );
    });
  }


    });
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
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      try {
        this.isLoaded = true;
        
                   setTimeout(() => {
              if (this.alphaTabContainer && this.alphaTabContainer.nativeElement    ) {
                console.log('Element is now in the DOM:', this.alphaTabContainer.nativeElement  );
               this.initializeAlphaTab();
                this.api.load(new Uint8Array(arrayBuffer));
              }
            }, 0);
        
         
        
      } catch (error) {
        console.error('Error loading file:', error);
        alert('Error loading file. Please make sure it\'s a valid Guitar Pro file.');
        this.isLoading = false;
      }
    };

    reader.onerror = () => {
      alert('Error reading file.');
      this.isLoading = false;
    };

    reader.readAsArrayBuffer(file);
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
  // Only allow one track to be selected at a time
  this.selectedTracks = [trackIndex];
  // Optionally, update visibility if you want only one visible at a time:
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
 getFretAndString(noteNumber: number, track: Track)  : { string: number; fret: number } | null {  
 
    const tuning = track.tuning;
    // Iterate from the lowest string (highest index) to the highest string
    for (let string = tuning.length - 1; string >= 0; string--) {
        const openStringNote = tuning[string]; // Note number of the open string
        // Check if the played note is on this string
        if (noteNumber >= openStringNote) {
            const fret = noteNumber - openStringNote;
            if (fret <= track.fretCount) { // Ensure it's within the fretboard limit
                return { string: string + 1, fret };
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