import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Message } from 'src/app/models/Message';
import { WsService } from 'src/app/services/ws.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewChecked {

  private connected: boolean = false;
  public messages: Message[] = [];
  public message: Message = new Message();
  @Input() activeContact: any | undefined
  @Input() isDarkMode = false
  @Output() sendMessage2 = new EventEmitter<string>()

  @ViewChild("messagesContainer") private messagesContainer!: ElementRef

  newMessage = ""
  isTyping = false

  constructor(private services_ws: WsService) { }


  ngOnInit(): void {
    // this.services_ws.initializeWebSocketConnection()
    this.messages = [
      {
        id: 1,
        content: "Hola, ¿cómo estás?",
        sender: "user",
        timestamp: 20000000,
        status: "sent"
      },
      {
        id: 2,
        content: "¡Hola! Estoy bien, gracias. ¿Y tú?",
        sender: "contact",
        timestamp: 20000000,
        status: "delivered"
      },
      {
        id: 3,
        content: "Todo bien, gracias por preguntar.",
        sender: "user",
        timestamp: 20000000,
        status: "read"
      },
      {
        id: 4,
        content: "¿Qué has estado haciendo últimamente?",
        sender: "user",
        timestamp: 20000000,
        status: "pending"
      },
      {
        id: 5,
        content: "He estado trabajando en un proyecto nuevo.",
        sender: "contact",
        timestamp: 20000000,
        status: "sent"
      },
      {
        id: 6,
        content: "Eso suena interesante. ¿De qué se trata?",
        sender: "user",
        timestamp: 20000000,
        status: "delivered"
      },
      {
        id: 6,
        content: "Eso suena interesante. ¿De qué se trata?",
        sender: "user",
        timestamp: 20000000,
        status: "delivered"
      },

    ]
  }

  ngAfterViewChecked() {
    this.scrollToBottom()
  }

  scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight
    } catch (err) { }
  }

  getStatusText(): string {
    if (!this.activeContact) return ""

    if (this.activeContact.status === "online") {
      return "En línea"
    } else if (this.activeContact.status === "typing") {
      return "Escribiendo..."
    } else {
      return "Última vez hoy a las " + this.activeContact.lastSeen
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case "sent":
        return "check"
      case "delivered":
        return "done_all"
      case "read":
        return "done_all"
      default:
        return "schedule"
    }
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  onSendMessage(): void {
    if (this.newMessage.trim()) {
      this.newMessage = ""
      setTimeout(() => {
        this.isTyping = true

        setTimeout(() => {
          this.isTyping = false
        }, 2000)
      }, 1000)
    }
  }

  sendMessage(): void {
    this.services_ws.sendMessage(this.message)
  }

  ngOnDestroy(): void {
    this.services_ws.disconnect()
  }

}
