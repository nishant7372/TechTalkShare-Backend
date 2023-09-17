const mongoose = require("mongoose");

const starredItemSchema = mongoose.Schema(
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

const StarredItem = mongoose.model("StarredItem", starredItemSchema);

module.exports = StarredItem;
