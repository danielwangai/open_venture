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

  const program = anchor.workspace.openVenture as Program<OpenVenture>;

  before(async () => {
    // airdrop some SOL
    await airdrop(owner1.publicKey);

    // create a company profile
    const companyName = "Test Company";
    const companyBio = "Test Bio";
    const companyProfileAddress = getCompanyProfileAddress(
      owner1.publicKey,
      companyName,
      program.programId
    );
    await program.methods
      .createCompanyProfile(companyName, companyBio)
      .accounts({
        owner: owner1.publicKey,
        companyProfile: companyProfileAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
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

      // create the company profile
      await program.methods
        .createCompanyProfile(companyName, companyBio)
        .accounts({
          owner: owner1.publicKey,
          companyProfile: companyProfileAddress,
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
    it("can create a funding round", async () => {
      const companyName = "Funding Co";
      const companyBio = "Bio for funding co";
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );
      await program.methods
        .createCompanyProfile(companyName, companyBio)
        .accounts({
          owner: owner1.publicKey,
          companyProfile: companyProfileAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();
      const roundId = `round-${Date.now().toString().slice(-6)}`;
      const targetAmount = new anchor.BN(1_000_000_000);
      const interestRate = new anchor.BN(10);
      const repaymentDeadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 1_000_000
      );
      const fundingRoundAddress = getFundingRoundAddress(
        companyProfileAddress,
        roundId,
        program.programId
      );

      await program.methods
        .createFundingRound(
          roundId,
          targetAmount,
          interestRate,
          repaymentDeadline
        )
        .accounts({
          owner: owner1.publicKey,
          companyProfile: companyProfileAddress,
          fundingRound: fundingRoundAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      const fundingRound = await program.account.fundingRound.fetch(
        fundingRoundAddress
      );
      assert.equal(fundingRound.id, roundId);
      assert.ok(fundingRound.company.equals(companyProfileAddress));
      assert.ok(fundingRound.targetAmount.eq(targetAmount));
      assert.ok(fundingRound.interestRate.eq(interestRate));
      assert.ok(fundingRound.repaymentDeadline.eq(repaymentDeadline));
      assert.strictEqual(fundingRound.isActive, true);

      const companyProfile = await program.account.companyProfile.fetch(
        companyProfileAddress
      );
      assert.ok(
        companyProfile.activeFundingRound !== null &&
          companyProfile.activeFundingRound.equals(fundingRoundAddress),
        "company should track the active funding round"
      );
    });

    it("rejects creating a funding round when one is already active", async () => {
      const companyName = `Dup Funding Co ${Date.now().toString().slice(-6)}`;
      const companyBio = "Duplicate guard";
      const companyProfileAddress = getCompanyProfileAddress(
        owner1.publicKey,
        companyName,
        program.programId
      );
      await program.methods
        .createCompanyProfile(companyName, companyBio)
        .accounts({
          owner: owner1.publicKey,
          companyProfile: companyProfileAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      const firstRoundId = `round-${Date.now().toString().slice(-6)}`;
      const targetAmount = new anchor.BN(750_000_000);
      const interestRate = new anchor.BN(12);
      const repaymentDeadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 600_000
      );
      const firstFundingRoundAddress = getFundingRoundAddress(
        companyProfileAddress,
        firstRoundId,
        program.programId
      );

      await program.methods
        .createFundingRound(
          firstRoundId,
          targetAmount,
          interestRate,
          repaymentDeadline
        )
        .accounts({
          owner: owner1.publicKey,
          companyProfile: companyProfileAddress,
          fundingRound: firstFundingRoundAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner1])
        .rpc();

      const duplicateRoundId = `${firstRoundId}-dup`;
      const duplicateFundingRoundAddress = getFundingRoundAddress(
        companyProfileAddress,
        duplicateRoundId,
        program.programId
      );

      try {
        await program.methods
          .createFundingRound(
            duplicateRoundId,
            targetAmount,
            interestRate,
            repaymentDeadline
          )
          .accounts({
            owner: owner1.publicKey,
            companyProfile: companyProfileAddress,
            fundingRound: duplicateFundingRoundAddress,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([owner1])
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
  });

  /** Helpers */
  const airdrop = async (publicKey: anchor.web3.PublicKey) => {
    const sig = await program.provider.connection.requestAirdrop(
      publicKey,
      1_000_000_000 // 1 SOL
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
});
