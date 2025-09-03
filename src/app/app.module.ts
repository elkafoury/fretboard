import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from "@angular/common";
import { WebBluetoothModule } from '@manekinekko/angular-web-bluetooth';

import { AppComponent } from './app.component';
import { GuitarComponent } from './guitar/guitar.component';

@NgModule({
  declarations: [
    AppComponent,
    GuitarComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule  ,
    WebBluetoothModule.forRoot({
        enableTracing: true // or false, this will enable logs in the browser's console
      })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

/*
https://stackoverflow.com/questions/77454741/why-doesnt-app-module-exist-in-angular-17
*/