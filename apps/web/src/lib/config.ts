export const siteConfig = {
  name: "Free Models",
  headline: { first: "Free AI", second: "models", punctuation: "." },
  tagline: "Zero-cost LLM APIs.",
  description: "Compare free AI models and zero-cost LLM APIs across verified providers.",
  socialPrice: "$0",
  googleSiteVerification: "C1iHXHIalDzkGaPUat_pdY5RDNQrPiAiNjYTYUQp8to",
  links: {
    github: "https://github.com/zack-o-zack/free-models-backend",
    json: "https://static.zackozack.com/free-models.json",
  },
};

export const homeTitle = `${siteConfig.headline.first} ${siteConfig.headline.second}${siteConfig.headline.punctuation} ${siteConfig.tagline}`;
export const socialImageAlt = `${siteConfig.name} – ${homeTitle} (${siteConfig.socialPrice}).`;
