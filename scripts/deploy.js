const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy AgentVault
  const AgentVault = await ethers.getContractFactory("AgentVault");
  const agentVault = await AgentVault.deploy();
  await agentVault.waitForDeployment();
  const agentVaultAddress = await agentVault.getAddress();
  console.log("AgentVault deployed to:", agentVaultAddress);

  // Deploy TimeBasedReadCondition
  const TimeBasedReadCondition = await ethers.getContractFactory("TimeBasedReadCondition");
  const timeBasedCondition = await TimeBasedReadCondition.deploy();
  await timeBasedCondition.waitForDeployment();
  const timeBasedAddress = await timeBasedCondition.getAddress();
  console.log("TimeBasedReadCondition deployed to:", timeBasedAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("AgentVault:", agentVaultAddress);
  console.log("TimeBasedReadCondition:", timeBasedAddress);
  console.log("========================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
