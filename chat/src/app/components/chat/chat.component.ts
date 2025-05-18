import { AfterViewInit, Component, ElementRef, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Contact, Message, ModelMessage } from 'src/app/models/Models';
import { ChatService } from 'src/app/services/chat.service';
import { WsService } from 'src/app/services/ws.service';
import { BehaviorSubject, debounceTime, Subject, Subscription, takeUntil } from 'rxjs';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {

  @Input() isDarkMode = false;
  public message: Message = new Message();
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
  private unreadMessageIds: string[] = [];

  private messagesBeingRead: Set<string> = new Set();
  private readObserver: IntersectionObserver | null = null;
  private readonly readDebounceTime = 500;
  private readSubject = new BehaviorSubject<string[]>([]);
  private unsubscribe$ = new Subject<void>();

  private userAutenticated: Contact | null = null;

  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  @ViewChildren("messageElement") private messageElements!: QueryList<ElementRef>
  @ViewChildren('dateHeader') dateHeaders!: QueryList<ElementRef>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;

  constructor(private services_ws: WsService, private ctS: ChatService, public util: UtilsService, private auth: AuthService) {
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
    this.readSubject.pipe(
      debounceTime(this.readDebounceTime),
      takeUntil(this.unsubscribe$)
    ).subscribe(ids => {
      if (ids.length > 0) {
        this.markMessagesRead();
      }
      this.messagesBeingRead.clear();
    });
  }

  loadMessages() {
    if (this.activeContact?.id) {
      this.messages = [];
      const id = this.activeContact?.id;
      this.subscriptions?.add(this.ctS.getMessages(id).subscribe({
        next: (data) => {
          this.messages = this.groupMessagesByDate(data.data);
          setTimeout(() => {
            this.scrollToBottom();
            this.setupIntersectionObserver();
            /**Iniciar observador de mensaje leido */
            this.setupReadObserver();
          }, 0);
        }
      }))
    }
  }

  loadSendMessages() {
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


  isTypingF(): void {
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
    this.message.to = this.activeContact?.id;
    if (!this.message.content) {
      return;
    }
    const newMessage = { ...this.message };
    this.services_ws.sendMessage(newMessage);
    this.message = new Message();
  }

  changeStatus(status: string): void {
    if (this.activeContact) {
      this.services_ws.setupUpdateContactNotifier(this.activeContact, status)
    }
  }

  trackByMessageId(index: number, message: any): string {
    return message.id;
  }

  onTyping(): void {
    if (this.activeContact) {
      this.services_ws.notifyTyping(this.activeContact);
    }
  }

  getMessageBlocked(): string {
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

    // this.eventScroll();
  }

  eventScroll(): void {
    const element = this.messagesContainer.nativeElement;
    const threshold = 10;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const contentHeight = element.scrollHeight;
    // console.log(scrollPosition, contentHeight)
    if (contentHeight - scrollPosition <= threshold) {
      // this.markMessagesRead();
    }
  }

  markMessagesRead(): void {
    if (this.unreadMessageIds.length > 0) {
      console.log('Marcar mensajes como leídos', this.unreadMessageIds)
      this.markMessagesAsReadOnBackend([...this.unreadMessageIds]);
      this.unreadMessageIds = [];
    }
  }

  markMessagesAsReadOnBackend(messageIds: string[]): void {
    if (this.activeContact?.id && messageIds.length > 0) {
      this.ctS.markMessagesAsRead(messageIds).pipe(takeUntil(this.unsubscribe$)).subscribe({
        next: () => {
          console.log('Mensajes marcados como leidos')
          this.messages.forEach(group => {
            if (group.messages) {
              group.messages.forEach(msg => {
                if (msg.id && messageIds.includes(msg.id)) {
                  msg.status = 'read';
                }
              });
            }
          })
        },
        error: () => console.log
      })
    }
  }

  setupIntersectionObserver() {

    if (this.dateObserver) this.dateObserver.disconnect();
    if (!this.messagesContainer || !this.messagesContainer.nativeElement) return;

    this.dateObserver = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting).sort((a, b) => {
          // console.log(a.boundingClientRect.top - b.boundingClientRect.top)
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

  setupReadObserver() {

    if (this.readObserver) {
      this.readObserver.disconnect();
    }

    if (!this.messagesContainer || !this.messagesContainer.nativeElement) return;

    console.log('entro al metodo para leer que mensajes son leidos')
    this.readObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.classList.contains('message-wrapper')) {
          const messageId = entry.target.getAttribute('data-message-id');
          const messageElement = entry.target as HTMLElement;
          if (messageId) {
            const message = this.findMessageInGroups(messageId);
            console.log(message)
            if (message && message.from !== this.userAutenticated?.id && message.status != 'read' && !this.messagesBeingRead.has(messageId)) {
              this.messagesBeingRead.add(messageId);
              this.readSubject.next([...this.messagesBeingRead]);
              const ids = [...this.messagesBeingRead];
              console.table(ids)
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

  groupMessagesByDate(messages: Message[]): ModelMessage[] {

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

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight
      }
    } catch (err) { }
  }

  isUserAtBottom(): boolean {
    const el = this.messagesContainer.nativeElement;
    const threshold = 20;
    const position = el.scrollTop + el.clientHeight;
    const height = el.scrollHeight;
    return height - position <= threshold;
  }


  findClosestDateHeader(messageElement: HTMLElement): HTMLElement | null {
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

  toggleMessageOptions(message: Message): void {
    if (!message) {
      return;
    }
  }

  private focusInputMessage(): void {
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
    console.log('entro al metodo')
    setTimeout(() => {
      this.messageElements.forEach((el) => {
        this.readObserver?.observe(el.nativeElement);
      });
    });
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
}
