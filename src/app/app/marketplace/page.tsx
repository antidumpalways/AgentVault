'use client'
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react'
import { useAppStore } from '@/hooks/useAppStore'
import { useWallet } from '@/hooks/useWallet'
import { showToast } from '@/components/Toast'

type ListingType = 'decision' | 'insight' | 'conversation'

interface Listing {
  id: string
  title: string
  seller: string
  agentId: string
  type: ListingType
  price: number
  sales: number
  rating: number
  description: string
  ipId: string
  // True when the listing is a real on-chain IP that the user (or deployer)
  // controls. False when it's demo/dummy data with a mock IP.
  isUserListing: boolean
}

const DEMO_LISTINGS: Listing[] = [
  {
    id: 'demo-list-001',
    title: 'Market Analysis Decision Pattern',
    seller: 'Research Agent #47',
    agentId: 'agent-research-01',
    type: 'decision',
    price: 0.50,
    sales: 234,
    rating: 4.8,
    description: 'High-accuracy market analysis methodology used by research agents',
    ipId: '0x000000000000000000000000000000000000dEmo',
    isUserListing: false,
  },
  {
    id: 'demo-list-002',
    title: 'Risk Assessment Framework',
    seller: 'Trading Bot #12',
    agentId: 'agent-trader-42',
    type: 'insight',
    price: 1.20,
    sales: 189,
    rating: 4.9,
    description: 'Proven risk evaluation system with 87% accuracy rate',
    ipId: '0x000000000000000000000000000000000000dEmo',
    isUserListing: false,
  },
  {
    id: 'demo-list-003',
    title: 'User Conversation Patterns',
    seller: 'Chat Assistant #8',
    agentId: 'agent-chat-08',
    type: 'conversation',
    price: 0.25,
    sales: 412,
    rating: 4.6,
    description: 'Conversation flows and user interaction patterns',
    ipId: '0x000000000000000000000000000000000000dEmo',
    isUserListing: false,
  },
  {
    id: 'demo-list-004',
    title: 'Data Processing Pipeline',
    seller: 'Analytics Engine #3',
    agentId: 'agent-analytics-03',
    type: 'decision',
    price: 2.00,
    sales: 67,
    rating: 4.9,
    description: 'Optimized data processing and transformation workflow',
    ipId: '0x000000000000000000000000000000000000dEmo',
    isUserListing: false,
  },
]

function listingToView(l: ReturnType<typeof useAppStore>['marketListings'][number]): Listing {
  return {
    id: l.id,
    title: l.title,
    seller: l.agentName,
    agentId: l.agentId || l.id,
    type: l.type,
    price: parseFloat(l.priceIp) || 0,
    sales: l.sales,
    rating: l.rating,
    description: l.description,
    ipId: l.ipId,
    isUserListing: l.isUserListing,
  };
}

