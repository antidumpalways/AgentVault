// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ICDRReadCondition {
    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view returns (bool);
}

contract TimeBasedReadCondition is ICDRReadCondition {
    struct AccessRule {
        uint256 unlockTime;
        address authorizedUser;
        bool isTimeBased;
        bool exists;
    }

    mapping(uint32 => AccessRule) public rules;

    event RuleSet(
        uint32 indexed uuid,
        uint256 unlockTime,
        address authorizedUser,
        bool isTimeBased
    );

    function setRule(
        uint32 uuid,
        uint256 unlockTime,
        address authorizedUser,
        bool isTimeBased
    ) external {
        rules[uuid] = AccessRule({
            unlockTime: unlockTime,
            authorizedUser: authorizedUser,
            isTimeBased: isTimeBased,
            exists: true
        });

        emit RuleSet(uuid, unlockTime, authorizedUser, isTimeBased);
    }

    function checkReadCondition(
        uint32 uuid,
        bytes calldata accessAuxData,
        bytes calldata conditionData,
        address caller
    ) external view override returns (bool) {
        AccessRule memory rule = rules[uuid];

        if (!rule.exists) {
            return false;
        }

        if (rule.isTimeBased) {
            return block.timestamp >= rule.unlockTime;
        }

        return caller == rule.authorizedUser;
    }

    function getRule(uint32 uuid)
        external
        view
        returns (
            uint256 unlockTime,
            address authorizedUser,
            bool isTimeBased,
            bool exists
        )
    {
        AccessRule memory rule = rules[uuid];
        return (
            rule.unlockTime,
            rule.authorizedUser,
            rule.isTimeBased,
            rule.exists
        );
    }
}
