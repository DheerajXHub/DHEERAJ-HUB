
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 3000;

const API_BASE =
  "https://freefireinfo-zy9l.onrender.com";

const ALLOWED_SERVERS = [
  "IND", "SG", "RU", "ID", "TW", "US",
  "VN", "TH", "ME", "PK", "CIS", "BR", "BD"
];

// Normalize API fields
function normalizeProfile(data) {
  const basic = data.basicInfo || data.basicinfo || {};

  const clan =
    data.clanBasicInfo || data.clanbasicinfo || {};

  const credit =
    data.creditScoreInfo || data.creditscoreinfo || {};

  const prime =
    basic.primePrivilegeDetail ||
    basic.primeprivilegedetail || {};

  const pet = data.petInfo || data.petinfo || {};

  const profile =
    data.profileInfo || data.profileinfo || {};

  const social =
    data.socialInfo || data.socialinfo || {};

  return {
    accountId: basic.accountId || basic.accountid || null,
    nickname: basic.nickname || null,
    level: basic.level ?? null,
    exp: basic.exp ?? null,
    likes: basic.liked ?? null,
    region: basic.region || null,

    rank: basic.rank ?? null,
    rankingPoints: basic.rankingPoints ??
      basic.rankingpoints ?? null,

    csRank: basic.csRank ?? basic.csrank ?? null,
    csRankingPoints: basic.csRankingPoints ??
      basic.csrankingpoints ?? null,

    primeLevel: prime.primeLevel ??
      prime.primelevel ?? null,

    creditScore: credit.creditScore ??
      credit.creditscore ?? null,

    pet: {
      id: pet.id ?? null,
      level: pet.level ?? null
    },

    clan,
    avatarId: profile.avatarId ??
      profile.avatarid ?? null,

    clothes: profile.clothes || [],
    equippedSkills: profile.equipedSkills ||
      profile.equippedSkills ||
      profile.equipedskills || [],

    signature: social.signature || null
  };
}

// Home
app.get("/", (req, res) => {
  res.json({
    success: true,
    status: "online",
    project: "DHEERAJ HUB API",
    version: "3.0"
  });
});

// Health
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok"
  });
});

// Free Fire UID Info
app.get("/api/ff/info", async (req, res) => {
  const uid = String(req.query.uid || "").trim();
  const server = String(req.query.server || "IND")
    .trim()
    .toUpperCase();

  if (!/^\d{8,12}$/.test(uid)) {
    return res.status(400).json({
      success: false,
      message: "UID must contain 8 to 12 digits."
    });
  }

  if (!ALLOWED_SERVERS.includes(server)) {
    return res.status(400).json({
      success: false,
      message: "Unsupported region.",
      supportedServers: ALLOWED_SERVERS
    });
  }

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    25000
  );

  try {
    const url = new URL(
      API_BASE + "/api/v1/player-profile"
    );

    url.searchParams.set("uid", uid);
    url.searchParams.set("server", server);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "DHEERAJHUB/3.0 (+https://dheerajxhub.github.io/DHEERAJ-HUB/)"
      },
      signal: controller.signal
    });

    const body = await response.text();

    let data;

    try {
      data = JSON.parse(body);
    } catch {
      console.error("Upstream non-JSON:", {
        status: response.status,
        body: body.slice(0, 300)
      });

      return res.status(502).json({
        success: false,
        message: "Free Fire provider returned an invalid response.",
        upstreamStatus: response.status,
        responsePreview: body.slice(0, 300)
      });
    }

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Free Fire provider request failed.",
        upstreamStatus: response.status,
        details: data
      });
    }

    if (
      data.success === false ||
      data.error ||
      data.message === "Player not found"
    ) {
      return res.status(404).json({
        success: false,
        message: data.message || "Player not found.",
        details: data
      });
    }

    const basic =
      data.basicInfo || data.basicinfo;

    if (!basic || !basic.accountid && !basic.accountId) {
      return res.status(502).json({
        success: false,
        message: "Player data was missing from provider response."
      });
    }

    return res.json({
      success: true,
      uid,
      server,
      data: normalizeProfile(data),
      rawData: data
    });

  } catch (error) {
    console.error("UID API error:", error.message);

    if (error.name === "AbortError") {
      return res.status(504).json({
        success: false,
        message: "Free Fire API timed out. Try again."
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unable to connect to Free Fire provider."
    });

  } finally {
    clearTimeout(timeout);
  }
});

// 404 route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "DHEERAJ HUB API route not found."
  });
});

// Start server
app.listen(PORT, () => {
  console.log(
    `DHEERAJ HUB API running on port ${PORT}`
  );
});
      
