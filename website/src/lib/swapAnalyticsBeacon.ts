/**
 * SwapAnalytics page_view beacon for vacationphotos marketing.
 * Twin of molty/swapp1990 HTML beacons (see SWAPANALYTICS_MOLTY_TWIN.js.txt).
 * Inlined via next/script (afterInteractive) in app/layout.tsx — static export safe.
 */
export const SWAP_ANALYTICS_BEACON_SCRIPT = `(function () {
  var ENDPOINT = 'https://analytics.swapp1990.org/api/events';
  var APP_ID = 'vacationphotos';
  var PROD_HOST = 'vacationphotos.swapp1990.org';
  var DEVICE_KEY = 'swapanalytics_device_id';

  function uuid() {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getDeviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (!id) {
        id = uuid();
        localStorage.setItem(DEVICE_KEY, id);
      }
      return id;
    } catch (e) {
      return uuid();
    }
  }

  function environment() {
    try {
      return location.hostname === PROD_HOST ? 'production' : 'development';
    } catch (e) {
      return 'development';
    }
  }

  function utmMeta() {
    var out = {};
    try {
      var params = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
        var v = params.get(k);
        if (v) out[k] = v;
      });
    } catch (e) {}
    return out;
  }

  function send(eventName, metadata) {
    try {
      var payload = {
        appId: APP_ID,
        eventName: eventName,
        environment: environment(),
        metadata: metadata || {},
        deviceId: getDeviceId()
      };
      var body = JSON.stringify(payload);
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return;
      }
      if (typeof fetch === 'function') {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {
      /* analytics must never break the page */
    }
  }

  try {
    var meta = {
      path: location.pathname + location.search,
      referrer: document.referrer || null
    };
    var utm = utmMeta();
    for (var k in utm) {
      if (Object.prototype.hasOwnProperty.call(utm, k)) meta[k] = utm[k];
    }
    send('page_view', meta);
  } catch (e) {}
})();
`;
