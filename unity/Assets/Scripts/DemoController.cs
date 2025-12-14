/**
 * ARVA Demo Controller
 * Provides demo functionality for hackathon presentation
 * Allows testing verification flow without actual QR scanning
 */

using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace ARVA
{
    public class DemoController : MonoBehaviour
    {
        #region Configuration
        [Header("References")]
        [SerializeField] private ARVAManager arvaManager;
        [SerializeField] private QRCodeScanner qrScanner;
        
        [Header("Demo UI")]
        [SerializeField] private TMP_Dropdown assetDropdown;
        [SerializeField] private Button verifyValidButton;
        [SerializeField] private Button verifyInvalidButton;
        [SerializeField] private Button resetButton;
        [SerializeField] private TMP_InputField customIdInput;
        [SerializeField] private Button customVerifyButton;
        
        [Header("Info Panel")]
        [SerializeField] private TMP_Text infoText;
        [SerializeField] private GameObject demoPanel;
        #endregion

        #region Demo Data
        private readonly string[] validAssetIds = {
            "DEGREE-MIT-2024-001",
            "LUXURY-ROLEX-SUB-2024-ABC123",
            "CERT-AWS-SAA-2024-XYZ789",
            "ART-PICASSO-AUTH-2024-P001"
        };

        private readonly string[] validAssetNames = {
            "MIT Computer Science Degree",
            "Rolex Submariner Watch",
            "AWS Solutions Architect Cert",
            "Picasso Art Print"
        };

        private readonly string[] invalidAssetIds = {
            "FAKE-DEGREE-2024-XXX",
            "COUNTERFEIT-WATCH-123",
            "INVALID-CERT-000",
            "NOT-REGISTERED-001"
        };
        #endregion

        #region Unity Lifecycle
        private void Start()
        {
            // Find references if not set
            if (arvaManager == null)
                arvaManager = FindObjectOfType<ARVAManager>();
            
            if (qrScanner == null)
                qrScanner = FindObjectOfType<QRCodeScanner>();

            // Setup dropdown
            SetupDropdown();

            // Setup buttons
            SetupButtons();

            // Show initial info
            UpdateInfo("Select an asset type and click 'Verify Valid' to test successful verification,\n" +
                      "or 'Verify Invalid' to test failure case.");
        }
        #endregion

        #region Setup
        private void SetupDropdown()
        {
            if (assetDropdown != null)
            {
                assetDropdown.ClearOptions();
                assetDropdown.AddOptions(new System.Collections.Generic.List<string>(validAssetNames));
                assetDropdown.onValueChanged.AddListener(OnDropdownChanged);
            }
        }

        private void SetupButtons()
        {
            if (verifyValidButton != null)
                verifyValidButton.onClick.AddListener(OnVerifyValidClicked);
            
            if (verifyInvalidButton != null)
                verifyInvalidButton.onClick.AddListener(OnVerifyInvalidClicked);
            
            if (resetButton != null)
                resetButton.onClick.AddListener(OnResetClicked);
            
            if (customVerifyButton != null)
                customVerifyButton.onClick.AddListener(OnCustomVerifyClicked);
        }
        #endregion

        #region Button Handlers
        private void OnVerifyValidClicked()
        {
            int selectedIndex = assetDropdown != null ? assetDropdown.value : 0;
            string assetId = validAssetIds[selectedIndex];
            
            UpdateInfo($"Verifying VALID asset:\n{assetId}");
            
            if (arvaManager != null)
            {
                arvaManager.StartVerification(assetId);
            }
        }

        private void OnVerifyInvalidClicked()
        {
            int randomIndex = Random.Range(0, invalidAssetIds.Length);
            string assetId = invalidAssetIds[randomIndex];
            
            UpdateInfo($"Verifying INVALID asset:\n{assetId}");
            
            if (arvaManager != null)
            {
                arvaManager.StartVerification(assetId);
            }
        }

        private void OnCustomVerifyClicked()
        {
            if (customIdInput != null && !string.IsNullOrEmpty(customIdInput.text))
            {
                string assetId = customIdInput.text;
                UpdateInfo($"Verifying custom ID:\n{assetId}");
                
                if (arvaManager != null)
                {
                    arvaManager.StartVerification(assetId);
                }
            }
        }

        private void OnResetClicked()
        {
            if (arvaManager != null)
            {
                arvaManager.ResetUI();
            }
            
            UpdateInfo("UI Reset. Ready for new verification.");
        }

        private void OnDropdownChanged(int index)
        {
            if (index >= 0 && index < validAssetIds.Length)
            {
                UpdateInfo($"Selected: {validAssetNames[index]}\nID: {validAssetIds[index]}");
            }
        }
        #endregion

        #region Public Methods
        /// <summary>
        /// Toggle demo panel visibility
        /// </summary>
        public void ToggleDemoPanel()
        {
            if (demoPanel != null)
            {
                demoPanel.SetActive(!demoPanel.activeSelf);
            }
        }

        /// <summary>
        /// Run automated demo sequence
        /// </summary>
        public void RunAutomatedDemo()
        {
            StartCoroutine(AutomatedDemoSequence());
        }
        #endregion

        #region Private Methods
        private void UpdateInfo(string message)
        {
            if (infoText != null)
            {
                infoText.text = message;
            }
            Debug.Log($"[ARVA Demo] {message}");
        }

        private System.Collections.IEnumerator AutomatedDemoSequence()
        {
            UpdateInfo("Starting automated demo...\n\n1. Valid Asset Verification");
            
            // Test valid asset
            yield return new WaitForSeconds(1f);
            OnVerifyValidClicked();
            
            yield return new WaitForSeconds(4f);
            OnResetClicked();
            
            yield return new WaitForSeconds(1f);
            UpdateInfo("2. Invalid Asset Verification");
            
            // Test invalid asset
            yield return new WaitForSeconds(1f);
            OnVerifyInvalidClicked();
            
            yield return new WaitForSeconds(4f);
            UpdateInfo("Demo complete!\n\nThe system can distinguish between\nregistered and unregistered assets.");
        }
        #endregion

        #region Keyboard Shortcuts (for PC testing)
        private void Update()
        {
            // V key - Verify valid
            if (Input.GetKeyDown(KeyCode.V))
            {
                OnVerifyValidClicked();
            }
            
            // I key - Verify invalid
            if (Input.GetKeyDown(KeyCode.I))
            {
                OnVerifyInvalidClicked();
            }
            
            // R key - Reset
            if (Input.GetKeyDown(KeyCode.R))
            {
                OnResetClicked();
            }
            
            // D key - Toggle demo panel
            if (Input.GetKeyDown(KeyCode.D))
            {
                ToggleDemoPanel();
            }
            
            // Space - Run automated demo
            if (Input.GetKeyDown(KeyCode.Space))
            {
                RunAutomatedDemo();
            }
        }
        #endregion
    }
}
