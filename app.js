const cors = require('cors');
const express  = require('express');
const user = require('./usermodel/user');
const Post = require('./postmodel/postmodel');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const app = express();
require("dotenv").config();
app.use(express.json());
app.use(cookieParser());
const multer = require("multer");
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });
app.use("/uploads", express.static("uploads"));
app.use(cors({
  origin:
    process.env.CLIENT_URL,
  credentials: true
}));
app.get("/",(req, res)=> {
    res.json({isDefault: true});
})
app.get("/register", (req,res)=> {
    res.send("hey");
})
app.post('/register', (req, res)=> {
    const {name, mail, pass}=req.body;
    bcrypt.genSalt(10, (err, salt)=> {
        bcrypt.hash(pass, salt, async (err, hashedPass)=> {
        const createdUser=await user.create({
            name,
            mail,
            pass: hashedPass
    });
        });
    })
    res.json({r:true});
})
app.get("/login",(req, res)=> {
    res.send("login is running");
})
app.post("/login",async (req, res)=> {
    const {name, pass}=req.body;
    const User = await user.findOne({name});
    if(!User) {
        return res.json({userAuth: false});
    }
    bcrypt.compare(pass, User.pass, (err, result)=> {
        if (result) {
            const token = jwt.sign({ id: User._id , user: User.name }, process.env.JWT_SECRET);
            res.cookie('token', token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false
            });     
            return res.status(200).json({userAuth: true});
        }
        if (!result) {
            console.log(err);
            return res.json({ userAuth: false });
        }
        else {
            return res.json({userAuth:false});
        }    
    })
})
app.get("/home", async (req, res)=> {
    const token = req.cookies.token;
    const Userdecoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({username: Userdecoded.user});
});
app.post("/logout", (req, res)=>{
    res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: false
  });
    res.status(200).json({isLogout: true});
});

app.post("/create",upload.single("media"), async (req, res)=> {
    try {
    const { content, subtea } = req.body;
    const token = req.cookies.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
     if (!content && !req.file) {
      return res.status(400).json({ error: "Post cannot be empty" });
    }
    const createdPost = await Post.create({
        content,
        subtea,
        user: req.user.id,
        media: req.file ? `/uploads/${req.file.filename}` : null,
        mediaType:req.file ? req.file.mimetype.startsWith("video") ? "video" : "image" : null
    });
    res.json(createdPost);
    }
    catch (err) {
        console.log("error: ", err);
        res.json({post: false});
    }
});
app.get("/my-posts", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ msg: "No token provided" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const posts = await Post.find({ user: userId })
      .populate("user", "username") 
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: "Server error" });
  }
});

app.get("/subtea/:name", async (req, res) => {
  try {
    const { name } = req.params;

    const posts = await Post.find({
    subtea: { $regex: `^${name}$`, $options: "i" }
   }).sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/profile", async (req, res)=> {
    try {
    const token = req.cookies.token;
    const Userdecoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json(Userdecoded.user);
    }
   catch(err) {
    console.log(err);
    res.status(500).json({msg: "Error happened in the server"});
   }
});
app.get("/posts", async (req, res)=> {
    const posts = await Post.find()
    .populate("user", "name")
    .sort({ createdAt: -1 });
    res.json(posts);
});
app.delete("/posts/:id", async (req,res)=> {
    try {
        const post = Post.findById(req.params.id);
        await post.deleteOne();
        return res.json({deleted: true});
    }
    catch (err) {
        console.log(err);
        return res.json({deleted: false});
    }
})
app.get("/edit/:id", (req, res)=> {
    try {
        const post = Post.findById(req.params.id);
        return res.json(post);
    }
    catch (err) {
        console.log(err);
    }
})
app.put("/edit/:id", async (req, res)=> {
    try {
        const postId = req.params.id;
        const { content } = req.body;
        const updatedPost = {
            content
        }
        const editedPost = await Post.findByIdAndUpdate(postId, updatedPost, { new: true });
        res.status(200).json(editedPost);
    }
    catch (err) {
        console.log(err);
    }
})
app.get("/post/:id", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        res.json(post);
    }
    catch (err){
        console.log(err);
    }
});
app.put("/posts/:id/like", async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
  if (!post) return res.status(404).json("Post not found");
  const alreadyLiked = post.likes.includes(userId);
  if (alreadyLiked) {
    post.likes.pull(userId);
  } else {
    post.likes.push(userId);
  }
  await post.save();
  res.json({ likes: post.likes.length });
    }
    catch (err) {
        console.log(err);
    }
});
app.listen(5000);