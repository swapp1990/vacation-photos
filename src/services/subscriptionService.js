import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceId } from '../utils/deviceId';

// =============================================================================
// CONFIGURATION
// =============================================================================

// TODO: Update this with your actual product ID from App Store Connect
const SUBSCRIPTION_PRODUCT_ID = 'com.swapp1990.vacationphotos.pro.monthly';

// TODO: Update with your backend URL
const API_BASE_URL = 'https://your-backend.com/api';

// Check if running in Expo Go (mock mode)
const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Dynamically import react-native-iap only when not in Expo Go
let RNIap = null;
if (!IS_EXPO_GO) {
  try {
    const iapModule = require('react-native-iap');
    console.log('[Subscription] IAP module keys:', Object.keys(iapModule));
    RNIap = iapModule;
  } catch (e) {
    console.warn('[Subscription] react-native-iap not available:', e.message);
  }
}

// Storage keys
const SUBSCRIPTION_CACHE_KEY = 'vacation_photos_subscription_cache';

// =============================================================================
// ERROR TYPES
// =============================================================================

export class SubscriptionError extends Error {
  constructor(code, message, originalError = null) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
    this.originalError = originalError;
  }
}

export const ErrorCodes = {
  // Connection errors
  STORE_NOT_AVAILABLE: 'STORE_NOT_AVAILABLE',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Product errors
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_FETCH_FAILED: 'PRODUCT_FETCH_FAILED',

  // Purchase errors
  PURCHASE_CANCELLED: 'PURCHASE_CANCELLED',
  PURCHASE_FAILED: 'PURCHASE_FAILED',
  PURCHASE_PENDING: 'PURCHASE_PENDING',
  ALREADY_OWNED: 'ALREADY_OWNED',
  PAYMENT_INVALID: 'PAYMENT_INVALID',
  PAYMENT_NOT_ALLOWED: 'PAYMENT_NOT_ALLOWED',

  // Verification errors
  RECEIPT_INVALID: 'RECEIPT_INVALID',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  BACKEND_ERROR: 'BACKEND_ERROR',

  // Restore errors
  RESTORE_FAILED: 'RESTORE_FAILED',
  NO_PURCHASES_TO_RESTORE: 'NO_PURCHASES_TO_RESTORE',

  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_INITIALIZED: 'NOT_INITIALIZED',
};

// User-friendly error messages
export const ErrorMessages = {
  [ErrorCodes.STORE_NOT_AVAILABLE]: 'App Store is not available. Please try again later.',
  [ErrorCodes.CONNECTION_FAILED]: 'Could not connect to the App Store. Please check your internet connection.',
  [ErrorCodes.NETWORK_ERROR]: 'Network error. Please check your internet connection and try again.',
  [ErrorCodes.PRODUCT_NOT_FOUND]: 'Subscription product not found. Please try again later.',
  [ErrorCodes.PRODUCT_FETCH_FAILED]: 'Could not load subscription details. Please try again.',
  [ErrorCodes.PURCHASE_CANCELLED]: 'Purchase was cancelled.',
  [ErrorCodes.PURCHASE_FAILED]: 'Purchase failed. Please try again.',
  [ErrorCodes.PURCHASE_PENDING]: 'Purchase is pending approval.',
  [ErrorCodes.ALREADY_OWNED]: 'You already have an active subscription.',
  [ErrorCodes.PAYMENT_INVALID]: 'Payment method is invalid. Please update your payment information.',
  [ErrorCodes.PAYMENT_NOT_ALLOWED]: 'Purchases are not allowed on this device.',
  [ErrorCodes.RECEIPT_INVALID]: 'Could not verify your purchase. Please contact support.',
  [ErrorCodes.VERIFICATION_FAILED]: 'Purchase verification failed. Please try again.',
  [ErrorCodes.BACKEND_ERROR]: 'Server error. Please try again later.',
  [ErrorCodes.RESTORE_FAILED]: 'Could not restore purchases. Please try again.',
  [ErrorCodes.NO_PURCHASES_TO_RESTORE]: 'No previous purchases found to restore.',
  [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCodes.NOT_INITIALIZED]: 'Subscription service not ready. Please wait a moment and try again.',
};

