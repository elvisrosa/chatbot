import { Component, Input, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { Contact, MenuOption, Message } from 'src/app/models/Models';
import { AuthService } from 'src/app/services/auth.service';
import { UserService } from 'src/app/services/user.service';
import { WsService } from 'src/app/services/ws.service';

@Component({
  selector: "app-sidebar",
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  private contactsMap: Map<string, Contact> = new Map();


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

  constructor(
    private userService: UserService,
    private auth: AuthService,
    private ws: WsService,
    private cdr: ChangeDetectorRef
  ) {
    this.subscriptions = new Subscription();
  }

  ngOnInit(): void {
    this.subscriptions?.add(this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
      this.cdr.detectChanges();
    }));
    this.loadContacts();
    this.listeningChangeContacts();
    this.listeningNewMessage();
    this.listeningTyping();
  }

  loadContacts() {
    this.subscriptions?.add(this.userService.getContacts().subscribe({
      next: (response) => {
        this.contacts = response.data;
        this.contactsMap.clear();
        this.contacts.forEach(contact => this.contactsMap.set(contact.id!, contact));
        this.cdr.detectChanges();
      },
      error: (error: any) => { },
      complete: () => { }
    }));
  }

  listeningChangeContacts(): void {
    this.subscriptions?.add(this.ws.newContact$.subscribe({
      next: (response) => {
        if (response) {
          this.loadContacts();
        }
        console.log("Data received from server", response);
      },
      error: (error: any) => { },
      complete: () => { }
    }));
  }

  listeningNewMessage(): void {
    this.subscriptions?.add(
      this.ws.message$.subscribe((message: Message) => {
        if (!message) return;
        console.log('Mensaje recibido', message);
        console.log('Lista de contacto', this.contactsMap);

        const senderId = message.from;
        const receiverId = message.to;
        const currentUserId = this.auth.userAutenticated?.id;

        // Función para actualizar la información del último mensaje de un contacto
        const updateContactLastMessage = (contactId: string | undefined) => {
          if (contactId) {
            const contact = this.contactsMap.get(contactId);
            if (contact) {
              contact.lastMessage = {
                message: message.content?.body,
                status: message.status,
                date: message.timestamp,
              };
              if (contactId === receiverId && contactId === currentUserId) {
                // Si el receptor es el usuario actual, no incrementar unreadMessages aquí
              } else if (contactId === senderId && contactId !== currentUserId) {
                contact.unreadMessages = (contact.unreadMessages || 0) + 1;
              }

              // Actualizar la referencia en el array para la detección de cambios
              this.contacts = this.contacts.map(c =>
                c.id === contact.id ? { ...contact } : c
              );
            }
          }
        };

        // Actualizar el contacto del remitente
        updateContactLastMessage(senderId);

        // Actualizar el contacto del receptor si es diferente del remitente
        if (receiverId && receiverId !== senderId) {
          updateContactLastMessage(receiverId);
        }

        this.cdr.detectChanges();
      })
    );
  }

















  listeningUpdateContact(): void {
    this.subscriptions?.add(this.ws.updateContact$.subscribe({
      next: (resp) => {
        if (resp) {
          this.loadContacts();
        }
      }
    }));
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
            this.cdr.detectChanges(); // Forzar la detección de cambios al finalizar el typing
          }, 3000);
          this.cdr.detectChanges(); // Forzar la detección de cambios al iniciar el typing
        }
      }
    }));
  }

  getActiveContac(): void {
    this.subscriptions?.add(this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
      this.cdr.detectChanges();
    }));
  }

  get filteredContacts() {
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      return this.contacts.filter(
        (contact) => contact.name.toLowerCase().includes(term) || contact.username.toLowerCase().includes(term),
      );
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
        return "check";
      case "delivered":
        return "done_all";
      case "read":
        return "done_all";
      default:
        return "schedule";
    }
  }

  toggleMenu(event: Event) {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
    if (this.showMenu) {
      setTimeout(() => {
        document.addEventListener("click", this.documentClickListener);
      });
    }
  }

  closeMenu() {
    this.showMenu = false;
    document.removeEventListener("click", this.documentClickListener);
  }

  handleMenuAction(action: string): void {
    console.log(action);
    this.closeMenu();
    switch (action) {
      case "logout":
        this.auth.logout();
        break;
      case "settings":
        break;
    }
    this.showMenu = false;
    console.log(`Acción del menú: ${action}`);
  }

  documentClickListener = () => {
    this.closeMenu();
  };

  ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();
    document.removeEventListener("click", this.documentClickListener);
  }
}