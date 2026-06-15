const proxyAddress = "0xcdA35Ce4404C50D90C09e0c618c7dbB8d92D5A6a";
const decimals = 18;

let abi = null;
let provider = null;
let signer = null;
let readContract = null;
let writeContract = null;
let toastTimer = null;
let selectedRole = null;

const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;

let currentPermissions = {
  isAdmin: false,
  isManager: false,
  isConnected: false,
  isFrozen: false
};

const connectBtn = document.getElementById("connectBtn");
const loadBtn = document.getElementById("loadBtn");

const networkBadge = document.getElementById("networkBadge");
const accountBadge = document.getElementById("accountBadge");
const walletBalance = document.getElementById("walletBalance");

const versionValue = document.getElementById("versionValue");
const nameValue = document.getElementById("nameValue");
const symbolValue = document.getElementById("symbolValue");
const treasuryValue = document.getElementById("treasuryValue");
const supplyValue = document.getElementById("supplyValue");
const treasuryBalanceValue = document.getElementById("treasuryBalanceValue");
const proxyValue = document.getElementById("proxyValue");

const treasuryBlock = treasuryValue ? treasuryValue.closest(".stat-block") : null;
const supplyBlock = supplyValue ? supplyValue.closest(".stat-block") : null;
const treasuryBalanceBlock = treasuryBalanceValue ? treasuryBalanceValue.closest(".stat-block") : null;

const whitelistCheckAddress = document.getElementById("whitelistCheckAddress");
const checkWhitelistBtn = document.getElementById("checkWhitelistBtn");
const whitelistResult = document.getElementById("whitelistResult");

const whitelistManageAddress = document.getElementById("whitelistManageAddress");
const whitelistAddBtn = document.getElementById("whitelistAddBtn");
const whitelistRemoveBtn = document.getElementById("whitelistRemoveBtn");
const massWhitelistAddresses = document.getElementById("massWhitelistAddresses");
const massWhitelistAddBtn = document.getElementById("massWhitelistAddBtn");
const massWhitelistRemoveBtn = document.getElementById("massWhitelistRemoveBtn");

const tokenomicsAddress = document.getElementById("tokenomicsAddress");
const tokenomicsAmount = document.getElementById("tokenomicsAmount");
const mintBtn = document.getElementById("mintBtn");
const burnBtn = document.getElementById("burnBtn");

const transferTo = document.getElementById("transferTo");
const transferAmount = document.getElementById("transferAmount");
const transferBtn = document.getElementById("transferBtn");

const distributeTo = document.getElementById("distributeTo");
const distributeAmount = document.getElementById("distributeAmount");
const distributeBtn = document.getElementById("distributeBtn");
const massDistributeRecipients = document.getElementById("massDistributeRecipients");
const massDistributeAmounts = document.getElementById("massDistributeAmounts");
const massDistributeBtn = document.getElementById("massDistributeBtn");

const roleInspectAddress = document.getElementById("roleInspectAddress");
const roleInspectBtn = document.getElementById("roleInspectBtn");
const roleInspectResult = document.getElementById("roleInspectResult");

const roleTargetAddress = document.getElementById("roleTargetAddress");
const roleManagerBtn = document.getElementById("roleManagerBtn");
const roleUpgraderBtn = document.getElementById("roleUpgraderBtn");
const roleFrozenBtn = document.getElementById("roleFrozenBtn");
const roleGrantBtn = document.getElementById("roleGrantBtn");
const roleRevokeBtn = document.getElementById("roleRevokeBtn");

const statusToast = document.getElementById("statusToast");
const tabButtons = document.querySelectorAll(".nav-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

proxyValue.textContent = proxyAddress;

function showStatus(message, type = "", duration = 3600) {
  statusToast.className = "status-toast";
  if (type) statusToast.classList.add(type);
  statusToast.textContent = message;
  statusToast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    statusToast.classList.remove("show");
  }, duration);
}

