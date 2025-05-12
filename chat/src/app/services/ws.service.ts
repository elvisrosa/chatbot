import { Injectable, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Message } from '../models/Message';
import { AuthService } from './auth.service';
import { BehaviorSubject, debounceTime, Subject, Subscription, throttleTime } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WsService {

  private stompClient!: Client;
  private connected: boolean = false;
  private messageSubject = new Subject<Message>();
  public message$ = this.messageSubject.asObservable();

  private typingSubject = new Subject<void>();
  private typingSubscription!: Subscription;
  private typingStatusSubject = new BehaviorSubject<Message  | null>({
    to: '',
    type: '',
    content: '',
    timestamp: undefined,
    from: ''
  });
  public typing$ = this.typingStatusSubject.asObservable();

  private activeContact: any | undefined;

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
      console.log(new Date(), str);
      },
      reconnectDelay: 50000,
    });

    this.stompClient.onConnect = (frame) => {
      this.connected = true;
      this.stompClient.subscribe('/user/queue/messages', (message) => {
        const data = JSON.parse(message.body)
        console.log(data)
        this.messageSubject.next(data);
      });


      this.stompClient.subscribe('/user/queue/typing', (message) => {
        const data = JSON.parse(message.body)
        this.typingStatusSubject.next(data);
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

  public sendMessage(message: Message): void {
    if (this.connected) {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(message),
      });
    }
  }

  public notifyTyping(activeContact: any): void {
    this.activeContact = activeContact;
    this.typingSubject.next();
  }


  private setupTypingNotifier(): void {
    this.typingSubscription = this.typingSubject
      .pipe(throttleTime(800))
      .subscribe(() => {
        const typingPayload = {
          to: this.activeContact?.username || 'admin',
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

  sendTypingNotification(activeContact: any, type: string) {
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

  public resetValueTyping(){
    this.typingStatusSubject.next({});
  }
}

