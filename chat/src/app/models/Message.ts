export class Message {

    id: number = 0;
    sender: string = '';
    content: string = '';
    timestamp: number = 0;
    type?: string = '';
    status: "sent" | "delivered" | "read" | "pending" = "sent";
}