import { Injectable, OnInit } from '@angular/core';
import { Client } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';
import { Message } from '../models/Message';

@Injectable({
  providedIn: 'root'
})
export class WsService {

  private stompClient!: Client;
  private connected: boolean = false;

  constructor() {
  }

  public initializeWebSocketConnection() {

    this.stompClient = new Client({
      brokerURL: '',
      webSocketFactory: () => new SockJS('http://localhost:8080/chat-websocket'),
      debug: (str) => {
        console.log(new Date(), str);
      },
      reconnectDelay: 5000,
    });

    this.stompClient.onConnect = (frame) => {
      this.connected = true;
      console.log('Connected: ' + frame);
      this.stompClient.subscribe('/topic/messages', (message) => {
        console.log('Received message: ' + message.body);
      });
    };

    this.stompClient.onStompError = (frame) => {
      this.connected = false;
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.stompClient.onDisconnect = (frame) => {
      this.connected = false;
      console.log(`Disconnected ${!this.stompClient.connected}`);
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
    } else {
      console.error('Not connected to the server.');
    }
  }



}
