// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SimpleNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("AgentVault IP", "AVIP") {}

    function mint(address to) public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        return tokenId;
    }

    function name() public view override returns (string memory) {
        return "AgentVault IP";
    }

    function symbol() public view override returns (string memory) {
        return "AVIP";
    }
}
