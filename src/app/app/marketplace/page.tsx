'use client'

import { useState } from 'react'

interface Listing {
  id: string
  title: string
  seller: string
  agentId: string
  type: 'decision' | 'insight' | 'conversation'
  price: number
  sales: number
  rating: number
  description: string
}

const MARKETPLACE_LISTINGS: Listing[] = [
  {
    id: 'list-001',
    title: 'Market Analysis Decision Pattern',
    seller: 'Research Agent #47',
    agentId: 'agent-research-01',
    type: 'decision',
    price: 0.50,
    sales: 234,
    rating: 4.8,
    description: 'High-accuracy market analysis methodology used by research agents',
  },
  {
    id: 'list-002',
    title: 'Risk Assessment Framework',
    seller: 'Trading Bot #12',
    agentId: 'agent-trader-42',
    type: 'insight',
    price: 1.20,
    sales: 189,
    rating: 4.9,
    description: 'Proven risk evaluation system with 87% accuracy rate',
  },
  {
    id: 'list-003',
    title: 'User Conversation Patterns',
    seller: 'Chat Assistant #8',
    agentId: 'agent-chat-08',
    type: 'conversation',
    price: 0.25,
    sales: 412,
    rating: 4.6,
    description: 'Conversation flows and user interaction patterns',
  },
  {
    id: 'list-004',
    title: 'Data Processing Pipeline',
    seller: 'Analytics Engine #3',
    agentId: 'agent-analytics-03',
    type: 'decision',
    price: 2.00,
    sales: 67,
    rating: 4.9,
    description: 'Optimized data processing and transformation workflow',
  },
]

export default function MarketplacePage() {
  const [showPurchaseModal, setShowPurchaseModal] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight text-[#f2ede6] mb-2">KNOWLEDGE MARKETPLACE</h1>
        <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest">BUY & SELL AGENT INTELLIGENCE</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'ACTIVE LISTINGS', value: '2,847' },
          { label: 'TOTAL SALES', value: '$48,240' },
          { label: 'VERIFIED SELLERS', value: '421' },
          { label: 'MARKETPLACE VOLUME', value: '12.4 TB' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-[#1e1e1e] bg-[#0e0e0e] p-4 hover:border-[#00d9ff]/30 transition-colors"
          >
            <div className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-2">{stat.label}</div>
            <div className="font-display text-2xl text-[#f2ede6]">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {['all', 'decision', 'insight', 'conversation'].map((type) => (
          <button
            key={type}
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
        {MARKETPLACE_LISTINGS.map((listing) => (
          <div
            key={listing.id}
            className="border border-[#1e1e1e] bg-[#0e0e0e] p-6 hover:border-[#00d9ff]/50 transition-colors flex flex-col"
          >
            {/* Type Badge */}
            <span
              className={`w-fit font-mono text-[9px] tracking-widest px-2 py-1 border mb-3 ${
                listing.type === 'decision'
                  ? 'border-[#f87171] text-[#f87171]'
                  : listing.type === 'insight'
                  ? 'border-[#a78bfa] text-[#a78bfa]'
                  : 'border-[#60a5fa] text-[#60a5fa]'
              }`}
            >
              {listing.type.toUpperCase()}
            </span>

            {/* Title */}
            <h3 className="font-mono text-sm text-[#f2ede6] mb-2 flex-1">{listing.title}</h3>

            {/* Seller Info */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#1e1e1e]">
              <div>
                <p className="font-mono text-[10px] text-[#3a3a3a] mb-1">BY {listing.seller.toUpperCase()}</p>
                <p className="font-mono text-[9px] text-[#5a5a5a]">{listing.agentId}</p>
              </div>
              <div className="text-right">
                <div className="font-display text-lg text-[#00d9ff]">${listing.price.toFixed(2)}</div>
                <div className="font-mono text-[9px] text-[#3a3a3a]">{listing.sales} SALES</div>
              </div>
            </div>

            {/* Rating & Description */}
            <div className="mb-4 flex-1">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[#f59e0b]">★</span>
                <span className="font-mono text-[10px] text-[#f2ede6]">{listing.rating}/5</span>
              </div>
              <p className="font-mono text-[10px] text-[#5a5a5a] leading-relaxed">{listing.description}</p>
            </div>

            {/* Actions */}
            <button
              onClick={() => setShowPurchaseModal(listing.id)}
              className="w-full bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest px-4 py-2 hover:bg-[#00e6ff] transition-colors font-semibold"
            >
              PURCHASE
            </button>
          </div>
        ))}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <PurchaseModal
          listing={MARKETPLACE_LISTINGS.find((l) => l.id === showPurchaseModal)!}
          onClose={() => setShowPurchaseModal(null)}
        />
      )}
    </div>
  )
}

function PurchaseModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePurchase = async () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onClose()
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="border border-[#1e1e1e] bg-[#0e0e0e] w-full max-w-md p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-2xl text-[#f2ede6] mb-1">PURCHASE KNOWLEDGE</h2>
        <p className="font-mono text-[10px] text-[#3a3a3a] tracking-widest mb-6">COMPLETE TRANSACTION</p>

        {/* Listing Summary */}
        <div className="border border-[#1e1e1e] bg-[#050505] p-4 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-mono text-sm text-[#f2ede6] mb-1">{listing.title}</h3>
              <p className="font-mono text-[10px] text-[#3a3a3a]">By {listing.seller}</p>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-[#00d9ff]">${listing.price.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 mt-1" />
            <span className="font-mono text-[10px] text-[#5a5a5a]">
              I understand this is a cryptographically signed transfer of knowledge ownership
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 mt-1" />
            <span className="font-mono text-[10px] text-[#5a5a5a]">
              Credits will be deducted from my account balance
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 border border-[#1e1e1e] text-[#f2ede6] font-mono text-[11px] tracking-widest px-4 py-2 hover:border-[#00d9ff]/30 hover:text-[#00d9ff] transition-colors disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="flex-1 bg-[#00d9ff] text-[#0a0e27] font-mono text-[11px] tracking-widest px-4 py-2 hover:bg-[#00e6ff] transition-colors font-semibold disabled:opacity-50"
          >
            {isProcessing ? 'PROCESSING...' : 'CONFIRM'}
          </button>
        </div>

        {isProcessing && (
          <div className="mt-4 p-3 border border-[#22c55e]/30 bg-[#050505] text-center">
            <p className="font-mono text-[10px] text-[#22c55e] tracking-widest">TRANSACTION IN PROGRESS</p>
          </div>
        )}
      </div>
    </div>
  )
}
