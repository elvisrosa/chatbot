import { Injectable, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Contact, Message } from '../models/Models';
import { AuthService } from './auth.service';
import { BehaviorSubject, debounceTime, Subject, Subscription, throttleTime } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WsService {

  private stompClient!: Client;
  private connected: boolean = false;
  /**Observables para mensajes */
  public messageSubject = new Subject<Message>();
  public message$ = this.messageSubject.asObservable();
  /**Observables para escrucha de escibir */
  private typingSubject = new Subject<void>();
  private typingStatusSubject = new BehaviorSubject<Message | null>(null);
  public typing$ = this.typingStatusSubject.asObservable();
  /**Observables para escucha de nuevo contacto */
  private newContactSubject = new BehaviorSubject<Contact | null>(null);
  public newContact$ = this.newContactSubject.asObservable();
  /**Usuario clickado actual */
  private updateContact = new BehaviorSubject<Contact | null>(null);
  public updateContact$ = this.updateContact.asObservable();
  private activeContact: Contact | undefined;
  /**Usuario rechaza o acepta solicitud de amigo */
  /** Observables para marcar mensajes como leidos */
  private markAsReadSubject = new BehaviorSubject<string[] | null>(null);
  public notificationMarkread$ = this.markAsReadSubject.asObservable();


  constructor(private auth: AuthService) { }

  public initializeWebSocketConnection() {
    const token = this.auth.getToken();
    this.stompClient = new Client({
      brokerURL: '',
      webSocketFactory: () => new SockJS(`http://localhost:8080/chat-websocket?ss=${token}`),
      connectHeaders: {
        'Authorization': `Bearer ${token}`
      },
      debug: (str) => {
        // console.log(new Date(), str);
      },
      reconnectDelay: 50000,
    });

    this.stompClient.onConnect = (frame) => {
      this.connected = true;
      this.stompClient.subscribe('/user/queue/messages', (msg) => {
        const message: Message = JSON.parse(msg.body)
        console.log('Mensaje recibido ', message)
        this.messageSubject.next(message);
      });

      this.stompClient.subscribe('/user/queue/typing', (msg) => {
        const message: Message = JSON.parse(msg.body)
        this.typingStatusSubject.next(message);
      });

      this.stompClient.subscribe('/user/queue/new_contact', (notification) => {
        const contact: Contact = JSON.parse(notification.body);
        this.newContactSubject.next(contact);
        console.log("Nuevo contacto recibido:", contact);
      });

      this.stompClient.subscribe('/user/queue/message-read', (notification) => {
        const messageIdsRead: string[] = JSON.parse(notification.body);
        this.markAsReadSubject.next(messageIdsRead);
      });

      this.stompClient.subscribe('/user/queue/contact-updated', (update) => {
        const contact: Contact = JSON.parse(update.body);
        console.log('Contacto que se actualizo ', contact)
        if (contact) {
          this.updateContact.next(contact);
        }
      });


      this.setupTypingNotifier();

    };

    this.stompClient.onStompError = (frame) => {
      this.connected = false;
      // console.error('Broker reported error: ' + frame.headers['message']);
      // console.error('Additional details: ' + frame.body);
    };

    this.stompClient.onDisconnect = (frame) => {
      this.connected = false;
      // console.log(`Disconnected ${!this.stompClient.connected}`);
    }

    this.connect();
  }

  public connect(): void {
    this.stompClient.activate();
  }

  public disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }

  public isActiveStomp(): boolean {
    return this.stompClient && this.stompClient.connected;
  }


  public notifyTyping(activeContact: Contact): void {
    this.activeContact = activeContact;
    this.typingSubject.next();
  }


  public sendMessage(message: Message): void {
    if (this.isActiveStomp()) {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(message),
      });
    }
  }

  public setupUpdateContactNotifier(contact: Contact, status: string): void {
    if (this.isActiveStomp()) {
      console.log(contact, status);
      this.stompClient.publish({
        destination: '/app/contact.update',
        body: JSON.stringify({
          contactId: contact.id,
          status: status,
        })
      });
    }
  }

  private setupTypingNotifier(): void {
    if (this.isActiveStomp()) {
      this.typingSubject
        .pipe(throttleTime(800))
        .subscribe(() => {
          const typingPayload = {
            to: this.activeContact?.username,
            type: 'typing',
            content: '',
            timestamp: null,
            from: '',
          };

          this.stompClient.publish({
            destination: '/app/chat.typing',
            body: JSON.stringify(typingPayload),
          });
        });
    }
  }

  sendTypingNotification(activeContact: Contact, type: string) {
    if (this.isActiveStomp()) {
      const typingMessage = {
        to: activeContact.username,
        type: type,
        content: '',
        timestamp: null,
        from: null
      };

      this.stompClient.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify(typingMessage)
      });
    }
  }

  markAsRead(idsMessage: string[]) {
    if (this.isActiveStomp()) {
      this.stompClient.publish({
        destination: '/app/me/mark-as-read',
        body: JSON.stringify(idsMessage)
      });
    }
  }

  public resetValueTyping() {
    this.typingStatusSubject.next({});
  }
}

