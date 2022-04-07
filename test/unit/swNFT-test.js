const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

describe("SWNFT", async () => {
  const pubKey =
    "0xb57e2062d1512a64831462228453975326b65c7008faaf283d5e621e58725e13d10f87e0877e8325c2b1fe754f16b1ec";
  const signature =
    "0xb224d558d829c245fe56bff9d28c7fd0d348d6795eb8faef8ce220c3657e373f8dc0a0c8512be589ecaa749fe39fc0371380a97aab966606ba7fa89c78dc1703858dfc5d3288880a813e7743f1ff379192e1f6b01a6a4a3affee1d50e5b3c849";
  const depositDataRoot =
    "0x81a814655bfc695f5f207d433b4d2e272d764857fee6efd58ba4677c076e60a9";
  const depositAddress = "0x00000000219ab540356cBB839Cbe05303d7705Fa";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  let swNFT, swETH, signer, user, strategy, swDAO;

  before(async () => {
    [signer, user] = await ethers.getSigners();

    const SWDAO = await ethers.getContractFactory("SWDAO");
    swDAO = await SWDAO.deploy();
    await swDAO.deployed();

    // const SWNFTUpgrade = await ethers.getContractFactory("SWNFTUpgrade");
    const nftDescriptorLibraryFactory = await ethers.getContractFactory(
      "NFTDescriptor"
    );
    const nftDescriptorLibrary = await nftDescriptorLibraryFactory.deploy();
    const SWNFTUpgrade = await ethers.getContractFactory("TestswNFTUpgrade", {
      libraries: {
        NFTDescriptor: nftDescriptorLibrary.address
      }
    });
    swNFT = await upgrades.deployProxy(
      SWNFTUpgrade,
      [swDAO.address, depositAddress],
      {
        kind: "uups",
        initializer: "initialize(address, address)",
        unsafeAllowLinkedLibraries: true
      }
    );
    await swNFT.deployed();

    const SWETH = await ethers.getContractFactory("SWETH");
    swETH = await SWETH.deploy(swNFT.address);
    await swETH.deployed();
    await swNFT.setswETHAddress(swETH.address);

    const Strategy = await ethers.getContractFactory("Strategy");
    strategy = await Strategy.deploy(swNFT.address);
    await strategy.deployed();
  });

  it("can update OpRate", async function() {
    let opRate = await swNFT.opRate(user.address);
    expect(opRate).to.be.equal("0");
    await swNFT.connect(user).updateOpRate("100");
    opRate = await swNFT.opRate(user.address);
    expect(opRate).to.be.equal("100");
  });
});
