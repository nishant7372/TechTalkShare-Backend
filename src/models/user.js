const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Article = require("./article");
const Sharing = require("./sharing");
const Download = require("./download");
const endpoints = require("../constants/endpoints");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: Buffer,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowerCase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      validate(value) {
        if (value.toLowerCase().includes("password")) {
          throw new Error("Password cannot contain `password`");
        } else if (String(value).length < 7) {
          throw new Error("Length must be greater than 6");
        }
      },
    },
    age: {
      type: Number,
      default: 0,
      validate(value) {
        if (value < 0) {
          throw new Error("Age must be positive");
        }
      },
    },
    sessions: [
      {
        session: {
          osDetails: {
            osname: {
              type: String,
              default: "unknown",
            },
            model: {
              type: String,
            },
            browser: {
              type: String,
            },
          },
          creationTime: {
            type: String,
            required: true,
          },
        },
        token: {
          type: String,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

userSchema.virtual("articles", {
  ref: "Article",
  localField: "_id",
  foreignField: "owner",
});

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  if (userObject.sessions) {
    userObject.sessions.forEach((session) => {
      delete session.token;
    });
  }

  delete userObject.password;

  return userObject;
};

userSchema.methods.generateAuthToken = async function (
  osname,
  creationTime,
  browser,
  model
) {
  const user = this;
  const token = jwt.sign({ _id: user._id }, endpoints?.jwt_secret);

  const osDetails = { osname, model, browser };
  const session = { osDetails, creationTime };
  user.sessions = user.sessions.concat({ session, token });
  await user.save();
  return token;
};

userSchema.statics.findByCredentials = async (userName, password) => {
  const user = await User.findOne({ userName });

  if (!user) {
    throw new Error("Unable to login");
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Unable to login");
  }

  return user;
};

// can't use arrow function because it does not have this binding
userSchema.pre("save", async function (next) {
  const user = this;
  // hashing the password
  if (user.isModified("password")) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  next();
});

userSchema.pre("remove", async function (next) {
  const user = this;
  const articles = await Article.find({ owner: user._id });
  for (const article of articles) {
    await Sharing.deleteMany({ article: article._id });
  }
  await Article.deleteMany({ owner: user._id });
  await Download.deleteMany({ owner: user._id });
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
