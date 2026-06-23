/**
 * wallet.js — Wallet Connection Module
 * Uses ethers.js v6 from CDN. Connects to MetaMask.
 *
 * Exports:
 *   connect()       -> Promise<string>  (returns connected address)
 *   disconnect()    -> void
 *   getAddress()    -> string | null
 *   getSigner()     -> Promise<ethers.JsonRpcSigner>
 *   isConnected()   -> boolean
 *
 * Dependencies:
 *   ethers v6 (loaded via <script> from CDN before this module)
 *   The ethers object must be available on window.ethers
 */

const Wallet = (() => {
  // ---- Configuration ----
  const CHAIN_ID = 8453;       // Base mainnet
  const CHAIN_ID_HEX = '0x2105';

  // ---- State ----
  let _provider = null;
  let _signer = null;
  let _address = null;

  // ---- Internal Helpers ----

  /** Get the ethers BrowserProvider, lazily initialized */
  function _getProvider() {
    if (_provider) return _provider;
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to connect your wallet.');
    }
    _provider = new ethers.BrowserProvider(window.ethereum);
    return _provider;
  }

  /** Ensure we're on Base chain; prompt to switch if not */
  async function _ensureChain() {
    if (!window.ethereum) return;
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== CHAIN_ID_HEX) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_ID_HEX }],
          });
        } catch (switchError) {
          // Chain not added to MetaMask — add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: CHAIN_ID_HEX,
                chainName: 'Base',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (err) {
      console.error('Failed to ensure Base chain:', err);
      throw err;
    }
  }

  /** Listen for MetaMask events */
  function _setupListeners() {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        _disconnectInternal();
      } else {
        _address = accounts[0];
        // Re-fetch signer on account change
        _signer = null;
      }
      _notifyListeners('accountsChanged', _address);
    };

    const handleChainChanged = () => {
      // Re-fetch on chain change
      _signer = null;
      _provider = null;
      _notifyListeners('chainChanged', null);
    };

    const handleDisconnect = () => {
      _disconnectInternal();
      _notifyListeners('disconnect', null);
    };

    // Remove old listeners if any (prevent duplicates)
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
    window.ethereum.removeListener('disconnect', handleDisconnect);

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);
  }

  function _disconnectInternal() {
    _address = null;
    _signer = null;
    _provider = null;
  }

  // ---- Event System (for UI updates) ----
  const _listeners = {};

  function _notifyListeners(event, data) {
    if (_listeners[event]) {
      _listeners[event].forEach(cb => { try { cb(data); } catch (e) { console.error(e); } });
    }
  }

  // ---- Public API ----

  /**
   * Connect to MetaMask wallet.
   * Prompts the user to connect, switches to Base chain if needed.
   * Returns the connected address.
   */
  async function connect() {
    if (!window.ethereum) {
      throw new Error('MetaMask not detected. Please install the MetaMask browser extension.');
    }

    const provider = _getProvider();

    // Ensure Base chain
    await _ensureChain();

    // Request accounts
    const accounts = await provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock MetaMask.');
    }

    _address = accounts[0];
    _signer = await provider.getSigner();

    // Setup event listeners
    _setupListeners();

    console.log(`Wallet connected: ${_address}`);
    return _address;
  }

  /**
   * Disconnect the wallet locally.
   * Note: This does not disconnect from MetaMask itself (the extension
   * stays connected), but clears our local state.
   */
  function disconnect() {
    _disconnectInternal();
    console.log('Wallet disconnected');
  }

  /**
   * Get the currently connected address, or null.
   */
  function getAddress() {
    return _address;
  }

  /**
   * Get the ethers JsonRpcSigner. Reconnects if necessary.
   */
  async function getSigner() {
    if (!_address) return null;
    if (_signer) return _signer;

    const provider = _getProvider();
    _signer = await provider.getSigner();
    return _signer;
  }

  /**
   * Check if a wallet is currently connected.
   */
  function isConnected() {
    return !!_address;
  }

  /**
   * Register an event listener.
   * Events: 'accountsChanged', 'chainChanged', 'disconnect'
   */
  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  /**
   * Remove an event listener.
   */
  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(cb => cb !== callback);
  }

  // ---- Initialization ----
  // If MetaMask already has connected accounts from a previous session,
  // try to restore the connection silently.
  (async function _init() {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        _address = accounts[0];
        _provider = new ethers.BrowserProvider(window.ethereum);
        _signer = await _provider.getSigner();
        _setupListeners();
        console.log(`Wallet auto-connected: ${_address}`);
      }
    } catch (e) {
      // Silent fail — user hasn't granted access yet
      console.log('No pre-existing wallet connection found');
    }
  })();

  // ---- Public Interface ----
  return {
    connect,
    disconnect,
    getAddress,
    getSigner,
    isConnected,
    on,
    off,
    CHAIN_ID,
  };
})();

// Export for use by other modules
export default Wallet;
