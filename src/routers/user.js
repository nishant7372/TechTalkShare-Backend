const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/user");

const router = new express.Router();

// SignUp and LogIn EndPoints -------------------------------------------

router.get("/dummy", async (req, res) => {
  res.send("hello, server is working");
});

// user signup endpoint
router.post("/users", async (req, res) => {
  const user = new User(req.body);
  try {
    const { osname, browser, creationTime, model } = req.body;
    const token = await user.generateAuthToken(
      osname,
      creationTime,
      browser,
      model
    );
    await user.save();
    // 201 -> created
    res.status(201).send({ user, token, ok: "Signup Successful" });
  } catch (error) {
    // 400 -> bad request (invalid data)
    res.status(400).send({ message: error.message });
  }
});

// user login endpoint
router.post("/users/login", async (req, res) => {
  try {
    const { userName, password, osname, browser, creationTime, model } =
      req.body;
    const user = await User.findByCredentials(userName, password);
    const token = await user.generateAuthToken(
      osname,
      creationTime,
      browser,
      model
    );
    res.status(200).send({ user, token, ok: "Login Successful" });
  } catch (error) {
    // 400 -> bad request (invalid request)
    res.status(400).send({ message: error.message });
  }
});

// LogOut Endpoints ------------------------------------------

// current session logout endPoint

router.post("/users/logout", auth, async (req, res) => {
  try {
    req.user.sessions = req.user.sessions.filter(
      (session) => session.token != req.token
    );
    await req.user.save();
    res.status(200).send({ ok: "Logout Successful" });
  } catch (e) {
    res.status(500).send({ message: error.message });
  }
});

// logOut By Session Id endPoint (Multiple Sessions)

router.post("/users/logout/:id", auth, async (req, res) => {
  const id = req.params.id;
  try {
    req.user.sessions = req.user.sessions.filter(
      (session) => session._id.toString() != id
    );
    await req.user.save();
    res.status(200).send({ ok: "Logout Successful" });
  } catch (e) {
    res.status(500).send({ message: error.message });
  }
});

// all other session logout endPoint

router.post("/users/logoutAllOther", auth, async (req, res) => {
  try {
    req.user.sessions = req.user.sessions.filter(
      (session) => session.token == req.token
    );
    await req.user.save();
    res.status(200).send({ ok: "Logout Successful" });
  } catch (e) {
    res.status(500).send({ message: error.message });
  }
});

// User Read, Update and Delete ----------------------------------

// user reading endpoint (Read Profile)

router.get("/users/me", auth, async (req, res) => {
  try {
    const session = req.user.sessions.find(
      (session) => session.token == req.token
    );
    res.send({ user: req?.user, currentSessionId: session?.id, ok: true });
  } catch (error) {
    // internal server error / server down
    res.status(500).send({ message: error.message });
  }
});

// single user updating endpoint (Update user)

router.patch("/users/me", auth, async (req, res) => {
  const updates = Object.keys(req?.body);
  const allowedUpdates = ["name", "userName", "password", "age"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidOperation) {
    return res.status(400).send({ message: "Invalid Updates!" });
  }
  try {
    updates.forEach((update) => (req.user[update] = req.body[update]));
    await req.user.save();
    res
      .status(200)
      .send(
        updates?.[0] === "password"
          ? { ok: "Password updated Successfully" }
          : { ok: "User Updated Successfully" }
      );
  } catch (error) {
    // 400 -> bad request (invalid request)
    return res.status(400).send({ message: error.message });
  }
});

// loggedin user delete endpoint (Delete User)

router.delete("/users/me", auth, async (req, res) => {
  try {
    await req.user.remove();
    res.status(200).send({ ok: "User Account Deleted Successfully" });
  } catch (error) {
    // internal server error / server down
    res.status(500).send({ message: error.message });
  }
});

// users fetch endpoint

router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.find({}, "name userName avatar");
    res.status(200).send({ ok: true, users });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// single user fetch endpoint

router.get("/user/:userName", auth, async (req, res) => {
  const { userName } = req.params;
  try {
    const user = await User.findOne({ userName }, "name userName avatar");
    if (!user) {
      return res.status(404).send({ message: "No User Found" });
    }
    res.status(200).send({ ok: true, user });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

module.exports = router;
