export type AudioChannel = 'music' | 'effects' | 'voice';
export type AudioPreferences = { muted: boolean; music: boolean; effects: boolean; voice: boolean };
export const audioPreferenceKey: string;
export const audioPreferenceEvent: string;
export function readAudioPreferences(): AudioPreferences;
export function allowsAudio(channel?: AudioChannel): boolean;
export function setAudioPreferences(patch: Partial<AudioPreferences>): AudioPreferences;
export function subscribeAudio(callback: () => void): () => void;
