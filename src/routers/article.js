const express = require("express");
const auth = require("../middleware/auth");
const Article = require("../models/article");
const Sharing = require("./../models/sharing");
const Download = require("./../models/download");
const puppeteer = require("puppeteer-core");
const chromium = require("chromium");
const router = new express.Router();
const validUrl = require("valid-url");
const html2md = require("html-to-md");
const RecentItem = require("../models/recentItem");

const obj = require("./../index");
const StarredItem = require("../models/starredItem");
const PinnedItem = require("../models/pinnedItem");

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

// article scraping/downloading endpoint

const scrapeQueue = [];
const activeDownloads = [];
let isScraping = false;

process.setMaxListeners(1000);

router.get("/scrape", auth, async (req, res) => {
  try {
    const url = sanitizeUrl(req?.query?.url);
    if (!isValidUrl(url)) {
      return res.status(400).send({ message: "Invalid URL!" });
    }
    const socketId = req.query.socketId;
    const socketClient = obj.connectedClients.get(socketId);

    activeDownloads.push({
      updatedAt: new Date().toISOString(),
      topic: url,
      status: "queued",
      owner: req.user._id,
    });

    socketClient.emit("downloadStatus", {
      type: "SUCCESS",
      status: "Download Queued",
      activeDownloads,
    });

    scrapeQueue.push({ url, socketClient, owner: req.user._id });

    if (!isScraping) {
      isScraping = true;
      await processScrapeQueue();
    }
    res.status(200).send({ status: "No active downloads" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

const processScrapeQueue = async () => {
  if (scrapeQueue.length === 0) {
    isScraping = false;
    return;
  }

  const { url, socketClient, owner } = scrapeQueue[0];

  try {
    activeDownloads[0].status = "downloading";

    socketClient.emit("downloadStatus", {
      type: "SUCCESS",
      status: "Article Downloading",
      activeDownloads,
    });

    const { content, topic } = await scrape(url);

    const article = new Article({
      topic,
      content,
      tags: [],
      downloaded: true,
      owner,
    });

    await article.save();

    activeDownloads[0].status = "downloaded";

    socketClient.emit("downloadStatus", {
      type: "SUCCESS",
      status: "Article Downloaded",
      activeDownloads,
    });

    activeDownloads.shift();

    const download = new Download({
      topic: url,
      status: "downloaded",
      owner,
    });

    await download.save();

    scrapeQueue.shift();

    await processScrapeQueue();
  } catch (error) {
    const download = new Download({
      topic: url,
      status: "error",
      owner,
    });

    await download.save();

    activeDownloads[0].status = "error";

    socketClient.emit("downloadStatus", {
      type: "ERROR",
      status: "Download Failed",
      activeDownloads,
    });

    scrapeQueue.shift();
    activeDownloads.shift();

    await processScrapeQueue();
  }
};

// scrape function

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
  const markdown = html2md(html);

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

module.exports = { router, activeDownloads };
