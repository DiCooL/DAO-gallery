# CLAUDE.md — DAO-Gallery

## Project
DAO-Gallery is an art foundation that keeps physical paintings and represents each with an ERC-721 NFT, plus its own marketplace with a 10% commission, offline exhibitions and, later, DAO voting. Goal: a real business launch; current stage: MVP. See `README.md` for architecture and status.

Three workstreams: technical, economic, legal. When a task touches one, note any effect on the others (for example, a legal requirement to restrict transfers changes the contracts).

## Communication
- Talk to the owner in Russian, informally («ты»), briefly, without emoji.
- Explain solutions at the level of the idea, not basics. When changing something, say briefly why.
- Never invent facts, links, laws, numbers or library APIs. If data is missing, ask; if you make an assumption, label it.

## Hard rules
- Never delete files or folders. No exceptions.
- Propose edits and wait for approval before changing files.
- Propose commands and tests first and wait for confirmation before running them.
- Give shell commands for Windows (PowerShell).
- No comments in code (Solidity, JavaScript, Python and others).
- Commit messages in English.
- Never commit private keys, seed phrases, RPC URLs with keys, Pinata secrets or `.env` files.
- Deploy to testnets only until there is an audit.

## Layout
- Repository root is a Hardhat 3 project: `contracts/`, `test/`, `ignition/modules/`, `hardhat.config.ts`.
- `metadata/` — NFT metadata for IPFS; `database/` — prototype DB and schema; `economics/` — financial and business model; `legal/` — legal research and documents; `docs/` — architecture and planning materials.
- The owner's local working copy is `D:\forClaude\DAO-gallery`; tests run there.

## Technical conventions
- Solidity `^0.8.33`, OpenZeppelin Contracts 5.x (last verified with 5.4.0). Use the 5.x API (`Ownable(initialOwner)`, `_requireOwned`).
- `DAOgallery.sol`: minting and ownership only. `mintNFT` is `onlyOwner`, token IDs start at 0, `tokenURI = baseURI + id + ".json"`, base URI is fixed at deployment.
- `Marketplace.sol`: separate contract, no ERC-721 inheritance; works through approval. Amounts are in wei. `collectedCommission` is withdrawable, `totalCommissionEarned` is lifetime.
- In functions that move value: checks → state changes → external calls; send ETH with `call` and check the result; use `nonReentrant`.
- Code is not done until it compiles and has tests covering success and failure paths.
- Changing metadata changes the IPFS CID and therefore requires a new `DAOgallery` deployment.
- The blockchain is the source of truth for ownership; the SQL database (target: PostgreSQL) only mirrors events.

## Economic and legal work
- Separate forecasts from actual data, one-off investments from operating costs, profit tax from taxes on revenue.
- Ownership of a physical painting through an NFT is a goal, not an established legal fact. Treat Russian and foreign law separately and cite only norms that can be checked in official sources.
