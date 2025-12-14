/**
 * ARVA QR Code Scanner
 * Uses device camera to scan QR codes containing asset identifiers
 * Requires AR Foundation and ZXing library
 */

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.XR.ARFoundation;
using UnityEngine.XR.ARSubsystems;
using TMPro;

namespace ARVA
{
    public class QRCodeScanner : MonoBehaviour
    {
        #region Configuration
        [Header("AR Components")]
        [SerializeField] private ARCameraManager arCameraManager;
        [SerializeField] private ARSession arSession;
        
        [Header("Scanning Settings")]
        [SerializeField] private float scanInterval = 0.5f;
        [SerializeField] private bool autoStartScanning = true;
        [SerializeField] private bool continuousScanning = false;
        
        [Header("UI Elements")]
        [SerializeField] private RawImage cameraPreview;
        [SerializeField] private TMP_Text statusText;
        [SerializeField] private TMP_Text scannedIdText;
        [SerializeField] private GameObject scanFrame;
        [SerializeField] private Button manualInputButton;
        [SerializeField] private TMP_InputField manualInputField;
        
        [Header("References")]
        [SerializeField] private ARVAManager arvaManager;
        #endregion

        #region Events
        public event Action<string> OnQRCodeScanned;
        public event Action OnScanStarted;
        public event Action OnScanStopped;
        #endregion

        #region Private Fields
        private bool isScanning = false;
        private Texture2D cameraTexture;
        private float lastScanTime;
        private string lastScannedCode = "";
        #endregion

        #region Unity Lifecycle
        private void Start()
        {
            // Initialize
            if (arCameraManager == null)
            {
                arCameraManager = FindObjectOfType<ARCameraManager>();
            }

            if (arvaManager == null)
            {
                arvaManager = FindObjectOfType<ARVAManager>();
            }

            // Set up UI
            if (manualInputButton != null)
            {
                manualInputButton.onClick.AddListener(OnManualInputSubmit);
            }

            // Subscribe to camera frame events
            if (arCameraManager != null)
            {
                arCameraManager.frameReceived += OnCameraFrameReceived;
            }

            // Auto-start if enabled
            if (autoStartScanning)
            {
                StartScanning();
            }

            UpdateStatusText("Ready to scan");
        }

        private void OnDestroy()
        {
            if (arCameraManager != null)
            {
                arCameraManager.frameReceived -= OnCameraFrameReceived;
            }
        }
        #endregion

        #region Public API
        /// <summary>
        /// Start scanning for QR codes
        /// </summary>
        public void StartScanning()
        {
            if (isScanning) return;

            isScanning = true;
            lastScannedCode = "";
            
            if (scanFrame != null) scanFrame.SetActive(true);
            
            OnScanStarted?.Invoke();
            UpdateStatusText("Scanning...");
            
            Debug.Log("[ARVA] QR scanning started");
        }

        /// <summary>
        /// Stop scanning for QR codes
        /// </summary>
        public void StopScanning()
        {
            if (!isScanning) return;

            isScanning = false;
            
            if (scanFrame != null) scanFrame.SetActive(false);
            
            OnScanStopped?.Invoke();
            UpdateStatusText("Scanning paused");
            
            Debug.Log("[ARVA] QR scanning stopped");
        }

        /// <summary>
        /// Toggle scanning state
        /// </summary>
        public void ToggleScanning()
        {
            if (isScanning)
                StopScanning();
            else
                StartScanning();
        }

        /// <summary>
        /// Manually submit an asset ID (for demo/testing)
        /// </summary>
        public void SubmitManualId(string assetId)
        {
            if (string.IsNullOrEmpty(assetId)) return;
            
            ProcessScannedCode(assetId);
        }
        #endregion

        #region Private Methods
        private void OnCameraFrameReceived(ARCameraFrameEventArgs args)
        {
            if (!isScanning) return;
            if (Time.time - lastScanTime < scanInterval) return;

            lastScanTime = Time.time;
            
            // Try to get the camera image
            if (arCameraManager.TryAcquireLatestCpuImage(out XRCpuImage image))
            {
                StartCoroutine(ProcessCameraImage(image));
                image.Dispose();
            }
        }

