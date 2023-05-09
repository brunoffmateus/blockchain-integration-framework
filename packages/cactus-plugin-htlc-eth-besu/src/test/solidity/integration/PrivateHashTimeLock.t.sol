pragma solidity 0.8.19;

import {PrivateHashTimeLock} from "../../../main/solidity/contracts/PrivateHashTimeLock.sol";
import "forge-std/Test.sol";
import "forge-std/console2.sol";

contract PrivateHashTimeLockTest is Test {
    event newPrivateContract(
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 expiration,
        bytes32 indexed id,
        bytes32 hashSecret,
        address indexed sender,
        address indexed receiver,
        string outputNetwork,
        string outputAddress,
        PrivateHashTimeLock.PrivateEnhancing priv
    );

    bytes32 AliceSecret;
    bytes32 HashedAliceSecret;
    bytes32 Z;

    function setUp() public {
        AliceSecret = bytes32(0x0000000000000000000000000000000000000000000000000000000000000003);
        HashedAliceSecret = bytes32(0x0000000000000000000000000000000000000000000000000000000000000017);
        Z = bytes32(0x000000000000000000000000000000000000000000000000000000000000001a);
    }

    function test_Deployment() public {
        new PrivateHashTimeLock();
    }

    function test_InitializeHTLC() public {
        // 5 eth
        uint256 inputAmountEth = 5;
        uint256 outputAmount = 5000000000000000000;
        // 1/1/2030
        uint256 expiration = 1893515539;
        bytes32 hashLock = (0x0000000000000000000000000000000000000000000000000000000000000017);
        // account # 1 of anvil -a 10
        address payable receiver = payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        string memory outputNetwork = "anvil";
        string memory outputAddress = vm.toString(msg.sender);
        PrivateHashTimeLock.PrivateEnhancing memory priv =
            PrivateHashTimeLock.PrivateEnhancing({generator: 11, modulus: 109});

        PrivateHashTimeLock HtlcManager = new PrivateHashTimeLock();
        console.log("Deployed HTLC: ", address(HtlcManager));

        vm.expectCall(
            address(HtlcManager),
            5,
            abi.encodeWithSelector(
                HtlcManager.newPrivateContract.selector,
                outputAmount,
                expiration,
                hashLock,
                receiver,
                outputNetwork,
                outputAddress,
                priv
            ),
            1
        );
        //vm.expectEmit(true, true, false, true, address(HtlcManager));
        vm.recordLogs();

        HtlcManager.newPrivateContract{value: inputAmountEth}(
            outputAmount, expiration, hashLock, receiver, outputNetwork, outputAddress, priv
        );

        Vm.Log[] memory entries = vm.getRecordedLogs();

        // get contract id from event
        assertEq(entries.length, 1);
        bytes32 id = entries[0].topics[1];

        bool exists = HtlcManager.contractExists(id);
        assert(exists);

        // state is active
        assert(HtlcManager.getSingleStatus(id) == 1);
    }

    function test_ProcessSecret() public {
        // 5 eth
        uint256 inputAmountEth = 5;
        uint256 outputAmount = 5000000000000000000;
        // 1/1/2030
        uint256 expiration = 1893515539;
        bytes32 hashLock = (0x0000000000000000000000000000000000000000000000000000000000000017);
        // account # 1 of anvil -a 10
        address payable receiver = payable(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        string memory outputNetwork = "anvil";
        string memory outputAddress = vm.toString(msg.sender);
        PrivateHashTimeLock.PrivateEnhancing memory priv =
            PrivateHashTimeLock.PrivateEnhancing({generator: 11, modulus: 109});

        PrivateHashTimeLock HtlcManager = new PrivateHashTimeLock();
        vm.expectCall(
            address(HtlcManager),
            5,
            abi.encodeWithSelector(
                HtlcManager.newPrivateContract.selector,
                outputAmount,
                expiration,
                hashLock,
                receiver,
                outputNetwork,
                outputAddress,
                priv
            ),
            1
        );
        vm.recordLogs();

        HtlcManager.newPrivateContract{value: inputAmountEth}(
            outputAmount, expiration, hashLock, receiver, outputNetwork, outputAddress, priv
        );

        Vm.Log[] memory entries = vm.getRecordedLogs();

        // get contract id from event
        assertEq(entries.length, 1);
        bytes32 id = entries[0].topics[1];

        // secret is 3 decimal, hashes to 0x17
        bytes32 secret = 0x0000000000000000000000000000000000000000000000000000000000000003;

        emit log_bytes32(secret);
        emit log_uint(uint256(secret));
        HtlcManager.withdraw(id, secret);
    }

    function test_ModExp() public {
        uint256 base = 11;
        uint256 exponent = 3;
        uint256 modulus = 109;
        uint256 result = aux_calculateHashSecret(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 23);

        bytes32 modulus_bytes = bytes32(modulus);
        bytes32 base_bytes = bytes32(base);
        bytes32 exponent_bytes = bytes32(exponent);
        uint256 result2 = aux_calculateHashSecret(uint256(base_bytes), uint256(exponent_bytes), uint256(modulus_bytes));
        emit log_uint(result2);
        assert(result2 == 23);
    }

    function test_ModExpPrecompile() public {
        uint256 base = 11;
        uint256 exponent = 3;
        uint256 modulus = 109;
        uint256 result = modExp(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 23);

        bytes32 modulus_bytes = bytes32(modulus);
        bytes32 base_bytes = bytes32(base);
        bytes32 exponent_bytes = bytes32(exponent);
        uint256 result2 = modExp(uint256(base_bytes), uint256(exponent_bytes), uint256(modulus_bytes));
        emit log_uint(result2);
        assert(result2 == 23);
    }

    function test_ModExpBigMod() public {
        uint256 base = 11;
        uint256 exponent = 43;
        // looks like the highest modulus supported is 2^8 - 1
        uint256 modulus = 128;
        uint256 result = aux_calculateHashSecret(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 83);
    }


    function test_ModExpPrecompileBigMod() public {
        uint256 base = 11;
        uint256 exponent = 43;
        uint256 modulus = 128;
        uint256 result = modExp(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 83);
    }

    function test_ModExpBiggerMod() public {
        uint256 base = 11;
        uint256 exponent = 43;
        uint256 modulus = 2 ** 255;
        uint256 result = aux_calculateHashSecret(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 602400691612421918536387328824478011400331731);
    }

    function test_ModExpPrecompileBiggerMod() public {
        uint256 base = 11;
        uint256 exponent = 43;
        uint256 modulus = 2 ** 255;
        uint256 result = modExp(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 602400691612421918536387328824478011400331731);
    }

    function test_ModExpBigBase() public {
        // 2^256 - 1
        uint256 base = 2 ** 127;
        uint256 exponent = 2;
        uint256 modulus = 100;
        uint256 result = aux_calculateHashSecret(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 84);
    }

    function test_ModExpPrecompileBigBase() public {
        // 2^256 - 1
        uint256 base = 2 ** 127;
        uint256 exponent = 2;
        uint256 modulus = 100;
        uint256 result = modExp(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 84);
    }

    function test_ModExpBigExp() public {
        // 2^256 - 1
        uint256 base = 4;
        uint256 exponent = 2 ** 127;
        uint256 modulus = 100;
        uint256 result = modExp(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 36);
    }
    function test_ModExpPrecompileBigExp() public {
        // 2^256 - 1
        uint256 base = 4;
        uint256 exponent = 2 ** 127;
        uint256 modulus = 100;
        uint256 result = modExp(base, exponent, modulus);
        emit log_uint(result);
        assert(result == 36);
    }

    function aux_calculateHashSecret(uint256 base, uint256 exponent, uint256 modulus)
        internal
        view
        returns (uint256 result)
    {
        require(modulus > 0, "Modulus cannot be 0");
        require(base > 0, "base cannot be 0");
        require(exponent > 0, "exponent_1 cannot be 0");

        return (base ** exponent) % modulus;
    }

    function modExp(uint256 _b, uint256 _e, uint256 _m) public returns (uint256 result) {
        assembly {
            // Free memory pointer
            let pointer := mload(0x40)

            // Define length of base, exponent and modulus. 0x20 == 32 bytes
            mstore(pointer, 0x20)
            mstore(add(pointer, 0x20), 0x20)
            mstore(add(pointer, 0x40), 0x20)

            // Define variables base, exponent and modulus
            mstore(add(pointer, 0x60), _b)
            mstore(add(pointer, 0x80), _e)
            mstore(add(pointer, 0xa0), _m)

            // Store the result
            let value := mload(0xc0)
            
            /* 
            call: This is an assembly level function used to call an external contract function. It takes 7 arguments.

            gas: The amount of gas to use for the call. not(0) represents the maximum possible gas (since bitwise NOT of 0 gives a maximum value).

            to: The address of the contract to call. 0x05 might be the address here, but typically it's a 20-byte address.

            value: The amount of wei to send with the call. 0 is the value here, so it's a call without transferring any Ether.

            inOffset: The start of the memory area where the call data is located. pointer is the start of the data in memory.

            inSize: The size of the call data in bytes. 0xc0 is the size here.

            outOffset: The start of the memory area where the output data will be written. value is the start of the output data in memory.

            outSize: The size of the output area in bytes. 0x20 is the size here.

            iszero: Checks if the call was successful. call returns 0 on failure and 1 on success, so iszero(call(...)) will return true if the call failed and false if it succeeded.
            */
            // Call the precompiled contract 0x05 = bigModExp
            if iszero(call(not(0), 0x05, 0, pointer, 0xc0, value, 0x20)) {
                revert(0, 0)
            }

            result := mload(value)
        }
    }
}
