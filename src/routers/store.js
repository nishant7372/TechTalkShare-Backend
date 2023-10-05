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
    let count = await RecentItem.countDocuments({});
    let recents = await RecentItem.find({ owner: req?.user?._id })
      .select("-owner")
      .populate({
        path: "article",
        select: "topic",
      })
      .sort({ updatedAt: "desc" })
      .limit(limit)
      .lean();
    recents = recents.map(({ article, ...item }) => {
      return { ...item, ...article };
    });
    res.send({ count, recents, ok: true });
  } catch (err) {
    res.status(500).send({ message: err?.message });
  }
});

// add to pin
router.post("/pin", auth, async (req, res) => {
  const { id } = req?.body;
  try {
    const article = await Article.findOne({
      _id: id,
      owner: req.user._id,
    });
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    article["isPinned"] = true;
    await article.save();
    res.status(201).send({ ok: "Added!" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// unpin
router.delete("/pin/:id", auth, async (req, res) => {
  const { id } = req?.params;
  try {
    const article = await Article.findOne({
      _id: id,
      owner: req.user._id,
    });
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    article["isPinned"] = false;
    await article.save();
    res.status(200).send({ ok: "Article Unpinned" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// retreive pinned
router.get("/pinned", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || null;
    let count = await Article.countDocuments({
      owner: req.user._id,
      isPinned: true,
    });
    let pinned = await Article.find({ owner: req.user._id, isPinned: true })
      .select("-content -owner")
      .sort({ updatedAt: "desc" })
      .limit(limit)
      .lean();

    res.send({ count, pinned, ok: true });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// add to starred
router.post("/star", auth, async (req, res) => {
  const { id } = req?.body;
  try {
    const article = await Article.findOne({
      _id: id,
      owner: req.user._id,
    });
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    article["isStarred"] = true;
    await article.save();
    res.status(201).send({ ok: "Starred!" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// remove from starred
router.delete("/star/:id", auth, async (req, res) => {
  const { id } = req?.params;
  try {
    const article = await Article.findOne({
      _id: id,
      owner: req.user._id,
    });
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    article["isStarred"] = false;
    await article.save();
    res.status(200).send({ ok: "Remove from Starred!" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

// retreive starred
router.get("/starred", auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || null;
    let count = await Article.countDocuments({
      owner: req.user._id,
      isStarred: true,
    });
    let starred = await Article.find({ owner: req.user._id, isStarred: true })
      .select("-content -owner")
      .sort({ updatedAt: "desc" })
      .limit(limit)
      .lean();

    res.send({ count, starred, ok: true });
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
    res.status(400).send({ message: err.message });
  }
});

// get folder by id
router.get("/folder/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const folder = await Folder.findOne({
      owner: req.user._id,
      _id: id,
    }).populate({ path: "files", select: "-content -votes" });

    if (!folder) {
      return res.status(404).send({ message: "Folder not found" });
    }
    res.status(200).send({ folder, ok: true });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// delete a folder
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
    res.status(400).send({ message: err.message });
  }
});

// get all folders
router.get("/folders", auth, async (req, res) => {
  const limit = parseInt(req.query.limit) || null;
  try {
    let folders = await Folder.find({ owner: req.user._id })
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    res.send({ count: folders.length, folders: folders, ok: true });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
});

// add files
router.post("/folder/addfiles", auth, async (req, res) => {
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
    res.status(400).send({ message: err.message });
  }
});

// rename a folder
router.patch("/folder/rename", auth, async (req, res) => {
  const { name, id } = req.body;
  try {
    const folder = await Folder.findOne({ _id: id, owner: req?.user?._id });
    if (!folder) {
      return res.status(404).send({ message: "Folder not found" });
    }
    folder["name"] = name;
    await folder.save();
    res.send({ ok: "Folder Renamed Successfully" });
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;
