let contracts = [
  {
    address: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    endTime: "1703120497",
    odds1: "2",
    odds2: "1",
    tags: ["Jmook", "Moky", "Melee", "TBH11"],
    NameofMaket: "Jmook beats Moky TBH11",
    ConditionOfMarket: "Jmook Wins",
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

export const addContract = (
  address,
  endTime,
  tags,
  NameofMaket,
  ConditionOfMarket
) => {
  contracts.push({ address, endTime, tags, NameofMaket, ConditionOfMarket });
  console.log(
    "I have added this to contracts array, contracts array now reads",
    contracts
  );
};

export const getContracts = () => {
  return contracts;
};

export const getContractDetails = (contractAddress) => {
  // Find the contract with the given address
  const contract = contracts.find(
    (contract) => contract.address === contractAddress
  );

  // Return the contract if found, otherwise return null or an appropriate default object
  return contract || null;
};
