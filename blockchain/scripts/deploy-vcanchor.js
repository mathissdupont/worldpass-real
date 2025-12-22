const hre = require("hardhat");
const fs = require("fs");

function explorerBase(networkName) {
  if (networkName === "amoy") return "https://amoy.polygonscan.com";
  if (networkName === "mumbai") return "https://mumbai.polygonscan.com";
  return "";
}

async function main() {
  const networkName = hre.network.name;
  console.log(`\n🚀 Deploying VCAnchor to ${networkName}...\n`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance));
  if (balance === 0n) {
    throw new Error("No balance on this network. Get test MATIC first.");
  }

  const VCAnchor = await hre.ethers.getContractFactory("VCAnchor");
  const vcAnchor = await VCAnchor.deploy();
  await vcAnchor.waitForDeployment();

  const contractAddress = await vcAnchor.getAddress();
  console.log("✅ VCAnchor deployed:", contractAddress);

  const explorer = explorerBase(networkName);
  if (explorer) {
    console.log("🔗 Explorer:", `${explorer}/address/${contractAddress}`);
  }

  const out = {
    network: networkName,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  const outFile = `deployment-${networkName}.json`;
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log("📄 Saved:", outFile);

  // Backend env hint: CONTRACT_<CHAINKEY> uses chain key with '-' replaced by '_', uppercased.
  // For polygon-amoy, chain key is 'polygon-amoy' => CONTRACT_POLYGON_AMOY
  console.log("\n📋 Backend .env (example):");
  if (networkName === "amoy") {
    console.log(`CONTRACT_POLYGON_AMOY=${contractAddress}`);
  } else if (networkName === "mumbai") {
    console.log(`CONTRACT_POLYGON_MUMBAI=${contractAddress}`);
  }
  console.log("ANCHOR_MODE=real");
  console.log("DEPLOYER_PRIVATE_KEY=<same key as PRIVATE_KEY>");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
