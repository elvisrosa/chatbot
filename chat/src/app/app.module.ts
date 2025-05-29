import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from './components/chat/chat.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { LoginComponent } from './components/login/login.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { DateformatPipe } from './pipes/dateformat.pipe';
import { ChatPendingComponent } from './components/chat-pending/chat-pending.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { DropdownmenuComponent } from './components/dropdownmenu/dropdownmenu.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    SidebarComponent,
    LoginComponent,
    DateformatPipe,
    ChatPendingComponent,
    DropdownmenuComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    PickerComponent
],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
