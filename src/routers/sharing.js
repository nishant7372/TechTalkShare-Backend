const express = require("express");
const auth = require("../middleware/auth");
const Article = require("../models/article");
const Sharing = require("./../models/sharing");
const User = require("./../models/user");

const router = new express.Router();

// Article sharing point (with Auth)

// article can be shared only by the owner
// cannot share to yourself
// cannot share if already shared with a user
// permissions - edit
// message - edit
// constraints - sharedWith user must exist, article must exist, sharedBy must be owner(no explicit field required)

router.post("/articles/share", auth, async (req, res) => {
  const { users, articleID } = req.body;
  let sharingErrors = "";

  try {
    // Check if the article exists and belongs to the user
    const article = await Article.findOne({
      _id: articleID,
      owner: req.user._id,
    }).lean();
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }

    for (const user of users) {
      try {
        await share(user, req);
      } catch (error) {
        sharingErrors += `${error.message}<br>`;
      }
    }

    if (sharingErrors?.length > 0) {
      return res.status(400).send({ message: sharingErrors });
    }

    res.status(200).send({ ok: "Article shared successfully" });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

const share = async (userId, req) => {
  const { articleID, editPermission, message } = req.body;

  // Check if the user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found for ID: ${userId}`);
  }

  // Check if sharing with oneself
  if (req.user._id.equals(user._id)) {
    throw new Error("Cannot share with yourself");
  }

  // Check if already shared to a user
  const alreadyShared = await Sharing.findOne({
    article: articleID,
    sharedWith: user._id,
  });
  if (alreadyShared) {
    throw new Error(`Article already shared with ${user.userName}`);
  }

  // Create and save the sharing document
  const sharing = new Sharing({
    article: articleID,
    sharedWith: user._id,
    editPermission,
    message,
  });
  await sharing.save();
};

// All shared articles reading endpoint (with Auth)
router.get("/shared", auth, async (req, res) => {
  const sort = {};
  const options = {
    limit: parseInt(req?.query?.limit),
    skip: parseInt(req?.query?.skip),
  };

  if (req?.query?.sortBy) {
    const parts = req.query.sortBy.split(":");
    sort[parts[0]] = parts[1] == "desc" ? -1 : 1;
  }

  try {
    let articles = await Sharing.find({ sharedWith: req.user._id })
      .select("editPermission createdAt message")
      .populate({
        path: "article",
        select: ["-content", "-createdAt"],
        populate: {
          path: "owner",
          select: ["name", "userName"],
        },
      })
      .sort(sort); // sorting sharings

    // searching by topic name
    if (req.query.search) {
      articles = articles.filter((a) =>
        a.article.topic.toLowerCase().includes(req.query.search.toLowerCase())
      );
    }

    //searching by tag
    if (req.query.tag) {
      articles = articles.filter((a) =>
        a.article.tags.some(
          (t) => t.label.toLowerCase() === req.query.tag.label.toLowerCase()
        )
      );
    }

    // sorting articles by updatedAt
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

    const articleCount = articles.length;

    if (options?.skip && options?.limit) {
      articles = articles.slice(options?.skip, options?.limit + options?.skip);
    }
    articles = articles.map((articleObj) => {
      const { editPermission, article, message, createdAt } = articleObj;
      const { topic, tags, downloaded, owner, updatedAt, _id } = article;
      return {
        topic,
        tags,
        downloaded,
        owner,
        updatedAt,
        _id,
        editPermission,
        message,
        createdAt,
      };
    });

    res.status(200).send({
      articles: articles,
      articleCount,
      ok: true,
    });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// single shared article reading endpoint (with Auth)

router.get("/shared/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const sharing = await Sharing.findOne({
      sharedWith: req.user._id,
      article: id,
    });
    if (!sharing) {
      return res.status(404).send({ message: "404 Not Found" });
    }
    const article = await Article.findOne({ _id: id });
    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }
    res.status(200).send({ article, sharing, ok: true });
  } catch (error) {
    return res.status(500).send();
  }
});

// single shared article updating endpoint (with Auth)

router.patch("/shared/:id", auth, async (req, res) => {
  const { id } = req.params;

  // checking if article is shared with user and has edit Permission
  const sharing = await Sharing.findOne({
    sharedWith: req.user._id,
    article: id,
    editPermission: true,
  });

  if (!sharing) {
    return res.status(401).send({
      message:
        "Unauthorized. Article not shared with you or no edit permission.",
    });
  }

  // checking if updates are allowed
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
      _id: id,
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

// sharing retrieve endpoint

router.get("/sharings/:id", auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Check if the article exists and belongs to the user
    const article = await Article.findOne({
      _id: id,
      owner: req.user._id,
    }).lean();

    if (!article) {
      return res.status(404).send({ message: "Article Not Found" });
    }

    // Retrieve all sharings of the article made by owner of article
    const sharings = await Sharing.find({ article: id })
      .populate({
        path: "sharedWith",
        select: ["name", "userName"],
      })
      .lean();

    res.status(200).send({ sharings, ok: true });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "An error occurred while fetching sharings" });
  }
});

// updating permission in sharing

router.patch("/sharing/:id", auth, async (req, res) => {
  const { id } = req.params;

  try {
    // checking if sharing and article exist and article is owned by user
    const sharing = await Sharing.findOne({ _id: id });
    if (!sharing) {
      return res.status(404).send("404 Not Found");
    }
    const article = await Article.findOne({
      _id: sharing.article,
      owner: req.user._id,
    });
    if (!article) {
      return res.status(404).send("Article Not Found");
    }

    // checking if the updates are allowed
    const updates = Object.keys(req.body);
    const allowedUpdates = ["editPermission", "sharePermission"];

    const isValidUpdate = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidUpdate) {
      return res.status(400).send({ message: "Invalid Updates!" });
    }

    updates.forEach((update) => (sharing[update] = req.body[update]));
    await sharing.save();

    res.status(200).send({ ok: "Permissions updated Successfully" });
  } catch (error) {
    return res.status(400).send({ message: error.message });
  }
});

// single sharing delete endpoint

router.delete("/sharing/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const sharing = await Sharing.findOne({ _id: id });
    if (!sharing) {
      res.status(404).send({ message: "404 Not Found" });
    }
    const article = await Article.findOne({
      _id: sharing.article,
      owner: req.user._id,
    });

    if (!article) {
      res
        .status(401)
        .send({ message: "UnAuthorized: Article not shared with you." });
    }

    await Sharing.findOneAndDelete({
      _id: id,
    });

    res.status(200).send({ ok: "Sharing Record Deleted" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
