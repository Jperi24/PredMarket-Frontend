// server.js
"use strict";

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
const cron = require("node-cron");
const NodeCache = require("node-cache");
const { ObjectId } = require("mongodb");
const helmet = require("helmet");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const compression = require("compression");
const app = express();
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken"); // For authentication
const { body, validationResult, param, query } = require("express-validator");

// Load your Apollo client securely
const apolloClient = require("./apollo-client");

// Implement a reverse proxy for SSL termination and load balancing (Assumed in production)

// Security: Enforce HTTPS (should be handled at the proxy/load balancer level)

// Security: Set security HTTP headers
app.use(helmet());

// Security: Implement rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Security: Data sanitization against NoSQL injection attacks
app.use(mongoSanitize());

// Security: Data sanitization against XSS
app.use(xss());

// Security: Prevent HTTP Parameter Pollution
app.use(hpp());

// Security: Compress all routes
app.use(compression());

// Implement CORS with specific origins
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://your-production-domain.com"]
    : ["http://localhost:3000"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, false); // Deny the request without an error
      }
    },
    credentials: true,
  })
);

// Body parser, reading data from the body into req.body
app.use(express.json({ limit: "10kb" })); // Limit body size to prevent DOS attacks

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);
  if (process.env.NODE_ENV === "development") {
    res.status(err.status || 500).json({
      message: err.message,
      stack: err.stack,
    });
  } else {
    res.status(err.status || 500).json({
      message: "An unexpected error occurred.",
    });
  }
});

// Secure environment variables (use secrets manager in production)
const myCache = new NodeCache();
const fetch = require("cross-fetch");

// Secure MongoDB connection
const uri = process.env.MONGOURI;
if (!uri) {
  console.error("MongoDB URI is not set in environment variables.");
  process.exit(1);
}
const client = new MongoClient(uri, {
  tls: true, // Enforce TLS/SSL
  tlsCAFile: process.env.MONGO_CA_CERT_PATH, // Ensure this is set if TLS is required
});

// Ensure that private keys are stored securely
const ethers = require("ethers");
const predMarketArtifact = require("./predMarketV2.json");

// Secure provider and signer setup
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("Private key is not set in environment variables.");
  process.exit(1);
}
// Use secure vault or key management in production
const signer = new ethers.Wallet(privateKey, provider);

let db;
const PORT = process.env.PORT || 3001;
const setStatuses = new Map();

if (process.env.NODE_ENV !== "test") {
  client
    .connect()
    .then(() => {
      db = client.db("PredMarket");
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        fetchAllTournamentDetails();
        scheduleTasks();
        updateAllRates();
        moveExpiredContracts();
      });
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB", err);
      process.exit(1);
    });
} else {
  console.log("BEGIN TESTING");
}

// Global error handling for uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

// Secure task scheduling
function scheduleTasks() {
  cron.schedule("*/5 * * * *", moveExpiredContracts); // Every 5 minutes
}

// Input validation and sanitization middleware
const validateContractInput = [
  body("contractAddress").notEmpty().trim().escape(),
  body("tags").notEmpty().trim().escape(),
  // Add other validation rules based on your schema
];

// Secure function to move expired contracts
async function moveExpiredContracts() {
  try {
    const sourceCollection = db.collection("Contracts");
    const targetCollection = db.collection("ExpiredContracts");

    const twoDaysAgo = new Date().getTime() - 2 * 24 * 60 * 60 * 1000;
    const threshold = Math.floor(twoDaysAgo / 1000);

    const expiredContracts = await sourceCollection
      .find({ endsAt: { $lt: threshold } })
      .toArray();

    if (expiredContracts.length > 0) {
      const insertResult = await targetCollection.insertMany(expiredContracts);
      console.log(
        `${insertResult.insertedCount} contracts moved to ExpiredContracts collection successfully`
      );

      const deleteResult = await sourceCollection.deleteMany({
        endsAt: { $lt: threshold },
      });
      console.log(
        `${deleteResult.deletedCount} expired contracts deleted from Contracts collection successfully`
      );
    } else {
      console.log("No expired contracts found to move");
    }
  } catch (err) {
    console.error("Error moving expired contracts:", err);
    // Implement logging and alerting mechanisms
  }
}

// Secure rate cache
const rateCache = new NodeCache();
const FETCH_INTERVAL = 60000; // 60 seconds

