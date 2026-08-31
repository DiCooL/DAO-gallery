// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {DAOgallery} from "./DAOgallery.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is Ownable, ReentrancyGuard {

    DAOgallery public immutable nftContract;

    uint256 public constant COMMISSION_PERCENT = 10;
    uint256 public collectedCommission;

    struct Listing {
        address seller;
        uint256 price;
        bool isActive;
    }

    mapping(uint256 => Listing) public listings;

    event NFTListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );

    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );

    event ListingCanceled(
        uint256 indexed tokenId
    );

    constructor(address nftAddress, address initialOwner)
        Ownable(initialOwner)
    {
        nftContract = DAOgallery(nftAddress);
    }

    function listNFT(uint256 tokenId, uint256 price) public {

    require(price > 0, "Price must be greater than zero");

    require(
        nftContract.ownerOf(tokenId) == msg.sender,
        "You are not the owner"
    );

    require(
        !listings[tokenId].isActive,
        "NFT already listed"
    );

    require(
        nftContract.getApproved(tokenId) == address(this) ||
        nftContract.isApprovedForAll(msg.sender, address(this)),
        "Marketplace is not approved"
    );

    listings[tokenId] = Listing({
        seller: msg.sender,
        price: price,
        isActive: true
    });

    emit NFTListed(tokenId, msg.sender, price);
    }
    

    function buyNFT(uint256 tokenId) public payable nonReentrant {

    Listing storage listing = listings[tokenId];

    require(listing.isActive, "NFT is not for sale");

    require(msg.value == listing.price, "Incorrect payment amount");

    require(
        nftContract.ownerOf(tokenId) == listing.seller,
        "Seller is no longer owner"
    );

    uint256 commission = (msg.value * COMMISSION_PERCENT) / 100;
    uint256 sellerAmount = msg.value - commission;

    collectedCommission += commission;

    listing.isActive = false;

    (bool success, ) = payable(listing.seller).call{value: sellerAmount}("");
    require(success, "Payment to seller failed");

    nftContract.safeTransferFrom(
        listing.seller,
        msg.sender,
        tokenId
    );

    emit NFTSold(
        tokenId,
        listing.seller,
        msg.sender,
        msg.value
    );

    delete listings[tokenId];
    }

    function cancelListing(uint256 tokenId) public {
    Listing storage listing = listings[tokenId];

    require(listing.isActive, "NFT is not for sale");

    require(
        listing.seller == msg.sender,
        "Only seller can cancel listing"
    );

    delete listings[tokenId];

    emit ListingCanceled(tokenId);
    }

    function withdraw() public onlyOwner nonReentrant {
    uint256 amount = address(this).balance;

    require(amount > 0, "No funds to withdraw");

    (bool success, ) = payable(owner()).call{value: amount}("");
    require(success, "Withdrawal failed");
    }

}