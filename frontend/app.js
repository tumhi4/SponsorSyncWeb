import { createClient } from "https://esm.sh/genlayer-js";
import { localnet } from "https://esm.sh/genlayer-js/chains";

// Global State
let userAddress = null;
let contractAddress = "";
let readClient = null;
let writeClient = null;

// DOM Elements
const btnConnect = document.getElementById("btn-connect");
const walletAddressSpan = document.getElementById("wallet-address");
const contractAddressInput = document.getElementById("contract-address");
const btnJoin = document.getElementById("btn-join");
const playerStatusPanel = document.getElementById("player-status-panel");
const lblStatus = document.getElementById("lbl-status");
const lblAttempts = document.getElementById("lbl-attempts");
const historyFeed = document.getElementById("history-feed");
const groupAction = document.getElementById("group-action");
const txtAction = document.getElementById("txt-action");
const btnAction = document.getElementById("btn-action");
const formAccuse = document.getElementById("form-accuse");
const btnAccuse = document.getElementById("btn-accuse");
const badgeGameState = document.getElementById("badge-game-state");

// Connect Wallet
async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install a GenLayer-compatible wallet (like MetaMask) to play!");
        return;
    }
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        walletAddressSpan.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        walletAddressSpan.style.display = "inline";
        btnConnect.style.display = "none";
        btnJoin.disabled = false;
        
        // Initialize GenLayer Clients
        readClient = createClient({ chain: localnet });
        writeClient = createClient({ 
            chain: localnet,
            account: userAddress,
            provider: window.ethereum
        });

        console.log("Wallet Connected:", userAddress);
    } catch (err) {
        console.error("Connection failed:", err);
    }
}

// Join the Case
async function joinCase() {
    contractAddress = contractAddressInput.value.trim();
    if (!contractAddress.startsWith("0x")) {
        alert("Please enter a valid GenLayer contract address!");
        return;
    }

    btnJoin.disabled = true;
    btnJoin.textContent = "Checking Case...";

    try {
        // Robust Check: Verify if player has already joined the game first
        let playerProfile = null;
        try {
            playerProfile = await readClient.readContract({
                address: contractAddress,
                functionName: "get_player",
                args: [userAddress]
            });
        } catch (readErr) {
            // Player hasn't joined yet (KeyError in contract players map)
            console.log("Player not found in database. Proceeding to join...");
        }

        // If player already exists, load stats directly and bypass join transaction
        if (playerProfile && playerProfile.status) {
            console.log("Player already registered, bypassing join_game.");
            historyFeed.innerHTML = `<div class="history-item">Reconnecting to active game session...</div>`;
            await updatePlayerStats();
            return;
        }

        // Otherwise, send transaction to join
        btnJoin.textContent = "Joining Case...";
        await writeClient.connect();
        const hash = await writeClient.writeContract({
            address: contractAddress,
            functionName: "join_game",
            args: []
        });

        console.log("Join Transaction Hash:", hash);
        historyFeed.innerHTML = `<div class="history-item">Sent Join Transaction: <span style="font-family: monospace;">${hash}</span>. Awaiting consensus...</div>`;
        
        // Polling to wait for finalization and fetch player stats
        setTimeout(updatePlayerStats, 5000);
    } catch (err) {
        console.error("Join failed:", err);
        btnJoin.disabled = false;
        btnJoin.textContent = "Join Case";
        alert("Transaction failed! Ensure the contract address is correct and you are on the right network.");
    }
}

