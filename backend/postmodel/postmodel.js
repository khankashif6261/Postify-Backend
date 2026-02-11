const mongoose = require('mongoose');
const PostSchema = mongoose.Schema({
    content: String,
    user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subtea: {
    type: String,
    required: true,
  },
  media: {
    type: String, default: null
  },
  mediaType: {
    type: String, default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]
},
 { timestamps: true });
module.exports = mongoose.model("Post", PostSchema);