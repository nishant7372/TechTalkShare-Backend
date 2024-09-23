const express = require("express");
const auth = require("../middleware/auth");
const User = require("../models/user");
const multer = require("multer");
const sharp = require("sharp");

const router = new express.Router();

// Avatar Upload, Delete and Fetch Endpoint  -----------------------------

// validating avatar upload using multer
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

// avatar upload endpoint (with Auth)
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
    res.status(201).send({ ok: "Avatar Successfully Uploaded" });
  },
  (error, req, res, next) => {
    res.status(400).send({ message: error?.message });
  }
);

// avatar delete endpoint (with Auth)
router.delete("/users/me/avatar", auth, async (req, res) => {
  try {
    req.user.avatar = undefined;
    await req.user.save();
    res.status(200).send({ ok: "Avatar Successfully Deleted" });
  } catch (error) {
    res.status(500).send({ message: error?.message });
  }
});

// avatar fetching endpoint by user id
router.get("/users/:id/avatar", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).send({ message: "User Not Found" });
    }
    res.set("Content-Type", "image/png"); // by default application/json
    res.status(200).send({ ok: true, avatar: user?.avatar });
  } catch (error) {
    res.status(500).send({ message: error?.message });
  }
});

module.exports = router;
