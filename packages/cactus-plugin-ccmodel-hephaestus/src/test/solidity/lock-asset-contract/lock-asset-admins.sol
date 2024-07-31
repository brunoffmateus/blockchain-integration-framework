// *****************************************************************************
// IMPORTANT: If you update this code then make sure to recompile
// it and update the .json file as well so that they
// remain in sync for consistent test executions.
// With that said, there shouldn't be any reason to recompile this, like ever...
// *****************************************************************************

pragma solidity >=0.7.0;
struct Asset {
  address creator;
  bool isLock;
  uint size;
}

contract LockAsset {
  mapping(string => Asset) private assets;
  mapping(string => bool) private assetExists;

  address[] private admins;
  address[] private bannedAdmins;

  // tracks admin votes in regards to contract status
  mapping(address => bool) private contractStatusVotes;
  // tracks admin votes in regards to banning admins
  mapping(address => address[]) private banAdminVotes;
  // tracks admin votes in regards to adding admins
  mapping(address => address[]) private addAdminVotes;
  
  // number of admin votes regards to the status of the contract
  uint private contractStatusVoteCount;
  bool public contractStatus;

  constructor() {
    // admins = addresses that we receive in the constructor
    // if admins.lenght less than X - GREAT, if not - BAD
    
    admins.push(msg.sender);
    // contractStatus = status;
  }

  /********************************************************/
  /*                 Security Modifiers                   */
  /********************************************************/

  modifier onlyAdmin() {
    bool isAdmin = false;
    for (uint i = 0; i < admins.length; i++) {
      if (msg.sender == admins[i]) {
        isAdmin = true;
        break;
      }
    }
    //the rest
    require(isAdmin, "Caller is not an Admin");
    _;
  }

  modifier contractIsActive() {
    require(contractStatus, "Contract is not active");
    _;
  }

  modifier contractIsNotActive() {
    require(!contractStatus, "Contract is active");
    _;
  }

  modifier banAdminConsensus(address admin) {
    require(banAdminVotes[admin].length > admins.length / 2, "Admin consensus not reached");
    _;
  }

  modifier contractStatusConsensus() {
    require(contractStatusVoteCount > admins.length / 2, "Admin consensus not reached");
    _;
  }

  /********************************************************/
  /*                 Security Functions                   */
  /********************************************************/

  // function getBridgeAdmins() public view returns (address[] memory) {
    // return admins;
  // }
  
  function isBannedAdmin(address admin) internal view returns (bool) {
    for (uint i = 0; i < bannedAdmins.length; i++) {
      if (admin == bannedAdmins[i]) {
        return true;
      }
    }
    return false;
  }

  ////// ADD ADMIN

  function addAdmin(address newAdmin) internal onlyAdmin {
    admins.push(newAdmin);
  }

  function hasVotedToAdd(address adminToAdd, address adminVoting) public view returns (bool) {
    address[] storage voters = addAdminVotes[adminToAdd];
    for (uint i = 0; i < voters.length; i++) {
      if (voters[i] == adminVoting) {
        return true;
      }
    }
    return false;
  }

  function voteAddAdmin(address admin) public onlyAdmin {
    require(!isBannedAdmin(admin), "Trying to add a previously banned admin");
    require(!hasVotedToAdd(admin, msg.sender), "Admin has already voted");
    addAdminVotes[admin].push(msg.sender);
    addAdmin(admin);
  }

  ////// BAN ADMIN

  function banAdmin(address admin) internal banAdminConsensus(admin) {
    require(!isBannedAdmin(admin), "Trying to ban a previously banned admin");
    for (uint i = 0; i < admins.length; i++) {
      if (admins[i] == admin) {
        // TODO: remove from admins
        bannedAdmins.push(admin);
        break;
      }
    }
  }
  
  function hasVotedToBan(address adminToBan, address adminVoting) private view returns (bool) {
    address[] storage voters = banAdminVotes[adminToBan];
    for (uint i = 0; i < voters.length; i++) {
      if (voters[i] == adminVoting) {
        return true;
      }
    }
    return false;
  }

  function voteBanAdmin(address admin) public onlyAdmin {
    require(!hasVotedToBan(admin, msg.sender), "Admin has already voted");
    banAdminVotes[admin].push(msg.sender);
    banAdmin(admin);
  }

  // CONTRACT

  function voteActivateContract() public onlyAdmin {
    require(!contractStatusVotes[msg.sender], "Admin has already voted");
    contractStatusVotes[msg.sender] = true;
    contractStatusVoteCount++;
    activateContract();
  }

  function activateContract() internal onlyAdmin contractIsNotActive contractStatusConsensus {
    contractStatus = true;
    resetContractStatusVotes();
  }

  function deactivateContract() public onlyAdmin contractIsActive {
    contractStatus = false;
    resetContractStatusVotes();
  }

  function resetContractStatusVotes() internal {
    for (uint i = 0; i < admins.length; i++) {
      contractStatusVotes[admins[i]] = false;
    }
    contractStatusVoteCount = 0;
  }

  /********************************************************/
  /*                  Asset Functions                     */
  /********************************************************/

  function createAsset(string calldata id, uint size) public contractIsActive {
    require(size > 0, "Asset size must be greater than zero");
    require(!assetExists[id], "Asset already exists");

    assets[id] = Asset({
      creator: msg.sender,
      isLock: false,
      size: size
    });
    assetExists[id] = true;
  }

  function lockAsset(string calldata id) public contractIsActive {
    require(assetExists[id], "Asset does not exist");
    require(msg.sender == assets[id].creator, "Only the creator can lock the asset");

    assets[id].isLock = true;
  }

  function unLockAsset(string calldata id) public contractIsActive {
    bool exists = assetExists[id];
    require(exists);

    assets[id].isLock = false;
  }

  function deleteAsset(string calldata id) public contractIsActive {
    require(assetExists[id], "Asset does not exist");
    require(assets[id].isLock, "Asset must be locked to be deleted");
    require(msg.sender == assets[id].creator, "Only the creator can delete the asset");

    delete assets[id];
    assetExists[id] = false;
  }

  function getAsset(string calldata id) public contractIsActive view returns (Asset memory) {
    return assets[id];
  }

  function isPresent(string calldata id) public contractIsActive view returns (bool) {
    return assetExists[id];
  }

  function isAssetLocked(string calldata id) public contractIsActive view returns (bool) {
    require(assetExists[id], "Asset does not exist");
    return assets[id].isLock;
  }
}
