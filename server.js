const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
const cron = require("node-cron"); // Import node-cron
const NodeCache = require("node-cache");
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
const apolloClient = require("./apollo-client");
//when deployed make sure Cors or something is only coming from a specific server
const myCache = new NodeCache();
const fetch = require("cross-fetch");
const uri =
  "mongodb+srv://Jake:Koolaid20@cluster0.lwaxzbm.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;
const PORT = process.env.PORT || 3001;

client
  .connect()
  .then(() => {
    db = client.db("PredMarket");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      scheduleTasks();
      fetchAllTournamentDetails();
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });

async function moveExpiredContracts() {
  try {
    const sourceCollection = db.collection("Contracts");

    // Get the current time and subtract 7 days (7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const sevenDaysAgo = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;
    // Convert milliseconds back to seconds for the timestamp comparison in MongoDB
    const threshold = Math.floor(sevenDaysAgo / 1000);

    // Delete contracts that ended more than 7 days ago directly
    const result = await sourceCollection.deleteMany({
      endTime: { $lt: threshold },
    });

    console.log(
      `${result.deletedCount} expired contracts deleted successfully`
    );
  } catch (err) {
    console.error("Error deleting expired contracts:", err);
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
updateAllRates();
setInterval(updateAllRates, FETCH_INTERVAL);

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

// app.get("/getContracts", async (req, res) => {
//   try {
//     const collection = db.collection("Contracts");
//     const contracts = await collection.find({}).toArray();
//     res.status(200).json(contracts);
//   } catch (error) {
//     console.error("Error fetching contracts from MongoDB:", error);
//     res.status(500).send("Error fetching contracts");
//   }
// });

// const contractsCache = new NodeCache(); // This will store the contracts

// async function updateContractsCache() {
//   const collections = ["Contracts", "ExpiredContracts", "Disagreements"];
//   let allContracts = [];

//   try {
//     for (const collectionName of collections) {
//       const collection = db.collection(collectionName);
//       const contracts = await collection.find({}).toArray();

//       // Append the collectionName to each contract
//       const augmentedContracts = contracts.map((contract) => ({
//         ...contract,
//         collectionName: collectionName, // Adding collection name to each document
//       }));

//       allContracts = allContracts.concat(augmentedContracts);
//     }

//     // Cache the combined list of contracts with augmented collection name
//     contractsCache.set("allContracts", allContracts, 600); // Set TTL for 10 minutes
//     console.log("Contracts cache updated successfully.");
//   } catch (error) {
//     console.error("Failed to update contracts cache:", error);
//   }
// }

app.get("/getContracts", async (req, res) => {
  try {
    // List of collections to query from
    const collectionNames = ["Contracts", "ExpiredContracts", "Disagreements"];

    // Function to fetch documents from a collection and add the collection name
    const fetchFromCollection = async (collectionName) => {
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      // Adding collection name to each document
      return documents.map((doc) => ({ ...doc, collectionName }));
    };

    // Execute queries for all collections concurrently
    const contractsPromises = collectionNames.map((collectionName) =>
      fetchFromCollection(collectionName)
    );
    const results = await Promise.all(contractsPromises);

    // Flatten the results array (since each promise returns an array of documents)
    const allContracts = results.flat();

    // Return the combined results
    res.status(200).json(allContracts);
  } catch (error) {
    console.error("Error fetching contracts from MongoDB:", error);
    res.status(500).send("Error fetching contracts");
  }
});

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

app.post("/api/updateMongoDB", async (req, res) => {
  const { contractAddress, voteTime } = req.body;

  try {
    // Use the existing MongoDB client and database connection
    const collection = db.collection("Contracts");

    // Update the document where the contract address matches
    // Ensure the field name matches your MongoDB document structure
    await collection.updateOne(
      { address: contractAddress }, // filter by the correct field name
      { $set: { voteTime: voteTime } } // set the new vote time
    );

    res.status(200).send("Update successful");
  } catch (error) {
    console.error("Error updating MongoDB:", error);
    res.status(500).send("Error updating MongoDB");
  }
});

app.post("/api/updateBetterMongoDB", async (req, res) => {
  const { contractAddress, better } = req.body;

  try {
    // Use the existing MongoDB client and database connection
    const collection = db.collection("Contracts");

    // Update the document where the contract address matches
    // Ensure the field name matches your MongoDB document structure
    await collection.updateOne(
      { address: contractAddress }, // filter by the correct field name
      { $addToSet: { betters: better } }
    );

    res.status(200).send("Update successful");
  } catch (error) {
    console.error("Error updating MongoDB:", error);
    res.status(500).send("Error updating MongoDB");
  }
});

const {
  GET_ALL_TOURNAMENTS_QUERY,
  GET_TOURNAMENT_QUERY,
  GET_SETS_BY_PHASE_QUERY,
} = require("./queries");

const dailyCache = new NodeCache({ stdTTL: 86400 }); // 24 hours TTL for tournaments and events
const frequentCache = new NodeCache({ stdTTL: 1200 });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchAllTournamentDetails() {
  let allTournaments = [];
  let page = 1;
  const perPage = 100;
  let hasMore = true;

  while (hasMore) {
    await sleep(1000);
    try {
      const { data } = await apolloClient.query({
        query: GET_ALL_TOURNAMENTS_QUERY,
        variables: {
          afterDate: Math.floor(
            new Date(Date.now() - 5 * 24 * 3600 * 1000).getTime() / 1000
          ),
          beforeDate: Math.floor(
            new Date(Date.now() + 5 * 24 * 3600 * 1000).getTime() / 1000
          ),
          page,
          perPage,
        },
      });
      allTournaments = [...allTournaments, ...data.tournaments.nodes];
      hasMore = data.tournaments.nodes.length === perPage;
      page += 1;
    } catch (error) {
      console.error("Failed to fetch tournament page:", page, error);
      hasMore = false; // Optional: Decide whether to stop or continue fetching more pages
    }
  }

  for (const tournament of allTournaments) {
    await sleep(1000);
    try {
      const tournamentDetailResponse = await apolloClient.query({
        query: GET_TOURNAMENT_QUERY,
        variables: { slug: tournament.slug },
      });
      const detailedTournament = tournamentDetailResponse.data.tournament;
      dailyCache.set(tournament.slug.toLowerCase(), detailedTournament);

      if (detailedTournament.events) {
        for (const event of detailedTournament.events) {
          if (event.phases) {
            for (const phase of event.phases) {
              await sleep(1000);
              let allSets = [];
              let page2 = 1;
              let hasMore2 = true;
              const phaseId = phase.id;

              while (hasMore2) {
                await sleep(1000);
                try {
                  const { data: phaseData } = await apolloClient.query({
                    query: GET_SETS_BY_PHASE_QUERY,
                    variables: { phaseId, page: page2, perPage },
                  });
                  allSets = [...allSets, ...phaseData.phase.sets.nodes];
                  hasMore2 = phaseData.phase.sets.nodes.length === perPage;
                  page2 += 1;
                } catch (error) {
                  console.error(
                    "Error fetching sets for phase:",
                    phase.id,
                    error
                  );
                  hasMore2 = false; // Decide based on your needs
                }
              }

              frequentCache.set(phase.id, allSets);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling tournament:", tournament.slug, error);
    }
    console.log("completed tournament:", tournament);
  }
}

async function updateFrequentCache() {
  console.log("Updating frequent cache...");
  const slugs = dailyCache.keys();

  for (const slug of slugs) {
    await sleep(1000);
    try {
      const tournament = dailyCache.get(slug);
      if (tournament && tournament.events) {
        for (const event of tournament.events) {
          if (event.phases) {
            for (const phase of event.phases) {
              let allSets = [];
              let page = 1;
              let hasMore = true;

              while (hasMore) {
                await sleep(1000);
                try {
                  const phaseSetsResponse = await apolloClient.query({
                    query: GET_SETS_BY_PHASE_QUERY,
                    variables: { phaseId: phase.id, page, perPage: 100 },
                  });
                  allSets = [
                    ...allSets,
                    ...phaseSetsResponse.data.phase.sets.nodes,
                  ];
                  hasMore =
                    phaseSetsResponse.data.phase.sets.nodes.length === 100;
                  page += 1;
                } catch (error) {
                  console.error(
                    "Error fetching sets for phase:",
                    phase.id,
                    error
                  );
                  hasMore = false; // Decide based on your needs
                }
              }

              frequentCache.set(phase.id, allSets);
            }
          }
        }
      }
    } catch (error) {
      console.error(
        "Error updating frequent cache for tournament:",
        slug,
        error
      );
    }
  }
  console.log("Frequent cache updated.");
}

// Schedule tasks to update caches
cron.schedule("0 */20 * * * *", updateFrequentCache); // Update frequent cache every 20 minutes
cron.schedule("0 0 */24 * * *", fetchAllTournamentDetails);

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
  console.log(`Requested phaseId: ${phaseId}`);
  if (frequentCache.has(phaseId.toLowerCase())) {
    const set = frequentCache.get(phaseId.toLowerCase());

    res.json(set);
  } else {
    console.log(`Cache miss for phaseId: ${phaseId}`);
    res
      .status(404)
      .send(
        "phaseId not found in cache. Please wait until the next cache refresh."
      );
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
