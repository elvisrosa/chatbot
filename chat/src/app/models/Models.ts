export class Message {
    id?: string;
    to?: string;
    from?: string;
    content?: any;
    timestamp?: Date;
    type?: string;
    status?: "sent" | "delivered" | "read" | "pending" | "pendig_acceptance";
}

export interface MessageRequest {
    from: string;
    to: string;
    content: string;
    type: string;
    timestamp?: Date;
}


export class Response {
    statusCode: number = 0;
    message: string = '';
    data: any;
}

export interface Contact {
    id: string;
    lastSeen: string;
    name: string;
    online: boolean;
    phone: string;
    profilePicture: string;
    status?: "pendig_acceptance" | "reject" | "contact";
    statusMessage: string;
    username: string;
    unreadMessages: number;
    lastMessage?: LastMessage;
}

export class LastMessage {
    message?: string;
    date?: Date;
    status?: string;
}

export class MenuOption {
    id?: string = '';
    label?: string = '';
    divider?: boolean = false;
    action?: string = '';
    color?: string = '';
    icon?: string = '';
    danger?: string = '';
}

export class UserLogin {
    username: string = '';
    password: string = '';
}

export class ModelMessage {
    date?: Date;
    messages?: Message[];
}

export interface Content {
    type: string;
    body: string;
    mediaUrl: string;
}