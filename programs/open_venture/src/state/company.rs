use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CompanyProfile {
    #[max_len(32)]
    pub name: String,
    #[max_len(280)]
    pub bio: String,
}

#[account]
pub struct FundingRound {
    pub company: Pubkey,
    pub funding_amount: u64,
    pub interest_rate: u64,
    pub repayment_deadline: u64,
}
