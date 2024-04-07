import React, { useState, useEffect } from "react";
import { useQuery, useApolloClient } from "@apollo/client";
import {
  GET_TOURNAMENT_QUERY,
  GET_EVENT_QUERY,
  GET_SET_QUERY,
} from "../queries";

const TournamentInfo = ({ slug }) => {
  const { loading, error, data } = useQuery(GET_TOURNAMENT_QUERY, {
    variables: { slug },
  });
  const [eventData, setEventData] = useState(null);
  const [setsDetails, setSetsDetails] = useState([]);
  const [filteredSets, setFilteredSets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const client = useApolloClient();

  useEffect(() => {
    if (loading || !data) return;

    const meleeSinglesEvent = data.tournament.events.find(
      (event) => event.name === "Melee Singles"
    );
    const meleeID = meleeSinglesEvent ? meleeSinglesEvent.id : null;

    if (!meleeID) return;

    const fetchEventData = async () => {
      try {
        const { data } = await client.query({
          query: GET_EVENT_QUERY,
          variables: { eventId: meleeID, page: 1, perPage: 100 }, // Adjust perPage as needed
        });
        setEventData(data);
        fetchSetsDetails(data.event.sets.nodes.map((set) => set.id));
      } catch (error) {
        console.error("Failed to fetch event data:", error);
      }
    };

    fetchEventData();
  }, [client, loading, data]);

  useEffect(() => {
    const filterSets = searchTerm
      ? setsDetails.filter((set) =>
          set.slots.some((slot) =>
            slot.entrant?.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
        )
      : setsDetails;
    setFilteredSets(filterSets);
  }, [searchTerm, setsDetails]);

  // Simplified for clarity. Ensure this matches your actual data structure.
  const fetchSetsDetails = async (setIds) => {
    try {
      const setsData = await Promise.all(
        setIds.map(async (setId) => {
          const { data } = await client.query({
            query: GET_SET_QUERY,
            variables: { setId },
          });
          const setDetail = data.set;

          // Enhance slots with entrant names from eventData
          const enhancedSlots = setDetail.slots.map((slot) => {
            // Find this slot in the eventData to get the entrant name
            const entrantDetail = eventData.event.sets.nodes
              .find((node) => node.slots.some((s) => s.id === slot.id))
              ?.slots.find((s) => s.id === slot.id);

            return {
              ...slot,
              entrant: entrantDetail ? entrantDetail.entrant : null,
            };
          });

          return {
            ...setDetail,
            slots: enhancedSlots,
          };
        })
      );

      console.log("Fetched and Enhanced Sets Details:", setsData);
      setSetsDetails(setsData);
      setFilteredSets(setsData); // Update to ensure filtering reflects new data
    } catch (error) {
      console.error("Error fetching and enhancing set details:", error);
    }
  };

  if (loading || !setsDetails.length) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <h2>Tournament: {data?.tournament?.name}</h2>
      <input
        type="text"
        placeholder="Search by entrant name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="search-input"
      />
      {eventData && (
        <div className="sets-grid">
          {filteredSets.map((set, index) => (
            <div key={set.id} className="set-box">
              <h4>Set {index + 1}</h4>
              <p>
                Entrants:{" "}
                {set.slots.map((slot, slotIndex) => (
                  <React.Fragment key={slotIndex}>
                    {slotIndex > 0 ? " vs " : ""}
                    {slot.entrant ? slot.entrant.name : "Unknown"}
                  </React.Fragment>
                ))}
              </p>
              <div className="entrant-details">
                {set.slots.map((slot, index) => (
                  <div key={index}>
                    <p>
                      Entrant: {slot.entrant ? slot.entrant.name : "Loading..."}
                    </p>
                    <p>
                      Placement:{" "}
                      {slot.standing ? slot.standing.placement : "Loading..."}
                    </p>
                    <p>
                      Score:{" "}
                      {slot.standing &&
                      slot.standing.stats &&
                      slot.standing.stats.score
                        ? slot.standing.stats.score.value
                        : "Loading..."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentInfo;
