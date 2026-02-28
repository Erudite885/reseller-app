// helpers.ts
// ============================================
// MOVE THIS OUTSIDE THE COMPONENT - CRITICAL!
// ============================================
// Import all network images statically (MUST be at module level)
export const NETWORK_IMAGES = {
  mtn: require("@/assets/network/mtn.jpeg"),
  airtel: require("@/assets/network/airtel.jpeg"),
  glo: require("@/assets/network/glo.png"),
  "9mobile": require("@/assets/network/9mobile.jpeg"),
  // Create a simple placeholder or use emoji fallback
  placeholder: require("@/assets/network/placeholder.png"),
};

// Helper function to get network image
export const getNetworkImage = (networkKey: string) => {
  if (!networkKey) return null;
  return (
    NETWORK_IMAGES[networkKey as keyof typeof NETWORK_IMAGES] ||
    NETWORK_IMAGES.placeholder
  );
};

// Network prefix mapping for auto-detection
export const NETWORK_PREFIXES: { [key: string]: string[] } = {
  mtn: [
    "07025",
    "07026",
    "0703",
    "0706",
    "0707",
    "0704",
    "0803",
    "0806",
    "0810",
    "0813",
    "0814",
    "0816",
    "0903",
    "0906",
    "0913",
    "0916",
  ],
  airtel: [
    "0701",
    "0708",
    "0802",
    "0808",
    "0812",
    "0901",
    "0902",
    "0904",
    "0907",
    "0912",
    "0911",
  ],
  glo: ["0805", "0807", "0705", "0815", "0811", "0905", "0915"],
  "9mobile": ["0809", "0817", "0818", "0908", "0909"],
};

export const quickAmounts = ["100", "200", "400", "500", "1000"];

// Mock user data
export const userData = {
  name: "John",
  walletBalance: 999999999.99,
  email: "johntester@mail.com",
  mockVirtualAccounts: [
    {
      bank_name: "9Payment Service Bank",
      account_number: "1234567890",
      account_name: "JOSHUA EDGES",
    },
  ],
};

export interface DataPlan {
  label: string;
  value: string;
  size: string;
  price: string;
  validity: string;
  color: string;
  network: string; // Network this plan belongs to
}

