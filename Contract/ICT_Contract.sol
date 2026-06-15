// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract InternalCommunityToken is
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    address public treasury;

    mapping(address => bool) public whitelist;
    mapping(address => bool) public frozen;

    event WhitelistUpdated(address indexed account, bool allowed);
    event BatchWhitelistUpdated(uint256 count, bool allowed);
    event FrozenUpdated(address indexed account, bool isFrozen);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Distributed(address indexed operator, address indexed fromTreasury, address indexed to, uint256 amount);
    event BatchDistributed(address indexed operator, uint256 recipientsCount, uint256 totalAmount);
    event BurnedByAdmin(address indexed from, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory name_,
        string memory symbol_,
        address admin_,
        address treasury_,
        uint256 initialSupply_
    ) public initializer {
        require(admin_ != address(0), "admin zero");
        require(treasury_ != address(0), "treasury zero");

        __ERC20_init(name_, symbol_);
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
        _grantRole(MANAGER_ROLE, admin_);

        treasury = treasury_;

        whitelist[admin_] = true;
        whitelist[treasury_] = true;

        emit WhitelistUpdated(admin_, true);
        emit WhitelistUpdated(treasury_, true);
        emit TreasuryUpdated(address(0), treasury_);

        if (initialSupply_ > 0) {
            _mint(treasury_, initialSupply_);
        }
    }
    
    function version() external pure returns (string memory) {
    return "V3";
    }
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function addToWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "zero address");
        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    function removeFromWhitelist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "zero address");
        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    function massWhitelist(address[] calldata accounts, bool allowed) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 len = accounts.length;
        require(len > 0, "empty array");

        for (uint256 i = 0; i < len; i++) {
            require(accounts[i] != address(0), "zero address");
            whitelist[accounts[i]] = allowed;
            emit WhitelistUpdated(accounts[i], allowed);
        }

        emit BatchWhitelistUpdated(len, allowed);
    }

    function freeze(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "zero address");
        frozen[account] = true;
        emit FrozenUpdated(account, true);
    }

    function unfreeze(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "zero address");
        frozen[account] = false;
        emit FrozenUpdated(account, false);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "zero address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        whitelist[newTreasury] = true;

        emit WhitelistUpdated(newTreasury, true);
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_isTransferAllowed(address(0), to), "recipient blocked");
        _mint(to, amount);
    }

    function burnByAdmin(address from, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(from != address(0), "zero address");
        require(!frozen[from], "from frozen");
        _burn(from, amount);
        emit BurnedByAdmin(from, amount);
    }

    function distribute(address to, uint256 amount) external onlyRole(MANAGER_ROLE) {
        require(_isTransferAllowed(treasury, to), "transfer blocked");
        _transfer(treasury, to, amount);
        emit Distributed(msg.sender, treasury, to, amount);
    }

    function massDistribute(address[] calldata recipients, uint256[] calldata amounts)
        external
        onlyRole(MANAGER_ROLE)
    {
        uint256 len = recipients.length;
        require(len > 0, "empty arrays");
        require(len == amounts.length, "length mismatch");

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < len; i++) {
            require(_isTransferAllowed(treasury, recipients[i]), "transfer blocked");
            _transfer(treasury, recipients[i], amounts[i]);
            totalAmount += amounts[i];
            emit Distributed(msg.sender, treasury, recipients[i], amounts[i]);
        }

        emit BatchDistributed(msg.sender, len, totalAmount);
    }

    function treasuryBalance() external view returns (uint256) {
        return balanceOf(treasury);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function _isTransferAllowed(address from, address to) internal view returns (bool) {
        if (to == address(0)) {
            return !frozen[from];
        }
        if (from == address(0)) {
            return whitelist[to] && !frozen[to];
        }
        return whitelist[from] && whitelist[to] && !frozen[from] && !frozen[to];
    }

    function _update(address from, address to, uint256 value) internal override {
        require(_isTransferAllowed(from, to), "transfer not allowed");
        super._update(from, to, value);
    }

    uint256[50] private __gap;
}