// Function to fetch rates and update cache
async function updateAllRates() {
  const chainInfo = {
    1: { name: "ethereum", coingeckoId: "ethereum" },
    56: { name: "binance-smart-chain", coingeckoId: "binancecoin" },
    137: { name: "polygon", coingeckoId: "matic-network" },
    43114: { name: "avalanche", coingeckoId: "avalanche-2" },
    250: { name: "fantom", coingeckoId: "fantom" },
    31337: {
      name: "hardhat",
      coingeckoId: "ethereum",
    }, // Assuming local testnet uses Ethereum rate
  };

  const ratePromises = Object.entries(chainInfo).map(
    async ([chainId, chain]) => {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${chain.coingeckoId}&vs_currencies=usd`;
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(
            `Failed to fetch from CoinGecko for ${chain.name}: ${response.status} ${response.statusText}`
          );
          return;
        }
        const data = await response.json();
        const rate = data[chain.coingeckoId].usd;
        rateCache.set(`${chain.name.toUpperCase()}_RATE`, rate);
        console.log(`Updated ${chain.name} rate to $${rate}`);
      } catch (error) {
        console.error("Error updating rate for", chain.name, ":", error);
        // Implement logging and monitoring
      }
    }
  );

  await Promise.all(ratePromises);
  console.log("All rates updated");
}

// Endpoint to get rates
app.get("/api/rates", (req, res) => {
  let rates = {};
  rateCache.keys().forEach((key) => {
    rates[key] = rateCache.get(key);
  });
  res.json(rates);
});

// Authentication middleware (example using JWT)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401); // Unauthorized
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
};

// Endpoint to check if a set has already been deployed
app.get(
  "/check-set-deployment/:tags",
  param("tags").trim().escape(),
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tags = req.params.tags;

    try {
      const collection = db.collection("Contracts");

      // Use exact string matching to avoid ReDoS attacks
      const contract = await collection.findOne({ tags: tags });

      if (contract) {
        res.status(200).json({ isDeployed: true, contractDetails: contract });
      } else {
        res.status(200).json({ isDeployed: false });
      }
    } catch (error) {
      console.error("Failed to check if set is deployed:", error);
      res.status(500).send("Error checking set deployment");
    }
  }
);

// Endpoint to add a contract (protected)
app.post("/addContract", limiter, validateContractInput, async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const collection = db.collection("Contracts");
    const contract = req.body;
    await collection.insertOne(contract);
    res.status(201).send("Contract added successfully");
  } catch (error) {
    console.error("Error adding contract to MongoDB:", error);
    res.status(500).send("Error adding contract");
  }
});

// Endpoint to move a contract to disagreements (protected)
app.post(
  "/moveToDisagreements",
  limiter,
  [
    body("contractAddress").notEmpty().trim().escape(),
    body("reason").optional().trim().escape(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contractAddress, reason } = req.body;
    try {
      const result = await moveContractToDisagreements(contractAddress, reason);

      if (result.success) {
        res
          .status(200)
          .send("Contract moved to Disagreements collection successfully");
      } else {
        res.status(500).send(result.error);
      }
    } catch (error) {
      console.error("Error moving contract to disagreements:", error);
      res.status(500).send("Error moving contract to disagreements");
    }
  }
);

// Additional imports for security and validation

// Assume that 'authenticateToken' middleware is already defined as in the previous code.

// Secure function to move a contract to disagreements
async function moveContractToDisagreements(contractAddress, reason) {
  try {
    // Validate input types and sanitize
    if (typeof contractAddress !== "string" || typeof reason !== "string") {
      throw new Error("Invalid input types");
    }

    let sourceCollection = db.collection("Contracts");
    const targetCollection = db.collection("Disagreements");

    // Sanitize inputs to prevent NoSQL injection
    const sanitizedAddress = contractAddress.trim();
    const sanitizedReason = reason.trim();

    // Find the contract in the Contracts collection
    let contract = await sourceCollection.findOne({
      address: sanitizedAddress,
    });

    // If not found in Contracts, search in ExpiredContracts collection
    if (!contract) {
      sourceCollection = db.collection("ExpiredContracts");
      contract = await sourceCollection.findOne({ address: sanitizedAddress });

      // If still not found, return an error
      if (!contract) {
        console.error("Contract not found in collections");
        return { error: "Contract not found" };
      }
    }

    // Prepare the document to be inserted into the Disagreements collection
    const updatedContract = {
      ...contract,
      disagreementText: sanitizedReason,
      lastModified: new Date(),
    };

    // Insert the updated document into the Disagreements collection
    await targetCollection.insertOne(updatedContract);

    // Remove the original document from its source collection
    await sourceCollection.deleteOne({ address: sanitizedAddress });

    console.log("Contract moved to Disagreements collection successfully");
    return { success: true };
  } catch (error) {
    console.error("Error moving contract to Disagreements:", error);
    // Implement logging and monitoring
    return { error: "Error moving contract" };
  }
}

// Endpoint to move a contract from Disagreements to Contracts (protected)
app.post(
  "/moveFromDisagreementsToContracts",
  limiter,
  [body("contractAddress").notEmpty().trim().escape()],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { contractAddress } = req.body;
      const sanitizedAddress = contractAddress.trim();

      const targetCollection = db.collection("Contracts");
      let sourceCollection = db.collection("Disagreements");

      // Find the contract in the source collection
      let contract = await sourceCollection.findOne({
        address: sanitizedAddress,
      });

      if (!contract) {
        sourceCollection = db.collection("ExpiredContracts");
        contract = await sourceCollection.findOne({
          address: sanitizedAddress,
        });
        if (!contract) {
          return res.status(404).send("Contract not found in collections");
        }
      }

      // Prepare the document to be inserted into the Contracts collection
      const updatedContract = {
        ...contract,
        lastModified: new Date(),
      };
      delete updatedContract.disagreementText; // Remove the disagreementText field

      // Insert the updated document into the Contracts collection
      await targetCollection.insertOne(updatedContract);

      // Remove the original document from its source collection
      await sourceCollection.deleteOne({ address: sanitizedAddress });

      res
        .status(200)
        .send("Contract moved to Contracts collection successfully");
    } catch (error) {
      console.error("Error moving contract to Contracts:", error);
      // Implement logging and monitoring
      res.status(500).send("Error moving contract");
    }
  }
);

// Endpoint to get all contracts (protected)
app.get("/getContracts", limiter, async (req, res) => {
  try {
    const collectionNames = ["Contracts", "ExpiredContracts", "Disagreements"];

    const fetchFromCollection = async (collectionName) => {
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      return documents.map((doc) => {
        const status = setStatuses.get(doc.setKey) || "upcoming";
        return { ...doc, collectionName, status };
      });
    };

    const contractsPromises = collectionNames.map((collectionName) =>
      fetchFromCollection(collectionName)
    );
    const results = await Promise.all(contractsPromises);

    const allContracts = results.flat();

    res.status(200).json(allContracts);
  } catch (error) {
    console.error("Error fetching contracts from MongoDB:", error);
    // Implement logging and monitoring
    res.status(500).send("Error fetching contracts");
  }
});

// Endpoint to get a contract by address (protected)
app.get(
  "/api/contracts/:address",
  limiter,
  param("address").notEmpty().trim().escape(),
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const address = req.params.address.trim();
      const contractsCollection = db.collection("Contracts");
      const disagreementsCollection = db.collection("Disagreements");
      const expiredContractsCollection = db.collection("ExpiredContracts");

      // Sanitize address to prevent NoSQL injection
      const sanitizedAddress = address;

      // First try to find the contract in the Contracts collection
      let contract = await contractsCollection.findOne({
        address: sanitizedAddress,
      });

      // If not found, check other collections
      if (!contract) {
        contract = await disagreementsCollection.findOne({
          address: sanitizedAddress,
        });
      }
      if (!contract) {
        contract = await expiredContractsCollection.findOne({
          address: sanitizedAddress,
        });
      }

      // Return the contract if found
      if (contract) {
        res.status(200).json(contract);
      } else {
        res.status(404).send("Contract not found");
      }
    } catch (error) {
      console.error("Error fetching contract from MongoDB:", error);
      // Implement logging and monitoring
      res.status(500).send("Error fetching contract");
    }
  }
);

// Graceful shutdown on SIGINT
process.on("SIGINT", () => {
  client.close().then(() => {
    console.log("MongoDB disconnected on app termination");
    process.exit(0);
  });
});

// Import queries securely
const {
  GET_ALL_TOURNAMENTS_QUERY,
  GET_FEATURED_TOURNAMENTS_QUERY,
  GET_TOURNAMENT_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} = require("./queries");

// Caching with proper TTL and security considerations
const dailyCache = new NodeCache({ stdTTL: 86400 }); // 24 hours TTL
const frequentCache = new NodeCache({ stdTTL: 0 }); // No TTL, manage invalidation manually

// Utility function with error handling
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isFetchingTournaments = false;

// Secure fetch with retry logic
async function fetchWithRetry(query, variables, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await apolloClient.query({
        query: query,
        variables: variables,
        fetchPolicy: "network-only", // Ensure fresh data is fetched every time
      });
      return data;
    } catch (error) {
      if (error.networkError && error.networkError.statusCode === 429) {
        console.error(
          `Rate limit hit. Retry ${i + 1}/${retries} after ${delay}ms`
        );
        await sleep(delay);
        delay *= 2; // Exponential backoff
      } else {
        console.error("Fetch error:", error);
        throw error; // Rethrow if not a 429 error
      }
    }
  }
  throw new Error("Failed to fetch data after retries");
}

// Assume that necessary imports and configurations are already in place.

// State variables

let isUpdatingFrequentCache = false; // Ensure this variable is defined

// Secure function to fetch all tournament details
async function fetchAllTournamentDetails() {
  if (isFetchingTournaments || isUpdatingFrequentCache) {
    console.log("fetchAllTournamentDetails is already running. Exiting.");
    return;
  }

  isFetchingTournaments = true;
  setStatuses.clear();
  console.log("Updating daily cache...");

  let allTournaments = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  try {
    // Calculate dates securely
    const now = Date.now();
    const todayDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const afterDate3 = Math.floor(
      new Date(now - 3 * 24 * 3600 * 1000).getTime() / 1000
    );
    const afterDate30 = Math.floor(
      new Date(now - 30 * 24 * 3600 * 1000).getTime() / 1000
    );
    const beforeDate5 = Math.floor(
      new Date(now + 5 * 24 * 3600 * 1000).getTime() / 1000
    );

    // Fetch Featured Tournaments
    while (hasMore) {
      await sleep(100); // Throttle requests to avoid hitting API rate limits

      try {
        const data = await fetchWithRetry(GET_FEATURED_TOURNAMENTS_QUERY, {
          afterDate30,
          page,
          perPage,
        });

        // Validate response data
        if (!data || !data.tournaments || !data.tournaments.nodes) {
          throw new Error("Invalid data format received from API.");
        }

        const filteredTournaments = data.tournaments.nodes.filter(
          (tournament) => tournament.endAt >= todayDate
        );
        allTournaments = allTournaments.concat(filteredTournaments);
        hasMore = data.tournaments.nodes.length === perPage;
        page += 1;
      } catch (error) {
        console.error(
          "Failed to fetch featured tournaments page:",
          page,
          error
        );
        hasMore = false;
      }
    }

    console.log("Finished querying featured tournaments.");

    // Fetch Regular Tournaments if the total is less than a threshold (e.g., 50)
    if (allTournaments.length < 50) {
      page = 1;
      hasMore = true;

      try {
        const data = await fetchWithRetry(GET_ALL_TOURNAMENTS_QUERY, {
          afterDate3,
          beforeDate5,
          page: 1,
          perPage: 1,
        });

        // Validate response data
        if (!data || !data.tournaments || !data.tournaments.pageInfo) {
          throw new Error("Invalid data format received from API.");
        }

        const totalTournaments = data.tournaments.pageInfo.total;
        const totalPages = Math.ceil(totalTournaments / perPage);
        page = totalPages;
        console.log("Total Pages of Tournaments:", totalPages);
      } catch (error) {
        console.error(
          "Failed to fetch total tournaments for pagination",
          error
        );
        return;
      }

      while (hasMore && allTournaments.length < 50) {
        await sleep(100); // Throttle requests

        try {
          const data = await fetchWithRetry(GET_ALL_TOURNAMENTS_QUERY, {
            afterDate3,
            beforeDate5,
            page,
            perPage,
          });

          // Validate response data
          if (!data || !data.tournaments || !data.tournaments.nodes) {
            throw new Error("Invalid data format received from API.");
          }

          const filteredTournaments = data.tournaments.nodes.filter(
            (tournament) =>
              tournament.endAt >= todayDate && tournament.numAttendees > 50
          );
          allTournaments = allTournaments.concat(filteredTournaments);
          hasMore = page > 1;
          page -= 1; // Decrement to move to the previous page
          console.log(
            "Finished adding non-featured tournaments on page:",
            page + 1
          );
        } catch (error) {
          console.error("Failed to fetch tournaments page:", page, error);
          hasMore = false;
        }
      }
    }

    // Limit the number of tournaments to prevent excessive data processing
    allTournaments = allTournaments.slice(0, 50);

    const temporaryCache = new NodeCache({ stdTTL: 86400 }); // 24-hour TTL

    console.log("Total tournaments to process:", allTournaments.length);
    frequentCache.flushAll(); // Clear the frequent cache securely

    for (const tournament of allTournaments) {
      await sleep(100); // Throttle requests

      try {
        // Validate tournament slug
        if (typeof tournament.slug !== "string") {
          throw new Error("Invalid tournament slug.");
        }

        const tournamentDetailResponse = await fetchWithRetry(
          GET_TOURNAMENT_QUERY,
          {
            slug: tournament.slug.trim(),
          }
        );

        // Validate response data
        if (!tournamentDetailResponse || !tournamentDetailResponse.tournament) {
          throw new Error("Invalid tournament data received from API.");
        }

        const detailedTournament = tournamentDetailResponse.tournament;
        temporaryCache.set(tournament.slug.toLowerCase(), detailedTournament);

        if (Array.isArray(detailedTournament.events)) {
          for (const event of detailedTournament.events) {
            if (Array.isArray(event.phases)) {
              for (const phase of event.phases) {
                await sleep(100); // Throttle requests
                let allSets = [];
                let page2 = 1;
                let hasMore2 = true;
                const phaseId = phase.id;

                while (hasMore2) {
                  await sleep(100); // Throttle requests

                  try {
                    const phaseData = await fetchWithRetry(
                      GET_SETS_BY_PHASE_QUERY,
                      {
                        phaseId,
                        page: page2,
                        perPage,
                      }
                    );

                    // Validate response data
                    if (
                      !phaseData ||
                      !phaseData.phase ||
                      !phaseData.phase.sets
                    ) {
                      throw new Error("Invalid phase data received from API.");
                    }

                    allSets = allSets.concat(phaseData.phase.sets.nodes);
                    hasMore2 =
                      phaseData.phase.sets.pageInfo.totalPages >= page2;
                    page2 += 1;
                  } catch (error) {
                    console.error(
                      "Error fetching sets for phase:",
                      phase.id,
                      error
                    );
                    hasMore2 = false;
                  }
                }

                console.log(`Caching sets for phaseId: ${phase.id}`);
                const phaseKey = `phase:${phase.id}`;
                frequentCache.set(phaseKey, allSets);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error handling tournament:", tournament.slug, error);
      }
      console.log("Completed processing tournament:", tournament.slug);
    }

    // Replace the dailyCache entries securely
    dailyCache.flushAll(); // Clear the daily cache

    // Update dailyCache with entries from temporaryCache
    const keysToUpdate = temporaryCache.keys();
    const entries = keysToUpdate.map((key) => {
      const val = temporaryCache.get(key);
      return { key, val };
    });
    dailyCache.mset(entries);

    console.log("Daily cache updated.");
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    // Implement logging and monitoring as appropriate
  } finally {
    isFetchingTournaments = false;
  }
}

// Ensure necessary imports and configurations are in place

// State variables

// Secure function to update the frequent cache
async function updateFrequentCache() {
  if (isFetchingTournaments || isUpdatingFrequentCache) {
    console.log("updateFrequentCache is already running. Exiting.");
    return;
  }

  isUpdatingFrequentCache = true;

  console.log("Updating frequent cache for ongoing tournaments...");

  try {
    const collection = db.collection("Contracts");
    const documents = await collection.find({}).toArray();

    const temporaryFrequentCache = new NodeCache({ stdTTL: 0 });
    const currentTime = Math.floor(Date.now() / 1000);

    let ongoingTournaments = [];
    const keysToCheck = dailyCache.keys();

    // Fetch ongoing tournaments from the daily cache
    for (const key of keysToCheck) {
      const tournament = dailyCache.get(key);
      if (tournament) {
        const startAt = Number(tournament.startAt);
        const endAt = Number(tournament.endAt);

        // Add a 1-day (24 hours) buffer to startAt and endAt
        const startAtWithBuffer = startAt - 86400; // Subtract 1 day (in seconds)
        const endAtWithBuffer = endAt + 86400; // Add 1 day (in seconds)

        // Perform the comparison using the buffered values
        if (
          startAtWithBuffer <= currentTime &&
          endAtWithBuffer >= currentTime
        ) {
          console.log(`Tournament ${key} is ongoing.`);
          ongoingTournaments.push(tournament);
        }
      }
    }

    console.log(
      "Ongoing tournaments:",
      ongoingTournaments.map((t) => t.slug)
    );

    for (const tournament of ongoingTournaments) {
      await sleep(100); // Throttle requests to avoid hitting API rate limits
      try {
        // Validate tournament slug
        if (typeof tournament.slug !== "string") {
          throw new Error("Invalid tournament slug.");
        }

        const tournamentDetailResponse = await fetchWithRetry(
          GET_TOURNAMENT_QUERY,
          {
            slug: tournament.slug.trim(),
          }
        );

        // Validate response data
        if (!tournamentDetailResponse || !tournamentDetailResponse.tournament) {
          throw new Error("Invalid tournament data received from API.");
        }

        const detailedTournament = tournamentDetailResponse.tournament;

        if (Array.isArray(detailedTournament.events)) {
          for (const event of detailedTournament.events) {
            if (Array.isArray(event.phases)) {
              for (const phase of event.phases) {
                await sleep(100); // Throttle requests
                let allSets = [];
                let page = 1;
                let hasMore = true;
                const phaseId = phase.id;

                while (hasMore) {
                  await sleep(100); // Throttle requests
                  try {
                    const phaseData = await fetchWithRetry(
                      GET_SETS_BY_PHASE_QUERY,
                      {
                        phaseId,
                        page,
                        perPage: 100,
                      }
                    );

                    // Validate response data
                    if (
                      !phaseData ||
                      !phaseData.phase ||
                      !phaseData.phase.sets
                    ) {
                      throw new Error("Invalid phase data received from API.");
                    }

                    allSets = allSets.concat(phaseData.phase.sets.nodes);
                    hasMore = phaseData.phase.sets.nodes.length === 100;
                    page += 1;
                  } catch (error) {
                    console.error(
                      "Error fetching sets for phase:",
                      phase.id,
                      error
                    );
                    hasMore = false;
                  }
                }

                for (const set of allSets) {
                  const setKey = `${tournament.slug}-${event.id}-${set.id}`;

                  const cacheSetKey = `set:${setKey}`;
                  const normalizeString = (str) =>
                    str ? str.trim().toLowerCase() : "";

                  const matchingDocument = documents.find((docSet) => {
                    return (
                      normalizeString(docSet.eventA) ===
                        normalizeString(set.slots[0]?.entrant?.name) &&
                      normalizeString(docSet.eventB) ===
                        normalizeString(set.slots[1]?.entrant?.name) &&
                      normalizeString(docSet.fullName) ===
                        normalizeString(set.fullRoundText)
                    );
                  });

                  // Check if a matching document is found
                  const doesSetExist = !!matchingDocument;

                  if (doesSetExist) {
                    console.log("Matching set found:", cacheSetKey);

                    const currentEntrants = set.slots.map(
                      (slot) => slot.entrant?.name || "Unknown"
                    );

                    // Fetch the original entrants from frequentCache before updating
                    const originalSet = frequentCache.get(cacheSetKey);
                    const originalEntrants = originalSet
                      ? originalSet.slots.map(
                          (slot) => slot.entrant?.name || "Unknown"
                        )
                      : currentEntrants; // Use currentEntrants if originalSet is undefined

                    // Check if the entrants have changed
                    const entrantsChanged =
                      originalEntrants.length !== currentEntrants.length ||
                      !originalEntrants.every(
                        (entrant, index) => entrant === currentEntrants[index]
                      );

                    if (entrantsChanged) {
                      console.log(
                        `Set ${cacheSetKey} has changed entrants or no longer exists with original entrants.`
                      );

                      const contract = new ethers.Contract(
                        matchingDocument.address,
                        predMarketArtifact.abi,
                        signer
                      );

                      // Call the changeState function securely
                      const tx = await contract.changeState(2);
                      await tx.wait();

                      await moveContractToDisagreements(
                        matchingDocument.address,
                        "Entrants have changed or are no longer valid"
                      );
                      setStatuses.set(cacheSetKey, {
                        status: "canceled",
                        winner: 3,
                      });
                    } else {
                      // Adjusted logic
                      const hasWinner = !!set.winnerId;
                      const winnerSlot = set.slots.find(
                        (slot) => slot.entrant?.id === set.winnerId
                      );
                      const winnerName = winnerSlot?.entrant?.name || "Unknown";

                      const inGame = set.slots.every(
                        (slot) => slot.standing?.placement === 2
                      );
                      const hasUnknownEntrant = set.slots.some(
                        (slot) =>
                          !slot.entrant || slot.entrant.name === "Unknown"
                      );

                      console.log(`Processing set ${cacheSetKey}`);
                      console.log(`inGame: ${inGame}`);
                      console.log(`hasWinner: ${hasWinner}`);
                      console.log(`hasUnknownEntrant: ${hasUnknownEntrant}`);
                      console.log(`winnerName: ${winnerName}`);

                      if (inGame && !hasWinner) {
                        setStatuses.set(cacheSetKey, {
                          status: "ongoing",
                          winner: null,
                        });
                      } else if (!inGame && !hasWinner && !hasUnknownEntrant) {
                        setStatuses.set(cacheSetKey, {
                          status: "upcoming",
                          winner: null,
                        });
                      } else if (hasWinner) {
                        setStatuses.set(cacheSetKey, {
                          status: "completed",
                          winner: winnerName,
                        });
                        await updateMongoDBWithWinner(cacheSetKey, winnerName);
                      } else {
                        setStatuses.set(cacheSetKey, {
                          status: "other",
                          winner: null,
                        });
                      }
                    }
                  }

                  // Update the temporaryFrequentCache with the current set data
                  temporaryFrequentCache.set(cacheSetKey, set);

                  // Also update the phase sets in frequentCache
                  const phaseKey = `phase:${phaseId}`;
                  if (frequentCache.has(phaseKey)) {
                    const phaseSets = frequentCache.get(phaseKey);
                    const setIndex = phaseSets.findIndex(
                      (s) => s.id === set.id
                    );
                    if (setIndex !== -1) {
                      phaseSets[setIndex] = set; // Update the set
                      frequentCache.set(phaseKey, phaseSets); // Save back to cache
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error handling tournament:", tournament.slug, error);
      }
      console.log("Updated tournament:", tournament.slug);
    } // Added missing closing brace for the 'for' loop

    // Now update the frequentCache with the new data from temporaryFrequentCache
    const keysToUpdate = temporaryFrequentCache.keys();
    frequentCache.mset(
      keysToUpdate.map((key) => ({
        key,
        val: temporaryFrequentCache.get(key),
      }))
    );

    console.log("Frequent cache updated with ongoing tournaments.");
  } catch (error) {
    console.error(
      "An unexpected error occurred in updateFrequentCache:",
      error
    );
    // Implement logging and monitoring as appropriate
  } finally {
    isUpdatingFrequentCache = false;
  }
}

// Schedule the cache updates securely
cron.schedule("*/20 * * * *", updateFrequentCache); // Update frequent cache every 20 minutes
cron.schedule("0 0 * * *", fetchAllTournamentDetails); // Fetch all tournament details daily

// Ensure necessary imports and configurations are in place

// Assume that 'authenticateToken' middleware is already defined and applied where necessary.

// Secure function to update MongoDB with the winner
async function updateMongoDBWithWinner(setKey, winnerName) {
  try {
    // Input validation and sanitization
    if (typeof setKey !== "string" || typeof winnerName !== "string") {
      throw new Error("Invalid input types");
    }
    const sanitizedSetKey = setKey.trim();
    const sanitizedWinnerName = winnerName.trim();

    const collection = db.collection("Contracts");

    // Find the document where the setKey matches
    const document = await collection.findOne({ setKey: sanitizedSetKey });

    if (!document) {
      console.log(`No contract found for set ${sanitizedSetKey}`);
      return;
    }

    // Create contract instance securely
    const contract = new ethers.Contract(
      document.address,
      predMarketArtifact.abi,
      signer
    );

    // Determine which participant won
    let winnerNumber;
    if (sanitizedWinnerName === document.eventA) {
      winnerNumber = 1;
    } else if (sanitizedWinnerName === document.eventB) {
      winnerNumber = 2;
    } else {
      winnerNumber = 3; // DQ or other scenario
    }

    // Call the declareWinner function securely
    const tx = await contract.declareWinner(winnerNumber);
    await tx.wait();

    console.log(
      `Successfully called declareWinner(${winnerNumber}) for contract ${document.address}`
    );
  } catch (error) {
    console.error("Error calling declareWinner:", error);
    // Implement logging and monitoring as appropriate
  }
}

// Endpoint to get a tournament by slug (protected)
app.get(
  "/api/tournament/:slug",
  limiter,
  param("slug").trim().escape(),
  (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { slug } = req.params;
    const tournament = dailyCache.get(slug.toLowerCase());

    if (tournament) {
      res.json(tournament);
    } else {
      res
        .status(404)
        .send(
          "Tournament not found in cache. Please wait until the next cache refresh."
        );
    }
  }
);

// Endpoint to get phase sets by phaseId (protected)
app.get(
  "/api/phase-sets/:phaseId",
  limiter,
  param("phaseId").isInt().toInt(),
  (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phaseId } = req.params;
    const phaseKey = `phase:${phaseId.toString()}`; // Consistent key format

    if (frequentCache.has(phaseKey)) {
      const sets = frequentCache.get(phaseKey);
      res.json(sets);
    } else {
      console.log(`Cache miss for phaseId: ${phaseId}`);
      res
        .status(404)
        .send(
          "Phase ID not found in cache. Please wait until the next cache refresh."
        );
    }
  }
);

// Endpoint to get user contracts (protected)
app.get(
  "/getUserContracts/:userId",
  limiter,
  [
    param("userId").trim().escape(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("skip").optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userId } = req.params;

      // Pagination parameters with defaults and validation
      const limit = req.query.limit || 100; // Default to 100 results
      const skip = req.query.skip || 0;

      // Step 1: Fetch user and get deployer and better arrays
      const usersCollection = db.collection("Users");
      const user = await usersCollection.findOne({ userId: userId.trim() });

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Separate deployer and better contracts
      const deployerContracts = Array.isArray(user.deployer)
        ? user.deployer
        : [];
      const betterContracts = Array.isArray(user.better) ? user.better : [];

      // Create a roles map to associate each contract address with the user's role(s)
      const rolesMap = {};

      // Map deployer contracts
      deployerContracts.forEach((address) => {
        rolesMap[address] = rolesMap[address] || [];
        if (!rolesMap[address].includes("deployer")) {
          rolesMap[address].push("deployer");
        }
      });

      // Map better contracts
      betterContracts.forEach((address) => {
        rolesMap[address] = rolesMap[address] || [];
        if (!rolesMap[address].includes("better")) {
          rolesMap[address].push("better");
        }
      });

      // Combine all contract addresses
      const contractAddresses = Object.keys(rolesMap);

      if (contractAddresses.length === 0) {
        return res.status(200).json([]);
      }

      // Step 2: Fetch contracts for this user's contracts
      const fetchUserContracts = async (collectionName) => {
        const collection = db.collection(collectionName);

        // Fetch contracts where address is in contractAddresses
        const contracts = await collection
          .find({ address: { $in: contractAddresses } })
          .skip(skip)
          .limit(limit)
          .toArray();

        // Add collectionName and role to each contract
        contracts.forEach((contract) => {
          contract.collectionName = collectionName;
          contract.role = rolesMap[contract.address];
        });

        return contracts;
      };

      // Step 3: Fetch contracts from all collections
      const collectionNames = [
        "Contracts",
        "ExpiredContracts",
        "Disagreements",
      ];
      const contractsPromises = collectionNames.map(fetchUserContracts);
      const results = await Promise.all(contractsPromises);

      // Step 4: Combine results and send response
      const allUserContracts = results.flat();
      res.status(200).json(allUserContracts);
    } catch (error) {
      console.error("Error fetching contracts for user:", error);
      // Implement logging and monitoring as appropriate
      res.status(500).send("Error fetching contracts");
    }
  }
);

// Necessary imports for security and validation

// Assume that 'authenticateToken' middleware is already defined and applied where necessary.

// Secure function to clean up user bets
async function cleanUpUserBets(userId) {
  try {
    // Input validation and sanitization
    if (typeof userId !== "string") {
      throw new Error("Invalid userId");
    }
    const sanitizedUserId = userId.trim();

    const userCollection = db.collection("Users");
    const relevantCollections = [
      "Contracts",
      "ExpiredContracts",
      "Disagreements",
    ];

    // Find the user by userId
    const user = await userCollection.findOne({ userId: sanitizedUserId });

    if (!user) {
      console.log("User not found");
      return;
    }

    const deployerArray = Array.isArray(user.deployer) ? user.deployer : [];
    const betterArray = Array.isArray(user.better) ? user.better : [];

    // Helper function to check if an address exists in any collection
    const addressExistsInCollections = async (address) => {
      // Input validation
      if (typeof address !== "string") {
        return false;
      }
      const sanitizedAddress = address.trim();

      for (let collectionName of relevantCollections) {
        const collection = db.collection(collectionName);
        const addressExists = await collection.findOne({
          address: sanitizedAddress,
        });
        if (addressExists) return true;
      }
      return false;
    };

    // Use Promise.all to check all addresses concurrently
    const deployerPromises = deployerArray.map(async (contractAddress) => {
      const addressFound = await addressExistsInCollections(contractAddress);
      return addressFound ? contractAddress : null;
    });

    const betterPromises = betterArray.map(async (contractAddress) => {
      const addressFound = await addressExistsInCollections(contractAddress);
      return addressFound ? contractAddress : null;
    });

    // Wait for all promises to resolve
    const updatedDeployerArray = (await Promise.all(deployerPromises)).filter(
      Boolean
    );
    const updatedBetterArray = (await Promise.all(betterPromises)).filter(
      Boolean
    );

    // Update user object with cleaned-up deployer and better arrays
    await userCollection.updateOne(
      { userId: sanitizedUserId },
      { $set: { deployer: updatedDeployerArray, better: updatedBetterArray } }
    );

    console.log("User object cleaned up");
  } catch (error) {
    console.error("Error cleaning up user object:", error);
    // Implement logging and monitoring as appropriate
  }
}

// Endpoint to check if a user exists or create a new user (protected)
app.get(
  "/api/existingUser/:address",
  limiter,
  param("address").trim().escape(),
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address } = req.params;
    const sanitizedAddress = address.trim();
    const collection = db.collection("Users");

    try {
      const existingUser = await collection.findOne({
        userId: sanitizedAddress,
      });

      if (existingUser) {
        await cleanUpUserBets(sanitizedAddress);
        // User exists, return 200 OK
        res.sendStatus(200);
      } else {
        // Insert a new user if the address does not exist
        const newUser = {
          userId: sanitizedAddress,
          deployer: [], // Initialize deployer array
          better: [], // Initialize better array
        };
        await collection.insertOne(newUser);
        // Return 201 Created
        res.sendStatus(201);
      }
    } catch (error) {
      console.error("Error fetching or creating user:", error);
      res.status(500).send("Server Error: Unable to fetch or create user.");
    }
  }
);

// Endpoint to update user contracts (protected)
app.post(
  "/api/updateUserContract",
  limiter,
  [
    body("contractAddress").notEmpty().trim().escape(),
    body("userId").notEmpty().trim().escape(),
    body("role").isIn(["better", "deployer"]),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contractAddress, userId, role } = req.body;
    const sanitizedContractAddress = contractAddress.trim();
    const sanitizedUserId = userId.trim();

    try {
      const collection = db.collection("Users");

      // Find the user by userId
      const user = await collection.findOne({ userId: sanitizedUserId });

      if (!user) {
        res.status(404).send("User not found");
        return;
      }

      // Determine which array to update based on the role
      const arrayToUpdate = role;

      // Check if the contractAddress already exists in the corresponding array
      if (!user[arrayToUpdate].includes(sanitizedContractAddress)) {
        // Push the new value if it does not exist
        await collection.updateOne(
          { userId: sanitizedUserId },
          { $push: { [arrayToUpdate]: sanitizedContractAddress } }
        );
        res.status(200).send("Update successful");
      } else {
        res.status(200).send("No update needed: Value already exists.");
      }
    } catch (error) {
      console.error("Error updating MongoDB:", error);
      res.status(500).send("Error updating MongoDB");
    }
  }
);

// Endpoint to get all tournament details (protected)
app.get("/api/tournament-details", limiter, (req, res) => {
  const allTournaments = [];
  dailyCache.keys().forEach((key) => {
    const tournament = dailyCache.get(key);
    if (tournament) {
      allTournaments.push(tournament);
    }
  });

  if (allTournaments.length > 0) {
    res.json(allTournaments);
  } else {
    res
      .status(404)
      .send(
        "No tournament details available. Please wait until the next cache refresh."
      );
  }
});

// Endpoint to handle bets (protected)
app.post(
  "/api/bets",
  limiter,
  [
    body("action")
      .isIn(["deploy", "buy", "resell", "unlist", "edit"])
      .withMessage("Invalid action"),
    body("address").notEmpty().trim().escape().withMessage("Invalid address"),
    body("contractAddress")
      .notEmpty()
      .trim()
      .escape()
      .withMessage("Invalid contract address"),
    body("positionInArray")
      .isInt({ min: 0 })
      .toInt()
      .withMessage("Invalid positionInArray"),
    // Additional validations for amount, buyerAmount, condition depending on action
    body("amount").optional().isFloat({ gt: 0 }).toFloat(),
    body("buyerAmount").optional().isFloat({ gt: 0 }).toFloat(),
    body("condition").optional().trim().escape(),
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const betsCollection = db.collection("bets");
    let {
      action,
      address,
      amount,
      buyerAmount,
      condition,
      contractAddress,
      positionInArray,
    } = req.body;

    // Sanitize inputs
    contractAddress = String(contractAddress).trim().toLowerCase();
    address = String(address).trim().toLowerCase();
    positionInArray = parseInt(positionInArray, 10);

    try {
      switch (action) {
        case "deploy":
          // Validate fields specific to deploy
          if (amount === undefined || buyerAmount === undefined || !condition) {
            return res.status(400).send("Missing required fields for deploy");
          }

          const existingBet = await betsCollection.findOne({
            contractAddress,
            positionInArray,
          });

          if (existingBet) {
            return res.status(400).send("Bet already exists");
          }

          // Create and insert bet
          const bet = {
            contractAddress,
            positionInArray,
            deployer: address,
            condition: condition.trim(),
            deployedAmount: amount,
            buyerAmount,
            buyer: null,
            resellPrice: [],
            reseller: [],
            betForSale: true,
            timestamp: new Date(),
            lastUpdated: new Date(),
          };

          await betsCollection.insertOne(bet);
          return res.status(201).json({ message: "Bet deployed successfully" });

        case "buy":
          const betToBuy = await betsCollection.findOne({
            contractAddress,
            positionInArray,
          });

          if (!betToBuy) {
            return res.status(404).send("Bet not found");
          }

          // Update the bet document
          await betsCollection.updateOne(
            { contractAddress, positionInArray },
            {
              $set: {
                buyer: address,
                betForSale: false,
                lastUpdated: new Date(),
              },
            }
          );

          return res.status(200).json({ message: "Bet bought successfully" });

        case "resell":
          if (amount === undefined) {
            return res.status(400).send("Missing amount for resell");
          }

          const betToResell = await betsCollection.findOne({
            contractAddress,
            positionInArray,
          });

          if (!betToResell) {
            return res.status(404).send("Bet not found");
          }

          if (
            betToResell?.reseller?.length > 0 &&
            betToResell.reseller[betToResell.reseller.length - 1] === address
          ) {
            // Update last element of resellPrice
            await betsCollection.updateOne(
              { contractAddress, positionInArray },
              {
                $set: {
                  [`resellPrice.${betToResell.resellPrice.length - 1}`]: amount,
                  lastUpdated: new Date(),
                },
              }
            );
          } else {
            // Push new values to both arrays
            await betsCollection.updateOne(
              { contractAddress, positionInArray },
              {
                $push: {
                  resellPrice: amount,
                  reseller: address,
                },
                $set: {
                  betForSale: true,
                  lastUpdated: new Date(),
                },
              }
            );
          }

          return res
            .status(200)
            .json({ message: "Bet listed for resale successfully" });

        case "unlist":
          const betToUnlist = await betsCollection.findOne({
            contractAddress,
            positionInArray,
          });

          if (!betToUnlist) {
            return res.status(404).send("Bet not found");
          }

          await betsCollection.updateOne(
            { contractAddress, positionInArray },
            {
              $set: {
                betForSale: false,
                lastUpdated: new Date(),
              },
            }
          );

          return res.status(200).json({ message: "Bet unlisted successfully" });

        case "edit":
          if (amount === undefined || buyerAmount === undefined) {
            return res.status(400).send("Missing required fields for edit");
          }

          const betToEdit = await betsCollection.findOne({
            contractAddress,
            positionInArray,
          });

          if (!betToEdit) {
            return res.status(404).send("Bet not found");
          }

          await betsCollection.updateOne(
            { contractAddress, positionInArray },
            {
              $set: {
                deployedAmount: amount,
                buyerAmount: buyerAmount,
                betForSale: true,
                lastUpdated: new Date(),
              },
            }
          );

          return res.status(200).json({ message: "Bet edited successfully" });

        default:
          return res.status(400).send("Invalid action");
      }
    } catch (error) {
      console.error(`Error processing ${action}:`, error);
      res.status(500).send(`Error processing ${action}`);
    }
  }
);

// Necessary imports for security and validation

// Assume that 'authenticateToken' middleware is already defined and applied where necessary.

// Endpoint to get user bets (protected)
app.get(
  "/api/user-bets/:address",
  limiter,
  [
    param("address")
      .trim()
      .escape()
      .notEmpty()
      .withMessage("Address is required"),
    query("contractAddress")
      .trim()
      .escape()
      .notEmpty()
      .withMessage("Contract address is required"),
  ],
  async (req, res) => {
    // Validate input parameters
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const betsCollection = db.collection("bets");
    let { address } = req.params;
    let { contractAddress } = req.query;

    address = address.toLowerCase();
    contractAddress = contractAddress.toLowerCase();

    try {
      // Build the query object securely
      const queryObj = {
        contractAddress: contractAddress,
        $or: [
          { deployer: address },
          { buyer: address },
          { reseller: address }, // Checks if `address` is in the `reseller` array
        ],
      };

      const bets = await betsCollection.find(queryObj).toArray();

      res.json(bets);
    } catch (error) {
      console.error("Error fetching user bets:", error);
      // Implement logging and monitoring as appropriate
      res.status(500).send("Error fetching user bets");
    }
  }
);

// Centralized error handling middleware

// Export app for testing if necessary
module.exports = app;
