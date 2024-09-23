const mongoose = require("mongoose");

const recentItemSchema = mongoose.Schema(
  {
    isShared: {
      type: Boolean,
      required: true,
      trim: true,
    },
    article: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Article",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

const RecentItem = mongoose.model("RecentItem", recentItemSchema);

module.exports = RecentItem;
