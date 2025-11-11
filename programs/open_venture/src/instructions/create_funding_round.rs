use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::{constants::ANCHOR_DISCRIMINATOR, error::ErrorCode, CompanyProfile, FundingRound};

pub fn handler(
    ctx: Context<CreateFundingRound>,
    round_id: String,
    target_amount: u64,
    interest_rate: u64,
    repayment_deadline: u64,
) -> Result<()> {
    // require that owner must be the same as the company profile owner
    require!(
        ctx.accounts.owner.key() == ctx.accounts.company_profile.owner,
        ErrorCode::OwnerMustBeTheSameAsCompanyProfileOwner
    );

    // cannot create funding round if there's another active funding round for the same company
    require!(
        ctx.accounts.company_profile.active_funding_round.is_none(),
        ErrorCode::ActiveFundingRoundExists
    );

    require!(!round_id.is_empty(), ErrorCode::FundingRoundIdRequired);
    require!(round_id.len() <= 36, ErrorCode::FundingRoundIdTooLong);
    require!(
        target_amount > 0,
        ErrorCode::TargetAmountMustBeGreaterThanZero
    );
    require!(
        interest_rate > 0,
        ErrorCode::InterestRateMustBeGreaterThanZero
    );
    // repayment deadline must be greater than current timestamp
    require!(
        repayment_deadline > Clock::get()?.unix_timestamp as u64,
        ErrorCode::RepaymentDeadlineInThePast
    );

    let funding_round_key = ctx.accounts.funding_round.key();

    ctx.accounts.company_profile.active_funding_round = Some(funding_round_key);
    ctx.accounts.funding_round.id = round_id;
    ctx.accounts.funding_round.company = ctx.accounts.company_profile.key();
    ctx.accounts.funding_round.target_amount = target_amount;
    ctx.accounts.funding_round.interest_rate = interest_rate;
    ctx.accounts.funding_round.repayment_deadline = repayment_deadline;
    ctx.accounts.funding_round.is_active = true;

    Ok(())
}

#[derive(Accounts)]
#[instruction(round_id: String)]
pub struct CreateFundingRound<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub company_profile: Account<'info, CompanyProfile>,
    #[account(
        init,
        payer = owner,
        space = ANCHOR_DISCRIMINATOR + FundingRound::INIT_SPACE,
        seeds = ["funding_round".as_bytes(), company_profile.key().as_ref(), {hash(round_id.as_bytes()).to_bytes().as_ref()}],
        bump,
    )]
    pub funding_round: Account<'info, FundingRound>,
    /// CHECK: Vault PDA is derived from company profile and round_id seeds, ensuring uniqueness
    #[account(
        init,
        payer = owner,
        space = 0,
        seeds = ["funding_round_vault".as_bytes(), company_profile.key().as_ref(), {hash(round_id.as_bytes()).to_bytes().as_ref()}],
        bump,
    )]
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
