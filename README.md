# DAO Gallery (MVP)

DAO Gallery is a prototype of an art foundation that keeps physical paintings and represents each of them with an NFT (ERC-721). The NFTs can be traded on the platform's own marketplace, which charges a commission on every sale. Later, DAO participants are expected to vote on offline exhibitions: which cities host them and which paintings are shown.

The project is at the MVP stage. The long-term goal is a real business launch.

> **Legal status.** Linking an NFT to the ownership of a physical painting is the project's business goal, not a legal fact established by the smart contracts. A token record on the blockchain does not by itself transfer ownership of a physical object. The legal structure (contracts, custody terms, how a holder claims the painting, the applicable jurisdiction) is a separate workstream and has not been finalised. Nothing in this repository is legal or investment advice.

---

## Workstreams

1. **Technical** — architecture, smart contracts, tests, deployment, database, website.
2. **Economic** — value proposition, business model, financial model, metrics.
3. **Legal** — legal qualification of the token and of the rights to the painting, business structure, documents for the Russian and foreign markets.

## Architecture

```text
physical painting
   └─ image + JSON metadata ──> IPFS (Pinata)
                                  │ tokenURI
                                  ▼
                       DAOgallery.sol (ERC-721)
                       mint, ownership, transfers
                                  │ approve / setApprovalForAll
                                  ▼
                       Marketplace.sol
                       list, buy, cancel, commission, withdraw
                                  │ events
                                  ▼
                 SQL database (mirror of on-chain events)
                                  │
                                  ▼
                 Excel financial model / Power BI dashboard
```

The blockchain is the source of truth for ownership (`ownerOf`). The database only mirrors confirmed on-chain events for analytics.

## Smart contracts

| Contract | Purpose |
|---|---|
| `DAOgallery.sol` | ERC-721 collection `DAO-gallery` (`DAOG`) with a separate metadata URI per token (`ERC721URIStorage`, ERC-4906). Only the owner can mint; `mintNFT(to, uri)` issues the next token directly to `to` and stores its `ipfs://<CID>`. Token IDs start at `0`. New paintings are added at any time without redeploying; existing tokens are not affected. |
| `Marketplace.sol` | Separate contract that works with `DAOgallery` by address. `listNFT`, `buyNFT` (payable, exact price), `cancelListing`, `withdraw` (owner only). The NFT stays with the seller until the sale. Commission is 10% in wei, the seller receives the rest. `collectedCommission` is the amount available to withdraw; `totalCommissionEarned` is the lifetime total. Events: `NFTListed`, `NFTSold`, `ListingCanceled`, `CommissionWithdrawn`. |

Toolchain: Hardhat 3, solc `0.8.33`, `@openzeppelin/contracts` `5.4.0`, optimizer enabled (200 runs). Both contracts compile without errors or warnings.

```powershell
npm install
npx hardhat test
```

### Sale flow

1. The painting's metadata is uploaded to IPFS; the owner of `DAOgallery` calls `mintNFT(author, "ipfs://<CID>")`.
2. The token holder calls `approve(marketplace, tokenId)` or `setApprovalForAll(marketplace, true)`.
3. The holder calls `listNFT(tokenId, price)`.
4. A buyer calls `buyNFT(tokenId)` with `msg.value == price`; the NFT moves to the buyer, 90% goes to the seller, 10% stays in the marketplace.
5. The marketplace owner calls `withdraw()`.

## NFT metadata (IPFS)

Each painting has its own metadata file in IPFS with its own CID; the CID is passed to `mintNFT` and stored on-chain for that token.

| Token | Metadata | Image |
|---|---|---|
| `0` — Baikal | `ipfs://bafkreigjysstc6mzugi7ro3qehfthy2733asowpeita32eb6ix3vcuqnb4` | `ipfs://bafybeia6txussuxokmfsdjf6blo3duat35rkak3tcds22rvqiw2lt6kj54/0.jpg` |
| `1` — Perm | `ipfs://bafkreiaw46h2nxh3ebqcqh4k56tjfwum674b2d5z2fbtgoefljmh6jal4y` | `ipfs://bafybeia6txussuxokmfsdjf6blo3duat35rkak3tcds22rvqiw2lt6kj54/1.jpg` |

The token ID, the painting's `Artwork ID` and the author's `Author ID` are different identifiers. The metadata does not store the current owner.

### Preview

`npx hardhat run scripts/preview-nft.ts` deploys both contracts to a local Hardhat network, mints the tokens above, runs one sale through the marketplace and writes `nft-preview/index.html` with images, attributes, owners, CIDs and transaction hashes.

## Repository contents

```text
DAO-gallery/
├── contracts/          smart contracts
├── test/               contract tests (Hardhat)
├── ignition/modules/   deployment modules (Hardhat Ignition)
├── scripts/            preview-nft.ts — local NFT preview page
├── metadata/           next version of NFT metadata for IPFS
├── database/           prototype database, schema, notes for PostgreSQL
├── economics/          financial model and business model
├── legal/              legal research questions and future documents
└── docs/               architecture; planning/ — early planning materials
```

| Path | Contents |
|---|---|
| `contracts/` | `DAOgallery.sol`, `Marketplace.sol` |
| `metadata/` | Source files of the metadata uploaded to IPFS, one file per token; see `metadata/README.md` |
| `database/` | `DAO-gallery.db` — prototype (SQLite file) with test data; `schema.sql`; target production database is PostgreSQL |
| `economics/` | `dao_gallery_financial_model.xlsx` — three scenarios, income, expenses, profit, cash flow, forecast balance (USD, 2026, monthly); all figures are forecasts |
| `legal/` | Research questions and the target list of documents |
| `docs/` | `architecture.md`; `planning/` — MVP scope, plan, structure, flowchart, DAO participation levels |
| `CLAUDE.md` | Working rules for AI-assisted development |

## Status

- [x] `DAOgallery.sol` written
- [x] `Marketplace.sol` written and fixed (commission accounting, self-purchase, call order)
- [x] Both contracts compile with solc 0.8.33 and OpenZeppelin 5.4.0
- [x] Metadata and images for tokens 0 and 1 are available in IPFS
- [x] Hardhat 3 project and 31 automated tests (success and failure paths, payment rejection, re-entry) — all passing
- [ ] Deployment to the Sepolia testnet (contract addresses will be listed here)
- [ ] End-to-end scenario: mint → approve → list → buy → commission → withdraw
- [ ] Financial model fixes (scenario switch, profit tax, one-off vs operating costs)
- [ ] Legal memorandum (Russia and selected foreign jurisdictions)

Not in the MVP: DAO voting, auctions, fractional ownership, royalties, ERC-20 payments, website and backend, automatic database sync.

## Security

The contracts have not been audited. Use testnets only. Never commit private keys, seed phrases, RPC URLs with keys or Pinata secrets.
