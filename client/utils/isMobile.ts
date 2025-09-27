/**
 * Checks the user agent string to determine if the device is a mobile phone or tablet.
 * @returns {boolean} True if the device is identified as mobile, otherwise false.
 */
export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(navigator.userAgent);
};
