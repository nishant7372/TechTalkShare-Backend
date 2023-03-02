const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Task = require("./task");

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
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowerCase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Badly Formatted Email");
        }
      },
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

userSchema.virtual("tasks", {
  ref: "Task",
  localField: "_id",
  foreignField: "owner",
});

userSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  userObject.sessions.forEach((session) => {
    delete session.token;
  });
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
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  const osDetails = { osname, model, browser };
  const session = { osDetails, creationTime };
  user.sessions = user.sessions.concat({ session, token });
  await user.save();
  return token;
};

userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });

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
  await Task.deleteMany({ owner: user._id });
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
