import * as StellarSdk from '@stellar/stellar-sdk'

// ─── Network config ───────────────────────────────────────────────────────────

export type NetworkName = 'mainnet' | 'testnet'

export interface NetworkConfig {
  name: string
  horizonUrl: string
  sorobanUrl: string
  passphrase: string
  faucetUrl?: string
}

export const NETWORKS: Record<NetworkName, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanUrl: 'https://soroban-rpc.stellar.org',
    passphrase: StellarSdk.Networks.PUBLIC,
  },
  testnet: {
    name: 'Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanUrl: 'https://soroban-testnet.stellar.org',
    passphrase: StellarSdk.Networks.TESTNET,
    faucetUrl: 'https://friendbot.stellar.org',
  },
}

// ─── Servers ──────────────────────────────────────────────────────────────────

export function getServer(network: NetworkName = 'testnet'): StellarSdk.Horizon.Server {
  return new StellarSdk.Horizon.Server(NETWORKS[network].horizonUrl)
}

export function getSorobanServer(network: NetworkName = 'testnet'): StellarSdk.SorobanRpc.Server {
  return new StellarSdk.SorobanRpc.Server(NETWORKS[network].sorobanUrl)
}

// ─── Account ──────────────────────────────────────────────────────────────────

export async function fetchAccount(
  publicKey: string,
  network: NetworkName = 'testnet'
): Promise<StellarSdk.Horizon.AccountResponse> {
  const server = getServer(network)
  return server.loadAccount(publicKey)
}

// ─── Transactions & Operations ────────────────────────────────────────────────

export async function fetchTransactions(
  publicKey: string,
  network: NetworkName = 'testnet',
  limit = 20
): Promise<StellarSdk.Horizon.ServerApi.TransactionRecord[]> {
  const server = getServer(network)
  const txs = await server
    .transactions()
    .forAccount(publicKey)
    .order('desc')
    .limit(limit)
    .call()
  return txs.records
}

export async function fetchOperations(
  publicKey: string,
  network: NetworkName = 'testnet',
  limit = 20
): Promise<StellarSdk.Horizon.ServerApi.OperationRecord[]> {
  const server = getServer(network)
  const ops = await server
    .operations()
    .forAccount(publicKey)
    .order('desc')
    .limit(limit)
    .call()
  return ops.records
}

// ─── Network stats ────────────────────────────────────────────────────────────

export interface NetworkStats {
  latestLedger: StellarSdk.Horizon.ServerApi.LedgerRecord
  feeStats: StellarSdk.Horizon.HorizonApi.FeeStatsResponse
}

export async function fetchNetworkStats(network: NetworkName = 'testnet'): Promise<NetworkStats> {
  const server = getServer(network)
  const [ledger, feeStats] = await Promise.all([
    server.ledgers().order('desc').limit(1).call(),
    server.feeStats(),
  ])
  return {
    latestLedger: ledger.records[0],
    feeStats,
  }
}

// ─── Faucet ───────────────────────────────────────────────────────────────────

