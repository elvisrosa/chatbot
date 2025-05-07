import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: "app-sidebar",
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})

export class SidebarComponent {

  @Input() contacts: any[] = []
  @Input() activeContactId = 0
  @Input() autenticated: boolean = false
  @Output() contactSelected = new EventEmitter<number>()

  searchTerm = ""

  get filteredContacts() {

    // Simulated data for demonstration purposes
    let contacts = [];
    for (let i = 0; i < 25; i++) {
      contacts.push({
        id: i + 1,
        name: "John Doe " + (i + 1),
        lastMessage: "Hello, how are you? " + i,
        lastMessageTime: "10:30 AM",
        lastMessageStatus: "sent",
        unreadCount: i + 1,
        status: "sent",
        avatar: "../../../assets/svgs/user.svg",
      });
    }


    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase()
      return contacts.filter(
        (contact) => contact.name.toLowerCase().includes(term) || contact.lastMessage.toLowerCase().includes(term),
      )
    }
    return contacts;
  }

  selectContact(id: number) {
    this.contactSelected.emit(id)
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

}
