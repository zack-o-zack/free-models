export interface TermsSection {
  id: string;
  title: string;
  content: string[];
}

export const termsData = {
  lastUpdated: "October 25, 2026",
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content: [
        "When you use Free Models (\u201cthe Website\u201d), you agree to these Terms and Conditions. If you do not agree with these terms, do not use the Website.",
      ],
    },
    {
      id: "about-the-service",
      title: "2. About the Service",
      content: [
        "Free Models is an independent, open-source directory of free and free-tier AI models. Third-party providers supply these models. We collect this information from public provider documentation and public benchmarks.",
        "We do not develop, train, host, or operate AI models, model weights, or inference systems. We do not sell access to the models. The Website supplies information only, and it shows third-party offers and links to them. You use each model or API directly with its provider.",
      ],
    },
    {
      id: "no-ownership",
      title: "3. No Ownership; Trademarks",
      content: [
        "Free Models is not affiliated with any provider or publisher on this Website. No provider or publisher on this Website sponsors us or endorses us.",
        "All model names, company names, trademarks, service marks, and logos on the Website belong to their respective providers and publishers. Free Models does not own them. We use these names and logos only to identify the models and services in the directory. This is nominative fair use.",
        "All AI models, weights, and related intellectual property referenced on the Website remain the property of their creators and rights holders.",
      ],
    },
    {
      id: "accuracy",
      title: "4. Accuracy and Availability of Information",
      content: [
        "Providers set the rate limits, quotas, context windows, prices, and benchmark scores of their models. A provider can change, throttle, or revoke them at any time without notice. The information on the Website can be outdated, incomplete, or wrong.",
        "Before you use the information on the Website, verify current terms, limits, and pricing directly with the provider.",
      ],
    },
    {
      id: "third-party",
      title: "5. Third-Party Claims and Services",
      content: [
        "When you use a model, an API, or a service on the Website, you deal directly with the provider. You must follow the terms of service, the acceptable use policy, the billing terms, and the privacy policy of that provider.",
        "Free Models does not control third-party providers. We are not a party to your agreement with them. Some provider conduct is outside our control. Examples are misrepresented capabilities, exaggerated benchmarks, unexpected charges, degraded availability, and withdrawal of a free tier. We are not responsible for that conduct and are not liable for it. If you rely on third-party information from the Website, you do so at your own risk.",
      ],
    },
    {
      id: "warranties",
      title: "6. Disclaimer of Warranties",
      content: [
        "Free Models provides the Website and all content on it \u201cas is\u201d and \u201cas available\u201d. We give no warranties, express or implied. This applies to warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not promise that the Website will run without interruption or errors.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "7. Limitation of Liability",
      content: [
        "To the maximum extent permitted by law, Free Models and its maintainers and contributors are not liable for damages. This covers direct, indirect, incidental, special, and consequential damages. Examples are lost profits, lost data, and unexpected API charges. It covers claims from your use of the Website or of a third-party service on it.",
      ],
    },
    {
      id: "ip-complaints",
      title: "8. Intellectual Property Complaints",
      content: [
        "Free Models respects the intellectual property rights of third parties.",
        "Do you think that a copyright, trademark, or other right on the Website is infringed? Open an issue or pull request on our GitHub repository. Describe the work that you own and the material that concerns you. We will correct, attribute, or remove the material after we verify it.",
      ],
    },
    {
      id: "changes",
      title: "9. Changes to These Terms",
      content: [
        "We may update these Terms at any time. The date at the top shows the latest revision. If you use the Website after a change, you accept the revised Terms.",
      ],
    },
  ] satisfies TermsSection[],
};
