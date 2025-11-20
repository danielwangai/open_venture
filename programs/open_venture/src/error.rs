use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Company name is required")]
    CompanyNameRequired,
    #[msg("Company name cannot be longer than 32 characters long")]
        CompanyNameTooLong,
    #[msg("Company bio cannot be longer than 280 characters long")]
    CompanyBioTooLong,
    #[msg("Owner must be the same as the company profile owner")]
    OwnerMustBeTheSameAsCompanyProfileOwner,
    #[msg("Repayment deadline must be greater than current timestamp")]
    RepaymentDeadlineInThePast,
    #[msg("Target amount must be greater than 0")]
    TargetAmountMustBeGreaterThanZero,
    #[msg("Interest rate must be greater than 0")]
    InterestRateMustBeGreaterThanZero,
    #[msg("Funding round id is required")]
    FundingRoundIdRequired,
    #[msg("Funding round id cannot be longer than 36 characters")]
    FundingRoundIdTooLong,
    #[msg("An active funding round already exists for this company")]
    ActiveFundingRoundExists,
    #[msg("Funding round is not active")]
    FundingRoundNotActive,
    #[msg("Funding round company does not match the provided company profile")]
    FundingRoundCompanyMismatch,
    #[msg("Deposit amount must be greater than zero")]
    DepositAmountMustBeGreaterThanZero,
    #[msg("Only the company owner can access vault funds")]
    UnauthorizedVaultAccess,
    #[msg("Withdrawal amount must be greater than zero")]
    WithdrawalAmountMustBeGreaterThanZero,
    #[msg("Insufficient funds in vault")]
    InsufficientVaultFunds,
    #[msg("Repayment amount must be greater than zero")]
    RepaymentAmountMustBeGreaterThanZero,
    #[msg("Repayment amount exceeds target amount")]
    RepaymentAmountExceedsTargetAmount,
    #[msg("Math overflow")]
    MathOverflow,
}
