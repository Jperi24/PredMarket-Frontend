// currencyConversionUtils.js
import { ethers } from "ethers";

// Placeholder for a function to fetch the current ETH to USD exchange rate
export async function fetchEthToUsdRate() {
  try {
    const response = await fetch("http://localhost:3001/ethToUsdRate");
    if (!response.ok) {
      throw new Error(
        `Failed to fetch from local server: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    // Correctly check for data.rate existence and type
    if (typeof data.rate !== "number") {
      throw new Error("Invalid or missing rate in the response");
    }
    const rate = data.rate; // Use the directly provided rate

    return rate;
  } catch (error) {
    console.error(`fetchEthToUsdRate error: ${error.message}`);
    throw error; // Re-throwing to allow for external handling
  }
}

// Function to convert USD to wei
export async function convertUsdToWei(usdAmount) {
  const ethToUsdRate = await fetchEthToUsdRate();
  const ethAmount = usdAmount / ethToUsdRate;

  // Convert to a string, limiting to 18 decimal places to avoid precision errors.
  // Note: Adjust rounding/truncation method as needed.
  const ethAmountStr = ethAmount.toFixed(18);

  // Use parseEther to convert the truncated/rounded ETH amount to wei.
  // parseEther safely handles up to 18 decimal places, aligning with ETH's precision.
  const weiAmount = ethers.utils.parseEther(ethAmountStr);

  return weiAmount.toString(); // Return the wei amount as a string.
}

export async function convertWeiToUsd(weiAmount) {
  const ethToUsdRate = await fetchEthToUsdRate();
  // Convert the wei amount to ETH since the rate is in ETH to USD
  const ethAmount = ethers.utils.formatEther(weiAmount);
  // Calculate the USD value
  const usdValue = parseFloat(ethAmount) * ethToUsdRate;
  return usdValue; // This will be the amount in USD
}
