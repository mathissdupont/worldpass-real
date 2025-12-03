import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { EAS, SchemaEncoder } from 'eas-sdk';
import { ethers } from 'ethers';

const app = express();
app.use(cors());
app.use(express.json());

const RPC_URL = process.env.RPC_URL;
const PK = process.env.WALLET_PRIVATE_KEY;
const EAS_ADDRESS = process.env.EAS_CONTRACT_ADDRESS || '0x4200000000000000000000000000000000000021';
const SCHEMA_UID = process.env.SCHEMA_UID; // fill after deploy

if (!RPC_URL || !PK) {
  console.error('Missing RPC_URL or WALLET_PRIVATE_KEY in env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PK, provider);
const eas = new EAS(EAS_ADDRESS, signer);

// Schema: bytes32 vcHash, string issuerDid, string subjectDid, bool active
const schemaEncoder = new SchemaEncoder('bytes32 vcHash,string issuerDid,string subjectDid,bool active');

app.post('/attest', async (req, res) => {
  try {
    const { vcHash, issuerDid, subjectDid, active = true } = req.body || {};
    if (!SCHEMA_UID) return res.status(400).json({ error: 'SCHEMA_UID not set' });
    if (!vcHash || !issuerDid || !subjectDid) {
      return res.status(400).json({ error: 'vcHash, issuerDid, subjectDid required' });
    }

    const encodedData = schemaEncoder.encodeData([
      { name: 'vcHash', type: 'bytes32', value: vcHash },
      { name: 'issuerDid', type: 'string', value: issuerDid },
      { name: 'subjectDid', type: 'string', value: subjectDid },
      { name: 'active', type: 'bool', value: Boolean(active) },
    ]);

    const tx = await eas.attest({
      schema: SCHEMA_UID,
      data: {
        recipient: signer.address,
        expirationTime: 0n, // no expiry
        revocable: true,
        refUID: '0x'.padEnd(66, '0'),
        data: encodedData,
      },
    });

    const receipt = await tx.wait();
    const uid = receipt.uid;
    return res.json({ uid, txHash: receipt.transactionHash, blockNumber: receipt.blockNumber });
  } catch (e) {
    console.error('attest error', e);
    return res.status(500).json({ error: e.message });
  }
});

app.post('/revoke', async (req, res) => {
  try {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const tx = await eas.revoke({ uid });
    const receipt = await tx.wait();
    return res.json({ txHash: receipt.transactionHash, blockNumber: receipt.blockNumber });
  } catch (e) {
    console.error('revoke error', e);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/resolve/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const att = await eas.getAttestation(uid);
    return res.json(att);
  } catch (e) {
    console.error('resolve error', e);
    return res.status(500).json({ error: e.message });
  }
});

const port = Number(process.env.PORT || 5055);
app.listen(port, () => console.log(`EAS service listening on :${port}`));
