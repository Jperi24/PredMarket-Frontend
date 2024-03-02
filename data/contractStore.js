export const addContract = async (
  address,
  endTime,
  odds1,
  odds2,
  buyIn,
  tags,
  NameofMaket,
  ConditionOfMarket,
  deployerAddress
) => {
  try {
    const response = await fetch("http://localhost:3001/addContract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        endTime,
        odds1,
        odds2,
        buyIn,
        tags,
        NameofMaket,
        ConditionOfMarket,
        deployerAddress,
        betters: [],
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    console.log("Contract added successfully to MongoDB");
  } catch (error) {
    console.error("Error adding contract to MongoDB:", error);
  }
};

export const getContracts = async () => {
  try {
    const response = await fetch("http://localhost:3001/getContracts");

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const contracts = await response.json();
    return contracts;
  } catch (error) {
    console.error("Error fetching contracts from MongoDB:", error);
    return []; // Return an empty array as a fallback
  }
};

export const getContracts2 = async () => {
  try {
    const response = await fetch("http://localhost:3001/getContracts2");

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const contracts = await response.json();
    return contracts;
  } catch (error) {
    console.error("Error fetching contracts from MongoDB:", error);
    return []; // Return an empty array as a fallback
  }
};

// export const getContractDetails = (contractAddress) => {
//   // Find the contract with the given address
//   const contract = contracts.find(
//     (contract) => contract.address === contractAddress
//   );

//   // Return the contract if found, otherwise return null or an appropriate default object
//   return contract || null;
// };
