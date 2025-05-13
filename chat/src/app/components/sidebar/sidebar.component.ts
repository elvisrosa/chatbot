import { HttpResponse } from '@angular/common/http';
import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { Contact } from 'src/app/models/Models';
import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';
import { WsService } from 'src/app/services/ws.service';

@Component({
  selector: "app-sidebar",
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})

export class SidebarComponent implements OnInit, OnDestroy {

  @Input() autenticated: boolean = false
  private subscriptions?: Subscription;
  activeContact!: Contact;
  contacts: Contact[] = [];
  searchTerm: string = "";

  constructor(private userService: UserService, private auth: AuthService, private ws: WsService) {
    this.subscriptions = new Subscription();
  }

  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();
  }

  ngOnInit(): void {
    this.subscriptions?.add(this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
    }))
    this.getContact();
    this.listeningChangeContacts();
  }

  getContact() {
    this.subscriptions?.add(this.userService.getContacts().subscribe({
      next: (response) => {
        this.contacts = response;
      },
      error: (error: any) => { },
      complete: () => { }
    }))
  }

  listeningChangeContacts(): void {
    this.subscriptions?.add(this.ws.newContact$.subscribe({
      next: (response) => {
        if (response) {
          this.getContact();
          // this.contacts.push(response);
        }
        console.log("Data received from server", response);
      },
      error: (error: any) => { },
      complete: () => { }
    }))
  }

  getActiveContac(): void {
    this.subscriptions?.add(this.auth.activeContact$.subscribe(contact => this.activeContact = contact));
  }

  get filteredContacts() {
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase()
      return this.contacts.filter(
        (contact) => contact.name.toLowerCase().includes(term) || contact.username.toLowerCase().includes(term),
      )
    }
    return this.contacts;
  }

  selectContact(contact: Contact) {
    console.log('Contacto selecionado', contact);
    this.auth.setActiveContact(contact);
    this.ws.resetValueTyping();
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "sent":
        return "check"
      case "delivered":
        return "done_all"
      case "read":
        return "done_all"
      default:
        return "schedule"
    }
  }

}
