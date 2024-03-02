// currencyConversionUtils.js
import { ethers } from "ethers";

// Placeholder for a function to fetch the current ETH to USD exchange rate
export async function fetchEthToUsdRate() {
  // Here, you'd make an API call to a service like CoinGecko, CryptoCompare, etc.
  // This is a simplified example. Replace the URL with the actual endpoint you're using.
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
  );
  const data = await response.json();

  // Assuming the API returns a JSON object where 'ethereum' is a key and 'usd' is a subkey
  const rate = data.ethereum.usd;

  return rate; // This would be the ETH to USD exchange rate
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
