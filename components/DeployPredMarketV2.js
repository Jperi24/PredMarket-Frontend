import { ethers } from "ethers";
import predMarketArtifact from "../predMarketV2.json"; // path to the ABI and Bytecode

export async function deployPredMarket(
  eventA,
  eventB,
  tags,
  NameofMarket,
  signer,
  fullName,
  endsAt
) {
  // Check if the signer is available
  if (!signer) {
    alert("Please Connect Wallet");
    return;
  }

  const deployerAddress = await signer.getAddress();
  const chain = signer?.provider?.network || "";

  console.log(
    endsAt,
    "is the end Time that was passed into the smart contract"
  );

  // Create the ContractFactory after checking for signer
  const PredMarket = new ethers.ContractFactory(
    predMarketArtifact.abi,
    predMarketArtifact.bytecode,
    signer
  );

  try {
    // Deploy the contract
    const predMarket = await PredMarket.deploy(endsAt);
    await predMarket.deployed(); // Waits for the contract to be mined

    const contractAddress = predMarket.address;

    // Add the contract to MongoDB
    try {
      const url = "http://localhost:3001/addContract";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: contractAddress,
          NameofMarket,
          eventA,
          eventB,
          tags,
          deployerAddress,
          fullName,
          endsAt,
          chain,
        }),
      });

      // Check if the request was successful
      if (response.ok) {
        console.log("Contract added successfully to MongoDB");
      } else {
        // If the server responded with an error, log or handle it
        const errorResponse = await response.json();
        console.error("Error from the server:", errorResponse);
      }
    } catch (error) {
      console.error("Error adding contract to MongoDB:", error);
    }

    // **Update the user as a deployer**
    try {
      const updateUrl = "http://localhost:3001/api/updateUserContract";
      const updateResponse = await fetch(updateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress,
          userId: deployerAddress,
          role: "deployer",
        }),
      });

      if (updateResponse.ok) {
        console.log("User updated successfully as deployer in MongoDB");
      } else {
        const errorResponse = await updateResponse.json();
        console.error("Error updating user as deployer:", errorResponse);
      }
    } catch (error) {
      console.error("Error updating user in MongoDB:", error);
    }

    console.log("Contract deployed to:", contractAddress);
    console.log("Contract deployed with:", tags, "tags");
    console.log("Address of deployer:", deployerAddress);
  } catch (error) {
    console.error("Error deploying contract:", error);
    alert(error.data?.message || error.message);
  }
}
