import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { Contact } from './models/Models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  isDarkMode: boolean = false
  activeContact: Contact | null = null;
  authenticated: boolean = false

  constructor(private auth: AuthService, private theme: ThemeService) { }

  ngOnInit(): void {
    this.auth.authenticated$.subscribe(auth => {
      this.authenticated = auth;
    });

    if (this.auth.getToken()) {
      this.auth.authenticateUser(true)
    }

    this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
    });

    this.isDarkMode = this.theme.isDarkMode;
  }

  set setActiveContact(contact: Contact) {
    this.auth.setActiveContact(contact);
  }

  get getActiveContact() {
    return this.activeContact
  }

  toggleTheme() {
    this.theme.toggleTheme();
    this.isDarkMode = this.theme.isDarkMode;
  }

}
