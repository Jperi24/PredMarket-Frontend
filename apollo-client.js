import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
require("dotenv").config();

const httpLink = new HttpLink({
  uri: "https://api.start.gg/gql/alpha",

  headers: {
    Authorization: "Bearer 89bd2ac116d83adddc3ef72473558b20", // Replace with your token
  },
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

export default client;
