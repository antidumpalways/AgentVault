// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract AgentVault {
    struct Agent {
        uint256 id;
        address owner;
        uint256 vaultUuid;
        string name;
        bytes32 memoryRoot;
        uint256 createdAt;
        uint256 expiresAt;
        bool isActive;
    }

    struct Memory {
        uint256 id;
        uint256 agentId;
        bytes32 contentHash;
        string metadata;
        uint256 timestamp;
        bool exists;
    }

    uint256 public nextAgentId;
    uint256 public nextMemoryId;

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Memory) public memories;
    mapping(address => uint256[]) public userAgents;
    mapping(uint256 => mapping(address => bool)) public accessGranted;
    mapping(uint256 => uint256) public agentMemoryCount;

    event AgentCreated(
        uint256 indexed agentId,
        address indexed owner,
        uint256 vaultUuid
    );
    event MemoryStored(
        uint256 indexed agentId,
        uint256 memoryId,
        bytes32 contentHash
    );
    event AccessGranted(uint256 indexed agentId, address indexed grantee);
    event AccessRevoked(uint256 indexed agentId, address indexed grantee);

    function createAgent(string memory name, uint256 vaultUuid)
        external
        returns (uint256)
    {
        uint256 agentId = nextAgentId++;

        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            vaultUuid: vaultUuid,
            name: name,
            memoryRoot: bytes32(0),
            createdAt: block.timestamp,
            expiresAt: block.timestamp + 365 days,
            isActive: true
        });

        userAgents[msg.sender].push(agentId);
        emit AgentCreated(agentId, msg.sender, vaultUuid);

        return agentId;
    }

    function storeMemory(
        uint256 agentId,
        bytes32 contentHash,
        string memory metadata
    ) external returns (uint256) {
        require(agents[agentId].owner == msg.sender, "Not owner");
        require(agents[agentId].isActive, "Agent inactive");

        uint256 memoryId = nextMemoryId++;

        memories[memoryId] = Memory({
            id: memoryId,
            agentId: agentId,
            contentHash: contentHash,
            metadata: metadata,
            timestamp: block.timestamp,
            exists: true
        });

        agentMemoryCount[agentId]++;

        emit MemoryStored(agentId, memoryId, contentHash);

        return memoryId;
    }

    function grantAccess(uint256 agentId, address grantee) external {
        require(agents[agentId].owner == msg.sender, "Not owner");
        accessGranted[agentId][grantee] = true;
        emit AccessGranted(agentId, grantee);
    }

    function revokeAccess(uint256 agentId, address grantee) external {
        require(agents[agentId].owner == msg.sender, "Not owner");
        accessGranted[agentId][grantee] = false;
        emit AccessRevoked(agentId, grantee);
    }

    function checkAccess(uint256 agentId, address user)
        external
        view
        returns (bool)
    {
        Agent memory agent = agents[agentId];
        return agent.owner == user || accessGranted[agentId][user];
    }

    function getAgentMemoryCount(uint256 agentId)
        external
        view
        returns (uint256)
    {
        return agentMemoryCount[agentId];
    }

    function getUserAgents(address user)
        external
        view
        returns (uint256[] memory)
    {
        return userAgents[user];
    }
}
