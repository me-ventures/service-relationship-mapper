import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './component/app/app.component';
import { ServiceMapComponent } from './component/service-map/service-map.component';
import {ServiceInfoComponent} from "./component/service-info/service-info.component";
import {RelationshipsService} from "./service/RelationshipsService";


@NgModule({
  declarations: [
    AppComponent,
      ServiceMapComponent,
      ServiceInfoComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [
      RelationshipsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
