/**
 * ARVA Manager - Main Controller for AR Verification
 * Attach this to a central GameObject in your Unity scene
 * Handles communication with the Node.js backend and displays verification results
 */

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using TMPro;

namespace ARVA
{
    public class ARVAManager : MonoBehaviour
    {
        #region Configuration
        [Header("API Configuration")]
        [Tooltip("Base URL of the ARVA backend server")]
        [SerializeField] private string apiBaseUrl = "http://localhost:3000";
        
        [Tooltip("Timeout for API requests in seconds")]
        [SerializeField] private float requestTimeout = 30f;
        #endregion

        #region UI References
        [Header("UI Elements")]
        [Tooltip("Main verification status text")]
        public TMP_Text verificationText;
        
        [Tooltip("Asset details text (issuer, owner, etc.)")]
        public TMP_Text detailsText;
        
        [Tooltip("Asset type text")]
        public TMP_Text assetTypeText;
        
        [Tooltip("Green overlay panel shown when verified")]
        public GameObject verifiedOverlay;
        
        [Tooltip("Red overlay panel shown when not verified")]
        public GameObject unverifiedOverlay;
        
        [Tooltip("Loading indicator")]
        public GameObject loadingIndicator;
        
        [Tooltip("Main result panel")]
        public GameObject resultPanel;
        #endregion

        #region Events
        public event Action<VerificationResponse> OnVerificationComplete;
        public event Action<string> OnVerificationError;
        public event Action OnVerificationStarted;
        #endregion

        #region Private Fields
        private bool isVerifying = false;
        #endregion

        #region Data Classes
        [Serializable]
        public class VerificationRequest
        {
            public string uniqueId;
        }

        [Serializable]
        public class VerificationResponse
        {
            public string status;
            public bool isVerified;
            public string tokenId;
            public string issuerDID;
            public string owner;
            public string assetType;
            public string message;
            public string error;
            public string verificationTimestamp;
            public string blockchainNetwork;
            public MetadataResponse metadata;
        }

        [Serializable]
        public class MetadataResponse
        {
            public string name;
            public string institution;
            public string graduateId;
            public string graduationDate;
            public string model;
            public string serialNumber;
        }
        #endregion

        #region Unity Lifecycle
        private void Awake()
        {
            // Ensure API URL doesn't have trailing slash
            apiBaseUrl = apiBaseUrl.TrimEnd('/');
        }

        private void Start()
        {
            // Initialize UI state
            HideAllOverlays();
            if (loadingIndicator != null) loadingIndicator.SetActive(false);
            if (resultPanel != null) resultPanel.SetActive(false);
        }
        #endregion

        #region Public API
        /// <summary>
        /// Start verification process for a scanned asset identifier
        /// Called by QR Scanner or manual input
        /// </summary>
        /// <param name="scannedIdentifier">The unique identifier scanned from the asset</param>
        public void StartVerification(string scannedIdentifier)
        {
            if (string.IsNullOrEmpty(scannedIdentifier))
            {
                Debug.LogError("[ARVA] Cannot verify empty identifier");
                ShowError("Invalid scan. Please try again.");
                return;
            }

            if (isVerifying)
            {
                Debug.LogWarning("[ARVA] Verification already in progress");
                return;
            }

            Debug.Log($"[ARVA] Starting verification for: {scannedIdentifier}");
            StartCoroutine(SendVerificationRequest(scannedIdentifier));
        }

        /// <summary>
        /// Reset the UI to initial state
        /// </summary>
        public void ResetUI()
        {
            HideAllOverlays();
            if (resultPanel != null) resultPanel.SetActive(false);
            if (verificationText != null) verificationText.text = "";
            if (detailsText != null) detailsText.text = "";
            if (assetTypeText != null) assetTypeText.text = "";
        }

        /// <summary>
        /// Check if the backend server is reachable
        /// </summary>
        public void CheckServerHealth()
        {
            StartCoroutine(HealthCheck());
        }
        #endregion

        #region Private Methods
        private IEnumerator SendVerificationRequest(string uniqueId)
        {
            isVerifying = true;
            OnVerificationStarted?.Invoke();

            // Show loading state
            HideAllOverlays();
            if (loadingIndicator != null) loadingIndicator.SetActive(true);
            if (resultPanel != null) resultPanel.SetActive(true);
            if (verificationText != null) verificationText.text = "Verifying...";

            // Prepare request
            string url = $"{apiBaseUrl}/api/verify";
            VerificationRequest requestData = new VerificationRequest { uniqueId = uniqueId };
            string jsonPayload = JsonUtility.ToJson(requestData);

            using (UnityWebRequest webRequest = new UnityWebRequest(url, "POST"))
            {
                // Set up request
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(jsonPayload);
                webRequest.uploadHandler = new UploadHandlerRaw(bodyRaw);
                webRequest.downloadHandler = new DownloadHandlerBuffer();
                webRequest.SetRequestHeader("Content-Type", "application/json");
                webRequest.timeout = (int)requestTimeout;

                // Send request
                yield return webRequest.SendWebRequest();

                // Hide loading
                if (loadingIndicator != null) loadingIndicator.SetActive(false);

                // Handle response
                if (webRequest.result == UnityWebRequest.Result.Success)
                {
                    string responseJson = webRequest.downloadHandler.text;
                    Debug.Log($"[ARVA] Response: {responseJson}");

                    try
                    {
                        VerificationResponse response = JsonUtility.FromJson<VerificationResponse>(responseJson);
                        HandleVerificationResponse(response);
                        OnVerificationComplete?.Invoke(response);
                    }
                    catch (Exception e)
                    {
                        Debug.LogError($"[ARVA] Failed to parse response: {e.Message}");
                        ShowError("Failed to parse server response");
                        OnVerificationError?.Invoke("Parse error");
                    }
                }
                else
                {
                    Debug.LogError($"[ARVA] Request failed: {webRequest.error}");
                    HandleNetworkError(webRequest.error);
                    OnVerificationError?.Invoke(webRequest.error);
                }
            }

            isVerifying = false;
        }

