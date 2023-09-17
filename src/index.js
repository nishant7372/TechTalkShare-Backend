const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/user");
const { router: articleRouter, activeDownloads } = require("./routers/article");
const sharingRouter = require("./routers/sharing");
const downloadRouter = require("./routers/download");
const messageRouter = require("./routers/message");
const avatarRouter = require("./routers/avatar");
const Message = require("./models/message");
const storeRouter = require("./routers/store");
const socketio = require("socket.io");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  origin: ["http://localhost:3001", "https://d3vstore.netlify.app"],
  methods: "*",
};

app.use(cors(corsOptions));

app.use(express.json()); // parse incoming json to object for accessing it in request handlers
app.use(userRouter); // registering user router
app.use(articleRouter); // regstering article router
app.use(sharingRouter); // regstering sharing router
app.use(downloadRouter); // registering download Router
app.use(messageRouter); // registering message Router
app.use(storeRouter); // registering store Router
app.use(avatarRouter); //registering avatar Router

const server = app.listen(port, () => {
  console.log("Server is up on the port " + port);
});

const io = socketio(server, { cors: corsOptions });

const connectedClients = new Map();
const chatClients = new Map();
const chatClientsManager = new Map();

io.on("connection", (socket) => {
  console.log("New Websocket connnection! SocketId:", socket.id);
  const socketId = socket.id;
  connectedClients.set(socketId, socket);

  socket.emit("socketId", { socketId: socket.id });

  socket.on("connected", (res) => {
    if (res.message === "Chat Connection Established") {
      chatClients.set(res.userId, socket);
      chatClientsManager.set(socketId, res.userId);
      io.emit("online_users", Array.from(chatClients.keys()));
    }
    console.log(res);
    console.log("\nOnline Clients: ", connectedClients.keys());
    console.log("Online Chat Clients: ", chatClients.keys());
  });

  socket.on("downloadStatus", (getActiveDownloads) => {
    getActiveDownloads(activeDownloads);
  });

  // when a sender sends a message
  // - Server sends it to reciever (when online)
  // - Server save the message in database as well
  socket.on("new_message", async (newMessage) => {
    const { sender, content, reciever } = newMessage;
    try {
      const message = new Message({
        content,
        sender,
        reciever,
      });
      await message.save();

      if (chatClients.has(reciever)) {
        chatClients.get(reciever).emit("new_message", message);
        console.log("Message sent");
      }
    } catch (err) {
      console.log(err.message);
    }
  });

  socket.on("disconnect", () => {
    connectedClients.delete(socketId);
    chatClients.delete(chatClientsManager.get(socketId));
    io.emit("online_users", Array.from(chatClients.keys()));
    console.log("\nClient disconnected!, SocketID:", socketId);
    console.log("\nOnline Clients: ", connectedClients.keys());
    console.log("Online Chat Clients: ", chatClients.keys());
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

module.exports.connectedClients = connectedClients;
