/**
 * ARVA AR Overlay Controller
 * Manages the AR overlay display for verified/unverified assets
 * Works with AR Foundation to anchor overlays in 3D space
 */

using System.Collections;
using UnityEngine;
using UnityEngine.XR.ARFoundation;
using TMPro;

namespace ARVA
{
    public class AROverlayController : MonoBehaviour
    {
        #region Configuration
        [Header("Overlay Prefabs")]
        [SerializeField] private GameObject verifiedOverlayPrefab;
        [SerializeField] private GameObject unverifiedOverlayPrefab;
        [SerializeField] private GameObject loadingOverlayPrefab;
        
        [Header("AR Components")]
        [SerializeField] private ARAnchorManager anchorManager;
        [SerializeField] private ARRaycastManager raycastManager;
        [SerializeField] private Camera arCamera;
        
        [Header("Display Settings")]
        [SerializeField] private float overlayDistance = 0.5f;
        [SerializeField] private float overlayScale = 0.3f;
        [SerializeField] private bool faceCamera = true;
        [SerializeField] private float animationDuration = 0.3f;
        
        [Header("Colors")]
        [SerializeField] private Color verifiedColor = new Color(0.2f, 0.8f, 0.2f, 0.9f);
        [SerializeField] private Color unverifiedColor = new Color(0.9f, 0.2f, 0.2f, 0.9f);
        [SerializeField] private Color loadingColor = new Color(0.3f, 0.5f, 0.9f, 0.9f);
        #endregion

        #region Private Fields
        private GameObject currentOverlay;
        private ARVAManager arvaManager;
        private bool isDisplaying = false;
        #endregion

        #region Unity Lifecycle
        private void Start()
        {
            // Get references
            arvaManager = FindObjectOfType<ARVAManager>();
            
            if (arCamera == null)
            {
                arCamera = Camera.main;
            }

            // Subscribe to events
            if (arvaManager != null)
            {
                arvaManager.OnVerificationComplete += OnVerificationComplete;
                arvaManager.OnVerificationStarted += OnVerificationStarted;
            }
        }

        private void OnDestroy()
        {
            if (arvaManager != null)
            {
                arvaManager.OnVerificationComplete -= OnVerificationComplete;
                arvaManager.OnVerificationStarted -= OnVerificationStarted;
            }
        }

        private void Update()
        {
            // Make overlay face camera
            if (currentOverlay != null && faceCamera && arCamera != null)
            {
                currentOverlay.transform.LookAt(arCamera.transform);
                currentOverlay.transform.Rotate(0, 180, 0); // Face towards camera
            }
        }
        #endregion

        #region Public API
        /// <summary>
        /// Show the verified overlay at the current position
        /// </summary>
        public void ShowVerifiedOverlay(string issuerName, string tokenId, string assetType)
        {
            DestroyCurrentOverlay();
            
            Vector3 position = GetOverlayPosition();
            currentOverlay = Instantiate(verifiedOverlayPrefab, position, Quaternion.identity);
            currentOverlay.transform.localScale = Vector3.zero;
            
            // Set up overlay content
            SetupOverlayContent(currentOverlay, true, issuerName, tokenId, assetType);
            
            // Animate in
            StartCoroutine(AnimateOverlayIn(currentOverlay));
            
            isDisplaying = true;
        }

        /// <summary>
        /// Show the unverified overlay at the current position
        /// </summary>
        public void ShowUnverifiedOverlay(string reason)
        {
            DestroyCurrentOverlay();
            
            Vector3 position = GetOverlayPosition();
            currentOverlay = Instantiate(unverifiedOverlayPrefab, position, Quaternion.identity);
            currentOverlay.transform.localScale = Vector3.zero;
            
            // Set up overlay content
            SetupOverlayContent(currentOverlay, false, reason, "", "");
            
            // Animate in
            StartCoroutine(AnimateOverlayIn(currentOverlay));
            
            isDisplaying = true;
        }

        /// <summary>
        /// Show loading overlay
        /// </summary>
        public void ShowLoadingOverlay()
        {
            DestroyCurrentOverlay();
            
            if (loadingOverlayPrefab != null)
            {
                Vector3 position = GetOverlayPosition();
                currentOverlay = Instantiate(loadingOverlayPrefab, position, Quaternion.identity);
                currentOverlay.transform.localScale = Vector3.one * overlayScale;
            }
            
            isDisplaying = true;
        }

