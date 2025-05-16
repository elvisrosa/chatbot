db = db.getSiblingDB("chat");
/**
 * 12345
 */
const password = "$2a$12$QE11j3cvVGk8sVnBu3ycCevj0Z4CQL7I40kWKcBDz.ZNoXHiG9lFW";
const users = [
  {
    _id: ObjectId(),
    username: "admin",
    password: password,
    phone: "+521000000001",
    name: "Administrador del Sistema (Prueba)",
    profilePicture: "",
    statusMessage: "Activo",
    contacts: [],
    groups: [],
    lastSeen: new Date(),
    online: true
  },
  {
    _id: ObjectId(),
    username: "juan",
    password: password,
    phone: "+521000000002",
    name: "Juan Pérez",
    profilePicture: "",
    statusMessage: "Hola soy Juan",
    contacts: [],
    groups: [],
    lastSeen: new Date(),
    online: true
  },
  {
    _id: ObjectId(),
    username: "pepe",
    password: password,
    phone: "+521000000003",
    name: "Pepe Gómez",
    profilePicture: "",
    statusMessage: "Trabajando",
    contacts: [],
    groups: [],
    lastSeen: new Date(),
    online: true
  },
  {
    _id: ObjectId(),
    username: "maria",
    password: password,
    phone: "+521000000004",
    name: "Maria López",
    profilePicture: "",
    statusMessage: "De vacaciones",
    contacts: [],
    groups: [],
    lastSeen: new Date(),
    online: true
  }
];

// Agregar contactos a admin
users[0].contacts = [
  { userId: users[1]._id, nickname: "Juan", isBlocked: false, status : "pendig_acceptance", unreadMessages: 0 },
  { userId: users[2]._id, nickname: "Pepe", isBlocked: false, status: "contact", unreadMessages: 0 },
  { userId: users[3]._id, nickname: "Maria", isBlocked: false, status: "contact", unreadMessages: 0 }
];

// Crear grupo test
const group = {
  _id: ObjectId(),
  name: "test",
  adminIds: [users[0]._id],
  memberIds: users.map(u => u._id),
  groupPicture: "",
  createdAt: new Date()
};

// Agregar grupo a cada usuario
users.forEach(u => u.groups.push(group._id));

// Insertar usuarios
db.users.insertMany(users);

// Insertar grupo
db.groups.insertOne(group);

// Crear estados
const statuses = users.map(u => ({
  _id: ObjectId(),
  userId: u._id,
  mediaUrl: "https://cdn.app.com/status/test.jpg",
  caption: "Estado de prueba",
  timestamp: new Date(),
  views: []
}));
db.statuses.insertMany(statuses);

// Documentos de ejemplo
const documents = users.map(u => ({
  _id: ObjectId(),
  ownerId: u._id,
  name: "archivo.pdf",
  url: "https://cdn.app.com/docs/archivo.pdf",
  type: "pdf",
  uploadedAt: new Date()
}));
db.documents.insertMany(documents);

// Mensaje de bienvenida en grupo
db.messages.insertOne({
  _id: ObjectId(),
  senderId: users[0]._id,
  receiverId: group._id,
  isGroupMessage: true,
  content: {
    type: "text",
    body: "Bienvenidos al grupo test!",
    mediaUrl: null
  },
  edit: false,
  timestamp: new Date(),
  status: "sent"
});
