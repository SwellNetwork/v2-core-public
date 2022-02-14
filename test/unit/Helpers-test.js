const { ethers } = require("hardhat");
const { expect } = require("chai");

let helpers, signer;

describe("TestHelpers", async () => {
  before(async () => {
    [signer] = await ethers.getSigners();
    const Helpers = await ethers.getContractFactory("TestHelpers");
    helpers = await Helpers.deploy();
  });

  it("should convert uint to string", async () => {
    const result = await helpers.uint2String("1");
    expect(result).to.be.equal("1");
  });
});
