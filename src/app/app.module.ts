import { HttpClientModule } from "@angular/common/http";
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './component/app/app.component';
import { ServiceMapComponent } from './component/service-map/service-map.component';
import {ServiceInfoComponent} from "./component/service-info/service-info.component";


@NgModule({
  declarations: [
    AppComponent,
      ServiceMapComponent,
      ServiceInfoComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
