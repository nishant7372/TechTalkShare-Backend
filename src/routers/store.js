const express = require("express");
const auth = require("../middleware/auth");
const RecentItem = require("../models/recentItem");
const PinnedItem = require("../models/pinnedItem");
const Article = require("../models/article");
const StarredItem = require("../models/starredItem");
const Folder = require("../models/folder");
const { ObjectId } = require("mongodb");

const router = new express.Router();

// get recents
router.get("/recent", auth, async (req, res) => {
  const limit = parseInt(req?.query?.limit) || null;
  try {
    let recents = await RecentItem.find({ owner: req?.user?._id })
      .select("-owner")
      .populate({
        path: "article",
        select: "topic",
      })
      .sort({ updatedAt: "desc" })
      .limit(limit);
    res.send({ count: recents?.length, recents: recents });
  } catch (err) {
    res.status(500).send({ message: err?.message });
  }
});

// add to pin
router.post("/pin", auth, async (req, res) => {
  const { id, isShared } = req?.body;
  try {
    const isArticlePresent = await Article.findOne({
      _id: id,
      owner: req.user._id,
    });
    // if article does not exists or belongs to a different user.
    console.log("isArticlePresent>>>>>>>>>>>>>>>>>", isArticlePresent);
    if (!isArticlePresent) {
      return res.status(404).send({ message: "Item not found" });
    }
    const isAlreadyPinned = await PinnedItem.findOne({
      article: id,
      owner: req?.user?._id,
    });
    console.log("isAlreadyPinned>>>>>>>>>>>>>>>>>", isAlreadyPinned);
    // if article is already pinned
    if (isAlreadyPinned) {
      return res.status(200).send({
        ok: "Item is already pinned!",
      });
    }
    // creating a new pin for the current article
    const pinned = new PinnedItem({
      article: id,
      isShared,
      owner: req.user._id,
    });
    await pinned.save();
    res.status(201).send({ ok: "Added!" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// unpin
router.delete("/pin/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const pinned = await PinnedItem.findOneAndDelete({
      article: id,
      owner: req.user._id,
    }).lean();
    if (!pinned) {
      return res.status(404).send({ message: "Item Not Found" });
    }
    res.status(200).send({ ok: "Item unpinned" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// retreive pinned
router.get("/pinned", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || null;
    let pinned = await PinnedItem.find({ owner: req.user._id })
      .select("-owner")
      .populate({
        path: "article",
        select: "topic",
      })
      .sort({ updatedAt: "desc" })
      .limit(limit);

    res.send({ count: pinned.length, pinned: pinned });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// add to starred
router.post("/star", auth, async (req, res) => {
  const { id, isShared } = req.body;
  try {
    const isArticlePresent = await Article.findOne({
      _id: id,
      owner: req.user._id,
    });
    // if article does not exists or belongs to a different user.
    console.log("isArticlePresent>>>>>>>>>>>>>>>>>", isArticlePresent);
    if (!isArticlePresent) {
      return res.status(404).send({ message: "Item not found" });
    }
    const isAlreadyStarred = await StarredItem.findOne({
      article: id,
      owner: req.user._id,
    });
    console.log("isAlreadyStarred>>>>>>>>>>>>>>>>>", isAlreadyStarred);
    // if article is already starred
    if (isAlreadyStarred) {
      return res.status(200).send({
        ok: "Item is already starred!",
      });
    }
    // starring current article
    const starred = new StarredItem({
      article: id,
      isShared,
      owner: req.user._id,
    });
    await starred.save();
    res.status(201).send({ ok: "Starred!" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// remove star
router.delete("/star/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const starred = await StarredItem.findOneAndDelete({
      article: id,
      owner: req.user._id,
    }).lean();
    if (!starred) {
      return res.status(404).send({ message: "Item Not Found" });
    }
    res.status(200).send({ ok: "Remove from starred" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// retreive starred
router.get("/starred", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || null;
    let starred = await StarredItem.find({ owner: req.user._id })
      .select("-owner")
      .populate({
        path: "article",
        select: "topic",
      })
      .sort({ updatedAt: "desc" })
      .limit(limit);

    res.send({ count: starred.length, starred: starred });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// create a new folder
router.post("/folder", auth, async (req, res) => {
  const { name } = req.body;
  try {
    const folder = new Folder({
      name,
      owner: req.user._id,
    });
    await folder.save();
    res.send({ ok: "Folder Created" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// get folder by id
router.get("/folder/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const folder = await Folder.findOne({
      owner: req.user._id,
      _id: id,
    }).populate({ path: "files" });
    console.log(folder);
    if (!folder) {
      return res.status(404).send({ message: "Folder not found" });
    }
    res.send({ folder });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// delete a new folder
router.delete("/folder/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const folder = await Folder.findOneAndDelete({
      _id: id,
      owner: req.user._id,
    }).lean();
    if (!folder) {
      return res.status(404).send({ message: "Folder not found" });
    }
    res.send({ ok: "Folder deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// get all folders
router.get("/folders", auth, async (req, res) => {
  const limit = parseInt(req.query.limit) || null;
  try {
    let folders = await Folder.find({ owner: req.user._id })
      .limit(limit)
      .lean();
    res.send({ count: folders.length, folders: folders });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

router.post("/addfiles", auth, async (req, res) => {
  const { files, id } = req.body;
  try {
    const result = await Folder.updateOne(
      { _id: id, owner: req.user._id },
      { $addToSet: { files: { $each: files } } }
    ).lean();
    if (!result.matchedCount) {
      return res.status(404).send({ message: "Folder not found" });
    }
    res.send({ ok: "Files Added" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
