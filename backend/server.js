const express = require("express");
const multer = require("multer");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const response = await axios.post(
      "http://localhost:8000/segment",
      req.file
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(5000, () => {
  console.log("Backend running on port 5000");
});