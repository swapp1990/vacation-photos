import { useState, useEffect, useCallback } from 'react';
import {
  subscriptionService,
  SubscriptionError,
  ErrorCodes,
  ErrorMessages,
} from '../services/subscriptionService';

/**
 * Hook for managing subscription state and actions
 */
export function useSubscription() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize the service
        await subscriptionService.initialize();

        if (!mounted) return;
        setIsInitialized(true);

        // Set up purchase callback
        subscriptionService.setPurchaseUpdateCallback((result) => {
          if (!mounted) return;

          setIsPurchasing(false);

          if (result.success) {
            setSubscription(result.subscription);
            setError(null);
          } else {
            setError(result.error);
          }
        });

        // Load product and subscription status in parallel
        const [productResult, statusResult] = await Promise.allSettled([
          subscriptionService.getProduct(),
          subscriptionService.checkSubscriptionStatus(),
        ]);

        if (!mounted) return;

        // Handle product result
        if (productResult.status === 'fulfilled') {
          setProduct(productResult.value);
        } else {
          console.warn('[useSubscription] Failed to load product:', productResult.reason);
          // Set error only if we don't have cached subscription
          if (statusResult.status !== 'fulfilled') {
            setError(productResult.reason);
          }
        }

        // Handle subscription status result
        if (statusResult.status === 'fulfilled') {
          setSubscription(statusResult.value);
        } else {
          console.warn('[useSubscription] Failed to check status:', statusResult.reason);
        }
      } catch (err) {
        console.error('[useSubscription] Initialization failed:', err);
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      subscriptionService.disconnect();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Purchase the subscription
   */
  const purchase = useCallback(async () => {
    if (!isInitialized) {
      setError(new SubscriptionError(
        ErrorCodes.NOT_INITIALIZED,
        ErrorMessages[ErrorCodes.NOT_INITIALIZED]
      ));
      return { success: false };
    }

    try {
      setIsPurchasing(true);
      setError(null);

      await subscriptionService.purchaseSubscription();

      // The result will come through the callback
      // Return pending status
      return { success: true, pending: true };
    } catch (err) {
      setIsPurchasing(false);
      setError(err);
      return { success: false, error: err };
    }
  }, [isInitialized]);

  /**
   * Restore previous purchases
   */
  const restore = useCallback(async () => {
    if (!isInitialized) {
      setError(new SubscriptionError(
        ErrorCodes.NOT_INITIALIZED,
        ErrorMessages[ErrorCodes.NOT_INITIALIZED]
      ));
      return { success: false };
    }

    try {
      setIsRestoring(true);
      setError(null);

      const result = await subscriptionService.restorePurchases();
      setSubscription(result);

      return { success: true, subscription: result };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    } finally {
      setIsRestoring(false);
    }
  }, [isInitialized]);

  /**
   * Refresh subscription status
   */
  const refreshStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await subscriptionService.checkSubscriptionStatus();
      setSubscription(status);
      return { success: true, subscription: status };
    } catch (err) {
      setError(err);
      return { success: false, error: err };
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Retry initialization
   */
  const retry = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!isInitialized) {
        await subscriptionService.initialize();
        setIsInitialized(true);
      }

      const [productResult, statusResult] = await Promise.allSettled([
        subscriptionService.getProduct(),
        subscriptionService.checkSubscriptionStatus(),
      ]);

      if (productResult.status === 'fulfilled') {
        setProduct(productResult.value);
      } else {
        setError(productResult.reason);
      }

      if (statusResult.status === 'fulfilled') {
        setSubscription(statusResult.value);
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // ---------------------------------------------------------------------------
  // DERIVED STATE
  // ---------------------------------------------------------------------------

  const isSubscribed = subscription?.isActive === true;
  const isPro = isSubscribed;

  // Get user-friendly error message
  const errorMessage = error
    ? ErrorMessages[error.code] || error.message || ErrorMessages[ErrorCodes.UNKNOWN_ERROR]
    : null;

  return {
    // State
    isInitialized,
    isLoading,
    product,
    subscription,
    isSubscribed,
    isPro,
    error,
    errorMessage,
    isPurchasing,
    isRestoring,

    // Actions
    purchase,
    restore,
    refreshStatus,
    clearError,
    retry,
  };
}

export default useSubscription;
