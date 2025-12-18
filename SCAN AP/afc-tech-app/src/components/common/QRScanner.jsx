import React, { useState, useRef } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';

const QRScanner = () => {
  const [scannedUrl, setScannedUrl] = useState(null);
  const scannerRef = useRef(null);

  const handleScan = (result) => {
    if (result) {
      const url = result[0]?.rawValue; // Get the raw value from the scan result
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        setScannedUrl(url); // Store the URL
        // Redirect the user
        window.location.href = url; // This redirects the current browser tab to the URL
      } else {
        // Handle cases where the scanned data is not a valid URL (optional)
        console.log("Scanned data is not a valid URL:", url);
      }
    }
  };

  const handleError = (error) => {
    console.error(error);
  };

  return (
    <div>
      <h1>Scan a QR Code to Redirect</h1>
      {scannedUrl ? (
        <p>Redirecting to: {scannedUrl}</p>
      ) : (
        <div ref={scannerRef} style={{ width: '500px', height: '500px' }}>
          <QrScanner
            onDecode={handleScan}
            onError={handleError}
          />
        </div>
      )}
    </div>
  );
};

export default QRScanner;
