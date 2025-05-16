import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { Contact } from './models/Models';
import { AuthState } from './enum/AuthState';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
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