// All data plans with network-specific pricing
export const allDataPlans: DataPlan[] = [
  // MTN Plans
  {
    label: "1GB - ₦300 (30 days)",
    value: "mtn-1gb",
    size: "1GB",
    price: "₦300",
    validity: "30 days",
    color: "#22C55E",
    network: "mtn",
  },
  {
    label: "2GB - ₦600 (30 days)",
    value: "mtn-2gb",
    size: "2GB",
    price: "₦600",
    validity: "30 days",
    color: "#3B82F6",
    network: "mtn",
  },
  {
    label: "5GB - ₦1,500 (30 days)",
    value: "mtn-5gb",
    size: "5GB",
    price: "₦1,500",
    validity: "30 days",
    color: "#EAB308",
    network: "mtn",
  },
  {
    label: "10GB - ₦2,900 (30 days)",
    value: "mtn-10gb",
    size: "10GB",
    price: "₦2,900",
    validity: "30 days",
    color: "#F59E0B",
    network: "mtn",
  },
  {
    label: "20GB - ₦5,500 (30 days)",
    value: "mtn-20gb",
    size: "20GB",
    price: "₦5,500",
    validity: "30 days",
    color: "#EC4899",
    network: "mtn",
  },
  {
    label: "50GB - ₦12,000 (30 days)",
    value: "mtn-50gb",
    size: "50GB",
    price: "₦12,000",
    validity: "30 days",
    color: "#8B5CF6",
    network: "mtn",
  },

  // Airtel Plans
  {
    label: "1GB - ₦350 (30 days)",
    value: "airtel-1gb",
    size: "1GB",
    price: "₦350",
    validity: "30 days",
    color: "#22C55E",
    network: "airtel",
  },
  {
    label: "2GB - ₦650 (30 days)",
    value: "airtel-2gb",
    size: "2GB",
    price: "₦650",
    validity: "30 days",
    color: "#3B82F6",
    network: "airtel",
  },
  {
    label: "5GB - ₦1,600 (30 days)",
    value: "airtel-5gb",
    size: "5GB",
    price: "₦1,600",
    validity: "30 days",
    color: "#EAB308",
    network: "airtel",
  },
  {
    label: "10GB - ₦3,000 (30 days)",
    value: "airtel-10gb",
    size: "10GB",
    price: "₦3,000",
    validity: "30 days",
    color: "#F59E0B",
    network: "airtel",
  },
  {
    label: "20GB - ₦5,800 (30 days)",
    value: "airtel-20gb",
    size: "20GB",
    price: "₦5,800",
    validity: "30 days",
    color: "#EC4899",
    network: "airtel",
  },
  {
    label: "40GB - ₦10,000 (30 days)",
    value: "airtel-40gb",
    size: "40GB",
    price: "₦10,000",
    validity: "30 days",
    color: "#8B5CF6",
    network: "airtel",
  },

  // Glo Plans
  {
    label: "1GB - ₦280 (30 days)",
    value: "glo-1gb",
    size: "1GB",
    price: "₦280",
    validity: "30 days",
    color: "#22C55E",
    network: "glo",
  },
  {
    label: "2GB - ₦550 (30 days)",
    value: "glo-2gb",
    size: "2GB",
    price: "₦550",
    validity: "30 days",
    color: "#3B82F6",
    network: "glo",
  },
  {
    label: "5GB - ₦1,400 (30 days)",
    value: "glo-5gb",
    size: "5GB",
    price: "₦1,400",
    validity: "30 days",
    color: "#EAB308",
    network: "glo",
  },
  {
    label: "10GB - ₦2,800 (30 days)",
    value: "glo-10gb",
    size: "10GB",
    price: "₦2,800",
    validity: "30 days",
    color: "#F59E0B",
    network: "glo",
  },
  {
    label: "15GB - ₦4,000 (30 days)",
    value: "glo-15gb",
    size: "15GB",
    price: "₦4,000",
    validity: "30 days",
    color: "#EC4899",
    network: "glo",
  },
  {
    label: "30GB - ₦7,500 (30 days)",
    value: "glo-30gb",
    size: "30GB",
    price: "₦7,500",
    validity: "30 days",
    color: "#8B5CF6",
    network: "glo",
  },

  // 9mobile Plans
  {
    label: "1GB - ₦320 (30 days)",
    value: "9mobile-1gb",
    size: "1GB",
    price: "₦320",
    validity: "30 days",
    color: "#22C55E",
    network: "9mobile",
  },
  {
    label: "2GB - ₦620 (30 days)",
    value: "9mobile-2gb",
    size: "2GB",
    price: "₦620",
    validity: "30 days",
    color: "#3B82F6",
    network: "9mobile",
  },
  {
    label: "5GB - ₦1,550 (30 days)",
    value: "9mobile-5gb",
    size: "5GB",
    price: "₦1,550",
    validity: "30 days",
    color: "#EAB308",
    network: "9mobile",
  },
  {
    label: "11GB - ₦3,000 (30 days)",
    value: "9mobile-11.5gb",
    size: "11GB",
    price: "₦3,000",
    validity: "30 days",
    color: "#F59E0B",
    network: "9mobile",
  },
  {
    label: "25GB - ₦6,000 (30 days)",
    value: "9mobile-25gb",
    size: "25GB",
    price: "₦6,000",
    validity: "30 days",
    color: "#EC4899",
    network: "9mobile",
  },
  {
    label: "50GB - ₦11,000 (30 days)",
    value: "9mobile-50gb",
    size: "50GB",
    price: "₦11,000",
    validity: "30 days",
    color: "#8B5CF6",
    network: "9mobile",
  },
];

