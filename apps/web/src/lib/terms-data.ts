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
        "By accessing or using Free Models (\u201cthe Website\u201d), you agree to these Terms and Conditions. If you do not agree with them, stop using the Website.",
      ],
    },
    {
      id: "about-the-service",
      title: "2. About the Service",
      content: [
        "Free Models is an independent, open-source directory of free and free-tier AI models. The models are offered by third-party providers. We compile our information from public provider documentation and public benchmarks.",
        "We do not develop, train, host, serve, or operate AI models, model weights, or inference infrastructure. We do not charge for or resell access to models. The Website is informational only. It shows and links to offers published by third parties. You always access a model or an API directly from its provider.",
      ],
    },
    {
      id: "no-ownership",
      title: "3. No Ownership; Trademarks",
      content: [
        "Free Models is not affiliated with any provider or publisher listed on the Website. No listed provider or publisher sponsors us or endorses us.",
        "All model names, company names, trademarks, service marks, and logos shown on the Website belong to their respective providers and publishers. Free Models claims no ownership of them. We use these names only to identify the models and services in the catalogue. This use is nominative fair use.",
        "All AI models, weights, and related intellectual property referenced on the Website remain the property of their creators and rights holders.",
      ],
    },
    {
      id: "accuracy",
      title: "4. Accuracy and Availability of Information",
      content: [
        "Specifications such as rate limits, quotas, context windows, pricing, and benchmark scores are determined solely by the respective providers. Providers can change, throttle, or revoke them at any time without notice. The information on the Website can be outdated, incomplete, or wrong.",
        "Verify current terms, limits, and pricing directly with the provider before you use the information on the Website.",
      ],
    },
    {
      id: "third-party",
      title: "5. Third-Party Claims and Services",
      content: [
        "When you use a model, an API, or a service listed on the Website, you deal directly with the provider. You must follow the terms of service, acceptable use policy, billing terms, and privacy policy of that provider.",
        "Free Models does not control third-party providers. We are not a party to your agreement with them. Some provider conduct is outside our control. Examples are misrepresented capabilities, exaggerated benchmarks, unexpected charges, degraded availability, and withdrawal of a free tier. We are not responsible for that conduct and are not liable for it. Reliance on any third-party information from the Website is at your own risk.",
      ],
    },
    {
      id: "warranties",
      title: "6. Disclaimer of Warranties",
      content: [
        "The Website and all content on it are provided \u201cas is\u201d and \u201cas available\u201d. Free Models gives no warranties, express or implied. This applies to warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not promise that the Website will run without interruption or errors.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "7. Limitation of Liability",
      content: [
        "To the maximum extent permitted by law, Free Models and its maintainers and contributors are not liable for damages. This covers direct, indirect, incidental, special, and consequential damages. Examples are lost profits, lost data, and unexpected API charges. It covers claims from your use of the Website or of a third-party service listed on it.",
      ],
    },
    {
      id: "ip-complaints",
      title: "8. Intellectual Property Complaints",
      content: [
        "Free Models respects the intellectual property rights of third parties.",
        "If you think that content on the Website infringes your copyright, trademark, or other rights, open an issue or pull request on our GitHub repository. Describe the work that you own and the material that concerns you. We will correct, attribute, or remove the material promptly after verification.",
      ],
    },
    {
      id: "changes",
      title: "9. Changes to These Terms",
      content: [
        "We can update these Terms at any time. The date at the top shows the latest revision. If you use the Website after a change, you accept the revised Terms.",
      ],
    },
  ] satisfies TermsSection[],
};
