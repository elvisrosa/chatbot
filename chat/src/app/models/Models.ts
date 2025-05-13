export class Message {
    id?: string;
    to?: string;
    from?: string;
    content?: any;
    timestamp?: Date;
    type?: string;
    status?: "sent" | "delivered" | "read" | "pending" | "pendig_acceptance";
}

export class Response {
    statusCode: number = 0;
    message: string = '';
    data: any;
}

export class Contact {
    id: string = '';
    lastSeen: string = '';
    name: string = '';
    online: boolean = false;
    phone: string = '';
    profilePicture: string = '';
    status?: "pendig_acceptance" | "reject" | "contact";
    statusMessage: string = '';
    username: string = '';
}