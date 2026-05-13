// modules/pawns/android/src/main/java/com/pawns/sdk/PawnsModule.kt
package com.pawns.sdk

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import app.pawns.sdk.Pawns
import app.pawns.sdk.PawnsServiceListener
import app.pawns.sdk.ServiceConfig
import app.pawns.sdk.ServiceState
import app.pawns.sdk.ServiceType
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class PawnsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "PawnsModule"

    private var listenerCount = 0

    private val serviceListener = object : PawnsServiceListener {
        override fun onStateChange(state: ServiceState) {
            sendEvent("PawnsStateChange", state.name)
        }
    }

    private fun sendEvent(eventName: String, params: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun initialize(apiKey: String, serviceConfig: ReadableMap, promise: Promise) {
        try {
            val title = if (serviceConfig.hasKey("title")) serviceConfig.getString("title") ?: "Bandwidth Sharing" else "Bandwidth Sharing"
            val body = if (serviceConfig.hasKey("body")) serviceConfig.getString("body") ?: "Sharing your internet to earn rewards" else "Sharing your internet to earn rewards"

            // Use app icon as notification small icon (ensure ic_notification exists in drawable)
            val iconResId = reactContext.resources.getIdentifier(
                "ic_notification", "drawable", reactContext.packageName
            ).takeIf { it != 0 }
                ?: reactContext.resources.getIdentifier(
                    "ic_launcher", "mipmap", reactContext.packageName
                )

            Pawns.Builder(reactContext)
                .apiKey(apiKey)
                .serviceConfig(
                    ServiceConfig(
                        title = title,
                        body = body,
                        smallIcon = iconResId
                    )
                )
                .serviceType(ServiceType.FOREGROUND)
                .build()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message ?: "Failed to initialize Pawns SDK")
        }
    }

    @ReactMethod
    fun startSharing(promise: Promise) {
        try {
            Pawns.getInstance().startSharing(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message ?: "Failed to start sharing")
        }
    }

    @ReactMethod
    fun stopSharing(promise: Promise) {
        try {
            Pawns.getInstance().stopSharing(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message ?: "Failed to stop sharing")
        }
    }

    @ReactMethod
    fun isConsentGiven(promise: Promise) {
        try {
            promise.resolve(Pawns.getInstance().isConsentGiven())
        } catch (e: Exception) {
            promise.reject("CONSENT_ERROR", e.message ?: "Failed to check consent")
        }
    }

    @ReactMethod
    fun setConsentGiven(given: Boolean, promise: Promise) {
        try {
            Pawns.getInstance().setConsentGiven(given)
            // If consent revoked, stop sharing immediately
            if (!given) {
                Pawns.getInstance().stopSharing(reactContext)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CONSENT_SET_ERROR", e.message ?: "Failed to set consent")
        }
    }

    @ReactMethod
    fun getServiceState(promise: Promise) {
        try {
            promise.resolve(Pawns.getInstance().getServiceStateSnapshot().name)
        } catch (e: Exception) {
            promise.reject("STATE_ERROR", e.message ?: "Failed to get service state")
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption() {
        try {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:" + reactContext.packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            // Silently fail — not all devices support this
        }
    }

    // Required for NativeEventEmitter on RN side
    @ReactMethod
    fun addListener(eventName: String) {
        if (listenerCount == 0) {
            Pawns.getInstance().registerListener(serviceListener)
        }
        listenerCount++
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount -= count
        if (listenerCount <= 0) {
            listenerCount = 0
            Pawns.getInstance().unregisterListener()
        }
    }
}