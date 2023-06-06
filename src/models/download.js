const mongoose = require("mongoose");

const downloadSchema = mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Download = mongoose.model("Download", downloadSchema);

module.exports = Download;
