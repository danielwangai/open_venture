use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{CompanyProfile, FundingRound},
    utils::validate_repayment_vault_access,
};

pub fn handler(ctx: Context<RepayFundingRound>, amount: u64) -> Result<()> {
    // the expression below evaluates to: target_amount * (1 + interest_rate / 100)
    let total_with_interest = ctx.accounts.funding_round.target_amount
        .checked_mul(100u64 + ctx.accounts.funding_round.interest_rate)
        .and_then(|v| v.checked_div(100))
        .ok_or(ErrorCode::MathOverflow)?;

    require!(
        amount == total_with_interest,
        ErrorCode::RepaymentAmountExceedsTargetAmount
    );

    // ensure it's the company owner who is repaying the funding round
    // ensure details match the repayment vault PDA
    validate_repayment_vault_access(
        &ctx.accounts.owner,
        &ctx.accounts.company_profile,
        &ctx.accounts.funding_round.id,
        &ctx.accounts.repayment_vault,
        ctx.program_id,
    )?;

    // ensure funding round belongs to company profile
    require!(
        ctx.accounts.funding_round.company == ctx.accounts.company_profile.key(),
        ErrorCode::FundingRoundCompanyMismatch
    );

    // ensure treasury has enough lamports
    let treasury_lamports = ctx.accounts.company_treasury.lamports();
    require!(
        treasury_lamports >= total_with_interest,
        ErrorCode::InsufficientVaultFunds
    );

    // move lamports directly between PDAs owned by this program
    **ctx.accounts
        .company_treasury
        .try_borrow_mut_lamports()
        .map_err(|_| ErrorCode::UnauthorizedVaultAccess)? -= amount;
    **ctx.accounts
        .repayment_vault
        .try_borrow_mut_lamports()
        .map_err(|_| ErrorCode::UnauthorizedVaultAccess)? += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct RepayFundingRound<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner)]
    pub company_profile: Account<'info, CompanyProfile>,
    #[account(
        mut,
        constraint = funding_round.company == company_profile.key() @ ErrorCode::FundingRoundCompanyMismatch
    )]
    pub funding_round: Account<'info, FundingRound>,
    /// CHECK: Company treasury PDA validated in the handler
    #[account(mut)]
    pub company_treasury: AccountInfo<'info>,
    /// CHECK: Repayment vault PDA validated in the handler
    #[account(mut)]
    pub repayment_vault: AccountInfo<'info>,
}

