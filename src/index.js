const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/user");
const { router: articleRouter, activeDownloads } = require("./routers/article");
const sharingRouter = require("./routers/sharing");
const downloadRouter = require("./routers/download");
const socketio = require("socket.io");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.json()); // parse incoming json to object for accessing it in request handlers
app.use(userRouter); // registering user router
app.use(articleRouter); // regstering article router
app.use(sharingRouter); // regstering sharing router
app.use(downloadRouter); // registering download Router

const server = app.listen(port, () => {
  console.log("Server is up on the port " + port);
});

const io = socketio(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"],
  },
});

const connectedClients = {};

io.on("connection", (socket) => {
  console.log("New Websocket connnection", socket.id);
  const socketId = socket.id;
  connectedClients[socketId] = socket;
  socket.emit("socketId", { socketId: socket.id });

  socket.on("connected", (res) => console.log(res));

  socket.on("downloadStatus", (getActiveDownloads) => {
    getActiveDownloads(activeDownloads);
  });

  socket.on("disconnect", () => {
    connectedClients[socketId] = undefined;
    console.log(socketId, "Client disconnected!");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});

module.exports.connectedClients = connectedClients;

// setInterval(() => {
//   const options = {
//     hostname: "prostore-backend.onrender.com",
//     path: "/dummy",
//     method: "GET",
//   };

//   const req = http.request(options, (res) => {
//     console.log(
//       `Heartbeat Check: Server is live. Response status: ${res.statusCode}`
//     );
//   });

//   req.on("error", (error) => {
//     console.error("Error sending heartbeat request:", error);
//   });

//   req.end();
// }, 5 * 60 * 1000); // Send the dummy request every 5 min
