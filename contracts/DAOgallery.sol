// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract DAOgallery is Ownable, ERC721 {
    constructor(address initialOwner)
        ERC721("DAO-gallery", "DAOG")
        Ownable(initialOwner)
    {}

    event NewNFT(address owner, uint256 tokenId);

    uint256 private _currentTokenId;

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://bafybeigblis3mcmfwizm4hkqfrn4uvcownjecwf5reatzd6uagg43scwve/";
    }

    function mintNFT(address _to) public onlyOwner{
        _safeMint(_to, _currentTokenId);
        emit NewNFT(_to, _currentTokenId);
        _currentTokenId++;
    }

    function tokenURI(uint256 tokenId) public view override  returns (string memory) {
        _requireOwned(tokenId);

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string.concat(baseURI, Strings.toString(tokenId), ".json") : "";
    }
}