        /// <summary>
        /// Hide and destroy current overlay
        /// </summary>
        public void HideOverlay()
        {
            if (currentOverlay != null)
            {
                StartCoroutine(AnimateOverlayOut(currentOverlay));
            }
            isDisplaying = false;
        }

        /// <summary>
        /// Immediately destroy current overlay
        /// </summary>
        public void DestroyCurrentOverlay()
        {
            if (currentOverlay != null)
            {
                Destroy(currentOverlay);
                currentOverlay = null;
            }
            isDisplaying = false;
        }
        #endregion

        #region Private Methods
        private void OnVerificationStarted()
        {
            ShowLoadingOverlay();
        }

        private void OnVerificationComplete(ARVAManager.VerificationResponse response)
        {
            if (response.isVerified)
            {
                string issuerName = FormatIssuerName(response.issuerDID);
                ShowVerifiedOverlay(issuerName, response.tokenId, response.assetType);
            }
            else
            {
                string reason = !string.IsNullOrEmpty(response.message) 
                    ? response.message 
                    : "Not found in registry";
                ShowUnverifiedOverlay(reason);
            }
        }

        private Vector3 GetOverlayPosition()
        {
            if (arCamera != null)
            {
                return arCamera.transform.position + arCamera.transform.forward * overlayDistance;
            }
            return transform.position + Vector3.forward * overlayDistance;
        }

        private void SetupOverlayContent(GameObject overlay, bool verified, string line1, string line2, string line3)
        {
            // Find text components in the overlay
            TMP_Text[] textComponents = overlay.GetComponentsInChildren<TMP_Text>();
            
            if (verified)
            {
                // Verified overlay setup
                if (textComponents.Length > 0) textComponents[0].text = "✓ VERIFIED";
                if (textComponents.Length > 1) textComponents[1].text = $"Issuer: {line1}";
                if (textComponents.Length > 2) textComponents[2].text = $"Token: #{line2}";
                if (textComponents.Length > 3) textComponents[3].text = line3;
                
                // Set color
                SetOverlayColor(overlay, verifiedColor);
            }
            else
            {
                // Unverified overlay setup
                if (textComponents.Length > 0) textComponents[0].text = "✗ NOT VERIFIED";
                if (textComponents.Length > 1) textComponents[1].text = line1;
                
                // Set color
                SetOverlayColor(overlay, unverifiedColor);
            }
        }

        private void SetOverlayColor(GameObject overlay, Color color)
        {
            // Set color on all renderers
            Renderer[] renderers = overlay.GetComponentsInChildren<Renderer>();
            foreach (var renderer in renderers)
            {
                if (renderer.material != null)
                {
                    renderer.material.color = color;
                }
            }
            
            // Set color on UI images
            UnityEngine.UI.Image[] images = overlay.GetComponentsInChildren<UnityEngine.UI.Image>();
            foreach (var image in images)
            {
                image.color = color;
            }
        }

        private string FormatIssuerName(string did)
        {
            if (string.IsNullOrEmpty(did)) return "Unknown";
            
            if (did.Contains(":"))
            {
                string[] parts = did.Split(':');
                if (parts.Length >= 3)
                {
                    return parts[2].Replace("-", " ");
                }
            }
            return did;
        }

        private IEnumerator AnimateOverlayIn(GameObject overlay)
        {
            float elapsed = 0f;
            Vector3 targetScale = Vector3.one * overlayScale;
            
            while (elapsed < animationDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / animationDuration;
                
                // Ease out elastic
                float scale = 1f - Mathf.Pow(2, -10 * t) * Mathf.Cos((t * 10 - 0.75f) * (2 * Mathf.PI) / 3);
                
                if (overlay != null)
                {
                    overlay.transform.localScale = targetScale * scale;
                }
                
                yield return null;
            }
            
            if (overlay != null)
            {
                overlay.transform.localScale = targetScale;
            }
        }

        private IEnumerator AnimateOverlayOut(GameObject overlay)
        {
            float elapsed = 0f;
            Vector3 startScale = overlay.transform.localScale;
            
            while (elapsed < animationDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / animationDuration;
                
                if (overlay != null)
                {
                    overlay.transform.localScale = startScale * (1f - t);
                }
                
                yield return null;
            }
            
            if (overlay != null)
            {
                Destroy(overlay);
            }
        }
        #endregion
    }
}
