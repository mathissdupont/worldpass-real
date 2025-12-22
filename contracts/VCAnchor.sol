// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VCAnchor
 * @dev Verifiable Credential hash anchoring (hash + IPFS CID) on an EVM chain.
 * @notice Stores VC payload hash and IPFS CID immutably; issuer can revoke.
 */
contract VCAnchor {
    struct AnchorRecord {
        bytes32 vcHash;
        string ipfsCid;
        address issuer;
        uint256 timestamp;
        bool revoked;
    }

    // vcHash => record
    mapping(bytes32 => AnchorRecord) private _anchors;

    event VCAnchored(bytes32 indexed vcHash, string ipfsCid, address indexed issuer, uint256 timestamp);
    event VCRevoked(bytes32 indexed vcHash, address indexed revoker, uint256 timestamp);

    /**
     * @notice Anchor a VC hash on-chain
     * @param vcHash SHA256 hash of the VC payload (bytes32)
     * @param ipfsCid IPFS content identifier for the encrypted payload
     */
    function anchorVC(bytes32 vcHash, string memory ipfsCid) external {
        require(vcHash != bytes32(0), "Invalid VC hash");
        require(bytes(ipfsCid).length > 0, "Invalid IPFS CID");

        AnchorRecord storage existing = _anchors[vcHash];
        require(existing.timestamp == 0, "VC already anchored");

        _anchors[vcHash] = AnchorRecord({
            vcHash: vcHash,
            ipfsCid: ipfsCid,
            issuer: msg.sender,
            timestamp: block.timestamp,
            revoked: false
        });

        emit VCAnchored(vcHash, ipfsCid, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke an anchored VC
     * @param vcHash SHA256 hash of the VC to revoke
     */
    function revokeVC(bytes32 vcHash) external {
        AnchorRecord storage record = _anchors[vcHash];
        require(record.timestamp != 0, "VC not found");
        require(record.issuer == msg.sender, "Only issuer can revoke");
        require(!record.revoked, "VC already revoked");

        record.revoked = true;
        emit VCRevoked(vcHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Read anchor metadata
     * @param vcHash SHA256 hash of the VC
     * @return exists Whether VC is anchored
     * @return revoked Whether VC is revoked
     * @return ipfsCid Stored IPFS CID
     * @return issuer Issuer address
     * @return timestamp Block timestamp when anchored
     */
    function getAnchor(bytes32 vcHash)
        external
        view
        returns (bool exists, bool revoked, string memory ipfsCid, address issuer, uint256 timestamp)
    {
        AnchorRecord memory record = _anchors[vcHash];
        exists = record.timestamp != 0;
        revoked = record.revoked;
        ipfsCid = record.ipfsCid;
        issuer = record.issuer;
        timestamp = record.timestamp;
    }
}
