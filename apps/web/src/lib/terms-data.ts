export interface TermsHighlight {
  id: string;
  title: string;
  description: string;
  badge: string;
}

export interface TermsSection {
  id: string;
  title: string;
  content: string[];
}

export const termsData = {
  lastUpdated: "October 2026",
  effectiveDate: "October 25, 2026",
  summaryNotice:
    "Free Models is an independent open-source directory. We do not own, host, or run any third-party AI models or APIs. All trademarks and logos belong exclusively to their respective providers and publishers. Sourced specifications and free-tier limits are provider-dependent, may be outdated, and we assume no liability for third-party claims or misrepresentations.",
  trademarkDisclaimer:
    "All trademarks, service marks, logos, brand names, and model designations displayed on Free Models belong exclusively to their respective owners, providers, and publishers. Free Models claims no ownership, affiliation, sponsorship, or endorsement by these third parties. We own none of the third-party models, brand assets, or provider infrastructure.",
  providerClaimsDisclaimer:
    "All model specifications, free-tier quotas (RPM, RPD, TPM), context lengths, and benchmark scores are provider-dependent, subject to sudden change without notice, and may be outdated. Free Models is an independent reference directory and cannot be blamed or held liable for third-party provider inaccuracies, deceptive representations, rate limit reductions, or service disruptions.",
  highlights: [
    {
      id: "no-ownership",
      badge: "No Ownership",
      title: "We Do Not Own Third-Party Models or Services",
      description:
        "Free Models is an informational directory and comparison tool. We do not own, train, operate, host, or execute any of the AI models, APIs, inference endpoints, weights, or provider infrastructure displayed.",
    },
    {
      id: "provider-dependent",
      badge: "Provider-Dependent",
      title: "Claims & Limits May Be Outdated or Changed",
      description:
        "Specifications, rate limits (RPM/RPD/TPM), pricing tiers, and benchmark scores are set solely by upstream providers. These can change or be discontinued at any time without notice, and listings may be outdated.",
    },
    {
      id: "no-blame",
      badge: "Liability Disclaimer",
      title: "No Blame for Provider Misrepresentations or Outages",
      description:
        "If a provider misrepresents their model specs, changes pricing, revokes free access, delivers poor quality, or lies about their capabilities, Free Models and its maintainers assume zero liability.",
    },
    {
      id: "trademarks",
      badge: "Trademarks & IP",
      title: "Logos & Trademarks Belong to Publishers & Providers",
      description:
        "All company names, logos, brand marks, and product designations are the intellectual property of their respective creators, publishers, and providers. Free Models claims zero trademark rights over them.",
    },
  ] satisfies TermsHighlight[],
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content: [
        "By accessing or using Free Models ('the Site', 'we', 'our', or 'us'), you agree to be bound by these Terms and Conditions ('Terms'). If you do not agree to all terms and conditions stated herein, you must immediately cease accessing and using the Site.",
        "Free Models operates as an open-source, community-maintained directory and catalog aggregating publicly available information about zero-cost artificial intelligence models, developer API endpoints, and associated benchmarks.",
      ],
    },
    {
      id: "directory-role",
      title: "2. Informational Directory Role (No Hosting or Inference)",
      content: [
        "Free Models is exclusively an informational and comparative resource. We do not provide, host, execute, or manage AI inference services, endpoints, server infrastructure, or computational hardware.",
        "When you discover a model or provider on Free Models, any subsequent API calls, account registrations, API key generation, token usage, or data transfers occur directly and exclusively between you and the respective third-party provider.",
        "We are not an intermediary, broker, agent, or representative of any AI provider, hosting platform, or model publisher.",
      ],
    },
    {
      id: "third-party-ownership",
      title: "3. Third-Party Ownership & Intellectual Property",
      content: [
        "Free Models claims zero ownership over any of the third-party artificial intelligence models, neural network weights, algorithms, source code, documentation, or provider services indexed on the Site.",
        "All third-party trademarks, registered trademarks, service marks, brand names, product names, company names, and logos displayed on the Site are the exclusive property of their respective owners, publishers, and providers.",
        "Reference to any third-party model, company, or trademark is made solely for identification, descriptive, and educational purposes. Such reference does not constitute or imply any endorsement, sponsorship, partnership, or affiliation between Free Models and the respective trademark owner.",
      ],
    },
    {
      id: "accuracy-and-claims",
      title: "4. Accuracy of Data, Benchmarks, and Provider Claims",
      content: [
        "Information published on the Site—including context window sizes, rate limits (requests per minute, requests per day, tokens per minute), benchmark metrics (Elo ratings, win rates, rankings), and pricing information—is gathered from public provider documentation, API manifests, automated discovery workflows, and community reports.",
        "Third-party providers frequently update, throttle, modify, or revoke their free tiers and model offerings without notice. Consequently, catalogue data may at times be incomplete, inaccurate, delayed, or outdated.",
        "Free Models makes no representations or warranties that the information presented on the Site is at all times complete, accurate, reliable, or up to date.",
      ],
    },
    {
      id: "no-liability-provider-falsehoods",
      title:
        "5. Disclaimer of Warranties & No Liability for Provider Actions or Misrepresentations",
      content: [
        "Providers and publishers are solely responsible for their own services, representations, and legal terms. If an upstream provider misrepresents capabilities, lies about free limits, unexpectedly charges for inference, changes privacy practices, or fails to deliver advertised performance, Free Models and its maintainers cannot and will not be blamed or held liable under any circumstance or legal theory.",
        "The Site and all content, materials, benchmarks, and comparison tools are provided strictly on an 'AS IS' and 'AS AVAILABLE' basis. To the fullest extent permitted by applicable law, Free Models disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, and uninterrupted availability.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "6. Limitation of Liability",
      content: [
        "Under no circumstances shall Free Models, its creators, maintainers, contributors, or open-source affiliates be liable for any direct, indirect, incidental, special, punitive, exemplary, or consequential damages (including, but not limited to, loss of data, loss of profits, unexpected API charges, server downtime, or business interruption) arising out of or related to your use of, or inability to use, this Site or any third-party service discovered through this Site.",
        "You acknowledge that any reliance on catalogue data or provider claims is done entirely at your own risk.",
      ],
    },
    {
      id: "user-responsibilities",
      title: "7. User Responsibilities & Direct Provider Terms",
      content: [
        "You are solely responsible for reviewing, understanding, and complying with the respective Terms of Service, Acceptable Use Policies, billing structures, and Privacy Policies of any third-party model provider or publisher before submitting prompts, using API keys, or deploying applications.",
        "You agree not to hold Free Models responsible for any disputes, billing issues, data loss, or service terminations occurring between you and any third-party provider.",
      ],
    },
    {
      id: "changes-and-contributions",
      title: "8. Corrections, Community Reports & Changes",
      content: [
        "We welcome corrections from providers, model creators, and community members. If you discover an outdated limit, misattributed benchmark, inaccurate model detail, or intellectual property concern, please submit a pull request or issue via our public GitHub repository.",
        "We reserve the right to revise or replace these Terms and Conditions at any time. Continued use of the Site following any updates constitutes acceptance of the revised Terms.",
      ],
    },
  ] satisfies TermsSection[],
};