// Mock create action - replace with actual API call
export const createVirtualAccountAction = async (formData: any) => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Simulate success/error for demo
  const isSuccess = Math.random() > 0.3; // 70% success rate

  if (isSuccess) {
    return { success: true, message: "Virtual account created successfully!" };
  } else {
    return { error: "Failed to create virtual account. Please try again." };
  }
};

// Mock transaction data - Replace with actual Supabase data
export const mockTransactions = [
  {
    id: "TXN001",
    type: "data",
    service: "Data Bundle",
    network: "MTN",
    amount: -2000,
    phoneNumber: "08012345678",
    dataPlan: "5GB",
    date: "2025-01-20T14:30:00",
    status: "completed",
    reference: "REF-MTN-20250120-001",
  },
  {
    id: "TXN002",
    type: "airtime",
    service: "Airtime",
    network: "Airtel",
    amount: -500,
    phoneNumber: "08087654321",
    date: "2025-01-20T10:15:00",
    status: "completed",
    reference: "REF-AIR-20250120-002",
  },
  {
    id: "TXN003",
    type: "wallet",
    service: "Wallet Funding",
    network: "9Payment Service Bank",
    amount: 5000,
    date: "2025-01-19T16:45:00",
    status: "completed",
    reference: "REF-FUND-20250119-003",
  },
  {
    id: "TXN004",
    type: "data",
    service: "Data Bundle",
    network: "Glo",
    amount: -1500,
    phoneNumber: "08098765432",
    dataPlan: "3GB",
    date: "2025-01-19T09:20:00",
    status: "completed",
    reference: "REF-GLO-20250119-004",
  },
  {
    id: "TXN005",
    type: "airtime",
    service: "Airtime",
    network: "9mobile",
    amount: -1000,
    phoneNumber: "08091234567",
    date: "2025-01-18T18:30:00",
    status: "failed",
    reference: "REF-9MB-20250118-005",
  },
  {
    id: "TXN006",
    type: "wallet",
    service: "Wallet Funding",
    network: "PalmPay",
    amount: 10000,
    date: "2025-01-18T12:00:00",
    status: "completed",
    reference: "REF-FUND-20250118-006",
  },
  {
    id: "TXN007",
    type: "data",
    service: "Data Bundle",
    network: "MTN",
    amount: -3000,
    phoneNumber: "08012345678",
    dataPlan: "10GB",
    date: "2025-01-17T15:10:00",
    status: "pending",
    reference: "REF-MTN-20250117-007",
  },
];

// utils/planColors.ts
/**
 * 12 Unique vibrant colors for data plans
 * Cycles through these colors based on plan index
 */
export const PLAN_COLORS = [
  "#FF6B6B", // Coral Red
  "#4ECDC4", // Turquoise
  "#45B7D1", // Sky Blue
  "#FFA07A", // Light Salmon
  "#98D8C8", // Mint Green
  "#F7DC6F", // Sunny Yellow
  "#BB8FCE", // Lavender Purple
  "#85C1E2", // Powder Blue
  "#F8B739", // Golden Orange
  "#52C78C", // Emerald Green
  "#FF8ED4", // Pink
  "#A29BFE", // Periwinkle
];

/**
 * Get a color for a plan based on its index
 * Colors cycle through the array for consistent assignment
 */
export const getPlanColor = (index: number): string => {
  return PLAN_COLORS[index % PLAN_COLORS.length];
};

/**
 * Get a lighter version of the plan color for backgrounds
 */
export const getPlanColorLight = (index: number): string => {
  const color = getPlanColor(index);
  return `${color}20`; // 20% opacity
};

/**
 * Get plan colors by network for consistent network-based coloring
 * Alternative approach: color by network instead of index
 */
export const NETWORK_COLORS: Record<string, string> = {
  MTN: "#FFCC00", // MTN Yellow
  AIRTEL: "#E60000", // Airtel Red
  GLO: "#00B140", // Glo Green
  "9MOBILE": "#00A65A", // 9mobile Green
};

/**
 * Get a color based on network
 */
