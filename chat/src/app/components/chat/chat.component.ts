import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Contact, Message } from 'src/app/models/Models';
import { ChatService } from 'src/app/services/chat.service';
import { WsService } from 'src/app/services/ws.service';
import { Subject, Subscription } from 'rxjs';
import { UtilsService } from 'src/app/services/utils.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {

  public message: Message = new Message();
  public messages: Message[] = [];
  public messagesPending: Message[] = [];
  activeContact: Contact | null = null;
  @Input() isDarkMode = false
  @Output() sendMessage2 = new EventEmitter<string>()
  statusCurrentUser: string = '';
  private subscriptions?: Subscription;
  private typingSubscription?: Subscription;
  public isPending: Boolean = false;
  public limitMessageSendPending: Boolean = false;

  // @ViewChild("messagesContainer") private messagesContainer!: ElementRef
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;
  @ViewChildren("messageElement") private messageElements!: QueryList<ElementRef>
  @ViewChildren('dateHeader') dateHeaders!: QueryList<ElementRef>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;

  private resizeObserver: ResizeObserver | null = null;
  currentDateDisplay: string = "";
  private observer: IntersectionObserver | null = null;
  newMessage = ""
  state: String = ''
  isTyping = false;



  /**
   * 
   * @param services_ws 
   * @param ctS 
   * @param util 
   * @param auth 
   */

  groupedMessages: { date: Date; messages: Message[] }[] = []
  isScrolling: boolean = false
  scrollTimeout: any = null

  constructor(private services_ws: WsService, private ctS: ChatService, public util: UtilsService, private auth: AuthService) {
    this.subscriptions = new Subscription();
    this.typingSubscription = new Subscription();
  }

  ngOnInit(): void {
    this.services_ws.initializeWebSocketConnection();
    this.loadSendMessages();
    this.auth.activeContact$.subscribe(contact => {
      this.activeContact = contact;
      if (this.activeContact) {
        setTimeout(() => this.focusInputMessage())
        this.currentDateDisplay = '';
        this.isPending = contact.status === 'pendig_acceptance';
        this.isTypingF()
        this.loadMessages();
      }
    });
  }

  loadMessages() {
    if (this.activeContact?.id) {
      this.messages = [];
      const id = this.activeContact?.id;
      this.subscriptions?.add(this.ctS.getMessages(id).subscribe({
        next: (data) => {
          this.messages = data;
          this.limitMessageSendPending = this.messages.filter(msg => msg.status === 'pendig_acceptance').length >= 2;
          this.groupMessagesByDate();
          setTimeout(() => {
            this.setupIntersectionObserver();
          }, 0);
        }
      }))
    }
  }

  loadSendMessages() {
    this.subscriptions?.add(
      this.services_ws.message$.subscribe((msg: Message) => {
        console.log('mensaje que estoy recibiendo', msg)
        const alreadyExists = this.messages.some(m => m.id === msg.id || m.timestamp === msg.timestamp);
        if (!alreadyExists && (msg.from === this.activeContact?.id || msg.to === this.activeContact?.id)) {
          this.messages.unshift(msg);
          this.limitMessageSendPending = this.messages.filter(msg => msg.status === 'pendig_acceptance').length >= 2;
        }
        if (!alreadyExists && msg.status === 'pendig_acceptance') {
          console.log('Te ha llegado en mensaje a un chat pendiente')
        }
      }))
  }


  isTypingF(): void {
    if (!this.activeContact) return;
    const currentContactId = this.activeContact.id;
    const lastSeen = this.activeContact.lastSeen;
    this.typingSubscription?.unsubscribe();
    this.typingSubscription = this.services_ws.typing$.subscribe((message: any) => {
      if (message && message.from && message.from === currentContactId) {
        const type = message.type;
        if (type === 'typing') {
          this.state = 'Escribiendo...';
          this.isTyping = true;
          setTimeout(() => {
            this.state = 'En línea';
            this.isTyping = false;
          }, 3000);
        } else if (type === 'online') {
          this.state = 'En línea';
        } else {
          this.state = this.util.formatLastSeen(lastSeen)
        }
      } else {
        this.state = this.util.formatLastSeen(lastSeen)
      }
    });
  }

  onSendMessage(): void {
    this.message.to = this.activeContact?.id;
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
    return (this.limitMessageSendPending && this.messages[0]?.to == this.activeContact?.id) ? `${this.activeContact?.name} aún no acepta tu solicitud de mensaje` : 'Debes aceptar la solicitud para enviar mensajes';
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

  ngOnDestroy(): void {
    this.services_ws.disconnect()
    this.subscriptions?.unsubscribe();
    this.typingSubscription?.unsubscribe();
    this.resizeObserver?.disconnect();

    if (this.observer) {
      this.observer.disconnect()
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
  }


  setupIntersectionObserver() {

    if (this.observer) {
      this.observer.disconnect();
    }

    if (!this.messagesContainer || !this.messagesContainer.nativeElement) return;

    this.observer = new IntersectionObserver((entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting).sort((a, b) => {
          console.log(a.boundingClientRect.top - b.boundingClientRect.top)
          return a.boundingClientRect.top - b.boundingClientRect.top;
        });

      console.log('visibleEntries', visibleEntries)
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

  private updateObserver() {
    setTimeout(() => {
      this.messageElements.forEach(el => {
        this.observer?.observe(el.nativeElement);
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
          console.log('Sn fechas distintas')
          this.currentDateDisplay = dateText;
        }
      }
    }
  }


  groupMessagesByDate(): void {

    if (!this.messages || this.messages.length === 0) {
      this.groupedMessages = []
      return
    }

    const groups: { [key: string]: Message[] } = {}
    this.messages.forEach((message) => {
      const date = message?.timestamp ? new Date(message.timestamp) : new Date()
      const dateKey = this.getDateKey(date)

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }

      groups[dateKey].push(message)
    })

    this.groupedMessages = Object.keys(groups)
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
      console.log('Entro a marcar el focus')
      this.messageInput.nativeElement.focus();
    }
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
    this.messageElements.changes.subscribe(() => {
      this.updateObserver();
    });

    this.focusInputMessage();
  }

}
