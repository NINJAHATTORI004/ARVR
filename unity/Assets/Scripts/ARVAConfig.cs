/**
 * ARVA Configuration
 * Centralized configuration for the ARVA Unity application
 */

using UnityEngine;

namespace ARVA
{
    [CreateAssetMenu(fileName = "ARVAConfig", menuName = "ARVA/Configuration")]
    public class ARVAConfig : ScriptableObject
    {
        [Header("API Settings")]
        [Tooltip("Base URL of the ARVA backend server")]
        public string apiBaseUrl = "http://localhost:3000";
        
        [Tooltip("Request timeout in seconds")]
        public float requestTimeout = 30f;
        
        [Header("AR Settings")]
        [Tooltip("Distance of AR overlay from camera")]
        public float overlayDistance = 0.5f;
        
        [Tooltip("Scale of AR overlay")]
        public float overlayScale = 0.3f;
        
        [Tooltip("Animation duration for overlays")]
        public float animationDuration = 0.3f;
        
        [Header("Scanner Settings")]
        [Tooltip("Interval between QR scan attempts")]
        public float scanInterval = 0.5f;
        
        [Tooltip("Start scanning automatically")]
        public bool autoStartScanning = true;
        
        [Tooltip("Continue scanning after finding a code")]
        public bool continuousScanning = false;
        
        [Header("Colors")]
        public Color verifiedColor = new Color(0.2f, 0.8f, 0.2f, 0.9f);
        public Color unverifiedColor = new Color(0.9f, 0.2f, 0.2f, 0.9f);
        public Color loadingColor = new Color(0.3f, 0.5f, 0.9f, 0.9f);
        public Color warningColor = new Color(1f, 0.6f, 0f, 0.9f);
        
        [Header("Demo Settings")]
        public bool enableDemoMode = true;
        public KeyCode demoToggleKey = KeyCode.D;
    }
}
