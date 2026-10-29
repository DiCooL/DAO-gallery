# Architecture

```text
physical painting
   └─ image + JSON metadata ──> IPFS (Pinata)
                                  │ tokenURI
                                  ▼
                       DAOgallery.sol (ERC-721)
                                  │ approve / setApprovalForAll
                                  ▼
                       Marketplace.sol
                                  │ events
                                  ▼
                 SQL database (PostgreSQL, mirror of events)
                                  │
                                  ▼
                 Excel financial model / Power BI dashboard
```

## Responsibilities
- `DAOgallery.sol` — minting (owner only), ownership, transfers, `tokenURI`. Token IDs start at 0; each token stores its own `ipfs://<CID>` (`ERC721URIStorage`), so new paintings are added without redeploying.
- `Marketplace.sol` — listings, payment, 10% commission in wei, withdrawal. The NFT stays with the seller until the sale; the marketplace needs approval.
- IPFS — images and metadata. Metadata never stores the owner.
- Database — off-chain records (users, artworks, authors) and a mirror of on-chain events. Ownership is always checked on-chain.
- Excel / Power BI — forecasts and analytics; forecasts and actual data are kept apart.

## Identifiers
- `tokenId` — NFT identifier on-chain.
- `Artwork ID` — physical painting in the foundation's records.
- `Author ID` — author in the planned author registry.

## Planned
DAO voting for exhibitions, website, event indexer into PostgreSQL, Power BI dashboard. Possible contract changes depending on the legal workstream: transfer restrictions, royalties (ERC-2981).
