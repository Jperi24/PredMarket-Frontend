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

// Initial fetch and setup periodic update
updateAllRates();
setInterval(updateAllRates, FETCH_INTERVAL);

// Endpoint to get ETH to USD rate from the cache
app.get("/ethToUsdRate", (req, res) => {
  const rate = rateCache.get(RATE_KEY);
  if (rate) {
    res.json({ rate });
  } else {
    res.status(503).json({
      error: "Rate is currently unavailable, please try again later.",
    });
  }
});

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
    const { contractAddress, disagreementText } = req.body;
    let sourceCollection = db.collection("ExpiredContracts");
    const targetCollection = db.collection("Disagreements");

    // Find the contract in the source collection
    let contract = await sourceCollection.findOne({ address: contractAddress });

    // If not found in ExpiredContracts, search in Contracts collection
    if (!contract) {
      sourceCollection = db.collection("Contracts");
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
      disagreementText: disagreementText,
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

app.get("/getContracts", async (req, res) => {
  try {
    const collection = db.collection("Contracts");
    const contracts = await collection.find({}).toArray();
    res.status(200).json(contracts);
  } catch (error) {
    console.error("Error fetching contracts from MongoDB:", error);
    res.status(500).send("Error fetching contracts");
  }
});

app.get("/api/contracts/:address", async (req, res) => {
  try {
    const address = req.params.address;
    const contractsCollection = db.collection("Contracts");

    // First try to find the contract in the Contracts collection
    let contract = await contractsCollection.findOne({ address: address });

    // If not found in Contracts, try the ExpiredContracts collection

    if (contract) {
      res.status(200).json(contract);
    } else {
      // If the contract is not found in both collections
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

// async function fetchAllTournamentDetails() {
//   if (isFetchingTournaments) {
//     console.log("fetchAllTournamentDetails is already running. Exiting.");
//     return;
//   }

//   // Set the lock
//   isFetchingTournaments = true;
//   console.log("Updating daily cache...");

//   let allTournaments = [];
//   let page = 1;
//   const perPage = 100;
//   let hasMore = true;

//   const todayDate = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

//   const afterDate3 = Math.floor(
//     new Date(Date.now() - 3 * 24 * 3600 * 1000).getTime() / 1000
//   );

//   const afterDate30 = Math.floor(
//     new Date(Date.now() - 30 * 24 * 3600 * 1000).getTime() / 1000
//   );

//   const beforeDate5 = Math.floor(
//     new Date(Date.now() + 5 * 24 * 3600 * 1000).getTime() / 1000
//   );

//   // Fetch Featured Tournaments
//   while (hasMore) {
//     await sleep(10);
//     try {
//       const { data } = await apolloClient.query({
//         query: GET_FEATURED_TOURNAMENTS_QUERY,
//         variables: {
//           afterDate30,
//           page,
//           perPage,
//         },
//       });
//       const filteredTournaments = data.tournaments.nodes.filter(
//         (tournament) => tournament.endAt >= todayDate
//       );
//       allTournaments = [...allTournaments, ...filteredTournaments];
//       hasMore = data.tournaments.nodes.length === perPage;
//       page += 1;
//     } catch (error) {
//       console.error("Failed to fetch featured tournaments page:", page, error);
//       hasMore = false;
//     }
//   }

//   console.log("Finished Querying featured Tourneys");

//   // Fetch Regular Tournaments if the total is less than 50
//   if (allTournaments.length < 50) {
//     // Fetch the total number of tournaments to calculate the last page
//     try {
//       const { data } = await apolloClient.query({
//         query: GET_ALL_TOURNAMENTS_QUERY,
//         variables: {
//           afterDate3,
//           beforeDate5,
//           page: 1,
//           perPage: 1,
//         },
//       });

//       const totalTournaments = data.tournaments.pageInfo.total;
//       const totalPages = Math.ceil(totalTournaments / perPage);
//       page = totalPages; // Start on the last page
//       console.log("Total Pages of Tourneys: ", totalPages);
//     } catch (error) {
//       console.error("Failed to fetch total tournaments for pagination", error);
//       return;
//     }

//     hasMore = true;
//     while (hasMore && allTournaments.length < 50) {
//       await sleep(10);
//       try {
//         const { data } = await apolloClient.query({
//           query: GET_ALL_TOURNAMENTS_QUERY,
//           variables: {
//             afterDate3,
//             beforeDate5,
//             page,
//             perPage,
//           },
//         });

//         console.log("Queried Tourneys non Featured", data);
//         const filteredTournaments = data.tournaments.nodes.filter(
//           (tournament) =>
//             tournament.endAt >= todayDate && tournament.numAttendees > 50
//         );
//         allTournaments = [...allTournaments, ...filteredTournaments];
//         hasMore = page >= 1;
//         page -= 1; // Decrement to move to the previous page
//         console.log("Finished adding Non Feaures on Page:", page + 1);
//       } catch (error) {
//         console.error("Failed to fetch tournaments page:", page, error);
//         hasMore = false;
//       }
//     }
//   }

//   // Limit the total number of tournaments to 50
//   allTournaments = allTournaments.slice(0, 50);

//   const temporaryCache = new NodeCache({ stdTTL: 86400 }); // Create a temporary cache for daily cache updates

//   console.log(
//     "Final Length Of ALl Tournaments Will Be: ",
//     allTournaments.length
//   );

//   for (const tournament of allTournaments) {
//     await sleep(10);
//     try {
//       const tournamentDetailResponse = await apolloClient.query({
//         query: GET_TOURNAMENT_QUERY,
//         variables: { slug: tournament.slug },
//       });
//       const detailedTournament = tournamentDetailResponse.data.tournament;
//       temporaryCache.set(tournament.slug.toLowerCase(), detailedTournament);

//       if (detailedTournament.events) {
//         for (const event of detailedTournament.events) {
//           if (event.phases) {
//             for (const phase of event.phases) {
//               await sleep(10);
//               let allSets = [];
//               let page2 = 1;
//               let hasMore2 = true;
//               const phaseId = phase.id;

//               while (hasMore2) {
//                 await sleep(10);
//                 try {
//                   const { data: phaseData } = await apolloClient.query({
//                     query: GET_SETS_BY_PHASE_QUERY,
//                     variables: { phaseId, page: page2, perPage },
//                   });
//                   allSets = [...allSets, ...phaseData.phase.sets.nodes];
//                   hasMore2 = phaseData.phase.sets.nodes.length === perPage;
//                   page2 += 1;
//                 } catch (error) {
//                   console.error(
//                     "Error fetching sets for phase:",
//                     phase.id,
//                     error
//                   );
//                   hasMore2 = false;
//                 }
//               }

//               // Debug logging
//               console.log(`Caching sets for phaseId: ${phase.id}`);
//               frequentCache.set(phase.id, allSets);
//             }
//           }
//         }
//       }
//     } catch (error) {
//       console.error("Error handling tournament:", tournament.slug, error);
//     }
//     console.log("Completed tournament:", tournament);
//   }

//   // Replace the old daily cache with the new one
//   dailyCache.flushAll();
//   dailyCache.mset(
//     temporaryCache.keys().map((key) => ({ key, val: temporaryCache.get(key) }))
//   );

//   console.log("Daily cache updated.");
//   isFetchingTournaments = false;
// }

async function fetchWithRetry(query, variables, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await apolloClient.query({
        query: query,
        variables: variables,
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
  if (isFetchingTournaments) {
    console.log("fetchAllTournamentDetails is already running. Exiting.");
    return;
  }

  isFetchingTournaments = true;
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
              frequentCache.set(phase.id, allSets);
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
    console.log(
      "fetchAllTournamentDetails or updateFrequentCache is already running. Skipping this run."
    );
    return;
  }
  console.log("Updating frequent cache...");
  isUpdatingFrequentCache = true;

  const temporaryCache = new NodeCache({ stdTTL: 0 }); // Use temporary cache to store updates
  const slugs = dailyCache.keys();
  console.log("Slugs", slugs);
  const currentTime = Date.now(); // Current time in milliseconds

  for (const slug of slugs) {
    await sleep(100); // Adjusted sleep to avoid rate limits
    try {
      const tournament = dailyCache.get(slug);
      if (
        tournament &&
        tournament.startAt &&
        tournament.endAt &&
        tournament.events
      ) {
        const startAtDate = new Date(tournament.startAt * 1000); // Convert to milliseconds
        const endAtDate = new Date(tournament.endAt * 1000); // Convert to milliseconds

        console.log(
          `Tournament: ${slug}, Start At: ${startAtDate}, End At: ${endAtDate}, Current Time: ${new Date(
            currentTime
          )}`
        );

        // Check if the tournament is ongoing
        if (
          startAtDate.getTime() <= currentTime &&
          endAtDate.getTime() >= currentTime
        ) {
          console.log(`Processing ongoing tournament: ${slug}`);

          for (const event of tournament.events) {
            if (!event.phases || event.phases.length === 0) continue; // Skip if no phases

            for (const phase of event.phases) {
              let allSets = [];
              let page = 1;
              let hasMore = true;

              // Fetch all sets for each phase
              while (hasMore) {
                await sleep(100); // Adjusted sleep from 1000 to 100 for consistency
                try {
                  const phaseSetsResponse = await fetchWithRetry(
                    GET_SETS_BY_PHASE_QUERY,
                    { phaseId: phase.id, page, perPage: 100 }
                  );
                  allSets = [...allSets, ...phaseSetsResponse.phase.sets.nodes];
                  hasMore = phaseSetsResponse.phase.sets.nodes.length === 100;
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

              // Initialize the tournament in the temporary cache if not already present
              if (!temporaryCache.has(slug)) {
                temporaryCache.set(slug, { ...tournament, events: [] });
              }

              // Update the phase sets in the tournament
              const updatedTournament = temporaryCache.get(slug);
              if (!updatedTournament) {
                console.error(
                  `Tournament data not found in cache for slug: ${slug}`
                );
                continue; // Skip if not properly initialized
              }

              // Ensure events array exists in updatedTournament
              updatedTournament.events = updatedTournament.events || [];

              const eventIndex = updatedTournament.events.findIndex(
                (e) => e.id === event.id
              );

              if (eventIndex === -1) {
                // Ensure events array exists and add new event with its phase and sets
                updatedTournament.events.push({
                  ...event,
                  phases: [{ ...phase, sets: allSets }],
                });
              } else {
                const eventToUpdate = updatedTournament.events[eventIndex];
                eventToUpdate.phases = eventToUpdate.phases || []; // Ensure phases array exists

                const phaseIndex = eventToUpdate.phases.findIndex(
                  (p) => p.id === phase.id
                );

                if (phaseIndex === -1) {
                  // Add new phase if it does not exist
                  eventToUpdate.phases.push({
                    ...phase,
                    sets: allSets,
                  });
                } else {
                  // Update existing phase with new sets
                  eventToUpdate.phases[phaseIndex] = {
                    ...eventToUpdate.phases[phaseIndex],
                    sets: allSets,
                  };
                }
              }

              // Ensure that `updatedTournament` is updated back in the cache
              temporaryCache.set(slug, updatedTournament);

              // Safely access and log updated sets
              const cachedPhase = updatedTournament.events[
                eventIndex
              ]?.phases?.find((p) => p.id === phase.id);
              if (
                cachedPhase === null ||
                updatedTournament.events[eventIndex] === null
              ) {
                console.log("problem here");
                if (cachedPhase === null) {
                  console.log("cachedPhase Null");
                } else {
                  console.log("updated Tournament event null");
                }
              }
            }
          }
        } else {
          console.log(`Tournament ${slug} is not ongoing.`);
        }
      }
    } catch (error) {
      console.error(
        "Error updating temporary cache for tournament:",
        slug,
        error
      );
    }
  }

  // Update or add new keys from temporaryCache to frequentCache
  const keysToUpdate = temporaryCache.keys();

  keysToUpdate.forEach((key) => {
    const newTournamentData = temporaryCache.get(key);
    if (frequentCache.has(key)) {
      // Merge existing data with updated data, ensuring deep merge for nested structures
      const existingData = frequentCache.get(key);

      // Deep merge to preserve existing nested data and update as needed
      const mergedData = {
        ...existingData,
        ...newTournamentData,
        events: existingData.events.map((existingEvent) => {
          const updatedEvent = newTournamentData.events.find(
            (newEvent) => newEvent.id === existingEvent.id
          );

          if (!updatedEvent) return existingEvent; // Keep existing if no update

          // Merge phases
          return {
            ...existingEvent,
            ...updatedEvent,
            phases: existingEvent.phases.map((existingPhase) => {
              const updatedPhase = updatedEvent.phases.find(
                (newPhase) => newPhase.id === existingPhase.id
              );

              if (!updatedPhase) return existingPhase; // Keep existing phase if no update

              // Merge sets in each phase, updating existing and adding new sets
              const mergedSets = existingPhase.sets.map((existingSet) => {
                const updatedSet = updatedPhase.sets.find(
                  (newSet) => newSet.id === existingSet.id
                );

                // If set exists in both, update it; otherwise, keep existing
                return updatedSet
                  ? { ...existingSet, ...updatedSet }
                  : existingSet;
              });

              // Add any new sets that do not exist in the current phase
              const newSets = updatedPhase.sets.filter(
                (newSet) =>
                  !existingPhase.sets.some(
                    (existingSet) => existingSet.id === newSet.id
                  )
              );

              return {
                ...existingPhase,
                ...updatedPhase,
                sets: [...mergedSets, ...newSets], // Combine updated and new sets
              };
            }),
          };
        }),
      };

      frequentCache.set(key, mergedData);
    } else {
      // Add new key to the cache if it doesn't exist
      frequentCache.set(key, newTournamentData);
    }
  });

  console.log("Frequent cache updated.");
  isUpdatingFrequentCache = false;
}

// async function updateFrequentCache() {
//   if (isFetchingTournaments || isUpdatingFrequentCache) {
//     console.log(
//       "fetchAllTournamentDetails or updateFrequentCache is already running. Skipping this run."
//     );
//     return;
//   }
//   console.log("Updating frequent cache...");
//   isUpdatingFrequentCache = true;

//   const temporaryCache = new NodeCache({ stdTTL: 0 }); // Use temporary cache to store updates
//   const slugs = dailyCache.keys();
//   const currentTime = Date.now(); // Current time in milliseconds

//   for (const slug of slugs) {
//     await sleep(100); // Adjusted sleep to avoid rate limits
//     try {
//       const tournament = dailyCache.get(slug);
//       if (
//         tournament &&
//         tournament.startAt &&
//         tournament.endAt &&
//         tournament.events
//       ) {
//         const startAtDate = new Date(tournament.startAt * 1000); // Convert to milliseconds
//         const endAtDate = new Date(tournament.endAt * 1000); // Convert to milliseconds

//         // Log tournament information for debugging
//         console.log(
//           `Tournament: ${slug}, Start At: ${startAtDate}, End At: ${endAtDate}, Current Time: ${new Date(
//             currentTime
//           )}`
//         );

//         // Check if the tournament is ongoing
//         if (
//           startAtDate.getTime() <= currentTime &&
//           endAtDate.getTime() >= currentTime
//         ) {
//           console.log(`Processing ongoing tournament: ${slug}`);

//           for (const event of tournament.events) {
//             if (event.phases) {
//               for (const phase of event.phases) {
//                 let allSets = [];
//                 let page = 1;
//                 let hasMore = true;

//                 while (hasMore) {
//                   await sleep(100); // Adjusted sleep from 1000 to 100 for consistency
//                   try {
//                     const phaseSetsResponse = await fetchWithRetry(
//                       GET_SETS_BY_PHASE_QUERY,
//                       { phaseId: phase.id, page, perPage: 100 }
//                     );
//                     allSets = [
//                       ...allSets,
//                       ...phaseSetsResponse.phase.sets.nodes,
//                     ];
//                     hasMore = phaseSetsResponse.phase.sets.nodes.length === 100;
//                     page += 1;
//                   } catch (error) {
//                     console.error(
//                       "Error fetching sets for phase:",
//                       phase.id,
//                       error
//                     );
//                     hasMore = false;
//                   }
//                 }

//                 // Store updated sets in the temporary cache
//                 if (!temporaryCache.has(slug)) {
//                   // Initialize the tournament in the temporary cache if not already present
//                   temporaryCache.set(slug, { ...tournament });
//                 }

//                 // Update the phase sets in the tournament
//                 const updatedTournament = temporaryCache.get(slug);
//                 const phaseIndex = updatedTournament.events
//                   .find((e) => e.id === event.id)
//                   .phases.findIndex((p) => p.id === phase.id);
//                 updatedTournament.events
//                   .find((e) => e.id === event.id)
//                   .phases.splice(phaseIndex, 1, { ...phase, sets: allSets });

//                 temporaryCache.set(slug, updatedTournament);

//                 // Debug logging
//                 console.log(`Caching sets for phaseId: ${phase.id}`);
//               }
//             }
//           }
//         } else {
//           console.log(`Tournament ${slug} is not ongoing.`);
//         }
//       }
//     } catch (error) {
//       console.error(
//         "Error updating temporary cache for tournament:",
//         slug,
//         error
//       );
//     }
//   }

//   // Update or add new keys from temporaryCache to frequentCache
//   const keysToUpdate = temporaryCache.keys();

//   keysToUpdate.forEach((key) => {
//     const newTournamentData = temporaryCache.get(key);
//     if (frequentCache.has(key)) {
//       // Merge existing data with updated data
//       const existingData = frequentCache.get(key);
//       const mergedData = { ...existingData, ...newTournamentData };
//       frequentCache.set(key, mergedData);
//     } else {
//       // Add new key to the cache
//       frequentCache.set(key, newTournamentData);
//     }
//   });

//   console.log("Frequent cache updated.");
//   isUpdatingFrequentCache = false;
// }

// Schedule tasks to update caches
cron.schedule("0 */10 * * * *", updateFrequentCache); // Update frequent cache every 20 minutes
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
