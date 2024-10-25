const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
const cron = require("node-cron"); // Import node-cron
const NodeCache = require("node-cache");
const app = express();
require("dotenv").config();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
const apolloClient = require("./apollo-client");
//when deployed make sure Cors or something is only coming from a specific server
const myCache = new NodeCache();
const fetch = require("cross-fetch");
const uri =
  "mongodb+srv://Jake:Koolaid20@cluster0.lwaxzbm.mongodb.net/?retryWrites=true&w=majority";
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

const rateCache = new NodeCache();
const RATE_KEY = "ethToUsdRate";
const FETCH_INTERVAL = 60000; // 6 seconds in milliseconds

// Function to fetch the rate from CoinGecko and update the cache
async function updateAllRates() {
  const chainInfo = {
    1: { name: "ethereum", coingeckoId: "ethereum" },
    56: { name: "binance-smart-chain", coingeckoId: "binancecoin" },
    137: { name: "polygon", coingeckoId: "matic-network" },
    43114: { name: "avalanche", coingeckoId: "avalanche-2" },
    250: { name: "fantom", coingeckoId: "fantom" },
    31337: { name: "hardhat", coingeckoId: "ethereum" }, // Assumes local Hardhat testnet uses the same rate as Ethereum
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
      }
    }
  );

  await Promise.all(ratePromises);
  console.log("All rates updated");
}

app.get("/api/rates", async (req, res) => {
  let rates = {};
  // Assuming 'rateCache' is a Map or similar structure
  rateCache.forEach((value, key) => {
    rates[key] = value;
  });
  res.json(rates);
});

// Initial fetch and setup periodic update
if (process.env.NODE_ENV !== "test") {
  updateAllRates();
  setInterval(updateAllRates, FETCH_INTERVAL);
}

// Endpoint to get ETH to USD rate from the cache

// Endpoint to check if a set has already been deployed
app.get(`/check-set-deployment/:tags`, async (req, res) => {
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

app.post("/addContract", async (req, res) => {
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

app.post("/moveToDisagreements", async (req, res) => {
  try {
    const { contractAddress, reason } = req.body;
    let sourceCollection = db.collection("Contracts");
    const targetCollection = db.collection("Disagreements");

    // Find the contract in the source collection
    let contract = await sourceCollection.findOne({ address: contractAddress });

    // If not found in ExpiredContracts, search in Contracts collection
    if (!contract) {
      sourceCollection = db.collection("ExpiredContracts");
      contract = await sourceCollection.findOne({ address: contractAddress });

      // If still not found, respond with an error
      if (!contract) {
        return res.status(404).send("Contract not found in collections");
      }
    }

    // Prepare the document to be inserted into the Disagreements collection
    // Include the disagreementText and update the lastModified field
    const updatedContract = {
      ...contract,
      disagreementText: reason,
      lastModified: new Date(),
    };

    // Insert the updated document into the Disagreements collection
    await targetCollection.insertOne(updatedContract);

    // Remove the original document from its source collection
    await sourceCollection.deleteOne({ address: contractAddress });

    res
      .status(200)
      .send("Contract moved to Disagreements collection successfully");
  } catch (error) {
    console.error("Error moving contract to Disagreements:", error);
    res.status(500).send("Error moving contract");
  }
});

app.post("/moveFromDisagreementsToContracts", async (req, res) => {
  try {
    const { contractAddress } = req.body;
    const targetCollection = db.collection("Contracts");
    let sourceCollection = db.collection("Disagreements");

    // Find the contract in the source collection
    let contract = await sourceCollection.findOne({ address: contractAddress });

    if (!contract) {
      sourceCollection = db.collection("ExpiredContracts");
      contract = await sourceCollection.findOne({ address: contractAddress });
      if (!contract) {
        return res.status(404).send("Contract not found in collections");
      }
    }

    // Prepare the document to be inserted into the Contracts collection
    // Removing the disagreementText field
    const updatedContract = {
      ...contract,
      lastModified: new Date(),
    };
    delete updatedContract.disagreementText; // Deletes the disagreementText field

    // Insert the updated document into the Contracts collection
    await targetCollection.insertOne(updatedContract);

    // Remove the original document from its source collection
    await sourceCollection.deleteOne({ address: contractAddress });

    res.status(200).send("Contract moved to Contracts collection successfully");
  } catch (error) {
    console.error("Error moving contract to Contracts:", error);
    res.status(500).send("Error moving contract");
  }
});
app.get("/getContracts", async (req, res) => {
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

// app.get("/getContracts", async (req, res) => {
//   try {
//     // List of collections to query from
//     const collectionNames = ["Contracts", "ExpiredContracts", "Disagreements"];

//     // Function to fetch documents from a collection and add the collection name
//     const fetchFromCollection = async (collectionName) => {
//       const collection = db.collection(collectionName);
//       const documents = await collection.find({}).toArray();
//       // Adding collection name to each document
//       return documents.map((doc) => ({ ...doc, collectionName }));
//     };

//     // Execute queries for all collections concurrently
//     const contractsPromises = collectionNames.map((collectionName) =>
//       fetchFromCollection(collectionName)
//     );
//     const results = await Promise.all(contractsPromises);

//     // Flatten the results array (since each promise returns an array of documents)
//     const allContracts = results.flat();

//     // Return the combined results
//     res.status(200).json(allContracts);
//   } catch (error) {
//     console.error("Error fetching contracts from MongoDB:", error);
//     res.status(500).send("Error fetching contracts");
//   }
// });

app.get("/api/contracts/:address", async (req, res) => {
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
      contract = await expiredContractsCollection.findOne({ address: address });
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
});

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
  if (allTournaments.length < 50) {
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

                const doesSetExist = documents.some((docSet) => {
                  return (
                    normalizeString(docSet.eventA) ===
                      normalizeString(set.slots[0]?.entrant?.name) &&
                    normalizeString(docSet.eventB) ===
                      normalizeString(set.slots[1]?.entrant?.name) &&
                    normalizeString(docSet.fullName) ===
                      normalizeString(set.fullRoundText)
                  );
                });

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

                    await updateMongoDBWithWinner(cacheSetKey, 3); // Set winnerName to 3 for invalid/canceled sets
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

app.get("/api/tournament/:slug", (req, res) => {
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
});

app.get("/api/phase-sets/:phaseId", (req, res) => {
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
});

app.get("/getUserContracts/:userId", async (req, res) => {
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
    const collectionNames = ["Contracts", "ExpiredContracts", "Disagreements"];
    const contractsPromises = collectionNames.map(fetchUserContracts);
    const results = await Promise.all(contractsPromises);

    // Step 4: Combine results and send response
    const allUserContracts = results.flat();
    res.status(200).json(allUserContracts);
  } catch (error) {
    console.error("Error fetching contracts for user:", error);
    res.status(500).send("Error fetching contracts");
  }
});

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

app.get("/api/existingUser/:address", async (req, res) => {
  const { address } = req.params;
  const collection = db.collection("Users");

  try {
    const existingUser = await collection.findOne({ userId: address });

    if (existingUser) {
      await cleanUpUserBets(address);
      // User exists, return 200 OK
      res.sendStatus(200);
    } else {
      // Insert a new user if the address does not exist
      const newUser = {
        userId: address,
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
});

app.post("/api/updateUserContract", async (req, res) => {
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
});

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

// Export functions and caches for testing
module.exports = {
  app,
  fetchAllTournamentDetails,
  updateFrequentCache,
  dailyCache,
  frequentCache,
  setStatuses,
  updateMongoDBWithWinner,
  sleep,
};
