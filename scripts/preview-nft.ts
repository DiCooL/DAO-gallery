import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { network } from "hardhat";
import { formatEther, parseEther } from "viem";

const TOKEN_URIS = [
  "ipfs://bafkreigjysstc6mzugi7ro3qehfthy2733asowpeita32eb6ix3vcuqnb4",
  "ipfs://bafkreiaw46h2nxh3ebqcqh4k56tjfwum674b2d5z2fbtgoefljmh6jal4y",
];

const GATEWAYS = ["https://ipfs.io/ipfs/", "https://dweb.link/ipfs/", "https://gateway.pinata.cloud/ipfs/"];

const OUTPUT_DIR = "nft-preview";

type Attribute = { trait_type: string; value: string };
type Metadata = { name: string; description: string; image: string; attributes?: Attribute[] };

async function fetchIpfs(uri: string): Promise<{ response: Response; url: string }> {
  const cidPath = uri.replace("ipfs://", "");
  const errors: string[] = [];
  for (const gateway of GATEWAYS) {
    const url = gateway + cidPath;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (response.ok) {
        return { response, url };
      }
      errors.push(`${url}: HTTP ${response.status}`);
    } catch (error) {
      errors.push(`${url}: ${String(error)}`);
    }
  }
  throw new Error(`Cannot fetch ${uri}\n${errors.join("\n")}`);
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cidOf(uri: string): string {
  return uri.replace("ipfs://", "").split("/")[0];
}

const { viem } = await network.create();
const publicClient = await viem.getPublicClient();
const [owner, author, buyer] = await viem.getWalletClients();
const chainId = await publicClient.getChainId();

const nft = await viem.deployContract("DAOgallery", [owner.account.address]);
const market = await viem.deployContract("Marketplace", [nft.address, owner.account.address]);

const mintTx: `0x${string}`[] = [];
for (const uri of TOKEN_URIS) {
  const hash = await nft.write.mintNFT([author.account.address, uri]);
  await publicClient.waitForTransactionReceipt({ hash });
  mintTx.push(hash);
}

const price = parseEther("1");
const approveTx = await nft.write.approve([market.address, 0n], { account: author.account });
await publicClient.waitForTransactionReceipt({ hash: approveTx });
const listTx = await market.write.listNFT([0n, price], { account: author.account });
await publicClient.waitForTransactionReceipt({ hash: listTx });
const buyTx = await market.write.buyNFT([0n], { account: buyer.account, value: price });
const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyTx });

const cards: string[] = [];
for (let i = 0; i < TOKEN_URIS.length; i++) {
  const tokenId = BigInt(i);
  const tokenUri = await nft.read.tokenURI([tokenId]);
  const currentOwner = await nft.read.ownerOf([tokenId]);
  const { response: metaResponse, url: metaUrl } = await fetchIpfs(tokenUri);
  const metadata = (await metaResponse.json()) as Metadata;
  const { response: imageResponse, url: imageUrl } = await fetchIpfs(metadata.image);
  const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
  const imageBytes = Buffer.from(await imageResponse.arrayBuffer());
  const dataUri = `data:${contentType};base64,${imageBytes.toString("base64")}`;
  const ownerLabel =
    currentOwner.toLowerCase() === buyer.account.address.toLowerCase()
      ? "buyer"
      : currentOwner.toLowerCase() === author.account.address.toLowerCase()
        ? "author"
        : "";

  const attributes = (metadata.attributes ?? [])
    .map((a) => `<div class="kv"><span>${escapeHtml(a.trait_type)}</span><b>${escapeHtml(a.value)}</b></div>`)
    .join("");

  const sale =
    i === 0
      ? `<div class="sale"><div class="kv"><span>Last sale</span><b>${formatEther(price)} ETH</b></div>
         <div class="kv"><span>Seller received</span><b>${formatEther((price * 90n) / 100n)} ETH</b></div>
         <div class="kv"><span>Commission</span><b>${formatEther((price * 10n) / 100n)} ETH</b></div>
         <div class="hash"><span>Sale tx</span><code>${buyTx}</code></div></div>`
      : `<div class="sale muted">Not sold yet</div>`;

  cards.push(`
  <article class="card">
    <img src="${dataUri}" alt="${escapeHtml(metadata.name)}">
    <div class="body">
      <div class="title"><h2>${escapeHtml(metadata.name)}</h2><span class="id">#${i}</span></div>
      <p>${escapeHtml(metadata.description)}</p>
      <div class="grid">${attributes}
        <div class="kv"><span>Owner</span><b title="${currentOwner}">${currentOwner.slice(0, 6)}…${currentOwner.slice(-4)} ${ownerLabel ? `(${ownerLabel})` : ""}</b></div>
      </div>
      ${sale}
      <div class="hashes">
        <div class="hash"><span>Metadata CID</span><code>${cidOf(tokenUri)}</code></div>
        <div class="hash"><span>Image CID</span><code>${escapeHtml(metadata.image.replace("ipfs://", ""))}</code></div>
        <div class="hash"><span>Mint tx</span><code>${mintTx[i]}</code></div>
      </div>
      <div class="links"><a href="${metaUrl}">metadata</a><a href="${imageUrl}">image</a></div>
    </div>
  </article>`);
}

