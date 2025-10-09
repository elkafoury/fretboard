import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
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
  currentSelectedTrackIndex: number = 0; // Track the currently selected track
  autoScrollEnabled = true;
  playbackPosition: PlaybackPosition | null = null;
  loopEnabled: boolean = false;
 // playednote?: note = { fret: -1, gstring: -1 }; // to keep track of last played note
  bluetoothDevices: BluetoothDevice[] = []; // List of discovered Bluetooth devices
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
        soundFont: 'assets/sound_fonts/sonivox.sf2',
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

    // Set up event listeners
    this.api.scoreLoaded.on((score: any) => {
      console.log('Score loaded:', score);
      this.onScoreLoaded(score);
    });

    this.api.playerReady.on(() => {
      console.log('Player ready');
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

          newActiveNotes.add(note);
          //find the noted the just finished playing (in activeNotes but not in newActiveNotes)
          for (const note of activeNotes) {
            if (!newActiveNotes.has(note)) {
              // Note finished playing
              const typedNote = note as { fret: number; string: number };
              console.log(`Note finished: Fret ${typedNote.fret}, String ${typedNote.string}`);
              // TODO: Call your custom function for a note starting
              setTimeout(() => {
                this.sendToBluetooth(typedNote.fret, typedNote.string, false);
              }, 50); // Adjust the delay as needed

            }
          }

          // Find notes that just started playing (in newActiveNotes but no t in activeNotes)
          for (const note of newActiveNotes) {
            if (!activeNotes.has(note)) {
              // Note started playing
              const typedNote = note as { fret: number; string: number };
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
    this.toggleTrackSelection(0);
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

  async sendToBluetooth(fret: number, gstring: number, on: boolean): Promise<void> {

    await this.smartLightBluetoothService.setLedByfretAndString(fret, gstring, on);

  }

  async reset(): Promise<void> {

    await this.smartLightBluetoothService.reset();

  }

}
