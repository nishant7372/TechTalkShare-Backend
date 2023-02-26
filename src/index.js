const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/user");
const taskRouter = require("./routers/task");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.json()); // parse incoming json to object for accessing it in request handlers
app.use(userRouter); // registering user router
app.use(taskRouter); // registering task router

app.listen(port, () => {
  console.log("Server is up on the port " + port);
});
