const express = require("express");
const auth = require("../middleware/auth");
const Article = require("../models/article");
const Sharing = require("./../models/sharing");
const { chromium } = require("playwright");

const router = new express.Router();

// article creation endpoint (with Auth)

router.post("/articles", auth, async (req, res) => {
  const article = new Article({
    ...req.body,
    owner: req.user._id,
  });
  try {
    await article.save();
    res.status(201).send(article);
  } catch (error) {
    res.status(400).send(error);
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
    });
    res.send({
      articles: req.user.articles,
      articleCount,
    });
  } catch (error) {
    res.status(400).send();
  }
});

// single article reading endpoint (with Auth)

router.get("/articles/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    const article = await Article.findOne({ _id: id, owner: req.user._id });
    if (!article) {
      return res.status(404).send();
    }
    res.send(article);
  } catch (error) {
    res.status(500).send();
  }
});

// single article updating endpoint (with Auth)

router.patch("/articles/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["topic", "content", "tags", "votes"];

  const isValidUpdate = updates.every((update) =>
    allowedUpdates.includes(update)
  );

  if (!isValidUpdate) {
    return res.status(400).send({ error: "Invalid Updates!" });
  }

  try {
    const article = await Article.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!article) {
      return res.status(404).send();
    }
    updates.forEach((update) => (article[update] = req.body[update]));
    await article.save();
    res.send(article);
  } catch (error) {
    return res.status(400).send(error);
  }
});

// single article deleting endpoint (with Auth)

router.delete("/articles/:id", auth, async (req, res) => {
  try {
    await Sharing.deleteMany({
      article: req.params.id,
    });
    const article = await Article.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!article) {
      return res.status(404).send();
    }
    res.send(article);
  } catch (error) {
    res.status(500).send();
  }
});

router.get("/getLeetcodeDiscuss", async (req, res) => {
  try {
    const url =
      "https://leetcode.com/discuss/compensation/2748640/300-company-compensation-for-freshers-in-india-2022-2023";
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);

    // Wait for the desired element to become available
    await page.waitForSelector("div.discuss-markdown-container");

    // Extract the HTML content of the desired element
    const discussContent = await page.$eval(
      "div.discuss-markdown-container",
      (element) => element.innerHTML
    );

    await browser.close();
    res.send(discussContent);
  } catch (error) {
    res.status(500).send("An error occurred");
  }
});

module.exports = router;
