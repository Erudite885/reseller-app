import { requireNativeModule, EventEmitter } from 'expo-modules-core';

interface PawnsEvents {
  [key: string]: (...args: any[]) => void;
  onError: (e: { message: string }) => void;
  onConsentGranted: (e: { timestamp: number }) => void;
  onConsentDenied: (e: { timestamp: number }) => void;
  onSdkStarted: (e: { timestamp: number }) => void;
  onSdkStopped: (e: { timestamp: number }) => void;
}

export const PawnsModule = requireNativeModule('PawnsModule');
export const PawnsEmitter = new EventEmitter<PawnsEvents>(PawnsModule);

export interface PawnsStatus {
  isRunning: boolean;
  isConsentGiven: boolean;
  serviceState: string;
  initialized: boolean;
  lastError?: string | null;
}

export interface SdkResult {
  success: boolean;
  message?: string;
}

export interface PawnsConfig {
  apiKey: string;
  deviceID: string;
  deviceName: string;
  [key: string]: any;
}

/**
 * Initialize the Pawns SDK
 * 
 * Per the Partner Integration Guide:
 * Initialize(deviceID, deviceName)
 * 
 * @param apiKey - Your Pawns API key from the partner dashboard
 * @param deviceID - Unique device identifier
 * @param deviceName - Human-readable device name
 * @returns Promise with success status
 */
export const initialize = (
  apiKey: string,
  deviceID: string,
  deviceName: string
): Promise<SdkResult> => PawnsModule.initialize(apiKey, deviceID, deviceName);

/**
 * Start the Pawns SDK sharing
 * 
 * Per the Partner Integration Guide:
 * StartMainRoutine(accessToken, callback)
 * 
 * @returns Promise with success status
 */
export const start = (): Promise<SdkResult> => PawnsModule.start();

/**
 * Stop the Pawns SDK sharing
 * 
 * Per the Partner Integration Guide:
 * StopMainRoutine()
 * 
 * @returns Promise with success status
 */
export const stop = (): Promise<SdkResult> => PawnsModule.stop();

/**
 * Opt in (grant consent)
 * 
 * @returns Promise with success status
 */
export const optIn = (): Promise<SdkResult> => PawnsModule.optIn();

/**
 * Opt out (revoke consent)
 * 
 * @returns Promise with success status
 */
export const optOut = (): Promise<SdkResult> => PawnsModule.optOut();

/**
 * Get current SDK status
 * 
 * @returns Promise with PawnsStatus
 */
export const getStatus = (): Promise<PawnsStatus> => PawnsModule.getStatus();

/**
 * Get the last error that occurred
 * 
 * @returns Promise with error message or null
 */
export const getLastError = (): Promise<string | null> => PawnsModule.getLastError();

/**
 * Configure the SDK (optional)
 * 
 * @param config - Configuration object
 * @returns Promise with success status
 */
export const configure = (config: PawnsConfig): Promise<SdkResult> =>
  PawnsModule.configure(config);

/**
 * Listen for error events
 * 
 * @param callback - Function called when an error occurs
 * @returns Subscription that can be removed
 */
export const onError = (callback: (event: { message: string }) => void) =>
  PawnsEmitter.addListener('onError', callback);

/**
 * Listen for consent granted events
 * 
 * @param callback - Function called when consent is granted
 * @returns Subscription that can be removed
 */
export const onConsentGranted = (callback: (event: { timestamp: number }) => void) =>
  PawnsEmitter.addListener('onConsentGranted', callback);

/**
 * Listen for consent denied events
 * 
 * @param callback - Function called when consent is denied
 * @returns Subscription that can be removed
 */
export const onConsentDenied = (callback: (event: { timestamp: number }) => void) =>
  PawnsEmitter.addListener('onConsentDenied', callback);

/**
 * Listen for SDK started events
 * 
 * @param callback - Function called when SDK starts
 * @returns Subscription that can be removed
 */
export const onSdkStarted = (callback: (event: { timestamp: number }) => void) =>
  PawnsEmitter.addListener('onSdkStarted', callback);

/**
 * Listen for SDK stopped events
 * 
 * @param callback - Function called when SDK stops
 * @returns Subscription that can be removed
 */
export const onSdkStopped = (callback: (event: { timestamp: number }) => void) =>
  PawnsEmitter.addListener('onSdkStopped', callback);

export default {
  PawnsModule,
  PawnsEmitter,
  initialize,
  start,
  stop,
  optIn,
  optOut,
  getStatus,
  getLastError,
  configure,
  onError,
  onConsentGranted,
  onConsentDenied,
  onSdkStarted,
  onSdkStopped,
};