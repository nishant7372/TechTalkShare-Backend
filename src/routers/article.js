const express = require("express");
const auth = require("../middleware/auth");
const Article = require("../models/article");
const Sharing = require("./../models/sharing");
const Download = require("./../models/download");
const puppeteer = require("puppeteer-core");
const chromium = require("chromium");
const router = new express.Router();
const validUrl = require("valid-url");
const TurndownService = require("turndown");

// Create a new instance of TurndownService
const turndownService = new TurndownService();

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

const scrapeQueue = [];
let isScraping = false;

router.get("/scrape", auth, async (req, res) => {
  try {
    // --------------------  Validate and sanitize the URL
    const url = sanitizeUrl(req.query.url);
    if (!isValidUrl(url)) {
      return res.status(400).send("Invalid URL");
    }

    // -------------------- creating a download record

    const download = new Download({
      topic: url,
      status: "downloading",
      owner: req.user._id,
    });

    await download.save();

    scrapeQueue.push({ url, downloadId: download._id, res });

    if (!isScraping) {
      isScraping = true;
      await processScrapeQueue(req.user._id);
    }
  } catch (error) {
    res.status(500).send("Unable to download");
  }
});

const processScrapeQueue = async (userId) => {
  // console.log("tasks left", scrapeQueue.length);
  if (scrapeQueue.length === 0) {
    isScraping = false;
    return;
  }

  const { url, downloadId, res } = scrapeQueue[0];

  try {
    // ----------------  scraping article from leetcode

    const { content, topic } = await scrape(url);

    const article = new Article({
      topic,
      content,
      tags: [],
      downloaded: true,
      owner: userId,
    });

    await article.save();

    // update the download status
    await Download.findByIdAndUpdate(downloadId, { status: "downloaded" });

    console.log("done");
    res.status(201).send("done");

    // remove the processed request from the queue
    scrapeQueue.shift();

    await delay(5000);

    await processScrapeQueue(userId);
  } catch (error) {
    // update the status of download to error
    console.log(error);
    await Download.findByIdAndUpdate(downloadId, { status: "error" });
    console.log("error");
    res.status(201).send("error");

    // remove the processed request from the queue
    scrapeQueue.shift();

    await processScrapeQueue(userId);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scrape = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromium.path,
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();

  page.setDefaultNavigationTimeout(60000); //navigation timeout (60 seconds)

  await page.goto(url);

  // Wait for the desired elements to become available
  await Promise.all([
    page.waitForSelector(".discuss-markdown-container"),
    page.waitForSelector(".css-w6djpe-Title"),
  ]);

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    if (request.resourceType() === "image") request.abort();
    else request.continue();
  });

  // Extract the HTML content of the desired elements
  const [content, topic] = await Promise.all([
    page.$eval(".discuss-markdown-container", (element) => element.innerHTML),
    page.$eval(".css-w6djpe-Title", (element) => element.innerHTML),
  ]);

  await browser.close();

  // HTML string to be converted
  const html = content;

  // Convert HTML to Markdown
  const markdown = turndownService.turndown(html);

  return { content: markdown, topic };
};

// Function to validate URL
const isValidUrl = (url) => validUrl.isWebUri(url);

// Function to sanitize URL
const sanitizeUrl = (url) => {
  let sanitizedUrl = url.trim();

  // Add "https://" prefix if missing
  if (
    !sanitizedUrl.startsWith("http://") &&
    !sanitizedUrl.startsWith("https://")
  ) {
    sanitizedUrl = "https://" + sanitizedUrl;
  }

  return sanitizedUrl;
};

module.exports = router;
