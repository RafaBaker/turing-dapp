const fs = require("fs");
const path = require("path");
const { artifacts } = require("hardhat");

function exportFrontend(address, chainId) {
  const directory = path.join(__dirname, "../frontend/src/contracts");
  const { abi } = artifacts.readArtifactSync("Turing");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "Turing.json"), JSON.stringify({ abi }, null, 2) + "\n");
  fs.writeFileSync(
    path.join(directory, "contract-address.json"),
    JSON.stringify({ Turing: address, chainId: Number(chainId) }, null, 2) + "\n"
  );
}

module.exports = { exportFrontend };
