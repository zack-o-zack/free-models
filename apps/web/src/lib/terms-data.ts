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
    "Free Models is an independent open-source directory. We do not own, host, train, or run any third-party AI models or inference servers. All trademarks, brand assets, and logos belong exclusively to their respective owners, providers, and publishers. All specifications and rate limits are provider-dependent, may be outdated, and Free Models cannot be blamed or held liable under any circumstance if any provider misrepresents or lies about their capabilities.",
  trademarkDisclaimer:
    "All trademarks, service marks, logos, brand assets, and model designations belong exclusively to their respective owners, providers, and publishers. Free Models claims no ownership, affiliation, sponsorship, or endorsement. We own none of the third-party models, logos, trademarks, or provider infrastructure.",
  providerClaimsDisclaimer:
    "All model specifications, rate limits (RPM, RPD, TPM), context lengths, and benchmark scores are provider-dependent, subject to unilateral change or revocation without notice, and may be outdated. Free Models assumes zero liability, responsibility, or blame and cannot be blamed or held liable if any third-party provider or publisher misrepresents capabilities, exaggerates performance, revokes access, or provides false or deceptive information.",
  footerNotice:
    "All trademarks, logos, brand names, and model designations are the property of their respective providers and publishers; Free Models claims zero ownership over third-party assets or models. We do not host or operate any inference services. Model specifications, rate limits, and claims are provider-dependent, subject to change without notice, and may be outdated. Free Models is an independent directory and disclaims all liability for third-party provider claims or representations.",
  highlights: [
    {
      id: "no-ownership",
      badge: "No Ownership",
      title: "We Own None of It",
      description:
        "Free Models is solely an independent directory and aggregator. We do not own, train, fine-tune, host, or execute any third-party AI models, weights, APIs, or server infrastructure.",
    },
    {
      id: "provider-dependent",
      badge: "Provider-Dependent",
      title: "Claims & Limits May Be Outdated",
      description:
        "Rate limits (RPM, RPD, TPM), pricing, and benchmark scores are determined unilaterally by upstream providers. They change or get deprecated without notice, and catalogue data may be outdated.",
    },
    {
      id: "no-blame",
      badge: "Liability Disclaimer",
      title: "No Blame for Provider Lies or Misrepresentations",
      description:
        "If a provider misrepresents capabilities, exaggerates benchmarks, unexpectedly revokes a free tier, or provides false or deceptive claims, Free Models and its maintainers assume zero liability and cannot be blamed.",
    },
    {
      id: "trademarks",
      badge: "Trademarks & IP",
      title: "Logos & Trademarks Belong to Publishers & Providers",
      description:
        "All company names, logos, brand marks, and product titles are the exclusive intellectual property of their respective creators, publishers, and providers. Free Models owns none of them.",
    },
  ] satisfies TermsHighlight[],
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content: [
        "By accessing, browsing, or using Free Models (the 'Website' or 'Service'), you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ('Terms') and our Disclaimer. If you do not agree to all of these terms, you must immediately discontinue your use of the Website.",
        "Free Models operates as an independent, open-source comparison directory and catalog aggregating publicly available information about zero-cost artificial intelligence models, developer API endpoints, and live benchmarks.",
      ],
    },
    {
      id: "directory-nature",
      title: "2. Informational & Directory Nature / No Hosting",
      content: [
        "Free Models is an independent, open-source comparison directory and aggregator designed to index free AI models, zero-cost Large Language Model (LLM) APIs, and live performance metrics across third-party infrastructure providers (such as Groq, Cloudflare Workers AI, OpenRouter, Mistral, Google Gemini, Cohere, NVIDIA Build, and others).",
        "We do not host, train, fine-tune, operate, or run any underlying AI models, weights, or inference servers.",
        "The Website functions solely as a directory and routing reference tool. All actual data processing, model execution, token streaming, and API responses are handled entirely by external third-party providers over which we have no operational control.",
      ],
    },
    {
      id: "third-party-ownership",
      title: "3. Intellectual Property & Trademarks",
      content: [
        "We Own None of It: Free Models claims zero ownership, rights, or affiliation whatsoever over any third-party provider names, publisher brands, model titles, logos, product names, or trademarks displayed on this platform. We own none of the third-party assets.",
        "Provider and Publisher Ownership: All trademarks, service marks, logos, brand assets, model weights, and proprietary technologies are the exclusive property of their respective owners, providers, and publishers.",
        "Fair Use Only: The inclusion of third-party names, logos, or benchmark data on Free Models is strictly for identification, directory indexing, and comparative informational purposes under fair use doctrines, and does not imply any endorsement, sponsorship, partnership, or official association between Free Models and the respective model creators or hosting infrastructure.",
      ],
    },
    {
      id: "accuracy-and-claims",
      title: "4. Accuracy of Data & Third-Party Claims",
      content: [
        "Upstream Changes: Upstream providers frequently and unilaterally alter, throttle, or deprecate rate limits (such as Requests Per Minute [RPM], Requests Per Day [RPD], Tokens Per Minute [TPM]), change pricing structures, or revoke free tiers entirely without prior notice.",
        "Outdated Information: Information regarding model capabilities, speeds, context windows, pricing tiers, and API availability is pulled or estimated from live benchmarks and provider documentation. Data may frequently become outdated, inaccurate, or obsolete.",
        "No Liability for Provider Claims: All model specifications, performance metrics, and marketing claims displayed on or linked through the Website originate directly from third-party publishers or providers.",
        "No Blame / Hold Harmless for Upstream Misrepresentations: Free Models and its maintainers cannot and will not be blamed or held liable under any circumstance if any third-party provider or publisher misrepresents its capabilities, exaggerates performance benchmarks, inaccurately advertises a 'free tier,' or provides false, misleading, or deceptive information. You rely on all third-party data and claims entirely at your own risk.",
      ],
    },
    {
      id: "no-liability-provider-falsehoods",
      title: "5. Disclaimer of Warranties ('AS IS' and 'AS AVAILABLE')",
      content: [
        "The Website, its underlying code, and all aggregated content, metrics, and data feeds are provided on an 'AS IS' and 'AS AVAILABLE' basis, without warranties of any kind, either express or implied.",
        "To the fullest extent permissible under applicable law, Free Models, its maintainers, contributors, and operators disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement. We do not warrant that the Website will be uninterrupted, error-free, secure, or free of viruses or other harmful components.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "6. Limitation of Liability & Hold Harmless",
      content: [
        "To the maximum extent permitted by applicable law, in no event shall Free Models, its maintainers, open-source contributors, affiliates, or licensors be liable for any direct, indirect, incidental, special, consequential, or punitive damages—including but not limited to loss of profits, data, use, goodwill, unexpected API charges, or other intangible losses—arising out of or resulting from your access to, use of, or inability to access or use the Website.",
        "Free Models shall not be liable for any conduct, content, pricing changes, rate-limiting, or sudden revocation of free services by any third-party provider or publisher, or any errors, inaccuracies, hallucinations, or harmful content generated by third-party AI models.",
        "You agree to defend, indemnify, and hold harmless Free Models and its contributors from any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of any third-party APIs or models referenced on the platform.",
      ],
    },
    {
      id: "user-conduct",
      title: "7. User Conduct & Direct Third-Party Relationships",
      content: [
        "Direct Relationships: When you interact with or route traffic to third-party APIs listed on Free Models, you enter into a direct relationship and agreement with that specific third-party provider. You are solely responsible for reviewing and complying with the respective provider's terms of service, acceptable use policies (AUP), billing terms, and privacy policies.",
        "Prohibited Conduct: You agree not to use the Website to bypass rate limits, scrape data aggressively in a manner that disrupts service, or facilitate the generation of illegal, harmful, abusive, or malicious content through linked third-party models.",
      ],
    },
    {
      id: "dmca-takedown",
      title: "8. Copyright & Trademark Infringement / Takedown Notice",
      content: [
        "Free Models respects the intellectual property rights of others. If you believe that any content, logo, or trademark displayed on the Website infringes upon your copyright or trademark rights, please open an issue or pull request on our GitHub repository with identification of the protected work and the material to be updated or removed.",
        "Upon verified notice, we promptly update, attribute, or remove any disputed material in good faith.",
      ],
    },
    {
      id: "changes-and-contact",
      title: "9. Changes to Terms & Contact Information",
      content: [
        "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. The updated date will be reflected at the top of this document. Continued use of the Website following any changes constitutes acceptance of the revised Terms.",
        "For questions or corrections regarding these Terms or catalogue entries, please reach out via our public GitHub repository.",
      ],
    },
  ] satisfies TermsSection[],
};
