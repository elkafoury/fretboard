import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GuitarComponent } from './guitar/guitar.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GuitarComponent ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'guitar-app';
}
