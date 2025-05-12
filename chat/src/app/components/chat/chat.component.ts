import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Message } from 'src/app/models/Message';
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
  activeContact: any | undefined
  @Input() isDarkMode = false
  @Output() sendMessage2 = new EventEmitter<string>()
  statusCurrentUser: string = '';
  private subscriptions?: Subscription;
  private typingSubscription?: Subscription;


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
      this.activeContact = contact;
      if (this.activeContact) {
        this.isTypingF()
        this.loadMessages();
      }
    });
  }

  loadMessages() {
    this.ctS.getMessages(this.activeContact.id).subscribe({
      next: (data) => {
        this.messages = data;
      }
    });
  }

  loadSendMessages() {
    this.subscriptions?.add(
      this.services_ws.message$.subscribe((msg: Message) => {
        console.log('mensaje que estoy recibiendo', msg)
        const alreadyExists = this.messages.some(m => m.id === msg.id || m.timestamp === msg.timestamp);
        if (!alreadyExists && (msg.from === this.activeContact?.id || msg.to === this.activeContact?.id)) {
          this.messages.unshift(msg);
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
    this.typingSubscription?.unsubscribe();
    this.typingSubscription = this.services_ws.typing$.subscribe((message: any) => {
      const currentContactId = this.activeContact?.id;
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
          this.state = this.util.formatLastSeen(this.activeContact?.lastSeen)
        }
      } else {
        this.state = this.util.formatLastSeen(this.activeContact?.lastSeen)
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
    this.message.to = this.activeContact.id;
    const newMessage = { ...this.message };
    this.services_ws.sendMessage(newMessage);
    this.message = new Message();
  }


  trackByMessageId(index: number, message: any): string {
    return message.id;
  }

  onTyping(): void {
    this.services_ws.notifyTyping(this.activeContact);
  }

  ngOnDestroy(): void {
    this.services_ws.disconnect()
    this.subscriptions?.unsubscribe();
    this.typingSubscription?.unsubscribe();
  }

}
