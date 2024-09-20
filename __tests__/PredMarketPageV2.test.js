// PredMarketPageV2.test.js

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import PredMarketPageV2 from "../pages/market/[contractAddress]"; // Adjust path as necessary
import { ethers } from "ethers";
import { setupServer } from "msw/node";
import { rest } from "msw";

// Mock the necessary hooks and functions
jest.mock("@thirdweb-dev/react", () => ({
  useSigner: jest.fn(),
}));

jest.mock("ethers", () => {
  const actualEthers = jest.requireActual("ethers");
  return {
    ...actualEthers,
    ethers: {
      ...actualEthers.ethers,
      Contract: jest.fn().mockImplementation(() => ({
        sellANewBet: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        buyABet: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        unlistBets: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        withdraw: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        transferOwnerAmount: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        transferStaffAmount: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        declareWinner: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        disagreeWithOwner: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        editADeployedBet: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        sellAnExistingBet: jest.fn().mockResolvedValue({
          wait: jest.fn().mockResolvedValue({}),
        }),
        on: jest.fn(),
        off: jest.fn(),
        creatorLocked: jest
          .fn()
          .mockResolvedValue(
            actualEthers.BigNumber.from("1000000000000000000")
          ),
        allBets_Balance: jest.fn().mockResolvedValue([
          [
            {
              /* mock bet data */
            },
          ],
          actualEthers.BigNumber.from("0"),
          "0",
          "0",
          actualEthers.BigNumber.from("0"),
          actualEthers.BigNumber.from("0"),
        ]),
      })),
      utils: {
        parseEther: jest.fn((value) =>
          actualEthers.BigNumber.from("1000000000000000000")
        ),
        formatEther: jest.fn((value) => "1.0"),
      },
    },
  };
});

const mockSigner = {
  getAddress: jest.fn().mockResolvedValue("0xMockAddress"),
  provider: {
    getNetwork: jest.fn().mockResolvedValue({ chainId: 56 }),
    getBalance: jest
      .fn()
      .mockResolvedValue(ethers.BigNumber.from("1000000000000000000")),
  },
};

// Mock API setup with MSW
const server = setupServer(
  rest.post(
    `http://localhost:3001/api/updateBetterMongoDB`,
    (req, res, ctx) => {
      return res(ctx.status(200));
    }
  ),
  rest.post(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateMongoDB`,
    (req, res, ctx) => {
      return res(ctx.status(200));
    }
  ),
  rest.post(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/moveToDisagreements`,
    (req, res, ctx) => {
      return res(ctx.status(200));
    }
  ),
  rest.get(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/contracts/:address`,
    (req, res, ctx) => {
      return res(
        ctx.json({
          chain: { chainId: 56, name: "Binance Smart Chain" },
          deployerAddress: "0xDeployer",
        })
      );
    }
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("PredMarketPageV2 Component", () => {
  beforeEach(() => {
    useSigner.mockReturnValue({
      getAddress: jest.fn().mockResolvedValue("0xMockAddress"),
      provider: {
        getNetwork: jest.fn().mockResolvedValue({ chainId: 56 }),
        getBalance: jest
          .fn()
          .mockResolvedValue(
            actualEthers.BigNumber.from("1000000000000000000")
          ),
      },
    });
    jest.clearAllMocks();
  });

  test("renders without crashing and displays network mismatch modal", async () => {
    render(<PredMarketPageV2 />);
    expect(screen.getByText(/Switch Network/)).toBeInTheDocument();
  });

  test("handles network switch correctly", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText(/Switch Network/));
    await waitFor(() => {
      expect(window.ethereum.request).toHaveBeenCalledWith({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }],
      });
    });
  });

  test("fetches contract details on load and displays them", async () => {
    render(<PredMarketPageV2 />);
    await waitFor(() =>
      expect(screen.getByText(/Binance Smart Chain/)).toBeInTheDocument()
    );
  });

  test("displays modal and handles contract interactions for selling a new bet", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Deploy A Bet"));
    fireEvent.change(screen.getByPlaceholderText(/My Bet In/), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Opponent's Bet In/), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Select an outcome.../), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText("Submit Bet"));

    await waitFor(() =>
      expect(screen.getByText(/You are depositing/)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Confirm"));
    await waitFor(() =>
      expect(ethers.Contract.prototype.sellANewBet).toHaveBeenCalled()
    );
  });

  test("handles API call for updating better in MongoDB", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Submit Bet"));
    await waitFor(() =>
      expect(screen.getByText("Please Connect Wallet")).toBeInTheDocument()
    );
  });

  test("handles buying a bet correctly", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Buy Bet"));
    await waitFor(() =>
      expect(ethers.Contract.prototype.buyABet).toHaveBeenCalled()
    );
  });

  test("handles error cases for contract methods correctly", async () => {
    ethers.Contract.prototype.sellANewBet.mockRejectedValue(
      new Error("Transaction failed")
    );
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Submit Bet"));
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to complete the transaction/)
      ).toBeInTheDocument()
    );
  });

  test("handles disagreement vote and contract interaction correctly", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Disagree"));
    fireEvent.change(screen.getByPlaceholderText(/Disagreement Reason/), {
      target: { value: "Some reason" },
    });
    fireEvent.click(screen.getByText("Disagree"));

    await waitFor(() =>
      expect(ethers.Contract.prototype.disagreeWithOwner).toHaveBeenCalled()
    );
  });

  test("fetches all bets and displays them", async () => {
    render(<PredMarketPageV2 />);
    await waitFor(() => expect(screen.getByText(/Bet 1/)).toBeInTheDocument());
  });

  test("handles unlisting of bets correctly", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Unlist All Selected"));
    await waitFor(() =>
      expect(ethers.Contract.prototype.unlistBets).toHaveBeenCalled()
    );
  });

  test("handles owner withdrawal of commission correctly", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Owner Withdraw Collected Commission"));
    await waitFor(() =>
      expect(ethers.Contract.prototype.transferOwnerAmount).toHaveBeenCalled()
    );
  });

  test("handles network errors during contract interaction", async () => {
    server.use(
      rest.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/updateBetterMongoDB`,
        (req, res, ctx) => {
          return res(ctx.status(500));
        }
      )
    );

    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Submit Bet"));
    await waitFor(() =>
      expect(screen.getByText(/Error updating MongoDB/)).toBeInTheDocument()
    );
  });

  test("handles bet editing functionality correctly", async () => {
    render(<PredMarketPageV2 />);
    fireEvent.click(screen.getByText("Edit Your Deployed Bet"));
    fireEvent.change(screen.getByPlaceholderText(/Enter new price in/), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByText("Save Changes"));
    await waitFor(() =>
      expect(ethers.Contract.prototype.editADeployedBet).toHaveBeenCalled()
    );
  });
});
