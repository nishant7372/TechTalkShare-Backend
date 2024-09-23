const mongoose = require("mongoose");

const pinnedItemSchema = mongoose.Schema(
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

const PinnedItem = mongoose.model("PinnedItem", pinnedItemSchema);

module.exports = PinnedItem;
