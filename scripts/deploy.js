const { ethers } = require("hardhat");
const { exportFrontend } = require("./export-frontend");

async function main() {
  const turing = await ethers.deployContract("Turing");
  await turing.waitForDeployment();
  const address = await turing.getAddress();
  const { chainId } = await ethers.provider.getNetwork();

  exportFrontend(address, chainId);
  console.log("Turing implantado em:", address);
  console.log("ABI e endereço exportados para frontend/src/contracts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