        private void HandleVerificationResponse(VerificationResponse response)
        {
            if (resultPanel != null) resultPanel.SetActive(true);

            if (response.isVerified)
            {
                ShowVerified(response);
            }
            else
            {
                ShowNotVerified(response);
            }
        }

        private void ShowVerified(VerificationResponse response)
        {
            HideAllOverlays();
            if (verifiedOverlay != null) verifiedOverlay.SetActive(true);

            // Main status
            if (verificationText != null)
            {
                verificationText.text = "✓ VERIFIED";
                verificationText.color = new Color(0.2f, 0.8f, 0.2f); // Green
            }

            // Details
            if (detailsText != null)
            {
                string ownerDisplay = !string.IsNullOrEmpty(response.owner) && response.owner.Length > 10
                    ? $"{response.owner.Substring(0, 6)}...{response.owner.Substring(response.owner.Length - 4)}"
                    : response.owner;

                detailsText.text = $"Issuer: {FormatIssuerDID(response.issuerDID)}\n" +
                                   $"Owner: {ownerDisplay}\n" +
                                   $"Token ID: {response.tokenId}\n" +
                                   $"Network: {response.blockchainNetwork}";
            }

            // Asset type
            if (assetTypeText != null)
            {
                assetTypeText.text = FormatAssetType(response.assetType);
            }

            // Play success sound/haptic feedback
            PlayFeedback(true);
        }

        private void ShowNotVerified(VerificationResponse response)
        {
            HideAllOverlays();
            if (unverifiedOverlay != null) unverifiedOverlay.SetActive(true);

            // Main status
            if (verificationText != null)
            {
                verificationText.text = "✗ NOT VERIFIED";
                verificationText.color = new Color(0.9f, 0.2f, 0.2f); // Red
            }

            // Details
            if (detailsText != null)
            {
                string reason = !string.IsNullOrEmpty(response.message) 
                    ? response.message 
                    : "Asset not found in blockchain registry";
                
                detailsText.text = $"Status: {response.status}\n" +
                                   $"Reason: {reason}\n\n" +
                                   "This asset could not be verified.\n" +
                                   "It may be counterfeit or not registered.";
            }

            // Asset type
            if (assetTypeText != null)
            {
                assetTypeText.text = "UNVERIFIED ASSET";
            }

            // Play failure sound/haptic feedback
            PlayFeedback(false);
        }

        private void ShowError(string errorMessage)
        {
            HideAllOverlays();
            if (unverifiedOverlay != null) unverifiedOverlay.SetActive(true);
            if (resultPanel != null) resultPanel.SetActive(true);

            if (verificationText != null)
            {
                verificationText.text = "⚠ ERROR";
                verificationText.color = new Color(1f, 0.6f, 0f); // Orange
            }

            if (detailsText != null)
            {
                detailsText.text = $"Error: {errorMessage}\n\n" +
                                   "Please check your connection\n" +
                                   "and try again.";
            }
        }

        private void HandleNetworkError(string error)
        {
            string userMessage;

            if (error.Contains("Cannot connect"))
            {
                userMessage = "Cannot connect to verification server.\nPlease check your internet connection.";
            }
            else if (error.Contains("timeout"))
            {
                userMessage = "Request timed out.\nThe server took too long to respond.";
            }
            else
            {
                userMessage = $"Network error: {error}";
            }

            ShowError(userMessage);
        }

        private void HideAllOverlays()
        {
            if (verifiedOverlay != null) verifiedOverlay.SetActive(false);
            if (unverifiedOverlay != null) unverifiedOverlay.SetActive(false);
        }

        private IEnumerator HealthCheck()
        {
            string url = $"{apiBaseUrl}/api/health";

            using (UnityWebRequest webRequest = UnityWebRequest.Get(url))
            {
                webRequest.timeout = 5;
                yield return webRequest.SendWebRequest();

                if (webRequest.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log($"[ARVA] Server health: {webRequest.downloadHandler.text}");
                }
                else
                {
                    Debug.LogError($"[ARVA] Health check failed: {webRequest.error}");
                }
            }
        }

        private string FormatIssuerDID(string did)
        {
            if (string.IsNullOrEmpty(did)) return "Unknown";
            
            // Extract readable name from DID
            // e.g., "did:qie:mit-university-verified" -> "MIT University"
            if (did.Contains(":"))
            {
                string[] parts = did.Split(':');
                if (parts.Length >= 3)
                {
                    string name = parts[2].Replace("-", " ");
                    return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(name);
                }
            }
            
            return did;
        }

        private string FormatAssetType(string assetType)
        {
            if (string.IsNullOrEmpty(assetType)) return "ASSET";
            
            return assetType.Replace("_", " ").ToUpper();
        }

        private void PlayFeedback(bool success)
        {
            // Haptic feedback for mobile
            #if UNITY_IOS || UNITY_ANDROID
            if (success)
            {
                Handheld.Vibrate();
            }
            #endif

            // You can add AudioSource.PlayOneShot() here for sound effects
        }
        #endregion
    }
}
