pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;
pub mod utils;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;
pub use utils::*;

declare_id!("C6SFwFPjwGPdKHF8yKH9BypyYi5eysVPK7S8WUuvbAiE");

#[program]
pub mod open_venture {
    use super::*;

    pub fn create_company_profile(
        ctx: Context<CreateCompanyProfile>,
        name: String,
        bio: String,
    ) -> Result<()> {
        instructions::create_company_profile::handler(ctx, name, bio)
    }

    pub fn create_funding_round(
        ctx: Context<CreateFundingRound>,
        round_id: String,
        target_amount: u64,
        interest_rate: u64,
        repayment_deadline: u64,
    ) -> Result<()> {
        instructions::create_funding_round::handler(
            ctx,
            round_id,
            target_amount,
            interest_rate,
            repayment_deadline,
        )
    }

    pub fn fund_company(ctx: Context<FundCompany>, amount: u64) -> Result<()> {
        instructions::fund_company::handler(ctx, amount)
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        instructions::withdraw_funds::handler(ctx, amount)
    }
}
