import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress } from "viem";

const BASE_URI = "ipfs://bafybeigblis3mcmfwizm4hkqfrn4uvcownjecwf5reatzd6uagg43scwve/";

describe("DAOgallery", async function () {
  const { viem } = await network.create();
  const [owner, author, other] = await viem.getWalletClients();

  async function deploy() {
    return viem.deployContract("DAOgallery", [owner.account.address]);
  }

  it("sets name, symbol and owner", async function () {
    const nft = await deploy();
    assert.equal(await nft.read.name(), "DAO-gallery");
    assert.equal(await nft.read.symbol(), "DAOG");
    assert.equal(getAddress(await nft.read.owner()), getAddress(owner.account.address));
  });

  it("mints sequential token ids starting at 0 to the given address", async function () {
    const nft = await deploy();

    await viem.assertions.emitWithArgs(
      nft.write.mintNFT([author.account.address]),
      nft,
      "NewNFT",
      [getAddress(author.account.address), 0n],
    );
    await nft.write.mintNFT([other.account.address]);

    assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(author.account.address));
    assert.equal(getAddress(await nft.read.ownerOf([1n])), getAddress(other.account.address));
    assert.equal(await nft.read.balanceOf([author.account.address]), 1n);
  });

  it("builds tokenURI from the base URI and token id", async function () {
    const nft = await deploy();
    await nft.write.mintNFT([author.account.address]);
    await nft.write.mintNFT([author.account.address]);

    assert.equal(await nft.read.tokenURI([0n]), `${BASE_URI}0.json`);
    assert.equal(await nft.read.tokenURI([1n]), `${BASE_URI}1.json`);
  });

  it("reverts tokenURI for a token that does not exist", async function () {
    const nft = await deploy();
    await viem.assertions.revertWithCustomError(nft.read.tokenURI([0n]), nft, "ERC721NonexistentToken");
  });

  it("forbids minting by anyone except the owner", async function () {
    const nft = await deploy();
    await viem.assertions.revertWithCustomError(
      nft.write.mintNFT([other.account.address], { account: other.account }),
      nft,
      "OwnableUnauthorizedAccount",
    );
  });

  it("lets the holder transfer the token", async function () {
    const nft = await deploy();
    await nft.write.mintNFT([author.account.address]);

    await nft.write.transferFrom([author.account.address, other.account.address, 0n], {
      account: author.account,
    });

    assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(other.account.address));
  });
});
