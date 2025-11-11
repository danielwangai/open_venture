pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

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
}