export async function fundTestnetAccount(publicKey: string): Promise<unknown> {
  const res = await fetch(`${NETWORKS.testnet.faucetUrl}?addr=${publicKey}`)
  if (!res.ok) throw new Error('Faucet request failed')
  return res.json()
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export async function fetchContractInfo(
  contractId: string,
  network: NetworkName = 'testnet'
): Promise<StellarSdk.SorobanRpc.Api.LedgerEntryResult> {
  const server = getSorobanServer(network)
  try {
    const instance = await server.getContractData(
      contractId,
      StellarSdk.xdr.ScVal.scvLedgerKeyContractInstance(),
      StellarSdk.SorobanRpc.Durability.Persistent
    )
    return instance
  } catch (e) {
    throw new Error(`Contract not found: ${(e as Error).message}`)
  }
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function isValidPublicKey(key: string): boolean {
  return StellarSdk.StrKey.isValidEd25519PublicKey(key)
}

export function isValidContractId(id: string): boolean {
  try {
    StellarSdk.Address.fromString(id)
    return true
  } catch {
    return false
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatXLM(amount: string | number): string {
  return parseFloat(String(amount)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })
}

export function shortAddress(addr: string | null | undefined, chars = 6): string {
  if (!addr) return ''
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`
}

// ─── Transaction builder ──────────────────────────────────────────────────────

export type OperationType = 'payment' | 'createAccount'

export interface PaymentOperation {
  type: 'payment'
  destination: string
  amount: string
}

export interface CreateAccountOperation {
  type: 'createAccount'
  destination: string
  startingBalance: string
}

export type BuilderOperation = PaymentOperation | CreateAccountOperation

export interface TimeBounds {
  minTime?: string | number
  maxTime?: string | number
}

export interface BuildTransactionParams {
  sourceAccount: string
  operations: BuilderOperation[]
  memo?: string
  baseFee: number
  timeBounds: TimeBounds
  network: NetworkName
}

export async function buildTransaction(
  params: BuildTransactionParams
): Promise<StellarSdk.Transaction> {
  const { sourceAccount, operations, memo, baseFee, timeBounds, network } = params
  const server = getServer(network)
  const account = await server.loadAccount(sourceAccount)

  const txBuilder = new StellarSdk.TransactionBuilder(account, {
    fee: baseFee.toString(),
    networkPassphrase: NETWORKS[network].passphrase,
  })

  if (timeBounds.minTime || timeBounds.maxTime) {
    txBuilder.setTimeout(
      timeBounds.maxTime
        ? parseInt(String(timeBounds.maxTime)) - Math.floor(Date.now() / 1000)
        : 0
    )
  }

  operations.forEach(op => {
    if (op.type === 'payment') {
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: op.destination,
          asset: StellarSdk.Asset.native(),
          amount: op.amount,
        })
      )
    } else if (op.type === 'createAccount') {
      txBuilder.addOperation(
        StellarSdk.Operation.createAccount({
          destination: op.destination,
          startingBalance: op.startingBalance,
        })
      )
    }
  })

  if (memo) {
    txBuilder.addMemo(StellarSdk.Memo.text(memo))
  }

  return txBuilder.build()
}

// ─── Simulate transaction ─────────────────────────────────────────────────────

export interface SimulateResult {
  fee: number
  operationCount: number
  success: boolean
  errors: string[]
  xdr?: string
}

export async function simulateTransaction(
  params: BuildTransactionParams
): Promise<SimulateResult> {
  try {
    const transaction = await buildTransaction(params)

    if (!isValidPublicKey(params.sourceAccount)) {
      throw new Error('Invalid source account')
    }

    const errors: string[] = []
    params.operations.forEach((op, index) => {
      if (op.type === 'payment') {
        if (!isValidPublicKey(op.destination)) {
          errors.push(`Operation ${index + 1}: Invalid destination address`)
        }
        if (!op.amount || parseFloat(op.amount) <= 0) {
          errors.push(`Operation ${index + 1}: Invalid amount`)
        }
      } else if (op.type === 'createAccount') {
        if (!isValidPublicKey(op.destination)) {
          errors.push(`Operation ${index + 1}: Invalid destination address`)
        }
        if (!op.startingBalance || parseFloat(op.startingBalance) < 1) {
          errors.push(`Operation ${index + 1}: Starting balance must be at least 1 XLM`)
        }
      }
    })

    const estimatedFee = params.baseFee * params.operations.length

    return {
      fee: estimatedFee,
      operationCount: transaction.operations.length,
      success: errors.length === 0,
      errors,
      xdr: transaction.toXDR(),
    }
  } catch (error) {
    return {
      fee: 0,
      operationCount: params.operations.length,
      success: false,
      errors: [(error as Error).message],
    }
  }
}

export async function exportTransactionXDR(params: BuildTransactionParams): Promise<string> {
  const transaction = await buildTransaction(params)
  return transaction.toXDR()
}

// ─── Path payments ────────────────────────────────────────────────────────────

export type PathPaymentMode = 'strict-send' | 'strict-receive'

export interface PathAsset {
  type: 'native' | 'credit'
  code: string
  issuer?: string
}

export interface PaymentPathRecord {
  source_asset_type: string
  source_asset_code?: string
  source_asset_issuer?: string
  source_amount: string
  destination_asset_type: string
  destination_asset_code?: string
  destination_asset_issuer?: string
  destination_amount: string
  path: Array<{
    asset_type: string
    asset_code?: string
    asset_issuer?: string
  }>
  /** Slippage % vs best path — annotated client-side, not from Horizon */
  slippagePct?: string
}

export interface FetchPaymentPathsParams {
  sourceAsset: PathAsset
  destAsset: PathAsset
  amount: string
  mode?: PathPaymentMode
  network?: NetworkName
}

export async function fetchPaymentPaths(
  params: FetchPaymentPathsParams
): Promise<PaymentPathRecord[]> {
  const { sourceAsset, destAsset, amount, mode = 'strict-send', network = 'testnet' } = params
  const horizonUrl = NETWORKS[network].horizonUrl

  function assetParams(asset: PathAsset, prefix: string): string {
    if (asset.type === 'native') {
      return `${prefix}_asset_type=native`
    }
    const alphaNum = asset.code.length <= 4 ? '4' : '12'
    return `${prefix}_asset_type=credit_alphanum${alphaNum}&${prefix}_asset_code=${asset.code}&${prefix}_asset_issuer=${asset.issuer}`
  }

  function assetString(asset: PathAsset): string {
    if (asset.type === 'native') return 'native'
    return `${asset.code}:${asset.issuer}`
  }

  let url: string
  if (mode === 'strict-send') {
    url = `${horizonUrl}/paths/strict-send?${assetParams(sourceAsset, 'source')}&source_amount=${amount}&destination_assets=${encodeURIComponent(assetString(destAsset))}`
  } else {
    url = `${horizonUrl}/paths/strict-receive?${assetParams(destAsset, 'destination')}&destination_amount=${amount}&source_assets=${encodeURIComponent(assetString(sourceAsset))}`
  }

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Horizon error: ${res.status}`)
  const data = await res.json() as { _embedded?: { records: PaymentPathRecord[] } }
  return data._embedded?.records ?? []
}

export { StellarSdk }
