const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { ytdown } = require("nayan-videos-downloader");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/download-audio", async (req, res) => {
    try {
        const videoUrl = req.query.url;
        if (!videoUrl) {
            return res.status(400).json({ error: "YouTube URL is required" });
        }

        // Fetch audio download URL
        const response = await ytdown(videoUrl);
        if (!response || !response.data) {
            return res.status(500).json({ error: "Invalid response from YouTube downloader" });
        }

        const { title, audio } = response.data;
        if (!audio) {
            return res.status(404).json({ error: "No audio file found" });
        }

        res.json({ title, downloadPath: `/download-file?url=${encodeURIComponent(audio)}&title=${encodeURIComponent(title)}` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch audio" });
    }
});

// ✅ Properly stream the full file
app.get("/download-file", async (req, res) => {
    try {
        const fileUrl = req.query.url;
        const title = req.query.title || "audio";

        if (!fileUrl) {
            return res.status(400).json({ error: "File URL is required" });
        }

        // ✅ Fetch full file with Axios
        const response = await axios({
            url: fileUrl,
            method: "GET",
            responseType: "stream",
        });

        // ✅ Get content length (file size)
        const contentLength = response.headers["content-length"];
        res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);
        res.setHeader("Content-Type", "audio/mpeg");

        // ✅ If file size is known, set content length
        if (contentLength) {
            res.setHeader("Content-Length", contentLength);
        }

        // ✅ Stream the file properly
        response.data.pipe(res);
    } catch (error) {
        console.error("Download error:", error);
        res.status(500).json({ error: "Failed to download file" });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
