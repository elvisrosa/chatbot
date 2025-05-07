import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  isDarkMode = false
  activeContactId = 1
  authenticated: boolean = false

  constructor(private auth: AuthService, private theme: ThemeService) { }

  ngOnInit(): void {
    this.auth.authenticated$.subscribe(auth => {
      this.authenticated = auth;
    });
    this.isDarkMode = this.theme.isDarkMode;
  }

  get activeContact() {
    return null;
    // return this.contacts.find((contact) => contact.id === this.activeContactId)
  }

  setActiveContact(contactId: number) {
    this.activeContactId = contactId
  }

  getMessagesForActiveContact() {
    // return this.chatService.getMessagesByContactId(this.activeContactId)
    return null;
  }

  sendMessage(content: string) {

  }

  toggleTheme() {
    this.theme.toggleTheme();
    this.isDarkMode = this.theme.isDarkMode;
  }

}
