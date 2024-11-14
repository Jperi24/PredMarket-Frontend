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

const { body, validationResult, param, query } = require("express-validator");

// Security: Data sanitization against NoSQL injection attacks
app.use(mongoSanitize());

// Security: Data sanitization against XSS
app.use(xss());

// Security: Prevent HTTP Parameter Pollution
app.use(hpp());

// Security: Compress all routes
app.use(compression());

app.use(helmet());

// app.use(cors({ origin: "http://localhost:3000" }));

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://your-production-domain.com"]
    : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// Global error handling for uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("SIGINT", () => {
  client.close().then(() => {
    console.log("MongoDB disconnected on app termination");
    process.exit(0);
  });
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

const validateContractInput = [
  body("contractAddress").notEmpty().trim().escape(),
  body("tags").notEmpty().trim().escape(),
  // Add other validation rules based on your schema
];

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ limit: "10kb", extended: true }));

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

const apolloClient = require("./apollo-client");
//when deployed make sure Cors or something is only coming from a specific server
const myCache = new NodeCache();
const fetch = require("cross-fetch");

const uri = process.env.MONGOURI;
const client = new MongoClient(uri);
const ethers = require("ethers");
const predMarketArtifact = require("./predMarketV2.json");

// Make sure to import your contract ABI

// You'll need to set up your provider and signer
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const privateKey = process.env.PRIVATE_KEY; // The private key of the wallet that will call declareWinner
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
        scheduleTasks();
        fetchAllTournamentDetails();
        moveExpiredContracts();
      });
    })
    .catch((err) => {
      console.error("Failed to connect to MongoDB", err);
    });
} else {
  console.log("BEGIN TESTING");
  // For tests, export app without starting the server
}

