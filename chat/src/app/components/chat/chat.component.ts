import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Contact, MenuOption, Message, MessageRequest, ModelMessage } from 'src/app/models/Models';
import { ChatService } from 'src/app/services/chat.service';
import { WsService } from 'src/app/services/ws.service';
import { BehaviorSubject, debounceTime, Subject, Subscription, takeUntil } from 'rxjs';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';
import { EmojiEvent } from '@ctrl/ngx-emoji-mart/ngx-emoji';
import { animate, style, transition, trigger } from '@angular/animations';
import { MenuItem, MenuSection, UserProfile } from '../dropdownmenu/dropdownmenu.component';

animations: [
  trigger('emojiModal', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(10px)' }),
      animate('150ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
    ]),
    transition(':leave', [
      animate('100ms ease-in', style({ opacity: 0, transform: 'translateY(10px)' }))
    ])
  ])
]

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, AfterViewInit {

  @Input() isDarkMode = false;
  public message: MessageRequest = { from: '', to: '', content: '', type: '' };
  public messages: ModelMessage[] = [];
  public activeContact: Contact | null = null;
  private subscriptions?: Subscription;
  private typingSubscription?: Subscription;
  public isPending: Boolean = false;
  public limitMessageSendPending: Boolean = false;
  public currentDateDisplay: string = "";
  private dateObserver: IntersectionObserver | null = null;
  public newMessage: string = ""
  public state: String = ''
  public isTyping = false;
  public isScrolling: boolean = false
  private scrollTimeout: any = null
  private typingTimeout: any;
  private messagesBeingRead: Set<string> = new Set();
  private readObserver: IntersectionObserver | null = null;
  private readonly readDebounceTime = 500;
  private readSubject = new BehaviorSubject<string[]>([]);
  private unsubscribe$ = new Subject<void>();
  private userAutenticated: Contact | null = null;
  public showMenu: boolean = false;
  public showMenuHeader: boolean = false;
  public showEmojiPicker: boolean = false;
  showMessageOptions = false;
  @ViewChild('emojiTrigger') emojiTrigger!: ElementRef;
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  @ViewChildren("messageElement") private messageElements!: QueryList<ElementRef>
  @ViewChildren('dateHeader') dateHeaders!: QueryList<ElementRef>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;
  openMenuMessageId: string | null = null;


  isMenuOpen = false;
  menuWidth = '280px';
  menuMaxHeight = '400px';

  menuSections: MenuSection[] = [
    {
      title: 'Documents',
      items: [
        {
          id: 'new',
          label: 'New',
          icon: 'fas fa-plus',
          shortcut: '⌘+N',
          action: () => console.log('New document')
        },
        {
          id: 'search',
          label: 'Search',
          icon: 'fas fa-search',
          shortcut: '⌘+S',
          action: () => console.log('Search documents')
        }
      ]
    },
    {
      title: 'Profile',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: 'fas fa-cog',
          shortcut: '⌘+O',
          action: () => console.log('Open settings')
        },
        {
          id: 'messages',
          label: 'Messages',
          icon: 'fas fa-envelope',
          action: () => console.log('Open messages')
        },
        {
          id: 'logout',
          label: 'Logout',
          icon: 'fas fa-sign-out-alt',
          shortcut: '⌘+Q',
          action: () => console.log('Logout')
        }
      ]
    }
  ];

  userProfile: UserProfile = {
    name: 'Amy Elsner',
    role: 'Admin',
    avatar: '/assets/svgs/user.svg' // Replace with actual avatar path
  };

  toggleMenu(messageId: string, event?: Event) {
    console.log('Mesanje id', messageId, 'Mensaje abierto anteriormente', this.openMenuMessageId);
    console.log('Is open', this.openMessageMenuId == messageId);
    if (event) {
      event.stopPropagation();
    }
    if (this.openMenuMessageId == messageId) {
      this.closeMenu();
    } else {
      this.openMenuMessageId = messageId;
      setTimeout(() => {
        document.addEventListener("click", this.documentClickListener);
      });
    }
  }

  closeMenu() {
    this.openMenuMessageId = null;
  }

  onMenuItemClick(item: any) {
    console.log('Menu item clicked:', item);
    this.closeMenu(); // Cierra el menú después de hacer click
  }

  // @HostListener('document:click', ['$event'])
  // onDocumentClick(event: Event) {
  //   console.log('Document clicked closed:', event);
  //   this.closeMenu();
  // }



  optionsHeader: MenuOption[] = [
    {
      label: 'Info del chat',
      divider: false,
      action: "",
      color: 'red',
      icon: 'info',
      danger: ''
    },
    {
      label: 'Vaciar chat',
      divider: false,
      action: ""
    },
    {
      label: 'Eliminar chat',
      divider: false,
      action: ""
    }
  ]

  options: MenuOption[] = [
    {
      label: 'Responde',
      divider: false,
      action: ""
    },
    {
      label: 'Reaccionar',
      divider: false,
      action: ""
    },
    {
      label: 'Reenviar',
      divider: false,
      action: ""
    },
    {
      label: 'Fijar',
      divider: false,
      action: ""
    },
    {
      label: 'Reportar',
      divider: false,
      action: ""
    },
    {
      label: 'Eliminar',
      divider: false,
      action: "eliminar"
    },

  ];


  getPerLine(): number {
    const viewportWidth = window.innerWidth;
    if (viewportWidth < 320) return 6;
    if (viewportWidth < 400) return 8;
    if (viewportWidth < 500) return 10;
    if (viewportWidth < 600) return 12;
    if (viewportWidth < 768) return 14;
    if (viewportWidth < 900) return 16;
    return 18;
  }

  getPerLines(): number {
    const containerWidth = this.emojiTrigger?.nativeElement?.clientWidth || window.innerWidth;
    const emojiSizeWithMargin = 24; // px  
    const calculatedPerLine = Math.floor(containerWidth / emojiSizeWithMargin);
    return Math.min(18, Math.max(6, calculatedPerLine));
  }

  // @HostListener('document:click', ['$event'])
  // @HostListener('document:keydown.escape', ['$event'])
  // handleCloseEvents(event: MouseEvent | KeyboardEvent): void {
  //   if (event instanceof KeyboardEvent && this.showEmojiPicker) {
  //     this.showEmojiPicker = false;
  //     this.focusInputMessage();
  //     return;
  //   }

  //   if (event instanceof MouseEvent &&
  //     this.showEmojiPicker &&
  //     this.emojiTrigger?.nativeElement &&
  //     !this.emojiTrigger.nativeElement.contains(event.target)) {
  //     this.focusInputMessage();
  //     this.showEmojiPicker = false;
  //   }
  // }

  toggleEmojiPicker(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.showEmojiPicker = !this.showEmojiPicker;
    setTimeout(() => {
      this.focusInputMessage();
    }, 0);
  }
  constructor(private services_ws: WsService, private cdr: ChangeDetectorRef, private ctS: ChatService, public util: UtilsService, private auth: AuthService) {
    this.subscriptions = new Subscription();
    this.typingSubscription = new Subscription();
  }

  ngOnInit(): void {
    this.userAutenticated = this.auth.userAutenticated;
    this.services_ws.initializeWebSocketConnection();
    this.loadSendMessages();
    this.auth.activeContact$.subscribe(contact => {
      if (contact) {
        this.activeContact = contact;
        setTimeout(() => this.focusInputMessage())
        this.currentDateDisplay = '';
        this.isTypingF()
        this.loadMessages();
      }
    });
    /** Funcionalidad para escuchar cuando lee un mensaje */
    this.listeningMarkMessageRead();
    this.listeningMessageRead();
  }

  private loadMessages() {
    if (this.activeContact?.id) {
      this.messages = [];
      const id = this.activeContact?.id;
      this.subscriptions?.add(this.ctS.getMessages(id).subscribe({
        next: (data) => {
          this.messages = this.groupMessagesByDate(data.data);
          setTimeout(() => {
            this.scrollToBottom();
            this.setupIntersectionObserver();
            this.setupReadObserver();
          }, 0);
        }
      }))
    }
  }

  private loadSendMessages() {
    this.subscriptions?.add(
      this.services_ws.message$.subscribe((msg: Message) => {
        console.log('mensaje que estoy recibiendo', msg);

        // 1. Buscar si ya existe ese mensaje en algún grupo
        const alreadyExists = this.messages.some(group =>
          group.messages?.some(m => m.id === msg.id || m.timestamp === msg.timestamp)
        );

        if (!alreadyExists && (msg.from === this.activeContact?.id || msg.to === this.activeContact?.id)) {
          // 2. Determinar la fecha del mensaje (solo año-mes-día)
          const msgDate = new Date(msg.timestamp ?? Date.now());
          msgDate.setHours(0, 0, 0, 0);

          // 3. Buscar si ya existe un grupo con esa fecha
          const existingGroup = this.messages.find(group => {
            const groupDate = new Date(group.date || '');
            groupDate.setHours(0, 0, 0, 0);
            return groupDate.getTime() === msgDate.getTime();
          });

          // 4. Agregar el mensaje al grupo existente o crear uno nuevo
          if (existingGroup) {
            existingGroup.messages?.push(msg);
          } else {
            this.messages.push({
              date: msgDate,
              messages: [msg]
            });
            // Ordena por fecha por si se insertan desordenados
            this.messages.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
          }

          // 5. Actualizar estados
          // this.limitMessageSendPending = this.messages
          //   .flatMap(group => group.messages || [])
          //   .filter(m => m.status === 'pendig_acceptance').length >= 2;

          console.log('TIene ', this.limitMessageSendPending, 'pendientes')
          // if (msg.status === 'pendig_acceptance') {
          //   this.isPending = true;
          // }

          if (this.isUserAtBottom()) {
            setTimeout(() => this.scrollToBottom(), 0);
          }
        }
      })
    );
  }

  private isTypingF(): void {
    if (!this.activeContact) return;

    const currentContactId = this.activeContact.id;
    const lastSeen = this.activeContact.lastSeen;

    this.typingSubscription?.unsubscribe();
    clearTimeout(this.typingTimeout);

    this.typingSubscription = this.services_ws.typing$.subscribe((message: any) => {

      if (!message || !message.from) {
        this.state = this.util.formatLastSeen(lastSeen)
        this.isTyping = false;
        return;
      };

      const isFromActive = message.from === currentContactId;
      const type = message.type;

      if (!isFromActive) {
        this.state = this.util.formatLastSeen(lastSeen)
        this.isTyping = false;
        return;
      }
      switch (type) {
        case 'typing':
          this.state = 'Escribiendo...';
          this.isTyping = true;
          this.typingTimeout = setTimeout(() => {
            this.state = 'En línea';
            this.isTyping = false;
          }, 3000);
          break;

        case 'online':
          this.state = 'En línea';
          this.isTyping = false;
          break;
        default:
          this.state = this.util.formatLastSeen(lastSeen)
          this.isTyping = false;

      }
    });
  }

  onSendMessage(): void {
    if (!this.activeContact?.id) return;
    this.message.to = this.activeContact?.id;
    if (!this.message.content) {
      return;
    }
    const newMessage = { ...this.message };
    this.services_ws.sendMessage(newMessage);
    this.message = { from: '', to: '', content: '', type: '' };
  }

  private changeStatus(status: string): void {
    if (this.activeContact) {
      this.services_ws.setupUpdateContactNotifier(this.activeContact, status)
    }
  }

  trackByMessageId(index: number, message: Message): string {
    return message.id ?? '';
  }

  public onTyping(): void {
    if (this.activeContact) {
      this.services_ws.notifyTyping(this.activeContact);
    }
  }

  public getMessageBlocked(): string {
    return '';
    // return (this.limitMessageSendPending && this.messages[0]?.messages[0].to == this.activeContact?.id) ? `${this.activeContact?.name} aún no acepta tu solicitud de mensaje` : 'Debes aceptar la solicitud para enviar mensajes';
  }

  onScroll() {
    this.isScrolling = true
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false
    }, 3000)
  }

  private eventScroll(): void {
    const element = this.messagesContainer.nativeElement;
    const threshold = 10;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const contentHeight = element.scrollHeight;
    // console.log(scrollPosition, contentHeight)
    if (contentHeight - scrollPosition <= threshold) {
      // this.markMessagesRead();
    }
  }

  private listeningMarkMessageRead(): void {
    this.readSubject.pipe(
      debounceTime(this.readDebounceTime),
      takeUntil(this.unsubscribe$)
    ).subscribe(ids => {
      if (ids.length > 0) {
        console.log('Los siguiente mensajes se van a marcar como leidos', ids)
        this.markMessagesAsReadOnBackend(ids);
      }
      this.messagesBeingRead.clear();
    });
  }

  private markMessagesAsReadOnBackend(messageIds: string[]): void {
    if (this.activeContact?.id && messageIds.length > 0) {
      this.services_ws.markAsRead(messageIds);
      // this.unreadMessageIds = [];
    }
  }

  private setupIntersectionObserver() {

    if (this.dateObserver) this.dateObserver.disconnect();
    if (!this.messagesContainer || !this.messagesContainer.nativeElement) return;

    this.dateObserver = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting).sort((a, b) => {
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });

      if (visibleEntries.length > 0) {
        this.updateCurrentDate(visibleEntries[0].target);
      }
    }, {
      root: this.messagesContainer.nativeElement,
      rootMargin: '-50px 0px 0px 0px',
      threshold: 0.5
    });

    this.updateObserver();
  }

  private setupReadObserver() {

    if (this.readObserver) this.readObserver.disconnect();
    if (!this.messagesContainer || !this.messagesContainer.nativeElement) return;

    console.log('entro al metodo para leer que mensajes son leidos')
    this.readObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.classList.contains('message-wrapper')) {
          const messageId = entry.target.getAttribute('data-message-id');
          // const messageElement = entry.target as HTMLElement;
          if (messageId) {
            const message = this.findMessageInGroups(messageId);
            if (message && message.from !== this.userAutenticated?.id && message.status != 'read' && !this.messagesBeingRead.has(messageId)) {
              console.log('Se agrego el sigueinte id de mensaje a la lista, ', messageId)
              this.messagesBeingRead.add(messageId);
              this.readSubject.next([...this.messagesBeingRead]);
            }
          }
        }
      });
    }, {
      root: this.messagesContainer.nativeElement,
      threshold: 0.1,
    });

    this.updateReadObserver();
  }

  private updateObserver() {
    setTimeout(() => {
      this.messageElements.forEach(el => {
        this.dateObserver?.observe(el.nativeElement);
      });
    });
  }

  private updateCurrentDate(messageElement: Element) {
    const messageEl = messageElement as HTMLElement;
    const messageWrapper = messageEl.closest('.message-wrapper');
    if (messageWrapper) {
      const dateHeader = messageWrapper.querySelector('.messages-date') as HTMLElement;
      if (dateHeader) {
        const dateText = dateHeader.textContent?.trim();
        if (dateText && dateText !== this.currentDateDisplay) {
          // console.log('Sn fechas distintas')
          this.currentDateDisplay = dateText;
        }
      }
    }
  }

  private groupMessagesByDate(messages: Message[]): ModelMessage[] {

    if (!messages || messages.length === 0) {
      this.messages = []
      return []
    }

    const groups: { [key: string]: Message[] } = {}
    messages.forEach((message) => {
      const date = message?.timestamp ? new Date(message.timestamp) : new Date()
      const dateKey = this.getDateKey(date)

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }

      groups[dateKey].push(message)
    })

    return Object.keys(groups)
      .map((dateKey) => {
        return {
          date: new Date(dateKey),
          messages: groups[dateKey],
        }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight
      }
    } catch (err) { }
  }

  private isUserAtBottom(): boolean {
    const el = this.messagesContainer.nativeElement;
    const threshold = 20;
    const position = el.scrollTop + el.clientHeight;
    const height = el.scrollHeight;
    return height - position <= threshold;
  }

  private findClosestDateHeader(messageElement: HTMLElement): HTMLElement | null {
    let current = messageElement

    while (current && current.previousElementSibling) {
      current = current.previousElementSibling as HTMLElement

      if (current.classList.contains("messages-date")) {
        return current
      }
    }

    return null
  }

  private getDateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
  }

  public toggleMessageOptions(message: Message): void {
    if (!message) {
      return;
    }
  }

  public focusInputMessage(): void {
    if (this.messageInput) {
      this.messageInput.nativeElement.focus();
    }
  }

  private findMessageInGroups(messageId: string): Message | undefined {
    for (const group of this.messages) {
      if (group.messages) {
        const found = group.messages.find(msg => msg.id === messageId);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  private updateReadObserver() {
    setTimeout(() => {
      this.messageElements.forEach((el) => {
        this.readObserver?.observe(el.nativeElement);
      });
    });
  }

  private listeningMessageRead() {
    this.services_ws.notificationMarkread$.subscribe({
      next: (ids) => {
        if (ids && ids?.length > 0) {
          this.updateMessageRead(ids);
          /** Notifico al sidebar que el mensaje fue leído */
          const lastId = ids[ids.length - 1];
          const msg = this.findMessageInGroups(lastId);
          if (msg) {
            this.services_ws.messageSubject.next(msg);
          }
        }
      }
    })
  }

  private updateMessageRead(ids: string[]): void {
    ids.forEach(id => {
      for (const modelMessage of this.messages) {
        if (modelMessage.messages) {
          const messageToUpdateIndex = modelMessage.messages.findIndex(message => message.id === id);
          if (messageToUpdateIndex !== -1) {
            // Actualizamos directamente el objeto en el array
            modelMessage.messages[messageToUpdateIndex] = {
              ...modelMessage.messages[messageToUpdateIndex],
              status: 'read'
            };
            // Marcamos el grupo como "tocado" para la detección de cambios
            this.markForCheck(modelMessage);
            break;
          }
        }
      }
    });
  }

  private markForCheck(modelMessage: ModelMessage): void {
    const index = this.messages.indexOf(modelMessage);
    if (index > -1) {
      this.messages = [...this.messages];
    }
  }

  documentClickListener = () => {
    this.closeMenu();
  };

  documentClickListenerHeader = () => {
    this.closeMenuHeader();
  };

  closeMenuHeader() {
    this.showMenuHeader = false;
    document.removeEventListener("click", this.closeMenuHeader);
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

  toggleMenuHeader(event: Event) {
    event.stopPropagation();
    this.showMenuHeader = !this.showMenuHeader;
    console.log(this.showMenuHeader)
    if (this.showMenuHeader) {
      setTimeout(() => {
        document.addEventListener("click", this.documentClickListener);
      });
    }
  }


  handleMessageOption(option: MenuOption, message: Message) {
    alert('Entro')
    console.log(`Acción: ${option.id} en mensaje: ${message.content}`)

    // Implementar acciones específicas
    switch (option.id) {
      case "reply":
        // Lógica para responder
        this.newMessage = `Respondiendo a: "${message.content.substring(0, 20)}${message.content.length > 20 ? "..." : ""
          }" \n`
        setTimeout(() => {
          const inputElement = document.querySelector(".message-input input") as HTMLInputElement
          if (inputElement) {
            inputElement.focus()
          }
        }, 100)
        break

      case "copy":
        // Copiar al portapapeles
        navigator.clipboard
          .writeText(message.content)
          .then(() => console.log("Texto copiado al portapapeles"))
          .catch((err) => console.error("Error al copiar texto: ", err))
        break

      case "delete":
        // Aquí se implementaría la lógica para eliminar el mensaje
        console.log("Mensaje eliminado (simulación)")
        break

      case "edit":
        // Lógica para editar mensaje
        this.newMessage = message.content
        setTimeout(() => {
          const inputElement = document.querySelector(".message-input input") as HTMLInputElement
          if (inputElement) {
            inputElement.focus()
          }
        }, 100)
        break

      case "star":
        // Lógica para destacar mensaje
        console.log("Mensaje destacado (simulación)")
        break

      case "forward":
        // Lógica para reenviar mensaje
        console.log("Preparando reenvío (simulación)")
        break

      case "report":
        // Lógica para reportar mensaje
        console.log("Mensaje reportado (simulación)")
        break
    }
  }

  addEmoji($event: EmojiEvent): void {
    const { native } = $event.emoji;
    if (native) {
      this.message.content += native;
      this.focusInputMessage();
    }
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
    this.setupReadObserver();
    this.messageElements.changes.subscribe(() => {
      this.updateObserver();
      this.updateReadObserver();
    });
    this.scrollToBottom();
    this.focusInputMessage();
  }

  ngOnDestroy(): void {
    this.services_ws.disconnect()
    this.subscriptions?.unsubscribe();
    this.typingSubscription?.unsubscribe();
    if (this.dateObserver) this.dateObserver.disconnect()
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
    if (this.readObserver) this.readObserver.disconnect()
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }



  /** Nuevo codigo */

  getStatusIconTemplate(status: string): string {
    switch (status) {
      case 'sent':
        return 'checkIcon';
      case 'delivered':
        return 'doubleCheckIcon';
      case 'read':
        return 'readIcon';
      default:
        return 'clockIcon';
    }
  }

  openMessageMenuId: string | null = null;
  menuPosition: { x: number; y: number } = { x: 0, y: 0 };

  menuSectionsf: MenuSection[] = [
    {
      items: [
        { id: 'reply', label: 'Responder', icon: 'reply' },
        { id: 'copy', label: 'Copiar', icon: 'content_copy' },
        { id: 'delete', label: 'Eliminar', icon: 'delete' },
        { id: 'forward', label: 'Reenviar', icon: 'forward' },
      ]
    }
  ];
  menuWidthf: string = '10px';
  menuMaxHeightf: string = '40px';
  userProfilef?: UserProfile;
  isHeaderMenuOpen: boolean = false;


  trackByDate(index: number, group: any): string {
    return group.date;
  }


  toggleMenuf(messageId: string, event: MouseEvent): void {
    event.stopPropagation(); // ¡Importante! Evita que el clic se propague al documento inmediatamente
    console.log(`toggleMenuf: Clicked ID: ${messageId}, Current open ID: ${this.openMessageMenuId}`);

    if (this.openMessageMenuId === messageId) {
      // Si ya está abierto para este mensaje, ciérralo
      this.openMessageMenuId = null;
      console.log('toggleMenuf: Closing menu.');
    } else {
      // Si no está abierto o es para otro mensaje, ábrelo
      const targetElement = event.currentTarget as HTMLElement;
      const rect = targetElement.getBoundingClientRect();

      this.menuPosition = {
        x: rect.left - 150, // Ajusta según necesites para posicionar el menú
        y: rect.top + rect.height + 5 // Posiciona debajo del botón
      };

      
      this.menuPosition = {
        x: 10, // Ajusta según necesites para posicionar el menú
        y: 30 // Posiciona debajo del botón
      };


      this.openMessageMenuId = messageId;
      console.log(`toggleMenuf: Opening menu for ID: ${messageId}, Position:`, this.menuPosition);
    }
    this.cdr.detectChanges(); // Fuerza la detección de cambios para que Angular actualice el *ngIf
  }


  onMenuItemClickf(item: MenuItem): void {
    console.log(`Opción seleccionada: ${item.label} para el mensaje ${this.openMessageMenuId}`);
    // Aquí puedes añadir la lógica para cada acción del menú
    // Por ejemplo:
    // if (item.id === 'delete') { this.deleteMessage(this.openMessageMenuId); }
    this.closeMenu(); // Cierra el menú después de seleccionar una opción
  }

  closeMenuf(): void {
    if (this.openMessageMenuId !== null) {
      console.log('closeMenuf: Cerrando menú de mensaje.');
      this.openMessageMenuId = null;
      this.cdr.detectChanges(); // Fuerza la detección de cambios
    }
  }



}
