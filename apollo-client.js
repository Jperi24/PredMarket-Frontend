const { ApolloClient, InMemoryCache, HttpLink } = require("@apollo/client");
require("dotenv").config();

// const httpLink = new HttpLink({
//   uri: "https://api.start.gg/gql/alpha",

//   headers: {
//     Authorization: "Bearer 89bd2ac116d83adddc3ef72473558b20", // Replace with your token
//   },
// });

const httpLink = new HttpLink({
  uri: "https://api.start.gg/gql/alpha", // GraphQL endpoint
  headers: {
    Authorization: `Bearer ${process.env.START_GG_API_TOKEN}`, // Use environment variable here
  },
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

module.exports = client;
