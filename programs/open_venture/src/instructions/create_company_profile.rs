use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::{constants::ANCHOR_DISCRIMINATOR, error::ErrorCode, state::CompanyProfile};


pub fn handler(ctx: Context<CreateCompanyProfile>, name: String, bio: String, ) -> Result<()> {
    require!(name.len() > 0, ErrorCode::CompanyNameRequired);
    require!(name.len() <= 32, ErrorCode::CompanyNameTooLong);
    // bio is not required, but if it is provided, it must be less than 280 characters long
    require!(bio.len() <= 280, ErrorCode::CompanyBioTooLong);
    ctx.accounts.company_profile.name = name;

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
    pub system_program: Program<'info, System>,
}
