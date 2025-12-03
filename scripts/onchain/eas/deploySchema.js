import 'dotenv/config';
import { EAS, SchemaRegistry } from 'eas-sdk';
import { ethers } from 'ethers';

const RPC_URL = process.env.RPC_URL;
const PK = process.env.WALLET_PRIVATE_KEY;
const EAS_ADDRESS = process.env.EAS_CONTRACT_ADDRESS || '0x4200000000000000000000000000000000000021';

if (!RPC_URL || !PK) {
  console.error('Missing RPC_URL or WALLET_PRIVATE_KEY in env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PK, provider);

// Schema registry
const schemaRegistryAddress = await (async () => {
  // On Polygon Amoy, EAS schema registry address can be fetched from EAS docs.
  // Fallback to known address or throw.
  return '0xA3f...';
})();

const registry = new SchemaRegistry(schemaRegistryAddress, signer);
const schema = 'bytes32 vcHash,string issuerDid,string subjectDid,bool active';

const main = async () => {
  const res = await registry.register({
    schema,
    revocable: true,
  });
  const receipt = await res.wait();
  console.log('Schema UID:', receipt.uid);
};

main().catch(e => { console.error(e); process.exit(1); });
