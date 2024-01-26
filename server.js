const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

//when deployed make sure Cors or something is only coming from a specific server

const uri =
  "mongodb+srv://Jake:Koolaid20@cluster0.lwaxzbm.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

let db;

client
  .connect()
  .then(() => {
    db = client.db("PredMarket");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });

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
    const collection = db.collection("Contracts");

    // Find the contract with the given address
    const contract = await collection.findOne({ address: address });

    if (contract) {
      res.status(200).json(contract);
    } else {
      res.status(404).send("Contract not found");
    }
  } catch (error) {
    console.error("Error fetching contract from MongoDB:", error);
    res.status(500).send("Error fetching contract");
  }
});

const PORT = process.env.PORT || 3001;

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
