import { HttpResponse } from '@angular/common/http';
import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { concat, Subscription } from 'rxjs';
import { Contact, MenuOption, Message } from 'src/app/models/Models';
import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';
import { WsService } from 'src/app/services/ws.service';

@Component({
  selector: "app-sidebar",
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})

export class SidebarComponent implements OnInit, OnDestroy {

  @Input() autenticated: boolean = false;
  private subscriptions?: Subscription;
  public activeContact!: Contact | null;
  public contacts: Contact[] = [];
  public searchTerm: string = "";
  public showMenu: boolean = false
  public messageNotRead: number = 0;
  public isTyping: boolean = false;
  public status: string = "";
  public typingTimeout: any;
  public typingSet = new Set<string>();

  options: MenuOption[] = [
    {
      label: 'Nuevo grupo',
      divider: false,
      action: ""
    },
    {
      label: 'Agregar contacto',
      divider: false,
      action: ""
    },
    {
      label: 'Seleccionar chats',
      divider: false,
      action: ""
    },
    {
      label: 'Cerrar sesión',
      divider: false,
      action: "logout"
    },
    {
      divider: true,
    },
    {
      label: 'Descarga la App en Google Play',
      divider: false,
      action: ""
    },

  ];

  constructor(private userService: UserService, private auth: AuthService,
    private ws: WsService) {
    this.subscriptions = new Subscription();
  }

  ngOnInit(): void {
    this.subscriptions?.add(this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
    }))
    this.getContact();
    this.listeningChangeContacts();
    this.listeningNewMessage();
    this.listeningTyping();
  }

  getContact() {
    this.subscriptions?.add(this.userService.getContacts().subscribe({
      next: (response) => {
        this.contacts = response.data;
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
        }
        console.log("Data received from server", response);
      },
      error: (error: any) => { },
      complete: () => { }
    }))
  }

  listeningNewMessage(): void {
    this.subscriptions?.add(
      this.ws.message$.subscribe((message: Message) => {
        console.log('Mensaje recibido', message)
        if (!message) return;
        // if (this.activeContact?.id !== message.from) {
          this.contacts = this.contacts.map(contact => {
            if (contact.lastMessage) {
              contact.lastMessage.message = message.content.body;
              contact.lastMessage.status = message.status;
              contact.lastMessage.date = message.timestamp;
            }
            if (contact.id === message.from) {
              contact.unreadMessages++;
            }
            return contact;
          })
        // }
      }))
  }

  listeningUpdateContact(): void {
    this.subscriptions?.add(this.ws.updateContact$.subscribe({
      next: (resp) => {
        if (resp) {
          this.getContact();
        }
      }
    }))
  }

  listeningTyping(): void {
    clearTimeout(this.typingTimeout);
    this.subscriptions?.add(this.ws.typing$.subscribe({
      next: (message) => {
        if (!!message && message.type === 'typing' && !!message.to && !!message.from) {
          const contactId = message.from;
          this.typingSet.add(contactId);
          this.typingTimeout = setTimeout(() => {
            this.typingSet.delete(contactId);
          }, 3000);
        }
      }
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

  toggleMenu(event: Event) {
    event.stopPropagation()
    this.showMenu = !this.showMenu;
    if (this.showMenu) {
      setTimeout(() => {
        document.addEventListener("click", this.documentClickListener)
      })
    }
  }

  closeMenu() {
    this.showMenu = false
    document.removeEventListener("click", this.documentClickListener)
  }

  handleMenuAction(action: string): void {
    console.log(action)
    this.closeMenu()
    switch (action) {
      case "logout":
        this.auth.logout()
        break;
      case "settings":
        break;
    }
    this.showMenu = false;
    console.log(`Acción del menú: ${action}`)
  }

  documentClickListener = () => {
    this.closeMenu()
  }

  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();
    document.removeEventListener("click", this.documentClickListener)
  }
}
