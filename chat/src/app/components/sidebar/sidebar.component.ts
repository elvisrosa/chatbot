import { HttpResponse } from '@angular/common/http';
import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  activeContact!: Contact | null;
  contacts: Contact[] = [];
  searchTerm: string = "";
  showMenu: boolean = false
  messageNotRead: number = 0;
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
        if (!message) return;
        this.contacts = this.contacts.map(contact => {
          if (contact.id === message.from) {
            console.log('Contacto encontrado en la lista ', contact)
            
          };
          return contact;
        })
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
