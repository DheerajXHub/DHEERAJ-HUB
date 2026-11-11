
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Main API status
app.get("/", (req, res) => {
  res.json({
    status: "online",
    project: "DHEERAJ HUB API"
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

// Free Fire Player Info API
app.get("/api/ff/info", async (req, res) => {
  try {
    const { uid, server = "IND" } = req.query;

    // UID validation
    if (!uid || !/^\d{8,12}$/.test(uid)) {
      return res.status(400).json({
        success: false,
        message: "Invalid UID. Enter an 8-12 digit UID."
      });
    }

    // Supported server validation
    const allowedServers = [
      "IND", "SG", "RU", "ID", "TW", "US",
      "VN", "TH", "ME", "PK", "CIS", "BR", "BD"
    ];

    const selectedServer = String(server).toUpperCase();

    if (!allowedServers.includes(selectedServer)) {
      return res.status(400).json({
        success: false,
        message: "Invalid server."
      });
    }

    // Call Free Fire Info API
    const apiUrl = new URL(
      "https://freefireinfo-zy9l.onrender.com/api/v1/player-profile"
    );

    apiUrl.searchParams.set("uid", uid);
    apiUrl.searchParams.set("server", selectedServer);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response;

    try {
      response = await fetch(apiUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json"
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        success: false,
        message: "Player API returned an invalid response."
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Player API request failed.",
        upstreamStatus: response.status,
        details: data
      });
    }

    return res.json({
      success: true,
      uid,
      server: selectedServer,
      data
    });

  } catch (error) {
    console.error("Free Fire API Error:", error.message);

    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "Player API request timed out. Please try again."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to fetch player information."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`DHEERAJ HUB API running on port ${PORT}`);
});