async function moveExpiredContracts() {
  try {
    const sourceCollection = db.collection("Contracts");
    const targetCollection = db.collection("ExpiredContracts");

    // Get the current time and subtract 7 days (7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const sevenDaysAgo = new Date().getTime() - 2 * 24 * 60 * 60 * 1000;
    // Convert milliseconds back to seconds for the timestamp comparison in MongoDB
    // const threshold = Math.floor(sevenDaysAgo / 1000);
    const threshold = Math.floor(sevenDaysAgo / 1000);

    // Find contracts that ended more than 7 days ago
    const expiredContracts = await sourceCollection
      .find({
        endsAt: { $lt: threshold },
      })
      .toArray();

    if (expiredContracts.length > 0) {
      // Insert expired contracts into the target collection
      const insertResult = await targetCollection.insertMany(expiredContracts);
      console.log(
        `${insertResult.insertedCount} contracts moved to ExpiredContracts collection successfully`
      );

      // Delete the moved contracts from the source collection
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
  }
}

const RATE_KEY = "ethToUsdRate";

let rateCache = new NodeCache();

const FETCH_INTERVAL = 60000; // Set an interval to avoid frequent requests
let updatingRates = false;

async function updateAllRates() {
  if (updatingRates) return;

  updatingRates = true;

  const chainInfo = {
    1: { name: "ethereum", coingeckoId: "ethereum" },
    56: { name: "binance-smart-chain", coingeckoId: "binancecoin" },
    137: { name: "polygon", coingeckoId: "matic-network" },
    43114: { name: "avalanche", coingeckoId: "avalanche-2" },
    250: { name: "fantom", coingeckoId: "fantom" },
    31337: { name: "hardhat", coingeckoId: "ethereum", useEthereumRate: true },
    8453: { name: "Base", coingeckoId: "ethereum", useEthereumRate: true },
  };

  const newRates = {}; // Temporary object to hold new rates
  let allSuccessful = true;
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Fetch rate with retry logic
  async function fetchRateWithRetry(chainId, chain) {
    // If the chain should use the Ethereum rate, reuse it from newRates if already available
    if (chain.useEthereumRate) {
      if (newRates["1_RATE"] != null) {
        newRates[`${chainId}_RATE`] = newRates["1_RATE"]; // Use Ethereum rate for specific chain ID
        console.log(
          `Reused Ethereum rate for ${chain.name} (chain ID: ${chainId}): $${newRates["1_RATE"]}`
        );
      } else {
        console.log(
          `Ethereum rate not available yet for ${chain.name} (chain ID: ${chainId}). Skipping fetch.`
        );
        allSuccessful = false;
      }
      return;
    }

    // Standard fetch logic for chains that do not use the Ethereum rate
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${chain.coingeckoId}&vs_currencies=usd`;
    let attempts = 0;
    const maxAttempts = 8;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.error(
            `Failed to fetch ${chain.name} (chain ID: ${chainId}): ${response.status} ${response.statusText}`
          );
          allSuccessful = false;
          return; // Exit if fetch failed
        }
        const data = await response.json();
        newRates[`${chainId}_RATE`] = data[chain.coingeckoId].usd; // Store rate by chain ID
        console.log(
          `Fetched ${chain.name} rate (chain ID: ${chainId}): $${
            data[chain.coingeckoId].usd
          }`
        );
        return; // Exit on successful fetch
      } catch (error) {
        attempts++;
        console.error("Error fetching", chain.name, ":", error);
        if (attempts < maxAttempts) {
          await delay(Math.pow(5, attempts) * 1000); // Exponential backoff delay
        } else {
          allSuccessful = false;
        }
      }
    }
  }

  const chains = Object.entries(chainInfo);
  const maxConcurrentRequests = 2; // Limit of concurrent requests

  for (let i = 0; i < chains.length; i += maxConcurrentRequests) {
    const batch = chains.slice(i, i + maxConcurrentRequests);
    await Promise.all(
      batch.map(([chainId, chain]) => fetchRateWithRetry(chainId, chain))
    );
    await delay(2000); // Small delay between batches
  }

  // Update the rateCache if all fetches were successful
  if (allSuccessful) {
    for (const [key, value] of Object.entries(newRates)) {
      rateCache.set(key, value);
      console.log(`Updated ${key} in rateCache to $${value}`);
    }
    console.log("All rates updated in cache");
  } else {
    console.log("Rate update failed; cache not updated.");
  }

  updatingRates = false;
}

// Run the update function at regular intervals
setInterval(updateAllRates, FETCH_INTERVAL);

app.get("/api/rates", async (req, res) => {
  let rates = {};

  // Assuming 'rateCache' is a NodeCache instance
  const keys = rateCache.keys(); // Get all keys from the cache
  keys.forEach((key) => {
    rates[key] = rateCache.get(key); // Use get() to retrieve the value for each key
  });
  res.json(rates);
});

// Endpoint to get ETH to USD rate from the cache

// Endpoint to check if a set has already been deployed
app.get(`/check-set-deployment/:tags`, limiter, async (req, res) => {
  // Decode URI component
  const tags = decodeURIComponent(req.params.tags);

  try {
    const collection = db.collection("Contracts");

    // Logging the tags and regex for debugging
    console.log("Received tags:", tags);

    // Using a more specific regex pattern
    const regex = new RegExp(
      `^${tags.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}$`,
      "i"
    );
    console.log("Regex used:", regex);

    // Searching in MongoDB using a regex to ensure exact matching
    const contract = await collection.findOne({ tags: regex });

    if (contract) {
      res.status(200).json({ isDeployed: true, contractDetails: contract });
    } else {
      res.status(200).json({ isDeployed: false });
    }
  } catch (error) {
    console.error("Failed to check if set is deployed:", error);
    res.status(500).send("Error checking set deployment");
  }
});

function scheduleTasks() {
  // cron.schedule("0 */2 * * *", moveExpiredContracts); every 2 hours
  cron.schedule("*/5 * * * *", moveExpiredContracts); // every 5 mins
}

app.post(
  "/addContract",
  limiter, // Apply rate limiting
  [
    // Validation and sanitization rules
    body("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address."),
    body("NameofMarket")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Market name is required."),
    body("eventA")
      .isString()
      .trim()
      .escape()
      .withMessage("Event A must be a string."),
    body("eventB")
      .isString()
      .trim()
      .escape()
      .withMessage("Event B must be a string."),
    body("tags")
      .isString()
      .trim()
      .escape()
      .withMessage("Tags must be a comma-separated string."),
    body("deployerAddress")
      .isEthereumAddress()
      .withMessage("Invalid deployer address."),
    body("fullName")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Full name is required."),
    body("endsAt")
      .isInt({ min: Math.floor(Date.now() / 1000) })
      .withMessage("End time must be in the future."),

    body("setKey")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Set key is required."),
  ],
  async (req, res) => {
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
  }
);

app.post(
  "/moveToDisagreements",
  limiter, // Apply rate limiting
  [
    // Validation and sanitization rules
    body("contractAddress")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format for contract."),
    body("reason")
      .isString()
      .trim()
      .escape()
      .isLength({ min: 1, max: 500 })
      .withMessage("Reason must be between 1 and 500 characters."),
  ],
  async (req, res) => {
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
      console.error("Error moving contract to Disagreements:", error);
      res.status(500).send("Server error occurred while moving contract.");
    }
  }
);

async function moveContractToDisagreements(contractAddress, reason) {
  try {
    let sourceCollection = db.collection("Contracts");
    const targetCollection = db.collection("Disagreements");

    // Find the contract in the Contracts collection
    let contract = await sourceCollection.findOne({ address: contractAddress });

    // If not found in Contracts, search in ExpiredContracts collection
    if (!contract) {
      sourceCollection = db.collection("ExpiredContracts");
      contract = await sourceCollection.findOne({ address: contractAddress });

      // If still not found, return an error
      if (!contract) {
        console.error("Contract not found in collections");
        return { error: "Contract not found" };
      }
    }

    // Prepare the document to be inserted into the Disagreements collection
    const updatedContract = {
      ...contract,
      disagreementText: reason,
      lastModified: new Date(),
    };

    // Insert the updated document into the Disagreements collection
    await targetCollection.insertOne(updatedContract);

    // Remove the original document from its source collection
    await sourceCollection.deleteOne({ address: contractAddress });

    console.log("Contract moved to Disagreements collection successfully");
    return { success: true };
  } catch (error) {
    console.error("Error moving contract to Disagreements:", error);
    return { error: "Error moving contract" };
  }
}

app.post(
  "/moveFromDisagreementsToContracts",
  limiter, // Apply rate limiting
  [
    // Validation and sanitization rules
    body("contractAddress")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format for contract."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contractAddress } = req.body;

    try {
      const targetCollection = db.collection("Contracts");
      let sourceCollection = db.collection("Disagreements");

      // Find the contract in the source collection
      let contract = await sourceCollection.findOne({
        address: contractAddress,
      });

      // If not found, try ExpiredContracts collection
      if (!contract) {
        sourceCollection = db.collection("ExpiredContracts");
        contract = await sourceCollection.findOne({ address: contractAddress });

        if (!contract) {
          return res.status(404).send("Contract not found in collections");
        }
      }

      // Prepare the document to be inserted into the Contracts collection, excluding sensitive fields
      const updatedContract = {
        ...contract,
        lastModified: new Date(),
      };
      delete updatedContract.disagreementText; // Remove disagreementText field if it exists

      // Insert the sanitized document into the Contracts collection
      await targetCollection.insertOne(updatedContract);

      // Remove the original document from its source collection
      await sourceCollection.deleteOne({ address: contractAddress });

      res
        .status(200)
        .send("Contract moved to Contracts collection successfully");
    } catch (error) {
      console.error("Error moving contract to Contracts:", error);
      res.status(500).send("Error moving contract");
    }
  }
);

app.get("/getContracts", limiter, async (req, res) => {
  try {
    const collectionNames = ["Contracts", "ExpiredContracts", "Disagreements"];

    const fetchFromCollection = async (collectionName) => {
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      return documents.map((doc) => {
        // Assuming doc.tags contains the tournament slug, event id, and set id
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
    res.status(500).send("Error fetching contracts");
  }
});

app.get(
  "/api/contracts/:address",
  limiter,
  [
    // Validation and sanitization rules
    param("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format for contract."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const address = req.params.address;
      const contractsCollection = db.collection("Contracts");
      const disagreementsCollection = db.collection("Disagreements");
      const expiredContractsCollection = db.collection("ExpiredContracts");

      // First try to find the contract in the Contracts collection
      let contract = await contractsCollection.findOne({ address: address });

      // If not found in Contracts, try the Disagreements collection
      if (!contract) {
        contract = await disagreementsCollection.findOne({ address: address });
      }

      // If not found in Disagreements, try the ExpiredContracts collection
      if (!contract) {
        contract = await expiredContractsCollection.findOne({
          address: address,
        });
      }

      // Return the contract if found
      if (contract) {
        res.status(200).json(contract);
      } else {
        // If the contract is not found in any of the collections
        res.status(404).send("Contract not found");
      }
    } catch (error) {
      console.error("Error fetching contract from MongoDB:", error);
      res.status(500).send("Error fetching contract");
    }
  }
);

process.on("SIGINT", () => {
  client.close().then(() => {
    console.log("MongoDB disconnected on app termination");
    process.exit(0);
  });
});

const {
  GET_ALL_TOURNAMENTS_QUERY,
  GET_FEATURED_TOURNAMENTS_QUERY,
  GET_TOURNAMENT_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} = require("./queries");

const dailyCache = new NodeCache({ stdTTL: 86400 }); // 24 hours TTL for tournaments and events
const frequentCache = new NodeCache({ stdTTL: 0 });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let isFetchingTournaments = false;

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
        delay *= 10; // Exponential backoff
      } else {
        throw error; // Rethrow if not a 429 error
      }
    }
  }
  throw new Error("Failed to fetch data after retries");
}

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

  const todayDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const afterDate3 = Math.floor(
    new Date(Date.now() - 3 * 24 * 3600 * 1000).getTime() / 1000
  );
  const afterDate30 = Math.floor(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).getTime() / 1000
  );
  const beforeDate5 = Math.floor(
    new Date(Date.now() + 5 * 24 * 3600 * 1000).getTime() / 1000
  );

  // Fetch Featured Tournaments
  while (hasMore) {
    await sleep(100); // Updated sleep from 10 to 100
    try {
      const data = await fetchWithRetry(GET_FEATURED_TOURNAMENTS_QUERY, {
        afterDate30,
        page,
        perPage,
      });
      const filteredTournaments = data.tournaments.nodes.filter(
        (tournament) => tournament.endAt >= todayDate
      );
      allTournaments = [...allTournaments, ...filteredTournaments];
      hasMore = data.tournaments.nodes.length === perPage;
      page += 1;
    } catch (error) {
      console.error("Failed to fetch featured tournaments page:", page, error);
      hasMore = false;
    }
  }

  console.log("Finished Querying featured Tourneys");

  // Fetch Regular Tournaments if the total is less than 50
  if (allTournaments.length < 1) {
    try {
      const data = await fetchWithRetry(GET_ALL_TOURNAMENTS_QUERY, {
        afterDate3,
        beforeDate5,
        page: 1,
        perPage: 1,
      });

      const totalTournaments = data.tournaments.pageInfo.total;
      const totalPages = Math.ceil(totalTournaments / perPage);
      page = totalPages;
      console.log("Total Pages of Tourneys: ", totalPages);
    } catch (error) {
      console.error("Failed to fetch total tournaments for pagination", error);
      return;
    }

    hasMore = true;
    while (hasMore && allTournaments.length < 50) {
      await sleep(100); // Updated sleep from 10 to 100
      try {
        const data = await fetchWithRetry(GET_ALL_TOURNAMENTS_QUERY, {
          afterDate3,
          beforeDate5,
          page,
          perPage,
        });

        console.log("Queried Tourneys non Featured", data);
        const filteredTournaments = data.tournaments.nodes.filter(
          (tournament) =>
            tournament.endAt >= todayDate && tournament.numAttendees > 50
        );
        allTournaments = [...allTournaments, ...filteredTournaments];
        hasMore = page >= 1;
        page -= 1; // Decrement to move to the previous page
        console.log("Finished adding Non Feaures on Page:", page + 1);
      } catch (error) {
        console.error("Failed to fetch tournaments page:", page, error);
        hasMore = false;
      }
    }
  }

  allTournaments = allTournaments.slice(0, 50);

  const temporaryCache = new NodeCache({ stdTTL: 86400 });

  console.log(
    "Final Length Of All Tournaments Will Be: ",
    allTournaments.length
  );
  frequentCache.flushAll(); // Completely clear the frequent cache

  for (const tournament of allTournaments) {
    await sleep(100); // Updated sleep from 10 to 100
    try {
      const tournamentDetailResponse = await fetchWithRetry(
        GET_TOURNAMENT_QUERY,
        {
          slug: tournament.slug,
        }
      );
      const detailedTournament = tournamentDetailResponse.tournament;
      temporaryCache.set(tournament.slug.toLowerCase(), detailedTournament);

      if (detailedTournament.events) {
        for (const event of detailedTournament.events) {
          if (event.phases) {
            for (const phase of event.phases) {
              await sleep(100); // Updated sleep from 10 to 100
              let allSets = [];
              let page2 = 1;
              let hasMore2 = true;
              const phaseId = phase.id;

              while (hasMore2) {
                await sleep(100); // Updated sleep from 10 to 100
                try {
                  const phaseData = await fetchWithRetry(
                    GET_SETS_BY_PHASE_QUERY,
                    {
                      phaseId,
                      page: page2,
                      perPage,
                    }
                  );
                  allSets = [...allSets, ...phaseData.phase.sets.nodes];
                  hasMore2 = phaseData.phase.sets.nodes.length === perPage;
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
    console.log("Completed tournament:", tournament);
  }

  // Clear the entire dailyCache and then replace with new entries
  dailyCache.flushAll(); // Completely clear the daily cache

  // Replace with new entries from the temporaryCache using mset
  const keysToUpdate = temporaryCache.keys();
  dailyCache.mset(
    keysToUpdate.map((key) => ({ key, val: temporaryCache.get(key) }))
  );

  console.log("Daily cache updated.");
  isFetchingTournaments = false;
}

let isUpdatingFrequentCache = false;

async function updateFrequentCache() {
  if (isFetchingTournaments || isUpdatingFrequentCache) {
    console.log("updateFrequentCache is already running. Exiting.");
    return;
  }

  isUpdatingFrequentCache = true;

  console.log("Updating frequent cache for ongoing tournaments...");

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
      if (startAtWithBuffer <= currentTime && endAtWithBuffer >= currentTime) {
        console.log(`Tournament ${key} is ongoing.`);
        ongoingTournaments.push(tournament);
      }
    }
  }

  console.log("Ongoing tournaments:", ongoingTournaments);

  for (const tournament of ongoingTournaments) {
    await sleep(100);
    try {
      const tournamentDetailResponse = await fetchWithRetry(
        GET_TOURNAMENT_QUERY,
        { slug: tournament.slug }
      );
      const detailedTournament = tournamentDetailResponse.tournament;

      if (detailedTournament.events) {
        for (const event of detailedTournament.events) {
          if (event.phases) {
            for (const phase of event.phases) {
              await sleep(100);
              let allSets = [];
              let page = 1;
              let hasMore = true;
              const phaseId = phase.id;

              while (hasMore) {
                await sleep(100);
                try {
                  const phaseData = await fetchWithRetry(
                    GET_SETS_BY_PHASE_QUERY,
                    {
                      phaseId,
                      page,
                      perPage: 100,
                    }
                  );
                  allSets = [...allSets, ...phaseData.phase.sets.nodes];
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

                // Log the set data
                if (doesSetExist) {
                  console.log("SET FOUND");
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

                    // Call the declareWinner function
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
                      (slot) => !slot.entrant || slot.entrant.name === "Unknown"
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
                  const setIndex = phaseSets.findIndex((s) => s.id === set.id);
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

      // Update temporaryFrequentCache with the detailed tournament data
      temporaryFrequentCache.set(
        `phase:${tournament.slug.toLowerCase()}`,
        detailedTournament
      );
    } catch (error) {
      console.error("Error handling tournament:", tournament.slug, error);
    }
    console.log("Updated tournament:", tournament.slug);
  }

  // Now update the frequentCache with the new data from temporaryFrequentCache
  const keysToUpdate = temporaryFrequentCache.keys();
  frequentCache.mset(
    keysToUpdate.map((key) => ({
      key,
      val: temporaryFrequentCache.get(key),
    }))
  );

  console.log("Frequent cache updated with ongoing tournaments.");
  isUpdatingFrequentCache = false;
}

cron.schedule("0 */15 * * * *", updateFrequentCache); // Update frequent cache every 20 minutes
cron.schedule("0 0 */24 * * *", fetchAllTournamentDetails);

async function updateMongoDBWithWinner(setKey, winnerName) {
  try {
    const collection = db.collection("Contracts");

    // Find the document where the tags match the setKey
    const document = await collection.findOne({ setKey });

    if (!document) {
      console.log(`No contract found for set ${setKey}`);
      return;
    }

    // Create contract instance
    const contract = new ethers.Contract(
      document.address,
      predMarketArtifact.abi,
      signer
    );

    // Determine which participant won
    let winnerNumber;
    if (winnerName === document.eventA) {
      winnerNumber = 1;
    } else if (winnerName === document.eventB) {
      winnerNumber = 2;
    } else {
      winnerNumber = 3; // DQ or other scenario
    }

    // Call the declareWinner function
    const tx = await contract.declareWinner(winnerNumber);
    await tx.wait();
    console.log(
      `Successfully called declareWinner(${winnerNumber}) for contract ${document.address}`
    );
  } catch (error) {
    console.error("Error calling declareWinner:", error);
  }
}

app.get(
  "/api/tournament/:slug",
  [
    // Validation and sanitization rules for "slug"
    param("slug")
      .isSlug()
      .withMessage(
        "Invalid tournament slug format. Only use alphanumeric characters, dashes, and underscores."
      ),
  ],
  (req, res) => {
    // Check for validation errors
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

app.get(
  "/api/phase-sets/:phaseId",
  [
    // Validation for "phaseId" to ensure it is a numeric value
    param("phaseId")
      .isInt()
      .withMessage("Invalid phase ID format. It must be a numeric value."),
  ],
  (req, res) => {
    // Check for validation errors
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
          "phaseId not found in cache. Please wait until the next cache refresh."
        );
    }
  }
);

app.get(
  "/getUserContracts/:userId",
  limiter,
  [
    // Validate that "userId" is a valid Ethereum address
    param("userId")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format for user ID."),
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Pagination parameters
      const limit = parseInt(req.query.limit) || 100; // Default 100 results
      const skip = parseInt(req.query.skip) || 0;

      // Step 1: Fetch user and get deployer and better arrays
      const usersCollection = db.collection("Users");
      const user = await usersCollection.findOne({ userId });

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Separate deployer and better contracts
      const deployerContracts = user.deployer || [];
      const betterContracts = user.better || [];

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
      res.status(500).send("Error fetching contracts");
    }
  }
);

// async function cleanUpUserBets(userId) {
//   try {
//     const userCollection = db.collection("Users");
//     const relevantCollections = [
//       "Contracts",
//       "ExpiredContracts",
//       "Disagreements",
//     ];

//     // Find the user by userId
//     const user = await userCollection.findOne({ userId: userId });

//     if (!user) {
//       console.log("User not found");
//       return;
//     }

//     const deployerArray = user.deployer || [];
//     const betterArray = user.better || [];

//     const updatedDeployerArray = [];
//     const updatedBetterArray = [];

//     // Helper function to check if an address exists in any collection
//     const addressExistsInCollections = async (address) => {
//       for (let collectionName of relevantCollections) {
//         const collection = db.collection(collectionName);
//         const addressExists = await collection.findOne({ address: address }); // Check 'address' field in the collection
//         if (addressExists) return true;
//       }
//       return false;
//     };

//     // Check the deployer array
//     for (let contractAddress of deployerArray) {
//       const addressFound = await addressExistsInCollections(contractAddress);
//       if (addressFound) {
//         updatedDeployerArray.push(contractAddress); // Keep the address if found
//       }
//     }

//     // Check the better array
//     for (let contractAddress of betterArray) {
//       const addressFound = await addressExistsInCollections(contractAddress);
//       if (addressFound) {
//         updatedBetterArray.push(contractAddress); // Keep the address if found
//       }
//     }

//     // Update user object with cleaned up deployer and better arrays
//     await userCollection.updateOne(
//       { userId: userId },
//       { $set: { deployer: updatedDeployerArray, better: updatedBetterArray } }
//     );

//     console.log("User object cleaned up");
//   } catch (error) {
//     console.error("Error cleaning up user object:", error);
//   }
// }

async function cleanUpUserBets(userId) {
  try {
    const userCollection = db.collection("Users");
    const relevantCollections = [
      "Contracts",
      "ExpiredContracts",
      "Disagreements",
    ];

    // Find the user by userId
    const user = await userCollection.findOne({ userId: userId });

    if (!user) {
      console.log("User not found");
      return;
    }

    const deployerArray = user.deployer || [];
    const betterArray = user.better || [];

    // Helper function to check if an address exists in any collection
    const addressExistsInCollections = async (address) => {
      for (let collectionName of relevantCollections) {
        const collection = db.collection(collectionName);
        const addressExists = await collection.findOne({ address: address });
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
      { userId: userId },
      { $set: { deployer: updatedDeployerArray, better: updatedBetterArray } }
    );

    console.log("User object cleaned up");
  } catch (error) {
    console.error("Error cleaning up user object:", error);
  }
}

app.get(
  "/api/existingUser/:address",
  limiter,
  [
    // Validate that "address" is a valid Ethereum address
    param("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format."),
  ], // Middleware to prevent address spoofing
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { address } = req.params;
    const collection = db.collection("Users");

    try {
      const existingUser = await collection.findOne({ userId: address });

      if (existingUser) {
        await cleanUpUserBets(address);
        res.sendStatus(200); // User exists, return 200 OK
      } else {
        // Insert a new user if the address does not exist
        const newUser = {
          userId: address,
          deployer: [],
          better: [],
        };
        await collection.insertOne(newUser);
        res.sendStatus(201); // Return 201 Created
      }
    } catch (error) {
      console.error("Error fetching or creating user:", error);
      res.status(500).send("Server Error: Unable to fetch or create user.");
    }
  }
);

app.post(
  "/api/updateUserContract",
  limiter,
  [
    // Validate that userId is a valid Ethereum address
    body("userId")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format."),

    // Validate contractAddress to be a non-empty string (or address format if appropriate)
    body("contractAddress")
      .isString()
      .notEmpty()
      .withMessage("Contract address is required."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { contractAddress, userId, role } = req.body;

    try {
      const collection = db.collection("Users");

      // Find the user by userId
      const user = await collection.findOne({ userId });

      if (!user) {
        res.status(404).send("User not found");
        return;
      }

      // Determine which array to update based on the role
      let arrayToUpdate;
      if (role === "better") {
        arrayToUpdate = "better";
      } else if (role === "deployer") {
        arrayToUpdate = "deployer";
      } else {
        res.status(400).send("Invalid role specified");
        return;
      }

      // Check if the contractAddress already exists in the corresponding array
      if (!user[arrayToUpdate].includes(contractAddress)) {
        // Push the new value if it does not exist
        await collection.updateOne(
          { userId },
          { $push: { [arrayToUpdate]: contractAddress } }
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

app.get("/api/tournament-details", (req, res) => {
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

app.post(
  "/api/bets",
  limiter,
  [
    // Validation and sanitization for request fields
    body("action")
      .isIn(["deploy", "buy", "resell", "unlist", "edit", "cancel"])
      .withMessage("Invalid action specified."),
    body("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format."),
    body("contractAddress")
      .isEthereumAddress()
      .withMessage("Invalid contract address format."),
    body("amount")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Amount must be a positive number."),
    body("buyerAmount")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Buyer amount must be a positive number."),
    body("condition")
      .optional()
      .isString()
      .trim()
      .escape()
      .withMessage("Invalid condition format."),
    body("positionInArray")
      .isInt({ min: 0 })
      .withMessage("Position in array must be a non-negative integer."),
    // Middleware to prevent spoofing
  ],
  async (req, res) => {
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

    contractAddress = String(contractAddress).toLowerCase();
    address = String(address).toLowerCase();
    positionInArray = parseInt(positionInArray, 10);

    // Basic validation for common fields
    if (!address || typeof address !== "string") {
      return res.status(400).send("Invalid address");
    }

    if (!contractAddress || typeof contractAddress !== "string") {
      return res.status(400).send("Invalid contract address");
    }

    if (isNaN(positionInArray)) {
      return res.status(400).send("Invalid positionInArray");
    }

    // Action-specific validation
    try {
      switch (action) {
        case "deploy":
          // Validate fields specific to deploy
          amount = parseFloat(amount);
          buyerAmount = parseFloat(buyerAmount);

          if (isNaN(amount) || isNaN(buyerAmount)) {
            return res
              .status(400)
              .send("Invalid amount or buyerAmount for deploy");
          }

          if (!condition || typeof condition !== "string") {
            return res.status(400).send("Invalid condition for deploy");
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
            condition,
            deployedAmount: amount,
            buyerAmount,
            buyer: null,
            resellPrice: [],
            reseller: [],
            betForSale: true,
            timestamp: new Date(),
            lastUpdated: new Date(),
            isActive: true,
          };

          await betsCollection.insertOne(bet);
          return res.status(201).json({ message: "Bet deployed successfully" });

        case "buy":
          // No need to validate amount for buy
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

        case "cancel":
          // No need to validate amount for buy
          const betToCancel = await betsCollection.findOne({
            contractAddress,
            positionInArray,
          });

          if (!betToCancel) {
            return res.status(404).send("Bet not found");
          }
          if (!betToCancel.isActive) {
            return res.status(406).send("Bet already cancelled");
          }

          // Update the bet document
          await betsCollection.updateOne(
            { contractAddress, positionInArray },
            {
              $set: {
                isActive: false,
              },
            }
          );

          return res.status(200).json({ message: "Bet bought successfully" });

        case "resell":
          // Validate amount for resell
          amount = parseFloat(amount);
          if (isNaN(amount)) {
            return res.status(400).send("Invalid amount for resell");
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
            // If the last element in the `reseller` array matches the current address, update the last element in `resellPrice`
            await betsCollection.updateOne(
              { contractAddress, positionInArray },
              {
                $set: {
                  [`resellPrice.${betToResell.resellPrice.length - 1}`]: amount, // Update last element of resellPrice
                  lastUpdated: new Date(),
                },
              }
            );
          } else {
            // If it doesn't match, push the new values to both arrays
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
          // No amount or buyerAmount needed for unlist
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
          // Validate fields specific to edit
          amount = parseFloat(amount);
          buyerAmount = parseFloat(buyerAmount);
          if (isNaN(amount) || isNaN(buyerAmount)) {
            return res
              .status(400)
              .send("Invalid amount or buyerAmount for edit");
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

app.get(
  "/api/user-bets/:address",
  limiter,
  [
    // Validation and sanitization rules
    param("address")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format."),
    query("contractAddress")
      .isEthereumAddress()
      .withMessage("Invalid Ethereum address format."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const betsCollection = db.collection("bets");
    let { address } = req.params;
    let { contractAddress } = req.query;

    address = String(address).toLowerCase();
    contractAddress = String(contractAddress).toLowerCase();

    try {
      // Validate input parameters
      if (!address || !contractAddress) {
        return res.status(400).send("Address and contractAddress are required");
      }

      console.log(
        "Querying for contractADdress: ",
        contractAddress,
        "And address: ",
        address
      );

      // Build the query object
      const query = {
        contractAddress: contractAddress,
        $or: [
          { deployer: address },
          { buyer: address },
          { reseller: address }, // Checks if `address` is in the `reseller` array
        ],
      };

      const bets = await betsCollection.find(query).toArray();

      console.log(bets);

      res.json(bets);
    } catch (error) {
      console.error("Error fetching user bets:", error);
      res.status(500).send("Error fetching user bets");
    }
  }
);
