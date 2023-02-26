const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/user");
const multer = require("multer");
const sharp = require("sharp");

const router = new express.Router();

// validating avatar upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1000000, // 1MB
  },
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|png|jpeg)$/)) {
      return cb(new Error("Please upload an image"));
    }
    cb(undefined, true);
  },
});

// avatar upload endpoint (with Authorization)
router.post(
  "/users/me/avatar",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 250, height: 250 })
      .png()
      .toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
  },
  (error, req, res, next) => {
    res.status(400).send({ error: error.message });
  }
);

// avatar delete endpoint (with Authorization)
router.delete("/users/me/avatar", auth, async (req, res) => {
  try {
    req.user.avatar = undefined;
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

// avatar fetching endpoint by user id
router.get("/users/:id/avatar", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.avatar) {
      throw new Error();
    }

    res.set("Content-Type", "image/png"); // by default application/json
    res.send(user.avatar);
  } catch (e) {
    res.status(404).send();
  }
});

// user creation endpoint / signup endpoint
router.post("/users", async (req, res) => {
  const user = new User(req.body);
  try {
    const { osname, time, model } = req.body;
    const token = await user.generateAuthToken(osname, time, model);
    await user.save();
    // 201 -> created
    res.status(201).send({ user, token });
  } catch (error) {
    // 400 -> bad request (invalid data)
    res.status(400).send({ error: error.message });
  }
});

// login endpoint
router.post("/users/login", async (req, res) => {
  try {
    const { email, password, osname, time, model } = req.body;
    const user = await User.findByCredentials(email, password);
    const token = await user.generateAuthToken(osname, time, model);
    res.send({ user, token });
  } catch (error) {
    // 400 -> bad request (invalid request)
    res.status(400).send({ error: error.message });
  }
});

// current session logout endPoint
router.post("/users/logout", auth, async (req, res) => {
  try {
    let idx = req.user.tokens.findIndex((x) => x.token === req.token);
    req.user.tokens = req.user.tokens.filter(
      (token) => token.token != req.token
    );
    req.user.sessions = req.user.sessions.filter(
      (session, index) => index != idx
    );
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

//logOut By Session Id
router.post("/users/logout/:id", auth, async (req, res) => {
  const id = req.params.id;
  try {
    let idx = req.user.sessions.findIndex((x) => x._id.toString() === id);
    req.user.tokens = req.user.tokens.filter((token, index) => index != idx);
    req.user.sessions = req.user.sessions.filter(
      (session, index) => index != idx
    );
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

// get current session
router.get("/users/currentSession/", auth, async (req, res) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    let idx = req.user.tokens.findIndex((x) => x.token === token);
    res.send({ currentSessionIndex: req.user.tokens.length - (idx + 1) });
  } catch (e) {
    res.status(500).send();
  }
});

// all session logout endPoint
router.post("/users/logoutAll", auth, async (req, res) => {
  try {
    req.user.sessions = [];
    req.user.tokens = [];
    await req.user.save();
    res.send();
  } catch (e) {
    res.status(500).send();
  }
});

// user reading endpoint
// fetch current loggedin authorized user
router.get("/users/me", auth, async (req, res) => {
  try {
    res.send(req.user);
  } catch (error) {
    // internal server error / server down
    res.status(500).send();
  }
});

// single user updating endpoint
router.patch("/users/me", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "email", "password", "age"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    // 400 -> bad request (invalid request)
    return res.status(400).send({ error: "Invalid Updates!" });
  }
  try {
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();
    res.send(req.user);
  } catch (error) {
    // 400 -> bad request (invalid request)
    return res.status(400).send(error.message);
  }
});

// loggedin user delete endpoint
router.delete("/users/me", auth, async (req, res) => {
  try {
    await req.user.remove();
    res.send(req.user);
  } catch (error) {
    // internal server error / server down
    res.status(500).send();
  }
});

module.exports = router;
