use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::{error::ErrorCode, state::CompanyProfile};

/// Validates that only the company owner can access the vault funds.
/// 
/// This function ensures:
/// 1. The signer is the company owner
/// 2. The vault PDA is correctly derived from the company profile and funding round
/// 
/// # Security
/// The vault is a Program Derived Address (PDA), which means:
/// - Only the program can sign for vault transfers
/// - The vault seeds include the company profile key, ensuring vaults are unique per company
/// - This function enforces that only the company owner can authorize vault access
/// 
/// # Usage
/// Call this function in any instruction that needs to access vault funds to ensure
/// only the company owner has permission.
pub fn validate_vault_access(
    owner: &Signer,
    company_profile: &Account<CompanyProfile>,
    vault: &AccountInfo,
    funding_round_id: &str,
    program_id: &Pubkey,
) -> Result<()> {
    // Ensure the signer is the company owner
    require!(
        owner.key() == company_profile.owner,
        ErrorCode::UnauthorizedVaultAccess
    );

    // Validate that the vault PDA is correctly derived
    let company_profile_key = company_profile.key();
    let round_id_hash = hash(funding_round_id.as_bytes());
    let round_id_seed = round_id_hash.to_bytes();
    let seeds = &[
        b"funding_round_vault".as_ref(),
        company_profile_key.as_ref(),
        round_id_seed.as_ref(),
    ];
    let (expected_vault, _) = Pubkey::find_program_address(seeds, program_id);
    
    require!(
        vault.key() == expected_vault,
        ErrorCode::UnauthorizedVaultAccess
    );

    Ok(())
}

/// Validates that only the company owner can access the company treasury vault.
/// 
/// This function ensures:
/// 1. The signer is the company owner
/// 2. The company treasury vault PDA is correctly derived from the company profile
/// 
/// # Security
/// The company treasury vault is a Program Derived Address (PDA), which means:
/// - Only the program can sign for vault transfers
/// - The vault seeds include the company profile key, ensuring vaults are unique per company
/// - This function enforces that only the company owner can authorize treasury vault access
/// 
/// # Usage
/// Call this function in any instruction that needs to access the company treasury vault to ensure
/// only the company owner has permission.
pub fn validate_company_treasury_access(
    owner: &Signer,
    company_profile: &Account<CompanyProfile>,
    company_treasury: &AccountInfo,
    program_id: &Pubkey,
) -> Result<()> {
    // Ensure the signer is the company owner
    require!(
        owner.key() == company_profile.owner,
        ErrorCode::UnauthorizedVaultAccess
    );

    // Validate that the company treasury vault PDA is correctly derived
    let owner_key = owner.key();
    let company_profile_key = company_profile.key();
    let treasury_seeds = &[
        b"company_treasury".as_ref(),
        owner_key.as_ref(),
        company_profile_key.as_ref(),
    ];
    let (expected_treasury, _) = Pubkey::find_program_address(treasury_seeds, program_id);
    
    require!(
        company_treasury.key() == expected_treasury,
        ErrorCode::UnauthorizedVaultAccess
    );

    Ok(())
}

