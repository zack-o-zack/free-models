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
        "By accessing or using Free Models (the \u201cWebsite\u201d), you agree to these Terms and Conditions. If you do not agree with them, please stop using the Website.",
      ],
    },
    {
      id: "about-the-service",
      title: "2. About the Service",
      content: [
        "Free Models is an independent, open-source directory that catalogues free and free-tier AI models offered by third-party providers. Information on the Website is compiled from public provider documentation and publicly available benchmarks.",
        "We do not develop, train, host, serve, or operate any AI models, model weights, or inference infrastructure, and we do not charge for or resell access to them. The Website is informational only: it displays and links to offers published by third parties. All models, APIs, and services referenced are accessed directly from their respective providers.",
      ],
    },
    {
      id: "no-ownership",
      title: "3. No Ownership; Trademarks",
      content: [
        "Free Models is not affiliated with, sponsored by, or endorsed by any provider or publisher listed on the Website.",
        "All model names, company names, trademarks, service marks, and logos shown on the Website belong to their respective providers and publishers. Free Models claims no ownership of them; they are used only to identify the models and services being catalogued, per nominative fair use.",
        "All AI models, weights, and related intellectual property referenced on the Website remain the property of their respective creators and rights holders.",
      ],
    },
    {
      id: "accuracy",
      title: "4. Accuracy and Availability of Information",
      content: [
        "Specifications such as rate limits, quotas, context windows, pricing, and benchmark scores are determined solely by the respective providers. They may be outdated, incomplete, or wrong, and providers may change, throttle, or revoke them at any time without notice.",
        "Always verify current terms, limits, and pricing directly with the provider before relying on any information shown on the Website.",
      ],
    },
    {
      id: "third-party",
      title: "5. Third-Party Claims and Services",
      content: [
        "When you use a model, API, or service listed on the Website, you deal directly with the provider that offers it, and you are responsible for complying with that provider\u2019s terms of service, acceptable use policy, billing, and privacy policy.",
        "Free Models does not control third-party providers and is not a party to your relationship with them. We are not responsible for, and disclaim all liability arising from, third-party claims or conduct, including misrepresented capabilities, exaggerated benchmarks, unexpected charges, degraded availability, or the withdrawal of a free tier. Reliance on any third-party information obtained through the Website is at your own risk.",
      ],
    },
    {
      id: "warranties",
      title: "6. Disclaimer of Warranties",
      content: [
        "The Website and all content on it are provided \u201cas is\u201d and \u201cas available\u201d, without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, accuracy, and non-infringement. We do not warrant that the Website will be uninterrupted, error-free, or secure.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "7. Limitation of Liability",
      content: [
        "To the maximum extent permitted by law, Free Models and its maintainers and contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages, including lost profits, lost data, or unexpected API charges, arising from your use of, or inability to use, the Website or any third-party service referenced through it.",
      ],
    },
    {
      id: "ip-complaints",
      title: "8. Intellectual Property Complaints",
      content: [
        "Free Models respects the intellectual property rights of third parties. If you believe any content on the Website infringes your copyright, trademark, or other rights, please open an issue or pull request on our GitHub repository identifying the work and the material concerned. We will correct, attribute, or remove the material promptly upon verification.",
      ],
    },
    {
      id: "changes",
      title: "9. Changes to These Terms",
      content: [
        "We may update these Terms from time to time. The date above reflects the latest revision, and continued use of the Website after changes constitutes acceptance of the revised Terms.",
      ],
    },
  ] satisfies TermsSection[],
};
