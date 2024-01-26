import React from "react";

const FAQ = () => {
  return (
    <div>
      <h1>Prediction Market FAQ</h1>

      <h2>What is this Prediction Market?</h2>
      <p>
        This is a platform where you can predict outcomes of different events.
        You can bet on what you think will happen, and if you're right, you win
        a share of the pot!
      </p>

      <h2>How do I participate?</h2>
      <p>
        You can join by placing a bet on one of the possible outcomes. There are
        two options to bet on, let's call them Option A and Option B.
      </p>

      <h2>What happens after I place a bet?</h2>
      <p>
        After the betting period ends, the market owner decides the winning
        option. If you bet on the winning option, you'll get a share of the
        total bets from the losing side.
      </p>

      <h2>How is the payout determined?</h2>
      <p>
        Your payout depends on when you placed your bet. Earlier bets are paid
        out first. This way, if you bet early, your chances of getting a payout
        are higher.
      </p>

      <h2>What if I change my mind?</h2>
      <p>
        You can adjust or withdraw your bet before the betting period ends.
        However, once the betting period is over, your bet is locked in.
      </p>

      <h2>What if I don't agree with the outcome?</h2>
      <p>
        There's a voting period where you can disagree with the outcome. If
        enough people disagree, the matter goes under review.
      </p>

      <h2>When can I claim my winnings?</h2>
      <p>
        After the winner is decided and if everything checks out, you can claim
        your winnings. If you didn't win, you can still withdraw any remaining
        amount you might have in the contract.
      </p>

      <h2>Is my participation safe?</h2>
      <p>
        Yes, the smart contract handles all the operations, ensuring
        transparency and fairness in the betting process.
      </p>
    </div>
  );
};

export default FAQ;