export default function MarketplacePage() {
  const { marketListings, removeMarketListing } = useAppStore();
  const { address, isConnected, connect } = useWallet();
  const [showPurchaseModal, setShowPurchaseModal] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [purchaseResult, setPurchaseResult] = useState<{
    listingId: string;
    txHash?: string;
    licenseTokenId?: string;
    ipId: string;
    error?: string;
  } | null>(null)
  const [purchasing, setPurchasing] = useState(false)

  const userListings: Listing[] = marketListings.map(listingToView);
  const allListings: Listing[] = [...userListings, ...DEMO_LISTINGS];
  const visibleListings = filter === 'all'
    ? allListings
    : allListings.filter((l) => l.type === filter);

  // Use the user listing that the purchase modal is for, otherwise fall back to demo data.
  const findListing = (id: string) => allListings.find((l) => l.id === id);

  return (
    <div className="space-y-8">
      {/* COMPREHENSIVE INFO — explains the licensing model + how purchase works */}
      <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] text-[#00d9ff] tracking-widest mb-2">HOW THE MARKETPLACE WORKS</div>
            <h2 className="font-display text-2xl text-[#f2ede6] mb-3">TRADE ACCESS, NOT OWNERSHIP</h2>
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed max-w-3xl">
              Every listing represents a <span className="text-[#f2ede6]">Story Protocol IP Asset</span> (a registered
              on-chain intellectual property). Purchasing a listing does <span className="text-[#f2ede6]">not</span> transfer
              IP ownership. Instead, the buyer receives a <span className="text-[#f2ede6]">license token</span> (ERC-721)
              minted by the IP owner. The license authorizes the buyer to{' '}
              <span className="text-[#f2ede6]">decrypt and read</span> the agent's memories stored in CDR — they get
              access, the IP owner keeps ownership and continues to earn royalties from any derivative works.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="font-mono text-[10px] tracking-widest border border-[#1e1e1e] text-[#5a5a5a] px-3 py-2 hover:border-[#00d9ff]/50 hover:text-[#00d9ff] transition-colors flex-shrink-0"
          >
            FULL DETAILS →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="border border-[#1e1e1e] p-3">
            <div className="font-mono text-[10px] text-[#00d9ff] tracking-widest mb-1">1. LIST</div>
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
              IP owner lists their agent's memory access. Sets a price and the PIL license terms.
            </p>
          </div>
          <div className="border border-[#1e1e1e] p-3">
            <div className="font-mono text-[10px] text-[#00d9ff] tracking-widest mb-1">2. PURCHASE</div>
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
              Buyer signs a wallet tx. <code className="text-[#f2ede6]">mintLicenseTokens</code> mints a license token
              to buyer's wallet. The license is non-transferable.
            </p>
          </div>
          <div className="border border-[#1e1e1e] p-3">
            <div className="font-mono text-[10px] text-[#00d9ff] tracking-widest mb-1">3. RECALL</div>
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
              Buyer can now <code className="text-[#f2ede6]">/app/brain</code> recall any memory of the IP — DKG
              validators decrypt on demand.
            </p>
          </div>
        </div>
      </div>

      {/* DEMO BADGE for placeholder listings */}
      {userListings.length === 0 && (
        <div className="border border-[#f59e0b]/40 bg-[#f59e0b]/5 p-4 flex items-start gap-3">
          <div className="w-6 h-6 border border-[#f59e0b] flex items-center justify-center font-mono text-[#f59e0b] text-sm flex-shrink-0">!</div>
          <div>
            <div className="font-mono text-[10px] text-[#f59e0b] tracking-widest mb-1">DUMMY LISTINGS</div>
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
              The listings below use mock IPs — they show the UI and flow but the on-chain transaction will
              revert (the IP does not exist on Aeneid). To trade a <span className="text-[#f2ede6]">real</span> IP,
              spawn an agent at <a href="/app/spawn" className="text-[#00d9ff] hover:underline">/app/spawn</a> and
              list it from <a href="/app/vaults" className="text-[#00d9ff] hover:underline">/app/vaults</a>.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">KNOWLEDGE MARKETPLACE</h1>
        <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">BUY LICENSE TO ACCESS AGENT MEMORY</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['all', 'decision', 'insight', 'conversation'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`font-mono text-[10px] tracking-widest px-4 py-2 border transition-colors ${
              filter === type
                ? 'bg-[#00d9ff] text-[#0a0e27] border-[#00d9ff]'
                : 'border-[#1e1e1e] text-[#f2ede6] hover:border-[#00d9ff]/50'
            }`}
          >
            {type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-2 gap-6">
        {visibleListings.map((listing) => (
          <div
            key={listing.id}
            className={`border bg-[#0e0e0e] p-6 hover:border-[#00d9ff]/50 transition-colors flex flex-col ${
              listing.isUserListing ? 'border-[#a78bfa]/40' : 'border-[#1e1e1e]'
            }`}
          >
            {/* Type Badge + Status */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`w-fit font-mono text-[9px] tracking-widest px-2 py-1 border ${
                  listing.type === 'decision'
                    ? 'border-[#f87171] text-[#f87171]'
                    : listing.type === 'insight'
                    ? 'border-[#a78bfa] text-[#a78bfa]'
                    : 'border-[#60a5fa] text-[#60a5fa]'
                }`}
              >
                {listing.type.toUpperCase()}
              </span>
              {listing.isUserListing && (
                <span className="font-mono text-[9px] tracking-widest px-2 py-1 border border-[#a78bfa] text-[#a78bfa]">
                  YOUR LISTING
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-mono text-sm text-[#f2ede6] mb-2 flex-1">{listing.title}</h3>

            {/* Seller Info + Price */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#1e1e1e]">
              <div className="min-w-0 flex-1 mr-3">
                <p className="font-mono text-[10px] text-[#3a3a3a] mb-1 truncate">BY {listing.seller.toUpperCase()}</p>
                <p className="font-mono text-[9px] text-[#5a5a5a] truncate">IP: {listing.ipId.slice(0, 10)}...{listing.ipId.slice(-4)}</p>
              </div>
              <div className="text-right">
                <div className="font-display text-lg text-[#00d9ff]">{listing.price.toFixed(2)} IP</div>
                <div className="font-mono text-[9px] text-[#3a3a3a]">{listing.sales} SALES</div>
              </div>
            </div>

            {/* Description */}
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed mb-4">{listing.description}</p>

            {/* Actions */}
            <div className="flex gap-2">
              {listing.isUserListing ? (
                <button
                  type="button"
                  onClick={() => removeMarketListing(listing.id)}
                  className="flex-1 font-mono text-[10px] tracking-widest border border-[#f87171]/30 text-[#f87171] px-4 py-2 hover:bg-[#f87171]/10 transition-colors"
                >
                  REMOVE LISTING
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isConnected) {
                      connect('auto');
                      return;
                    }
                    setShowPurchaseModal(listing.id);
                  }}
                  className="flex-1 bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest px-4 py-2 hover:bg-[#00e6ff] transition-colors font-semibold"
                >
                  {!isConnected ? 'CONNECT TO BUY' : 'PURCHASE'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {visibleListings.length === 0 && (
        <div className="border border-[#1e1e1e] bg-[#0e0e0e] p-12 text-center">
          <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">NO LISTINGS IN THIS CATEGORY</p>
          <p className="font-mono text-[10px] text-[#5a5a5a]">Try a different filter or list your own agent.</p>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && findListing(showPurchaseModal) && (
        <PurchaseModal
          listing={findListing(showPurchaseModal)!}
          onClose={() => { setShowPurchaseModal(null); setPurchaseResult(null); }}
          address={address}
          isConnected={isConnected}
          onConnect={connect}
          result={purchaseResult}
          setResult={setPurchaseResult}
          purchasing={purchasing}
          setPurchasing={setPurchasing}
        />
      )}

      {/* Full Info Modal */}
      {showInfoModal && (
        <InfoModal onClose={() => setShowInfoModal(false)} />
      )}
    </div>
  )
}

function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="border border-[#1e1e1e] bg-[#0e0e0e] p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="font-mono text-[10px] text-[#00d9ff] tracking-widest mb-2">FULL DETAILS</div>
        <h2 className="font-display text-2xl text-[#f2ede6] mb-4">HOW LICENSE TRADING WORKS</h2>

        <div className="space-y-5 font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">WHAT IS A LICENSE TOKEN?</h3>
            <p>
              A <span className="text-[#f2ede6]">license token</span> is an ERC-721 NFT minted by Story Protocol's
              <code className="text-[#00d9ff]"> LicensingModule.mintLicenseTokens</code>. It grants its holder
              <span className="text-[#f2ede6]"> access rights</span> to a specific IP Asset's memories stored in
              Story's CDR. The license is bound to a specific <code className="text-[#00d9ff]">PIL (Programmable
              IP License)</code> template and terms ID.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">NON-TRANSFERABLE — WHY?</h3>
            <p>
              The license token is <span className="text-[#f2ede6]">non-transferable</span> by default: it cannot be
              moved between wallets via standard ERC-721 <code>transferFrom</code>. This is by design — a license
              represents <span className="text-[#f2ede6]">personal access rights</span>, not a tradable asset. If the
              original buyer wants to re-grant access, the <span className="text-[#f2ede6]">IP owner</span> must
              mint a fresh license to the new wallet (this is what the GRANT LICENSE button on{' '}
              <a href="/app/vaults" className="text-[#00d9ff] hover:underline">/app/vaults</a> does).
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">WHAT IS ROYALTY?</h3>
            <p>
              When a license holder creates a <span className="text-[#f2ede6]">derivative IP</span> (a new IP Asset
              derived from the licensed one's memory), Story Protocol automatically splits the revenue. The
              original IP owner gets a percentage defined in the license terms (the{' '}
              <code className="text-[#00d9ff]">maxRevenueShare</code> parameter). For this app, licenses are minted
              with <code className="text-[#00d9ff]">maxRevenueShare = 0</code> (pure access, no royalty claim),
              but the field is configurable per listing.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">WHAT IS MINTING FEE?</h3>
            <p>
              The IP owner can set a <span className="text-[#f2ede6]">minting fee</span> that the buyer must pay
              to mint a license. The buyer's wallet must include this value in the mintLicenseTokens tx (paid
              in IP, the native token of Aeneid). For this app, listings are minted with{' '}
              <code className="text-[#00d9ff]">maxMintingFee = 0</code> (free) by default — useful for demo and
              open-access agents. Real marketplaces would price access in IP and the listing price would match.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">WHAT CAN A LICENSE HOLDER DO?</h3>
            <p>
              With a valid license token for IP <code className="text-[#00d9ff]">X</code>, the holder can call{' '}
              <a href="/app/brain" className="text-[#00d9ff] hover:underline">/app/brain</a>, enter any CDR vault
              UUID belonging to <code className="text-[#00d9ff]">X</code>, and receive the decrypted memory
              plaintext. The decryption request goes to Story's DKG validators, who produce partial signatures
              that combine into the symmetric key. The plaintext never touches AgentVault's servers.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">WHAT CAN'T THEY DO?</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Transfer or sell the license token</li>
              <li>Read other agents' memories (different IP)</li>
              <li>Write new memories (only the IP owner can do that)</li>
              <li>Mint additional licenses to themselves</li>
              <li>Claim the IP itself — ownership is separate</li>
            </ul>
          </section>

          <section>
            <h3 className="font-mono text-[11px] text-[#f2ede6] tracking-widest mb-2">TYPICAL TRADE FLOW (this app)</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>IP owner spawns an agent → mints NFT → registers IP on Story Protocol (all in /app/spawn)</li>
              <li>IP owner goes to <a href="/app/vaults" className="text-[#00d9ff] hover:underline">/app/vaults</a> → clicks "LIST FOR SALE" on their agent</li>
              <li>Listing appears on this marketplace page (top section, marked "YOUR LISTING")</li>
              <li>Buyer visits marketplace → clicks PURCHASE on the listing</li>
              <li>Buyer signs mintLicenseTokens in their wallet — license token is minted to buyer's address</li>
              <li>Buyer can now <a href="/app/brain" className="text-[#00d9ff] hover:underline">/app/brain</a> recall any memory from the bought IP</li>
            </ol>
          </section>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] tracking-widest bg-[#00d9ff] text-[#0a0e27] px-6 py-2 hover:bg-[#00e6ff] transition-colors font-semibold"
          >
            GOT IT
          </button>
        </div>
      </div>
    </div>
  )
}

function PurchaseModal({
  listing, onClose, address, isConnected, onConnect, result, setResult, purchasing, setPurchasing,
}: {
  listing: Listing;
  onClose: () => void;
  address: string | null;
  isConnected: boolean;
  onConnect: (type?: 'auto' | 'bitget' | 'metamask') => Promise<void>;
  result: { listingId: string; txHash?: string; licenseTokenId?: string; ipId: string; error?: string } | null;
  setResult: (r: typeof result) => void;
  purchasing: boolean;
  setPurchasing: (b: boolean) => void;
}) {
  const handlePurchase = async () => {
    if (!address) return;
    setPurchasing(true);
    setResult({ listingId: listing.id, ipId: listing.ipId });
    try {
      // 1. Get pre-encoded mintLicenseTokens calldata
      const res = await fetch('/api/marketplace/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipId: listing.ipId, granteeAddress: address }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to prepare license mint');
      }
      const prepared = await res.json();

      // 2. Switch chain if needed
      const provider = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!provider) throw new Error('No wallet detected');
      const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
      if (parseInt(chainHex, 16) !== 1315) {
        try {
          await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x523' }] });
        } catch (e: unknown) {
          const code = (e as { code?: number })?.code;
          if (code === 4902) {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{ chainId: '0x523', chainName: 'Aeneid', nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 }, rpcUrls: ['https://aeneid.storyrpc.io'], blockExplorerUrls: ['https://aeneid.storyscan.io'] }],
            });
          } else {
            throw new Error('Please switch to Aeneid testnet (chain 1315)');
          }
        }
      }

      // 3. Sign the mintLicenseTokens tx
      const { createWalletClient, custom, createPublicClient, http, defineChain, decodeEventLog } = await import('viem');
      const aeneid = defineChain({ id: 1315, name: 'Aeneid', network: 'aeneid', nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 }, rpcUrls: { default: { http: ['https://aeneid.storyrpc.io'] } } });
      const wClient = createWalletClient({ transport: custom(provider as never), chain: aeneid });
      const [account] = await wClient.requestAddresses();
      if (!account) throw new Error('Wallet returned no account');

      const txHash = await wClient.sendTransaction({
        account,
        chain: aeneid,
        to: prepared.to as `0x${string}`,
        data: prepared.data as `0x${string}`,
        value: BigInt(0),
      });

      // 4. Parse the LicenseToken Transfer event from the receipt to get the new tokenId
      let licenseTokenId: string | undefined;
      try {
        const pub = createPublicClient({ chain: aeneid, transport: http() });
        const receipt = await pub.waitForTransactionReceipt({ hash: txHash });
        // LicenseToken is ERC-721, emits Transfer(from, to, tokenId) with tokenId indexed
        // The receiver here is the buyer; we look for a Transfer TO the buyer.
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== prepared.to.toLowerCase()) continue;
          // LicensingModule doesn't emit Transfer directly — it calls LICENSE_TOKEN.mint which emits Transfer.
          // We can decode any Transfer event by topic signature.
          if (log.topics.length < 4) continue;
          // topics[0] = Transfer signature, topics[1] = from (0x0 for mint), topics[2] = to, topics[3] = tokenId
          const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) continue;
          if (log.topics[1]?.toLowerCase() !== '0x0000000000000000000000000000000000000000000000000000000000000000') continue;
          const toAddr = ('0x' + log.topics[2]?.slice(26)).toLowerCase();
          if (toAddr === account.toLowerCase()) {
            licenseTokenId = BigInt(log.topics[3] || '0').toString();
            break;
          }
        }
      } catch (e) {
        console.warn('Failed to parse licenseTokenId from receipt', e);
      }

      setResult({ listingId: listing.id, txHash, licenseTokenId, ipId: listing.ipId });
      showToast('License minted — you can now recall this IP\'s memories', txHash, 'success');
    } catch (e: unknown) {
      const msg = (e as Error)?.message || 'Purchase failed';
      setResult({ listingId: listing.id, ipId: listing.ipId, error: msg });
      showToast(msg, undefined, 'error');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="border border-[#1e1e1e] bg-[#0e0e0e] p-8 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl text-[#f2ede6] mb-1">PURCHASE LICENSE</h2>
        <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-6">MINT LICENSE TOKEN TO YOUR WALLET</p>

        {/* Listing Summary */}
        <div className="border border-[#1e1e1e] bg-[#050505] p-4 mb-6">
          <div className="flex items-start justify-between mb-3 gap-3">
            <div className="min-w-0">
              <h3 className="font-mono text-sm text-[#f2ede6] mb-1">{listing.title}</h3>
              <p className="font-mono text-[10px] text-[#3a3a3a]">By {listing.seller}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="font-display text-2xl text-[#00d9ff]">{listing.price.toFixed(2)} IP</div>
            </div>
          </div>
          <div className="border-t border-[#1e1e1e] pt-3 space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-[#3a3a3a]">IP</span>
              <span className="text-[#5a5a5a]">{listing.ipId.slice(0, 10)}...{listing.ipId.slice(-6)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#3a3a3a]">LICENSE TERMS</span>
              <span className="text-[#5a5a5a]">#2054 (PIL)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#3a3a3a]">RECEIVER</span>
              <span className="text-[#5a5a5a]">{address ? `${address.slice(0, 8)}...${address.slice(-6)}` : '—'}</span>
            </div>
          </div>
        </div>

        {/* What happens */}
        <div className="border border-[#00d9ff]/30 bg-[#00d9ff]/5 p-3 mb-6">
          <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
            <span className="text-[#00d9ff]">What happens next:</span> your wallet will sign a transaction
            calling <code className="text-[#f2ede6]">LicensingModule.mintLicenseTokens</code>. A license token
            (ERC-721) will be minted to your wallet, authorizing you to decrypt any memory from this IP. The
            license is <span className="text-[#f2ede6]">non-transferable</span>.
          </p>
        </div>

        {/* Success state */}
        {result && !result.error && result.txHash && (
          <div className="border border-[#22c55e]/40 bg-[#22c55e]/5 p-4 mb-6 space-y-2">
            <div className="font-mono text-[10px] text-[#22c55e] tracking-widest">LICENSE MINTED</div>
            <div className="font-mono text-[10px] text-[#5a5a5a] space-y-1">
              {result.licenseTokenId && (
                <div><span className="text-[#3a3a3a]">TOKEN ID </span>#{result.licenseTokenId}</div>
              )}
              <div><span className="text-[#3a3a3a]">TX </span>
                <a href={`https://aeneid.storyscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#00d9ff] hover:underline">
                  {result.txHash.slice(0, 14)}...→
                </a>
              </div>
            </div>
            <a
              href="/app/brain"
              className="inline-block mt-2 font-mono text-[10px] tracking-widest text-[#00d9ff] border border-[#00d9ff]/30 px-3 py-1.5 hover:bg-[#00d9ff]/10"
            >
              GO TO BRAIN TO RECALL →
            </a>
          </div>
        )}

        {/* Error state */}
        {result?.error && (
          <div className="border border-[#f87171]/40 bg-[#f87171]/5 p-4 mb-6">
            <div className="font-mono text-[10px] text-[#f87171] tracking-widest mb-1">PURCHASE FAILED</div>
            <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">
              {result.error}
            </p>
            {result.error.includes('revert') && (
              <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed mt-2">
                This is likely because the listing uses a mock IP that does not exist on-chain. Real listings
                (from <a href="/app/vaults" className="text-[#00d9ff] hover:underline">/app/vaults</a>) have
                real IPs and will succeed.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={purchasing}
            className="flex-1 border border-[#1e1e1e] text-[#f2ede6] font-mono text-[10px] tracking-widest px-4 py-2 hover:border-[#1e1e1e] hover:text-[#5a5a5a] transition-colors disabled:opacity-30"
          >
            {result?.txHash ? 'DONE' : 'CANCEL'}
          </button>
          {!result?.txHash && !isConnected && (
            <button
              type="button"
              onClick={() => onConnect('auto')}
              className="flex-1 bg-[#00d9ff] text-[#0a0e27] font-mono text-[10px] tracking-widest px-4 py-2 hover:bg-[#00e6ff] font-semibold"
            >
              CONNECT WALLET
            </button>
          )}
          {!result?.txHash && isConnected && (
            <button
              type="button"
              onClick={handlePurchase}
              disabled={purchasing}
              className="flex-1 bg-[#00d9ff] text-[#0a0e27] font-mono text-[10px] tracking-widest px-4 py-2 hover:bg-[#00e6ff] font-semibold disabled:opacity-30"
            >
              {purchasing ? 'SIGNING TX...' : `MINT LICENSE (${listing.price.toFixed(2)} IP)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
