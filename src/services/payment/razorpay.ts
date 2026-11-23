const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('payment.scriptLoadError'));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export interface RazorpayPaymentRequest {
  amountPaise: number;
  visitorName: string;
  visitorMobile: string;
  counterCode: string;
  operatorName: string;
  personsLabel: string;
}

export interface RazorpayPaymentResult {
  razorpayPaymentId: string;
}

// Frontend-only test-mode integration (see README/§10.2): without a backend there is no
// order creation or signature verification, so this must not be used for real payments as-is.
export async function payWithRazorpay(request: RazorpayPaymentRequest): Promise<RazorpayPaymentResult> {
  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId) {
    throw new Error('payment.notConfigured');
  }

  await loadCheckoutScript();

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      fn();
    };

    // Razorpay's modal.ondismiss / payment.failed only fire once checkout actually opens.
    // If the key is invalid or the widget can't initialize, neither fires — this watchdog
    // keeps the counter from getting stuck with a disabled Confirm & Print button.
    const watchdog = setTimeout(() => {
      settle(() =>
        reject(new Error('payment.noResponse')),
      );
    }, 20000);

    const rzp = new window.Razorpay({
      key: keyId,
      amount: request.amountPaise,
      currency: 'INR',
      name: 'TTDC Fair',
      description: `Entry ticket – ${request.personsLabel}`,
      prefill: { name: request.visitorName || '', contact: request.visitorMobile || '' },
      notes: { counter: request.counterCode, operator: request.operatorName },
      method: { upi: true, card: false, netbanking: false, wallet: false },
      theme: { color: '#0B5394' },
      handler: (res) => settle(() => resolve({ razorpayPaymentId: res.razorpay_payment_id })),
      modal: {
        ondismiss: () => settle(() => reject(new Error('payment.cancelled'))),
      },
    });

    rzp.on('payment.failed', (res) => {
      settle(() => reject(new Error(res.error?.description || 'payment.failed')));
    });

    try {
      rzp.open();
    } catch {
      settle(() => reject(new Error('payment.openFailed')));
    }
  });
}
