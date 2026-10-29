import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther } from "viem";

const PRICE = parseEther("1");
const COMMISSION = parseEther("0.1");
const SELLER_AMOUNT = parseEther("0.9");

describe("Marketplace", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const [owner, seller, buyer, other] = await viem.getWalletClients();

  async function deploy() {
    const nft = await viem.deployContract("DAOgallery", [owner.account.address]);
    const market = await viem.deployContract("Marketplace", [nft.address, owner.account.address]);
    await nft.write.mintNFT([seller.account.address, "ipfs://bafkreitest"]);
    await nft.write.mintNFT([seller.account.address, "ipfs://bafkreitest"]);
    return { nft, market };
  }

  async function deployListed() {
    const { nft, market } = await deploy();
    await nft.write.approve([market.address, 0n], { account: seller.account });
    await market.write.listNFT([0n, PRICE], { account: seller.account });
    return { nft, market };
  }

  describe("listNFT", function () {
    it("creates an active listing and emits NFTListed", async function () {
      const { nft, market } = await deploy();
      await nft.write.approve([market.address, 0n], { account: seller.account });

      await viem.assertions.emitWithArgs(
        market.write.listNFT([0n, PRICE], { account: seller.account }),
        market,
        "NFTListed",
        [0n, getAddress(seller.account.address), PRICE],
      );

      const [listedBy, price, isActive] = await market.read.listings([0n]);
      assert.equal(getAddress(listedBy), getAddress(seller.account.address));
      assert.equal(price, PRICE);
      assert.equal(isActive, true);
      assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(seller.account.address));
    });

    it("accepts setApprovalForAll", async function () {
      const { nft, market } = await deploy();
      await nft.write.setApprovalForAll([market.address, true], { account: seller.account });
      await market.write.listNFT([1n, PRICE], { account: seller.account });
      const [, , isActive] = await market.read.listings([1n]);
      assert.equal(isActive, true);
    });

    it("rejects a zero price", async function () {
      const { nft, market } = await deploy();
      await nft.write.approve([market.address, 0n], { account: seller.account });
      await viem.assertions.revertWith(
        market.write.listNFT([0n, 0n], { account: seller.account }),
        "Price must be greater than zero",
      );
    });

    it("rejects a caller who does not own the token", async function () {
      const { market } = await deploy();
      await viem.assertions.revertWith(
        market.write.listNFT([0n, PRICE], { account: other.account }),
        "You are not the owner",
      );
    });

    it("rejects a token that does not exist", async function () {
      const { nft, market } = await deploy();
      await viem.assertions.revertWithCustomError(
        market.write.listNFT([99n, PRICE], { account: seller.account }),
        nft,
        "ERC721NonexistentToken",
      );
    });

    it("requires approval for the marketplace", async function () {
      const { market } = await deploy();
      await viem.assertions.revertWith(
        market.write.listNFT([0n, PRICE], { account: seller.account }),
        "Marketplace is not approved",
      );
    });

    it("rejects listing the same token twice", async function () {
      const { market } = await deployListed();
      await viem.assertions.revertWith(
        market.write.listNFT([0n, PRICE], { account: seller.account }),
        "NFT already listed",
      );
    });
  });

  describe("buyNFT", function () {
    it("transfers the token, pays the seller 90% and keeps 10%", async function () {
      const { nft, market } = await deployListed();

      await viem.assertions.balancesHaveChanged(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        [
          { address: seller.account.address, amount: SELLER_AMOUNT },
          { address: market.address, amount: COMMISSION },
        ],
      );

      assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(buyer.account.address));
      assert.equal(await market.read.collectedCommission(), COMMISSION);
      assert.equal(await market.read.totalCommissionEarned(), COMMISSION);
      const [, , isActive] = await market.read.listings([0n]);
      assert.equal(isActive, false);
    });

    it("emits NFTSold", async function () {
      const { market } = await deployListed();
      await viem.assertions.emitWithArgs(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        market,
        "NFTSold",
        [0n, getAddress(seller.account.address), getAddress(buyer.account.address), PRICE],
      );
    });

    it("rounds the commission down to whole wei", async function () {
      const { nft, market } = await deploy();
      await nft.write.approve([market.address, 0n], { account: seller.account });
      await market.write.listNFT([0n, 19n], { account: seller.account });

      await viem.assertions.balancesHaveChanged(
        market.write.buyNFT([0n], { account: buyer.account, value: 19n }),
        [
          { address: seller.account.address, amount: 18n },
          { address: market.address, amount: 1n },
        ],
      );
    });

    it("rejects a token that is not listed", async function () {
      const { market } = await deploy();
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        "NFT is not for sale",
      );
    });

    it("rejects a wrong payment amount", async function () {
      const { market } = await deployListed();
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE - 1n }),
        "Incorrect payment amount",
      );
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE + 1n }),
        "Incorrect payment amount",
      );
    });

    it("forbids the seller from buying their own token", async function () {
      const { market } = await deployListed();
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: seller.account, value: PRICE }),
        "Seller cannot buy own NFT",
      );
    });

    it("rejects the sale if the seller no longer owns the token", async function () {
      const { nft, market } = await deployListed();
      await nft.write.transferFrom([seller.account.address, other.account.address, 0n], {
        account: seller.account,
      });
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        "Seller is no longer owner",
      );
    });

    it("cannot be bought twice", async function () {
      const { market } = await deployListed();
      await market.write.buyNFT([0n], { account: buyer.account, value: PRICE });
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: other.account, value: PRICE }),
        "NFT is not for sale",
      );
    });

    it("reverts everything if the seller rejects the payment", async function () {
      const { nft, market } = await deploy();
      const mock = await viem.deployContract("SellerMock", [nft.address, market.address]);
      await nft.write.transferFrom([seller.account.address, mock.address, 0n], { account: seller.account });
      await mock.write.listToken([0n, PRICE]);

      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        "Payment to seller failed",
      );

      assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(mock.address));
      assert.equal(await market.read.collectedCommission(), 0n);
      const [, , isActive] = await market.read.listings([0n]);
      assert.equal(isActive, true);
    });

    it("blocks re-entry into buyNFT from the seller", async function () {
      const { nft, market } = await deploy();
      const mock = await viem.deployContract("SellerMock", [nft.address, market.address]);
      await nft.write.transferFrom([seller.account.address, mock.address, 0n], { account: seller.account });
      await mock.write.listToken([0n, PRICE]);
      await mock.write.setReenter([true]);

      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        "Payment to seller failed",
      );
      assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(mock.address));
    });
  });

  describe("cancelListing", function () {
    it("removes the listing and emits ListingCanceled", async function () {
      const { nft, market } = await deployListed();
      await viem.assertions.emitWithArgs(
        market.write.cancelListing([0n], { account: seller.account }),
        market,
        "ListingCanceled",
        [0n],
      );
      const [, , isActive] = await market.read.listings([0n]);
      assert.equal(isActive, false);
      assert.equal(getAddress(await nft.read.ownerOf([0n])), getAddress(seller.account.address));
      await viem.assertions.revertWith(
        market.write.buyNFT([0n], { account: buyer.account, value: PRICE }),
        "NFT is not for sale",
      );
    });

    it("can only be called by the seller", async function () {
      const { market } = await deployListed();
      await viem.assertions.revertWith(
        market.write.cancelListing([0n], { account: other.account }),
        "Only seller can cancel listing",
      );
    });

    it("rejects a token that is not listed", async function () {
      const { market } = await deploy();
      await viem.assertions.revertWith(
        market.write.cancelListing([0n], { account: seller.account }),
        "NFT is not for sale",
      );
    });
  });

  describe("withdraw", function () {
    it("sends collected commission to the owner and resets it", async function () {
      const { market } = await deployListed();
      await market.write.buyNFT([0n], { account: buyer.account, value: PRICE });

      await viem.assertions.balancesHaveChanged(market.write.withdraw(), [
        { address: market.address, amount: -COMMISSION },
      ]);

      assert.equal(await market.read.collectedCommission(), 0n);
      assert.equal(await market.read.totalCommissionEarned(), COMMISSION);
      assert.equal(await publicClient.getBalance({ address: market.address }), 0n);
    });

    it("emits CommissionWithdrawn", async function () {
      const { market } = await deployListed();
      await market.write.buyNFT([0n], { account: buyer.account, value: PRICE });
      await viem.assertions.emitWithArgs(market.write.withdraw(), market, "CommissionWithdrawn", [
        getAddress(owner.account.address),
        COMMISSION,
      ]);
    });

    it("keeps the lifetime total across several withdrawals", async function () {
      const { nft, market } = await deployListed();
      await market.write.buyNFT([0n], { account: buyer.account, value: PRICE });
      await market.write.withdraw();

      await nft.write.approve([market.address, 1n], { account: seller.account });
      await market.write.listNFT([1n, PRICE], { account: seller.account });
      await market.write.buyNFT([1n], { account: buyer.account, value: PRICE });

      assert.equal(await market.read.collectedCommission(), COMMISSION);
      assert.equal(await market.read.totalCommissionEarned(), COMMISSION * 2n);
    });

    it("rejects a withdrawal when there is nothing to withdraw", async function () {
      const { market } = await deploy();
      await viem.assertions.revertWith(market.write.withdraw(), "No funds to withdraw");
    });

    it("can only be called by the owner", async function () {
      const { market } = await deployListed();
      await market.write.buyNFT([0n], { account: buyer.account, value: PRICE });
      await viem.assertions.revertWithCustomError(
        market.write.withdraw({ account: other.account }),
        market,
        "OwnableUnauthorizedAccount",
      );
    });
  });
});
