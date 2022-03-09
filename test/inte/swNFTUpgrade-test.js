const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
const { extractJSONFromURI } = require("../helpers/extractJSONFromURI");

describe("SWNFTUpgrade", async () => {
  const pubKey =
    "0xb57e2062d1512a64831462228453975326b65c7008faaf283d5e621e58725e13d10f87e0877e8325c2b1fe754f16b1ec";
  const signature =
    "0xb224d558d829c245fe56bff9d28c7fd0d348d6795eb8faef8ce220c3657e373f8dc0a0c8512be589ecaa749fe39fc0371380a97aab966606ba7fa89c78dc1703858dfc5d3288880a813e7743f1ff379192e1f6b01a6a4a3affee1d50e5b3c849";
  const depositDataRoot =
    "0x81a814655bfc695f5f207d433b4d2e272d764857fee6efd58ba4677c076e60a9";
  const depositAddress = "0x00000000219ab540356cBB839Cbe05303d7705Fa";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  let swNFT, swETH, signer, user, strategy;

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

  it("cannot stake less than 1 Ether", async function() {
    amount = ethers.utils.parseEther("0.1");
    expect(
      swNFT.stake([{ pubKey, signature, depositDataRoot, amount }], {
        value: amount
      })
    ).to.be.revertedWith("Must send at least 1 ETH");
  });

  // Deprecated as moving the check to the backend
  // it("First deposit must be from owner", async function() {
  //   expect(
  //     swNFT.connect(user).stake(
  //       pubKey,
  //       signature,
  //       depositDataRoot,
  //       { value: ethers.utils.parseEther("1") }
  //     )
  //   ).to.be.revertedWith("First deposit must be from owner");
  // });

  it("can stake 1 Ether", async function() {
    amount = ethers.utils.parseEther("1");
    await expect(
      await swNFT.stake([{ pubKey, signature, depositDataRoot, amount }], {
        value: amount
      })
    ).to.emit(swNFT, "LogStake");
    //  .withArgs(signer.address, "1", pubKey, ethers.utils.parseEther("1"), Math.round(Date.now() / 1000));

    const tokenURI = await swNFT.tokenURI("1");
    const decodeTokenURI = extractJSONFromURI(tokenURI);
    expect(decodeTokenURI.name).to.be.equal(
      "Swell Network Validator - swETH - " + pubKey + " <> 1 Ether"
    );
    expect(decodeTokenURI.description).to.be.equal(
      "This NFT represents a liquidity position in a Swell Network Validator. The owner of this NFT can modify or redeem the position.\n" +
        "swETH Address: " +
        swETH.address.toLowerCase() +
        "\n" +
        "Token ID: 1\n\n" +
        "⚠️ DISCLAIMER: Due diligence is imperative when assessing this NFT. Make sure token addresses match the expected tokens, as token symbols may be imitated."
    );

    const owner = await swNFT.ownerOf("1");
    expect(owner).to.be.equal(signer.address);

    const validatorsLength = await swNFT.validatorsLength();
    const validator = await swNFT.validators("0");
    expect(validatorsLength).to.be.equal("1");
    expect(validator).to.be.equal(pubKey);

    const position = await swNFT.positions("1");
    expect(position.pubKey).to.be.equal(pubKey);
    expect(position.value).to.be.equal("1000000000000000000");
    expect(position.baseTokenBalance).to.be.equal("1000000000000000000");

    const tvl = await swNFT.tvl();
    expect(tvl).to.be.equal("1000000000000000000");
  });

  it("cannot stake 1 Ether again", async function() {
    amount = ethers.utils.parseEther("1");
    await expect(
      swNFT
        .connect(user)
        .stake([{ pubKey, signature, depositDataRoot, amount }], {
          value: amount
        })
    ).to.be.revertedWith("Must send at least 16 ETH");
  });

  it("can add validator into whiteList", async () => {
    await expect(await swNFT.addWhiteList(pubKey))
      .to.emit(swNFT, "LogAddWhiteList")
      .withArgs(signer.address, pubKey);
  });

  it("can stake 1 Ether again", async function() {
    amount = ethers.utils.parseEther("1");
    await expect(
      await swNFT
        .connect(user)
        .stake([{ pubKey, signature, depositDataRoot, amount }], {
          value: amount
        })
    ).to.emit(swNFT, "LogStake");
    //  .withArgs(user.address, "2", pubKey, ethers.utils.parseEther("1"))

    const tokenURI = await swNFT.tokenURI("2");
    const decodeTokenURI = extractJSONFromURI(tokenURI);
    expect(decodeTokenURI.name).to.be.equal(
      "Swell Network Validator - swETH - " + pubKey + " <> 1 Ether"
    );
    expect(decodeTokenURI.description).to.be.equal(
      "This NFT represents a liquidity position in a Swell Network Validator. The owner of this NFT can modify or redeem the position.\n" +
        "swETH Address: " +
        swETH.address.toLowerCase() +
        "\n" +
        "Token ID: 2\n\n" +
        "⚠️ DISCLAIMER: Due diligence is imperative when assessing this NFT. Make sure token addresses match the expected tokens, as token symbols may be imitated."
    );

    const owner = await swNFT.ownerOf("2");
    expect(owner).to.be.equal(user.address);

    const validatorsLength = await swNFT.validatorsLength();
    const validator = await swNFT.validators("0");
    expect(validatorsLength).to.be.equal("1");
    expect(validator).to.be.equal(pubKey);

    const position = await swNFT.positions("2");
    expect(position.pubKey).to.be.equal(pubKey);
    expect(position.value).to.be.equal("1000000000000000000");
    expect(position.baseTokenBalance).to.be.equal("1000000000000000000");

    const tvl = await swNFT.tvl();
    expect(tvl).to.be.equal("2000000000000000000");
  });

  it("cannot stake more than 32 Ether", async function() {
    amount = ethers.utils.parseEther("32");
    expect(
      swNFT.stake([{ pubKey, signature, depositDataRoot, amount }], {
        value: amount
      })
    ).to.be.revertedWith("cannot stake more than 32 ETH");
  });

  it("cannot withdraw 2 swETH", async function() {
    expect(
      swNFT.withdraw("1", ethers.utils.parseEther("2"))
    ).to.be.revertedWith("cannot withdraw more than the position balance");

    expect(
      swNFT.connect(user).withdraw("1", ethers.utils.parseEther("1"))
    ).to.be.revertedWith("Only owner can withdraw");
  });

  it("can withdraw 1 swETH", async function() {
    expect(swNFT.withdraw("1", ethers.utils.parseEther("1")))
      .to.emit(swNFT, "LogWithdraw")
      .withArgs("1", signer.address, ethers.utils.parseEther("1"));

    const position = await swNFT.positions("1");
    expect(position.pubKey).to.be.equal(pubKey);
    expect(position.value).to.be.equal("1000000000000000000");
    expect(position.baseTokenBalance).to.be.equal("0");
  });

  it("cannot deposit if not owner", async function() {
    await swETH.approve(swNFT.address, ethers.utils.parseEther("2"));
    expect(
      swNFT.connect(user).deposit("1", ethers.utils.parseEther("2"))
    ).to.be.revertedWith("Only owner can deposit");
  });

  it("can deposit 1 swETH", async function() {
    await swETH.approve(swNFT.address, ethers.utils.parseEther("1"));
    expect(swNFT.deposit("1", ethers.utils.parseEther("1")))
      .to.emit(swNFT, "LogDeposit")
      .withArgs("1", signer.address, ethers.utils.parseEther("1"));

    const position = await swNFT.positions("1");
    expect(position.pubKey).to.be.equal(pubKey);
    expect(position.value).to.be.equal("1000000000000000000");
    expect(position.baseTokenBalance).to.be.equal("1000000000000000000");
  });

  it("can add strategy", async function() {
    expect(swNFT.addStrategy(zeroAddress)).to.be.revertedWith(
      "address cannot be 0"
    );

    expect(swNFT.connect(user).addStrategy(depositAddress)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    expect(swNFT.addStrategy(depositAddress))
      .to.emit(swNFT, "LogAddStrategy")
      .withArgs(depositAddress);
    let strategyAddress = await swNFT.strategies("0");
    expect(strategyAddress).to.be.equal(depositAddress);

    expect(swNFT.addStrategy(strategy.address))
      .to.emit(swNFT, "LogAddStrategy")
      .withArgs(strategy.address);
    strategyAddress = await swNFT.strategies("1");
    expect(strategyAddress).to.be.equal(strategy.address);
  });

  it("can enter strategy", async function() {
    expect(swNFT.connect(user).enterStrategy("1", "1")).to.be.revertedWith(
      "Only owner can exit strategy"
    );

    expect(swNFT.enterStrategy("3", "1")).to.be.revertedWith(
      "Query for nonexistent token"
    );

    expect(swNFT.enterStrategy("1", "1"))
      .to.emit(swNFT, "LogEnterStrategy")
      .withArgs(
        "1",
        "1",
        strategy.address,
        signer.address,
        ethers.utils.parseEther("1")
      );

    expect(swNFT.enterStrategy("1", "1")).to.be.revertedWith(
      "cannot enter strategy with no base token balance"
    );
  });

  it("can exit strategy", async function() {
    expect(swNFT.connect(user).exitStrategy("1", "1")).to.be.revertedWith(
      "Only owner can exit strategy"
    );

    expect(swNFT.exitStrategy("1", "1"))
      .to.emit(swNFT, "LogExitStrategy")
      .withArgs(
        "1",
        "1",
        strategy.address,
        signer.address,
        ethers.utils.parseEther("1")
      );

    expect(swNFT.exitStrategy("1", "1")).to.be.revertedWith(
      "No position to exit"
    );
  });

  it("can batch actions", async function() {
    expect(
      swNFT.connect(user).batchAction([
        {
          tokenId: "2",
          action: "2",
          amount: "0",
          strategy: "1"
        },
        {
          tokenId: "2",
          action: "3",
          amount: "0",
          strategy: "1"
        },
        {
          tokenId: "2",
          action: "1",
          amount: ethers.utils.parseEther("1"),
          strategy: "0"
        }
      ])
    )
      .to.emit(swNFT, "LogEnterStrategy")
      .withArgs(
        "2",
        "1",
        strategy.address,
        signer.address,
        ethers.utils.parseEther("1")
      )
      .to.emit(swNFT, "LogExitStrategy")
      .withArgs(
        "2",
        "1",
        strategy.address,
        signer.address,
        ethers.utils.parseEther("1")
      )
      .to.emit(swNFT, "LogWithdraw")
      .withArgs("2", signer.address, ethers.utils.parseEther("1"));
  });

  it("can remove strategy", async function() {
    expect(swNFT.connect(user).removeStrategy("0")).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );

    expect(swNFT.removeStrategy("0"))
      .to.emit(swNFT, "LogRemoveStrategy")
      .withArgs("0", depositAddress);
    expect(swNFT.removeStrategy("1"))
      .to.emit(swNFT, "LogRemoveStrategy")
      .withArgs("1", strategy.address);
  });
});
