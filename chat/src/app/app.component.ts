import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { Contact } from './models/Models';
import { AuthState } from './enum/AuthState';
import { LoginComponent } from './components/login/login.component';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatComponent } from './components/chat/chat.component';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-root',
  template: `
  <div [ngSwitch]="authState">
    <div *ngSwitchCase="'loading'" class="loading-screen">
      <div class="spinner"></div>
      <p>Cargando usuario...</p>
    </div>

    <app-login *ngSwitchCase="'unauthenticated'" [isDarkMode]="isDarkMode"></app-login>

    <div *ngSwitchCase="'authenticated'" class="app-container" [class.dark-mode]="isDarkMode">
      <aside class="sidebar-container">
        <app-sidebar [autenticated]="authenticated"></app-sidebar>
      </aside>
      <main class="chat-container">
        <app-chat [isDarkMode]="isDarkMode"></app-chat>
      </main>
      <div class="theme-toggle" (click)="toggleTheme()">
        <i class="material-icons">{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</i>
      </div>
    </div>
  </div>
  `,
  styleUrls: ['./app.component.css'],
  imports: [LoginComponent, SidebarComponent, ChatComponent, CommonModule, RouterOutlet, FormsModule],
})
export class AppComponent implements OnInit {

  isDarkMode: boolean = false;
  activeContact: Contact | null = null;
  authState: AuthState = AuthState.Loading;
  authenticated: boolean = false;

  private isCheckingAuth: boolean = true;

  constructor(private auth: AuthService, private theme: ThemeService) { }

  ngOnInit(): void {
    this.isDarkMode = this.theme.isDarkMode;
    this.auth.authenticated$.subscribe(contact => {
      if (this.isCheckingAuth) return;
      if (contact) {
        this.authState = AuthState.Authenticated;
        this.authenticated = true;
      } else {
        this.authState = AuthState.Unauthenticated;
        this.authenticated = false;
      }
    });

    // Escucha cambios de contacto activo
    this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
    });

    this.initAuthState();
  }

  private initAuthState(): void {
    if (this.auth.hasToken()) {
      this.auth.loadUserAuthenticated().subscribe({
        next: (user) => {
          this.authState = AuthState.Authenticated;
          this.authenticated = true;
          this.isCheckingAuth = false;
        },
        error: () => {
          this.auth.logout();
          this.authState = AuthState.Unauthenticated;
          this.authenticated = false;
          this.isCheckingAuth = false;
        }
      });
    } else {
      this.auth.logout();
      this.authState = AuthState.Unauthenticated;
      this.authenticated = false;
      this.isCheckingAuth = false;
    }
  }

  set setActiveContact(contact: Contact) {
    this.auth.setActiveContact(contact);
  }

  get getActiveContact() {
    return this.activeContact;
  }

  toggleTheme() {
    this.theme.toggleTheme();
    this.isDarkMode = this.theme.isDarkMode;
  }

}
