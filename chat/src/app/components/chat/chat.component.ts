import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
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
export class ChatComponent implements OnInit, AfterViewChecked {

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

  @ViewChild("messagesContainer") private messagesContainer!: ElementRef

  newMessage = ""
  state: String = ''
  isTyping = false;

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
      }
    });
  }

  loadMessages() {
    if (this.activeContact?.id) {
      const id = this.activeContact?.id;
      this.subscriptions?.add(this.ctS.getMessages(id).subscribe({
        next: (data) => {
          this.messages = data;
          this.limitMessageSendPending = this.messages.filter(msg => msg.status === 'pendig_acceptance').length >= 2;
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
      }
      ))
  }

  ngAfterViewChecked() {
    if (this.messagesContainer && this.messagesContainer.nativeElement) {
      this.scrollToBottom();
    }
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

  scrollToBottom(): void {
    try {
      if (this.messagesContainer?.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error al hacer scroll:', err);
    }
  }

  sendMessage(): void {
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

  ngOnDestroy(): void {
    this.services_ws.disconnect()
    this.subscriptions?.unsubscribe();
    this.typingSubscription?.unsubscribe();
  }

}
