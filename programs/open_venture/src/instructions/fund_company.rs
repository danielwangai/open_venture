use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_lang::system_program;

use crate::{
    error::ErrorCode,
    state::{CompanyProfile, FundingRound},
};

pub fn handler(ctx: Context<FundCompany>, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::DepositAmountMustBeGreaterThanZero);
    require!(ctx.accounts.funding_round.is_active, ErrorCode::FundingRoundNotActive);

    // Validate vault PDA
    let company_profile_key = ctx.accounts.company_profile.key();
    let round_id_hash = hash(ctx.accounts.funding_round.id.as_bytes());
    let round_id_seed = round_id_hash.to_bytes();
    let seeds = &[
        b"funding_round_vault".as_ref(),
        company_profile_key.as_ref(),
        round_id_seed.as_ref(),
    ];
    let (expected_vault, _) = Pubkey::find_program_address(seeds, ctx.program_id);
    // prevent contribution to the wrong vault
    require!(
        ctx.accounts.vault.key() == expected_vault,
        ErrorCode::FundingRoundCompanyMismatch
    );

    let transfer_accounts = system_program::Transfer {
        from: ctx.accounts.investor.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_accounts);
    system_program::transfer(cpi_ctx, amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct FundCompany<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(mut)]
    pub company_profile: Account<'info, CompanyProfile>,
    #[account(
        mut,
        constraint = funding_round.company == company_profile.key() @ ErrorCode::FundingRoundCompanyMismatch
    )]
    pub funding_round: Account<'info, FundingRound>,
    /// CHECK: Vault PDA is validated in handler
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
