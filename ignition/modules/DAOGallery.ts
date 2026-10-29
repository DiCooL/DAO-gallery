import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("DAOGalleryModule", (m) => {
  const owner = m.getAccount(0);
  const nft = m.contract("DAOgallery", [owner]);
  const marketplace = m.contract("Marketplace", [nft, owner]);
  return { nft, marketplace };
});
