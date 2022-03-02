// import { BigNumber, constants, Wallet } from 'ethers'
// import { waffle, ethers } from 'hardhat'
const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");
// import { Fixture } from 'ethereum-waffle'
const isSvg = require("is-svg");

describe('NFTDescriptor', () => {
    let nftDescriptor;

  before(async () => {
    // const nftDescriptorLibraryFactory = await ethers.getContractFactory('NFTDescriptor')
    // const nftDescriptorLibrary = await nftDescriptorLibraryFactory.deploy()

    const NFTDescriptorFactory = await ethers.getContractFactory('NFTDescriptorTest', {
    //   libraries: {
    //     NFTDescriptor: nftDescriptorLibrary.address,
    //   },
    })
    nftDescriptor = await NFTDescriptorFactory.deploy()
  });

  describe('#addressToString', () => {
    it('returns the correct string for a given address', async () => {
      let addressStr = await nftDescriptor.addressToString(`0x${'1234abcdef'.repeat(4)}`)
      expect(addressStr).to.eq('0x1234abcdef1234abcdef1234abcdef1234abcdef')
      addressStr = await nftDescriptor.addressToString(`0x${'1'.repeat(40)}`)
      expect(addressStr).to.eq(`0x${'1'.repeat(40)}`)
    })
  })

  describe('#tokenToColorHex', () => {
    function tokenToColorHex(tokenAddress, startIndex){
      return `${tokenAddress.slice(startIndex, startIndex + 6).toLowerCase()}`
    }

    it('returns the correct hash for the first 3 bytes of the token address', async () => {
      token0Address = "0x1234567890123456789123456789012345678901";
      token1Address = "0xabcdeabcdefabcdefabcdefabcdefabcdefabcdf";
      expect(await nftDescriptor.tokenToColorHex(token0Address, 136)).to.eq(tokenToColorHex(token0Address, 2))
      expect(await nftDescriptor.tokenToColorHex(token1Address, 136)).to.eq(tokenToColorHex(token1Address, 2))
    })

    it('returns the correct hash for the last 3 bytes of the address', async () => {
      expect(await nftDescriptor.tokenToColorHex(token0Address, 0)).to.eq(tokenToColorHex(token0Address, 36))
      expect(await nftDescriptor.tokenToColorHex(token1Address, 0)).to.eq(tokenToColorHex(token1Address, 36))
    })
  })

  describe('#svgImage', () => {
    let tokenId
    let baseTokenBalance
    let baseTokenAddress
    let quoteTokenAddress
    let baseTokenSymbol
    let quoteTokenSymbol

    beforeEach(async () => {
      tokenId = 123
      baseTokenBalance = ethers.utils.parseEther('5');
      quoteTokenAddress = '0x1234567890123456789123456789012345678901'
      baseTokenAddress = '0xabcdeabcdefabcdefabcdefabcdefabcdefabcdf'
      quoteTokenSymbol = 'swETH'
      baseTokenSymbol = 'swETH'
      baseTokenDecimals = ethers.utils.parseEther('1');
      value = ethers.utils.parseEther('10')
      pubKey = "0xb57e2062d1512a64831462228453975326b65c7008faaf283d5e621e58725e13d10f87e0877e8325c2b1fe754f16b1ec"
    })

    it('returns a valid SVG', async () => {
      const svg = await nftDescriptor.generateSVGImage({
        tokenId,
        baseTokenBalance,
        baseTokenAddress,
        quoteTokenAddress,
        baseTokenSymbol,
        quoteTokenSymbol,
        baseTokenDecimals,
        value,
        pubKey,
      })
      console.log('svg: ', svg);
      expect(isSvg(svg)).to.eq(true)
    })
  })
})