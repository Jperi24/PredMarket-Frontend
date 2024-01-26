// pages/api/contracts.js
import { getContracts } from "../../data/contractStore";

export default function handler(req, res) {
  const { tag } = req.query;
  let contracts = getContracts();

  if (tag) {
    contracts = contracts.filter((contract) => contract.tags.includes(tag));
  }

  res.status(200).json(contracts);
}
