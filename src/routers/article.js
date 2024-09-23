const express = require("express");
const auth = require("../middleware/auth");
const Article = require("../models/article");
const Sharing = require("./../models/sharing");
const router = new express.Router();
const RecentItem = require("../models/recentItem");

// article creation endpoint (with Auth)

router.post("/article", auth, async (req, res) => {
  const article = new Article({
    ...req.body,
    owner: req.user._id,
  });
  try {
    await article.save();
    res.status(201).send({ ok: "Article Created" });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// All article reading endpoint (with Auth)

// GET /articles?completed=true  /articles?completed=true  /articles -> filtering
// GET /articles?limit=10&skip=0  -> Pagination
// GET /articles?sortBy=createdAt:asc / createdAt:desc --> Sorting

router.get("/articles", auth, async (req, res) => {
  const match = {};
  const sort = {};
  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(":");
    sort[parts[0]] = parts[1] == "desc" ? -1 : 1;
  }
  if (req.query.search) {
    match.topic = {
      $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  }
  if (req.query.tag) {
    const tag = req.query.tag;
    match.tags = { $elemMatch: { value: tag.value, label: tag.label } };
  }

  try {
    const articleCount = await Article.countDocuments({
      owner: req.user._id,
      ...match,
    });
    await req.user.populate({
      path: "articles",
      match,
      options: {
        limit: parseInt(req.query.limit),
        skip: parseInt(req.query.skip),
        sort,
      },
      select: "-content",
    });

    res.status(200).send({
      articles: req.user.articles,
      articleCount,
      ok: true,
    });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

// single article reading endpoint (with Auth)

router.get("/article/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const article = await Article.findOne({
      _id: id,
      owner: req.user._id,
    }).lean();
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    await createRecentItem(req);
    res.status(200).send({ article: article, ok: true });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

const createRecentItem = async (req) => {
  const { id } = req.params;
  const existingRecentItem = await RecentItem.findOne({ article: id });
  if (existingRecentItem) {
    existingRecentItem.updatedAt = new Date().toISOString();
    await existingRecentItem.save();
  } else {
    const recent = new RecentItem({
      article: id,
      isShared: false,
      owner: req.user._id,
    });
    await recent.save();
  }
};

// single article updating endpoint (with Auth)

router.patch("/article/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["topic", "content", "tags"];

  const isValidUpdate = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidUpdate) {
    return res.status(400).send({ message: "Invalid Updates!" });
  }

  try {
    const article = await Article.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    updates.forEach((update) => (article[update] = req.body[update]));
    await article.save();
    res.status(200).send({ ok: "Article Successfully Updated" });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

const cleanup = async (id) => {
  await Sharing.deleteMany({
    article: id,
  });
  await RecentItem.deleteOne({
    article: id,
  });
};

// single article deleting endpoint (with Auth)

router.delete("/article/:id", auth, async (req, res) => {
  try {
    const article = await Article.findOneAndDelete({
      _id: req?.params.id,
      owner: req?.user._id,
    }).lean();

    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    await cleanup(req?.params?.id);
    res.status(200).send({ ok: "Article Successfully Deleted" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
