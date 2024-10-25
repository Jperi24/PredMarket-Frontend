const { ApolloClient, InMemoryCache, HttpLink } = require("@apollo/client");
const { RetryLink } = require("@apollo/client/link/retry");
require("dotenv").config();

const httpLink = new HttpLink({
  uri: "https://api.start.gg/gql/alpha", // GraphQL endpoint
  headers: {
    Authorization: `Bearer ${process.env.START_GG_API_TOKEN}`, // Use environment variable here
  },
});

const retryLink = new RetryLink({
  attempts: (count, operation, error) => {
    return (
      !!error &&
      error.networkError &&
      error.networkError.statusCode === 503 &&
      count < 3
    ); // Retry up to 3 times for 503 errors
  },
  delay: {
    initial: 1000, // Initial delay of 1 second
    max: 10000, // Maximum delay of 10 seconds
    jitter: true, // Add some randomness to the retry delay
  },
});

const client = new ApolloClient({
  link: retryLink.concat(httpLink), // Combining RetryLink and HttpLink
  cache: new InMemoryCache(),
});

module.exports = client;
