require("dotenv").config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const userSchema = mongoose.Schema({
    name: String,
    mail: String,
    pass: String
});
module.exports=mongoose.model("User", userSchema);