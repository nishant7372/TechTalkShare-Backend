const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/user");
const articleRouter = require("./routers/article");
const sharingRouter = require("./routers/sharing");
const downloadRouter = require("./routers/download");

const http = require("http");
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

setInterval(() => {
  const options = {
    hostname: "prostore-backend.onrender.com",
    path: "/dummy",
    method: "GET",
  };

  const req = http.request(options, (res) => {
    console.log(
      `Heartbeat Check: Server is live. Response status: ${res.statusCode}`
    );
  });

  req.on("error", (error) => {
    console.error("Error sending heartbeat request:", error);
  });

  req.end();
}, 5 * 60 * 1000); // Send the dummy request every 5 min
