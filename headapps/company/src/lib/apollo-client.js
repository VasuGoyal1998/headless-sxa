import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// Replace this with your Sitecore XM Cloud GraphQL endpoint
const SITECORE_GRAPHQL_API = process.env.GRAPH_QL_ENDPOINT;

const createApolloClient = () => {
  return new ApolloClient({
    link: new HttpLink({ uri: SITECORE_GRAPHQL_API }),
    fetchOptions: {
      method: 'GET', // Ensure it's using POST
    },
    cache: new InMemoryCache(),
  });
};

export default createApolloClient;
