db = db.getSiblingDB("chat");
db.users.insertOne({
  _id: new ObjectId(),
  username: "admin",
  password: "$2a$12$5cHWzl5cbgRseTieU8QLjuo5zY0eiHxtodNEBgm1Ef8re0Lrt/scW",
  fullName: "Administrador del Sistema"
});
