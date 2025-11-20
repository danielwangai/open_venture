# Open Venture

Open Venture is an Anchor/Solana protocol that lets startup founders manage fundraising rounds on-chain. The protocol makes it possible for founders to raise funds and for any person to participate in a funding round. This opens up a new market for small holder investors to participate in an otherwise closed market(left for "investors with deep pockets").

## How It Works

1. **Company profile** – A founder creates a profile PDA containing company information.
2. **Funding round** – When the company needs funding, the owner launches a round with a target amount and a promised interest rate that creates:
   - a funding-round account
   - an investor vault where deposits land
   - a repayment vault where the company will repay investors with interest _(lumpsum for now)_.
3. **Funding** – Any investor can deposit SOL into the active round’s vault.
4. **Withdrawal** – The company owner withdraws raised funds into the company treasury(owner-only).
5. **Repayment** – When ready to repay principal plus interest, the owner calls `repayFundingRound`, moving funds from the treasury PDA back into the repayment vault for investors to claim (claim/redeem flow TBD).

All transfers between between vaults are enforced by the program, which validates seeds before moving lamports.

## Architectural Overview

The following sequence diagram illustrates the complete funding and repayment flow:


## Actors & Entities

| Actor / Entity      | Role                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| Protocol Admin      | Deploys and maintains the Anchor program, adjusts protocol parameters if needed.        |
| Company Owner       | Creates company profiles, launches funding rounds, withdraws capital, repays investors. |
| Investors           | Any wallets that deposit into active rounds.                                            |

## User Stories

### 1. Register Company Profile

As a company owner I want to create my company profile so I can raise funds on-chain.

**Acceptance Criteria**

- I can create exactly one profile per `(owner, name)` seed; duplicates fail.
- Name length <=32 chars; bio length <= 280 chars (or empty).
- The company profile stores my company's tresury vault and initializes without an active round.

### 2. Launch Funding Round

As a company owner I want to start a funding round so investors can fund our progress.

**Acceptance Criteria**

- I must be the owner of the company profile to launch the round.
- Round ID must be unique UUID and a company cannot have two active rounds at a time.
- Target amount, interest rate, and repayment deadline must be > 0 and the deadline must be in the future.
- Launching creates the funding round account plus investor and repayment vault PDAs.

### 3. Invest in Funding Round

As an investor I want to deposit SOL into an active funding round to fund the company.

**Acceptance Criteria**

- Any wallet can fund any active round with `amount > 0`.
- Deposits land in the round’s vault PDA derived from `(company_profile, round_id)`.
- Funding fails if the round is inactive or if the passed vault doesn’t match the PDA.

### 4. Withdraw Raised Capital

As a company owner I want to withdraw investor funds to my treasury PDA so I can deploy capital.

**Acceptance Criteria**

- Only the company owner can call the withdrawal instruction.
- Funds move from the round’s vault PDA to the company treasury PDA.
- Withdrawal fails if the round vault lacks sufficient balance.

### 5. Repay Funding Round

As a company owner I want to repay the round with interest so investors can recover their funds.

**Acceptance Criteria**

- Repayment amount must equal `target_amount * (1 + interest_rate / 100)` (no partial repayments).
- Only the company owner can repay; repayment vault PDA is validated via seeds.
- Treasury balance must cover the repayment before transfer.
- Funds move from the company treasury PDA to the repayment vault.

## Setup & Installation

### Clone Project
```bash
git clone git@github.com:danielwangai/open_venture.git
cd open_venture
```

### Install Dependencies(test)
```bash
yarn install
```

### Build & Test the Program
```bash
anchor build

anchor test
```