// Update UI stats from the contract state
async function updatePlayerStats() {
    if (!readClient || !contractAddress) return;

    try {
        const playerProfile = await readClient.readContract({
            address: contractAddress,
            functionName: "get_player",
            args: [userAddress]
        });

        console.log("Player Profile Loaded:", playerProfile);

        // Display panel
        playerStatusPanel.style.display = "flex";
        lblStatus.textContent = playerProfile.status;
        lblAttempts.textContent = playerProfile.attempts_remaining.toString();
        
        // Show/hide game panels based on game status
        if (playerProfile.status === "ACTIVE") {
            groupAction.style.display = "flex";
            formAccuse.style.display = "flex";
            badgeGameState.className = "status-badge active";
            badgeGameState.textContent = "Unsolved Case";
        } else if (playerProfile.status === "SOLVED") {
            groupAction.style.display = "none";
            formAccuse.style.display = "none";
            badgeGameState.className = "status-badge solved";
            badgeGameState.textContent = "CASE SOLVED";
        } else {
            groupAction.style.display = "none";
            formAccuse.style.display = "none";
            badgeGameState.className = "status-badge failed";
            badgeGameState.textContent = "CASE FAILED";
        }

        // Render history log feed
        const historyList = JSON.parse(playerProfile.history_json || "[]");
        if (historyList.length === 0) {
            historyFeed.innerHTML = `<div class="history-item">No clues found yet. Ask a suspect or search a room.</div>`;
        } else {
            historyFeed.innerHTML = "";
            historyList.forEach(item => {
                const parts = item.split(" | A: ");
                const qText = parts[0].replace("Q: ", "");
                const aText = parts[1] || "";

                const qDiv = document.createElement("div");
                qDiv.className = "history-item player-question";
                qDiv.textContent = `🕵️‍♂️ Action: ${qText}`;
                
                const aDiv = document.createElement("div");
                aDiv.className = "history-item ai-testimony";
                aDiv.textContent = `📋 Result: ${aText}`;

                historyFeed.appendChild(qDiv);
                historyFeed.appendChild(aDiv);
            });
            // Scroll to bottom
            historyFeed.scrollTop = historyFeed.scrollHeight;
        }

        btnJoin.style.display = "none";
        contractAddressInput.disabled = true;
    } catch (err) {
        console.error("Failed to load player stats:", err);
    }
}

// Submit Investigation Action
async function submitAction() {
    const actionText = txtAction.value.trim();
    if (!actionText) {
        alert("Please describe your investigation action!");
        return;
    }

    btnAction.disabled = true;
    btnAction.textContent = "Investigating...";

    try {
        await writeClient.connect();
        const hash = await writeClient.writeContract({
            address: contractAddress,
            functionName: "investigate",
            args: [actionText]
        });

        console.log("Action Transaction Hash:", hash);
        txtAction.value = "";
        
        // Append temporary loading element
        const loadDiv = document.createElement("div");
        loadDiv.className = "history-item player-question";
        loadDiv.style.opacity = "0.7";
        loadDiv.textContent = `🕵️‍♂️ Action sent: "${actionText}". Awaiting AI consensus...`;
        historyFeed.appendChild(loadDiv);
        historyFeed.scrollTop = historyFeed.scrollHeight;

        // Poll for updates
        setTimeout(async () => {
            await updatePlayerStats();
            btnAction.disabled = false;
            btnAction.textContent = "Perform Investigation";
        }, 8000);
    } catch (err) {
        console.error("Action failed:", err);
        btnAction.disabled = false;
        btnAction.textContent = "Perform Investigation";
        alert("Transaction failed! Ensure you are in the active case.");
    }
}

// Submit Final Accusation
async function submitAccusation() {
    const killerVal = document.getElementById("accused-killer").value.trim();
    const weaponVal = document.getElementById("accused-weapon").value.trim();
    const motiveVal = document.getElementById("accused-motive").value.trim();

    if (!killerVal || !weaponVal || !motiveVal) {
        alert("Please fill in all three fields!");
        return;
    }

    btnAccuse.disabled = true;
    btnAccuse.textContent = "Submitting Verdict...";

    try {
        await writeClient.connect();
        const hash = await writeClient.writeContract({
            address: contractAddress,
            functionName: "accuse",
            args: [killerVal, weaponVal, motiveVal]
        });

        console.log("Accuse Transaction Hash:", hash);

        setTimeout(async () => {
            await updatePlayerStats();
            btnAccuse.disabled = false;
            btnAccuse.textContent = "Submit Final Accusation";
            
            // Reload status badge comparison
            const finalProfile = await readClient.readContract({
                address: contractAddress,
                functionName: "get_player",
                args: [userAddress]
            });
            if (finalProfile.status === "SOLVED") {
                alert("CONGRATULATIONS! You solved the mystery!");
            } else if (finalProfile.status === "FAILED") {
                alert("GAME OVER! You failed to solve the case.");
            } else {
                alert("Accusation was INCORRECT! Try again. Attempts remaining: " + finalProfile.attempts_remaining);
            }
        }, 6000);
    } catch (err) {
        console.error("Accusation failed:", err);
        btnAccuse.disabled = false;
        btnAccuse.textContent = "Submit Final Accusation";
        alert("Accusation transaction failed.");
    }
}

// Event Listeners
btnConnect.addEventListener("click", connectWallet);
btnJoin.addEventListener("click", joinCase);
btnAction.addEventListener("click", submitAction);
btnAccuse.addEventListener("click", submitAccusation);
