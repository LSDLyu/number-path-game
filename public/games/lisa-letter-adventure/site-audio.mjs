/** Shared, device-local audio preferences. Reading never starts playback. */
export const audioPreferenceKey = 'zide-audio-preferences-v1';
export const audioPreferenceEvent = 'zide-audio-change';
const defaults = { muted: false, music: true, effects: true, voice: true };
let memory = { ...defaults };
function normalize(value) {
  const result = { ...defaults };
  for (const key of Object.keys(result)) if (typeof value?.[key] === 'boolean') result[key] = value[key];
  return result;
}
export function readAudioPreferences() {
  try {
    const value = globalThis.localStorage?.getItem(audioPreferenceKey);
    if (value) return normalize(JSON.parse(value));
  } catch { /* Private browsing and storage failures do not prevent play. */ }
  return { ...memory };
}
export function allowsAudio(channel = 'effects') {
  const prefs = readAudioPreferences();
  return !prefs.muted && prefs[channel] === true;
}
export function setAudioPreferences(patch) {
  const current = readAudioPreferences();
  for (const key of Object.keys(defaults)) if (typeof patch?.[key] === 'boolean') current[key] = patch[key];
  memory = current;
  try { globalThis.localStorage?.setItem(audioPreferenceKey, JSON.stringify(current)); } catch { /* Session-only preference. */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(audioPreferenceEvent, { detail: current }));
  return { ...current };
}
export function subscribeAudio(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(audioPreferenceEvent, callback);
  return () => window.removeEventListener(audioPreferenceEvent, callback);
}
if (typeof window !== 'undefined') {
  window.addEventListener(audioPreferenceEvent, event => { if (event.detail) memory = normalize(event.detail); });
  if (!window.ZideAudio) {
    window.ZideAudio = { read: readAudioPreferences, set: setAudioPreferences, allows: allowsAudio, subscribe: subscribeAudio };
    window.addEventListener('storage', event => {
      if (event.key === audioPreferenceKey || event.key === null) {
        memory = { ...defaults };
        window.dispatchEvent(new CustomEvent(audioPreferenceEvent, { detail: readAudioPreferences() }));
      }
    });
    window.dispatchEvent(new CustomEvent(audioPreferenceEvent, { detail: readAudioPreferences() }));
  }
}
