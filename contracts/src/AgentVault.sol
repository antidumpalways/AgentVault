// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title AgentVault — on-chain agent registry + atomic agent/memory creation
/// @notice This contract serves two purposes:
///   1. PUBLIC REGISTRY — anyone can call `registerIpForOwner(owner, ipId, vaultId)`
///      to record an (owner, ipId, vaultId) tuple. This lets external clients discover
///      which agents a wallet owns without trusting localStorage. The server uses this
///      after a successful spawn.
///   2. ATOMIC AGENT MEMORY — `createAgentAndStoreMemory(ipId, vaultId, contentHash,
///      metadata)` creates the agent entry and the initial memory reference in one tx.
///      Solves the cross-call agentId-resolution problem: the caller (the user's wallet)
///      doesn't need to know its own agentId before signing `storeMemory`. The previous
///      design (separate createAgent + storeMemory) required the server to pre-encode
///      storeMemory with `agentId = 0`, which always reverted for non-deployer users.
///
/// @dev This contract does NOT store the actual memory content — that's CDR's job.
///      It only stores a reference (contentHash + vaultId) to the encrypted CDR vault.
contract AgentVault {
    struct Agent {
        uint256 agentId;
        address ipId;            // Story IP Asset address
        uint256 vaultId;         // CDR vault id (uint32 in CDR, uint256 here)
        address owner;           // user's wallet
        bytes32 memoryRoot;      // initial memory contentHash; future: merkle root
        uint256 createdAt;
        uint256 expiresAt;       // 1 year default
        bool isActive;
    }

    struct IpInfo {
        address owner;
        uint256 agentId;
        uint256 vaultId;
        bool exists;
    }

    uint256 public nextAgentId;

    mapping(uint256 => Agent) public agents;
    mapping(address => uint256[]) public userAgentIds;  // owner -> agentIds
    mapping(address => address[]) public userIpIds;     // owner -> ipIds (registry)
    mapping(address => IpInfo) public ipInfo;           // ipId -> info

    event AgentCreated(
        uint256 indexed agentId,
        address indexed owner,
        address indexed ipId,
        uint256 vaultId
    );
    event MemoryStored(
        uint256 indexed agentId,
        address indexed ipId,
        uint256 vaultId,
        bytes32 contentHash
    );
    event IpRegistered(
        address indexed ipId,
        address indexed owner,
        uint256 vaultId,
        uint256 agentId
    );
    event AgentDeactivated(uint256 indexed agentId);

    /// @notice Atomic: create the agent entry AND record the initial memory in one tx.
    /// @dev Caller (msg.sender) becomes the agent owner. ipId must not be already
    ///      registered (one agent per IP Asset).
    function createAgentAndStoreMemory(
        address ipId,
        uint256 vaultId,
        bytes32 contentHash,
        string calldata metadata
    ) external returns (uint256 agentId) {
        require(ipId != address(0), "Invalid ipId");
        require(vaultId > 0, "Invalid vaultId");
        require(!ipInfo[ipId].exists, "IP already registered");

        agentId = nextAgentId++;

        agents[agentId] = Agent({
            agentId: agentId,
            ipId: ipId,
            vaultId: vaultId,
            owner: msg.sender,
            memoryRoot: contentHash,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + 365 days,
            isActive: true
        });

        userAgentIds[msg.sender].push(agentId);
        userIpIds[msg.sender].push(ipId);
        ipInfo[ipId] = IpInfo({
            owner: msg.sender,
            agentId: agentId,
            vaultId: vaultId,
            exists: true
        });

        // metadata is reserved for future use (e.g. encrypted pointer to off-chain
        // memory metadata). Currently unused in the frontend.
        metadata;

        emit AgentCreated(agentId, msg.sender, ipId, vaultId);
        emit MemoryStored(agentId, ipId, vaultId, contentHash);
    }

    /// @notice Registry function: record an (owner, ipId, vaultId) tuple without
    ///         creating an agent entry. The server calls this after a successful
    ///         user-signed spawn so external clients can discover the agent via
    ///         `getUserIpIds(owner)` without needing localStorage.
    /// @dev Does NOT require msg.sender == owner — anyone can register. This is
    ///      intentional: the server acts as a relayer. If a malicious party
    ///      registers a fake (owner, ipId), the `ipInfo.exists` check on the
    ///      next register or createAgentAndStoreMemory call will catch duplicates.
    function registerIpForOwner(
        address owner,
        address ipId,
        uint256 vaultId
    ) external {
        require(owner != address(0), "Invalid owner");
        require(ipId != address(0), "Invalid ipId");
        require(vaultId > 0, "Invalid vaultId");
        require(!ipInfo[ipId].exists, "IP already registered");

        ipInfo[ipId] = IpInfo({
            owner: owner,
            agentId: 0,           // no agent entry — just the registry pointer
            vaultId: vaultId,
            exists: true
        });
        userIpIds[owner].push(ipId);

        emit IpRegistered(ipId, owner, vaultId, 0);
    }

    /// @notice Mark an agent as inactive (does not delete data).
    function deactivateAgent(uint256 agentId) external {
        require(agents[agentId].owner == msg.sender, "Not owner");
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }

    // === Views ===

    function getUserAgents(address user) external view returns (uint256[] memory) {
        return userAgentIds[user];
    }

    function getUserIpIds(address user) external view returns (address[] memory) {
        return userIpIds[user];
    }

    function getIpInfo(address ipId) external view returns (IpInfo memory) {
        return ipInfo[ipId];
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return agents[agentId];
    }
}
