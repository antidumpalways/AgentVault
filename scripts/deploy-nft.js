const { ethers } = require("hardhat");

async function main() {
  const SimpleNFT = await ethers.getContractFactory("SimpleNFT");
  const nft = await SimpleNFT.deploy();
  await nft.waitForDeployment();
  const address = await nft.getAddress();
  console.log("SimpleNFT deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