// =============================================================================
// SUBSCRIPTION SERVICE
// =============================================================================

// =============================================================================
// MOCK DATA FOR EXPO GO TESTING
// =============================================================================

const MOCK_PRODUCT = {
  productId: SUBSCRIPTION_PRODUCT_ID,
  title: 'Pro Subscription (Mock)',
  description: 'Unlock all premium features - MOCK MODE',
  price: '4.99',
  localizedPrice: '$4.99',
  currency: 'USD',
  subscriptionPeriodUnitIOS: 'MONTH',
};

// Simulate different error scenarios for testing
const MOCK_SCENARIOS = {
  SUCCESS: 'success',
  CANCELLED: 'cancelled',
  NETWORK_ERROR: 'network_error',
  ALREADY_OWNED: 'already_owned',
  BACKEND_ERROR: 'backend_error',
};

// Change this to test different scenarios
let currentMockScenario = MOCK_SCENARIOS.SUCCESS;

// =============================================================================
// SUBSCRIPTION SERVICE
// =============================================================================

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.purchaseUpdateSubscription = null;
    this.purchaseErrorSubscription = null;
    this.currentProduct = null;
    this.onPurchaseUpdate = null; // Callback for purchase updates
    this.isMockMode = IS_EXPO_GO;
  }

  // ---------------------------------------------------------------------------
  // MOCK MODE CONTROLS (for testing in Expo Go)
  // ---------------------------------------------------------------------------

  /**
   * Set the mock scenario for testing different error states
   */
  setMockScenario(scenario) {
    if (this.isMockMode) {
      currentMockScenario = scenario;
      console.log('[Subscription] Mock scenario set to:', scenario);
    }
  }

  /**
   * Get available mock scenarios
   */
  getMockScenarios() {
    return MOCK_SCENARIOS;
  }

  /**
   * Check if in mock mode
   */
  isInMockMode() {
    return this.isMockMode;
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Initialize the IAP connection. Must be called before any other methods.
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Mock mode for Expo Go
    if (this.isMockMode) {
      console.log('[Subscription] Initializing in MOCK MODE (Expo Go)...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      this.isInitialized = true;
      console.log('[Subscription] Mock mode initialized');
      return;
    }

    // Real IAP initialization
    if (!RNIap) {
      throw new SubscriptionError(
        ErrorCodes.STORE_NOT_AVAILABLE,
        'In-app purchases are not available in this environment'
      );
    }

    try {
      console.log('[Subscription] Initializing...');

      // Initialize the IAP connection
      const result = await RNIap.initConnection();
      console.log('[Subscription] Connection result:', result);

      if (!result) {
        throw new SubscriptionError(
          ErrorCodes.CONNECTION_FAILED,
          'Could not establish connection to App Store'
        );
      }

      // Set up purchase listeners
      this.setupPurchaseListeners();

      this.isInitialized = true;
      console.log('[Subscription] Initialized successfully');
    } catch (error) {
      console.error('[Subscription] Initialization failed:', error);
      this.handleInitError(error);
    }
  }

  /**
   * Handle initialization errors
   */
  handleInitError(error) {
    if (error instanceof SubscriptionError) {
      throw error;
    }

    // Check for specific error types
    if (error.code === 'E_NOT_PREPARED') {
      throw new SubscriptionError(
        ErrorCodes.STORE_NOT_AVAILABLE,
        'App Store is not available on this device',
        error
      );
    }

    throw new SubscriptionError(
      ErrorCodes.CONNECTION_FAILED,
      'Failed to connect to App Store',
      error
    );
  }

  /**
   * Set up listeners for purchase updates
   */
  setupPurchaseListeners() {
    // Remove existing listeners
    this.removeListeners();

    // Listen for successful purchases
    this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase) => {
        console.log('[Subscription] Purchase updated:', purchase.productId);
        await this.handlePurchaseUpdate(purchase);
      }
    );

    // Listen for purchase errors
    this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
      console.error('[Subscription] Purchase error:', error);
      if (this.onPurchaseUpdate) {
        this.onPurchaseUpdate({
          success: false,
          error: this.mapPurchaseError(error),
        });
      }
    });
  }

  /**
   * Clean up listeners
   */
  removeListeners() {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
  }

  /**
   * Disconnect from IAP (call on app unmount)
   */
  async disconnect() {
    this.removeListeners();
    await RNIap.endConnection();
    this.isInitialized = false;
    console.log('[Subscription] Disconnected');
  }

  // ---------------------------------------------------------------------------
  // PRODUCT FETCHING
  // ---------------------------------------------------------------------------

  /**
   * Fetch subscription product details from the App Store
   */
  async getProduct() {
    this.ensureInitialized();

    // Mock mode
    if (this.isMockMode) {
      console.log('[Subscription] Fetching product (MOCK):', SUBSCRIPTION_PRODUCT_ID);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
      this.currentProduct = MOCK_PRODUCT;
      return this.formatProduct(MOCK_PRODUCT);
    }

    try {
      console.log('[Subscription] Fetching product:', SUBSCRIPTION_PRODUCT_ID);
      console.log('[Subscription] App bundle ID:', Constants.expoConfig?.ios?.bundleIdentifier);

      // v14 API uses fetchProducts for both products and subscriptions
      const products = await RNIap.fetchProducts({
        skus: [SUBSCRIPTION_PRODUCT_ID],
      });

      console.log('[Subscription] Products received:', products.length);
      console.log('[Subscription] Raw products response:', JSON.stringify(products));

      if (!products || products.length === 0) {
        throw new SubscriptionError(
          ErrorCodes.PRODUCT_NOT_FOUND,
          `Subscription product "${SUBSCRIPTION_PRODUCT_ID}" not found in App Store`
        );
      }

      this.currentProduct = products[0];
      return this.formatProduct(products[0]);
    } catch (error) {
      console.error('[Subscription] Failed to fetch product:', error);

      if (error instanceof SubscriptionError) {
        throw error;
      }

      throw new SubscriptionError(
        ErrorCodes.PRODUCT_FETCH_FAILED,
        'Failed to load subscription details',
        error
      );
    }
  }

  /**
   * Format product for display (v14 API)
   */
  formatProduct(product) {
    console.log('[Subscription] Raw product:', JSON.stringify(product, null, 2));
    return {
      id: product.productId || product.id,
      title: product.title || product.displayName || 'Pro Subscription',
      description: product.description || 'Unlock all premium features',
      price: product.localizedPrice || product.displayPrice || product.price,
      priceAmount: parseFloat(product.price) || 0,
      currency: product.currency || 'USD',
      // Subscription specific - v14 may use different field names
      subscriptionPeriod: this.formatPeriod(
        product.subscriptionPeriodUnitIOS ||
        product.subscriptionPeriod?.unit ||
        'MONTH'
      ),
    };
  }

  /**
   * Format subscription period for display
   */
  formatPeriod(unit) {
    switch (unit) {
      case 'DAY':
        return 'daily';
      case 'WEEK':
        return 'weekly';
      case 'MONTH':
        return 'monthly';
      case 'YEAR':
        return 'yearly';
      default:
        return 'monthly';
    }
  }

  // ---------------------------------------------------------------------------
  // PURCHASE FLOW
  // ---------------------------------------------------------------------------

  /**
   * Initiate a subscription purchase
   */
  async purchaseSubscription() {
    this.ensureInitialized();

    // Mock mode - simulate purchase based on scenario
    if (this.isMockMode) {
      console.log('[Subscription] Starting purchase (MOCK) for:', SUBSCRIPTION_PRODUCT_ID);
      console.log('[Subscription] Mock scenario:', currentMockScenario);

      // Simulate purchase delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate different outcomes based on scenario
      switch (currentMockScenario) {
        case MOCK_SCENARIOS.CANCELLED:
          throw new SubscriptionError(
            ErrorCodes.PURCHASE_CANCELLED,
            'Purchase was cancelled by user'
          );

        case MOCK_SCENARIOS.NETWORK_ERROR:
          throw new SubscriptionError(
            ErrorCodes.NETWORK_ERROR,
            'Network error during purchase',
            new Error('Mock network timeout')
          );

        case MOCK_SCENARIOS.ALREADY_OWNED:
          throw new SubscriptionError(
            ErrorCodes.ALREADY_OWNED,
            'You already have an active subscription'
          );

        case MOCK_SCENARIOS.BACKEND_ERROR:
          // Simulate successful Apple purchase but backend verification fails
          if (this.onPurchaseUpdate) {
            this.onPurchaseUpdate({
              success: false,
              error: new SubscriptionError(
                ErrorCodes.BACKEND_ERROR,
                'Server error during verification',
                new Error('Mock: Backend returned 500')
              ),
            });
          }
          return;

        case MOCK_SCENARIOS.SUCCESS:
        default:
          // Simulate successful purchase
          const mockSubscription = {
            isActive: true,
            status: 'active',
            productId: SUBSCRIPTION_PRODUCT_ID,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          };

          // Cache and notify
          await this.cacheSubscriptionStatus(mockSubscription);

          if (this.onPurchaseUpdate) {
            this.onPurchaseUpdate({
              success: true,
              subscription: mockSubscription,
            });
          }
          return;
      }
    }

    try {
      console.log('[Subscription] Starting purchase for:', SUBSCRIPTION_PRODUCT_ID);

      // v14 API uses requestPurchase for both products and subscriptions
      await RNIap.requestPurchase({
        sku: SUBSCRIPTION_PRODUCT_ID,
      });

      // The actual result comes through the purchaseUpdatedListener
      // This method just initiates the purchase
      console.log('[Subscription] Purchase request sent');
    } catch (error) {
      console.error('[Subscription] Purchase request failed:', error);
      throw this.mapPurchaseError(error);
    }
  }

  /**
   * Handle a successful purchase update
   */
  async handlePurchaseUpdate(purchase) {
    try {
      const receipt = purchase.transactionReceipt;

      if (!receipt) {
        throw new SubscriptionError(
          ErrorCodes.RECEIPT_INVALID,
          'No receipt received from purchase'
        );
      }

      // Verify with backend
      console.log('[Subscription] Verifying receipt with backend...');
      const verificationResult = await this.verifyReceiptWithBackend(receipt);

      // Finish the transaction
      await RNIap.finishTransaction({ purchase, isConsumable: false });
      console.log('[Subscription] Transaction finished');

      // Cache the subscription status
      await this.cacheSubscriptionStatus(verificationResult);

      // Notify listeners
      if (this.onPurchaseUpdate) {
        this.onPurchaseUpdate({
          success: true,
          subscription: verificationResult,
        });
      }

      return verificationResult;
    } catch (error) {
      console.error('[Subscription] Failed to process purchase:', error);

      // Still try to finish the transaction to avoid duplicate charges
      try {
        await RNIap.finishTransaction({ purchase, isConsumable: false });
      } catch (finishError) {
        console.error('[Subscription] Failed to finish transaction:', finishError);
      }

      if (this.onPurchaseUpdate) {
        this.onPurchaseUpdate({
          success: false,
          error: error instanceof SubscriptionError ? error : new SubscriptionError(
            ErrorCodes.VERIFICATION_FAILED,
            'Failed to verify purchase',
            error
          ),
        });
      }

      throw error;
    }
  }

  /**
   * Map IAP errors to our error types
   */
  mapPurchaseError(error) {
    const errorCode = error.code || error.responseCode;

    switch (errorCode) {
      case 'E_USER_CANCELLED':
      case 'SKErrorPaymentCancelled':
        return new SubscriptionError(
          ErrorCodes.PURCHASE_CANCELLED,
          'Purchase was cancelled',
          error
        );

      case 'E_ALREADY_OWNED':
      case 'SKErrorPaymentAlreadyOwned':
        return new SubscriptionError(
          ErrorCodes.ALREADY_OWNED,
          'You already have an active subscription',
          error
        );

      case 'E_NETWORK_ERROR':
        return new SubscriptionError(
          ErrorCodes.NETWORK_ERROR,
          'Network error during purchase',
          error
        );

      case 'E_NOT_PREPARED':
        return new SubscriptionError(
          ErrorCodes.STORE_NOT_AVAILABLE,
          'App Store is not available',
          error
        );

      case 'SKErrorPaymentInvalid':
        return new SubscriptionError(
          ErrorCodes.PAYMENT_INVALID,
          'Payment method is invalid',
          error
        );

      case 'SKErrorPaymentNotAllowed':
        return new SubscriptionError(
          ErrorCodes.PAYMENT_NOT_ALLOWED,
          'Purchases are not allowed on this device',
          error
        );

      case 'E_DEFERRED_PAYMENT':
        return new SubscriptionError(
          ErrorCodes.PURCHASE_PENDING,
          'Purchase is pending approval (e.g., Ask to Buy)',
          error
        );

      default:
        return new SubscriptionError(
          ErrorCodes.PURCHASE_FAILED,
          error.message || 'Purchase failed',
          error
        );
    }
  }

  // ---------------------------------------------------------------------------
  // BACKEND VERIFICATION
  // ---------------------------------------------------------------------------

  /**
   * Verify receipt with backend
   */
  async verifyReceiptWithBackend(receiptData) {
    try {
      const deviceId = await getDeviceId();

      const response = await fetch(`${API_BASE_URL}/subscriptions/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          receipt_data: receiptData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new SubscriptionError(
          ErrorCodes.BACKEND_ERROR,
          errorData.error || `Server error: ${response.status}`
        );
      }

      const result = await response.json();

      if (result.status === 'invalid') {
        throw new SubscriptionError(
          ErrorCodes.RECEIPT_INVALID,
          result.error || 'Receipt validation failed'
        );
      }

      return {
        isActive: result.status === 'active',
        status: result.status,
        productId: result.product_id,
        expiresAt: result.expires_at ? new Date(result.expires_at) : null,
      };
    } catch (error) {
      console.error('[Subscription] Backend verification failed:', error);

      if (error instanceof SubscriptionError) {
        throw error;
      }

      if (error.name === 'TypeError' && error.message.includes('Network')) {
        throw new SubscriptionError(
          ErrorCodes.NETWORK_ERROR,
          'Could not reach server. Please check your internet connection.',
          error
        );
      }

      throw new SubscriptionError(
        ErrorCodes.VERIFICATION_FAILED,
        'Failed to verify purchase with server',
        error
      );
    }
  }

  /**
   * Check subscription status with backend
   */
  async checkSubscriptionStatus() {
    // Mock mode - return cached status or default
    if (this.isMockMode) {
      console.log('[Subscription] Checking status (MOCK)');
      await new Promise(resolve => setTimeout(resolve, 300));

      // Return cached status if we have one (from mock purchase)
      const cached = await this.getCachedSubscriptionStatus();
      if (cached) {
        console.log('[Subscription] Returning cached mock status');
        return cached;
      }

      // Default: not subscribed
      return {
        isActive: false,
        status: 'none',
        productId: null,
        expiresAt: null,
      };
    }

    try {
      const deviceId = await getDeviceId();

      const response = await fetch(
        `${API_BASE_URL}/subscriptions/status?device_id=${encodeURIComponent(deviceId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new SubscriptionError(
          ErrorCodes.BACKEND_ERROR,
          `Server error: ${response.status}`
        );
      }

      const result = await response.json();

      const status = {
        isActive: result.is_active,
        status: result.status,
        productId: result.product_id,
        expiresAt: result.expires_at ? new Date(result.expires_at) : null,
      };

      // Cache the result
      await this.cacheSubscriptionStatus(status);

      return status;
    } catch (error) {
      console.error('[Subscription] Status check failed:', error);

      // Return cached status if available
      const cached = await this.getCachedSubscriptionStatus();
      if (cached) {
        console.log('[Subscription] Returning cached status');
        return { ...cached, fromCache: true };
      }

      if (error instanceof SubscriptionError) {
        throw error;
      }

      throw new SubscriptionError(
        ErrorCodes.NETWORK_ERROR,
        'Could not check subscription status',
        error
      );
    }
  }

  // ---------------------------------------------------------------------------
  // RESTORE PURCHASES
  // ---------------------------------------------------------------------------

  /**
   * Restore previous purchases
   */
  async restorePurchases() {
    this.ensureInitialized();

    // Mock mode
    if (this.isMockMode) {
      console.log('[Subscription] Restoring purchases (MOCK)...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if we have a cached subscription (simulates a previous purchase)
      const cached = await this.getCachedSubscriptionStatus();
      if (cached && cached.isActive) {
        console.log('[Subscription] Mock restore found previous subscription');
        return cached;
      }

      // No previous purchase to restore
      throw new SubscriptionError(
        ErrorCodes.NO_PURCHASES_TO_RESTORE,
        'No previous purchases found to restore'
      );
    }

    try {
      console.log('[Subscription] Restoring purchases...');

      const purchases = await RNIap.getAvailablePurchases();

      console.log('[Subscription] Found purchases:', purchases.length);

      if (!purchases || purchases.length === 0) {
        throw new SubscriptionError(
          ErrorCodes.NO_PURCHASES_TO_RESTORE,
          'No previous purchases found'
        );
      }

      // Find the subscription purchase
      const subscriptionPurchase = purchases.find(
        (p) => p.productId === SUBSCRIPTION_PRODUCT_ID
      );

      if (!subscriptionPurchase) {
        throw new SubscriptionError(
          ErrorCodes.NO_PURCHASES_TO_RESTORE,
          'No subscription found to restore'
        );
      }

      // Verify with backend
      const result = await this.verifyReceiptWithBackend(
        subscriptionPurchase.transactionReceipt
      );

      console.log('[Subscription] Restore successful:', result);
      return result;
    } catch (error) {
      console.error('[Subscription] Restore failed:', error);

      if (error instanceof SubscriptionError) {
        throw error;
      }

      throw new SubscriptionError(
        ErrorCodes.RESTORE_FAILED,
        'Failed to restore purchases',
        error
      );
    }
  }

  // ---------------------------------------------------------------------------
  // CACHING
  // ---------------------------------------------------------------------------

  /**
   * Cache subscription status locally
   */
  async cacheSubscriptionStatus(status) {
    try {
      await AsyncStorage.setItem(
        SUBSCRIPTION_CACHE_KEY,
        JSON.stringify({
          ...status,
          cachedAt: Date.now(),
        })
      );
    } catch (error) {
      console.error('[Subscription] Failed to cache status:', error);
    }
  }

  /**
   * Get cached subscription status
   */
  async getCachedSubscriptionStatus() {
    try {
      const cached = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        // Return cached data with expiry check
        if (data.expiresAt) {
          data.expiresAt = new Date(data.expiresAt);
          // Check if expired based on cached expiry
          if (data.expiresAt < new Date()) {
            data.isActive = false;
            data.status = 'expired';
          }
        }
        return data;
      }
    } catch (error) {
      console.error('[Subscription] Failed to get cached status:', error);
    }
    return null;
  }

  /**
   * Clear cached subscription status
   */
  async clearCache() {
    try {
      await AsyncStorage.removeItem(SUBSCRIPTION_CACHE_KEY);
    } catch (error) {
      console.error('[Subscription] Failed to clear cache:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Ensure the service is initialized
   */
  ensureInitialized() {
    if (!this.isInitialized) {
      throw new SubscriptionError(
        ErrorCodes.NOT_INITIALIZED,
        'Subscription service not initialized. Call initialize() first.'
      );
    }
  }

  /**
   * Set callback for purchase updates
   */
  setPurchaseUpdateCallback(callback) {
    this.onPurchaseUpdate = callback;
  }
}

// Export singleton instance
export const subscriptionService = new SubscriptionService();

// Export for direct access to class if needed
export default SubscriptionService;
