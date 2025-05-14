import { AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, QueryList, SimpleChanges, ViewChild, ViewChildren } from '@angular/core';
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
export class ChatComponent implements OnInit, AfterViewChecked, AfterViewInit {

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
  observer: IntersectionObserver | null = null
  isScrolling: boolean = false
  scrollTimeout: any = null
  currentDateDisplay: string = ""
  @ViewChildren("messageElement") private messageElements!: QueryList<ElementRef>






  constructor(private services_ws: WsService, private ctS: ChatService, public util: UtilsService, private auth: AuthService) {
    this.subscriptions = new Subscription();
    this.typingSubscription = new Subscription();
  }

  ngOnInit(): void {
    this.services_ws.initializeWebSocketConnection();
    this.loadSendMessages();
    this.auth.activeContact$.subscribe(contact => {
      console.log('Contacto nuevo recibido en chat', contact)
      this.activeContact = contact;
      if (this.activeContact) {
        this.isPending = contact.status === 'pendig_acceptance';
        this.isTypingF()
        this.loadMessages();

        setTimeout(() => {
          if (this.messagesContainer && this.messagesContainer.nativeElement) {
            console.log('Elemento existe', this.messagesContainer)
            this.setupIntersectionObserver();
          }
        });
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
          this.groupMessagesByDate()
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

  ngAfterViewChecked() {
    // if (this.messagesContainer && this.messagesContainer.nativeElement) {
    //   this.scrollToBottom();
    // }
    // const bottom = this.messagesContainer.nativeElement.scrollHeight === this.messagesContainer.nativeElement.scrollTop + this.messagesContainer.nativeElement.clientHeight;
    // if (bottom) {
    //   const unreadMessages = this.messages.filter(msg => msg.status !== 'read');
    //   console.log(unreadMessages)
    //   const messageIdsToMarkAsRead = unreadMessages.map(msg => msg.id);
    //   if (messageIdsToMarkAsRead.length > 0) {
    //     this.ctS.markMessagesAsRead(messageIdsToMarkAsRead).subscribe(() => {
    //       unreadMessages.forEach(msg => msg.status = 'read');
    //     });
    //   }
    // }
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
    return (this.limitMessageSendPending && this.messages[0].to == this.activeContact?.id) ? `${this.activeContact?.name} aún no acepta tu solicitud de mensaje` : 'Debes aceptar la solicitud para enviar mensajes';
  }












  onScroll() {
    console.log('scroll')
    this.isScrolling = true

    // Limpiar el timeout anterior si existe
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }

    // Ocultar el indicador después de 1.5 segundos sin scroll
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false
    }, 1500)

    // this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.services_ws.disconnect()
    this.subscriptions?.unsubscribe();
    this.typingSubscription?.unsubscribe();


    if (this.observer) {
      this.observer.disconnect()
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
  }


  setupIntersectionObserver() {
    if (!this.messageElements || this.messageElements.length === 0) return;
    if (!this.messagesContainer || !this.messagesContainer.nativeElement) return;


    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver((entries) => {
      console.log('entries', entries)
      const visibleEntries = entries
        // .filter(entry => !entry.isIntersecting)
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => {
          console.log(a.boundingClientRect.top - b.boundingClientRect.top)
          return a.boundingClientRect.top - b.boundingClientRect.top;
        }); // ordenar de arriba a abajo

      console.log('visibleEntries', visibleEntries)
      if (visibleEntries.length > 0) {
        const firstVisible = visibleEntries[0].target as HTMLElement;
        const dateHeader = this.findClosestDateHeader(firstVisible);
        console.log('Header')
        if (dateHeader) {
          const dateText = dateHeader.innerText;
          this.currentDateDisplay = dateText;
          console.log('🗓️ Fecha del primer mensaje visible:', this.currentDateDisplay);
        }
      }
    }, {
      root: this.messagesContainer.nativeElement,
      rootMargin: '0px',
      threshold: 0.1
    });

    this.messageElements.forEach((el) => {
      this.observer?.observe(el.nativeElement);
    });

    // console.log('termino')
    // setTimeout(() => {
    //   this.messageElements.forEach((el) => {
    //     this.observer?.observe(el.nativeElement);
    //   });
    // }, 100);
  }

  groupMessagesByDate() {
    console.log('entro al metodo para ordenar por fecha')
    if (!this.messages || this.messages.length === 0) {
      this.groupedMessages = []
      console.log('esta vacios')
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
    console.log(this.groupedMessages)
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

  ngAfterViewInit() {
    this.messageElements.changes.subscribe(() => {
      console.log('✅ Los elementos de mensaje han cambiado y están listos en el DOM');
      this.setupIntersectionObserver();
    });
  }

}
