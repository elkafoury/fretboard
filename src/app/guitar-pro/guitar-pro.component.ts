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
     //  script.src = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/alphaTab.js';
    script.src = 'assets/alphaTab.min.js';
   script.onload = () => {
        this.initializeAlphaTab();
      };
      document.head.appendChild(script);
    } else {
      this.initializeAlphaTab();
    }
  }

  private initializeAlphaTab() {
    const settings = {
      core: {
        engine: 'html5',
        logLevel: 1
      },
      display: {
        layoutMode: 'horizontal',
        staveProfile: 'default'
      },
      notation: {
        notationMode: 'GuitarPro',
        fingeringMode: 'SingleNoteEffectBand'
      },
      player: {
        enablePlayer: true,
      /*  soundFont: 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2',  */
        soundFont: 'assets/sonivox.sf2',
        scrollMode: 'continuous',
        enableCursor: true,
        scrollElement: this.alphaTabContainer.nativeElement // this is the element to scroll during playback

      }
    };

      

    this.api = new alphaTab.AlphaTabApi(this.alphaTabContainer.nativeElement, settings);

    // Set up event listeners
    this.api.scoreLoaded.on((score: any) => {
      this.onScoreLoaded(score);
    });

    this.api.playerReady.on(() => {
      console.log('Player ready');
    });

    this.api.playerStateChanged.on((state: any) => {
      this.isPlaying = state.state === 1; // 1 = playing
    });

    this.api.playerPositionChanged.on((position: any) => {
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
      if (this.autoScrollEnabled && this.isPlaying) {
        this.scrollToCurrentPosition(range);
      }
    });

    // Beat cursor tracking
    this.api.playerBeatChanged.on((beat: any) => {
      if (this.autoScrollEnabled && this.isPlaying) {
        this.highlightCurrentBeat(beat);
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
        this.api.load(new Uint8Array(arrayBuffer));
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
      isSolo: false
    }));

    // Select all tracks by default
    this.selectedTracks = this.tracks.map(t => t.index);
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
    if (this.selectedTracks.includes(trackIndex)) {
      this.selectedTracks = this.selectedTracks.filter(i => i !== trackIndex);
    } else {
      this.selectedTracks.push(trackIndex);
    }
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
    this.tracks.forEach((track, index) => {
      try {
        this.api.changeTrackMute([index], track.isMute);
      } catch (error) {
        console.warn(`Could not mute track ${index}:`, error);
      }
    });
  }

  private updateTrackVisibility() {
    const visibleTracks = this.tracks
      .filter(track => track.isVisible)
      .map(track => track.index);
    
    try {
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
}