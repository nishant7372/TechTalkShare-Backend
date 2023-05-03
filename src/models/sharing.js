const mongoose = require("mongoose");

const sharingSchema = mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
    },
    sharedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    writePermission: {
      type: Boolean,
      default: false,
    },
    sharePermission: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Sharing = mongoose.model("Sharing", sharingSchema);

module.exports = Sharing;
