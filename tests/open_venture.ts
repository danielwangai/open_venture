import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { OpenVenture } from "../target/types/open_venture";
import crypto from "crypto";
import * as assert from "assert";

describe("open_venture", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  // actors
  const owner1 = anchor.web3.Keypair.generate();
  const investor = anchor.web3.Keypair.generate();

  const program = anchor.workspace.openVenture as Program<OpenVenture>;

  before(async () => {
    // airdrop some SOL
    await airdrop(owner1.publicKey, new anchor.BN(1_000_000_000));

    // create a company profile
    const companyName = "Test Company";
    const companyBio = "Test Bio";
    const companyProfileAddress = getCompanyProfileAddress(
      owner1.publicKey,
      companyName,
      program.programId
    );
    const companyTreasuryAddress = getCompanyTreasuryAddress(
      owner1.publicKey,
      companyProfileAddress,
      program.programId
    );
    await program.methods
      .createCompanyProfile(companyName, companyBio)
      .accounts({
        owner: owner1.publicKey,
        companyProfile: companyProfileAddress,
        companyTreasury: companyTreasuryAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([owner1])
      .rpc();
  });

  describe("company profile", () => {
    it("can create a company profile", async () => {
      const companyName = "Best Company";
      const companyBio = "Best Bio";

      // get the PDA for the company profile
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );
      const companyTreasuryAddress = getCompanyTreasuryAddress(
        owner1.publicKey,
        companyProfileAddress,
        program.programId
      );

      // create the company profile
      await program.methods
        .createCompanyProfile(companyName, companyBio)
        .accounts({
          owner: owner1.publicKey,
          companyProfile: companyProfileAddress,
          companyTreasury: companyTreasuryAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      // fetch created company profile
      const companyProfile = await program.account.companyProfile.fetch(
        companyProfileAddress
      );
      assert.equal(companyProfile.name, companyName);
      assert.equal(companyProfile.bio, companyBio);
    });

    it("cannot create a company profile with a duplicate name", async () => {
      const companyName = "Test Company"; // duplicate company name
      const companyBio = "Test Bio";
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );
      const companyTreasuryAddress = getCompanyTreasuryAddress(
        owner1.publicKey,
        companyProfileAddress,
        program.programId
      );

      try {
        await program.methods
          .createCompanyProfile(companyName, companyBio)
          .accounts({
            owner: owner1.publicKey,
            companyProfile: companyProfileAddress,
            companyTreasury: companyTreasuryAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
          .rpc();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        assert.ok(
          message.includes("already in use"),
          "duplicate company name should fail with 'already in use'"
        );
        return;
      }
      assert.fail("expected duplicate company profile creation to fail");
    });

    it("cannot create a company profile with a name longer than 32 characters", async () => {
      const companyName = "A".repeat(33);
      const companyBio = "Test Bio";

      // get the PDA for the company profile
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );

      // create the company profile
      try {
        await program.methods
          .createCompanyProfile(companyName, companyBio)
          .accounts({
            owner: owner1.publicKey,
            companyProfile: companyProfileAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
          .rpc();
      } catch (error) {
        const err = anchor.AnchorError.parse(error.logs);
        assert.strictEqual(
          err.error.errorCode.code,
          "CompanyNameTooLong",
          "Expected 'CompanyNameTooLong' error for long company name"
        );
        return;
      }
      assert.fail(
        "expected company profile creation with name longer than 32 characters to fail"
      );
    });

    it("cannot create a company profile with empty name", async () => {
      const companyName = "";
      const companyBio = "Test Bio";

      // get the PDA for the company profile
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );

      // create the company profile
      try {
        await program.methods
          .createCompanyProfile(companyName, companyBio)
          .accounts({
            owner: owner1.publicKey,
            companyProfile: companyProfileAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
          .rpc();
      } catch (error) {
        const err = anchor.AnchorError.parse(error.logs);
        assert.strictEqual(
          err.error.errorCode.code,
          "CompanyNameRequired",
          "Expected 'CompanyNameRequired' error for empty company name"
        );
        return;
      }
      assert.fail("expected company profile creation with empty name to fail");
    });

    it("cannot create a company profile with a bio longer than 280 characters", async () => {
      const companyName = "Test Company" + Date.now().toString().slice(-6);
      const companyBio = "A".repeat(281);

      // get the PDA for the company profile
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );

      // create the company profile
      try {
        await program.methods
          .createCompanyProfile(companyName, companyBio)
          .accounts({
            owner: owner1.publicKey,
            companyProfile: companyProfileAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
          .rpc();
      } catch (error) {
        const err = anchor.AnchorError.parse(error.logs);
        assert.strictEqual(
          err.error.errorCode.code,
          "CompanyBioTooLong",
          "Expected 'CompanyBioTooLong' error for bio longer than 280 characters"
        );
        return;
      }
      assert.fail(
        "expected company profile creation with bio longer than 280 characters to fail"
      );
    });
  });

  describe("funding round", () => {
    // Shared test data that will be set up in beforeEach
    let bob: anchor.web3.Keypair;
    let bobsCompanyName: string;
    let bobsCompanyBio: string;
    let bobsCompanyProfileAddress: PublicKey;
    let bobsRoundId: string;
    let bobsTargetAmount: anchor.BN;
    let bobsInterestRate: anchor.BN;
    let bobsRepaymentDeadline: anchor.BN;
    let bobsFundingRoundAddress: PublicKey;
    let bobsVaultAddress: PublicKey;
    let bobsCompanyTreasuryAddress: PublicKey;

    // investor
    let investor: anchor.web3.Keypair;

    beforeEach(async () => {
      // Generate a unique owner for each test to avoid conflicts
      bob = anchor.web3.Keypair.generate();
      await airdrop(bob.publicKey, new anchor.BN(1_000_000_000)); // airdrop 1 SOL
      investor = anchor.web3.Keypair.generate();
      await airdrop(investor.publicKey, new anchor.BN(10_000_000_000)); // airdrop 10 SOL

      // Create a unique company profile for each test
      bobsCompanyName = `Test Co ${Date.now().toString().slice(-6)}`;
      bobsCompanyBio = "Test Bio";
      bobsCompanyProfileAddress = getCompanyProfileAddress(
        bob.publicKey,
        bobsCompanyName,
        program.programId
      );

      // bob creates a company profile
      bobsCompanyTreasuryAddress = getCompanyTreasuryAddress(
        bob.publicKey,
        bobsCompanyProfileAddress,
        program.programId
      );
      await program.methods
        .createCompanyProfile(bobsCompanyName, bobsCompanyBio)
        .accounts({
          owner: bob.publicKey,
          companyProfile: bobsCompanyProfileAddress,
          companyTreasury: bobsCompanyTreasuryAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([bob])
        .rpc();

      // Create a unique funding round for each test
      bobsRoundId = `round-${Date.now().toString().slice(-6)}`;
      bobsTargetAmount = new anchor.BN(1_000_000_000);
      bobsInterestRate = new anchor.BN(10);
      bobsRepaymentDeadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 1_000_000
      );
      bobsFundingRoundAddress = getFundingRoundAddress(
        bobsCompanyProfileAddress,
        bobsRoundId,
        program.programId
      );
      bobsVaultAddress = getFundingRoundVaultAddress(
        bobsCompanyProfileAddress,
        bobsRoundId,
        program.programId
      );

      await program.methods
        .createFundingRound(
          bobsRoundId,
          bobsTargetAmount,
          bobsInterestRate,
          bobsRepaymentDeadline
        )
        .accounts({
          owner: bob.publicKey,
          companyProfile: bobsCompanyProfileAddress,
          fundingRound: bobsFundingRoundAddress,
          vault: bobsVaultAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([bob])
        .rpc();

        // investor invests in bob's funding round
        await program.methods.fundCompany(new anchor.BN(500_000_000)).accounts({
          investor: investor.publicKey,
          companyProfile: bobsCompanyProfileAddress,
          fundingRound: bobsFundingRoundAddress,
          vault: bobsVaultAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([investor])
        .rpc();
    });

    it("can create a funding round", async () => {
      const fundingRound = await program.account.fundingRound.fetch(
        bobsFundingRoundAddress
      );
      assert.equal(fundingRound.id, bobsRoundId);
      assert.ok(fundingRound.company.equals(bobsCompanyProfileAddress));
      assert.ok(fundingRound.targetAmount.eq(bobsTargetAmount));
      assert.ok(fundingRound.interestRate.eq(bobsInterestRate));
      assert.ok(fundingRound.repaymentDeadline.eq(bobsRepaymentDeadline));
      assert.strictEqual(fundingRound.isActive, true);

      const companyProfile = await program.account.companyProfile.fetch(
        bobsCompanyProfileAddress
      );
      assert.ok(
        companyProfile.activeFundingRound !== null &&
          companyProfile.activeFundingRound.equals(bobsFundingRoundAddress),
        "company should track the active funding round"
      );
    });

    it("rejects creating a funding round when one is already active", async () => {
      // beforeEach already created a funding round, so try to create another one
      const duplicateRoundId = `${bobsRoundId}-dup`;
      const duplicateFundingRoundAddress = getFundingRoundAddress(
        bobsCompanyProfileAddress,
        duplicateRoundId,
        program.programId
      );
      const duplicateVaultAddress = getFundingRoundVaultAddress(
        bobsCompanyProfileAddress,
        duplicateRoundId,
        program.programId
      );

      try {
        await program.methods
          .createFundingRound(
            duplicateRoundId,
            bobsTargetAmount,
            bobsInterestRate,
            bobsRepaymentDeadline
          )
          .accounts({
            owner: bob.publicKey,
            companyProfile: bobsCompanyProfileAddress,
            fundingRound: duplicateFundingRoundAddress,
            vault: duplicateVaultAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([bob])
          .rpc();
      } catch (error) {
        const err = anchor.AnchorError.parse(error.logs);
        assert.strictEqual(
          err.error.errorCode.code,
          "ActiveFundingRoundExists",
          "expected duplicate funding round attempt to fail with ActiveFundingRoundExists"
        );
        return;
      }

      assert.fail("expected duplicate active funding round creation to fail");
    });

    it("allows any wallet to deposit into the funding round vault", async () => {
      await airdrop(investor.publicKey, new anchor.BN(1_000_000));

      const depositAmount = new anchor.BN(150_000_000);
      const initialVaultBalance = await program.provider.connection.getBalance(
        bobsVaultAddress
      );

      await program.methods
        .fundCompany(depositAmount)
        .accounts({
          investor: investor.publicKey,
          companyProfile: bobsCompanyProfileAddress,
          fundingRound: bobsFundingRoundAddress,
          vault: bobsVaultAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([investor])
        .rpc();

      const finalVaultBalance = await program.provider.connection.getBalance(
        bobsVaultAddress
      );
      assert.strictEqual(
        finalVaultBalance - initialVaultBalance,
        depositAmount.toNumber()
      );
    });

    it("allows the company owner to withdraw funds from the funding round vault", async () => {
      // bob wants to withdraw 0.15 sol that has already been invested
      const withdrawalAmount = new anchor.BN(150_000_000);
      const initialVaultBalance = await program.provider.connection.getBalance(bobsVaultAddress);
      const initialTreasuryBalance = await program.provider.connection.getBalance(bobsCompanyTreasuryAddress);
      // withdraw
      await program.methods.withdrawFunds(withdrawalAmount).accounts({
        owner: bob.publicKey,
        companyProfile: bobsCompanyProfileAddress,
        fundingRound: bobsFundingRoundAddress,
        vault: bobsVaultAddress,
        companyTreasury: bobsCompanyTreasuryAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
      } as any)
      .signers([bob])
      .rpc();
      const finalVaultBalance = await program.provider.connection.getBalance(bobsVaultAddress);
      const finalTreasuryBalance = await program.provider.connection.getBalance(bobsCompanyTreasuryAddress);

      assert.strictEqual(
        BigInt(finalVaultBalance),
        BigInt(initialVaultBalance) - BigInt(withdrawalAmount.toNumber())
      );
      assert.strictEqual(
        BigInt(finalTreasuryBalance),
        BigInt(initialTreasuryBalance) + BigInt(withdrawalAmount.toNumber())
      );
    });
  });

  /** Helpers */
  const airdrop = async (publicKey: anchor.web3.PublicKey, amount: anchor.BN) => {
    const sig = await program.provider.connection.requestAirdrop(
      publicKey,
      amount.toNumber() // amount in lamports
    );
    await program.provider.connection.confirmTransaction(sig, "confirmed");
  };

  // get the PDA for a company profile
  const getCompanyProfileAddress = (
    owner: PublicKey,
    name: string,
    programID: PublicKey
  ) => {
    let hexString = crypto
      .createHash("sha256")
      .update(name, "utf-8")
      .digest("hex");
    let nameSeed = Uint8Array.from(Buffer.from(hexString, "hex"));

    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("company_profile"),
        owner.toBuffer(),
        nameSeed,
      ],
      programID
    )[0];
  };

  const getFundingRoundAddress = (
    companyProfileAddress: PublicKey,
    id: string,
    programID: PublicKey
  ) => {
    const hexString = crypto
      .createHash("sha256")
      .update(id, "utf-8")
      .digest("hex");
    const roundIdSeed = Uint8Array.from(Buffer.from(hexString, "hex"));

    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("funding_round"),
        companyProfileAddress.toBuffer(),
        roundIdSeed,
      ],
      programID
    )[0];
  };

  const getFundingRoundVaultAddress = (
    companyProfileAddress: PublicKey,
    id: string,
    programID: PublicKey
  ) => {
    const hexString = crypto
      .createHash("sha256")
      .update(id, "utf-8")
      .digest("hex");
    const roundIdSeed = Uint8Array.from(Buffer.from(hexString, "hex"));

    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("funding_round_vault"),
        companyProfileAddress.toBuffer(),
        roundIdSeed,
      ],
      programID
    )[0];
  };

  const getCompanyTreasuryAddress = (
    owner: PublicKey,
    companyProfileAddress: PublicKey,
    programID: PublicKey
  ) => {
    return PublicKey.findProgramAddressSync(
      [
        anchor.utils.bytes.utf8.encode("company_treasury"),
        owner.toBuffer(),
        companyProfileAddress.toBuffer(),
      ],
      programID
    )[0];
  };
});
