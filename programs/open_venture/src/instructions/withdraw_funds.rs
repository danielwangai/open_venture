use anchor_lang::prelude::*;
use crate::{
    error::ErrorCode,
    state::{CompanyProfile, FundingRound},
    utils::{validate_vault_access, validate_company_treasury_access},
};

pub fn handler(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
    // Validate that only the company owner can access the vault
    validate_vault_access(
        &ctx.accounts.owner,
        &ctx.accounts.company_profile,
        &ctx.accounts.vault,
        &ctx.accounts.funding_round.id,
        ctx.program_id,
    )?;

    // Check that the funding round belongs to the company
    require!(
        ctx.accounts.funding_round.company == ctx.accounts.company_profile.key(),
        ErrorCode::FundingRoundCompanyMismatch
    );

    // Check vault balance
    let vault_lamports = ctx.accounts.vault.lamports();
    // check that the vault has enough funds to withdraw
    require!(vault_lamports >= amount, ErrorCode::InsufficientVaultFunds);

    // check that the withdrawal amount is greater than zero
    require!(amount > 0, ErrorCode::WithdrawalAmountMustBeGreaterThanZero);

    // Validate that only the company owner can access the company treasury vault
    validate_company_treasury_access(
        &ctx.accounts.owner,
        &ctx.accounts.company_profile,
        &ctx.accounts.company_treasury,
        ctx.program_id,
    )?;

    // Transfer funds from funding round vault to company treasury vault by directly mutating lamports
    **ctx.accounts
        .vault
        .try_borrow_mut_lamports()
        .map_err(|_| ErrorCode::UnauthorizedVaultAccess)? -= amount;
    **ctx.accounts
        .company_treasury
        .try_borrow_mut_lamports()
        .map_err(|_| ErrorCode::UnauthorizedVaultAccess)? += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        has_one = owner @ ErrorCode::UnauthorizedVaultAccess
    )]
    pub company_profile: Account<'info, CompanyProfile>,
    #[account(
        constraint = funding_round.company == company_profile.key() @ ErrorCode::FundingRoundCompanyMismatch
    )]
    pub funding_round: Account<'info, FundingRound>,
    /// CHECK: Vault PDA is validated in handler via validate_vault_access
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    /// CHECK: Company treasury vault PDA is validated in handler via validate_company_treasury_access
    /// Only the company owner can access this vault
    #[account(mut)]
    pub company_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
