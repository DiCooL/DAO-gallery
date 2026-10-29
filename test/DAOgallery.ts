import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress } from "viem";

const URI_0 = "ipfs://bafkreitesturizero";
const URI_1 = "ipfs://bafkreitesturione";
const ERC721_INTERFACE = "0x80ac58cd";
const ERC4906_INTERFACE = "0x49064906";

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
    assert.equal(await nft.read.totalMinted(), 0n);
  });

  it("mints sequential token ids starting at 0 to the given address", async function () {
    const nft = await deploy();

    await viem.assertions.emitWithArgs(
      nft.write.mintNFT([author.account.address, URI_0]),
      nft,
      "NewNFT",
      [getAddress(author.account.address), 0n, URI_0],
    );
    await nft.write.mintNFT([other.account.address, URI_1]);

    assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(author.account.address));
    assert.equal(getAddress(await nft.read.ownerOf([1n])), getAddress(other.account.address));
    assert.equal(await nft.read.balanceOf([author.account.address]), 1n);
    assert.equal(await nft.read.totalMinted(), 2n);
  });

  it("stores a separate URI for each token", async function () {
    const nft = await deploy();
    await nft.write.mintNFT([author.account.address, URI_0]);
    await nft.write.mintNFT([author.account.address, URI_1]);

    assert.equal(await nft.read.tokenURI([0n]), URI_0);
    assert.equal(await nft.read.tokenURI([1n]), URI_1);
  });

  it("adds new tokens without changing existing ones", async function () {
    const nft = await deploy();
    await nft.write.mintNFT([author.account.address, URI_0]);
    for (let i = 1n; i <= 5n; i++) {
      await nft.write.mintNFT([author.account.address, `ipfs://bafkreinew${i}`]);
    }
    assert.equal(await nft.read.tokenURI([0n]), URI_0);
    assert.equal(await nft.read.tokenURI([5n]), "ipfs://bafkreinew5");
    assert.equal(await nft.read.totalMinted(), 6n);
  });

  it("emits MetadataUpdate (ERC-4906) on mint", async function () {
    const nft = await deploy();
    await viem.assertions.emitWithArgs(nft.write.mintNFT([author.account.address, URI_0]), nft, "MetadataUpdate", [0n]);
  });

  it("supports ERC-721 and ERC-4906 interfaces", async function () {
    const nft = await deploy();
    assert.equal(await nft.read.supportsInterface([ERC721_INTERFACE]), true);
    assert.equal(await nft.read.supportsInterface([ERC4906_INTERFACE]), true);
  });

  it("rejects an empty URI", async function () {
    const nft = await deploy();
    await viem.assertions.revertWith(nft.write.mintNFT([author.account.address, ""]), "Empty token URI");
  });

  it("reverts tokenURI for a token that does not exist", async function () {
    const nft = await deploy();
    await viem.assertions.revertWithCustomError(nft.read.tokenURI([0n]), nft, "ERC721NonexistentToken");
  });

  it("forbids minting by anyone except the owner", async function () {
    const nft = await deploy();
    await viem.assertions.revertWithCustomError(
      nft.write.mintNFT([other.account.address, URI_0], { account: other.account }),
      nft,
      "OwnableUnauthorizedAccount",
    );
  });

  it("lets the holder transfer the token and keeps its URI", async function () {
    const nft = await deploy();
    await nft.write.mintNFT([author.account.address, URI_0]);

    await nft.write.transferFrom([author.account.address, other.account.address, 0n], {
      account: author.account,
    });

    assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(other.account.address));
    assert.equal(await nft.read.tokenURI([0n]), URI_0);
  });
});
