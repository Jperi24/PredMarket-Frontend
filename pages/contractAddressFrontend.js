return (
  <div className="betting-app">
    <Header />
    {!signerAddress ? (
      <div className="wallet-connect-modal">
        <h2>Welcome to the Betting Arena</h2>
        <p>Connect your wallet to join the action and place your bets.</p>
        <ConnectWallet className="connect-wallet-btn" />
      </div>
    ) : netWorkMismatch ? (
      <div className="network-switch-modal">
        <h2>Oops! Wrong Network</h2>
        <p>This market is on {contract?.chain?.name}. Let's switch!</p>
        <button
          onClick={() => switchNetwork(contract.chain.chainId)}
          className="switch-network-btn"
        >
          Switch to {contract?.chain?.name}
        </button>
      </div>
    ) : (
      <div className="betting-arena">
        <div className="main-content">
          <div className="market-info-column">
            <div className="market-info">
              <h1>{contract.NameofMarket}</h1>
              <h2>{contract.fullName}</h2>
              <div className="event-matchup">
                <span className="event-a">{contract.eventA}</span>
                <span className="vs">VS</span>
                <span className="event-b">{contract.eventB}</span>
              </div>
              {bets_balance.state === 0 ? (
                <div className="potential-winnings">
                  <h3>Total Potential Winnings</h3>
                  <p>
                    {totalWinnings} {chain?.nativeCurrency?.symbol}
                  </p>
                </div>
              ) : (
                <div className="winner-announcement">
                  <h3>Winner</h3>
                  <p>
                    {bets_balance.winner.toString() === "1"
                      ? contract.eventA
                      : bets_balance.winner.toString() === "2"
                      ? contract.eventB
                      : "Draw/Cancel - All Bets Refunded"}
                  </p>
                </div>
              )}
            </div>
            {contract &&
              contractInstance &&
              isAuthorizedUserStaff &&
              bets_balance.state < 4 && (
                <div className="admin-controls">
                  <h3>Admin Controls</h3>
                  <select
                    id="outcomeSelect"
                    className="dropdown"
                    value={winnerOfSet}
                    onChange={(e) => setWinnerOfSet(e.target.value)}
                  >
                    <option value="0">Set Winner...</option>
                    <option value="1">Winner: {contract.eventA}</option>
                    <option value="2">Winner: {contract.eventB}</option>
                    <option value="3">Cancel & Refund</option>
                  </select>
                  <button className="end-bet-btn" onClick={handleEndBet}>
                    Finalize Bet
                  </button>
                </div>
              )}
          </div>

          <div className="betting-interface-column">
            <div className="betting-actions">
              {bets_balance.state === 0 && (
                <div className="countdown-container">
                  <h3>Time left to bet</h3>
                  <CountdownTimer
                    endTime={contract.endsAt}
                    className="countdown-timer"
                  />
                </div>
              )}
              <div className="create-bet-container">
                {isBettingOpen ? (
                  <>
                    <button
                      className="toggle-inputs-btn"
                      onClick={() => setShowInputs(!showInputs)}
                    >
                      {showInputs ? "Hide Bet Form" : "Place a New Bet"}
                    </button>
                    {showInputs && (
                      <div className="bet-form">
                        <input
                          className="input-field"
                          value={myLocked}
                          onChange={(e) => setmyLocked(e.target.value)}
                          placeholder={`Your Bet (${chain?.nativeCurrency?.symbol})`}
                          maxLength={20}
                        />
                        <input
                          className="input-field"
                          value={buyInIChoose}
                          onChange={(e) => setbuyInIChoose(e.target.value)}
                          placeholder={`Opponent's Bet (${chain?.nativeCurrency?.symbol})`}
                          maxLength={20}
                        />
                        <select
                          className="dropdown"
                          value={selectedOutcome}
                          onChange={(e) => setSelectedOutcome(e.target.value)}
                        >
                          <option value="" disabled>
                            Choose your winner...
                          </option>
                          <option value="1">{contract.eventA}</option>
                          <option value="2">{contract.eventB}</option>
                        </select>
                        <button
                          className="submit-bet-btn"
                          onClick={() =>
                            sellANewBet(myLocked, buyInIChoose, selectedOutcome)
                          }
                        >
                          Place Bet
                        </button>
                      </div>
                    )}
                  </>
                ) : isVotingTime ? (
                  <div className="disagreement-form">
                    <h3>Betting is Closed</h3>
                    <p>
                      If you believe there's a mistake, you can file a
                      disagreement.
                    </p>
                    <input
                      className="input-field"
                      value={disagreeText}
                      onChange={(e) => setDisagreeText(e.target.value)}
                      placeholder="Reason for disagreement"
                      maxLength={1000}
                    />
                    <p>Time left to disagree:</p>
                    <CountdownTimer
                      endTime={contract.voteTime}
                      className="countdown-timer"
                    />
                    <button
                      className="disagree-btn"
                      onClick={() => voteDisagree(disagreeText)}
                    >
                      File Disagreement
                    </button>
                  </div>
                ) : isDisagreementState ? (
                  <div className="disagreement-notice">
                    <h3>Disagreement Filed</h3>
                    <p>A user has disagreed with the bet outcome:</p>
                    <blockquote>{contract.disagreementText}</blockquote>
                    <p>
                      Our team is reviewing the issue and will resolve it
                      promptly.
                    </p>
                  </div>
                ) : (
                  <div className="withdrawal-section">
                    <h3>Betting Concluded</h3>
                    <p>Your balance available for withdrawal:</p>
                    <h2>
                      {bets_balance.winnings} {chain?.nativeCurrency?.symbol}
                    </h2>
                    <button
                      className="withdraw-btn"
                      onClick={() => withdrawBet()}
                    >
                      Withdraw Winnings
                    </button>
                    {contract && contractInstance && (
                      <>
                        {isAuthorizedUserOwner ? (
                          <button
                            className="admin-btn"
                            onClick={() => ownerWithdraw()}
                          >
                            Owner: Withdraw Commission & Locked Amounts
                          </button>
                        ) : isAuthorizedUserStaff ? (
                          <button
                            className="admin-btn"
                            onClick={() => transferStaffAmount()}
                          >
                            Staff: Process Withdrawal
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bets-list-column">
          <div className="bet-filters">
            <button
              onClick={() => setFilter("all")}
              className={filter === "all" ? "active" : ""}
            >
              All Bets
            </button>
            <button
              onClick={() => setFilter("forSale")}
              className={filter === "forSale" ? "active" : ""}
            >
              Bets For Sale
            </button>
            <button
              onClick={() => setFilter("deployedByMe")}
              className={filter === "deployedByMe" ? "active" : ""}
            >
              My Deployed Bets
            </button>
            <button
              onClick={() => setFilter("ownedByMe")}
              className={filter === "ownedByMe" ? "active" : ""}
            >
              Bets I Own
            </button>
          </div>
          <div className="bets-list">
            {selectedBets.length > 0 && (
              <button
                className="unlist-selected-btn"
                onClick={() => unlistBet(selectedBets)}
              >
                Unlist Selected Bets
              </button>
            )}
            {bets_balance.allbets && Array.isArray(bets_balance.allbets) ? (
              bets_balance.allbets.length > 0 ? (
                bets_balance.allbets
                  .filter((bet) => {
                    switch (filter) {
                      case "forSale":
                        return bet.selling;
                      case "deployedByMe":
                        return bet.deployer === signerAddress;
                      case "ownedByMe":
                        return bet.owner === signerAddress;
                      case "all":
                      default:
                        return true;
                    }
                  })
                  .map((bet, index) => (
                    <div key={index} className="bet-card">
                      <h3>Bet #{index + 1}</h3>
                      <div className="bet-details">
                        <p>
                          Potential Win:{" "}
                          {ethers.utils.formatEther(
                            ethers.BigNumber.from(bet.amountDeployerLocked).add(
                              ethers.BigNumber.from(
                                bet.amountBuyerLocked > 0
                                  ? bet.amountBuyerLocked
                                  : bet.amountToBuyFor
                              )
                            )
                          )}{" "}
                          {chain?.nativeCurrency?.symbol}
                        </p>
                        {bet.selling && (
                          <p>
                            Purchase Cost:{" "}
                            {ethers.utils.formatEther(bet.amountToBuyFor)}{" "}
                            {chain?.nativeCurrency?.symbol}
                          </p>
                        )}
                        <p>
                          Winning Condition:{" "}
                          {bet.conditionForBuyerToWin === 1
                            ? contract.eventA
                            : contract.eventB}{" "}
                          Wins
                        </p>
                      </div>
                      {bet.selling ? (
                        bet.owner === signerAddress ? (
                          <div className="bet-actions">
                            <label>
                              <input
                                type="checkbox"
                                value={bet.positionInArray}
                                onChange={(e) =>
                                  handleSelectBet(e.target.value)
                                }
                              />
                              Select to Unlist
                            </label>
                          </div>
                        ) : (
                          <button
                            className="buy-bet-btn"
                            onClick={() =>
                              buyBet(bet.positionInArray, bet.amountToBuyFor)
                            }
                          >
                            Buy This Bet
                          </button>
                        )
                      ) : !bet.selling &&
                        bet.owner === signerAddress &&
                        bet.deployer !== signerAddress ? (
                        <div className="relist-bet">
                          <input
                            className="relist-price-input"
                            value={betPrices[index] || ""}
                            onChange={(e) =>
                              handleChangePrice(e.target.value, index)
                            }
                            placeholder={`Resell Price (${chain?.nativeCurrency?.symbol})`}
                            maxLength={100}
                          />
                          <button
                            className="relist-btn"
                            onClick={() =>
                              listBetForSale(
                                bet.positionInArray,
                                betPrices[index] || ""
                              )
                            }
                          >
                            Relist Bet
                          </button>
                        </div>
                      ) : null}
                      {bet.deployer === signerAddress &&
                        bet.owner === signerAddress && (
                          <div className="edit-bet-section">
                            <h4>Edit Your Deployed Bet</h4>
                            <div className="current-values">
                              <p>
                                Current Deployed:{" "}
                                {ethers.utils.formatEther(
                                  bet.amountDeployerLocked
                                )}{" "}
                                {chain?.nativeCurrency?.symbol}
                              </p>
                              <p>
                                Current Ask:{" "}
                                {ethers.utils.formatEther(bet.amountToBuyFor)}{" "}
                                {chain?.nativeCurrency?.symbol}
                              </p>
                            </div>
                            <div className="edit-inputs">
                              <input
                                className="edit-input"
                                value={
                                  newDeployedPrices[bet.positionInArray] || ""
                                }
                                onChange={(e) =>
                                  setNewDeployedPrices({
                                    ...newDeployedPrices,
                                    [bet.positionInArray]: e.target.value,
                                  })
                                }
                                placeholder={`New Deployed (${chain?.nativeCurrency?.symbol})`}
                              />
                              <input
                                className="edit-input"
                                value={
                                  newAskingPrices[bet.positionInArray] || ""
                                }
                                onChange={(e) =>
                                  setNewAskingPrices({
                                    ...newAskingPrices,
                                    [bet.positionInArray]: e.target.value,
                                  })
                                }
                                placeholder={`New Ask (${chain?.nativeCurrency?.symbol})`}
                                maxLength={100}
                              />
                            </div>
                            <button
                              className="save-changes-btn"
                              onClick={() =>
                                editADeployedBet(
                                  bet.positionInArray,
                                  newDeployedPrices[bet.positionInArray] ||
                                    bet.amountDeployerLocked,
                                  newAskingPrices[bet.positionInArray] ||
                                    ethers.utils.formatEther(bet.amountToBuyFor)
                                )
                              }
                            >
                              Save Changes
                            </button>
                          </div>
                        )}
                    </div>
                  ))
              ) : (
                <div className="no-bets-message">No Bets Available</div>
              )
            ) : (
              <div className="no-bets-message">No Bets Available</div>
            )}
          </div>
        </div>
      </div>
    )}
    <Modal
      show={showModal}
      handleClose={handleClose}
      handleConfirm={handleConfirm}
      content={modalContent}
    />
    <style jsx>{`
      .betting-app {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: #f8f9fa;
        color: #343a40;
        font-family: "Poppins", sans-serif;
      }

      .betting-arena {
        display: flex;
        flex-direction: column;
        padding: 2rem;
        gap: 2rem;
      }

      .main-content {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 2rem;
      }

      .market-info-column,
      .betting-interface-column {
        flex: 1;
        min-width: 300px;
        background: #ffffff;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }

      .bets-list-column {
        width: 100%;
        background: #ffffff;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }

      h1,
      h2,
      h3 {
        color: #2c3e50;
        margin-bottom: 1rem;
      }

      h1 {
        font-size: 2.5rem;
        font-weight: 700;
      }

      h2 {
        font-size: 1.8rem;
        font-weight: 600;
      }

      h3 {
        font-size: 1.4rem;
        font-weight: 600;
      }

      .event-matchup {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin: 1.5rem 0;
        font-size: 1.6rem;
      }

      .event-a,
      .event-b {
        padding: 0.5rem 1rem;
        background: #e9ecef;
        border-radius: 8px;
        color: #2c3e50;
        font-weight: 600;
      }

      .vs {
        color: #6c757d;
        font-weight: 700;
      }

      .countdown-timer {
        font-size: 1.8rem;
        color: #3498db;
        background: #e3f2fd;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        display: inline-block;
        font-weight: 600;
      }

      .bet-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .input-field,
      .dropdown {
        padding: 0.75rem;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: #fff;
        color: #495057;
        font-size: 1rem;
        transition: border-color 0.3s ease;
      }

      .input-field:focus,
      .dropdown:focus {
        outline: none;
        border-color: #3498db;
      }

      .submit-bet-btn,
      .buy-bet-btn,
      .relist-btn,
      .withdraw-btn,
      .disagree-btn,
      .end-bet-btn {
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 600;
        font-size: 1rem;
      }

      .submit-bet-btn {
        background: #2ecc71;
        color: #fff;
      }
      .buy-bet-btn {
        background: #3498db;
        color: #fff;
      }
      .relist-btn {
        background: #f1c40f;
        color: #2c3e50;
      }
      .withdraw-btn {
        background: #1abc9c;
        color: #fff;
      }
      .disagree-btn {
        background: #e74c3c;
        color: #fff;
      }
      .end-bet-btn {
        background: #9b59b6;
        color: #fff;
      }

      .submit-bet-btn:hover,
      .buy-bet-btn:hover,
      .relist-btn:hover,
      .withdraw-btn:hover,
      .disagree-btn:hover,
      .end-bet-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      .bet-filters {
        display: flex;
        justify-content: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .bet-filters button {
        background: #e9ecef;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 20px;
        color: #495057;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 600;
      }

      .bet-filters button.active,
      .bet-filters button:hover {
        background: #3498db;
        color: #fff;
      }

      .bet-card {
        background: #fff;
        border-radius: 12px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        transition: all 0.3s ease;
        border: 2px solid #e9ecef;
      }

      .bet-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      .bet-details {
        font-size: 1rem;
        color: #6c757d;
      }

      .edit-bet-section {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 2px solid #e9ecef;
      }

      .edit-inputs {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }

      .edit-input {
        flex: 1;
        padding: 0.75rem;
        border: 2px solid #e9ecef;
        border-radius: 8px;
        background: #fff;
        color: #495057;
      }

      .save-changes-btn {
        background: #3498db;
        color: #fff;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-top: 1rem;
        font-weight: 600;
      }

      .save-changes-btn:hover {
        background: #2980b9;
      }

      @media (max-width: 768px) {
        .main-content {
          flex-direction: column;
        }

        .market-info-column,
        .betting-interface-column {
          min-width: 100%;
        }
      }
    `}</style>
  </div>
);