        private IEnumerator ProcessCameraImage(XRCpuImage image)
        {
            // Convert to readable format
            var conversionParams = new XRCpuImage.ConversionParams
            {
                inputRect = new RectInt(0, 0, image.width, image.height),
                outputDimensions = new Vector2Int(image.width / 2, image.height / 2),
                outputFormat = TextureFormat.RGBA32,
                transformation = XRCpuImage.Transformation.MirrorY
            };

            int size = image.GetConvertedDataSize(conversionParams);
            var buffer = new Unity.Collections.NativeArray<byte>(size, Unity.Collections.Allocator.Temp);

            image.Convert(conversionParams, buffer);

            if (cameraTexture == null || 
                cameraTexture.width != conversionParams.outputDimensions.x ||
                cameraTexture.height != conversionParams.outputDimensions.y)
            {
                cameraTexture = new Texture2D(
                    conversionParams.outputDimensions.x,
                    conversionParams.outputDimensions.y,
                    conversionParams.outputFormat,
                    false
                );
            }

            cameraTexture.LoadRawTextureData(buffer);
            cameraTexture.Apply();

            buffer.Dispose();

            // Decode QR code (using ZXing or similar library)
            string decodedText = DecodeQRCode(cameraTexture);
            
            if (!string.IsNullOrEmpty(decodedText))
            {
                ProcessScannedCode(decodedText);
            }

            yield return null;
        }

        private string DecodeQRCode(Texture2D texture)
        {
            // NOTE: This is a placeholder for actual QR decoding
            // In production, you would use ZXing.Net.Mobile or similar library
            // 
            // Example with ZXing:
            // var barcodeReader = new ZXing.BarcodeReaderGeneric();
            // var result = barcodeReader.Decode(texture.GetPixels32(), texture.width, texture.height);
            // return result?.Text;
            
            // For demo purposes, we'll use a simulated scan
            // You need to integrate ZXing.Net for Unity for real QR scanning
            return null;
        }

        private void ProcessScannedCode(string code)
        {
            // Avoid processing the same code multiple times in quick succession
            if (code == lastScannedCode && !continuousScanning) return;
            
            lastScannedCode = code;
            
            Debug.Log($"[ARVA] QR Code scanned: {code}");
            
            // Update UI
            if (scannedIdText != null)
            {
                scannedIdText.text = $"Scanned: {code}";
            }
            
            UpdateStatusText("Code detected!");
            
            // Fire event
            OnQRCodeScanned?.Invoke(code);
            
            // If not continuous, stop scanning
            if (!continuousScanning)
            {
                StopScanning();
            }
            
            // Trigger verification
            if (arvaManager != null)
            {
                arvaManager.StartVerification(code);
            }
        }

        private void OnManualInputSubmit()
        {
            if (manualInputField != null && !string.IsNullOrEmpty(manualInputField.text))
            {
                SubmitManualId(manualInputField.text);
                manualInputField.text = "";
            }
        }

        private void UpdateStatusText(string status)
        {
            if (statusText != null)
            {
                statusText.text = status;
            }
        }
        #endregion

        #region Demo Methods
        /// <summary>
        /// Simulate scanning a valid asset (for demo)
        /// </summary>
        public void SimulateScanValid()
        {
            string[] validIds = {
                "DEGREE-MIT-2024-001",
                "LUXURY-ROLEX-SUB-2024-ABC123",
                "CERT-AWS-SAA-2024-XYZ789",
                "ART-PICASSO-AUTH-2024-P001"
            };
            
            int randomIndex = UnityEngine.Random.Range(0, validIds.Length);
            ProcessScannedCode(validIds[randomIndex]);
        }

        /// <summary>
        /// Simulate scanning an invalid/fake asset (for demo)
        /// </summary>
        public void SimulateScanInvalid()
        {
            string[] fakeIds = {
                "FAKE-DEGREE-2024-XXX",
                "COUNTERFEIT-WATCH-123",
                "INVALID-CERT-000"
            };
            
            int randomIndex = UnityEngine.Random.Range(0, fakeIds.Length);
            ProcessScannedCode(fakeIds[randomIndex]);
        }
        #endregion
    }
}
