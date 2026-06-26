import '../config/dns';
import dns from 'dns';
import https from 'https';
import axios from 'axios';

// Local/campus DNS (e.g. 10.253.0.1) often fails for api.razorpay.com.
// Resolve via public DNS, then connect with explicit IPv4 lookup.
type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | dns.LookupAddress[],
  family?: number
) => void;

const lookup = (
  hostname: string,
  options: dns.LookupOptions | dns.LookupOneOptions | LookupCallback,
  callback?: LookupCallback
) => {
  let opts: dns.LookupOptions = { family: 4 };
  let cb = callback;

  if (typeof options === 'function') {
    cb = options;
  } else if (options && typeof options === 'object') {
    opts = { family: 4, ...options };
  }

  if (!cb) return;

  const finish = (err: NodeJS.ErrnoException | null, addresses: string[]) => {
    if (err || addresses.length === 0) {
      cb!(err || new Error(`DNS lookup failed for ${hostname}`), opts.all ? [] : '', 4);
      return;
    }

    if (opts.all) {
      cb!(
        null,
        addresses.map((address) => ({ address, family: 4 }))
      );
      return;
    }

    cb!(null, addresses[0], 4);
  };

  dns.resolve4(hostname, (err, addresses) => {
    if (!err && addresses.length > 0) {
      finish(null, addresses);
      return;
    }

    dns.lookup(hostname, opts, (lookupErr, address, family) => {
      if (lookupErr) {
        cb!(lookupErr, opts.all ? [] : '', family);
        return;
      }

      if (opts.all && Array.isArray(address)) {
        cb!(null, address);
        return;
      }

      cb!(null, address as string, family);
    });
  });
};

const httpsAgent = new https.Agent({
  lookup: lookup as https.AgentOptions['lookup'],
  keepAlive: true
});

function getCredentials() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_T1ox9Zd2QpcO6M',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '2w4vrpAImNMnt0lUmGY78Apm'
  };
}

export function buildRazorpayReceipt(transactionId: string): string {
  const idPart = String(transactionId).replace(/[^a-zA-Z0-9]/g, '').slice(-10);
  const stamp = Date.now().toString(36);
  return `pb_${idPart}_${stamp}`.slice(0, 40);
}

export async function createRazorpayOrder(options: {
  amount: number;
  currency: string;
  receipt: string;
  payment_capture: number;
}) {
  const { keyId, keySecret } = getCredentials();

  const { data } = await axios.post('https://api.razorpay.com/v1/orders', options, {
    httpsAgent,
    auth: { username: keyId, password: keySecret },
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
  });

  return data;
}

export function getRazorpayKeyId() {
  return getCredentials().keyId;
}
