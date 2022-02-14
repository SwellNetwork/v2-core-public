const { ethers } = require("hardhat");
const { expect } = require("chai");
const { extractJSONFromURI } = require("../helpers/extractJSONFromURI");

describe("SWNFT", async () => {
  const pubkey =
    "0xb57e2062d1512a64831462228453975326b65c7008faaf283d5e621e58725e13d10f87e0877e8325c2b1fe754f16b1ec";
  const signature =
    "0xb224d558d829c245fe56bff9d28c7fd0d348d6795eb8faef8ce220c3657e373f8dc0a0c8512be589ecaa749fe39fc0371380a97aab966606ba7fa89c78dc1703858dfc5d3288880a813e7743f1ff379192e1f6b01a6a4a3affee1d50e5b3c849";
  const deposit_data_root =
    "0x81a814655bfc695f5f207d433b4d2e272d764857fee6efd58ba4677c076e60a9";
  const depositAddress = "0x00000000219ab540356cBB839Cbe05303d7705Fa";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  let swNFT, swETH, signer, user, strategy;

  before(async () => {
    [signer, user] = await ethers.getSigners();
    const SWNFT= await ethers.getContractFactory("SWNFT");
    swNFT = await SWNFT.deploy(depositAddress);
    await swNFT.deployed();
    console.log("swNFT deployed to:", swNFT.address);

    const SWETH= await ethers.getContractFactory("SWETH");
    swETH = await SWETH.deploy(swNFT.address);
    await swETH.deployed();
    console.log("swETH deployed to:", swETH.address);
    await swNFT.setBaseTokenAddress(swETH.address);

    const Strategy = await ethers.getContractFactory("Strategy");
    strategy = await Strategy.deploy(swNFT.address);
    await strategy.deployed();
    console.log("strategy deployed to:", strategy.address);
  });

  it("cannot stake less than 1 Ether", async function() {
    expect(
      swNFT.stake(
        pubkey,
        signature,
        deposit_data_root,
        { value: ethers.utils.parseEther("0.1") }
      )
    ).to.be.revertedWith("Must send at least 1 ETH");
  });

  it("can stake 1 Ether", async function() {
    expect(
      swNFT.stake(
        pubkey,
        signature,
        deposit_data_root,
        { value: ethers.utils.parseEther("1") }
      )
    ).to.emit(swNFT, "LogStake")
     .withArgs(signer.address, "1", pubkey, ethers.utils.parseEther("1"));

    const tokenURI = await swNFT.tokenURI("1");
    const decodeTokenURI = extractJSONFromURI(tokenURI);
    expect(decodeTokenURI.name).to.be.equal("SwellNetwork Validator - 0xb57e2062d1512a64831462228453975326b65c7008faaf283d5e621e58725e13d10f87e0877e8325c2b1fe754f16b1ec - 1 Ether");
    expect(decodeTokenURI.description).to.be.equal("This NFT represents a position in a SwellNetwork Validator. The owner of this NFT can modify or redeem position. \n\n⚠️ DISCLAIMER: Due diligence is imperative when assessing this NFT. Make sure token addresses match the expected tokens, as token symbols may be imitated.");
    expect(decodeTokenURI.image).to.be.equal("data:image/svg+xml;base64,");

    const position = await swNFT.positions("1");
    expect(position.pubKey).to.be.equal(pubkey);
    expect(position.value).to.be.equal('1000000000000000000');
    expect(position.baseTokenBalance).to.be.equal('1000000000000000000');
  });

  it("can stake 1 Ether again", async function(){
    expect(
      swNFT.stake(
        pubkey,
        signature,
        deposit_data_root,
        { value: ethers.utils.parseEther("1") }
      )
    ).to.emit(swNFT, "LogStake")
     .withArgs(signer.address, "2", pubkey, ethers.utils.parseEther("1"));

    const tokenURI = await swNFT.tokenURI("2");
    const decodeTokenURI = extractJSONFromURI(tokenURI);
    expect(decodeTokenURI.name).to.be.equal("SwellNetwork Validator - 0xb57e2062d1512a64831462228453975326b65c7008faaf283d5e621e58725e13d10f87e0877e8325c2b1fe754f16b1ec - 1 Ether");
    expect(decodeTokenURI.description).to.be.equal("This NFT represents a position in a SwellNetwork Validator. The owner of this NFT can modify or redeem position. \n\n⚠️ DISCLAIMER: Due diligence is imperative when assessing this NFT. Make sure token addresses match the expected tokens, as token symbols may be imitated.");
    expect(decodeTokenURI.image).to.be.equal("data:image/svg+xml;base64,");

    const position = await swNFT.positions("2");
    expect(position.pubKey).to.be.equal(pubkey);
    expect(position.value).to.be.equal('1000000000000000000');
    expect(position.baseTokenBalance).to.be.equal('1000000000000000000');
  });

  it("cannot stake more than 32 Ether", async function() {
    expect(
      swNFT.stake(
        pubkey,
        signature,
        deposit_data_root,
        { value: ethers.utils.parseEther("32") }
      )
    ).to.be.revertedWith("cannot stake more than 32 ETH");
  });

  it("cannot withdraw 2 swETH", async function() {
    expect(
      swNFT.withdraw(
        "1",
        ethers.utils.parseEther("2")
      )
    ).to.be.revertedWith("cannot withdraw more than the position value");

    expect(
      swNFT.connect(user).withdraw(
        "1",
        ethers.utils.parseEther("1")
      )
    ).to.be.revertedWith("Only owner can withdraw");
  });

  it("can withdraw 1 swETH", async function() {
    expect(
      swNFT.withdraw(
        "1",
        ethers.utils.parseEther("1")
      )
    ).to.emit(swNFT, "LogWithdraw")
     .withArgs("1", signer.address, ethers.utils.parseEther("1"));

    const position = await swNFT.positions("1");
    expect(position.pubKey).to.be.equal(pubkey);
    expect(position.value).to.be.equal('1000000000000000000');
    expect(position.baseTokenBalance).to.be.equal('0');
  });

  it("cannot deposit 2 swETH", async function() {
    await swETH.approve(swNFT.address, ethers.utils.parseEther("2"));
    expect(
      swNFT.connect(user).deposit(
        "1",
        ethers.utils.parseEther("2")
      )
    ).to.be.revertedWith("Only owner can deposit");

    expect(
      swNFT.deposit(
        "1",
        ethers.utils.parseEther("2")
      )
    ).to.be.revertedWith("cannot deposit more than the position value");
  });

  it("can deposit 1 swETH", async function() {
    await swETH.approve(swNFT.address, ethers.utils.parseEther("1"));
    expect(
      swNFT.deposit(
        "1",
        ethers.utils.parseEther("1")
      )
    ).to.emit(swNFT, "LogDeposit")
     .withArgs("1", signer.address, ethers.utils.parseEther("1"));

    const position = await swNFT.positions("1");
    expect(position.pubKey).to.be.equal(pubkey);
    expect(position.value).to.be.equal('1000000000000000000');
    expect(position.baseTokenBalance).to.be.equal('1000000000000000000');
  });

  it("can add strategy", async function() {
    expect(
      swNFT.addStrategy(zeroAddress)
    ).to.be.revertedWith("address cannot be 0");

    expect(
      swNFT.connect(user).addStrategy(depositAddress)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    expect(
      swNFT.addStrategy(depositAddress)
    ).to.emit(swNFT, "LogAddStrategy")
     .withArgs(depositAddress);
    let strategyAddress = await swNFT.strategies("0");
    expect(strategyAddress).to.be.equal(depositAddress);

    expect(
      swNFT.addStrategy(strategy.address)
    ).to.emit(swNFT, "LogAddStrategy")
     .withArgs(strategy.address);
    strategyAddress = await swNFT.strategies("1");
    expect(strategyAddress).to.be.equal(strategy.address);
  });

  it("can enter strategy", async function() {
    expect(
      swNFT.connect(user).enterStrategy("1", "1")
    ).to.be.revertedWith("Only owner can exit strategy");

    expect(
      swNFT.enterStrategy("3", "1")
    ).to.be.revertedWith("Query for nonexistent token");

    expect(
      swNFT.enterStrategy("1", "1")
    ).to.emit(swNFT, "LogEnterStrategy")
     .withArgs("1", "1", strategy.address, signer.address, ethers.utils.parseEther("1"));

    expect(
      swNFT.enterStrategy("1", "1")
    ).to.be.revertedWith("cannot enter strategy with no base token balance");
  });

  it("can exit strategy", async function() {
    expect(
      swNFT.connect(user).exitStrategy("1", "1")
    ).to.be.revertedWith("Only owner can exit strategy");

    expect(
      swNFT.exitStrategy("1", "1")
    ).to.emit(swNFT, "LogExitStrategy")
     .withArgs("1", "1", strategy.address, signer.address, ethers.utils.parseEther("1"));

    expect(
      swNFT.exitStrategy("1", "1")
    ).to.be.revertedWith("No position to exit");
  });

  it("can batch actions", async function() {
    expect(
      swNFT.batchAction([{
        tokenId: "2",
        action: "2",
        amount: "0",
        strategy: "1"
      },{
        tokenId: "2",
        action: "3",
        amount: "0",
        strategy: "1"
      },{
        tokenId: "2",
        action: "1",
        amount: ethers.utils.parseEther("1"),
        strategy: "0",
      }])
    ).to.emit(swNFT, "LogEnterStrategy")
     .withArgs("2", "1", strategy.address, signer.address, ethers.utils.parseEther("1"))
    .to.emit(swNFT, "LogExitStrategy")
     .withArgs("2", "1", strategy.address, signer.address, ethers.utils.parseEther("1"))
    .to.emit(swNFT, "LogWithdraw")
     .withArgs("2", signer.address, ethers.utils.parseEther("1"));
  });

  it("can remove strategy", async function(){
    expect(
      swNFT.connect(user).removeStrategy("0")
    ).to.be.revertedWith("Ownable: caller is not the owner");

    expect(swNFT.removeStrategy("0")).to.emit(swNFT, "LogRemoveStrategy").withArgs("0", depositAddress);
    expect(swNFT.removeStrategy("1")).to.emit(swNFT, "LogRemoveStrategy").withArgs("1", strategy.address);
  });

});
