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
  const [loadingProgress, setLoadingProgress] = useState(0);
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
          variables: { eventId: meleeID, page: 1, perPage: 100 },
        });
        setEventData(data);
        fetchSetsDetails(
          data.event.sets.nodes.map((set) => set.id),
          data
        );
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

  const fetchSetsDetails = async (setIds, eventData) => {
    const BATCH_SIZE = 3;
    const DELAY_MS = 750;
    const totalBatches = Math.ceil(setIds.length / BATCH_SIZE);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      let setsData = [];
      for (let i = 0; i < setIds.length; i += BATCH_SIZE) {
        const batch = setIds.slice(i, i + BATCH_SIZE);
        const batchData = await Promise.all(
          batch.map(async (setId) => {
            const { data } = await client.query({
              query: GET_SET_QUERY,
              variables: { setId },
            });
            const setDetail = data.set;
            const enhancedSlots = setDetail.slots.map((slot) => {
              if (!eventData || !eventData.event) {
                console.error("eventData or eventData.event is null");
                return slot;
              }

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

        setsData = [...setsData, ...batchData];
        setLoadingProgress(
          (((i / setIds.length) * BATCH_SIZE + 1) * 100) / totalBatches
        );
        if (i + BATCH_SIZE < setIds.length) {
          await delay(DELAY_MS);
        }
      }

      console.log("Fetched and Enhanced Sets Details:", setsData);
      setSetsDetails(setsData);
      setFilteredSets(setsData);
      setLoadingProgress(100); // Ensure progress is complete
    } catch (error) {
      console.error("Error fetching and enhancing set details:", error);
    }
  };

  if (loading || loadingProgress < 100) {
    return (
      <div>
        <p>Loading...</p>
        {/* Progress bar */}
        <div style={{ width: "100%", backgroundColor: "#eee" }}>
          <div
            style={{
              height: "24px",
              width: `${loadingProgress}%`,
              backgroundColor: "blue",
            }}
          ></div>
        </div>
      </div>
    );
  }

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
                Entrants and Placement:{" "}
                {set.slots.map((slot, slotIndex) => (
                  <React.Fragment key={slotIndex}>
                    {slotIndex > 0 ? " vs " : ""}
                    {slot.entrant ? `${slot.entrant.name}` : "Unknown"}
                    {slot.standing
                      ? ` - Placement: ${slot.standing.placement}`
                      : ""}
                  </React.Fragment>
                ))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TournamentInfo;
