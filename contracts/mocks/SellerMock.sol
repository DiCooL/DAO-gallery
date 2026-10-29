// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {DAOgallery} from "../DAOgallery.sol";
import {Marketplace} from "../Marketplace.sol";

contract SellerMock is IERC721Receiver {
    DAOgallery public immutable nft;
    Marketplace public immutable market;
    bool public reenter;

    constructor(DAOgallery _nft, Marketplace _market) {
        nft = _nft;
        market = _market;
    }

    function setReenter(bool value) external {
        reenter = value;
    }

    function listToken(uint256 tokenId, uint256 price) external {
        nft.approve(address(market), tokenId);
        market.listNFT(tokenId, price);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    receive() external payable {
        if (reenter) {
            market.buyNFT{value: msg.value}(0);
        } else {
            revert("No ETH accepted");
        }
    }
}
