const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    content: {
      type: String,
      trim: true,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    reciever: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
);

// messageSchema.pre("save", function (next) {
//   const yesterday = new Date();
//   yesterday.setDate(yesterday.getDate() - 20);
//   this.createdAt = yesterday;
//   next();
// });

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