export const getNetworkColor = (network: string): string => {
  return NETWORK_COLORS[network.toUpperCase()] || PLAN_COLORS[0];
};

/**
 * Get a lighter version of network color
 */
export const getNetworkColorLight = (network: string): string => {
  const color = getNetworkColor(network);
  return `${color}20`; // 20% opacity
};

export const privacyPolicy = `
Alheri Data App
Last Updated: July 10, 2025

At Alheri Data App, , your privacy and data protection are of utmost importance to us. This Privacy Policy explains the types of data we collect, how we use it, and your rights regarding your information.
By using our app, you acknowledge and consent to the practices described herein.

1. Consent
By accessing or using the Alheri Data App mobile application, you agree to this Privacy Policy. If you do not agree with our policies or practices, please do not use the application.

2. Who We Are
Alheri Data App is a mobile data reselling platform, a technology company based in Nigeria. We provide secure, affordable, and fast mobile data services to users across Nigeria.
• 📧 Contact Email: alheridata@gmail.com

3. Information We Collect
We collect personal and technical information to ensure secure transactions and improve your user experience.
a. Personal Information
• UserName
• Phone Number
• Email Address
b. Account and Transaction Information
• Data plan selections and purchase history
• Payment confirmation and status (via Paystack)
• Wallet or top-up activity (if applicable)
c. Device and Usage Information
• Device model and operating system
• Timestamps and frequency of app usage
• Crash logs and app performance data
• General, non-identifiable usage analytics
d. Support and Communication
• When you contact us, we collect message content and any file attachments to resolve your issue effectively.

4. How We Use Your Information
Your information is used to:
• Operate and maintain the Alheri Data App app
• Process and verify mobile data purchases via Paystack
• Improve app performance and user experience
• Prevent fraud and ensure platform security
• Communicate with you about purchases, updates, or service changes
• Provide responsive customer support

5. Payments and Financial Security
All payments are processed securely through Paystack, a PCI-DSS-compliant payment provider.
Alheri Data App does not store any card or bank details.

6. Log Files and Technical Data
We may automatically collect technical log data such as:
• IP Address
• Device Type
• Operating System Version
• Time and Date of Usage
This helps with diagnostics, performance monitoring, and improving service reliability.

7. Cookies and Local Storage
While we do not use traditional web cookies, the app may utilize local storage or similar technologies to:
• Remember login sessions
• Save preferences for a smoother user experience

8. Third-Party Services
We collaborate with trusted third-party providers, including:
• Paystack (payment processing)
• API providers (data delivery)
• Analytics providers (for future performance optimization)
Each provider operates under its own privacy policy, and we encourage users to review those separately.

9. Data Protection Rights
We respect your privacy rights under GDPR and other global standards. You have the right to:
• Access: Request a copy of your personal data
• Rectification: Correct inaccurate or incomplete data
• Erasure: Request deletion of your data
• Restriction: Request we limit how we use your data
• Objection: Object to processing under certain conditions
• Portability: Request transfer of your data to another platform
📩 To exercise these rights, contact: alheridata@gmail.com
We respond within 30 days of verified requests.

10. Children’s Privacy
Our services are not intended for children under the age of 13.
We do not knowingly collect personal data from children. If we learn that such data was collected, we will delete it immediately.

11. Updates to This Privacy Policy
We may revise this Privacy Policy periodically to reflect:
• Changes in the app
• Legal or regulatory updates
• Enhancements in data protection practices
You will be notified of major changes via the app or official communication channels.

12. Contact Us
For any privacy-related concerns or questions:
Alheri Data App
📧 Email: alheridata@gmail.com

© 2025 Alheri Data App — All Rights Reserved

`;

