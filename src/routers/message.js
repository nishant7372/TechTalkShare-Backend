const express = require("express");
const auth = require("../middleware/auth");
const Message = require("./../models/message");
const User = require("../models/user");

const router = new express.Router();

router.get("/messages/:userName", auth, async (req, res) => {
  const { userName } = req.params;
  try {
    const receiver = await User.findOne({ userName });
    if (!receiver) {
      return res.status(404).send({ message: "User Not Found" });
    }

    const messagesSentByReceiver = await Message.find({
      sender: receiver._id, // Get messages sent by the receiver to the authenticated user
      reciever: req.user._id, // The authenticated user is the receiver in this case
    });

    const messagesSentByUser = await Message.find({
      sender: req.user._id, // The authenticated user is the sender in this case
      reciever: receiver._id, // Get messages sent by the authenticated user to the receiver
    });

    const allMessages = [...messagesSentByReceiver, ...messagesSentByUser].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    res.send({ ok: true, messages: allMessages });
  } catch (error) {
    return res.status(500).send({ message: error.message });
  }
});

router.post("/message/:userName", auth, async (req, res) => {
  const { userName } = req.params;
  const { content } = req.body;
  try {
    const reciever = await User.findOne({ userName });
    if (!reciever) {
      return res.status(404).send({ message: "User Not Found" });
    }
    const message = new Message({
      content,
      sender: req.user._id,
      reciever: reciever._id,
    });
    await message.save();
    res.status(201).send({ ok: "Message Sent" });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

router.patch("/message/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    // checking if the updates are allowed
    const updates = Object.keys(req.body);
    const allowedUpdates = ["content"];

    const isValidUpdate = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidUpdate) {
      return res.status(400).send({ message: "Invalid Updates!" });
    }
    const message = await Message.findOne({ _id: id, sender: req.user._id });
    if (!message) {
      return res.status(404).send({ message: "Message Not Found" });
    }
    updates.forEach((update) => (message[update] = req.body[update]));
    await message.save();
    res.status(200).send({ ok: "Message Updated Successfully" });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

router.delete("/message/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    // checking if the updates are allowed
    const message = await Message.findOneAndDelete({
      _id: id,
      sender: req.user._id,
    }).lean();
    if (!message) {
      return res.status(404).send({ message: "Message Not Found" });
    }
    res.status(200).send({ ok: "Message Deleted Successfully" });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

module.exports = router;
