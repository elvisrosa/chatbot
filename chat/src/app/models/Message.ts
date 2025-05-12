export class Message {

    id?: string;
    to?: string;
    from?: string;
    content?: any;
    timestamp?: Date;
    type?: string;
    status?: "sent" | "delivered" | "read" | "pending" | "pendig_acceptance";
}