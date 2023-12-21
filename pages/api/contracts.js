// This is a simple example. In a real app, you'd fetch this data from a database or other data store.
import { getContracts } from "../../data/contractStore";

export default function handler(req, res) {
  const contracts = getContracts();
  console.log(contracts);
  res.status(200).json(contracts);
}
