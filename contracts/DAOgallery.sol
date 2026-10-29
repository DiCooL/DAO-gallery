// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract DAOgallery is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    event NewNFT(address indexed owner, uint256 indexed tokenId, string uri);

    constructor(address initialOwner) ERC721("DAO-gallery", "DAOG") Ownable(initialOwner) {}

    function mintNFT(address to, string calldata uri) external onlyOwner returns (uint256 tokenId) {
        require(bytes(uri).length > 0, "Empty token URI");
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit NewNFT(to, tokenId, uri);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}
