import React from "react";
import Select from "react-select";

const VideoGameSelector = ({ onFilterSelect }) => {
  const options = [
    { value: "allBets", label: "All Bets" },
    { value: "userBets", label: "Bets I Bet On" },
    { value: "ownerDeployed", label: "Bets I Deployed" },
    { value: "SSBMelee", label: "SSB Melee" },
    { value: "SSBUltimate", label: "SSB Ultimate" },
    { value: "LeagueOfLegends", label: "LOL" },
    { value: "CSGO", label: "CS:GO" },
    { value: "Fortnite", label: "Fortnite" },
  ];

  const handleMenuOpen = () => {
    window.scrollTo({ top: document.body.scrollTop, behavior: "auto" });
  };

  const handleChange = (selectedOption) => {
    if (selectedOption) {
      // Checking if the selection is not null
      onFilterSelect(selectedOption.value);
    } else {
      onFilterSelect(null); // Handling clear action
    }
  };

  return (
    <Select
      options={options}
      onChange={handleChange}
      onMenuOpen={handleMenuOpen}
      className="basic-single"
      classNamePrefix="select"
      isClearable={true}
      isSearchable={true}
      placeholder="Select a filter..."
    />
  );
};

export default VideoGameSelector;
