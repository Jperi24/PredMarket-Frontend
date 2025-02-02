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
  // const localNetworkURL = "http://localhost:8545";
  // await window.ethereum.request({ method: "eth_requestAccounts" });
  // const provider = new ethers.providers.Web3Provider(window.ethereum);
  // const signer = provider.getSigner();

  const PredMarket = new ethers.ContractFactory(
    predMarketArtifact.abi,
    predMarketArtifact.bytecode,
    signer
  );
  if (!signer) {
    alert("Please Connect Wallet");
  }
  const deployerAddress = await signer.getAddress();
  console.log(
    endsAt,
    "is the end Time that was passed into the smart contract"
  );
  const chain = signer?.provider?.network || "";

  try {
    const predMarket = await PredMarket.deploy(endsAt);
    await predMarket.deployed(); // Waits for the contract to be mined

    try {
      const url = "http://localhost:3001/addContract";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: predMarket.address,
          NameofMarket,
          eventA,
          eventB,
          tags,
          deployerAddress: deployerAddress,
          fullName,
          endsAt,
          chain,

          // Assuming you want to log the deployed contract's address
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
    console.log("Contract deployed to:", predMarket.address);
    console.log("Contract deployed with: ", tags, "  tags");
    console.log("Address of deployer:", await signer.getAddress());
  } catch (error) {
    alert(error.data.message);
  }
}
