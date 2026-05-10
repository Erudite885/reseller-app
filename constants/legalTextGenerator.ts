// constants/legalTextGenerator.ts

interface ResellerInfo {
  store_name: string;
  email: string;
}

export function generatePrivacyPolicy(reseller: ResellerInfo): string {
  return `
${reseller.store_name}
Last Updated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

At ${reseller.store_name}, your privacy and data protection are of utmost importance to us. This Privacy Policy explains the types of data we collect, how we use it, and your rights regarding your information.
By using our app, you acknowledge and consent to the practices described herein.

1. Consent
By accessing or using the ${reseller.store_name} mobile application, you agree to this Privacy Policy. If you do not agree with our policies or practices, please do not use the application.

2. Who We Are
${reseller.store_name} is a mobile data reselling platform based in Nigeria. We provide secure, affordable, and fast mobile data services to users across Nigeria.
• 📧 Contact Email: ${reseller.email}

3. Information We Collect
We collect personal and technical information to ensure secure transactions and improve your user experience.
a. Personal Information
• UserName
• Phone Number
• Email Address
b. Account and Transaction Information
• Data plan selections and purchase history
• Payment confirmation and status
• Wallet or top-up activity
c. Device and Usage Information
• Device model and operating system
• App usage data
• Crash logs and performance data
d. Support and Communication
• When you contact us, we collect message content to resolve your issue effectively.

4. How We Use Your Information
Your information is used to:
• Operate and maintain the ${reseller.store_name} app
• Process and verify mobile data purchases
• Improve app performance and user experience
• Prevent fraud and ensure platform security
• Communicate with you about purchases, updates, or service changes
• Provide responsive customer support

5. Payments and Financial Security
All payments are processed securely through PalmPay.
${reseller.store_name} does not store any card or bank details.
A 10% processing fee applies to all deposits.

6. Third-Party Integrations
Our app integrates with:
• PalmPay - Payment processing
• Honeygain - Bandwidth sharing services
• Data API providers - For mobile data delivery
Each service operates under its own privacy policy.

7. Data Protection Rights
You have the right to:
• Access your personal data
• Correct inaccurate data
• Request deletion of your data
• Restrict how we use your data
• Object to data processing
• Transfer your data to another platform
📩 Contact: ${reseller.email}

8. Children's Privacy
Our services are not intended for children under 13. We do not knowingly collect data from minors.

9. Updates to This Privacy Policy
We may revise this Privacy Policy periodically. You will be notified of major changes.

10. Contact Us
${reseller.store_name}
📧 Email: ${reseller.email}

© ${new Date().getFullYear()} ${reseller.store_name} — All Rights Reserved
`;
}

export function generateTermsAndConditions(reseller: ResellerInfo): string {
  return `
${reseller.store_name}
Effective Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

Welcome to ${reseller.store_name}, a mobile data reselling platform.
These Terms and Conditions govern your access to and use of our mobile application and services.
By using the platform, you agree to be bound by these Terms.

1. About Us
${reseller.store_name} is a Nigerian-based technology company offering mobile data services nationwide.
• 📧 Email: ${reseller.email}

2. Acceptance of Terms
By using our platform, you confirm that:
• You are at least 18 years old
• You have read and agree to these Terms
• You will not use the platform for unlawful activities

3. Services
${reseller.store_name} provides mobile data bundles via our app.
• Payments are processed via PalmPay
• A 10% processing fee applies to deposits

4. Account Registration
You agree to:
• Provide accurate information (username, phone number, email)
• Keep your login credentials secure
• Accept responsibility for all account activities

5. Payments and Deposits
• 10% fee deducted from deposits
• We do not store card or bank details
• All transactions are final and non-refundable

6. Delivery of Services
• Data bundles delivered instantly or within short processing window
• Delays may occur due to network issues
• Once delivered, no refunds will be issued

7. Prohibited Activities
You agree not to:
• Use the platform for illegal purposes
• Resell services without written approval
• Impersonate ${reseller.store_name} or its team
• Upload malicious software
• Misrepresent our services or pricing

8. Third-Party Services
We integrate with:
• PalmPay - Payment processing
• Honeygain - Bandwidth sharing
• Telecom APIs - Data delivery
Each operates under its own terms.

9. Suspension and Termination
We reserve the right to suspend or terminate accounts at any time. This may result in loss of wallet balance and access to services.

10. No Guarantees or Refunds
• Services provided "as-is" and "as-available"
• No guarantee of uninterrupted service
• No refunds after service delivery

11. Changes to Terms
We may update these Terms periodically. Continued use indicates acceptance.

12. Governing Law
These Terms are governed by the laws of the Federal Republic of Nigeria.

13. Contact Us
${reseller.store_name}
📧 Email: ${reseller.email}

© ${new Date().getFullYear()} ${reseller.store_name} — All Rights Reserved
`;
}
