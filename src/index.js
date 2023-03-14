const express = require("express");
require("./db/mongoose");
const userRouter = require("./routers/user");
const articleRouter = require("./routers/article");
const sharingRouter = require("./routers/sharing");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(express.json()); // parse incoming json to object for accessing it in request handlers
app.use(userRouter); // registering user router
app.use(articleRouter); // regstering article router
app.use(sharingRouter); // regstering sharing router

app.listen(port, () => {
  console.log("Server is up on the port " + port);
});
