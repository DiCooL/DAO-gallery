# NFT metadata

`0.json` and `1.json` here are the **next version** of the metadata, prepared for re-upload to IPFS. The version currently published under the CID in `DAOgallery._baseURI()` differs:

| Change | Published (`bafybeigblis3...scwve`) | This folder |
|---|---|---|
| `0.json` description | "A picture of a beautiful in the Irkutsk region" | "A picture of the beautiful Lake Baikal in the Irkutsk region" |
| Attributes | `Author`, `Author ID` | `Author`, `Author ID`, `Artwork ID` |

- `Author ID` — identifier in the planned author registry.
- `Artwork ID` — identifier of the physical painting in the foundation's records; not necessarily equal to the token ID.
- The current owner is never stored in metadata; use `ownerOf(tokenId)`.

Images: `ipfs://bafybeia6txussuxokmfsdjf6blo3duat35rkak3tcds22rvqiw2lt6kj54/0.jpg` and `1.jpg` (unchanged).

Uploading this folder to IPFS produces a new CID. `baseURI` is fixed at deployment, so the new CID must be set in `contracts/DAOgallery.sol` before the next deployment.
