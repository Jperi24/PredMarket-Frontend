let contracts = [
  {
    address: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    endTime: "1703354367",
    odds1: "2",
    odds2: "1",
    tags: ["Jmook", "Moky", "Melee", "TBH11"],
    NameofMaket: "Jmook beats Moky TBH11",
    ConditionOfMarket: "Jmook Wins",
    voteTime: "",
  },
  {
    address: "0x0Cd1Bf9A1b36cE34237eEaFef220932846BCD82",
    endTime: "1703120497",
    odds1: "2",
    odds2: "1",
    tags: ["Jmook", "Moky", "Melee", "TBH11", "black"],
    NameofMaket: "Jmook beats Moky TBH11",
    ConditionOfMarket: "Jmook Wins",
  },
];

export const addContract = async (
  address,
  endTime,
  odds1,
  odds2,
  tags,
  NameofMaket,
  ConditionOfMarket
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
        tags,
        NameofMaket,
        ConditionOfMarket,
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

export const getContractDetails = (contractAddress) => {
  // Find the contract with the given address
  const contract = contracts.find(
    (contract) => contract.address === contractAddress
  );

  // Return the contract if found, otherwise return null or an appropriate default object
  return contract || null;
};
