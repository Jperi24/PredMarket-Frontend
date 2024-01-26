import React from "react";

const deployingFAQ = () => {
  return (
    <div className="iframe-container">
      <iframe
        src="/PredMarketFAQ.pdf"
        className="responsive-iframe"
        type="application/pdf"
      ></iframe>
    </div>
  );
};

export default deployingFAQ;
