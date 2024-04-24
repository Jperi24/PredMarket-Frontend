import React from "react";
import Select from "react-select";

const VideoGameSelector = ({ onFilterSelect }) => {
  const options = [
    { value: "allBets", label: "All Bets" },
    { value: "Brawlhalla", label: "Brawlhalla" },
    { value: "Counter Strike: Global Offensive", label: "CS:GO" },
    { value: "Counter-Strike 2", label: "Counter-Strike 2" },
    { value: "Fortnite", label: "Fortnite" },
    { value: "Guilty Gear: Strive", label: "Guilty Gear: Strive" },
    { value: "League of Legends", label: "LOL" },
    { value: "Mortal Kombat 1", label: "Mortal Kombat 1" },
    { value: "Overwatch 2", label: "Overwatch 2" },
    { value: "Pokémon Unite", label: "Pokémon Unite" },
    { value: "Rocket League", label: "Rocket League" },
    { value: "Super Smash Bros. Melee", label: "SSB Melee" },
    { value: "Super Smash Bros. Ultimate", label: "SSB Ultimate" },
    { value: "Street Fighter 6", label: "Street Fighter 6" },
    { value: "TEKKEN 8", label: "TEKKEN 8" },
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
