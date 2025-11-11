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
    await program.methods.createCompanyProfile(companyName, companyBio).accounts({
      owner: owner1.publicKey,
      companyProfile: companyProfileAddress,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).signers([owner1]).rpc();
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
        
        // fetch created company profilek
        const companyProfile = await program.account.companyProfile.fetch(companyProfileAddress);
        assert.equal(companyProfile.name, companyName);
        assert.equal(companyProfile.bio, companyBio);
    });

    it("cannot create a company profile with a duplicate name", async () => {
      const companyName = "Test Company";// duplicate company name
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
          "Expected 'CompanyNameTooLong' error for long company name",
        );
        return;
      }
      assert.fail("expected company profile creation with name longer than 32 characters to fail");
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
          "Expected 'CompanyNameRequired' error for empty company name",
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
          "Expected 'CompanyBioTooLong' error for bio longer than 280 characters",
        );
        return;
      }
      assert.fail("expected company profile creation with bio longer than 280 characters to fail");
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
});
