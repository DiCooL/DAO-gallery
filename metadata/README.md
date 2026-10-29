# NFT metadata

One JSON file per token. Each file is uploaded to IPFS on its own and gets its own CID; the CID is passed to `mintNFT(to, "ipfs://<CID>")` and stored on-chain for that token. New paintings are added as new files, existing ones are never changed.

| File | Token | CID |
|---|---|---|
| `0.json` | 0 — Baikal | `bafkreigjysstc6mzugi7ro3qehfthy2733asowpeita32eb6ix3vcuqnb4` |
| `1.json` | 1 — Perm | `bafkreiaw46h2nxh3ebqcqh4k56tjfwum674b2d5z2fbtgoefljmh6jal4y` |

Attributes:
- `Author` — author's name.
- `Author ID` — identifier in the planned author registry.
- `Artwork ID` — identifier of the physical painting in the foundation's records; not necessarily equal to the token ID.

The current owner is never stored in metadata; use `ownerOf(tokenId)`.

The CID is a hash of the file content, so any edit produces a new CID. A token keeps the CID it was minted with.

Images: `ipfs://bafybeia6txussuxokmfsdjf6blo3duat35rkak3tcds22rvqiw2lt6kj54/0.jpg` and `1.jpg`.

The earlier folder version (`bafybeigblis3mcmfwizm4hkqfrn4uvcownjecwf5reatzd6uagg43scwve`, without `Artwork ID`) is no longer used by the contract.
