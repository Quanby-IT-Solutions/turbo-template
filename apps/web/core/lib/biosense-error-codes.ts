/**
 * BiosenseSignal SDK Error Code Mappings
 * Maps error codes to user-friendly messages and solutions
 */

interface ErrorInfo {
  message: string
  solution: string
}

export const BIOSENSE_ERROR_CODES: Record<number, ErrorInfo> = {
  // Device Errors
  8: {
    message: "Device OS version is too old",
    solution: "Please upgrade your device's operating system or use another device."
  },
  17: {
    message: "Clock skew detected",
    solution: "Please verify that your device date, time and timezone are set correctly. Enable 'Set automatically' in device settings."
  },
  18: {
    message: "Browser version is too old",
    solution: "Please upgrade your browser or use another browser."
  },
  
  // Camera Errors
  1001: {
    message: "No camera found",
    solution: "Your device camera must support 640x480 resolution at 30FPS. Please verify your camera works properly."
  },
  1002: {
    message: "Could not access camera",
    solution: "Please verify your camera works properly and try again. If the problem persists, restart the application."
  },
  1005: {
    message: "Camera permission denied",
    solution: "Please grant permission to use your camera."
  },
  
  // License Errors
  2002: {
    message: "Device activation limit reached",
    solution: "Contact support to increase the number of device authorizations in your license."
  },
  2003: {
    message: "Measurement limit reached",
    solution: "No more measurements are allowed. Contact support to increase your measurement quota."
  },
  2004: {
    message: "License authentication failed",
    solution: "Check your internet connection, verify device time is correct, and ensure sufficient storage space."
  },
  2007: {
    message: "Invalid license key",
    solution: "Please use the license key provided by the support team. If the problem persists, contact support."
  },
  2010: {
    message: "License has been revoked",
    solution: "Contact customer support for assistance."
  },
  2016: {
    message: "SSL authentication error",
    solution: "Check your device's local time, internet connection, try a different network, or try again later."
  },
  2017: {
    message: "License has expired",
    solution: "Contact customer support to renew your license."
  },
  2018: {
    message: "License is suspended",
    solution: "Contact customer support for assistance."
  },
  2024: {
    message: "No internet connection",
    solution: "Please check your internet connection and try again."
  },
  2025: {
    message: "SSL certificate error",
    solution: "Check your device's local time, internet connection, try a different network, or try again later."
  },
  2032: {
    message: "No license key provided",
    solution: "Please provide a valid license key."
  },
  2034: {
    message: "Invalid product ID",
    solution: "The product ID must be null when establishing a session."
  },
  2035: {
    message: "Cannot read file system",
    solution: "Please check the installation integrity."
  },
  2036: {
    message: "License sync required",
    solution: "Check your internet connection and try again."
  },
  2037: {
    message: "SSL certificate error (device date)",
    solution: "Check your device's local time, internet connection, try a different network, or try again later."
  },
  2038: {
    message: "SSL certificate expired",
    solution: "Check your device's local time, internet connection, try a different network, or try again later."
  },
  2039: {
    message: "SDK version is too old",
    solution: "Upgrade to the latest SDK version or contact support."
  },
  2042: {
    message: "Network timeout",
    solution: "Check your internet connection speed, restart the application, wait briefly, or try a different network."
  },
  
  // Measurement Errors
  3003: {
    message: "Face not detected",
    solution: "Please ensure your face remains still and follow the measurement guidelines."
  },
  3004: {
    message: "Frame processing issues",
    solution: "Ensure your device is not overloaded. Improve lighting on your face. Close other applications and try again."
  },
  3006: {
    message: "License activation failed during measurement",
    solution: "Check your internet connection and verify no invalid proxy configuration is used. Contact support if the problem persists."
  },
  3008: {
    message: "Low frame rate detected",
    solution: "Close resource-intensive applications. Ensure your device is not overheated or overloaded. Allow it to cool down and retry."
  },
  3009: {
    message: "Frame ordering error",
    solution: "Please rerun the measurement."
  },
  
  // Session Errors
  6004: {
    message: "Session not ready",
    solution: "Please wait for the session to become ready before starting measurement."
  },
  6005: {
    message: "Invalid stop call",
    solution: "Session is not in measuring state."
  },
  
  // Initialization Errors
  7002: {
    message: "Invalid measurement duration",
    solution: "Measurement duration must be between 20-180 seconds."
  },
  7005: {
    message: "Invalid license format",
    solution: "Check the license key format. It should not contain spaces, newlines, or special characters."
  },
  7006: {
    message: "SDK failed to load",
    solution: "Ensure a.wasm.gz file is accessible. Check server configuration."
  },
  7007: {
    message: "Unsupported user weight",
    solution: "Weight must be between 40-200 kilograms, or leave it unspecified."
  },
  7008: {
    message: "Unsupported user age",
    solution: "Age must be between 18-110 years, or leave it unspecified."
  },
  7009: {
    message: "Concurrent session error",
    solution: "Please terminate the previous session before creating a new one."
  },
  7012: {
    message: "Unsupported user height",
    solution: "Height must be between 130-230 centimeters, or leave it unspecified."
  },
  7013: {
    message: "Memory allocation error",
    solution: "Try opening the page in a new tab or restart your browser. This is a known issue on iOS 17 and earlier."
  },
  7014: {
    message: "Memory allocation failed",
    solution: "Close all other applications and browser tabs, wait a few seconds and try again. If it persists, your device may be too weak to run the SDK."
  },
  7015: {
    message: "Browser does not support SharedArrayBuffer",
    solution: "Upgrade your browser version or use another browser/device."
  },
}

/**
 * Get user-friendly error message for an error code
 */
export function getErrorInfo(code: number): ErrorInfo {
  // Check if we have a known error code
  if (BIOSENSE_ERROR_CODES[code]) {
    return BIOSENSE_ERROR_CODES[code]
  }
  
  // Handle unknown/internal error codes
  // Error codes 37000+ might be internal errors or custom errors
  if (code >= 37000 && code < 38000) {
    // Specific handling for 37002 (license/offline measurements error)
    if (code === 37002) {
      return {
        message: "License information error",
        solution: "The measurement completed successfully, but there was an issue retrieving license information. This doesn't affect your measurement results. If this persists, contact support."
      }
    }
    return {
      message: "Internal SDK error occurred",
      solution: "This appears to be an internal error. The measurement may have completed successfully despite this error. If the issue persists, please contact support with error code: " + code
    }
  }
  
  // Generic fallback for unknown errors
  return {
    message: "An error occurred",
    solution: "Please try again. If the problem persists, contact support with error code: " + code
  }
}

