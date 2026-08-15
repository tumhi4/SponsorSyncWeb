# AI Detective - On-Chain Murder Mystery dApp

A fully immersive, Web3 detective game built on **GenLayer**. Players act as investigators searching the crime scene and interrogating suspects. Validator LLMs act as the suspect NPCs, generating context-aware testimonies and clues on-chain. Players win by submitting the correct accusation (killer, weapon, and motive).

---

## 📁 Project Structure
```
├── detective_game.py       # GenLayer Intelligent Contract (Backend)
└── frontend/
    ├── index.html          # Web UI Dashboard
    ├── style.css           # Corkboard & Detective Theme Stylesheet
    └── app.js              # Web3 Client JS integrating genlayer-js SDK
```

---

## 🚀 How to Run Locally

### 1. Deploy the Contract
Deploy `detective_game.py` in GenLayer Studio using:
*   **`owner`**: Paste your active developer wallet address.
*   **`killer`**: `the butler`
*   **`weapon`**: `ornate dagger`
*   **`motive`**: `inheritance`
*   **`clues`**: `"Victim: Lord Blackwood. Suspects: the Butler, the Maid, the Doctor. Scene: Library. Clues: A silver ornate dagger is missing from the study chest; a mud stain footprint is near the window."`

*Copy the resulting contract address once deployed.*

---

### 2. Launch the Frontend UI
Because the app uses ES module imports, it must be served via a local web server (instead of double-clicking `index.html` from the files explorer).

You can launch a local server in seconds using one of the following methods in your terminal:

**Method A: Python (Built-in)**
```bash
cd frontend
python -m http.server 8000
```

**Method B: Node.js (npx)**
```bash
cd frontend
npx http-server -p 8000
```

*Open `http://localhost:8000` in your web browser.*

---

### 🎮 How to Play

1.  **Connect Wallet**: Click the **Connect Wallet** button at the top right to link your MetaMask or GenLayer wallet.
2.  **Join Case**: Paste your deployed contract address and click **Join Case**.
3.  **Investigate**:
    *   Type your action in the text box (e.g. *"I ask the maid what she was doing at 9 PM"* or *"I search the library window for clues"*).
    *   Click **Perform Investigation** to submit your action.
    *   Read the AI-generated suspect testimonies on the corkboard feed.
4.  **Accuse**: Enter your final verdict (e.g. `the butler`, `ornate dagger`, `inheritance`) and submit it to solve the mystery!