export const termsAndConditions = `
Alheri Data App
Effective Date: July 10, 2025

Welcome to Alheri Data App, a mobile data reselling platform.
These Terms and Conditions govern your access to and use of our mobile application and services.
By accessing or using the platform, you agree to be bound by these Terms.
If you do not agree, do not use our services.

1. About Us
Alheri Data App is a Nigerian-based technology company offering secure, affordable, and fast mobile data services nationwide.

• 📧 Email: alheridata@gmail.com

• 📱 WhatsApp: +2347057517841 | +2347015888155

2. Acceptance of Terms
By using our platform, you confirm that:
• You are at least 18 years old or have consent from a parent/guardian.
• You have read, understood, and agree to comply with these Terms and our [Privacy Policy].
• You will not use the platform for any unlawful, fraudulent, or unauthorized activities.

3. Description of Services
Alheri Data App provides users with a seamless way to purchase mobile data bundles via our app.
• Services are currently accessible through a downloadable APK (Google Drive) and will be available on the Google Play Store.
• All payments are processed securely via Paystack.
• A 10% processing fee applies to every deposit to cover operational and transaction costs.

4. Account Registration and Use
By registering an account, you agree to:
• Provide accurate and up-to-date personal information (e.g., username, name, phone number, email).
• Keep your login credentials secure and confidential.
• Accept full responsibility for all activities conducted under your account.

5. Payments and Deposits
• A 10% fee is automatically deducted from deposits.
• We do not store your card or bank details.
• All completed transactions are final and non-refundable.
• Payments are made securely through Paystack.

6. Delivery of Services
• Data bundles are delivered instantly or within a short processing window.
• Delays may occur due to external factors (e.g., network outages).
• Once data is marked as delivered, no refunds, reversals, or compensations will be issued.

7. Prohibited Activities
You agree not to:
• Use the platform for any illegal or unauthorized purpose.
• Resell or redistribute services without written approval.
• Impersonate Alheri Data App, its team, or other users.
• Upload malicious software or disrupt platform functionality.
• Misrepresent the service or inflate pricing to mislead others.

8. Data Privacy and Security
• We collect only essential data for service delivery (e.g., contact and transaction information).
• All payment data is handled by Paystack, a PCI-DSS-compliant provider.
• Technical and usage data may be collected to improve platform performance.

9. Third-Party Services
We may integrate with third-party providers including:
• Paystack – for secure payment processing
• Telecom APIs – for data delivery
• Analytics tools (future use) – for app monitoring
Each third-party operates under its own terms and privacy policies. We are not liable for their service disruptions but will assist in resolving major issues.

10. Suspension and Termination
We reserve the right to suspend or terminate your account at any time without notice or explanation.
This may result in:
• Loss of wallet balance and access to services.
• Deletion of your account and associated data.
• Withholding of any pending service delivery.
You waive any right to dispute such actions. Continued use of the platform implies full acceptance of this clause.

11. User Liability
You are financially and legally liable for any damage, fraud, or misuse tied to your account. This includes:
• Reputational or financial damage caused to Alheri Data App or its users.
• Misleading or overpricing our services to other users.
• Operating a resale business without written approval from Alheri Data App.

12. No Guarantees or Refunds
• All services are provided “as-is” and “as-available”.
• We do not guarantee uninterrupted service or exact delivery times.
• Once a transaction is completed and service is delivered, no refunds or replacements will be issued.

13. Indemnification
You agree to indemnify and hold harmless Alheri Data App, its affiliates, subsidiaries, sub-subsidiaries and employees against any claims, damages, losses, or legal expenses arising from:
• Your use or misuse of the platform
• Your violation of these Terms
• Your infringement of third-party rights

14. Children’s Privacy
Our platform is not intended for children under 13. We do not knowingly collect data from minors. If such data is identified, it will be permanently deleted.

15. Changes to Terms
We may update these Terms periodically. All updates will be posted in the app or sent via official channels. Continued use of the platform indicates your acceptance of the latest version.

16. Governing Law
These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes will be handled under the jurisdiction of Nigerian courts.

17. Contact Us
For support or inquiries:
• 📧 Email: alheridata@gmail.com

• 📱 WhatsApp: +2347057517841 | +2347015888155

© 2025 Alheri Data App — All Rights Reserved

`;