const express = require("express");
const auth = require("../middleware/auth");
const Article = require("../models/article");
const Sharing = require("./../models/sharing");
const User = require("./../models/user");

const router = new express.Router();

// Article sharing point (with Auth)

router.post("/articles/share", auth, async (req, res) => {
  const { email, articleID } = req.body;
  const sharedBy = req.user._id;

  try {
    const sharedWithUser = await User.findOne({ email });
    if (!sharedWithUser) {
      return res.status(404).send({ message: "User not found" });
    }

    // when sharing with yourself
    if (sharedBy.toString() === sharedWithUser._id.toString()) {
      return res.status(400).send({ message: "Cannot share with yourself" });
    }

    // when shared with the owner
    const isOwner = await Article.findOne({
      _id: articleID,
      owner: sharedWithUser._id,
    });
    if (isOwner) {
      return res.status(400).send({ message: `Cannot share with the owner` });
    }

    // when already shared to a user
    const existingSharing = await Sharing.findOne({
      article: articleID,
      sharedWith: sharedWithUser._id,
    });
    if (existingSharing) {
      return res
        .status(400)
        .send({ message: `Article already shared with ${email}` });
    }

    const sharing = new Sharing({
      article: articleID,
      sharedWith: sharedWithUser._id,
      sharedBy,
    });

    await sharing.save();
    res.status(201).send(sharing);
  } catch (error) {
    res.status(400).send(error);
  }
});

// All shared articles reading endpoint (with Auth)
router.get("/shared", auth, async (req, res) => {
  const sort = {};

  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(":");
    sort[parts[0]] = parts[1] == "desc" ? -1 : 1;
  }

  const options = {
    limit: parseInt(req.query.limit),
    skip: parseInt(req.query.skip),
  };

  try {
    let sharing = await Sharing.find({ sharedWith: req.user._id })
      .populate({
        path: "article",
        populate: {
          path: "owner",
        },
      })
      .populate({
        path: "sharedBy",
      })
      .sort(sort);

    let articles = sharing.map((share) => ({
      ...share.toJSON(),
      sharedBy: { name: share.sharedBy.name, email: share.sharedBy.email },
      article: {
        ...share.article.toJSON(),
        owner: {
          name: share.article.owner.name,
          email: share.article.owner.email,
        },
      },
    }));

    // searching by topic name
    if (req.query.search) {
      const searchStr = req.query.search;
      articles = articles.filter((a) =>
        a.article.topic.toLowerCase().includes(searchStr.toLowerCase())
      );
    }

    //searching by tag
    if (req.query.tag) {
      const tag = req.query.tag;
      articles = articles.filter((a) =>
        a.article.tags.some(
          (t) => t.label.toLowerCase() === tag.label.toLowerCase()
        )
      );
    }

    // sorting by updated At
    if (req.query.sortBy) {
      const parts = req.query.sortBy.split(":");
      if (parts[0] === "updatedAt" && parts[1] === "asc") {
        articles = articles.sort(
          (a, b) =>
            new Date(a.article.updatedAt) - new Date(b.article.updatedAt)
        );
      } else if (parts[0] === "updatedAt" && parts[1] === "desc") {
        articles = articles.sort(
          (a, b) =>
            new Date(b.article.updatedAt) - new Date(a.article.updatedAt)
        );
      }
    }

    articles = articles.slice(
      options.limit * options.skip,
      options.limit * (options.skip + 1)
    );

    res.status(200).send({ articleCount: articles.length, articles });
  } catch (error) {
    console.log(error);
    res.status(400).send();
  }
});

// single shared article reading endpoint (with Auth)

router.get("/shared/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const article = await Article.findOne({ _id: id });
    if (!article) {
      return res.status(404).send();
    }
    res.send(article);
  } catch (error) {
    res.status(500).send();
  }
});

module.exports = router;
