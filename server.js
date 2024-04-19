const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { MongoClient } = require("mongodb");
const cron = require("node-cron"); // Import node-cron
const NodeCache = require("node-cache");
const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

//when deployed make sure Cors or something is only coming from a specific server

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
async function updateRate() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    if (!response.ok) {
      console.error(
        `Failed to fetch from CoinGecko: ${response.status} ${response.statusText}`
      );
      return;
    }
    const data = await response.json();
    const rate = data.ethereum.usd;
    rateCache.set(RATE_KEY, rate);
    console.log(`Updated rate to ${rate}`);
  } catch (error) {
    console.error("Error updating rate:", error);
  }
}

// Initial fetch and setup periodic update
updateRate();
setInterval(updateRate, FETCH_INTERVAL);

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
