const express = require("express");
const auth = require("../middleware/auth");
const Download = require("../models/download");

const router = new express.Router();

router.get("/downloads", auth, async (req, res) => {
  try {
    const downloads = await Download.find({
      owner: req.user._id,
    });
    res.status(200).send({ downloads, ok: true });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.delete("/downloads/:id", auth, async (req, res) => {
  try {
    const download = await Download.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!download) {
      return res.status(404).send({ message: "Download Record Not Found" });
    }
    res.status(200).send({ ok: "Record Successfully Deleted" });
  } catch (error) {
    res.status(500).send({ message: error?.message });
  }
});

module.exports = router;
