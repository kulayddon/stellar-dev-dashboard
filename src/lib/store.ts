import { create } from 'zustand'
import type {
  NetworkName,
  NetworkStats,
  PaymentPathRecord,
} from './stellar'
import type { Horizon, SorobanRpc } from '@stellar/stellar-sdk'

// ─── State shape ──────────────────────────────────────────────────────────────

export interface StoreState {
  // Network
  network: NetworkName
  setNetwork: (network: NetworkName) => void

  // Wallet / Account
  connectedAddress: string | null
  accountData: Horizon.AccountResponse | null
  accountLoading: boolean
  accountError: string | null
  setConnectedAddress: (address: string | null) => void
  setAccountData: (data: Horizon.AccountResponse) => void
  setAccountLoading: (loading: boolean) => void
  setAccountError: (error: string | null) => void

  // Transactions
  transactions: Horizon.ServerApi.TransactionRecord[]
  txLoading: boolean
  setTransactions: (txs: Horizon.ServerApi.TransactionRecord[]) => void
  setTxLoading: (v: boolean) => void

  // Operations
  operations: Horizon.ServerApi.OperationRecord[]
  opsLoading: boolean
  setOperations: (ops: Horizon.ServerApi.OperationRecord[]) => void
  setOpsLoading: (v: boolean) => void

  // Network stats
  networkStats: NetworkStats | null
  statsLoading: boolean
  setNetworkStats: (stats: NetworkStats) => void
  setStatsLoading: (v: boolean) => void

  // Active tab
  activeTab: string
  setActiveTab: (tab: string) => void

  // Faucet
  faucetLoading: boolean
  faucetResult: unknown
  setFaucetLoading: (v: boolean) => void
  setFaucetResult: (r: unknown) => void

  // Contract explorer
  contractId: string
  contractData: SorobanRpc.Api.LedgerEntryResult | null
  contractLoading: boolean
  contractError: string | null
  setContractId: (id: string) => void
  setContractData: (data: SorobanRpc.Api.LedgerEntryResult) => void
  setContractLoading: (v: boolean) => void
  setContractError: (e: string | null) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>((set) => ({
  // Network
  network: 'testnet',
  setNetwork: (network) => {
    set({ network, accountData: null, transactions: [], operations: [] })
  },

  // Wallet / Account
  connectedAddress: null,
  accountData: null,
  accountLoading: false,
  accountError: null,
  setConnectedAddress: (address) => set({ connectedAddress: address }),
  setAccountData: (data) => set({ accountData: data, accountError: null }),
  setAccountLoading: (loading) => set({ accountLoading: loading }),
  setAccountError: (error) => set({ accountError: error }),

  // Transactions
  transactions: [],
  txLoading: false,
  setTransactions: (txs) => set({ transactions: txs }),
  setTxLoading: (v) => set({ txLoading: v }),

  // Operations
  operations: [],
  opsLoading: false,
  setOperations: (ops) => set({ operations: ops }),
  setOpsLoading: (v) => set({ opsLoading: v }),

  // Network stats
  networkStats: null,
  statsLoading: false,
  setNetworkStats: (stats) => set({ networkStats: stats }),
  setStatsLoading: (v) => set({ statsLoading: v }),

  // Active tab
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Faucet
  faucetLoading: false,
  faucetResult: null,
  setFaucetLoading: (v) => set({ faucetLoading: v }),
  setFaucetResult: (r) => set({ faucetResult: r }),

  // Contract explorer
  contractId: '',
  contractData: null,
  contractLoading: false,
  contractError: null,
  setContractId: (id) => set({ contractId: id }),
  setContractData: (data) => set({ contractData: data, contractError: null }),
  setContractLoading: (v) => set({ contractLoading: v }),
  setContractError: (e) => set({ contractError: e }),
}))
