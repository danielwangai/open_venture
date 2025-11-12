use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::{constants::ANCHOR_DISCRIMINATOR, error::ErrorCode, state::CompanyProfile};


pub fn handler(ctx: Context<CreateCompanyProfile>, name: String, bio: String, ) -> Result<()> {
    require!(name.len() > 0, ErrorCode::CompanyNameRequired);
    require!(name.len() <= 32, ErrorCode::CompanyNameTooLong);
    // bio is not required, but if it is provided, it must be less than 280 characters long
    require!(bio.len() <= 280, ErrorCode::CompanyBioTooLong);
    ctx.accounts.company_profile.owner = ctx.accounts.owner.key();
    ctx.accounts.company_profile.name = name;
    ctx.accounts.company_profile.active_funding_round = None;

    if bio.len() > 0 {
        ctx.accounts.company_profile.bio = bio;
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateCompanyProfile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        payer = owner,
        space = ANCHOR_DISCRIMINATOR + CompanyProfile::INIT_SPACE,
        seeds = ["company_profile".as_bytes(), owner.key().as_ref(), {hash(name.as_bytes()).to_bytes().as_ref()}],
        bump,
    )]
    pub company_profile: Account<'info, CompanyProfile>,
    /// CHECK: Company treasury vault PDA is derived from company profile, ensuring uniqueness.
    /// 
    /// # Security Model
    /// The company treasury vault is a Program Derived Address (PDA), which means:
    /// - Only the program can sign for vault transfers (no external keypair can control it)
    /// - The vault seeds include the company profile key, ensuring vaults are unique per company
    /// - Only the company owner can authorize access to this vault (via `validate_company_treasury_access` utility)
    /// This ensures only the company owner can operate on the company treasury vault.
    #[account(
        init,
        payer = owner,
        space = 0,
        seeds = ["company_treasury".as_bytes(), owner.key().as_ref(), company_profile.key().as_ref()],
        bump,
    )]
    pub company_treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}
