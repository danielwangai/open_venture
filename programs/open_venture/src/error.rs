use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Company name is required")]
    CompanyNameRequired,
    #[msg("Company name cannot be longer than 32 characters long")]
        CompanyNameTooLong,
    #[msg("Company bio cannot be longer than 280 characters long")]
    CompanyBioTooLong,
}
