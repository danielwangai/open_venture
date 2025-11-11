use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct CompanyProfile {
    pub owner: Pubkey,
    #[max_len(32)]
    pub name: String,
    #[max_len(280)]
    pub bio: String,
    pub active_funding_round: Option<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct FundingRound {
    #[max_len(36)]
    pub id: String,
    pub company: Pubkey,
    pub target_amount: u64,
    pub interest_rate: u64, // interest rate on amount raised to be paid back to investors
    pub repayment_deadline: u64,
    pub is_active: bool,
}