const generated = new Date().toISOString().replace("T", " ").slice(0, 19);
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DAO-Gallery NFT preview</title>
<style>
:root{--bg:#f6f4ef;--card:#fff;--ink:#1d1b18;--muted:#6f6a61;--line:#e4dfd5;--accent:#8a5a2b}
@media (prefers-color-scheme:dark){:root{--bg:#141311;--card:#1d1b18;--ink:#eee9df;--muted:#a39d92;--line:#33302b;--accent:#d8a46a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Georgia,"Times New Roman",serif}
header{max-width:1100px;margin:0 auto;padding:40px 20px 16px}
h1{font-size:34px;margin:0 0 6px;letter-spacing:.5px}
.sub{color:var(--muted);font-family:system-ui,sans-serif;font-size:13px}
.chain{max-width:1100px;margin:0 auto;padding:0 20px 8px;display:flex;flex-wrap:wrap;gap:8px 24px;font-family:system-ui,sans-serif;font-size:12px;color:var(--muted)}
.chain code{color:var(--ink)}
main{max-width:1100px;margin:0 auto;padding:16px 20px 60px;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}
.card{background:var(--card);border:1px solid var(--line);border-radius:6px;overflow:hidden}
.card img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;border-bottom:1px solid var(--line)}
.body{padding:18px 20px 20px}
.title{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h2{margin:0;font-size:24px}
.id{font-family:system-ui,sans-serif;color:var(--accent);font-weight:600}
p{color:var(--muted);margin:6px 0 14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
.kv{border:1px solid var(--line);border-radius:4px;padding:6px 10px;font-family:system-ui,sans-serif}
.kv span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
.kv b{font-size:14px;font-weight:600;word-break:break-all}
.sale{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px}
.sale .hash{grid-column:1/-1}
.sale.muted{display:block;color:var(--muted);font-family:system-ui,sans-serif;font-size:13px}
.hash{font-family:system-ui,sans-serif;font-size:11px;margin-top:6px}
.hash span{display:block;text-transform:uppercase;letter-spacing:.6px;color:var(--muted)}
.hash code{font-size:11.5px;word-break:break-all;color:var(--ink)}
.links{margin-top:12px;display:flex;gap:16px;font-family:system-ui,sans-serif;font-size:13px}
.links a{color:var(--accent)}
footer{max-width:1100px;margin:0 auto;padding:0 20px 40px;color:var(--muted);font-family:system-ui,sans-serif;font-size:12px}
</style>
</head>
<body>
<header>
  <h1>DAO-Gallery</h1>
  <div class="sub">NFT preview from a local Hardhat network. Test data only, tokens have no value.</div>
</header>
<section class="chain">
  <div>Chain ID <code>${chainId}</code></div>
  <div>DAOgallery <code>${nft.address}</code></div>
  <div>Marketplace <code>${market.address}</code></div>
  <div>Sale block <code>${buyReceipt.blockNumber}</code></div>
  <div>Commission collected <code>${formatEther(await market.read.collectedCommission())} ETH</code></div>
</section>
<main>${cards.join("")}
</main>
<footer>Generated ${generated} UTC. The local network is reset after the script ends, so addresses and transaction hashes change on every run; IPFS CIDs do not.</footer>
</body>
</html>`;

await mkdir(OUTPUT_DIR, { recursive: true });
const outputFile = path.join(OUTPUT_DIR, "index.html");
await writeFile(outputFile, html, "utf8");
console.log(`Preview written to ${path.resolve(outputFile)}`);
