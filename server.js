
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// DHEERAJ HUB API STATUS
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    status: "online",
    project: "DHEERAJ HUB API",
    version: "2.0"
  });
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok"
  });
});

// ===============================
// FREE FIRE PLAYER INFO
// ===============================

app.get("/api/ff/info", async (req, res) => {
  const { uid, server = "IND" } = req.query;

  // UID validation
  if (!uid || !/^\d{8,12}$/.test(String(uid))) {
    return res.status(400).json({
      success: false,
      message: "UID must contain 8 to 12 digits."
    });
  }

  // Server validation
  const allowedServers = [
    "IND", "SG", "RU", "ID", "TW", "US",
    "VN", "TH", "ME", "PK", "CIS", "BR", "BD"
  ];

  const selectedServer = String(server).toUpperCase();

  if (!allowedServers.includes(selectedServer)) {
    return res.status(400).json({
      success: false,
      message: "Invalid server.",
      supportedServers: allowedServers
    });
  }

  const apiUrl = new URL(
    "https://freefireinfo-zy9l.onrender.com/api/v1/player-profile"
  );

  apiUrl.searchParams.set("uid", uid);
  apiUrl.searchParams.set("server", selectedServer);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "DHEERAJ-HUB-API/2.0"
      },
      signal: controller.signal
    });

    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "";

    // Check whether upstream returned JSON
    let playerData;

    try {
      playerData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Non-JSON API response:", {
        status: response.status,
        contentType,
        preview: responseText.slice(0, 300)
      });

      return res.status(502).json({
        success: false,
        message: "Free Fire API returned a non-JSON response.",
        upstreamStatus: response.status,
        contentType,
        responsePreview: responseText.slice(0, 300)
      });
    }

    // Check upstream HTTP status
    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Free Fire API request failed.",
        upstreamStatus: response.status,
        details: playerData
      });
    }

    // Return player data
    return res.status(200).json({
      success: true,
      uid: String(uid),
      server: selectedServer,
      data: playerData
    });

  } catch (error) {
    console.error("Free Fire API Error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "Free Fire API timed out. Try again later."
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unable to connect to Free Fire API.",
      error: error.message
    });

  } finally {
    clearTimeout(timeout);
  }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`DHEERAJ HUB API running on port ${PORT}`);
});
      