function shortAddress(address) {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function parseError(error) {
  if (!error) return "Unknown error";
  if (error.shortMessage) return error.shortMessage;
  if (error.reason) return error.reason;
  if (error.message) return error.message;
  return String(error);
}

function normalizeAddress(value) {
  const address = value.trim();
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return ethers.getAddress(address);
}

function parseAddressList(raw) {
  return raw
    .split(/[\n,;]/)
    .map(v => v.trim())
    .filter(Boolean)
    .map(addr => {
      if (!ethers.isAddress(addr)) {
        throw new Error(`Invalid address in list: ${addr}`);
      }
      return ethers.getAddress(addr);
    });
}

function parseAmountList(raw) {
  return raw.split(/[\n,;]/).map(v => v.trim()).filter(Boolean);
}

function ensureWriter() {
  if (!writeContract) throw new Error("Connect your wallet first.");
}

function ensureAdminAccess() {
  if (!currentPermissions.isAdmin) throw new Error("Admin role required.");
  if (currentPermissions.isFrozen) throw new Error("Frozen account cannot use admin functions.");
}

function ensureManagerAccess() {
  if (!currentPermissions.isManager) throw new Error("MANAGER_ROLE required.");
  if (currentPermissions.isFrozen) throw new Error("Frozen account cannot use manager functions.");
}

function setSelectedRole(role) {
  selectedRole = role;
  roleManagerBtn.classList.remove("active-role");
  roleUpgraderBtn.classList.remove("active-role");
  roleFrozenBtn.classList.remove("active-role");

  if (role === "manager") roleManagerBtn.classList.add("active-role");
  if (role === "upgrader") roleUpgraderBtn.classList.add("active-role");
  if (role === "frozen") roleFrozenBtn.classList.add("active-role");
}

function hideTab(tabName) {
  const tabButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  const tabPanel = document.getElementById(`tab-${tabName}`);

  if (tabButton) {
    tabButton.style.display = "none";
    tabButton.disabled = true;
    tabButton.setAttribute("aria-hidden", "true");
  }

  if (tabPanel) {
    tabPanel.classList.remove("active");
    tabPanel.style.display = "none";
  }
}

function showTab(tabName) {
  const tabButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  const tabPanel = document.getElementById(`tab-${tabName}`);

  if (tabButton) {
    tabButton.style.display = "";
    tabButton.disabled = false;
    tabButton.removeAttribute("aria-hidden");
  }

  if (tabPanel) {
    tabPanel.style.display = "";
  }
}

function activateTab(tabName) {
  const targetButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
  const targetPanel = document.getElementById(`tab-${tabName}`);

  if (!targetButton || !targetPanel) return;
  if (targetButton.disabled || targetButton.style.display === "none") return;

  tabButtons.forEach((btn) => btn.classList.remove("active"));
  tabPanels.forEach((panel) => panel.classList.remove("active"));

  targetButton.classList.add("active");
  targetPanel.classList.add("active");
}

function applyOverviewVisibility() {
  const canSeeSensitiveOverview = currentPermissions.isAdmin || currentPermissions.isManager;

  if (treasuryBlock) treasuryBlock.style.display = canSeeSensitiveOverview ? "" : "none";
  if (supplyBlock) supplyBlock.style.display = canSeeSensitiveOverview ? "" : "none";
  if (treasuryBalanceBlock) treasuryBalanceBlock.style.display = canSeeSensitiveOverview ? "" : "none";

  if (!canSeeSensitiveOverview) {
    treasuryValue.textContent = "-";
    supplyValue.textContent = "-";
    treasuryBalanceValue.textContent = "-";
  }
}

function applyAccessVisibility() {
  const adminTabs = ["whitelist", "tokenomics", "roles"];

  if (currentPermissions.isConnected && !currentPermissions.isFrozen) showTab("transfer");
  else hideTab("transfer");

  adminTabs.forEach((tab) => {
    if (currentPermissions.isAdmin) showTab(tab);
    else hideTab(tab);
  });

  if (currentPermissions.isManager && !currentPermissions.isFrozen) showTab("distribute");
  else hideTab("distribute");

  applyOverviewVisibility();

  const activeTab = document.querySelector(".nav-tab.active");
  if (!activeTab || activeTab.disabled || activeTab.style.display === "none") {
    activateTab("overview");
  }
}

async function loadAbi() {
  if (abi) return abi;
  const response = await fetch("./abi.json");
  if (!response.ok) throw new Error("Failed to load abi.json");
  abi = await response.json();
  return abi;
}

async function setupProvider() {
  if (typeof window.ethereum === "undefined") {
    throw new Error("No injected wallet detected.");
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  networkBadge.textContent = `Network: ${network.name} (${network.chainId})`;

  const code = await provider.getCode(proxyAddress);
  if (code === "0x") {
    throw new Error("No contract found at this address on the current network.");
  }

  const loadedAbi = await loadAbi();
  readContract = new ethers.Contract(proxyAddress, loadedAbi, provider);
}

async function refreshWalletBalance() {
  try {
    if (!readContract || !signer) {
      walletBalance.textContent = "Balance: -";
      return;
    }

    const address = await signer.getAddress();
    const balance = await readContract.balanceOf(address);
    walletBalance.textContent = `Balance: ${ethers.formatUnits(balance, decimals)} ICT`;
  } catch (error) {
    console.error("refreshWalletBalance error:", error);
    walletBalance.textContent = "Balance: -";
  }
}

async function refreshPermissions() {
  try {
    currentPermissions = {
      isAdmin: false,
      isManager: false,
      isConnected: !!signer,
      isFrozen: false
    };

    if (!readContract || !signer) {
      applyAccessVisibility();
      return;
    }

    const address = await signer.getAddress();
    const managerRole = await readContract.MANAGER_ROLE();

    const [isAdmin, isManager, isFrozen] = await Promise.all([
      readContract.hasRole(DEFAULT_ADMIN_ROLE, address),
      readContract.hasRole(managerRole, address),
      readContract.frozen(address)
    ]);

    currentPermissions.isAdmin = isAdmin;
    currentPermissions.isManager = isManager;
    currentPermissions.isConnected = true;
    currentPermissions.isFrozen = isFrozen;

    applyAccessVisibility();
  } catch (error) {
    console.error("refreshPermissions error:", error);
    currentPermissions = {
      isAdmin: false,
      isManager: false,
      isConnected: !!signer,
      isFrozen: false
    };
    applyAccessVisibility();
  }
}

async function inspectRoleStatus() {
  try {
    await setupProvider();

    const address = normalizeAddress(roleInspectAddress.value);
    const managerRole = await readContract.MANAGER_ROLE();
    const upgraderRole = await readContract.UPGRADER_ROLE();

    const [isAdmin, isManager, isUpgrader, isWhitelisted, isFrozen] = await Promise.all([
      readContract.hasRole(DEFAULT_ADMIN_ROLE, address),
      readContract.hasRole(managerRole, address),
      readContract.hasRole(upgraderRole, address),
      readContract.whitelist(address),
      readContract.frozen(address)
    ]);

    const labels = [];
    if (isAdmin) labels.push("Admin");
    if (isManager) labels.push("Manager");
    if (isUpgrader) labels.push("Upgrader");
    if (labels.length === 0 && isWhitelisted) labels.push("User");
    if (isFrozen) labels.push("Freezed");

    const resultText = labels.length
      ? `${address}\nStatus: ${labels.join(", ")}`
      : `${address}\nStatus: No roles / not whitelisted`;

    roleInspectResult.textContent = resultText;
    showStatus("Role status checked.", "success");
  } catch (error) {
    console.error(error);
    roleInspectResult.textContent = parseError(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function connectWallet() {
  try {
    await setupProvider();
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();

    const address = await signer.getAddress();
    accountBadge.textContent = `Wallet: ${shortAddress(address)}`;

    writeContract = new ethers.Contract(proxyAddress, abi, signer);
    await refreshWalletBalance();
    await refreshPermissions();

    showStatus("Wallet connected successfully.", "success");
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function loadContractData() {
  try {
    await setupProvider();

    const managerRole = signer ? await readContract.MANAGER_ROLE() : null;
    const signerAddress = signer ? await signer.getAddress() : null;

    let canSeeSensitiveOverview = false;

    if (signer && signerAddress) {
      const [isAdmin, isManager] = await Promise.all([
        readContract.hasRole(DEFAULT_ADMIN_ROLE, signerAddress),
        readContract.hasRole(managerRole, signerAddress)
      ]);
      canSeeSensitiveOverview = isAdmin || isManager;
    }

    const baseCalls = [
      readContract.version(),
      readContract.name(),
      readContract.symbol()
    ];

    const sensitiveCalls = canSeeSensitiveOverview
      ? [
          readContract.treasury(),
          readContract.totalSupply(),
          readContract.treasuryBalance()
        ]
      : [Promise.resolve(null), Promise.resolve(null), Promise.resolve(null)];

    const [version, name, symbol, treasury, totalSupply, treasuryBal] = await Promise.all([
      ...baseCalls,
      ...sensitiveCalls
    ]);

    versionValue.textContent = version;
    nameValue.textContent = name;
    symbolValue.textContent = symbol;
    treasuryValue.textContent = treasury ?? "-";
    supplyValue.textContent = totalSupply !== null ? ethers.formatUnits(totalSupply, decimals) : "-";
    treasuryBalanceValue.textContent = treasuryBal !== null ? ethers.formatUnits(treasuryBal, decimals) : "-";

    await refreshWalletBalance();
    await refreshPermissions();
    showStatus("Contract data refreshed.", "success");
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function checkWhitelist() {
  try {
    await setupProvider();
    const address = normalizeAddress(whitelistCheckAddress.value);
    const allowed = await readContract.whitelist(address);

    whitelistResult.textContent = allowed
      ? `${address} is whitelisted.`
      : `${address} is not whitelisted.`;

    showStatus("Whitelist check completed.", "success");
  } catch (error) {
    console.error(error);
    whitelistResult.textContent = parseError(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function addToWhitelist() {
  try {
    ensureWriter();
    ensureAdminAccess();

    const address = normalizeAddress(whitelistManageAddress.value);

    showStatus("Submitting whitelist add transaction...", "warn", 6000);
    const tx = await writeContract.addToWhitelist(address);
    showStatus(`Whitelist add submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    whitelistResult.textContent = `${address} added to whitelist.`;
    showStatus("Whitelist add confirmed.", "success");
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function removeFromWhitelist() {
  try {
    ensureWriter();
    ensureAdminAccess();

    const address = normalizeAddress(whitelistManageAddress.value);

    showStatus("Submitting whitelist remove transaction...", "warn", 6000);
    const tx = await writeContract.removeFromWhitelist(address);
    showStatus(`Whitelist remove submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    whitelistResult.textContent = `${address} removed from whitelist.`;
    showStatus("Whitelist remove confirmed.", "success");
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function massWhitelistUpdate(allowed) {
  try {
    ensureWriter();
    ensureAdminAccess();

    const addresses = parseAddressList(massWhitelistAddresses.value);
    if (!addresses.length) throw new Error("Enter at least one address for mass whitelist.");

    showStatus(`Submitting mass whitelist transaction for ${addresses.length} address(es)...`, "warn", 6500);
    const tx = await writeContract.massWhitelist(addresses, allowed);
    showStatus(`Mass whitelist submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    whitelistResult.textContent = `${addresses.length} address(es) ${allowed ? "added to" : "removed from"} whitelist.`;
    showStatus("Mass whitelist confirmed.", "success");
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function mintTokens() {
  try {
    ensureWriter();
    ensureAdminAccess();

    const address = normalizeAddress(tokenomicsAddress.value);
    const amount = tokenomicsAmount.value.trim();
    if (!amount) throw new Error("Enter an amount.");

    const parsedAmount = ethers.parseUnits(amount, decimals);
    showStatus("Submitting mint transaction...", "warn", 6000);
    const tx = await writeContract.mint(address, parsedAmount);
    showStatus(`Mint submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus("Mint confirmed.", "success");
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function burnTokens() {
  try {
    ensureWriter();
    ensureAdminAccess();

    const address = normalizeAddress(tokenomicsAddress.value);
    const amount = tokenomicsAmount.value.trim();
    if (!amount) throw new Error("Enter an amount.");

    const parsedAmount = ethers.parseUnits(amount, decimals);
    showStatus("Submitting burn transaction...", "warn", 6000);
    const tx = await writeContract.burnByAdmin(address, parsedAmount);
    showStatus(`Burn submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus("Burn confirmed.", "success");
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function transferTokens() {
  try {
    ensureWriter();

    const to = normalizeAddress(transferTo.value);
    const amount = transferAmount.value.trim();
    if (!amount) throw new Error("Enter an amount.");

    const parsedAmount = ethers.parseUnits(amount, decimals);
    showStatus("Submitting transfer transaction...", "warn", 6000);
    const tx = await writeContract.transfer(to, parsedAmount);
    showStatus(`Transfer submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus("Transfer confirmed.", "success");
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function distributeTokens() {
  try {
    ensureWriter();
    ensureManagerAccess();

    const to = normalizeAddress(distributeTo.value);
    const amount = distributeAmount.value.trim();
    if (!amount) throw new Error("Enter an amount.");

    const parsedAmount = ethers.parseUnits(amount, decimals);
    showStatus("Submitting distribute transaction...", "warn", 6000);
    const tx = await writeContract.distribute(to, parsedAmount);
    showStatus(`Distribution submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus("Distribution confirmed.", "success");
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function massDistributeTokens() {
  try {
    ensureWriter();
    ensureManagerAccess();

    const recipients = parseAddressList(massDistributeRecipients.value);
    const rawAmounts = parseAmountList(massDistributeAmounts.value);

    if (!recipients.length) throw new Error("Enter at least one recipient for mass distribute.");
    if (!rawAmounts.length) throw new Error("Enter at least one amount for mass distribute.");
    if (recipients.length !== rawAmounts.length) {
      throw new Error("Recipients count must match amounts count.");
    }

    const amounts = rawAmounts.map((amount) => {
      if (!amount) throw new Error("Amount value cannot be empty.");
      return ethers.parseUnits(amount, decimals);
    });

    showStatus(`Submitting mass distribute transaction for ${recipients.length} recipient(s)...`, "warn", 6500);
    const tx = await writeContract.massDistribute(recipients, amounts);
    showStatus(`Mass distribute submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus("Mass distribute confirmed.", "success");
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function getRoleBytes(roleName) {
  await setupProvider();
  if (roleName === "manager") return await readContract.MANAGER_ROLE();
  if (roleName === "upgrader") return await readContract.UPGRADER_ROLE();
  throw new Error("Unknown role selected.");
}

async function grantRoleAction() {
  try {
    ensureWriter();
    ensureAdminAccess();

    if (!selectedRole) throw new Error("Select a role first.");
    const target = normalizeAddress(roleTargetAddress.value);

    if (selectedRole === "frozen") {
      showStatus("Submitting freeze transaction...", "warn", 6000);
      const tx = await writeContract.freeze(target);
      showStatus(`Freeze submitted:\n${tx.hash}`, "warn", 7000);

      await tx.wait();
      showStatus(`Address frozen: ${target}.`, "success");
      await refreshPermissions();
      await loadContractData();
      return;
    }

    const roleBytes = await getRoleBytes(selectedRole);
    showStatus("Submitting grant role transaction...", "warn", 6000);
    const tx = await writeContract.grantRole(roleBytes, target);
    showStatus(`Grant submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus(`${selectedRole.toUpperCase()} role granted to ${target}.`, "success");
    await refreshPermissions();
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

async function revokeRoleAction() {
  try {
    ensureWriter();
    ensureAdminAccess();

    if (!selectedRole) throw new Error("Select a role first.");
    const target = normalizeAddress(roleTargetAddress.value);

    if (selectedRole === "frozen") {
      showStatus("Submitting unfreeze transaction...", "warn", 6000);
      const tx = await writeContract.unfreeze(target);
      showStatus(`Unfreeze submitted:\n${tx.hash}`, "warn", 7000);

      await tx.wait();
      showStatus(`Address unfrozen: ${target}.`, "success");
      await refreshPermissions();
      await loadContractData();
      return;
    }

    const roleBytes = await getRoleBytes(selectedRole);
    showStatus("Submitting revoke role transaction...", "warn", 6000);
    const tx = await writeContract.revokeRole(roleBytes, target);
    showStatus(`Revoke submitted:\n${tx.hash}`, "warn", 7000);

    await tx.wait();
    showStatus(`${selectedRole.toUpperCase()} role revoked from ${target}.`, "success");
    await refreshPermissions();
    await loadContractData();
  } catch (error) {
    console.error(error);
    showStatus(parseError(error), "error", 5000);
  }
}

function initTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled || button.style.display === "none") return;

      const target = button.dataset.tab;
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabPanels.forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`tab-${target}`).classList.add("active");
    });
  });
}

connectBtn.addEventListener("click", connectWallet);
loadBtn.addEventListener("click", loadContractData);

checkWhitelistBtn.addEventListener("click", checkWhitelist);
whitelistAddBtn.addEventListener("click", addToWhitelist);
whitelistRemoveBtn.addEventListener("click", removeFromWhitelist);
massWhitelistAddBtn.addEventListener("click", () => massWhitelistUpdate(true));
massWhitelistRemoveBtn.addEventListener("click", () => massWhitelistUpdate(false));

mintBtn.addEventListener("click", mintTokens);
burnBtn.addEventListener("click", burnTokens);

transferBtn.addEventListener("click", transferTokens);
distributeBtn.addEventListener("click", distributeTokens);
massDistributeBtn.addEventListener("click", massDistributeTokens);

roleInspectBtn.addEventListener("click", inspectRoleStatus);
roleManagerBtn.addEventListener("click", () => setSelectedRole("manager"));
roleUpgraderBtn.addEventListener("click", () => setSelectedRole("upgrader"));
roleFrozenBtn.addEventListener("click", () => setSelectedRole("frozen"));
roleGrantBtn.addEventListener("click", grantRoleAction);
roleRevokeBtn.addEventListener("click", revokeRoleAction);

window.addEventListener("load", async () => {
  initTabs();
  applyAccessVisibility();

  try {
    await loadContractData();
  } catch (error) {
    console.error(error);
  }
});

if (window.ethereum) {
  window.ethereum.on("accountsChanged", async () => {
    signer = null;
    writeContract = null;
    currentPermissions = {
      isAdmin: false,
      isManager: false,
      isConnected: false,
      isFrozen: false
    };

    accountBadge.textContent = "Wallet changed - reconnect required";
    walletBalance.textContent = "Balance: -";
    applyAccessVisibility();
    showStatus("Wallet account changed.", "warn", 4000);
    await loadContractData();
  });

  window.ethereum.on("chainChanged", async () => {
    signer = null;
    writeContract = null;
    currentPermissions = {
      isAdmin: false,
      isManager: false,
      isConnected: false,
      isFrozen: false
    };

    accountBadge.textContent = "Network changed - reconnect required";
    walletBalance.textContent = "Balance: -";
    applyAccessVisibility();
    showStatus("Network changed.", "warn", 4000);
    await loadContractData();
  });
}
