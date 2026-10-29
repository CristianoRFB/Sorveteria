/** WebChannel connections to local Firebase Emulator can stall in headless Chrome.
 * Use the emulator-only long-polling mode; hosted Firebase uses SDK defaults.
 */
export function firestoreTransportSettings(usingEmulators: boolean) {
  return usingEmulators ? {experimentalForceLongPolling: true} : {};
}
